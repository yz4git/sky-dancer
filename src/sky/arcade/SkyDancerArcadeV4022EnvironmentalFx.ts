import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { createSkyDancerArcadeLightningEffect } from "./SkyDancerArcadeV4021LightningEffect";

function hash01(seed: number): number {
  const value = Math.sin(seed * 17.113 + 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function additiveLine(color: number | THREE.Color, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function plumeLine(
  points: THREE.Vector3[],
  material: THREE.LineBasicMaterial,
  name: string,
): THREE.Line {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.name = name;
  line.frustumCulled = false;
  line.renderOrder = 9;
  return line;
}

/** V40.22: reuse the proven V40.21 discharge language for background storm scenery. */
export function createSkyDancerArcadeEnvironmentalLightningFx(
  stage: SkyDancerArcadeStageDefinition,
  seed: number,
  height = 38,
): THREE.Group {
  const effect = createSkyDancerArcadeLightningEffect(stage, {
    id: 40_220 + seed,
    kind: "lightning",
    x: 0,
    y: 0,
    depth: 0,
    scale: 1,
  });
  effect.name = `arcade-v4022-environment-lightning-${seed}`;
  effect.scale.set(.82, Math.max(.35, height / 9.8), .82);
  effect.userData.arcadeV4022EnvironmentalFx = "lightning";
  effect.userData.arcadeV4022PresentationOnly = true;
  effect.userData.arcadeV4022SolidGeometryRemoved = true;
  // Decorative storm bolts should not add a bank of dynamic lights on mobile.
  effect.traverse((object) => {
    if (object instanceof THREE.PointLight) object.visible = false;
  });
  return effect;
}

/**
 * V40.22 presentation-only volcanic emission. The old solid cones/boxes made heat and lava look
 * like physical spikes. Lines + embers keep the same authored placement while reading as energy.
 */
export function createSkyDancerArcadeVolcanicPlumeFx(
  accent: number,
  seed: number,
  height = 18,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-v4022-volcanic-plume-${seed}`;
  group.userData.arcadeV4022EnvironmentalFx = "volcanic-plume";
  group.userData.arcadeV4022PresentationOnly = true;
  group.userData.arcadeV4022SolidGeometryRemoved = true;

  const hot = new THREE.Color(accent).lerp(new THREE.Color(0xfff0a3), .5);
  const coreMaterial = additiveLine(hot, .82);
  const glowMaterial = additiveLine(new THREE.Color(accent), .34);
  const sideMaterial = additiveLine(new THREE.Color(accent).lerp(new THREE.Color(0xff6a2f), .35), .3);
  const segments = 7;
  const mainPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const taper = 1 - t * .62;
    const x = (hash01(seed * 31 + index * 13) - .5) * 1.55 * taper + Math.sin(index * 1.7 + seed) * .22;
    const z = (hash01(seed * 43 + index * 19) - .5) * 1.1 * taper;
    mainPoints.push(new THREE.Vector3(x, height * t, z));
  }

  const glow = plumeLine(mainPoints, glowMaterial, "arcade-v4022-plume-glow");
  glow.scale.set(1.35, 1, 1.35);
  const core = plumeLine(mainPoints, coreMaterial, "arcade-v4022-plume-core");
  group.add(glow, core);

  for (let branch = 0; branch < 3; branch += 1) {
    const anchorT = .18 + branch * .2;
    const anchorIndex = Math.min(segments - 1, Math.round(anchorT * segments));
    const anchor = mainPoints[anchorIndex];
    const side = hash01(seed * 67 + branch * 7) > .5 ? 1 : -1;
    const reach = 1.5 + hash01(seed * 71 + branch * 11) * 1.8;
    const branchPoints = [
      anchor.clone(),
      anchor.clone().add(new THREE.Vector3(side * reach * .45, height * .09, .15)),
      anchor.clone().add(new THREE.Vector3(side * reach, height * .18, -.2)),
    ];
    group.add(plumeLine(branchPoints, sideMaterial.clone(), `arcade-v4022-plume-jet-${branch}`));
  }

  const emberCount = 16;
  const positions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index += 1) {
    const t = hash01(seed * 83 + index * 17);
    positions[index * 3] = (hash01(seed * 89 + index * 23) - .5) * (2.2 + t * 4.4);
    positions[index * 3 + 1] = height * (.08 + t * .88);
    positions[index * 3 + 2] = (hash01(seed * 97 + index * 29) - .5) * (1.7 + t * 2.6);
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const emberMaterial = new THREE.PointsMaterial({
    color: hot,
    size: .34,
    sizeAttenuation: true,
    transparent: true,
    opacity: .68,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const embers = new THREE.Points(emberGeometry, emberMaterial);
  embers.name = "arcade-v4022-plume-embers";
  embers.frustumCulled = false;
  embers.renderOrder = 10;
  group.add(embers);

  const phase = hash01(seed * 101) * Math.PI * 2;
  core.onBeforeRender = () => {
    const time = performance.now() * .001;
    const pulse = .78 + Math.sin(time * 11.2 + phase) * .16 + Math.sin(time * 19.7 + phase * .7) * .06;
    coreMaterial.opacity = THREE.MathUtils.clamp(.7 + pulse * .22, .7, .98);
    glowMaterial.opacity = THREE.MathUtils.clamp(.23 + pulse * .16, .23, .46);
    emberMaterial.opacity = THREE.MathUtils.clamp(.48 + pulse * .2, .48, .75);
    embers.position.y = Math.sin(time * 2.3 + phase) * .18;
  };

  return group;
}
