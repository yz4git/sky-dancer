from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeEnemyAirframes.ts")
text = path.read_text()

import_anchor = '''import * as THREE from "three";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";
import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
'''
import_replacement = '''import * as THREE from "three";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";
import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { skyDancerArcadeV29EnemyColorIdentity } from "./SkyDancerArcadeV29EnemyColorIdentity";
'''
assert import_anchor in text, "V29 import anchor changed"
text = text.replace(import_anchor, import_replacement, 1)

materials_old = '''function materials(stage: SkyDancerArcadeStageDefinition): Materials {
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
'''
materials_new = '''function materials(stage: SkyDancerArcadeStageDefinition, kind: SkyDancerArcadeEnemyKind): Materials {
  const enemy = new THREE.Color(stage.palette.enemy);
  const accent = new THREE.Color(stage.palette.accent);
  const identity = skyDancerArcadeV29EnemyColorIdentity(kind);
  // V29: role color owns the silhouette. A small stage tint keeps the formation coherent with the environment
  // without collapsing every aircraft back into the old stage-global red family.
  const bodyColor = new THREE.Color(identity.body).lerp(enemy, .12);
  const secondaryColor = new THREE.Color(identity.secondary).lerp(accent, .1);
  const darkColor = new THREE.Color(0x171923).lerp(bodyColor, .34);
  const canopyGlow = new THREE.Color(identity.glow).lerp(new THREE.Color(0x0a4056), .62);
  const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: .32, metalness: .5, flatShading: true });
  const secondary = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: .29, metalness: .54, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: darkColor, roughness: .4, metalness: .6, flatShading: true });
  const canopy = new THREE.MeshPhysicalMaterial({
    color: 0x071a28,
    emissive: canopyGlow,
    emissiveIntensity: .35,
    roughness: .12,
    metalness: .74,
    clearcoat: 1,
    clearcoatRoughness: .05,
  });
  const hot = new THREE.MeshBasicMaterial({ color: identity.glow, toneMapped: false });
  return { body, secondary, dark, canopy, hot };
}
'''
assert materials_old in text, "V29 materials anchor changed"
text = text.replace(materials_old, materials_new, 1)

beacon_old = '''function createRoundBeaconsV18(span: number, rearZ: number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
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
'''
beacon_new = '''function createRoundBeaconsV18(
  span: number,
  rearZ: number,
  wingColor: number,
  tailColor: number,
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -span, .12, rearZ,
    span, .12, rearZ,
    0, .27, rearZ + .55,
  ], 3));
  geometry.setAttribute("beaconMix", new THREE.Float32BufferAttribute([0, 0, 1], 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      wingColor: { value: new THREE.Color(wingColor) },
      tailColor: { value: new THREE.Color(tailColor) },
    },
    vertexShader: `attribute float beaconMix; varying float vMix;
      void main(){vMix=beaconMix;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=6.0;}`,
    fragmentShader: `uniform vec3 wingColor; uniform vec3 tailColor; varying float vMix;
      void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
        float a=1.0-smoothstep(.28,1.0,r);
        gl_FragColor=vec4(mix(wingColor,tailColor,vMix)*(1.45+a*.9),a*.95);}`,
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
  points.userData.arcadeEnemyRoleColorBeaconV29 = true;
  return points;
}
'''
assert beacon_old in text, "V29 beacon anchor changed"
text = text.replace(beacon_old, beacon_new, 1)

create_old = '''  group.name = `arcade-enemy-v18-airframe-${kind}`;
  const mat = materials(stage);
  const identity: Record<SkyDancerArcadeEnemyKind, string> = {
'''
create_new = '''  group.name = `arcade-enemy-v18-airframe-${kind}`;
  const mat = materials(stage, kind);
  const colorIdentityV29 = skyDancerArcadeV29EnemyColorIdentity(kind);
  const identity: Record<SkyDancerArcadeEnemyKind, string> = {
'''
assert create_old in text, "V29 create-airframe anchor changed"
text = text.replace(create_old, create_new, 1)

beacon_call_old = '''  group.add(createRoundBeaconsV18(built.span, built.rearZ));
  group.scale.setScalar(built.baseScale);
'''
beacon_call_new = '''  group.add(createRoundBeaconsV18(built.span, built.rearZ, colorIdentityV29.secondary, colorIdentityV29.glow));
  group.scale.setScalar(built.baseScale);
'''
assert beacon_call_old in text, "V29 beacon call anchor changed"
text = text.replace(beacon_call_old, beacon_call_new, 1)

userdata_anchor = '''  group.userData.arcadeEnemyLogicalCollisionUnchangedV18 = true;
  group.userData.arcadeEnemyRosterV20 = kind;
  return group;
'''
userdata_replacement = '''  group.userData.arcadeEnemyLogicalCollisionUnchangedV18 = true;
  group.userData.arcadeEnemyRosterV20 = kind;
  group.userData.arcadeEnemyColorIdentityV29 = true;
  group.userData.arcadeEnemyColorRoleV29 = colorIdentityV29.role;
  group.userData.arcadeEnemyColorBodyV29 = colorIdentityV29.body;
  group.userData.arcadeEnemyColorSecondaryV29 = colorIdentityV29.secondary;
  group.userData.arcadeEnemyColorGlowV29 = colorIdentityV29.glow;
  return group;
'''
assert userdata_anchor in text, "V29 userData anchor changed"
text = text.replace(userdata_anchor, userdata_replacement, 1)

path.write_text(text)
print("V29 enemy color identity patch applied")
