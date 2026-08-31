from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests = "tests/sky-arcade-reference.test.ts"

replace_once(world,
'''      const temple=new THREE.Group();temple.name="arcade-ruins-sky-temple";temple.position.set(0,18,-390);
''',
'''      const temple=new THREE.Group();temple.name="arcade-ruins-sky-temple";temple.position.set(0,13,-305);
      temple.scale.setScalar(1.14);
''',
"bring sky temple into readable range")

replace_once(world,
'''          for(let i=0;i<2;i++){
            const h=hero?(i===0?17:10):(i===0?12:7.5);
            const column=mesh(group,new THREE.BoxGeometry(2.7,h,2.7),i===0?secondary:primary,x+side*(i===0?-6:6),-1+h*.5+lift,hero?-10+i*13:4+i*10);
            column.rotation.z=side*(i===1?.2:.035);
            if(i===1)column.rotation.x=.08*(tier||1);
          }
''',
'''          for(let i=0;i<2;i++){
            const h=hero?(i===0?18:12):(i===0?11:7);
            const column=mesh(group,new THREE.BoxGeometry(hero?3.1:2.5,h,hero?3.1:2.5),i===0?secondary:primary,x+side*(i===0?-5.4:5.4),-1+h*.5+lift,hero?-8+i*12:5+i*9);
            column.rotation.z=side*(i===1?.15:.025);
            if(i===1)column.rotation.x=.06*(tier||1);
          }
''',
"clarify broken gate supports")

replace_once(world,
'''          const lintel=mesh(group,new THREE.BoxGeometry(hero?17:12,2.3,3.2),secondary,x,14+lift,hero?-2:8);
          lintel.rotation.z=side*(hero?.14:-.09);
''',
'''          const lintel=mesh(group,new THREE.BoxGeometry(hero?14.5:10.5,2.5,3.5),secondary,x,13+lift,hero?-2:8);
          lintel.rotation.z=side*(hero?.1:-.07);
          if(hero) mesh(group,new THREE.BoxGeometry(9.5,.32,3.7),glow,x-side*.8,14.35+lift,-2.1);
''',
"tighten hero gate lintel")

replace_once(world,
'''        const ruinsX=side*(36+r(j+71)*13+(j%2)*3);
        const y=-9+r(j+6)*13;
        const slab=mesh(group,new THREE.BoxGeometry(8+r(j+15)*7,1.2,8+r(j+25)*6),j%2?dark:primary,ruinsX,y,z);
''',
'''        const ruinsX=side*(43+r(j+71)*12+(j%2)*3);
        const y=-11+r(j+6)*11;
        const slab=mesh(group,new THREE.BoxGeometry(6+r(j+15)*5.2,1.05,7+r(j+25)*5),j%2?dark:primary,ruinsX,y,z);
''',
"push foreground slabs out of center")

replace_once(tests,
'''  const temple=scene.getObjectByName("arcade-ruins-sky-temple");
  assert.ok(temple instanceof THREE.Group,
    "floating ruins must expose one distant sky-temple destination");
''',
'''  const temple=scene.getObjectByName("arcade-ruins-sky-temple");
  assert.ok(temple instanceof THREE.Group,
    "floating ruins must expose one distant sky-temple destination");
  assert.ok(temple.position.z > -340 && temple.scale.x >= 1.1,
    "V9.0.1 sky temple must remain large and close enough to read through the stage haze");
''',
"V9.0.1 temple readability assertion")

print("Applied Floating Ruins V9.0.1 readability polish")
