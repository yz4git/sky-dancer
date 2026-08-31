import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { bakeArcadeAirframe, createReferenceCarrier } from "./SkyDancerArcadeReferenceAirframes";
import {
  ARCADE_FOG_FAR, ARCADE_FOG_NEAR, ARCADE_SUN_DIRECTION,
  createArcadeCloudMaterial, createArcadeFacadeMaterial, createArcadeSky,
  createArcadeWaterMaterial, referenceAtmosphere,
} from "./SkyDancerArcadeReferenceMaterials";

const CHUNK_LENGTH = 112;
const CHUNK_COUNT = 8;
const WORLD_SPAN = CHUNK_LENGTH * CHUNK_COUNT;
const fract = (n: number) => n - Math.floor(n);
const random = (seed: number) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

interface CourseChunk { group: THREE.Group; index: number }

function paint(color: number, emission = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, roughness:.72, metalness:.16, emissive:emission,
    emissiveIntensity:emission ? 1.15 : 0,
  });
}

function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material, x=0,y=0,z=0): THREE.Mesh {
  const result=new THREE.Mesh(geometry,mat);
  result.position.set(x,y,z);group.add(result);
  return result;
}

function disposeTree(root: THREE.Object3D): void {
  const geometries=new Set<THREE.BufferGeometry>();
  const materials=new Set<THREE.Material>();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));
    if(object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
}

/** One owner for the rendered course: skyline / playable depth / foreground parallax. */
export class SkyDancerArcadeReferenceWorld {
  private readonly root=new THREE.Group();
  private readonly chunks:CourseChunk[]=[];
  private stage:SkyDancerArcadeStageDefinition|null=null;
  private water:THREE.ShaderMaterial|null=null;
  private carrier:THREE.Group|null=null;
  private readonly matrixObject=new THREE.Object3D();

  constructor(private readonly scene:THREE.Scene) {
    this.root.name="arcade-course-environment";scene.add(this.root);
  }

  setStage(stage:SkyDancerArcadeStageDefinition):void {
    if(this.stage?.id===stage.id)return;
    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.carrier=null;
    this.stage=stage;
    const palette=referenceAtmosphere(stage);
    this.scene.background=palette.zenith;
    this.scene.fog=new THREE.Fog(palette.fog,ARCADE_FOG_NEAR,ARCADE_FOG_FAR);
    const hemi=new THREE.HemisphereLight(0xc9e7ff,0x172938,palette.ambient);
    const key=new THREE.DirectionalLight(palette.key,palette.keyIntensity);
    key.position.copy(ARCADE_SUN_DIRECTION).multiplyScalar(250);
    const rim=new THREE.DirectionalLight(0x55cfff,1.05);
    rim.position.set(80,25,45);
    this.root.add(hemi,key,rim,createArcadeSky(stage),this.buildBackdrop(stage));
    this.water=createArcadeWaterMaterial(stage);
    const facade=createArcadeFacadeMaterial(palette.night);
    const cloud=createArcadeCloudMaterial(stage);
    for(let i=0;i<CHUNK_COUNT;i++){
      const group=this.buildChunk(stage,i,facade,cloud);
      this.root.add(group);this.chunks.push({group,index:i});
    }
    this.update(0,0,0);
  }

  update(distance:number,playerX:number,playerY:number):void {
    if(!this.stage)return;
    const amplitude=this.stage.curveStrength*19;
    const currentCurve=Math.sin(distance*.0018)*amplitude;
    for(const chunk of this.chunks) {
      const local=((chunk.index*CHUNK_LENGTH-distance)%WORLD_SPAN+WORLD_SPAN)%WORLD_SPAN;
      // All geometry is behind the camera before recycling; the other end is fog-hidden.
      chunk.group.position.z=140-local;
      const along=distance+local-140;
      chunk.group.position.x=Math.sin(along*.0018)*amplitude-currentCurve-playerX*.35;
      chunk.group.position.y=-playerY*.16;
    }
    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;
    if(this.carrier){
      this.carrier.position.y=34+Math.sin(distance*.001)*1.7;
      this.carrier.rotation.z=Math.sin(distance*.0012)*.024;
    }
  }

