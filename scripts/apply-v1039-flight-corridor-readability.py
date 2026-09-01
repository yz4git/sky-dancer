from pathlib import Path

world_path = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
test_path = Path('tests/sky-arcade-reference.test.ts')
world = world_path.read_text()
tests = test_path.read_text()

needle = '''const SURFACE_CHUNK_DEPTH = CHUNK_LENGTH + 32; // V10.3.2: overlap pitched chunks so sky can never show through a terrain seam.\nconst CITY_QUAY_DEPTH = CHUNK_LENGTH + 12; // V10.3.3: city banks overlap modestly; the river itself is now a continuous spline ribbon.\n'''
replacement = '''const SURFACE_CHUNK_DEPTH = CHUNK_LENGTH + 32; // V10.3.2: overlap pitched chunks so sky can never show through a terrain seam.\nconst CITY_QUAY_DEPTH = CHUNK_LENGTH + 12; // V10.3.3: city banks overlap modestly; the river itself is now a continuous spline ribbon.\n\n// V10.3.9: phone playcheck clearance for visual-only near-pass scenery.\n// These values keep speed silhouettes at the edges without letting a sharp spline yaw wipe the central combat lane.\nexport const ARCADE_NEAR_PASS_CLEARANCE_V1039 = {\n  city: 30, night: 39, canyon: 42, volcano: 44, ice: 35, cloud: 39, storm: 38, ruins: 43, orbit: 42, citadel: 36,\n} as const;\n'''
assert needle in world, 'world constants changed'
world = world.replace(needle, replacement, 1)

needle = '''      const x=side*(25+r(j+71)*8.5);\n      // V10.3.7: canyon fins need more screen-space clearance than city towers; sharp spline yaw otherwise lets a near fin wipe the phone display.\n      const canyonX=side*(34+r(j+71)*10);\n      const volcanoX=side*(37+r(j+71)*9);\n      const iceX=side*(35+r(j+71)*11.5);\n      if(stage.biome==="city"){\n'''
replacement = '''      const x=side*(25+r(j+71)*8.5);\n      // V10.3.9: all dense visual-only fly-by sets share an explicit phone-safe inner corridor.\n      const cityX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.city+r(j+71)*9);\n      const canyonX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.canyon+r(j+71)*11);\n      const volcanoX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.volcano+r(j+71)*10);\n      const iceX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.ice+r(j+71)*11.5);\n      const orbitX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.orbit+r(j+71)*11);\n      group.userData.arcadeReadableFlightCorridorV1039=true;\n      if(stage.biome==="city"){\n'''
assert needle in world, 'near-pass clearance block changed'
world = world.replace(needle, replacement, 1)

# City close towers use the new explicit clearance rather than the legacy generic x.
world = world.replace('''        const tower=mesh(group,new THREE.BoxGeometry(w,h,d),j%3===0?secondary:primary,x,-25+h/2,z);\n''', '''        const tower=mesh(group,new THREE.BoxGeometry(w,h,d),j%3===0?secondary:primary,cityX,-25+h/2,z);\n''', 1)
world = world.replace('''        mesh(group,new THREE.BoxGeometry(w*1.38,h*.22,d*1.18),dark,x,-25+h*.11,z);\n        mesh(group,new THREE.BoxGeometry(w*.72,1.15,d*.76),secondary,x,-24.42+h,z);\n''', '''        mesh(group,new THREE.BoxGeometry(w*1.38,h*.22,d*1.18),dark,cityX,-25+h*.11,z);\n        mesh(group,new THREE.BoxGeometry(w*.72,1.15,d*.76),secondary,cityX,-24.42+h,z);\n''', 1)
world = world.replace('''          mesh(group,new THREE.BoxGeometry(w*1.06,.13,d*1.03),glow,x,-25+h*(.34+band*.2),z);\n''', '''          mesh(group,new THREE.BoxGeometry(w*1.06,.13,d*1.03),glow,cityX,-25+h*(.34+band*.2),z);\n''', 1)
world = world.replace('''        mesh(group,new THREE.BoxGeometry(.12,h*.62,d*1.04),glow,x-side*w*.34,-25+h*.54,z);\n        if(j%2===0) mesh(group,new THREE.BoxGeometry(.16,4+r(j+55)*5,.16),glow,x,-23.8+h+2.2,z);\n''', '''        mesh(group,new THREE.BoxGeometry(.12,h*.62,d*1.04),glow,cityX-side*w*.34,-25+h*.54,z);\n        if(j%2===0) mesh(group,new THREE.BoxGeometry(.16,4+r(j+55)*5,.16),glow,cityX,-23.8+h+2.2,z);\n''', 1)

