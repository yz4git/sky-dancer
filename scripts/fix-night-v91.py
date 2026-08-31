from pathlib import Path

path=Path("src/sky/arcade/SkyDancerArcadeReferenceWorld.ts")
text=path.read_text()
old='''        mesh(group,new THREE.BoxGeometry(.18,.11,112),secondary,side*15.5,-24.92,0);'''
new='''        mesh(group,new THREE.BoxGeometry(.18,.11,112),paint(stage.palette.secondary),side*15.5,-24.92,0);'''
if old not in text:
    raise SystemExit("missing Night Metro secondary rail material")
path.write_text(text.replace(old,new,1))
print("Fixed NIGHT METRO V9.1 scoped rail material")
