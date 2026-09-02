import test from "node:test";
import assert from "node:assert/strict";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  skyDancerArcadeV11ScoreBreakdown,
  skyDancerArcadeV11StageMedals,
} from "../src/sky/arcade/SkyDancerArcadeV11Scoring";
import {
  createDefaultSkyDancerArcadeProgress,
  loadSkyDancerArcadeProgress,
  recordSkyDancerArcadeRunClear,
  recordSkyDancerArcadeStageClear,
} from "../src/sky/arcade/SkyDancerArcadeProgress";

test("V11.3 stage missions reward score, signature play and no-damage separately",()=>{
  const medals=skyDancerArcadeV11StageMedals("dawn-city",{score:13000,destroyed:7,nearMisses:2,multiLockKills:0,turboSmashes:0,bestChain:4,armorBreaks:0,formationBreaks:0,noDamage:true});
  assert.deepEqual(medals.map(m=>[m.id,m.earned]),[["score",true],["signature",true],["no-damage",true]]);
  const orbit=skyDancerArcadeV11StageMedals("orbital-ascent",{score:20000,destroyed:8,nearMisses:0,multiLockKills:1,turboSmashes:0,bestChain:6,armorBreaks:0,formationBreaks:1,noDamage:false});
  assert.equal(orbit.find(m=>m.id==="signature")?.earned,false);
});

test("V11.3 score breakdown is exact and rewards dangerous routes",()=>{
  const medals=skyDancerArcadeV11StageMedals("dawn-city",{score:13000,destroyed:7,nearMisses:2,multiLockKills:0,turboSmashes:0,bestChain:4,armorBreaks:0,formationBreaks:0,noDamage:true});
  const safe=skyDancerArcadeV11ScoreBreakdown(13000,medals,1460,"SAFE");
  const danger=skyDancerArcadeV11ScoreBreakdown(13000,medals,1460,"DANGER");
  assert.equal(safe.total,safe.combat+safe.medal+safe.perfect+safe.boss+safe.route);
  assert.equal(danger.total-safe.total,2200);
});

test("V11.3 runtime stage result carries medals and an exact score ledger",()=>{
  const runtime=new SkyDancerArcadeRuntime({mode:"arcade-run",difficulty:"normal",seed:913});
  runtime.completeCurrentStageForTests("cloud-fleet");
  const snapshot=runtime.getSnapshot();
  assert.equal(snapshot.status,"stage-clear");
  assert.equal(snapshot.lastStageMedals.length,3);
  assert.ok(snapshot.lastStageMedals.find(m=>m.id==="no-damage")?.earned);
  const b=snapshot.lastStageScoreBreakdown;
  assert.equal(snapshot.lastStageScore,b.total);
  assert.equal(b.total,b.combat+b.medal+b.perfect+b.boss+b.route);
  assert.equal(b.route,2200,"right-hand Dawn route is the V11 danger route");
});

test("V11.3 progress persists unique medals and recent route history without breaking v2 saves",()=>{
  const memory=new Map<string,string>();
  const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)},removeItem:(k:string)=>{memory.delete(k)},clear:()=>memory.clear(),key:(i:number)=>[...memory.keys()][i]??null,get length(){return memory.size}};
  Object.defineProperty(globalThis,"localStorage",{value:storage,configurable:true});
  const base=createDefaultSkyDancerArcadeProgress();
  assert.equal(base.version,2);
  recordSkyDancerArcadeStageClear("dawn-city",18000,"A",true,["score","signature","no-damage"]);
  recordSkyDancerArcadeStageClear("dawn-city",19000,"S",false,["score"]);
  recordSkyDancerArcadeRunClear(80000,"A",0,{route:["dawn-city","cloud-fleet","storm-carrier","ice-cavern","night-metro","orbital-ascent","prism-citadel"],kills:20,nearMisses:5,bossKills:7,armorBreaks:3,formationBreaks:4,bestChain:9,medalsEarned:12});
  const loaded=loadSkyDancerArcadeProgress();
  assert.deepEqual(loaded.records["dawn-city"]?.medals.sort(),["no-damage","score","signature"]);
  assert.equal(loaded.totalMedals,12);
  assert.equal(loaded.recentRoutes.length,1);
  assert.equal(loaded.recentRoutes[0]?.at(-1),"prism-citadel");
});
