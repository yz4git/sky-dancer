import test from "node:test";
import assert from "node:assert/strict";
import { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";
import { skyDancerArcadeV121EncounterGrammar } from "../src/sky/arcade/SkyDancerArcadeV121EncounterGrammar";
import { SkyDancerArcadePresentationDirector, type SkyDancerArcadePresentationSignals } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";

test("V14 promotes a strong middle chain into FLOW RUN before SHOWCASE", () => {
  const plan = skyDancerArcadeV12CombatPlan({
    gunHeat: .22,
    missileHeat: .2,
    turboHeat: .26,
    recentDamage: .08,
    hpRatio: .9,
    chain: 6,
    beatIntensity: .8,
    hard: false,
  });

  assert.equal(plan.mode, "flow-run");
  assert.equal(plan.playerStyle, "flow");
  assert.equal(plan.waveCountDelta, 0, "FLOW should change choreography, not add density");
  assert.ok(plan.cadenceScale < 1);
  assert.ok(plan.pressure <= 1.02);
  assert.match(plan.intent, /BUILD SHOWCASE/);
});

test("V14 preserves SHOWCASE, CLIMAX and RELIEF priority around FLOW RUN", () => {
  const showcase = skyDancerArcadeV12CombatPlan({
    gunHeat: .2, missileHeat: .2, turboHeat: .2, recentDamage: .05,
    hpRatio: .95, chain: 10, beatIntensity: .82, hard: false,
  });
  assert.equal(showcase.mode, "showcase-break");

  const climax = skyDancerArcadeV12CombatPlan({
    gunHeat: .2, missileHeat: .2, turboHeat: .2, recentDamage: .05,
    hpRatio: .95, chain: 6, beatIntensity: 1, hard: false,
  });
  assert.equal(climax.mode, "climax-push");

  const relief = skyDancerArcadeV12CombatPlan({
    gunHeat: .2, missileHeat: .2, turboHeat: .2, recentDamage: 1.3,
    hpRatio: .28, chain: 8, beatIntensity: .9, hard: true,
  });
  assert.equal(relief.mode, "relief-window");
});

test("V14 FLOW RUN is a three-beat fast pass without an enemy wall", () => {
  const grammar = skyDancerArcadeV121EncounterGrammar(
    "night-metro",
    "flow-run",
    4,
    "metro-chase",
    .82,
    false,
  );

  assert.equal(grammar.phases.length, 3);
  assert.deepEqual(grammar.phases.map((phase) => phase.label), ["SLIPSTREAM", "BANK CROSS", "CLEAN EXIT"]);
  assert.deepEqual(grammar.phases.map((phase) => phase.maneuver), ["overtake", "cross-pass", "parallel"]);
  assert.ok(grammar.cadenceScale < 1);
  assert.ok(grammar.phases.every((phase) => phase.countScale <= .5));
  assert.ok(grammar.phases.at(-1)!.delay - grammar.phases[0].delay >= 1.4);
});

function stableSignals(overrides: Partial<SkyDancerArcadePresentationSignals> = {}): SkyDancerArcadePresentationSignals {
  return {
    turboActive: false,
    nearMisses: 0,
    enemiesDefeated: 0,
    bossActive: false,
    hitSerial: 0,
    damageSerial: 0,
    stageSerial: 1,
    resultSerial: 0,
    chain: 0,
    timelineIntensity: .5,
    combatDirectorIntensity: .5,
    combatDirectorSerial: 0,
    combatDirectorMode: "adaptive-mix",
    encounterGrammarSerial: 0,
    ...overrides,
  };
}

test("V14 FLOW RUN opens the camera progressively without a one-frame jump", () => {
  const flowDirector = new SkyDancerArcadePresentationDirector();
  const neutralDirector = new SkyDancerArcadePresentationDirector();
  const flowSignals = stableSignals({
    chain: 7,
    timelineIntensity: .84,
    combatDirectorIntensity: .84,
    combatDirectorMode: "flow-run",
  });
  const neutralSignals = stableSignals();

  let flowFrame = flowDirector.update(flowSignals, flowSignals, 1 / 60);
  let neutralFrame = neutralDirector.update(neutralSignals, neutralSignals, 1 / 60);
  for (let frame = 0; frame < 59; frame += 1) {
    flowFrame = flowDirector.update(flowSignals, flowSignals, 1 / 60);
    neutralFrame = neutralDirector.update(neutralSignals, neutralSignals, 1 / 60);
  }

  assert.ok(flowFrame.fovKick > neutralFrame.fovKick + .25);
  assert.ok(flowFrame.pullback > neutralFrame.pullback + .08);
  assert.ok(flowFrame.bloomBoost > neutralFrame.bloomBoost);
  assert.ok(flowFrame.fovKick <= 10.8);
  assert.ok(flowFrame.pullback <= 3.2);
});

test("V14 high FLOW damps incidental shake while retaining impact feedback", () => {
  const flowDirector = new SkyDancerArcadePresentationDirector();
  const neutralDirector = new SkyDancerArcadePresentationDirector();
  const flowBase = stableSignals({
    chain: 8,
    timelineIntensity: .9,
    combatDirectorIntensity: .9,
    combatDirectorMode: "flow-run",
  });
  const neutralBase = stableSignals();

  for (let frame = 0; frame < 90; frame += 1) {
    flowDirector.update(flowBase, flowBase, 1 / 60);
    neutralDirector.update(neutralBase, neutralBase, 1 / 60);
  }

  const flowEvent = { ...flowBase, nearMisses: 1, enemiesDefeated: 1 };
  const neutralEvent = { ...neutralBase, nearMisses: 1, enemiesDefeated: 1 };
  const flowFrame = flowDirector.update(flowEvent, flowBase, 1 / 60);
  const neutralFrame = neutralDirector.update(neutralEvent, neutralBase, 1 / 60);

  assert.ok(flowFrame.cameraShake > 0, "FLOW must not erase hit feedback");
  assert.ok(flowFrame.cameraShake < neutralFrame.cameraShake, "FLOW should compose the camera instead of adding shake");
  assert.ok(flowFrame.cameraShake <= .34);
  for (const value of [flowFrame.fovKick, flowFrame.cameraShake, flowFrame.pullback, flowFrame.bloomBoost, flowFrame.exposureBoost]) {
    assert.ok(Number.isFinite(value));
  }
});
