from pathlib import Path
p=Path(__file__).resolve().parents[1]/"src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
text=p.read_text()
old='''  private updateIceRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.iceRibbon)return;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{'''
new='''  private updateIceRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.iceRibbon)return;\n    const stage=this.stage;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{'''
if old not in text: raise SystemExit("ice narrowing anchor missing")
text=text.replace(old,new,1)
old='const course=arcadeCourseRelativePose(this.stage,distance,depth);'
if old not in text: raise SystemExit("ice course anchor missing")
text=text.replace(old,'const course=arcadeCourseRelativePose(stage,distance,depth);',1)
old='''  private updateVolcanoRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.volcanoRibbon)return;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{'''
new='''  private updateVolcanoRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.volcanoRibbon)return;\n    const stage=this.stage;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{'''
if old not in text: raise SystemExit("volcano narrowing anchor missing")
text=text.replace(old,new,1)
old='const course=arcadeCourseRelativePose(this.stage,distance,depth);'
if old not in text: raise SystemExit("volcano course anchor missing")
text=text.replace(old,'const course=arcadeCourseRelativePose(stage,distance,depth);',1)
p.write_text(text)
print("Fixed existing Arcade world nullable stage narrowing")
