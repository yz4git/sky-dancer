from pathlib import Path

module = Path("src/sky/arcade/SkyDancerArcadeV4018EnvironmentFraming.ts")
module.write_text('''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV4012RhythmPhase } from "./SkyDancerArcadeV4012RunRhythm";

export interface SkyDancerArcadeV4018EnvironmentFramingInput {
  compactLandscape: boolean;
  stageBiome: SkyDancerArcadeStageDefinition["biome"];
  stageOrder: number;
  rhythmPhase: SkyDancerArcadeV4012RhythmPhase;
}

export interface SkyDancerArcadeV4018EnvironmentFramingProfile {
  pressure: number;
  chunkSpreadX: number;
  backdropSpreadX: number;
  backdropShiftX: number;
}

export const SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING: SkyDancerArcadeV4018EnvironmentFramingProfile = {
  pressure: 0,
  chunkSpreadX: 1,
  backdropSpreadX: 1,
  backdropShiftX: 0,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function biomeWeight(biome: SkyDancerArcadeStageDefinition["biome"]): number {
  switch (biome) {
    case "storm": return 1;
    case "citadel": return .92;
    case "cloud": return .9;
    case "ruins": return .78;
    case "ice": return .74;
    case "volcano": return .68;
    case "night": return .65;
    case "desert": return .6;
    case "canyon": return .55;
    case "orbit": return .5;
    case "city": return .45;
    default: return .5;
  }
}

function phaseWeight(phase: SkyDancerArcadeV4012RhythmPhase): number {
  switch (phase) {
    case "signature": return .08;
    case "rival": return .12;
    case "boss-rise": return 1;
    case "boss": return .82;
    default: return 0;
  }
}

/**
 * V40.18 opens the phone hero corridor before and during climax beats by reframing decorative world layers.
 * Collision-bearing route geometry and hazards are deliberately outside this profile.
 */
export function skyDancerArcadeV4018EnvironmentFraming(
  input: SkyDancerArcadeV4018EnvironmentFramingInput,
): SkyDancerArcadeV4018EnvironmentFramingProfile {
  if (!input.compactLandscape) return SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING;
  const pressure = clamp01(phaseWeight(input.rhythmPhase) * biomeWeight(input.stageBiome));
  if (pressure <= .001) return SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING;

  const strongSideScenery = input.stageBiome === "cloud"
    || input.stageBiome === "storm"
    || input.stageBiome === "ruins"
    || input.stageBiome === "citadel";
  const chunkGain = strongSideScenery ? .18 : .12;
  const backdropShiftMagnitude = strongSideScenery ? 9 : 6;
  const backdropSide = input.stageOrder % 2 === 0 ? 1 : -1;

  return {
    pressure,
    chunkSpreadX: 1 + pressure * chunkGain,
    backdropSpreadX: 1 + pressure * .07,
    backdropShiftX: backdropSide * pressure * backdropShiftMagnitude,
  };
}
''', encoding="utf-8")

test = Path("tests/sky-arcade-v4018-environment-framing.test.ts")
test.write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  skyDancerArcadeV4018EnvironmentFraming,
} from "../src/sky/arcade/SkyDancerArcadeV4018EnvironmentFraming";

const base = {
  compactLandscape: true,
  stageBiome: "storm" as const,
  stageOrder: 4,
  rhythmPhase: "boss-rise" as const,
};

test("V40.18 is identity on desktop and during non-climax phases", () => {
  assert.deepEqual(
    skyDancerArcadeV4018EnvironmentFraming({ ...base, compactLandscape: false }),
    SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  );
  assert.deepEqual(
    skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "handoff" }),
    SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING,
  );
});

test("V40.18 pre-clears the corridor most strongly during boss rise", () => {
  const rise = skyDancerArcadeV4018EnvironmentFraming(base);
  const boss = skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "boss" });
  const rival = skyDancerArcadeV4018EnvironmentFraming({ ...base, rhythmPhase: "rival" });
  assert.equal(rise.pressure, 1);
  assert.ok(rise.chunkSpreadX > boss.chunkSpreadX);
  assert.ok(boss.chunkSpreadX > rival.chunkSpreadX);
});

