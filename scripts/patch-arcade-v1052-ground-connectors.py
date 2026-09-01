from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing marker: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique marker {label}: {text.count(old)}')
    return text.replace(old, new, 1)

ref = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
text = ref.read_text()
marker = '''export function arcadeSharedSceneryAttitudeV1041(\n  stage: SkyDancerArcadeStageDefinition,\n  distance: number,\n): { pitch: number; yaw: number; roll: number } {\n  const here=arcadeCoursePose(stage,distance);\n  return {\n    // World-authored structures all receive the same inverse current flight attitude.\n    // Their centres can follow the curved route, but they never swivel independently by depth.\n    pitch:-here.pitch,\n    yaw:here.yaw,\n    roll:-here.bank*arcadeCourseVisualBankScaleV104(stage),\n  };\n}\n'''
insert = marker + '''\n// V10.5.2: single source of truth for the visible floor beneath course-anchored structures.\n// Returns Y relative to the course centre; null means the biome is intentionally airborne/spaceborne.\nexport function arcadeGroundSurfaceLocalYV1052(\n  stage: SkyDancerArcadeStageDefinition,\n  distance: number,\n  depth: number,\n  lateral: number,\n): number | null {\n  if (stage.biome === "city") return -25.82; // river bed / quay datum\n  if (stage.biome === "night") return -25; // streamed metro foundation datum\n  if (stage.biome === "citadel") return -19.2; // final-stage floor rail datum\n  if (!["canyon", "desert", "ice", "volcano"].includes(stage.biome)) return null;\n\n  const course = arcadeCourseRelativeVisualPose(stage, distance, depth);\n  const worldDepth = distance + depth;\n  const ridge = Math.max(0, Math.abs(lateral) - 16);\n  const ripple = Math.sin(worldDepth * .028 + lateral * .014) * Math.cos(lateral * .13 - worldDepth * .008);\n  const micro = Math.sin(worldDepth * .16 + lateral * .21) * Math.cos(lateral * .31 - worldDepth * .09);\n  const h = -27\n    + Math.pow(ridge, .82) * (stage.biome === "desert" ? .6 : 1.45)\n    + (3 + ridge * .07) * ripple\n    + micro * (stage.biome === "desert" ? .7 : 1.45);\n  const bankScale = stage.biome === "desert" ? .1 : stage.biome === "ice" ? .12 : .16;\n  return h + Math.tan(course.bank * bankScale) * lateral;\n}\n'''
text = replace_once(text, marker, insert, 'ground surface helper insertion')
ref.write_text(text)