world = world.replace('''        const metroX=side*(34+r(j+71)*10+(j%2)*3);\n''', '''        const metroX=side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.night+r(j+71)*10+(j%2)*3);\n''', 1)
world = world.replace('''        const h=stage.biome==="volcano"?20+r(j+9)*27:24+r(j+9)*36;\n''', '''        const h=stage.biome==="volcano"?18+r(j+9)*22:22+r(j+9)*29;\n''', 1)
world = world.replace('''        const pylon=mesh(group,new THREE.BoxGeometry(1.6,18+r(j+14)*14,5.5),j%2?secondary:primary,x,y,z);\n        pylon.rotation.z=side*(r(j+34)-.5)*.12;\n        mesh(group,new THREE.BoxGeometry(.2,15+r(j+54)*9,5.7),glow,x-side*1,y,z-.1);\n''', '''        const pylon=mesh(group,new THREE.BoxGeometry(1.5,16+r(j+14)*11,5),j%2?secondary:primary,orbitX,y,z);\n        pylon.rotation.z=side*(r(j+34)-.5)*.1;\n        mesh(group,new THREE.BoxGeometry(.18,13+r(j+54)*8,5.2),glow,orbitX-side*.9,y,z-.1);\n''', 1)

# Open the authored Orbit course frame as well; its bright material amplified edge wipes on a phone screen.
world = world.replace('''        const frame=mesh(group,new THREE.TorusGeometry(33,1.35,7,42,Math.PI*1.12),primary,0,0,0);\n        frame.name="arcade-orbital-open-frame";frame.rotation.z=index*.71;\n        for(const side of [-1,1]){\n          mesh(group,new THREE.BoxGeometry(4,24,10),secondary,side*36,0,-5);\n          mesh(group,new THREE.BoxGeometry(18,.2,32),dark,side*49,5,-5);\n          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.12,.25,31),glow,side*(42+j*3),5.2,-5);\n''', '''        const frame=mesh(group,new THREE.TorusGeometry(37.5,1.15,7,42,Math.PI*1.08),primary,0,0,0);\n        frame.name="arcade-orbital-open-frame";frame.rotation.z=index*.71;\n        for(const side of [-1,1]){\n          mesh(group,new THREE.BoxGeometry(3.4,22,9),secondary,side*42,0,-5);\n          mesh(group,new THREE.BoxGeometry(16,.18,30),dark,side*55,5,-5);\n          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.11,.22,29),glow,side*(48+j*3),5.2,-5);\n''', 1)

# Night Metro keeps the chicane, but the nearest rail/canopy no longer enters the central combat read.
world = world.replace('''      const railX=side*(lead?19:31);\n''', '''      const railX=side*(lead?24:34);\n''', 1)
world = world.replace('''        const canopy=mesh(group,new THREE.BoxGeometry(16,1.3,26),dark,side*26,6+tier*2,-14);\n''', '''        const canopy=mesh(group,new THREE.BoxGeometry(15,1.2,24),dark,side*30,6+tier*2,-14);\n''', 1)
world = world.replace('''          const support=mesh(group,new THREE.BoxGeometry(1.5,18,1.5),secondary,side*31,-2+tier*2,z);\n''', '''          const support=mesh(group,new THREE.BoxGeometry(1.4,17,1.4),secondary,side*35,-2+tier*2,z);\n''', 1)
world = world.replace('''        const post=mesh(group,new THREE.BoxGeometry(1.4,25,2),secondary,side*31,2,-32);\n''', '''        const post=mesh(group,new THREE.BoxGeometry(1.3,23,1.8),secondary,side*35,2,-32);\n''', 1)
world = world.replace('''        const arm=mesh(group,new THREE.BoxGeometry(12,1.3,2),side===leadSide?primary:dark,side*25,14,-32);\n''', '''        const arm=mesh(group,new THREE.BoxGeometry(10,1.2,1.8),side===leadSide?primary:dark,side*29,14,-32);\n''', 1)
world = world.replace('''        mesh(group,new THREE.BoxGeometry(7,.3,2.2),glow,side*21.5,15,-32);\n''', '''        mesh(group,new THREE.BoxGeometry(6,.26,2),glow,side*26,15,-32);\n''', 1)

# Extend the regression imports and verify the phone-safe minimums stay authored.
needle = '''import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";\n'''
replacement = '''import { ARCADE_NEAR_PASS_CLEARANCE_V1039, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";\n'''
assert needle in tests, 'reference world import changed'
tests = tests.replace(needle, replacement, 1)

tests += '''\n\ntest("V10.3.9 preserves a phone-readable central corridor for visual-only near passes", async () => {\n  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.city >= 30);\n  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.night >= 39);\n  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.canyon >= 42);\n  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.volcano >= 44);\n  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.orbit >= 42);\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  for (const id of ["red-canyon", "night-metro", "volcano-core", "orbital-ascent"] as const) {\n    const stage = SKY_DANCER_ARCADE_STAGES.find(candidate => candidate.id === id)!;\n    world.setStage(stage);\n    const root = scene.getObjectByName("arcade-course-environment");\n    const chunks = root?.children.filter(child => child.name.startsWith("arcade-course-chunk-")) ?? [];\n    assert.equal(chunks.length, 8);\n    assert.ok(chunks.every(chunk => chunk.userData.arcadeReadableFlightCorridorV1039 === true), `${id} readable corridor marker`);\n  }\n  world.dispose();\n});\n'''

world_path.write_text(world)
test_path.write_text(tests)