test("V40.18 gives clutter-heavy aerial stages more side framing than city", () => {
  const storm = skyDancerArcadeV4018EnvironmentFraming(base);
  const city = skyDancerArcadeV4018EnvironmentFraming({ ...base, stageBiome: "city" });
  assert.ok(storm.chunkSpreadX - 1 > (city.chunkSpreadX - 1) * 2);
  assert.ok(Math.abs(storm.backdropShiftX) > Math.abs(city.backdropShiftX));
});

test("V40.18 uses a stable authored side for distant backdrop framing", () => {
  const even = skyDancerArcadeV4018EnvironmentFraming(base);
  const odd = skyDancerArcadeV4018EnvironmentFraming({ ...base, stageOrder: 5 });
  assert.ok(even.backdropShiftX > 0);
  assert.ok(odd.backdropShiftX < 0);
});

test("V40.18 wiring moves decorative chunks/backdrop only, not route collision visuals", () => {
  const world = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(world, /chunk\.group\.scale\.x=this\.v4018ChunkSpreadX/);
  assert.match(world, /this\.backdrop\.scale\.x=this\.v4018BackdropSpreadX/);
  assert.doesNotMatch(world, /terrainRibbon\.scale\.x=this\.v4018|cityRiver\.(?:surface|bed)\.scale\.x=this\.v4018|cityBanks\.(?:left|right)\.scale\.x=this\.v4018/);
  assert.match(webgl, /skyDancerArcadeV4018EnvironmentFraming/);
  assert.match(webgl, /this\.environment\.update\(snapshot\.distance, snapshot\.playerX, snapshot\.playerY, v4018Framing, delta\)/);
  assert.doesNotMatch(runtime, /V4018EnvironmentFraming|v4018Framing/);
});
''', encoding="utf-8")

world_path = Path("src/sky/arcade/SkyDancerArcadeReferenceWorld.ts")
world = world_path.read_text(encoding="utf-8")
old_import = 'import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";\n'
new_import = old_import + 'import type { SkyDancerArcadeV4018EnvironmentFramingProfile } from "./SkyDancerArcadeV4018EnvironmentFraming";\n'
assert old_import in world, "ReferenceWorld stage import anchor missing"
world = world.replace(old_import, new_import, 1)

old_state = '  private readonly matrixObject=new THREE.Object3D();\n'
new_state = old_state + '  private v4018ChunkSpreadX=1;\n  private v4018BackdropSpreadX=1;\n  private v4018BackdropShiftX=0;\n'
assert old_state in world, "ReferenceWorld matrix state anchor missing"
world = world.replace(old_state, new_state, 1)

old_stage = '    if(this.stage?.id===stage.id)return;\n    disposeTree(this.root);'
new_stage = '    if(this.stage?.id===stage.id)return;\n    this.v4018ChunkSpreadX=1;this.v4018BackdropSpreadX=1;this.v4018BackdropShiftX=0;\n    disposeTree(this.root);'
assert old_stage in world, "ReferenceWorld setStage anchor missing"
world = world.replace(old_stage, new_stage, 1)

old_update = '  update(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage)return;\n    const sceneryAttitude=arcadeSharedSceneryAttitudeV1041(this.stage,distance);'
new_update = '''  update(
    distance:number,
    playerX:number,
    playerY:number,
    framingV4018?:SkyDancerArcadeV4018EnvironmentFramingProfile,
    deltaV4018=1/60,
  ):void {
    if(!this.stage)return;
    const framingBlendV4018=1-Math.exp(-Math.max(0,deltaV4018)*5.8);
    const targetChunkSpreadV4018=framingV4018?.chunkSpreadX ?? 1;
    const targetBackdropSpreadV4018=framingV4018?.backdropSpreadX ?? 1;
    const targetBackdropShiftV4018=framingV4018?.backdropShiftX ?? 0;
    this.v4018ChunkSpreadX+=(targetChunkSpreadV4018-this.v4018ChunkSpreadX)*framingBlendV4018;
    this.v4018BackdropSpreadX+=(targetBackdropSpreadV4018-this.v4018BackdropSpreadX)*framingBlendV4018;
    this.v4018BackdropShiftX+=(targetBackdropShiftV4018-this.v4018BackdropShiftX)*framingBlendV4018;
    const sceneryAttitude=arcadeSharedSceneryAttitudeV1041(this.stage,distance);'''
assert old_update in world, "ReferenceWorld update signature anchor missing"
world = world.replace(old_update, new_update, 1)

old_chunk = '      chunk.group.position.set(course.x-playerX*.35,course.y-playerY*.16,course.z);\n      // V10.4.1: rigid decorative scenery shares ONE attitude for the whole visible world.'
new_chunk = '      chunk.group.position.set(course.x-playerX*.35,course.y-playerY*.16,course.z);\n      chunk.group.scale.x=this.v4018ChunkSpreadX;\n      chunk.group.userData.arcadeV4018DecorativeFraming=true;\n      // V10.4.1: rigid decorative scenery shares ONE attitude for the whole visible world.'
assert old_chunk in world, "ReferenceWorld chunk position anchor missing"
world = world.replace(old_chunk, new_chunk, 1)

old_backdrop = '      this.backdrop.position.set(-here.x*.16,-here.y*.10,0);\n      this.backdrop.rotation.set(sceneryAttitude.pitch,sceneryAttitude.yaw,sceneryAttitude.roll);'
new_backdrop = '      this.backdrop.position.set(-here.x*.16+this.v4018BackdropShiftX,-here.y*.10,0);\n      this.backdrop.scale.x=this.v4018BackdropSpreadX;\n      this.backdrop.userData.arcadeV4018DecorativeFraming=true;\n      this.backdrop.rotation.set(sceneryAttitude.pitch,sceneryAttitude.yaw,sceneryAttitude.roll);'
assert old_backdrop in world, "ReferenceWorld backdrop anchor missing"
world = world.replace(old_backdrop, new_backdrop, 1)
world_path.write_text(world, encoding="utf-8")

webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
webgl = webgl_path.read_text(encoding="utf-8")
old_webgl_import = 'import { skyDancerArcadeV4017ForegroundClearance } from "./SkyDancerArcadeV4017ForegroundClearance";\n'
new_webgl_import = old_webgl_import + 'import { skyDancerArcadeV4018EnvironmentFraming } from "./SkyDancerArcadeV4018EnvironmentFraming";\n'
assert old_webgl_import in webgl, "V40.17 import anchor missing"
webgl = webgl.replace(old_webgl_import, new_webgl_import, 1)

old_rhythm_tail = '''    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, v408Focus.bloomBoost * v4012Rhythm.ambientFxGain);'''
new_rhythm_tail = '''    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    const v4018Framing = skyDancerArcadeV4018EnvironmentFraming({
      compactLandscape: this.renderWidth > this.renderHeight && this.renderHeight <= 560,
      stageBiome: snapshot.stage.biome,
      stageOrder: snapshot.stage.order,
      rhythmPhase: v4012Rhythm.phase,
    });
    this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, v408Focus.bloomBoost * v4012Rhythm.ambientFxGain);'''
assert old_rhythm_tail in webgl, "WebGL V40.12 rhythm anchor missing"
webgl = webgl.replace(old_rhythm_tail, new_rhythm_tail, 1)

old_environment_update = '    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY);'
new_environment_update = '    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY, v4018Framing, delta);'
assert old_environment_update in webgl, "WebGL environment update anchor missing"
webgl = webgl.replace(old_environment_update, new_environment_update, 1)
webgl_path.write_text(webgl, encoding="utf-8")
