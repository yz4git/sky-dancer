import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeHazardSnapshot } from "./SkyDancerArcadeRuntime";

function hash01(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function boltPoints(hazardId: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segments = 8;
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const y = THREE.MathUtils.lerp(4.9, -4.9, t);
    const envelope = Math.sin(Math.PI * t);
    const coarse = (hash01(hazardId * 17 + index * 11) - .5) * 1.65;
    const fine = Math.sin((index * 2.7 + hazardId * .37)) * .28;
    const x = (coarse + fine) * (.28 + envelope * .72);
    const z = (hash01(hazardId * 29 + index * 7) - .5) * .46;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function branchPoints(main: readonly THREE.Vector3[], hazardId: number, branchIndex: number): THREE.Vector3[] {
  const anchorIndex = 2 + branchIndex * 2;
  const anchor = main[Math.min(main.length - 2, anchorIndex)];
  const side = hash01(hazardId * 31 + branchIndex * 5) > .5 ? 1 : -1;
  const reach = .95 + hash01(hazardId * 43 + branchIndex * 13) * .8;
  return [
    anchor.clone(),
    anchor.clone().add(new THREE.Vector3(side * reach * .45, -.55, .06)),
    anchor.clone().add(new THREE.Vector3(side * reach, -1.15, -.08)),
  ];
}

function makeLine(points: readonly THREE.Vector3[], material: THREE.LineBasicMaterial, name: string): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  line.name = name;
  line.frustumCulled = false;
  line.renderOrder = 18;
  return line;
}

/**
 * V40.21 presentation-only lightning. Runtime still owns the logical hazard position,
 * lifetime and collision; this function only replaces the old solid BoxGeometry bolt.
 */
export function createSkyDancerArcadeLightningEffect(
  stage: SkyDancerArcadeStageDefinition,
  hazard: SkyDancerArcadeHazardSnapshot,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-hazard-${hazard.id}`;
  group.userData.arcadeAtmosphericHazardV105 = true;
  group.userData.arcadeHazardIdentityV105 = "lightning-bolt";
  group.userData.arcadeV4021LightningEffect = true;
  group.userData.arcadeV4021SolidGeometryRemoved = true;
  group.userData.arcadeV4021GameplayUnchanged = true;

  const points = boltPoints(hazard.id);
  const glowColor = new THREE.Color(stage.palette.accent).lerp(new THREE.Color(0x8feaff), .62);
  const coreMaterial = new THREE.LineBasicMaterial({
    color: 0xf7fdff,
    transparent: true,
    opacity: .94,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const glowMaterial = new THREE.LineBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: .44,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const branchMaterial = glowMaterial.clone();
  branchMaterial.opacity = .34;

  const glowA = makeLine(points, glowMaterial, "arcade-v4021-lightning-glow-a");
  glowA.scale.set(1.045, 1, 1.045);
  const glowB = makeLine(points, glowMaterial.clone(), "arcade-v4021-lightning-glow-b");
  glowB.scale.set(.965, 1, .965);
  glowB.position.x = .055;
  const core = makeLine(points, coreMaterial, "arcade-v4021-lightning-core");
  group.add(glowA, glowB, core);

  for (let branchIndex = 0; branchIndex < 3; branchIndex += 1) {
    const branch = makeLine(
      branchPoints(points, hazard.id, branchIndex),
      branchMaterial.clone(),
      `arcade-v4021-lightning-branch-${branchIndex}`,
    );
    group.add(branch);
  }

  const flashGeometry = new THREE.BufferGeometry();
  flashGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, .2, .18], 3));
  const flashMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: glowColor.clone() },
      alpha: { value: .1 },
      pointSize: { value: 74 },
    },
    vertexShader: `uniform float pointSize; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=pointSize;}`,
    fragmentShader: `uniform vec3 tint; uniform float alpha; void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);float a=(1.0-smoothstep(0.0,1.0,r));a*=a;if(a<0.01)discard;gl_FragColor=vec4(tint*1.75,a*alpha);}`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const flash = new THREE.Points(flashGeometry, flashMaterial);
  flash.name = "arcade-v4021-lightning-flash";
  flash.frustumCulled = false;
  flash.renderOrder = 17;
  group.add(flash);

  const light = new THREE.PointLight(glowColor, 0, 25, 2);
  light.name = "arcade-v4021-lightning-light";
  light.position.set(0, .3, .8);
  group.add(light);

  const phaseOffset = hash01(hazard.id * 59) * 1.7;
  core.onBeforeRender = () => {
    const time = performance.now() * .001 + phaseOffset;
    const cycle = time % .92;
    const firstStrike = cycle < .09 ? 1 - cycle / .09 : 0;
    const returnStroke = cycle > .145 && cycle < .205 ? 1 - (cycle - .145) / .06 : 0;
    const afterGlow = cycle > .205 && cycle < .36 ? (1 - (cycle - .205) / .155) * .22 : 0;
    const pulse = Math.max(firstStrike, returnStroke * .72, afterGlow, .035);
    const micro = .88 + Math.sin(time * 71 + hazard.id) * .12;
    coreMaterial.opacity = THREE.MathUtils.clamp(pulse * 1.05 * micro, .03, 1);
    glowMaterial.opacity = THREE.MathUtils.clamp(pulse * .58, .02, .58);
    (glowB.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.clamp(pulse * .46, .015, .46);
    for (const child of group.children) {
      if (child.name.startsWith("arcade-v4021-lightning-branch-") && child instanceof THREE.Line) {
        (child.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.clamp(pulse * .38, .01, .38);
      }
    }
    flashMaterial.uniforms.alpha.value = Math.min(.52, pulse * .5);
    flashMaterial.uniforms.pointSize.value = 62 + pulse * 42;
    light.intensity = pulse * 5.8;
    core.position.x = Math.sin(time * 83 + hazard.id) * .018 * pulse;
    glowA.position.x = Math.cos(time * 61 + hazard.id) * .035 * pulse;
  };

  return group;
}