models = Path('src/sky/arcade/SkyDancerArcadeModels.ts')
text = models.read_text()
mesh_marker = '''function flatMaterial(color: number, emissive = 0): THREE.MeshStandardMaterial {\n  return new THREE.MeshStandardMaterial({\n    color,\n    roughness: 0.38,\n    metalness: 0.26,\n    flatShading: true,\n    emissive,\n    emissiveIntensity: emissive ? 0.58 : 0,\n  });\n}\n'''
mesh_insert = mesh_marker + '''\nfunction markArcadeGroundConnectorV1052(mesh: THREE.Mesh, baseHeight: number): void {\n  mesh.userData.arcadeGroundConnectorV1052 = true;\n  mesh.userData.arcadeGroundConnectorTopYV1052 = mesh.position.y + baseHeight * .5;\n  mesh.userData.arcadeGroundConnectorBaseHeightV1052 = baseHeight;\n  mesh.userData.arcadeGroundConnectorBaseScaleYV1052 = mesh.scale.y;\n}\n\nexport function extendArcadeGroundConnectorsV1052(group: THREE.Group, groundLocalY: number): void {\n  let connected = 0;\n  group.traverse(object => {\n    if (!(object instanceof THREE.Mesh) || object.userData.arcadeGroundConnectorV1052 !== true) return;\n    const top = Number(object.userData.arcadeGroundConnectorTopYV1052);\n    const baseHeight = Number(object.userData.arcadeGroundConnectorBaseHeightV1052);\n    const baseScaleY = Number(object.userData.arcadeGroundConnectorBaseScaleYV1052);\n    if (!Number.isFinite(top) || !Number.isFinite(baseHeight) || baseHeight <= 0 || !Number.isFinite(baseScaleY)) return;\n    // Never shorten authored geometry. Only grow downward, preserving the top/collision silhouette exactly.\n    const targetHeight = Math.max(baseHeight, top - groundLocalY);\n    object.scale.y = baseScaleY * targetHeight / baseHeight;\n    object.position.y = top - targetHeight * .5;\n    object.userData.arcadeGroundConnectorBottomYV1052 = top - targetHeight;\n    connected += 1;\n  });\n  group.userData.arcadeGroundConnectedV1052 = connected > 0;\n  group.userData.arcadeGroundConnectorCountV1052 = connected;\n  group.userData.arcadeGroundLocalYV1052 = groundLocalY;\n}\n'''
text = replace_once(text, mesh_marker, mesh_insert, 'connector helper insertion')
repls = [
('''    shaft.position.y = -4.9;\n    group.add(shaft);''','''    shaft.position.y = -4.9;\n    markArcadeGroundConnectorV1052(shaft, 10.8);\n    group.add(shaft);''','city tower shaft'),
('''      support.position.set(side * 2.25, -2.75, 0);\n      group.add(support);''','''      support.position.set(side * 2.25, -2.75, 0);\n      markArcadeGroundConnectorV1052(support, 7.8);\n      group.add(support);''','city gate supports'),
('''    main.position.y = -4.2;\n    main.rotation.y = 0.22;''','''    main.position.y = -4.2;\n    markArcadeGroundConnectorV1052(main, 10.5);\n    main.rotation.y = 0.22;''','canyon spire'),
('''      pillar.position.set(side * 2.55, -3.1, 0);\n      pillar.rotation.z = side * 0.08;''','''      pillar.position.set(side * 2.55, -3.1, 0);\n      markArcadeGroundConnectorV1052(pillar, 8.8);\n      pillar.rotation.z = side * 0.08;''','canyon bridge pillars'),
('''    shaft.position.y = -4.0;\n    group.add(shaft);''','''    shaft.position.y = -4.0;\n    markArcadeGroundConnectorV1052(shaft, 9.4);\n    group.add(shaft);''','desert pylon'),
('''      crystal.position.set(side * 2.55, -2.75, 0);\n      crystal.rotation.z = side * 0.13;''','''      crystal.position.set(side * 2.55, -2.75, 0);\n      markArcadeGroundConnectorV1052(crystal, 9.2);\n      crystal.rotation.z = side * 0.13;''','ice arch'),
('''    pillar.position.y = -4.15;\n    group.add(pillar);''','''    pillar.position.y = -4.15;\n    markArcadeGroundConnectorV1052(pillar, 10.2);\n    group.add(pillar);''','volcano pillar'),
('''      blade.position.set(side * 1.75, -0.55, 0);\n      blade.rotation.z = side * 0.34;''','''      blade.position.set(side * 1.75, -0.55, 0);\n      markArcadeGroundConnectorV1052(blade, 6.2);\n      blade.rotation.z = side * 0.34;''','citadel gate blades'),
('''    spire.position.y = -4.0;\n    group.add(spire);''','''    spire.position.y = -4.0;\n    markArcadeGroundConnectorV1052(spire, 10.2);\n    group.add(spire);''','citadel spire'),
]
for old,new,label in repls:
    text = replace_once(text, old, new, label)
models.write_text(text)

