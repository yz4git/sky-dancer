import * as THREE from "three";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";
import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

type Profile = readonly [z: number, width: number, height: number, centerY: number];

type Materials = {
  body: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  canopy: THREE.MeshPhysicalMaterial;
  hot: THREE.MeshBasicMaterial;
};

function loft(profiles: readonly Profile[], sides = 10): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const [z, width, height, centerY] of profiles) {
    for (let i = 0; i < sides; i += 1) {
      const angle = i / sides * Math.PI * 2;
      vertices.push(Math.cos(angle) * width, centerY + Math.sin(angle) * height, z);
    }
  }
  for (let row = 0; row < profiles.length - 1; row += 1) {
    for (let i = 0; i < sides; i += 1) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      const c = a + sides;
      const d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let i = 1; i < sides - 1; i += 1) {
    indices.push(0, i + 1, i);
    const end = (profiles.length - 1) * sides;
    indices.push(end, end + i, end + i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function panel(points: readonly (readonly [number, number])[], thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: Math.min(.025, thickness * .18),
    bevelThickness: Math.min(.018, thickness * .14),
    bevelSegments: 1,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function add(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function materials(stage: SkyDancerArcadeStageDefinition): Materials {
  const enemy = new THREE.Color(stage.palette.enemy);
  const accent = new THREE.Color(stage.palette.accent);
  const bodyColor = enemy.clone().lerp(new THREE.Color(0xc72b38), .24);
  const secondaryColor = enemy.clone().lerp(accent, .26);
  const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: .32, metalness: .5, flatShading: true });
  const secondary = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: .29, metalness: .54, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241923, roughness: .4, metalness: .6, flatShading: true });
  const canopy = new THREE.MeshPhysicalMaterial({
    color: 0x071a28,
    emissive: 0x0a4056,
    emissiveIntensity: .35,
    roughness: .12,
    metalness: .74,
    clearcoat: 1,
    clearcoatRoughness: .05,
  });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff6545, toneMapped: false });
  return { body, secondary, dark, canopy, hot };
}

function addWingPair(
  group: THREE.Group,
  points: readonly (readonly [number, number])[],
  material: THREE.Material,
  thickness: number,
  y: number,
): void {
  for (const side of [-1, 1]) {
    const mirrored = points.map(([x, z]) => [x * side, z] as [number, number]);
    add(group, panel(mirrored, thickness), material, 0, y, 0);
  }
}

function addVerticalFin(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  height: number,
  length: number,
  material: THREE.Material,
  rake = .42,
): void {
  const geometry = panel([
    [0, -length * .48],
    [height, -length * .16],
    [height * .76, length * .42],
    [0, length * .5],
  ], .075);
  geometry.rotateZ(Math.PI / 2);
  const fin = add(group, geometry, material, x, y, z);
  fin.rotation.x = -rake;
}

function addEngineGlow(group: THREE.Group, x: number, y: number, z: number, radius: number, material: THREE.Material): void {
  const glow = new THREE.Mesh(new THREE.SphereGeometry(radius, 9, 6), material);
  glow.name = "arcade-enemy-v18-engine-glow";
  glow.position.set(x, y, z);
  glow.scale.z = .34;
  group.add(glow);
}

