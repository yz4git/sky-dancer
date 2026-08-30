import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

type Profile = readonly [z: number, width: number, height: number, centerY: number];

/** A continuous airframe skin, not a stack of intersecting primitive bodies. */
function loft(profiles: readonly Profile[], sides = 12): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const [z, width, height, centerY] of profiles) {
    for (let i = 0; i < sides; i++) {
      const a = i / sides * Math.PI * 2;
      vertices.push(Math.cos(a) * width, centerY + Math.sin(a) * height, z);
    }
  }
  for (let r = 0; r < profiles.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = r * sides + i;
      const b = r * sides + (i + 1) % sides;
      const c = a + sides;
      const d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let i = 1; i < sides - 1; i++) {
    indices.push(0, i + 1, i);
    const end = (profiles.length - 1) * sides;
    indices.push(end, end + i, end + i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function panel(points: readonly (readonly [number, number])[], thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelSize: 0.024,
    bevelThickness: 0.018, bevelSegments: 1, curveSegments: 1, steps: 1,
  });
  g.rotateX(Math.PI / 2);
  return g;
}

function paint(color: number, roughness = 0.4, metalness = 0.42): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function emissive(color: number, intensity = 2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.28, metalness: 0.25 });
}

function part(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

/** Bake static detail by material. Hundreds of panels remain a handful of draws. */
export function bakeArcadeAirframe(group: THREE.Group): void {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || child.name || Array.isArray(child.material)) continue;
    child.updateMatrix();
    const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    g.applyMatrix4(child.matrix);
    for (const key of Object.keys(g.attributes)) if (key !== "position" && key !== "normal") g.deleteAttribute(key);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    g.clearGroups();
    const bucket = buckets.get(child.material) ?? [];
    bucket.push(g);
    buckets.set(child.material, bucket);
    child.geometry.dispose();
    group.remove(child);
  }
  for (const [mat, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = "arcade-baked-airframe";
      group.add(mesh);
    }
  }
}

function engines(group: THREE.Group, offsets: readonly number[], z: number, radius: number, color: number): void {
  const metal = paint(0x263441, 0.3, 0.75);
  const lip = paint(0x71869a, 0.28, 0.85);
  const hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3.2), toneMapped: false });
  const plume = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: "uniform vec3 tint; varying vec2 vUv; void main(){float a=pow(1.0-vUv.y,1.3);float core=pow(1.0-abs(vUv.x*2.0-1.0),2.0);gl_FragColor=vec4(mix(tint*1.5,vec3(2.7),core*.6),a*.4);}",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  for (const x of offsets) {
    const pod = part(group, new THREE.CylinderGeometry(radius * 1.05, radius * 1.14, radius * 3.8, 14), metal, x, 0, z - radius);
    pod.rotation.x = Math.PI / 2;
    part(group, new THREE.TorusGeometry(radius, radius * 0.18, 6, 20), lip, x, 0, z + radius * 0.9);
    const core = part(group, new THREE.SphereGeometry(radius * 0.76, 14, 8), hot, x, 0, z + radius);
    core.name = "arcade-engine-glow";
    core.scale.z = 0.35;
    const trail = part(group, new THREE.CylinderGeometry(radius * 0.07, radius * 0.88, radius * 8, 12, 1, true), plume, x, 0, z + radius * 5.2);
    trail.rotation.x = Math.PI / 2;
    trail.name = "arcade-engine-trail";
    // Both nozzle axes and plume tips point down +Z, away from the -Z nose.
  }
}

