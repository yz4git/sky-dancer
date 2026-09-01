from pathlib import Path

root = Path(__file__).resolve().parents[1]
models_path = root / "src/sky/arcade/SkyDancerArcadeModels.ts"
webgl_path = root / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
presentation_path = root / "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"

models = models_path.read_text()
webgl = webgl_path.read_text()
presentation = presentation_path.read_text()

models = models.replace('import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";\n', '', 1)

start = models.index('export function createSkyDancerArcadeLockRing(color: number): THREE.Group {')
end = models.index('\n\nexport function createSkyDancerArcadeHazard(', start)
models = models[:start] + '''export function createSkyDancerArcadeLockRing(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-lock-ring";
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: `void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=64.0;}`,
    fragmentShader: `uniform vec3 tint;
      void main(){vec2 p=gl_PointCoord*2.0-1.0;vec2 a=abs(p);
        float h=step(.48,a.x)*step(a.x,.9)*step(.75,a.y)*step(a.y,.9);
        float v=step(.75,a.x)*step(a.x,.9)*step(.48,a.y)*step(a.y,.9);
        float d=1.0-smoothstep(.025,.065,abs(a.x+a.y-.25));
        float alpha=max(max(h,v),d*.88);if(alpha<.03)discard;
        gl_FragColor=vec4(tint*1.75,alpha*.98);}`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const marker = new THREE.Points(geometry, material);
  marker.name = "arcade-lock-ring-mesh";
  marker.frustumCulled = false;
  marker.renderOrder = 30;
  group.add(marker);
  return group;
}''' + models[end:]

old = '  private readonly lockParentQuaternion = new THREE.Quaternion();\n  private readonly lockCameraQuaternion = new THREE.Quaternion();\n'
assert old in webgl
webgl = webgl.replace(old, '', 1)

old = '''      if (enemy.locked && existingRing) {
        // V9.7: keep lock brackets screen-readable and camera-facing instead of shrinking with a distant banked fighter.
        const depthScale = THREE.MathUtils.clamp(1.75 + enemy.depth * .052, 2.15, enemy.boss ? 5.7 : 5.05);
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .075;
        existingRing.scale.setScalar(depthScale * pulse);
        group.getWorldQuaternion(this.lockParentQuaternion);
        this.camera.getWorldQuaternion(this.lockCameraQuaternion);
        existingRing.quaternion.copy(this.lockParentQuaternion.invert().multiply(this.lockCameraQuaternion));
      }
'''
new = '''      if (enemy.locked && existingRing) {
        // V9.7.1: the point-sprite lock marker owns a fixed 64px footprint, so distance and aircraft bank cannot erase it.
        existingRing.position.z = -0.08;
      }
'''
assert old in webgl
webgl = webgl.replace(old, new, 1)

old = '''  private disposeObject(group: THREE.Object3D): void {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }
'''
new = '''  private disposeObject(group: THREE.Object3D): void {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }
'''
assert old in webgl
webgl = webgl.replace(old, new, 1)

old = '''  private updateProjectileTrails(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.activeIds.clear();
    for (const p of snapshot.projectiles) {
'''
new = '''  private updateProjectileTrails(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.activeIds.clear();
    const playerMissileCount = snapshot.projectiles.reduce((count, projectile) => count + (projectile.owner === "player-missile" ? 1 : 0), 0);
    // V9.7.1: preserve a bold single-missile plume while preventing 4-8 missile salvos from becoming a white screen wipe.
    const salvoSmokeScale = THREE.MathUtils.clamp(1 / Math.sqrt(Math.max(1, playerMissileCount) * .55), .58, 1);
    for (const p of snapshot.projectiles) {
'''
assert old in presentation
presentation = presentation.replace(old, new, 1)

presentation = presentation.replace('this.missileSmoke.emit(this.missilePoint, 1.52);', 'this.missileSmoke.emit(this.missilePoint, 1.52 * salvoSmokeScale);', 1)
presentation = presentation.replace('this.missileSmoke.emit(this.missileMidpoint, 1.15);', 'this.missileSmoke.emit(this.missileMidpoint, 1.15 * salvoSmokeScale);', 1)
presentation = presentation.replace('this.missileSmoke.emit(this.missilePoint, 1.24);', 'this.missileSmoke.emit(this.missilePoint, 1.24 * salvoSmokeScale);', 1)

models_path.write_text(models)
webgl_path.write_text(webgl)
presentation_path.write_text(presentation)
print("Applied Arcade Run V9.7.1 lock and salvo clarity polish")
