import * as THREE from "three";

export interface SkyDancerArcadeV4028BossWreckProfile {
  strength: number;
  sparkOpacity: number;
  emberOpacity: number;
  smokeOpacity: number;
  breachOpacity: number;
  debrisSpread: number;
}

const FX_NAME = "arcade-v4028-boss-wreck-fx";
const SPARK_NAME = "arcade-v4028-boss-wreck-sparks";
const SMOKE_NAME = "arcade-v4028-boss-wreck-smoke";
const EMBER_NAME = "arcade-v4028-boss-wreck-embers";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function skyDancerArcadeV4028BossWreckProfile(strength: number): SkyDancerArcadeV4028BossWreckProfile {
  const s = clamp01(strength);
  return {
    strength: s,
    sparkOpacity: Math.min(.92, .12 + s * .8),
    emberOpacity: Math.min(.86, .08 + s * .78),
    smokeOpacity: Math.min(.48, .08 + s * .4),
    breachOpacity: Math.min(.72, .1 + s * .62),
    debrisSpread: .9 + (1 - s) * 1.7,
  };
}

function createRoundPointMaterial(color: number, size: number, opacity: number, additive: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      pointColor: { value: new THREE.Color(color) },
      pointSize: { value: size },
      pointOpacity: { value: opacity },
    },
    vertexShader: `
      uniform float pointSize;
      void main(){
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=pointSize;
        gl_Position=projectionMatrix*mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 pointColor;
      uniform float pointOpacity;
      void main(){
        vec2 d=gl_PointCoord-vec2(.5);
        float r=length(d);
        float a=(1.0-smoothstep(.18,.5,r))*pointOpacity;
        gl_FragColor=vec4(pointColor,a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

function bossGroupFromScene(scene: THREE.Scene): THREE.Group | null {
  let found: THREE.Group | null = null;
  scene.traverse((object) => {
    if (found || !(object instanceof THREE.Group) || !object.name.startsWith("arcade-enemy-")) return;
    if (object.getObjectByName("arcade-boss-weakpoint")) found = object;
  });
  return found;
}

export function createSkyDancerArcadeV4028BossWreckFx(): THREE.Group {
  const root = new THREE.Group();
  root.name = FX_NAME;
  root.renderOrder = 7;
  root.userData.arcadeV4028BossWreck = true;
  root.userData.arcadeV4028PresentationOnly = true;
  root.userData.arcadeV4028GameplayUnchanged = true;
  root.userData.arcadeV4028CollisionUnchanged = true;

  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12 * 2 * 3), 3));
  const sparkMaterial = new THREE.LineBasicMaterial({
    color: 0xffb34f,
    transparent: true,
    opacity: .8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sparks = new THREE.LineSegments(sparkGeometry, sparkMaterial);
  sparks.name = SPARK_NAME;
  sparks.renderOrder = 8;
  root.add(sparks);

  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
  const smoke = new THREE.Points(smokeGeometry, createRoundPointMaterial(0x6d737b, 30, .38, false));
  smoke.name = SMOKE_NAME;
  smoke.renderOrder = 6;
  root.add(smoke);

  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
  const embers = new THREE.Points(emberGeometry, createRoundPointMaterial(0xff8a35, 5.2, .8, true));
  embers.name = EMBER_NAME;
  embers.renderOrder = 9;
  root.add(embers);

  const breachMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7a2c,
    transparent: true,
    opacity: .58,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const breachPoints = [
    new THREE.Vector3(-3.35, 1.25, 2.2),
    new THREE.Vector3(2.55, .62, 1.55),
    new THREE.Vector3(.45, 2.55, -.85),
  ];
  breachPoints.forEach((position, index) => {
    const breach = new THREE.Mesh(new THREE.TorusGeometry(.48 + index * .08, .06, 5, 18), breachMaterial.clone());
    breach.name = `arcade-v4028-boss-wreck-breach-${index}`;
    breach.position.copy(position);
    breach.rotation.set(index * .4, index * .7, index * .31);
    breach.renderOrder = 7;
    root.add(breach);
  });

  const debrisMaterial = new THREE.MeshStandardMaterial({
    color: 0x252831,
    emissive: 0x421508,
    emissiveIntensity: .24,
    roughness: .72,
    metalness: .42,
  });
  const debrisDirections = [
    [-1, .7, .6], [1, .45, .2], [-.6, -.25, .9], [.7, -.5, .55], [.1, 1, -.35],
  ] as const;
  debrisDirections.forEach(([x, y, z], index) => {
    const debris = new THREE.Mesh(new THREE.TetrahedronGeometry(.32 + index * .055, 0), debrisMaterial.clone());
    debris.name = `arcade-v4028-boss-wreck-debris-${index}`;
    debris.userData.arcadeV4028Direction = new THREE.Vector3(x, y, z).normalize();
    debris.userData.arcadeV4028Spin = new THREE.Vector3(.7 + index * .21, 1.1 + index * .17, .9 + index * .13);
    debris.renderOrder = 6;
    root.add(debris);
  });

  return root;
}

function updateSparkGeometry(sparks: THREE.LineSegments, time: number, profile: SkyDancerArcadeV4028BossWreckProfile): void {
  const attribute = sparks.geometry.getAttribute("position");
  if (!(attribute instanceof THREE.BufferAttribute)) return;
  const array = attribute.array as Float32Array;
  for (let index = 0; index < 12; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = index % 3;
    const baseX = side * (1.35 + lane * .78);
    const baseY = .45 + ((index * 7) % 5) * .58;
    const baseZ = 1.45 - ((index * 5) % 4) * .66;
    const phase = time * (18 + lane * 3) + index * 2.17;
    const flicker = .3 + .7 * Math.max(0, Math.sin(phase));
    const length = (.55 + lane * .22) * (1 + profile.strength * 1.35) * flicker;
    const offset = index * 6;
    array[offset] = baseX;
    array[offset + 1] = baseY;
    array[offset + 2] = baseZ;
    array[offset + 3] = baseX + side * length;
    array[offset + 4] = baseY + Math.sin(phase * .7) * length * .55;
    array[offset + 5] = baseZ + Math.cos(phase * .63) * length * .48;
  }
  attribute.needsUpdate = true;
}

function updatePointCloud(points: THREE.Points, time: number, strength: number, smoke: boolean): void {
  const attribute = points.geometry.getAttribute("position");
  if (!(attribute instanceof THREE.BufferAttribute)) return;
  const array = attribute.array as Float32Array;
  const count = attribute.count;
  for (let index = 0; index < count; index += 1) {
    const phase = time * (smoke ? .72 : 3.2) + index * 1.73;
    const cycle = (time * (smoke ? .22 : .8) + index / count) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const spread = smoke ? 1.15 + cycle * 2.6 : .8 + cycle * 2.2;
    const offset = index * 3;
    array[offset] = side * (.8 + (index % 4) * .7) + Math.sin(phase) * spread * .36;
    array[offset + 1] = .55 + cycle * (smoke ? 4.8 : 2.6) + Math.cos(phase * .8) * .35;
    array[offset + 2] = 1.2 + Math.cos(phase * .63) * spread - cycle * (smoke ? 2.4 : .7);
  }
  attribute.needsUpdate = true;
  const material = points.material;
  if (material instanceof THREE.ShaderMaterial) {
    material.uniforms.pointOpacity.value = strength;
    material.uniforms.pointSize.value = smoke ? 22 + strength * 16 : 3.8 + strength * 3.2;
  }
}

/**
 * V40.28 attaches a bounded local destruction rig to the already-retained V32/V40.14 boss wreck.
 * It never changes runtime HP, collision, outro timing or targetability.
 */
export function syncSkyDancerArcadeV4028BossWreckFx(
  scene: THREE.Scene,
  strength: number,
  timeSeconds: number,
): boolean {
  const profile = skyDancerArcadeV4028BossWreckProfile(strength);
  if (profile.strength <= .005) {
    for (const object of scene.getObjectsByProperty("name", FX_NAME)) object.visible = false;
    return false;
  }

  const boss = bossGroupFromScene(scene);
  if (!boss) return false;
  let root = boss.getObjectByName(FX_NAME);
  if (!(root instanceof THREE.Group)) {
    root = createSkyDancerArcadeV4028BossWreckFx();
    root.userData.arcadeV4028StartedAt = timeSeconds;
    boss.add(root);
  }
  root.visible = true;

  const startedAt = Number(root.userData.arcadeV4028StartedAt ?? timeSeconds);
  const elapsed = Math.max(0, timeSeconds - startedAt);
  const pulse = .62 + Math.max(0, Math.sin(timeSeconds * 20)) * .38;

  const sparks = root.getObjectByName(SPARK_NAME);
  if (sparks instanceof THREE.LineSegments && sparks.material instanceof THREE.LineBasicMaterial) {
    sparks.material.opacity = profile.sparkOpacity * pulse;
    updateSparkGeometry(sparks, timeSeconds, profile);
  }

  const smoke = root.getObjectByName(SMOKE_NAME);
  if (smoke instanceof THREE.Points) updatePointCloud(smoke, elapsed, profile.smokeOpacity, true);
  const embers = root.getObjectByName(EMBER_NAME);
  if (embers instanceof THREE.Points) updatePointCloud(embers, elapsed, profile.emberOpacity * pulse, false);

  root.children.forEach((child) => {
    if (child.name.startsWith("arcade-v4028-boss-wreck-breach-") && child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
      child.material.opacity = profile.breachOpacity * (.72 + pulse * .28);
      child.scale.setScalar(.9 + profile.strength * .32 + Math.sin(timeSeconds * 11 + child.id) * .06);
      child.rotation.z += .018 + profile.strength * .018;
    }
    if (child.name.startsWith("arcade-v4028-boss-wreck-debris-") && child instanceof THREE.Mesh) {
      const direction = child.userData.arcadeV4028Direction;
      const spin = child.userData.arcadeV4028Spin;
      if (!(direction instanceof THREE.Vector3) || !(spin instanceof THREE.Vector3)) return;
      const travel = Math.min(5.2, elapsed * (1.6 + profile.debrisSpread * .55));
      child.position.copy(direction).multiplyScalar(.45 + travel);
      child.position.y -= elapsed * elapsed * .34;
      child.rotation.set(spin.x * elapsed, spin.y * elapsed, spin.z * elapsed);
    }
  });

  root.userData.arcadeV4028Strength = profile.strength;
  root.userData.arcadeV4028Elapsed = elapsed;
  return true;
}
