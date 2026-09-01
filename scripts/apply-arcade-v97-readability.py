from pathlib import Path

root = Path(__file__).resolve().parents[1]
models_path = root / "src/sky/arcade/SkyDancerArcadeModels.ts"
webgl_path = root / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"

models = models_path.read_text()
webgl = webgl_path.read_text()

old = 'import * as THREE from "three";\n'
new = 'import * as THREE from "three";\nimport { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";\n'
assert old in models
models = models.replace(old, new, 1)

old = '''function createStandardEnemy(_stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  return createReferenceFighter(true, enemy.kind === "bomber" || enemy.kind === "missile-boat");
}
'''
new = '''function createEnemyVisibilityBeacons(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -3.62, .12, 1.28,
    3.62, .12, 1.28,
    0, .28, -2.82,
  ], 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute([
    1, .08, .34,
    1, .08, .34,
    1, .88, .72,
  ], 3));
  const material = new THREE.PointsMaterial({
    size: 5.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: .96,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "arcade-enemy-visibility-beacons";
  points.renderOrder = 7;
  return points;
}

function createStandardEnemy(_stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  const fighter = createReferenceFighter(true, enemy.kind === "bomber" || enemy.kind === "missile-boat");
  fighter.add(createEnemyVisibilityBeacons());
  return fighter;
}
'''
assert old in models
models = models.replace(old, new, 1)

old = '  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(stage.palette.accent));\n'
new = '  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(0xff3970));\n'
assert old in models
models = models.replace(old, new, 1)

start = models.index('export function createSkyDancerArcadeLockRing(color: number): THREE.Group {')
end = models.index('\n\nexport function createSkyDancerArcadeHazard(', start)
old = models[start:end]
new = '''export function createSkyDancerArcadeLockRing(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-lock-ring";
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: .98,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const geometries: THREE.BufferGeometry[] = [];
  const place = (geometry: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    geometry.translate(x, y, z);
    geometries.push(geometry);
  };
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      place(new THREE.BoxGeometry(.46, .072, .045), x * .93 - x * .19, y * .93, 0);
      place(new THREE.BoxGeometry(.072, .46, .045), x * .93, y * .93 - y * .19, 0);
    }
  }
  const diamond = new THREE.TorusGeometry(.34, .035, 4, 4);
  diamond.rotateZ(Math.PI / 4);
  geometries.push(diamond);
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  if (merged) {
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "arcade-lock-ring-mesh";
    mesh.renderOrder = 30;
    group.add(mesh);
  } else {
    material.dispose();
  }
  return group;
}'''
models = models[:start] + new + models[end:]

old = '  private readonly engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");\n  private readonly audio = new SkyDancerArcadeAudio();\n'
new = '  private readonly engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");\n  private readonly lockParentQuaternion = new THREE.Quaternion();\n  private readonly lockCameraQuaternion = new THREE.Quaternion();\n  private readonly audio = new SkyDancerArcadeAudio();\n'
assert old in webgl
webgl = webgl.replace(old, new, 1)

old = '''      const existingRing = group.getObjectByName("arcade-lock-ring");
      if (enemy.locked && !existingRing) group.add(createSkyDancerArcadeLockRing(0xff4c58));
      if (!enemy.locked && existingRing) {
        group.remove(existingRing);
        this.disposeObject(existingRing);
'''
new = '''      let existingRing = group.getObjectByName("arcade-lock-ring");
      if (enemy.locked && !existingRing) {
        group.add(createSkyDancerArcadeLockRing(0xff3970));
        existingRing = group.getObjectByName("arcade-lock-ring");
      }
      if (enemy.locked && existingRing) {
        // V9.7: keep lock brackets screen-readable and camera-facing instead of shrinking with a distant banked fighter.
        const depthScale = THREE.MathUtils.clamp(1.75 + enemy.depth * .052, 2.15, enemy.boss ? 5.7 : 5.05);
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .075;
        existingRing.scale.setScalar(depthScale * pulse);
        group.getWorldQuaternion(this.lockParentQuaternion);
        this.camera.getWorldQuaternion(this.lockCameraQuaternion);
        existingRing.quaternion.copy(this.lockParentQuaternion.invert().multiply(this.lockCameraQuaternion));
      }
      if (!enemy.locked && existingRing) {
        group.remove(existingRing);
        this.disposeObject(existingRing);
'''
assert old in webgl
webgl = webgl.replace(old, new, 1)

models_path.write_text(models)
webgl_path.write_text(webgl)
print("Applied Arcade Run V9.7 combat readability pass")
