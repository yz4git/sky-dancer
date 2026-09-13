import test from "node:test";
import assert from "node:assert/strict";
import { SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY } from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";
import { skyDancerArcadeV409PhoneClarity } from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";
import { skyDancerArcadeV4015StageReadability } from "../src/sky/arcade/SkyDancerArcadeV4015StageReadability";
import { skyDancerArcadeV4018EnvironmentFraming } from "../src/sky/arcade/SkyDancerArcadeV4018EnvironmentFraming";

const fx = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;

function readability(stageId: "storm-carrier" | "volcano-core" | "prism-citadel", rhythmPhase: "build" | "boss-rise" | "boss", bossActive: boolean) {
  return skyDancerArcadeV4015StageReadability({
    compactLandscape: true,
    stageId,
    rhythmPhase,
    screenStress: 0,
    bossActive,
    turboActive: false,
    baseFxClarity: fx,
    baseSpeedLineAlpha: .88,
  });
}

test("V40.19 protects the single boss attack cue under projectile pressure", () => {
  const bossCalm = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "boss", incomingThreats: 0 });
  const bossBusy = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "boss", incomingThreats: 5 });
  const rival = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "rival", incomingThreats: 0 });
  assert.equal(bossCalm.counterplayCues, 1);
  assert.equal(bossBusy.counterplayCues, 1);
  assert.ok(bossCalm.cueOpacity > rival.cueOpacity);
  assert.ok(bossBusy.cueOpacity > 1);
});

test("V40.19 reserves extra contrast for storm, volcano and prism boss beats", () => {
  for (const stageId of ["storm-carrier", "volcano-core", "prism-citadel"] as const) {
    const build = readability(stageId, "build", false);
    const boss = readability(stageId, "boss", true);
    assert.ok(boss.focusPressure > build.focusPressure + .4);
    assert.ok(boss.fxClarity.smokeAlpha < build.fxClarity.smokeAlpha);
    assert.ok(boss.fxClarity.missileSmokeAlpha < build.fxClarity.missileSmokeAlpha);
    assert.ok(boss.speedLineAlpha < build.speedLineAlpha);
    assert.ok(boss.fxClarity.sparkAlpha >= .76);
    assert.ok(boss.fxClarity.detonationAlpha >= .78);
  }
});

test("V40.19 opens Volcano Core decorative framing to fleet-stage strength", () => {
  const volcano = skyDancerArcadeV4018EnvironmentFraming({ compactLandscape: true, stageBiome: "volcano", stageOrder: 8, rhythmPhase: "boss-rise" });
  const city = skyDancerArcadeV4018EnvironmentFraming({ compactLandscape: true, stageBiome: "city", stageOrder: 0, rhythmPhase: "boss-rise" });
  assert.ok(volcano.pressure >= .9);
  assert.ok(volcano.chunkSpreadX > 1.15);
  assert.ok(Math.abs(volcano.backdropShiftX) > Math.abs(city.backdropShiftX));
});

test("V40.19 keeps desktop and post-boss framing authored", () => {
  const desktop = skyDancerArcadeV409PhoneClarity({ compactLandscape: false, sceneMode: "boss", incomingThreats: 5 });
  assert.equal(desktop.cueOpacity, 1);
  const handoff = skyDancerArcadeV4018EnvironmentFraming({ compactLandscape: true, stageBiome: "storm", stageOrder: 3, rhythmPhase: "handoff" });
  assert.equal(handoff.pressure, 0);
  assert.equal(handoff.chunkSpreadX, 1);
});
