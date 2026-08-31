import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";
import { arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";
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
interface RouteCue { group: THREE.Group; depth: number; phase: number; kind: "ice" | "volcano" | "orbit" }

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
  private readonly routeCues:RouteCue[]=[];
  private iceRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;
  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;
  private stage:SkyDancerArcadeStageDefinition|null=null;
  private water:THREE.ShaderMaterial|null=null;
  private readonly matrixObject=new THREE.Object3D();

  constructor(private readonly scene:THREE.Scene) {
    this.root.name="arcade-course-environment";scene.add(this.root);
  }

  setStage(stage:SkyDancerArcadeStageDefinition):void {
    if(this.stage?.id===stage.id)return;
    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;
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
    this.buildRouteCues(stage);
    if(stage.biome==="ice")this.buildIceRibbon(stage);
    if(stage.biome==="volcano")this.buildVolcanoRibbon(stage);
    this.update(0,0,0);
  }

  update(distance:number,playerX:number,playerY:number):void {
    if(!this.stage)return;
    for(const chunk of this.chunks) {
      const local=((chunk.index*CHUNK_LENGTH-distance)%WORLD_SPAN+WORLD_SPAN)%WORLD_SPAN;
      // Stream each rigid chunk along the shared 3D course spline. Rotation turns the corridor itself,
      // rather than merely sliding straight scenery sideways.
      const depth=local-140;
      const course=arcadeCourseRelativePose(this.stage,distance,depth);
      chunk.group.position.z=-depth;
      chunk.group.position.x=course.x-playerX*.35;
      chunk.group.position.y=course.y-playerY*.16;
      chunk.group.rotation.y=course.yaw*.94;
      chunk.group.rotation.x=course.pitch*.72;
      chunk.group.rotation.z=course.bank*.12;
    }
    for(const cue of this.routeCues){
      const course=arcadeCourseRelativePose(this.stage,distance,cue.depth);
      const yScale=cue.kind==="ice"?1.85:1;
      cue.group.position.set(course.x-playerX*.35,course.y*yScale-playerY*.16,-cue.depth);
      cue.group.rotation.y=course.yaw*(cue.kind==="ice"?1.05:.98);
      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?2.15:.78);
      cue.group.rotation.z=cue.kind==="orbit"
        ? cue.phase+(distance+cue.depth)*.0068
        : course.bank*(cue.kind==="ice"?.18:.08);
    }
    if(this.iceRibbon)this.updateIceRibbon(distance,playerX,playerY);
    if(this.volcanoRibbon)this.updateVolcanoRibbon(distance,playerX,playerY);
    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;
  }

  private makeIceRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {
    const samples=28;
    const positions=new Float32Array(samples*2*3);
    const indices:number[]=[];
    for(let i=0;i<samples-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    const geometry=new THREE.BufferGeometry();
    const attribute=new THREE.BufferAttribute(positions,3);attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position",attribute);geometry.setIndex(indices);
    const color=name.includes("core")
      ? new THREE.Color(stage.palette.accent).lerp(new THREE.Color(0xffffff),.34)
      : new THREE.Color(stage.palette.secondary).lerp(new THREE.Color(stage.palette.accent),.42);
    const material=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
    });
    const ribbon=new THREE.Mesh(geometry,material);
    ribbon.name=name;ribbon.frustumCulled=false;ribbon.renderOrder=2;this.root.add(ribbon);
    ribbon.userData.arcadeIceRibbonWidth=width;
    return ribbon;
  }

  private buildIceRibbon(stage:SkyDancerArcadeStageDefinition):void {
    this.iceRibbon={
      outer:this.makeIceRibbonMesh(stage,16,"arcade-ice-course-fissure-outer",.34),
      core:this.makeIceRibbonMesh(stage,3.2,"arcade-ice-course-fissure-core",.92),
    };
  }

  private updateIceRibbon(distance:number,playerX:number,playerY:number):void {
    if(!this.stage || !this.iceRibbon)return;
    const stage=this.stage;
    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{
      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array=attribute.array as Float32Array;
      const half=width*.5;
      const samples=attribute.count/2;
      for(let i=0;i<samples;i++){
        const depth=14+i*14.2;
        const course=arcadeCourseRelativePose(stage,distance,depth);
        const cx=course.x-playerX*.35;
        const cy=course.y-playerY*.16-20.6+lift;
        const cz=-depth;
        const lateralX=Math.cos(course.yaw)*half;
        const lateralZ=-Math.sin(course.yaw)*half;
        const bankY=course.bank*half*.2;
        const left=i*6,right=left+3;
        array[left]=cx-lateralX;array[left+1]=cy-bankY;array[left+2]=cz-lateralZ;
        array[right]=cx+lateralX;array[right+1]=cy+bankY;array[right+2]=cz+lateralZ;
      }
      attribute.needsUpdate=true;
    };
    update(this.iceRibbon.outer,16,0);
    update(this.iceRibbon.core,3.2,.09);
  }

  private makeVolcanoRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {
    const samples=30;
    const positions=new Float32Array(samples*2*3);
    const indices:number[]=[];
    for(let i=0;i<samples-1;i++){
      const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);
    }
    const geometry=new THREE.BufferGeometry();
    const attribute=new THREE.BufferAttribute(positions,3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position",attribute);geometry.setIndex(indices);
    const color=name.includes("core")
      ? new THREE.Color(stage.palette.accent)
      : new THREE.Color(stage.palette.secondary).lerp(new THREE.Color(stage.palette.accent),.58);
    const material=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
    });
    const ribbon=new THREE.Mesh(geometry,material);
    ribbon.name=name;ribbon.frustumCulled=false;ribbon.renderOrder=2;this.root.add(ribbon);
    ribbon.userData.arcadeVolcanoRibbonWidth=width;
    return ribbon;
  }

  private buildVolcanoRibbon(stage:SkyDancerArcadeStageDefinition):void {
    this.volcanoRibbon={
      outer:this.makeVolcanoRibbonMesh(stage,19,"arcade-volcano-course-ribbon-outer",.62),
      core:this.makeVolcanoRibbonMesh(stage,10,"arcade-volcano-course-ribbon-core",.92),
    };
  }

  private updateVolcanoRibbon(distance:number,playerX:number,playerY:number):void {
    if(!this.stage || !this.volcanoRibbon)return;
    const stage=this.stage;
    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{
      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array=attribute.array as Float32Array;
      const half=width*.5;
      const samples=attribute.count/2;
      for(let i=0;i<samples;i++){
        const depth=16+i*13.2;
        const course=arcadeCourseRelativePose(stage,distance,depth);
        const cx=course.x-playerX*.35;
        const cy=course.y-playerY*.16-24.05+lift;
        const cz=-depth;
        const lateralX=Math.cos(course.yaw)*half;
        const lateralZ=-Math.sin(course.yaw)*half;
        const bankY=course.bank*half*.28;
        const left=i*6,right=left+3;
        array[left]=cx-lateralX;array[left+1]=cy-bankY;array[left+2]=cz-lateralZ;
        array[right]=cx+lateralX;array[right+1]=cy+bankY;array[right+2]=cz+lateralZ;
      }
      attribute.needsUpdate=true;
    };
    update(this.volcanoRibbon.outer,19,0);
    update(this.volcanoRibbon.core,10,.11);
  }

  private buildRouteCues(stage:SkyDancerArcadeStageDefinition):void {
    if(!["ice","volcano","orbit"].includes(stage.biome))return;
    const kind=stage.biome as RouteCue["kind"];
    const primary=paint(stage.palette.primary);
    const secondary=paint(stage.palette.secondary);
    const glow=new THREE.MeshBasicMaterial({
      color:stage.palette.accent,transparent:true,opacity:kind==="volcano"?.88:kind==="ice"?.76:.84,
      blending:THREE.AdditiveBlending,depthWrite:false,
    });
    const dark=paint(stage.palette.ground);
    const count=kind==="ice"?7:10;
    for(let i=0;i<count;i++){
      const cue=new THREE.Group();
      const depth=kind==="ice"?26+i*52:26+i*43;
      const phase=i*.64;
      if(kind==="ice"){
        cue.name="arcade-ice-wave-cue";
        // V8.8: use broken, alternating ribs rather than seven complete hoops. The route stays readable,
        // but the player sees the canyon climb/dive instead of a repeated tunnel silhouette.
        const radius=21+(i%3===0?-2.2:i%3===1?1.6:3.2);
        const arc=Math.PI*(i%3===0?.56:i%3===1?.64:.5);
        const arch=mesh(cue,new THREE.TorusGeometry(radius,1.02,6,28,arc),i%2?secondary:primary,(i%2?1:-1)*3.8,-10.5,0);
        arch.name="arcade-ice-wave-arch";
        arch.rotation.z=(i%2?Math.PI*.12:Math.PI*.88)+(i%3-1)*.045;
        arch.rotation.y=(i%2?1:-1)*.06;
        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.34,5,24,arc*.78),glow,(i%2?1:-1)*3.2,-10.1,.18);
        inner.rotation.z=arch.rotation.z+(i%2?-.05:.05);
        for(const side of [-1,1]){
          const fang=mesh(cue,new THREE.ConeGeometry(1.05,6.2+(i%3)*.9,5),i%2?primary:secondary,side*(radius*.6+3),6.2+(i%2)*1.2,1);
          fang.name="arcade-ice-pressure-fang";
          fang.rotation.z=side*(.12+(i%3)*.02);
        }
        if(i%2===0){
          const floorShard=mesh(cue,new THREE.ConeGeometry(.95,5.4,5),glow,(i%4===0?1:-1)*11.5,-20.6,.5);
          floorShard.rotation.z=Math.PI+(i%4===0?.07:-.07);
        }
      }else if(kind==="volcano"){
        cue.name="arcade-volcano-route-cue";
        // Short rim markers preserve depth rhythm while the continuous ribbon shows the true curve.
        for(const side of [-1,1]){
          const rim=mesh(cue,new THREE.BoxGeometry(2.8,.9,14),i%2?secondary:primary,side*12,-24.6,0);
          rim.rotation.z=side*(i%2?.025:-.018);
          mesh(cue,new THREE.BoxGeometry(.34,.18,13),glow,side*9.9,-23.9,0);
        }
        if(i%2===0){
          const beacon=mesh(cue,new THREE.ConeGeometry(.42,7.5,6),glow,(i%4===0?1:-1)*16,-20,4);
          beacon.rotation.z=(i%4===0?1:-1)*.16;
        }
      }else{
        cue.name="arcade-orbit-helix-cue";
        const arcA=mesh(cue,new THREE.TorusGeometry(29,.62,5,30,Math.PI*.78),glow,0,0,0);
        arcA.name="arcade-orbit-helix-arc";
        const arcB=mesh(cue,new THREE.TorusGeometry(29,.34,5,24,Math.PI*.58),secondary,0,0,.15);
        arcB.rotation.z=Math.PI;
        const node=mesh(cue,new THREE.OctahedronGeometry(2.2,0),glow,29,0,0);
        node.name="arcade-orbit-helix-node";
        mesh(cue,new THREE.BoxGeometry(7,.45,18),dark,-34,0,-1);
      }
      this.root.add(cue);
      this.routeCues.push({group:cue,depth,phase,kind});
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
      if(stage.biome==="citadel"){
        // V8.9: the final stage now has a destination. A single distant fortress breaks the old
        // infinite-ring read and makes every streamed chunk feel like an approach to the sovereign.
        const fortress=new THREE.Group();fortress.name="arcade-citadel-final-fortress";
        fortress.position.set(0,-5,-430);
        const citadelDark=paint(0x17122f);
        const citadelArmor=paint(stage.palette.primary);
        const citadelLight=paint(stage.palette.secondary);
        const citadelGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
        const keep=mesh(fortress,new THREE.OctahedronGeometry(31,0),citadelArmor,0,24,0);keep.scale.set(1.18,2.65,.82);
        keep.rotation.z=Math.PI*.25;
        const core=mesh(fortress,new THREE.BoxGeometry(5,88,5),citadelGlow,0,25,5);core.name="arcade-citadel-final-core";
        mesh(fortress,new THREE.BoxGeometry(74,7,34),citadelDark,0,-18,4);
        for(const side of [-1,1]){
          const tower=mesh(fortress,new THREE.OctahedronGeometry(18,0),side<0?citadelLight:citadelArmor,side*46,5,-1);
          tower.scale.set(.78,2.15,.72);tower.rotation.z=side*.34;
          mesh(fortress,new THREE.BoxGeometry(2.2,52,4),citadelGlow,side*44,8,5);
        }
        group.add(fortress);
      }
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
    if(stage.biome==="storm"){
      // V9.4: the stage name finally appears in the silhouette — a massive armored carrier sits inside the storm.
      const dreadnought=new THREE.Group();dreadnought.name="arcade-storm-dreadnought";dreadnought.position.set(66,18,-345);
      const armor=paint(stage.palette.primary),stormSteel=paint(stage.palette.secondary),stormDark=paint(stage.palette.ground);
      const stormGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.88,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const hull=mesh(dreadnought,new THREE.BoxGeometry(34,12,112),stormDark,0,0,0);hull.rotation.z=.025;
      const bow=mesh(dreadnought,new THREE.ConeGeometry(17,35,6),armor,0,-1,-72);bow.rotation.x=Math.PI/2;
      const deck=mesh(dreadnought,new THREE.BoxGeometry(68,3,58),armor,-4,8,-2);deck.rotation.z=-.018;
      mesh(dreadnought,new THREE.BoxGeometry(51,.55,49),stormGlow,-6,10,-4);
      const island=mesh(dreadnought,new THREE.BoxGeometry(13,28,17),stormSteel,17,23,8);island.rotation.z=.055;
      mesh(dreadnought,new THREE.BoxGeometry(2.1,23,18),stormGlow,10.5,22,8);
      for(const side of [-1,1]){
        const fin=mesh(dreadnought,new THREE.BoxGeometry(4,20,25),stormSteel,side*17,15,28);fin.rotation.z=side*.16;
        mesh(dreadnought,new THREE.BoxGeometry(7,3.2,15),stormGlow,side*11,-4,53);
      }
      const lightningRod=mesh(dreadnought,new THREE.CylinderGeometry(.65,.9,35,6),stormSteel,17,52,8);
      lightningRod.rotation.z=.04;mesh(dreadnought,new THREE.SphereGeometry(2.4,8,6),stormGlow,17,70,8);
      dreadnought.scale.setScalar(.88);group.add(dreadnought);
    }
    if(stage.biome==="desert"){
      // V9.3: a monumental sandwall citadel anchors the route and separates this stage from Red Canyon.
      const fortress=new THREE.Group();fortress.name="arcade-desert-fortress-citadel";fortress.position.set(0,-7,-335);
      const sand=paint(stage.palette.primary),bronze=paint(stage.palette.secondary),fortressDark=paint(stage.palette.ground);
      const fortressGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      for(const side of [-1,1]){
        mesh(fortress,new THREE.BoxGeometry(70,28,18),fortressDark,side*54,-3,0);
        const tower=mesh(fortress,new THREE.BoxGeometry(20,58,22),sand,side*35,12,-2);tower.rotation.z=side*.025;
        mesh(fortress,new THREE.BoxGeometry(10,14,24),bronze,side*35,47,-2);
        mesh(fortress,new THREE.BoxGeometry(1.8,43,24),fortressGlow,side*27.5,15,-1);
      }
      const keep=mesh(fortress,new THREE.BoxGeometry(42,46,34),sand,0,20,20);keep.rotation.z=-.018;
      mesh(fortress,new THREE.BoxGeometry(28,10,36),bronze,0,49,20);
      mesh(fortress,new THREE.BoxGeometry(5,35,36),fortressGlow,0,21,19);
      group.add(fortress);
    }
    if(stage.biome==="cloud"){
      // V9.2: the daylight fleet gets a recognizable carrier silhouette in the distance rather than
      // a horizon made only from abstract masts and plates.
      const flagship=new THREE.Group();flagship.name="arcade-cloud-fleet-flagship";flagship.position.set(-72,10,-360);
      const fleetWhite=paint(stage.palette.primary),fleetSteel=paint(stage.palette.secondary);
      const fleetGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const hull=mesh(flagship,new THREE.BoxGeometry(28,8,96),fleetWhite,0,0,0);hull.rotation.z=-.025;
      const bow=mesh(flagship,new THREE.ConeGeometry(14,30,6),fleetWhite,0,0,-60);bow.rotation.x=Math.PI/2;
      mesh(flagship,new THREE.BoxGeometry(54,2.2,44),fleetSteel,0,5,-4);
      mesh(flagship,new THREE.BoxGeometry(40,.45,37),fleetGlow,0,6.4,-5);
      const bridge=mesh(flagship,new THREE.BoxGeometry(9,18,13),fleetSteel,8,14,5);bridge.rotation.z=-.045;
      mesh(flagship,new THREE.BoxGeometry(2.2,12,14),fleetGlow,3.8,14,5);
      for(const side of [-1,1]){
        const fin=mesh(flagship,new THREE.BoxGeometry(3,13,20),fleetSteel,side*12,10,28);fin.rotation.z=side*.13;
        mesh(flagship,new THREE.BoxGeometry(4.5,2.4,11),fleetGlow,side*8,-2,48);
      }
      flagship.scale.setScalar(.92);group.add(flagship);
    }
    if(stage.biome==="night"){
      // V9.1: a recognizable metro interchange anchors the pursuit in the distance instead of
      // reading as Dawn City with a darker palette.
      const hub=new THREE.Group();hub.name="arcade-night-metro-hub";hub.position.set(0,-3,-330);
      const hubDark=paint(0x0b1025),hubPurple=paint(stage.palette.secondary);
      const hubGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const concourse=mesh(hub,new THREE.BoxGeometry(74,8,30),hubDark,0,-2,0);
      concourse.rotation.z=-.025;
      for(const side of [-1,1]){
        const tower=mesh(hub,new THREE.BoxGeometry(11,72,13),hubPurple,side*38,23,0);
        tower.rotation.z=side*.055;
        mesh(hub,new THREE.BoxGeometry(1.2,60,14),hubGlow,side*32,23,2);
        const rail=mesh(hub,new THREE.BoxGeometry(26,2.2,64),hubDark,side*18,-9,20);
        rail.rotation.y=side*.035;
        mesh(hub,new THREE.BoxGeometry(.55,.35,60),hubGlow,side*13.5,-7.7,20);
      }
      const crown=mesh(hub,new THREE.BoxGeometry(42,3.5,9),hubPurple,0,42,1);crown.rotation.z=.035;
      mesh(hub,new THREE.BoxGeometry(30,.7,9.4),hubGlow,0,44.2,1);
      group.add(hub);
    }
    if(stage.biome==="ruins"){
      // V9.0: a single sky temple gives the labyrinth a destination and a recognizable ancient silhouette.
      const temple=new THREE.Group();temple.name="arcade-ruins-sky-temple";temple.position.set(0,13,-305);
      temple.scale.setScalar(1.14);
      const stone=paint(stage.palette.primary),gold=paint(stage.palette.secondary);
      const templeGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const island=mesh(temple,new THREE.ConeGeometry(43,40,9),paint(stage.palette.ground),0,-29,0);island.rotation.x=Math.PI;
      mesh(temple,new THREE.CylinderGeometry(42,39,4.5,9),stone,0,-7,0);
      for(const side of [-1,1]){
        const pylon=mesh(temple,new THREE.BoxGeometry(8,52,8),gold,side*24,18,0);pylon.rotation.z=side*.08;
        mesh(temple,new THREE.BoxGeometry(3,43,2.2),templeGlow,side*18,18,5);
      }
      const lintel=mesh(temple,new THREE.BoxGeometry(55,7,9),stone,0,42,0);lintel.rotation.z=-.045;
      const relic=mesh(temple,new THREE.OctahedronGeometry(9,0),templeGlow,0,22,5);relic.scale.set(.7,1.7,.7);relic.rotation.z=.78;
      group.add(temple);
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
      if(stage.biome==="night")this.addNightMetroPursuit(group,index,primary,secondary,dark,glow);
    } else if(!["cloud","storm","orbit","citadel","ruins"].includes(stage.biome)){
      const ground=this.buildTerrain(stage,index);
      const groundMaterial=primary.clone();groundMaterial.vertexColors=true;groundMaterial.color.setHex(0xffffff);
      mesh(group,ground,groundMaterial).name="arcade-continuous-terrain";
    }
    if(!["orbit","citadel"].includes(stage.biome))this.addClouds(group,stage,index,cloud);
    const r=(i:number)=>random(index*37+stage.order*139+i*3.71);
    switch(stage.biome){
      case "city":case "night":break;
      case "canyon":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
        }
        break;
      }
      case "desert":{
        // V9.3: streamed chunks are fortress districts with an alternating breach, not recolored canyon rocks.
        group.userData.arcadeDesertV93SandwallCitadel=true;
        const breachSide=index%2===0?1:-1;
        group.userData.arcadeDesertV93BreachSide=breachSide;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const breach=side===breachSide;
          const wallX=side*(breach?31:45);
          const wallY=-17+tier*2.6;
          const wall=mesh(group,new THREE.BoxGeometry(breach?25:31,15+(index%2)*3,42),dark,wallX,wallY,2);
          wall.rotation.z=side*(breach?.018:-.012);
          mesh(group,new THREE.BoxGeometry(breach?22:28,3.6,37),primary,wallX,wallY+9.2,2);
          for(const edge of [-1,1]){
            const towerX=wallX+edge*(breach?9.8:12.2);
            const towerH=24+(edge===side?5:0)+Math.abs(tier)*3;
            const tower=mesh(group,new THREE.BoxGeometry(6.5,towerH,9),edge===side?secondary:primary,towerX,-24+towerH/2+tier*2,edge*8);
            tower.rotation.z=side*edge*.018;
            mesh(group,new THREE.BoxGeometry(.42,towerH*.62,9.2),glow,towerX-side*1.9,-22+towerH*.52+tier*2,edge*8);
          }
          // The breach side projects toward the route but never closes the center corridor.
          if(breach){
            const ramp=mesh(group,new THREE.BoxGeometry(18,1.1,31),secondary,side*21,-14+tier*2,-8);
            ramp.rotation.z=side*-.08;ramp.rotation.y=side*.035;
            mesh(group,new THREE.BoxGeometry(13,.22,27),glow,side*20,-13.2+tier*2,-8);
          }
          for(let c=-1;c<=1;c++)mesh(group,new THREE.BoxGeometry(4.2,4.2,6),secondary,wallX+c*(breach?7:9),wallY+13.2,0);
        }
        break;
      }
      case "volcano":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
        }
        // V8.3: the continuous lava corridor is route-following, not one straight plane per rigid chunk.
        for(let i=0;i<5;i++){
          const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);
          vent.rotation.z=.15;
        }
        break;
      }
      case "cloud":{
        // V9.2: broad hulls, tapered bows and bridge towers replace the old T-shaped abstract plates.
        group.userData.arcadeCloudV92SkyArmada=true;
        const leadSide=index%2===0?1:-1;
        group.userData.arcadeCloudV92LeadSide=leadSide;
        for(const side of [-1,1]){
          const lead=side===leadSide;
          const shipX=side*(lead?29:49);
          const shipY=(lead?-7:-13)+(((index+(side>0?1:0))%3)-1)*4.4;
          const shipZ=lead?-5:12;
          const hull=mesh(group,new THREE.BoxGeometry(lead?15:12,lead?5.4:4.4,lead?43:34),primary,shipX,shipY,shipZ);
          hull.rotation.z=side*(lead?.025:-.018);hull.rotation.y=side*(lead?.045:-.025);
          const bow=mesh(group,new THREE.ConeGeometry(lead?7.4:6,lead?15:12,6),primary,shipX,shipY,shipZ-28);
          bow.rotation.x=Math.PI/2;bow.rotation.z=side*.03;
          const flightDeck=mesh(group,new THREE.BoxGeometry(lead?25:19,.85,lead?27:22),secondary,shipX,shipY+3.4,shipZ-1);
          flightDeck.rotation.z=side*(lead?.018:-.012);
          mesh(group,new THREE.BoxGeometry(lead?19:14,.22,lead?23:18),glow,shipX-side*1.2,shipY+4,shipZ-2);
          const bridge=mesh(group,new THREE.BoxGeometry(4.6,lead?9:7,6.5),secondary,shipX+side*4.2,shipY+7,shipZ+4);
          bridge.rotation.z=side*.07;
          mesh(group,new THREE.BoxGeometry(.7,lead?7:5.2,6.8),glow,shipX+side*2.7,shipY+7,shipZ+4);
          for(const engineSide of [-1,1])mesh(group,new THREE.BoxGeometry(2.7,1.8,5.5),glow,shipX+engineSide*(lead?4.3:3.3),shipY-1.2,shipZ+22);
        }
        break;
      }
      case "storm":{
        // V9.4: alternating dreadnought sections create a violent fly-by while leaving the center lane readable.
        group.userData.arcadeStormV94ThunderheadDreadnought=true;
        const stormSide=index%2===0?1:-1;
        group.userData.arcadeStormV94PressureSide=stormSide;
        const tier=(index%3)-1;
        for(const side of [-1,1]){
          const pressure=side===stormSide;
          const shipX=side*(pressure?29:48);
          const shipY=(pressure?-5:-13)+tier*(pressure?4.8:2.4);
          const shipZ=pressure?-5:13;
          const hull=mesh(group,new THREE.BoxGeometry(pressure?18:12,pressure?7:4.5,pressure?50:31),pressure?dark:primary,shipX,shipY,shipZ);
          hull.rotation.z=side*(pressure?.045:-.018);hull.rotation.y=side*(pressure?.035:-.02);
          const bow=mesh(group,new THREE.ConeGeometry(pressure?8.8:5.8,pressure?17:11,6),pressure?primary:secondary,shipX,shipY,shipZ-(pressure?33:21));
          bow.rotation.x=Math.PI/2;bow.rotation.z=side*.035;
          const deck=mesh(group,new THREE.BoxGeometry(pressure?31:18,1.15,pressure?31:20),secondary,shipX,shipY+(pressure?4.8:3),shipZ-1);
          deck.rotation.z=side*(pressure?.025:-.012);
          mesh(group,new THREE.BoxGeometry(pressure?23:13,.28,pressure?26:16),glow,shipX-side*1.5,shipY+(pressure?5.6:3.7),shipZ-2);
          if(pressure){
            const island=mesh(group,new THREE.BoxGeometry(5.5,13,7.5),primary,shipX+side*5.4,shipY+11,shipZ+3);island.rotation.z=side*.085;
            const rod=mesh(group,new THREE.CylinderGeometry(.35,.5,18,6),secondary,shipX+side*5.4,shipY+26,shipZ+3);rod.rotation.z=side*.04;
            mesh(group,new THREE.SphereGeometry(1.25,7,5),glow,shipX+side*5.9,shipY+35,shipZ+3);
            for(const engineSide of [-1,1])mesh(group,new THREE.BoxGeometry(3.2,2.2,6.5),glow,shipX+engineSide*5.2,shipY-2,shipZ+25);
          }
        }
        const lightning=new THREE.Group();
        for(let j=0;j<5;j++){
          const boltX=stormSide*(31+(j%2)*8);
          const bolt=mesh(lightning,new THREE.CylinderGeometry(.12,.23,9+j*.8,5),glow,boltX,29-j*8,-42+j*18);
          bolt.rotation.z=stormSide*(j%2?-.31:.27);
        }
        group.add(lightning);
        break;
      }
      case "ice":{
        group.userData.arcadeIceV88CanyonClearance=true;
        // V8.8: open the centre lane. Side shelves and ceiling teeth sell a cavern without repeatedly
        // blocking the flight path with a full-width arch in every streamed chunk.
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const sideX=side*(34+(j%2)*12);
          const h=18+r(j)*18;
          const crystal=mesh(group,new THREE.ConeGeometry(2.6+r(j+5)*1.8,h,5),j%2?primary:secondary,sideX,-18+h/2,-46+j*29);
          crystal.rotation.z=side*(.08+r(j)*.16);
          if(j%2===0){
            const tooth=mesh(group,new THREE.ConeGeometry(2.2+r(j+17)*1.5,12+r(j+23)*10,5),j%2?secondary:primary,side*(28+r(j+31)*8),20,-31+j*31);
            tooth.rotation.z=Math.PI+side*(.08+r(j+41)*.12);
          }
        }
        for(const side of [-1,1]){
          // Keep shoulders unnamed so the static geometry baker can merge them by material.
          const shelf=mesh(group,new THREE.BoxGeometry(24,2.4,24),side<0?primary:secondary,side*34,13+(index%3-1)*3.5,-4);
          shelf.rotation.z=side*(.08+(index%3)*.018);
          shelf.rotation.y=side*.04;
          mesh(group,new THREE.BoxGeometry(21,.26,22),glow,side*34,11.9+(index%3-1)*3.5,-4);
        }
        break;
      }
      case "ruins":{
        // V9.0: fewer poles, more readable ruins. Alternating hero sides create a broken causeway
        // that feels like a labyrinth while leaving the center flight lane open.
        group.userData.arcadeRuinsV90SkyLabyrinth=true;
        const heroSide=index%2===0?1:-1;
        group.userData.arcadeRuinsV90HeroSide=heroSide;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const hero=side===heroSide;
          const lift=tier*9.5+(hero?3:-3);
          const x=side*(hero?29:43);
          const radius=hero?19:14.5;
          const island=mesh(group,new THREE.ConeGeometry(radius,hero?24:18,9),dark,x,-23+lift,hero?-5:9);island.rotation.x=Math.PI;
          island.rotation.z=side*(tier*.045+(hero?.025:-.018));
          mesh(group,new THREE.CylinderGeometry(radius,radius-2.2,1.25,9),primary,x,-10.5+lift,hero?-5:9);
          // Only two architectural supports per island; one is always visibly broken or leaning.
          for(let i=0;i<2;i++){
            const h=hero?(i===0?18:12):(i===0?11:7);
            const column=mesh(group,new THREE.BoxGeometry(hero?3.1:2.5,h,hero?3.1:2.5),i===0?secondary:primary,x+side*(i===0?-5.4:5.4),-1+h*.5+lift,hero?-8+i*12:5+i*9);
            column.rotation.z=side*(i===1?.15:.025);
            if(i===1)column.rotation.x=.06*(tier||1);
          }
          // Broken bridge/causeway projects toward the route but never spans the entire screen.
          const bridgeX=side*(hero?18.5:31);
          const bridge=mesh(group,new THREE.BoxGeometry(hero?23:15,1.25,6.5),hero?secondary:primary,bridgeX,5.8+lift,hero?1:5);
          bridge.rotation.z=side*(hero?-.12:.08);bridge.rotation.y=side*(hero?.07:-.04);
          mesh(group,new THREE.BoxGeometry(hero?18:10,.2,.36),glow,bridgeX-side*1.5,6.55+lift,hero?-1:3);
          const lintel=mesh(group,new THREE.BoxGeometry(hero?14.5:10.5,2.5,3.5),secondary,x,13+lift,hero?-2:8);
          lintel.rotation.z=side*(hero?.1:-.07);
          if(hero) mesh(group,new THREE.BoxGeometry(9.5,.32,3.7),glow,x-side*.8,14.35+lift,-2.1);
          if(hero){
            const relic=mesh(group,new THREE.OctahedronGeometry(4.4,0),glow,x-side*3,20+lift,-2);
            relic.scale.set(.62,1.55,.62);relic.rotation.z=side*.72;
          }
        }
        if(index%3===1){
          // One free-floating fragment occasionally crosses the composition, not one in every chunk.
          const shard=mesh(group,new THREE.OctahedronGeometry(4.1,0),secondary,-heroSide*8,11+(index%3)*4,18);
          shard.scale.set(.65,1.75,.6);shard.rotation.z=heroSide*.48;
        }
        break;
      }
      case "orbit":{
        // V8.3: avoid a stack of full concentric rings, which flattened the real corkscrew into a straight tunnel.
        const frame=mesh(group,new THREE.TorusGeometry(33,1.35,7,42,Math.PI*1.12),primary,0,0,0);
        frame.name="arcade-orbital-open-frame";frame.rotation.z=index*.71;
        for(const side of [-1,1]){
          mesh(group,new THREE.BoxGeometry(4,24,10),secondary,side*36,0,-5);
          mesh(group,new THREE.BoxGeometry(18,.2,32),dark,side*49,5,-5);
          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.12,.25,31),glow,side*(42+j*3),5.2,-5);
        }
        break;
      }
      case "citadel":{
        // V8.9: turn the repeated hex tunnel into an asymmetric open fortress assault.
        group.userData.arcadeCitadelV89FinalAssault=true;
        group.userData.arcadeCitadelV89GateSide=index%2===0?1:-1;
        const gateSide=index%2===0?1:-1;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const bastionX=side*(39+(index%3)*3.5);
          const lift=tier*4.8;
          const prism=mesh(group,new THREE.OctahedronGeometry(10.5+(index%2)*1.5,0),side===gateSide?secondary:primary,bastionX,-1+lift,-5);
          prism.scale.set(.74,2.55,.9);prism.rotation.z=side*(.24+tier*.055);prism.rotation.y=side*.16;
          const core=mesh(group,new THREE.BoxGeometry(1.6,31,2.2),glow,bastionX-side*2.2,1+lift,-4);
          core.rotation.z=side*.08;
          const terrace=mesh(group,new THREE.BoxGeometry(24,1.5,34),dark,side*35,-18+lift*.25,2);
          terrace.rotation.z=side*(.045+tier*.012);
          mesh(group,new THREE.BoxGeometry(17,.26,29),glow,side*34,-16.9+lift*.25,2);
          const blade=mesh(group,new THREE.BoxGeometry(2.4,24,3),side===gateSide?primary:secondary,side*(27+tier*2.2),8+lift,-30+(index%2)*10);
          blade.rotation.z=side*(.28+tier*.035);
          if(side===gateSide){
            const crown=mesh(group,new THREE.OctahedronGeometry(5.8,0),secondary,side*20,17+lift,-34);
            crown.scale.set(.55,1.8,.65);crown.rotation.z=side*.42;
            mesh(group,new THREE.BoxGeometry(.8,18,1.5),glow,side*18.2,17+lift,-34);
          }
        }
        // Paired floor rails point at the distant keep without enclosing the player in another ring.
        for(const side of [-1,1]){
          const rail=mesh(group,new THREE.BoxGeometry(2.1,.36,58),side<0?primary:secondary,side*11,-19.2,0);
          rail.rotation.y=side*.035;
          mesh(group,new THREE.BoxGeometry(.34,.12,55),glow,side*9.7,-18.85,0);
        }
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
      const volcanoX=side*(33+r(j+71)*8);
      const iceX=side*(35+r(j+71)*11.5);
      if(stage.biome==="city"){
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
      } else if(stage.biome==="night"){
        // V9.1: close passes alternate station blades, signs and canopy fragments instead of ten more skyscrapers.
        const metroX=side*(34+r(j+71)*10+(j%2)*3);
        const y=-6+r(j+6)*15;
        if((j+index)%2===0){
          const blade=mesh(group,new THREE.BoxGeometry(1.1,16+r(j+5)*13,7+r(j+25)*5),secondary,metroX,y+7,z);
          blade.rotation.z=side*(.08+r(j+52)*.12);
          mesh(group,new THREE.BoxGeometry(.35,12+r(j+12)*8,7.2),glow,metroX-side*.8,y+7,z+.1);
        }else{
          const canopy=mesh(group,new THREE.BoxGeometry(10+r(j+15)*6,1.1,12+r(j+25)*8),dark,metroX,y,z);
          canopy.rotation.z=side*(r(j+32)-.5)*.1;
          mesh(group,new THREE.BoxGeometry(7+r(j+35)*5,.22,10+r(j+45)*6),glow,metroX-side*1.5,y+.72,z);
          const mast=mesh(group,new THREE.BoxGeometry(1.2,11+r(j+55)*8,1.2),secondary,metroX+side*3,y-5,z+2);
          mast.rotation.z=side*.07;
        }
      } else if(stage.biome==="canyon" || stage.biome==="volcano"){
        const h=stage.biome==="volcano"?20+r(j+9)*27:24+r(j+9)*36;
        const rockX=stage.biome==="volcano"?volcanoX:x;
        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,rockX,-26+h/2,z);
        fin.rotation.z=side*(.06+r(j+27)*.16);
        fin.rotation.y=r(j+37)*Math.PI;
        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,rockX-side*2,-13,z+2);
      } else if(stage.biome==="desert"){
        // V9.3: close passes are fortress buttresses and crenelated wall fragments, not stone fins.
        const fortressX=side*(37+r(j+71)*11+(j%2)*4);
        const h=17+r(j+9)*25;
        const buttress=mesh(group,new THREE.BoxGeometry(5.5+r(j+17)*4,h,9+r(j+27)*5),j%2?secondary:primary,fortressX,-25+h/2,z);
        buttress.rotation.z=side*(.025+r(j+37)*.06);
        mesh(group,new THREE.BoxGeometry(8+r(j+47)*5,3,11+r(j+57)*5),dark,fortressX,-25+h-1,z);
        mesh(group,new THREE.BoxGeometry(.38,h*.58,10+r(j+67)*4),glow,fortressX-side*2.2,-25+h*.57,z+.2);
        if((j+index)%2===0){
          const wall=mesh(group,new THREE.BoxGeometry(13+r(j+15)*8,6+r(j+25)*5,4.5),dark,fortressX-side*7,-19+r(j+35)*4,z+6);
          wall.rotation.y=side*(.04+r(j+45)*.05);
          for(const c of [-1,0,1])mesh(group,new THREE.BoxGeometry(2.8,3.6,4.7),secondary,fortressX-side*7+c*4,-13+r(j+35)*4,z+6);
        }
      } else if(stage.biome==="ice"){
        const h=19+r(j+8)*24;
        // Unnamed static crystals stay eligible for bakeArcadeAirframe batching.
        const crystal=mesh(group,new THREE.ConeGeometry(2.2+r(j+12)*1.8,h,5),j%2?primary:secondary,iceX,-21+h/2,z);
        crystal.rotation.z=side*(.08+r(j+24)*.16);
        if(j%2===1) mesh(group,new THREE.OctahedronGeometry(2.1+r(j+44)*1.6,0),glow,iceX-side*3,-1+r(j+66)*6,z+3);
      } else if(stage.biome==="cloud"){
        // V9.2: escort silhouettes create close naval fly-bys without blocking the center corridor.
        const escortX=side*(39+r(j+71)*12+(j%2)*3);
        const y=-7+r(j+6)*14;
        const length=14+r(j+26)*10;
        const escort=mesh(group,new THREE.BoxGeometry(5.5+r(j+16)*3,2.2,length),j%2?secondary:primary,escortX,y,z);
        escort.rotation.z=side*(r(j+32)-.5)*.08;escort.rotation.y=side*(r(j+42)-.5)*.08;
        const nose=mesh(group,new THREE.ConeGeometry(3.1,length*.28,5),j%2?secondary:primary,escortX,y,z-length*.63);
        nose.rotation.x=Math.PI/2;
        mesh(group,new THREE.BoxGeometry(8+r(j+35)*4,.35,length*.48),secondary,escortX,y+1.7,z-1);
        if((j+index)%2===0){
          const tower=mesh(group,new THREE.BoxGeometry(1.8,4+r(j+55)*4,3),dark,escortX+side*2,y+4,z+1);
          tower.rotation.z=side*.08;
          mesh(group,new THREE.BoxGeometry(.3,3.5,3.2),glow,escortX+side*.9,y+4,z+1);
        }
      } else if(stage.biome==="storm"){
        // V9.4: armored outrigger pods and lightning conductors replace the old abstract T-shapes.
        const stormX=side*(38+r(j+71)*12+(j%2)*3);
        const y=-7+r(j+6)*14;
        const length=15+r(j+26)*12;
        const pod=mesh(group,new THREE.BoxGeometry(6+r(j+16)*4,4.2,length),j%2?dark:primary,stormX,y,z);
        pod.rotation.z=side*(r(j+32)-.5)*.1;pod.rotation.y=side*(r(j+42)-.5)*.08;
        const nose=mesh(group,new THREE.ConeGeometry(3.4,length*.24,5),secondary,stormX,y,z-length*.62);nose.rotation.x=Math.PI/2;
        mesh(group,new THREE.BoxGeometry(4+r(j+35)*3,.3,length*.55),glow,stormX-side*1.5,y+2.4,z-1);
        if((j+index)%2===0){
          const rod=mesh(group,new THREE.CylinderGeometry(.28,.42,12+r(j+55)*9,6),secondary,stormX+side*2.5,y+10,z+2);
          rod.rotation.z=side*.08;
          mesh(group,new THREE.SphereGeometry(.9+r(j+65)*.5,6,5),glow,stormX+side*3.2,y+18,z+2);
        }
      } else if(stage.biome==="ruins"){
        // V9.0: near passes are broken walls and hanging slabs, not a forest of full-height columns.
        const ruinsX=side*(43+r(j+71)*12+(j%2)*3);
        const y=-11+r(j+6)*11;
        const slab=mesh(group,new THREE.BoxGeometry(6+r(j+15)*5.2,1.05,7+r(j+25)*5),j%2?dark:primary,ruinsX,y,z);
        slab.rotation.z=side*(r(j+32)-.5)*.18;slab.rotation.y=side*(r(j+42)-.5)*.12;
        if((j+index)%2===0){
          const h=10+r(j+5)*13;
          const stump=mesh(group,new THREE.BoxGeometry(2.4,h,2.4),secondary,ruinsX-side*3.3,y+h*.5,z+2);
          stump.rotation.z=side*(.08+r(j+52)*.16);
        }
        if((j+index)%3===0){
          const rune=mesh(group,new THREE.OctahedronGeometry(2.3+r(j+35)*1.4,0),glow,ruinsX+side*3,y+6,z-2);
          rune.scale.set(.62,1.35,.62);rune.rotation.z=side*.7;
        }
      } else if(stage.biome==="orbit"){
        const y=-7+r(j+4)*18;
        const pylon=mesh(group,new THREE.BoxGeometry(1.6,18+r(j+14)*14,5.5),j%2?secondary:primary,x,y,z);
        pylon.rotation.z=side*(r(j+34)-.5)*.12;
        mesh(group,new THREE.BoxGeometry(.2,15+r(j+54)*9,5.7),glow,x-side*1,y,z-.1);
      } else if(stage.biome==="citadel"){
        // V8.9: keep near-pass pressure at the outer walls and vary the side rhythm instead of
        // building a matched pair of giant prisms around every view.
        const citadelX=side*(36+r(j+71)*13+(j%2)*4);
        const prism=mesh(group,new THREE.OctahedronGeometry(3.8+r(j+3)*2.9,0),j%2?secondary:primary,citadelX,-4+r(j+13)*10,z);
        prism.scale.set(.72,1.45+r(j+33)*.9,.78);
        prism.rotation.z=side*(.2+r(j+43)*.24);
        prism.rotation.y=side*(.08+r(j+53)*.12);
        if((j+index)%3===0){
          const spine=mesh(group,new THREE.BoxGeometry(.42,20+r(j+63)*10,2.4),glow,citadelX-side*3.4,1,z+2);
          spine.rotation.z=side*.08;
        }
      }
    }
  }

  private addNightMetroPursuit(
    group:THREE.Group,
    index:number,
    primary:THREE.Material,
    secondary:THREE.Material,
    dark:THREE.Material,
    glow:THREE.Material,
  ):void {
    // V9.1: streamed chunks alternate the close transit side so the chicane reads as a pursuit route,
    // while every structure remains outside the center flight lane and eligible for static batching.
    group.userData.arcadeNightV91NeonPursuit=true;
    const leadSide=index%2===0?1:-1;
    group.userData.arcadeNightV91LeadSide=leadSide;
    const tier=(index%3)-1;
    const leadY=-7+tier*4.2;
    const farY=-14-tier*2.6;

    for(const side of [-1,1]){
      const lead=side===leadSide;
      const railX=side*(lead?19:31);
      const railY=lead?leadY:farY;
      const deck=mesh(group,new THREE.BoxGeometry(lead?10:7,1.1,84),lead?secondary:dark,railX,railY,0);
      deck.rotation.z=side*(lead?.035:-.018);
      mesh(group,new THREE.BoxGeometry(.42,.22,80),glow,railX-side*(lead?3.3:2.2),railY+.78,0);
      mesh(group,new THREE.BoxGeometry(.28,.18,80),primary,railX+side*(lead?3.2:2.1),railY+.72,0);

      if(lead){
        const canopy=mesh(group,new THREE.BoxGeometry(16,1.3,26),dark,side*26,6+tier*2,-14);
        canopy.rotation.z=side*.055;canopy.rotation.y=side*.025;
        mesh(group,new THREE.BoxGeometry(12,.28,23),glow,side*24.5,6.9+tier*2,-14);
        for(const z of [-23,-5]){
          const support=mesh(group,new THREE.BoxGeometry(1.5,18,1.5),secondary,side*31,-2+tier*2,z);
          support.rotation.z=side*.06;
        }
      }
    }

    // Split gantries mark speed beats without recreating a full-screen hoop/tunnel.
    if(index%2===1){
      for(const side of [-1,1]){
        const post=mesh(group,new THREE.BoxGeometry(1.4,25,2),secondary,side*31,2,-32);
        post.rotation.z=side*.035;
        const arm=mesh(group,new THREE.BoxGeometry(12,1.3,2),side===leadSide?primary:dark,side*25,14,-32);
        arm.rotation.z=side*(side===leadSide?-.04:.025);
        mesh(group,new THREE.BoxGeometry(7,.3,2.2),glow,side*21.5,15,-32);
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
    if(this.water && stage.biome!=="night"){
      const river=mesh(group,new THREE.PlaneGeometry(40,114),this.water,-.4,-25.35);river.rotation.x=-Math.PI/2;
    }
    if(stage.biome==="night"){
      const metroBed=paint(0x080e20),metroGlow=paint(stage.palette.accent,stage.palette.accent);
      mesh(group,new THREE.BoxGeometry(38,.32,114),metroBed,0,-25.2,0);
      for(const side of [-1,1]){
        mesh(group,new THREE.BoxGeometry(.34,.14,112),metroGlow,side*10.5,-24.95,0);
        mesh(group,new THREE.BoxGeometry(.18,.11,112),paint(stage.palette.secondary),side*15.5,-24.92,0);
      }
    }
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