function createRoundBeaconsV18(span: number, rearZ: number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -span, .12, rearZ,
    span, .12, rearZ,
    0, .27, rearZ + .55,
  ], 3));
  geometry.setAttribute("beaconMix", new THREE.Float32BufferAttribute([0, 0, 1], 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: `attribute float beaconMix; varying float vMix;
      void main(){vMix=beaconMix;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=6.0;}`,
    fragmentShader: `varying float vMix;
      void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
        float a=1.0-smoothstep(.28,1.0,r);vec3 wing=vec3(1.0,.12,.18);vec3 tail=vec3(1.0,.72,.34);
        gl_FragColor=vec4(mix(wing,tail,vMix)*(1.45+a*.9),a*.95);}`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "arcade-enemy-v18-round-beacons";
  points.renderOrder = 8;
  points.userData.arcadeEnemyRoundBeaconsV18 = true;
  return points;
}

function addCommonCockpit(group: THREE.Group, mat: Materials, noseZ: number, length: number, width: number): void {
  add(group, loft([
    [noseZ, .03, .02, .18],
    [noseZ + length * .22, width * .56, .12, .3],
    [noseZ + length * .68, width, .22, .37],
    [noseZ + length, width * .58, .07, .28],
  ], 12), mat.canopy);
}

function buildFighter(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  add(group, loft([
    [-4.35, .02, .02, 0], [-3.15, .24, .14, .01], [-1.9, .5, .28, .03],
    [-.35, .72, .34, .01], [1.15, .62, .27, -.04], [2.45, .3, .13, -.05],
  ], 12), mat.body);
  addCommonCockpit(group, mat, -2.7, 1.95, .32);
  addWingPair(group, [[.42, -1.1], [3.55, .38], [3.22, 1.18], [.86, .78]], mat.body, .13, .03);
  addWingPair(group, [[.62, -.74], [2.92, .42], [2.72, .69], [1.02, .37]], mat.secondary, .035, .12);
  addWingPair(group, [[.48, 1.25], [1.55, 2.02], [1.25, 2.38], [.38, 1.78]], mat.dark, .09, .06);
  addVerticalFin(group, -.54, .18, 1.38, 1.12, 1.18, mat.dark, .28);
  addVerticalFin(group, .54, .18, 1.38, 1.12, 1.18, mat.dark, .28);
  for (const side of [-1, 1]) {
    add(group, loft([[-.7, .22, .18, 0], [.3, .31, .22, 0], [1.65, .27, .18, 0], [2.12, .16, .12, 0]], 8), mat.dark, side * .72, -.05, .2);
  }
  bakeArcadeAirframe(group);
  addEngineGlow(group, -.72, -.05, 2.25, .25, mat.hot);
  addEngineGlow(group, .72, -.05, 2.25, .25, mat.hot);
  return { span: 3.35, rearZ: 1.05, baseScale: .52 };
}

function buildInterceptor(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  add(group, loft([
    [-5.05, .02, .02, 0], [-3.75, .19, .12, .01], [-2.2, .39, .22, .03],
    [-.55, .53, .28, 0], [.95, .44, .22, -.04], [2.15, .22, .1, -.04],
  ], 10), mat.body);
  addCommonCockpit(group, mat, -3.0, 1.8, .25);
  addWingPair(group, [[.3, -.48], [3.0, .92], [2.68, 1.46], [.7, .82]], mat.body, .105, .02);
  addWingPair(group, [[.24, -1.72], [1.28, -1.0], [1.08, -.68], [.18, -1.02]], mat.secondary, .065, .08);
  addWingPair(group, [[.32, 1.12], [1.28, 1.82], [1.02, 2.13], [.28, 1.62]], mat.dark, .075, .04);
  addVerticalFin(group, 0, .18, 1.25, 1.45, 1.26, mat.dark, .34);
  bakeArcadeAirframe(group);
  addEngineGlow(group, 0, -.04, 2.12, .3, mat.hot);
  return { span: 2.88, rearZ: 1.15, baseScale: .49 };
}

function buildBomber(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  add(group, loft([
    [-4.1, .04, .03, 0], [-2.9, .38, .24, .01], [-1.25, .78, .42, .02],
    [.45, 1.0, .48, -.03], [2.15, .82, .34, -.08], [3.0, .43, .17, -.08],
  ], 12), mat.dark);
  addCommonCockpit(group, mat, -2.5, 1.75, .38);
  addWingPair(group, [[.55, -1.55], [2.8, -.45], [4.25, .72], [3.72, 1.68], [1.0, .98]], mat.body, .19, .02);
  addWingPair(group, [[.88, -.95], [2.65, -.18], [3.58, .7], [3.23, 1.0], [1.18, .55]], mat.secondary, .045, .16);
  addWingPair(group, [[.62, 1.25], [2.0, 2.22], [1.68, 2.68], [.48, 1.88]], mat.dark, .12, .06);
  for (const x of [-2.2, -.78, .78, 2.2]) {
    add(group, loft([[-.85, .14, .12, 0], [.15, .26, .2, 0], [1.55, .24, .18, 0], [2.32, .12, .09, 0]], 8), mat.dark, x, -.08, .3);
  }
  addVerticalFin(group, -.72, .22, 1.72, 1.28, 1.38, mat.dark, .22);
  addVerticalFin(group, .72, .22, 1.72, 1.28, 1.38, mat.dark, .22);
  bakeArcadeAirframe(group);
  for (const x of [-2.2, -.78, .78, 2.2]) addEngineGlow(group, x, -.08, 2.63, .19, mat.hot);
  return { span: 4.02, rearZ: 1.38, baseScale: .72 };
}

function buildMissileBoat(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  add(group, loft([
    [-4.35, .03, .02, 0], [-3.0, .28, .18, .01], [-1.45, .6, .34, .03],
    [.35, .76, .4, -.01], [1.95, .6, .29, -.06], [2.72, .31, .13, -.06],
  ], 12), mat.body);
  addCommonCockpit(group, mat, -2.55, 1.7, .3);
  addWingPair(group, [[.5, -1.28], [3.65, .32], [3.4, 1.32], [.8, .84]], mat.body, .16, .03);
  addWingPair(group, [[.72, -.8], [3.1, .42], [2.92, .78], [1.06, .38]], mat.secondary, .04, .15);
  for (const side of [-1, 1]) {
    add(group, loft([[-1.4, .08, .07, 0], [-.72, .23, .18, 0], [1.15, .25, .2, 0], [2.1, .08, .06, 0]], 8), mat.dark, side * 2.55, -.08, .2);
    add(group, loft([[-1.25, .05, .05, 0], [-.6, .18, .13, 0], [1.02, .19, .14, 0], [1.72, .05, .04, 0]], 8), mat.secondary, side * 3.15, -.03, .4);
  }
  addWingPair(group, [[.46, 1.18], [1.7, 2.12], [1.36, 2.52], [.38, 1.75]], mat.dark, .1, .05);
  addVerticalFin(group, 0, .2, 1.38, 1.32, 1.32, mat.dark, .3);
  bakeArcadeAirframe(group);
  addEngineGlow(group, -.68, -.06, 2.72, .24, mat.hot);
  addEngineGlow(group, .68, -.06, 2.72, .24, mat.hot);
  return { span: 3.48, rearZ: 1.1, baseScale: .67 };
}

function buildAce(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  add(group, loft([
    [-4.7, .02, .02, 0], [-3.35, .23, .14, .02], [-1.8, .5, .27, .04],
    [-.1, .66, .33, .01], [1.25, .53, .24, -.04], [2.38, .25, .11, -.05],
  ], 12), mat.dark);
  addCommonCockpit(group, mat, -2.78, 1.85, .29);
  addWingPair(group, [[.44, -.42], [3.45, -1.0], [3.75, -.28], [1.0, .78]], mat.body, .125, .04);
  addWingPair(group, [[.72, -.3], [2.95, -.72], [3.2, -.4], [1.08, .48]], mat.secondary, .036, .15);
  addWingPair(group, [[.48, 1.12], [1.82, 2.22], [1.42, 2.62], [.38, 1.72]], mat.body, .08, .06);
  addVerticalFin(group, -.62, .2, 1.3, 1.48, 1.35, mat.secondary, .24);
  addVerticalFin(group, .62, .2, 1.3, 1.48, 1.35, mat.secondary, .24);
  for (const side of [-1, 1]) {
    add(group, loft([[-.6, .18, .15, 0], [.28, .28, .2, 0], [1.7, .24, .16, 0], [2.2, .12, .08, 0]], 8), mat.body, side * .7, -.04, .16);
  }
  bakeArcadeAirframe(group);
  addEngineGlow(group, -.7, -.04, 2.42, .23, mat.hot);
  addEngineGlow(group, .7, -.04, 2.42, .23, mat.hot);
  return { span: 3.5, rearZ: .65, baseScale: .51 };
}

export function createSkyDancerArcadeEnemyAirframeV18(
  stage: SkyDancerArcadeStageDefinition,
  kind: SkyDancerArcadeEnemyKind,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-enemy-v18-airframe-${kind}`;
  const mat = materials(stage);
  const identity = kind === "fighter"
    ? "swept-delta-fighter"
    : kind === "interceptor"
      ? "needle-interceptor"
      : kind === "bomber"
        ? "cranked-wing-bomber"
        : kind === "missile-boat"
          ? "pod-shoulder-missile-boat"
          : "forward-swept-ace";
  const built = kind === "fighter"
    ? buildFighter(group, mat)
    : kind === "interceptor"
      ? buildInterceptor(group, mat)
      : kind === "bomber"
        ? buildBomber(group, mat)
        : kind === "missile-boat"
          ? buildMissileBoat(group, mat)
          : buildAce(group, mat);

  group.add(createRoundBeaconsV18(built.span, built.rearZ));
  group.scale.setScalar(built.baseScale);
  group.userData.arcadeEnemySilhouetteV18 = true;
  group.userData.arcadeEnemySilhouetteIdentityV18 = identity;
  group.userData.arcadeEnemyBaseScaleV18 = built.baseScale;
  group.userData.arcadeEnemySquareBeaconRemovedV18 = true;
  group.userData.arcadeEnemyLogicalCollisionUnchangedV18 = true;
  return group;
}