demo = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
text = demo.read_text()
text = replace_once(text,
'''import { arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";''',
'''import { arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";''',
'demo ground import')
text = replace_once(text,
'''  createSkyDancerArcadeEnemy,\n  createSkyDancerArcadeHazard,\n  createSkyDancerArcadeLockRing,\n  createSkyDancerArcadePlayer,\n} from "./SkyDancerArcadeModels";''',
'''  createSkyDancerArcadeEnemy,\n  createSkyDancerArcadeHazard,\n  createSkyDancerArcadeLockRing,\n  createSkyDancerArcadePlayer,\n  extendArcadeGroundConnectorsV1052,\n} from "./SkyDancerArcadeModels";''',
'demo connector import')
old = '''      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, hazard.depth);\n      group.position.set(hazard.x * 8.4 + course.x, 1.2 + hazard.y * 4.9 + course.y, course.z);\n      if (group.userData.arcadeWorldAnchoredHazardV105 === true) {\n        // V10.5: terrain and architecture are one part of the course world, never independent actors.\n        const sceneryAttitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);\n        group.rotation.set(sceneryAttitude.pitch, sceneryAttitude.yaw, sceneryAttitude.roll);\n'''
new = '''      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, hazard.depth);\n      const hazardLateral = hazard.x * 8.4;\n      group.position.set(hazardLateral + course.x, 1.2 + hazard.y * 4.9 + course.y, course.z);\n      if (group.userData.arcadeWorldAnchoredHazardV105 === true) {\n        // V10.5: terrain and architecture are one part of the course world, never independent actors.\n        const sceneryAttitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);\n        group.rotation.set(sceneryAttitude.pitch, sceneryAttitude.yaw, sceneryAttitude.roll);\n        // V10.5.2: keep the authored top/collision lane fixed and extend only foundations down to the actual floor.\n        const surfaceLocalY = arcadeGroundSurfaceLocalYV1052(snapshot.stage, snapshot.distance, hazard.depth, hazardLateral);\n        if (surfaceLocalY !== null) {\n          const groundWorldY = course.y - snapshot.playerY * .16 + surfaceLocalY;\n          extendArcadeGroundConnectorsV1052(group, groundWorldY - group.position.y);\n        }\n'''
text = replace_once(text, old, new, 'sync hazard grounding')
demo.write_text(text)

test_path = Path('tests/sky-arcade-reference.test.ts')
text = test_path.read_text()
text = replace_once(text,
'''import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, arcadeSharedSceneryAttitudeV1041, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";''',
'''import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";\nimport { createSkyDancerArcadeHazard, extendArcadeGroundConnectorsV1052 } from "../src/sky/arcade/SkyDancerArcadeModels";''',
'test imports')
append = '''\n\ntest("V10.5.2 grounded structural hazards preserve their top while foundations reach the visible floor", () => {\n  const city = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "city");\n  assert.ok(city);\n  const surface = arcadeGroundSurfaceLocalYV1052(city, 120, 90, 0);\n  assert.equal(surface, -25.82);\n  const gate = createSkyDancerArcadeHazard(city, { id: 991, kind: "arch" } as never);\n  const connectors: THREE.Mesh[] = [];\n  gate.traverse(object => {\n    if (object instanceof THREE.Mesh && object.userData.arcadeGroundConnectorV1052 === true) connectors.push(object);\n  });\n  assert.equal(connectors.length, 2, "city gate has two terrain-reaching supports");\n  const tops = connectors.map(object => Number(object.userData.arcadeGroundConnectorTopYV1052));\n  extendArcadeGroundConnectorsV1052(gate, -27.02);\n  connectors.forEach((object, index) => {\n    const baseHeight = Number(object.userData.arcadeGroundConnectorBaseHeightV1052);\n    const baseScaleY = Number(object.userData.arcadeGroundConnectorBaseScaleYV1052);\n    const height = baseHeight * object.scale.y / baseScaleY;\n    assert.ok(Math.abs((object.position.y + height * .5) - tops[index]) < 1e-9, "gate top remains fixed in flight lane");\n    assert.ok(Math.abs((object.position.y - height * .5) - (-27.02)) < 1e-9, "support bottom reaches ground datum");\n  });\n  assert.equal(gate.userData.arcadeGroundConnectedV1052, true);\n\n  const orbit = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "orbit");\n  assert.ok(orbit);\n  assert.equal(arcadeGroundSurfaceLocalYV1052(orbit, 120, 90, 0), null, "space rings remain intentionally airborne");\n});\n'''
if 'V10.5.2 grounded structural hazards preserve their top' in text:
    raise SystemExit('V10.5.2 test already exists')
text += append
test_path.write_text(text)