export function createReferenceFighter(enemy = false, heavy = false): THREE.Group {
  const group = new THREE.Group();
  group.name = enemy ? "arcade-reference-raider" : "arcade-player-fighter";
  const ceramic = paint(enemy ? 0xa72224 : 0xe4eef3, 0.36, 0.48);
  const cyan = paint(enemy ? 0xee6d28 : 0x05bddd, 0.29, 0.5);
  const edge = paint(0x11202b, 0.42, 0.62);
  const silver = paint(0x7c8f9c, 0.33, 0.72);
  const glow = emissive(enemy ? 0xff5b28 : 0x2ee7ff, 1.5);
  const canopy = new THREE.MeshPhysicalMaterial({
    color: 0x082b48, metalness: 0.7, roughness: 0.13, clearcoat: 1,
    clearcoatRoughness: 0.06, emissive: 0x064664, emissiveIntensity: 0.18,
  });
  part(group, loft([
    [-3.8, .02, .02, -.04], [-2.6, .22, .15, .02], [-1.6, .48, .26, .04],
    [-.5, .67, .33, .02], [.7, .91, .28, -.02], [1.6, .9, .23, -.04], [2.4, .5, .12, -.05],
  ]), ceramic);
  part(group, loft([[-2.7, .12, .05, -.13], [-.6, .56, .24, -.16], [1.4, .71, .22, -.18], [2.35, .37, .06, -.16]]), edge);
  part(group, loft([[-2.05, .05, .035, .27], [-1.62, .27, .15, .4], [-.8, .33, .19, .49], [-.16, .24, .06, .35]], 16), canopy);
  for (const side of [-1, 1]) {
    const wing = [[.5, -1.25], [3.75, .8], [3.85, 1.5], [1.2, 1.15], [.62, .7]].map(([x,z]) => [x * side,z] as [number,number]);
    part(group, panel(wing, .13), ceramic, 0, .05);
    const stripe = [[1.05,-.57], [3.53,.94], [3.62,1.23], [1.55,.62]].map(([x,z]) => [x * side,z] as [number,number]);
    part(group, panel(stripe, .02), cyan, 0, .088);
    part(group, panel([[.55 * side,-1.9],[1.53 * side,-1.32],[1.2 * side,-.98],[.52 * side,-1.15]],.065), ceramic, 0,.1);
    part(group, panel([[.65 * side,1.25],[2.12 * side,2.05],[2.02 * side,2.52],[.7 * side,2.17]],.08), cyan, 0,.11);
    const intake = part(group, new THREE.BoxGeometry(.52,.34,1.38), edge, side * .68,-.04,-.12);
    intake.rotation.y = side * -.12;
    part(group, new THREE.BoxGeometry(.055,.29,.74), silver, side * .76,.04,-.4);
    for (let rib=0; rib<5; rib++) {
      const plate=part(group,new THREE.BoxGeometry(.42,.034,.15),silver,side * .68,.205,.47+rib*.21);
      plate.rotation.z=side*-.12;
    }
    const fin=part(group,panel([[.0,.0],[.0,1.28],[.66,.76],[.95,.05]],.095),edge,side*.65,.12,1.08);
    fin.rotation.set(0,-Math.PI/2,side*-.2);
    // Fin profile is extruded in its own XY plane, then stands above the deck.
    fin.geometry.rotateX(-Math.PI / 2);
    const finStripe=part(group,new THREE.BoxGeometry(.05,.68,.22),cyan,side*.77,.54,1.47);
    finStripe.rotation.z=side*-.2;
    part(group,new THREE.BoxGeometry(.22,.1,.66),edge,side*2.34,-.12,.93);
    const cannon=part(group,new THREE.CylinderGeometry(.05,.07,.78,8),silver,side*2.34,-.12,.15);
    cannon.rotation.x=Math.PI/2;
    part(group,new THREE.BoxGeometry(.07,.035,1.2),glow,side*1.01,.21,.93);
    part(group,new THREE.SphereGeometry(.045,6,4),emissive(side<0?0xff3039:0x61ffb4),side*3.78,.06,1.32);
  }
  // Armor seams stay in geometry and continue to read without a texture atlas.
  for (let row=0; row<4; row++) part(group,new THREE.BoxGeometry(.31,.018,.018),edge,0,.34,.05+row*.24);
  engines(group,[-.67,.67],2.05,.31,enemy?0xff742e:0x55dfff);
  bakeArcadeAirframe(group);
  group.scale.setScalar(enemy ? (heavy ? .71 : .49) : 1.12);
  group.userData.referenceAirframe = true;
  return group;
}