  private buildBackdrop(stage:SkyDancerArcadeStageDefinition):THREE.Group {
    const group=new THREE.Group();group.name="arcade-product-backdrop";
    const palette=referenceAtmosphere(stage);
    const sunMarker=new THREE.Object3D();sunMarker.name="arcade-product-sun";
    sunMarker.position.copy(ARCADE_SUN_DIRECTION).multiplyScalar(900);group.add(sunMarker);
    if(stage.biome==="orbit" || stage.biome==="citadel"){
      const planet=mesh(group,new THREE.SphereGeometry(190,48,28),new THREE.MeshStandardMaterial({color:0x267599,roughness:.93,metalness:.04}),-245,-225,-560);
      planet.name="arcade-orbital-planet";
      const atmosphere=mesh(group,new THREE.SphereGeometry(195,32,20),new THREE.MeshBasicMaterial({
        color:0x77bbff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,
      }),-245,-225,-560);
      atmosphere.name="arcade-planet-atmosphere";
      return group;
    }
    for(let layer=0;layer<4;layer++){
      const positions:number[]=[];const indices:number[]=[];
      for(let i=0;i<=80;i++){
        const x=(i/80-.5)*1500;
        const peak=Math.abs(Math.sin(i*.45+layer*2.1))*38+Math.abs(Math.sin(i*1.1+layer))*27;
        positions.push(x,-85,-510-layer*125,x,peak-15+layer*7,-510-layer*125);
        if(i<80){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const color=new THREE.Color(stage.biome==="city"?0x61718a:stage.palette.ground).lerp(palette.horizon,.22+layer*.19);
      mesh(group,g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,fog:false}));
    }
    if(stage.biome==="city" || stage.biome==="night"){
      const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),paint(0x526b7d),144);
      towers.name="arcade-distant-metropolis";
      for(let i=0;i<144;i++){
        const x=(random(i+19)-.5)*760;
        const hero=i%13===0; const h=14+random(i+117)*55+(hero?35:0);
        this.matrixObject.position.set(x,-39+h/2,-315-random(i+613)*250);
        this.matrixObject.scale.set((hero?2.7:4)+random(i+13)*8,h,(hero?3.4:5)+random(i+201)*9);
        this.matrixObject.rotation.set(0,0,0);this.matrixObject.updateMatrix();
        towers.setMatrixAt(i,this.matrixObject.matrix);
        towers.setColorAt(i,new THREE.Color(0x6d7b8c).lerp(palette.fog,random(i)*.4));
      }
      towers.computeBoundingSphere();group.add(towers);
    }
    if(stage.biome==="city" || stage.biome==="cloud" || stage.biome==="storm"){
      this.carrier=createReferenceCarrier(stage,true);
      this.carrier.name="arcade-horizon-fleet-carrier";
      this.carrier.scale.setScalar(stage.biome==="city"?3.8:3.3);
      this.carrier.position.set(46,34,-195);
      this.carrier.rotation.y=-.67;
      group.add(this.carrier);
    }
    return group;
  }

  private buildChunk(stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material,cloud:THREE.Material):THREE.Group {
    const group=new THREE.Group();group.name="arcade-course-chunk-"+index;
    const primary=paint(stage.palette.primary);
    const secondary=paint(stage.palette.secondary);
    const dark=paint(stage.palette.ground);
    const glow=paint(stage.palette.accent,stage.palette.accent);
    if(stage.biome==="city" || stage.biome==="night"){
      this.addCity(group,stage,index,facade);
    } else if(!["cloud","storm","orbit","citadel","ruins"].includes(stage.biome)){
      const ground=this.buildTerrain(stage,index);
      const groundMaterial=primary.clone();groundMaterial.vertexColors=true;groundMaterial.color.setHex(0xffffff);
      mesh(group,ground,groundMaterial).name="arcade-continuous-terrain";
    }
    if(!["orbit","citadel"].includes(stage.biome))this.addClouds(group,stage,index,cloud);
    const r=(i:number)=>random(index*37+stage.order*139+i*3.71);
    switch(stage.biome){
      case "city":case "night":break;
      case "canyon":case "desert":case "volcano":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
          if(stage.biome==="desert" && j%2===0){
            mesh(group,new THREE.BoxGeometry(12,2,9),dark,side*(28+j%2*28),h-24,-42+j*27);
            mesh(group,new THREE.BoxGeometry(.22,3,8),glow,side*(28+j%2*28),h-22,-42+j*27);
          }
        }
        if(stage.biome==="volcano"){
          const lava=mesh(group,new THREE.PlaneGeometry(23,114,8,8),glow,0,-25);
          lava.rotation.x=-Math.PI/2;
          for(let i=0;i<5;i++){
            const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);
            vent.rotation.z=.15;
          }
        }
        break;
      }
      case "cloud":case "storm":{
        for(const side of [-1,1]){
          const mast=mesh(group,new THREE.BoxGeometry(2.8,24,5),primary,side*32,-7,0);
          mast.rotation.z=side*.17;
          mesh(group,new THREE.BoxGeometry(17,.9,21),secondary,side*35,-12,0);
          mesh(group,new THREE.BoxGeometry(13,.1,.25),glow,side*35,-11.45,-7);
        }
        if(stage.biome==="storm" && index%2===0){
          const lightning=new THREE.Group();
          for(let j=0;j<4;j++){
            const bolt=mesh(lightning,new THREE.CylinderGeometry(.1,.18,8,5),glow,42+j%2*2,26-j*7,-20);
            bolt.rotation.z=(j%2?1:-1)*.25;
          }
          group.add(lightning);
        }
        break;
      }
      case "ice":{
        for(const side of [-1,1])for(let j=0;j<5;j++){
          const crystal=mesh(group,new THREE.ConeGeometry(3.5,25+r(j)*18,5),j%2?primary:secondary,side*(22+j%2*14),-7,-42+j*21);
          crystal.rotation.z=side*(.12+r(j)*.24);
        }
        const arch=mesh(group,new THREE.TorusGeometry(29,2.2,6,36,Math.PI),secondary,0,-17,0);
        arch.name="arcade-ice-vault";
        break;
      }
      case "ruins":{
        for(const side of [-1,1]){
          const island=mesh(group,new THREE.ConeGeometry(18,22,9),dark,side*31,-22,0);island.rotation.x=Math.PI;
          mesh(group,new THREE.CylinderGeometry(18,16,1.1,9),primary,side*31,-10.5,0);
          for(let i=0;i<4;i++){
            mesh(group,new THREE.CylinderGeometry(1.1,1.5,17,10),secondary,side*31+(i%2?7:-7),-2,-7+Math.floor(i/2)*14);
          }
          mesh(group,new THREE.BoxGeometry(20,1.7,21),primary,side*31,7.3,0);
          mesh(group,new THREE.BoxGeometry(17,.2,.22),glow,side*31,8.3,-9);
        }
        break;
      }
      case "orbit":{
        const ring=mesh(group,new THREE.TorusGeometry(33,1.9,8,48),primary,0,0,0);ring.rotation.z=index*.3;
        const light=mesh(group,new THREE.TorusGeometry(31,.16,5,48),glow,0,0,.2);
        light.name="arcade-orbital-guide";
        for(const side of [-1,1]){
          mesh(group,new THREE.BoxGeometry(4,24,10),secondary,side*36,0,-5);
          mesh(group,new THREE.BoxGeometry(18,.2,32),dark,side*49,5,-5);
          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.12,.25,31),glow,side*(42+j*3),5.2,-5);
        }
        break;
      }
      case "citadel":{
        for(const side of [-1,1]){
          const prism=mesh(group,new THREE.OctahedronGeometry(13,0),primary,side*34,0,0);prism.scale.y=2.4;
          const core=mesh(group,new THREE.OctahedronGeometry(6,0),glow,side*31,2,0);core.scale.y=2.9;
          mesh(group,new THREE.BoxGeometry(35,1.2,5),secondary,side*20,-19,0);
        }
        mesh(group,new THREE.TorusGeometry(25,.48,6,6),glow,0,0,-42);
        break;
      }
    }
    // Visual-only near-pass geometry: deliberately close to the flight corridor so speed is readable.
    this.addNearPassSetPieces(group,stage,index,primary,secondary,dark,glow);
    // Static structural detail is batched. Instanced towers/clouds remain their own batches.
    const structures=new THREE.Group();
    for(const child of [...group.children]){
      if(child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh) && !(child.material instanceof THREE.ShaderMaterial)){
        group.remove(child);structures.add(child);
      }
    }
    bakeArcadeAirframe(structures);group.add(structures);
    return group;
  }


  private addNearPassSetPieces(
    group:THREE.Group,
    stage:SkyDancerArcadeStageDefinition,
    index:number,
    primary:THREE.Material,
    secondary:THREE.Material,
    dark:THREE.Material,
    glow:THREE.Material,
  ):void {
    // arcade-near-pass-setpieces-v5: these are visual-only and never enter the hazard/collision runtime.
    group.userData.arcadeNearPassSetpiecesV5=true;
    const r=(i:number)=>random(index*631+stage.order*173+i*7.13);
    for(const side of [-1,1])for(let j=0;j<5;j++){
      const z=-51+j*24+r(j+41)*6;
      const x=side*(25+r(j+71)*8.5);
      if(stage.biome==="city" || stage.biome==="night"){
        const h=25+r(j+11)*31;
        const w=2.2+r(j+19)*1.8;
        const d=4+r(j+23)*2.2;
        const tower=mesh(group,new THREE.BoxGeometry(w,h,d),j%3===0?secondary:primary,x,-25+h/2,z);
        tower.rotation.y=(r(j+31)-.5)*.07;
        mesh(group,new THREE.BoxGeometry(w*1.38,h*.22,d*1.18),dark,x,-25+h*.11,z);
        mesh(group,new THREE.BoxGeometry(w*.72,1.15,d*.76),secondary,x,-24.42+h,z);
        for(let band=0;band<3;band++){
          mesh(group,new THREE.BoxGeometry(w*1.06,.13,d*1.03),glow,x,-25+h*(.34+band*.2),z);
        }
        mesh(group,new THREE.BoxGeometry(.12,h*.62,d*1.04),glow,x-side*w*.34,-25+h*.54,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.16,4+r(j+55)*5,.16),glow,x,-23.8+h+2.2,z);
      } else if(stage.biome==="canyon" || stage.biome==="desert" || stage.biome==="volcano"){
        const h=24+r(j+9)*36;
        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,x,-26+h/2,z);
        fin.rotation.z=side*(.06+r(j+27)*.16);
        fin.rotation.y=r(j+37)*Math.PI;
        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,x-side*2,-13,z+2);
      } else if(stage.biome==="ice"){
        const h=24+r(j+8)*31;
        const crystal=mesh(group,new THREE.ConeGeometry(2.7+r(j+12)*2.2,h,5),j%2?primary:secondary,x,-19+h/2,z);
        crystal.rotation.z=side*(.12+r(j+24)*.22);
        if(j%2===1) mesh(group,new THREE.OctahedronGeometry(2.6+r(j+44)*2.1,0),glow,x-side*3,2+r(j+66)*8,z+3);
      } else if(stage.biome==="cloud" || stage.biome==="storm"){
        const y=-5+r(j+6)*15;
        const deck=mesh(group,new THREE.BoxGeometry(8+r(j+16)*6,1.1,13+r(j+26)*9),j%2?secondary:primary,x,y,z);
        deck.rotation.z=side*(r(j+32)-.5)*.09;
        mesh(group,new THREE.BoxGeometry(.22,.18,11+r(j+52)*7),glow,x-side*1.7,y+.72,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(1.1,11+r(j+62)*9,1.1),dark,x+side*2.2,y+6,z+2);
      } else if(stage.biome==="ruins"){
        const h=19+r(j+5)*22;
        mesh(group,new THREE.CylinderGeometry(1.3,1.8,h,8),j%2?secondary:primary,x,-9+h/2,z);
        mesh(group,new THREE.BoxGeometry(8+r(j+15)*5,1.1,7+r(j+25)*4),dark,x,-10,z);
        if(j%2===0) mesh(group,new THREE.TorusGeometry(4.2,.28,5,18,Math.PI),glow,x,5+r(j+35)*7,z+2);
      } else if(stage.biome==="orbit"){
        const y=-7+r(j+4)*18;
        const pylon=mesh(group,new THREE.BoxGeometry(1.6,18+r(j+14)*14,5.5),j%2?secondary:primary,x,y,z);
        pylon.rotation.z=side*(r(j+34)-.5)*.12;
        mesh(group,new THREE.BoxGeometry(.2,15+r(j+54)*9,5.7),glow,x-side*1,y,z-.1);
      } else if(stage.biome==="citadel"){
        const prism=mesh(group,new THREE.OctahedronGeometry(4.6+r(j+3)*3.6,0),j%2?secondary:primary,x,-1+r(j+13)*9,z);
        prism.scale.y=1.7+r(j+33)*1.1;
        prism.rotation.z=side*(.15+r(j+43)*.22);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.3,18,3),glow,x-side*3,2,z+2);
      }
    }
  }

  private addCity(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material):void {
    const count=72;
    const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),facade,count);
    towers.name="arcade-product-city-towers-"+index;
    const roofs=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),paint(0x53616d),count);
    const spires=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.23,1,6),paint(0x697989),72);
    let n=0;let a=0;
    for(const side of [-1,1])for(let row=0;row<6;row++)for(let lane=0;lane<6;lane++){
      const seed=index*229+n*11;
      const hero=lane>1 && random(seed+97)>.77; const h=lane===0 ? 9+random(seed+3)*14 : 15+random(seed+4)*45+(hero?22:0);
      const w=(hero?3.2:4.1)+random(seed+13)*(hero?3.4:5.1);
      const d=5+random(seed+29)*6.5;
      const x=side*(31+lane*15+random(seed+7)*4.2);
      const z=-50+row*19+random(seed+61)*4.5;
      this.matrixObject.position.set(x,-25+h/2,z);
      this.matrixObject.scale.set(w,h,d);this.matrixObject.rotation.set(0,0,0);this.matrixObject.updateMatrix();
      towers.setMatrixAt(n,this.matrixObject.matrix);
      towers.setColorAt(n,new THREE.Color(stage.biome==="night"?0x172d4b:0x39586b).lerp(new THREE.Color(stage.biome==="night"?0x536b8e:0x94abba),.12+random(seed+37)*.62));
      this.matrixObject.position.y=-25+h+1;
      this.matrixObject.scale.set(w*.61,2,d*.66);this.matrixObject.updateMatrix();roofs.setMatrixAt(n,this.matrixObject.matrix);
      if(hero || n%3===0){
        const height=3+random(seed+119)*(hero?10:5);
        this.matrixObject.position.y=-23+h+height/2;this.matrixObject.scale.set(1,height,1);this.matrixObject.updateMatrix();
        spires.setMatrixAt(a++,this.matrixObject.matrix);
      }
      n++;
    }
    towers.computeBoundingSphere();roofs.computeBoundingSphere();spires.count=a;spires.computeBoundingSphere();
    group.add(towers,roofs,spires);
    mesh(group,new THREE.BoxGeometry(250,1,114),paint(stage.biome==="night"?0x111d31:0x213746),0,-26);
    if(this.water){const river=mesh(group,new THREE.PlaneGeometry(40,114),this.water,-.4,-25.35);river.rotation.x=-Math.PI/2;}
    const bank=paint(stage.biome==="night"?0x314559:0x506879),road=paint(0x132635),light=paint(0xffc06e,0xff963b);
    for(const side of [-1,1]){
      mesh(group,new THREE.BoxGeometry(2.4,1.3,114),bank,side*21,-25.1);
      mesh(group,new THREE.BoxGeometry(3.5,.12,114),road,side*24,-24.32);
      mesh(group,new THREE.BoxGeometry(.07,.06,112),light,side*24,-24.22);
      for(let r=0;r<4;r++)mesh(group,new THREE.BoxGeometry(83,.14,2.2),road,side*66,-24.6,-53+r*28);
    }
    if(index%3===1){
      mesh(group,new THREE.BoxGeometry(52,.9,4),bank,0,-18.5,0);
      mesh(group,new THREE.BoxGeometry(51,.05,2.5),road,0,-18,0);
      for(const side of [-1,1]){
        mesh(group,new THREE.CylinderGeometry(.55,.7,9,8),bank,side*18,-21,0);
        mesh(group,new THREE.BoxGeometry(52,.06,.08),light,0,-17.85,side*1.65);
      }
    }
  }

  private addClouds(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,mat:THREE.Material):void {
    const cloud=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),mat,["cloud","storm"].includes(stage.biome)?30:18);
    cloud.name="arcade-product-cloud-deck-"+index;
    const inCloud=["cloud","storm"].includes(stage.biome);
    for(let cluster=0;cluster<(inCloud?5:3);cluster++)for(let puff=0;puff<6;puff++){
      const n=cluster*6+puff,seed=index*83+cluster*31;
      const side=cluster%2?-1:1;
      const baseX=side*(inCloud?18:38)+side*random(seed+3)*(inCloud?30:34);
      const baseZ=-44+cluster*(inCloud?21:37);
      const radius=(inCloud?3.2:2.1)+random(seed+puff*17)*(inCloud?3.6:2.2);
      this.matrixObject.position.set(baseX+(puff%3-1)*(inCloud?5:4),-12+random(seed)*3+Math.floor(puff/3)*1.4,baseZ+(puff%2?4:-4));
      if(!inCloud)this.matrixObject.position.y-=5;
      this.matrixObject.scale.set(radius*1.55,radius*.62,radius*1.2);
      this.matrixObject.rotation.set(0,random(seed+puff),0);
      this.matrixObject.updateMatrix();cloud.setMatrixAt(n,this.matrixObject.matrix);
    }
    cloud.computeBoundingSphere();group.add(cloud);
  }

  private buildTerrain(stage:SkyDancerArcadeStageDefinition,index:number):THREE.BufferGeometry {
    const g=new THREE.PlaneGeometry(260,114,48,30);g.rotateX(-Math.PI/2);
    const position=g.getAttribute("position") as THREE.BufferAttribute;
    const color=new Float32Array(position.count*3);
    const low=new THREE.Color(stage.palette.ground),high=new THREE.Color(stage.palette.secondary),c=new THREE.Color();
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),z=position.getZ(i)+index*CHUNK_LENGTH;
      const ridge=Math.max(0,Math.abs(x)-16);
      const ripple=Math.sin(z*.028+x*.014)*Math.cos(x*.13-z*.008);
      const micro=Math.sin(z*.16+x*.21)*Math.cos(x*.31-z*.09);
      const h=-27+Math.pow(ridge,.82)*(stage.biome==="desert"?.6:1.45)+(3+ridge*.07)*ripple+micro*(stage.biome==="desert"?.7:1.45);
      position.setY(i,h);
      c.copy(low).lerp(high,Math.min(.9,(h+29)/77));
      color.set([c.r,c.g,c.b],i*3);
    }
    g.setAttribute("color",new THREE.BufferAttribute(color,3));g.computeVertexNormals();
    return g;
  }

  dispose():void {
    disposeTree(this.root);this.water?.dispose();this.scene.remove(this.root);this.chunks.length=0;
  }
}
