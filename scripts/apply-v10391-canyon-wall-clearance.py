from pathlib import Path

world_path=Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
test_path=Path('tests/sky-arcade-reference.test.ts')
world=world_path.read_text(); tests=test_path.read_text()

old='''      case "canyon":{\n        // V10.3.1 foreground safety: keep the knife-run walls dramatic without a near cliff swallowing half the phone.\n        group.userData.arcadeCanyonV1031Clearance=true;\n        for(const side of [-1,1])for(let j=0;j<4;j++){\n          const h=17+r(j+side*15)*30;\n          const rock=mesh(group,new THREE.CylinderGeometry(3.5+r(j+3)*4.2,6.5+r(j+5)*5.5,h,7,3),j%2?primary:secondary,side*(34+j%2*30),-25+h/2,-42+j*27);\n          rock.rotation.y=r(j+19)*2;\n        }\n        break;\n      }\n'''
new='''      case "canyon":{\n        // V10.3.9.1 phone playcheck: retain the knife-run silhouette but move the nearest authored wall\n        // outside the combat lane. The former x=34 / ~12m base radius could still cover a third of 852px.\n        group.userData.arcadeCanyonV1031Clearance=true;\n        group.userData.arcadeCanyonV10391PhoneWallClearance=true;\n        for(const side of [-1,1])for(let j=0;j<4;j++){\n          const h=15+r(j+side*15)*25;\n          const rock=mesh(group,new THREE.CylinderGeometry(3.2+r(j+3)*3.8,5.8+r(j+5)*4.8,h,7,3),j%2?primary:secondary,side*(ARCADE_NEAR_PASS_CLEARANCE_V1039.canyon+j%2*30),-25+h/2,-42+j*27);\n          rock.rotation.y=r(j+19)*2;\n        }\n        break;\n      }\n'''
assert old in world, 'canyon block changed'
world=world.replace(old,new,1)

old='''    assert.ok(chunks.every(chunk => chunk.userData.arcadeReadableFlightCorridorV1039 === true), `${id} readable corridor marker`);\n  }\n  world.dispose();\n});\n'''
new='''    assert.ok(chunks.every(chunk => chunk.userData.arcadeReadableFlightCorridorV1039 === true), `${id} readable corridor marker`);\n    if (id === "red-canyon") {\n      assert.ok(chunks.every(chunk => chunk.userData.arcadeCanyonV10391PhoneWallClearance === true), "red-canyon authored walls keep phone clearance");\n    }\n  }\n  world.dispose();\n});\n'''
assert old in tests, 'V10.3.9 test tail changed'
tests=tests.replace(old,new,1)

world_path.write_text(world); test_path.write_text(tests)