export function createReferenceCarrier(stage: SkyDancerArcadeStageDefinition, scenery = false): THREE.Group {
  const group=new THREE.Group();
  group.name="arcade-reference-carrier";
  const hull=paint(0x3e4651,.52,.61);
  const deck=paint(0x687782,.48,.5);
  const lightArmor=paint(0x9dabb0,.4,.58);
  const dark=paint(0x111b26,.62,.42);
  const signal=emissive(stage.biome === "citadel" ? 0xff4dac : 0xff363d,1.8);
  const cyan=emissive(0x6be9ff,1.8);
  const main=part(group,loft([[-16,.08,.12,0],[-12,2.8,1.3,0],[-4,5,2.1,-.6],[7,6,2.2,-.8],[13,4.7,1.25,-.2],[15,3.8,.7,0]],8),hull);
  main.scale.x=1.12;
  part(group,panel([[-3,-14],[3,-14],[7,-2],[17,6],[16,11],[5,8],[-5,8],[-16,11],[-17,6],[-7,-2]],.65),deck,0,1.35);
  part(group,new THREE.BoxGeometry(3,.35,24),dark,0,1.7,-.5);
  for(let i=0;i<12;i++) part(group,new THREE.BoxGeometry(.12,.035,.85),lightArmor,0,1.92,-11+i*1.9);
  for(const side of [-1,1]) {
    part(group,new THREE.BoxGeometry(4.1,.48,16),hull,side*7.1,.75,1);
    part(group,new THREE.BoxGeometry(.24,.12,14),signal,side*9.1,1.04,.9);
    for(let i=0;i<8;i++) {
      const rib=part(group,new THREE.BoxGeometry(.42,2.7,1.38),i%2?deck:lightArmor,side*(4.4+i*.16),-.55,-7+i*2.7);
      rib.rotation.z=side*-.35;
      part(group,new THREE.BoxGeometry(.2,.21,.75),signal,side*5.3,-1.1,-6+i*2.7);
      part(group,new THREE.BoxGeometry(1.5,.13,.43),cyan,side*6.7,-1.88,-5+i*2.2);
    }
    for(let i=0;i<3;i++) {
      part(group,new THREE.BoxGeometry(1.35,.95,1.45),dark,side*(10.4+i*.95),1.8,4+i*2);
      part(group,new THREE.BoxGeometry(.3,.24,2.1),deck,side*(10.4+i*.95),2.15,3+i*2);
      part(group,new THREE.BoxGeometry(.66,.07,.08),signal,side*(10.4+i*.95),2.34,3.6+i*2);
    }
    const armor=part(group,new THREE.BoxGeometry(1.8,.8,14),lightArmor,side*5.1,-1.6,2);
    armor.rotation.z=side*.24;
    if(!scenery) {
      const core=part(group,new THREE.IcosahedronGeometry(.95,1),signal,side*4.9,.0,-8.4);
      core.name="arcade-boss-weakpoint";
    }
  }
  part(group,new THREE.BoxGeometry(3.4,2.25,5.4),hull,2.5,2.5,2.1);
  part(group,new THREE.BoxGeometry(3.7,.5,3.3),dark,2.5,3.86,1.4);
  part(group,new THREE.BoxGeometry(3.75,.18,2.95),cyan,2.5,3.96,1.34);
  part(group,new THREE.BoxGeometry(1.65,1.45,2.3),lightArmor,2.5,4.8,2);
  part(group,new THREE.CylinderGeometry(.07,.16,3.4,7),deck,2.5,6.65,2.6);
  part(group,new THREE.BoxGeometry(3.1,.14,.2),dark,2.5,7.9,2.6);
  engines(group,[-5.1,-2,2,5.1],12.5,1.0,0x63d8ff);
  bakeArcadeAirframe(group);
  group.userData.arcadeBaseScale=stage.boss === "prism-titan" ? 1.5 : 1.12;
  return group;
}
