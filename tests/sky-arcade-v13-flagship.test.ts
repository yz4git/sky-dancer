import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";
import { skyDancerArcadeV121EncounterGrammar } from "../src/sky/arcade/SkyDancerArcadeV121EncounterGrammar";
import { SkyDancerArcadeV11SetpieceDirector } from "../src/sky/arcade/SkyDancerArcadeV11Setpieces";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";

test("V13 promotes sustained mastery into a showcase break", () => {
  const plan = skyDancerArcadeV12CombatPlan({
    gunHeat: .35,
    missileHeat: .3,
    turboHeat: .4,
    recentDamage: .08,
    hpRatio: .92,
    chain: 11,
    beatIntensity: .84,
    hard: false,
  });
  assert.equal(plan.mode, "showcase-break");
  assert.equal(plan.playerStyle, "flow");
  assert.ok(plan.cadenceScale < .8);
  assert.ok(plan.waveCountDelta > 0);
  assert.match(plan.intent, /KEEP FLOW/);
});

test("V13 final approach becomes a climax push without overriding relief", () => {
  const climax = skyDancerArcadeV12CombatPlan({
    gunHeat: .4,
    missileHeat: .35,
    turboHeat: .32,
    recentDamage: .1,
    hpRatio: .88,
    chain: 4,
    beatIntensity: 1,
    hard: false,
  });
  assert.equal(climax.mode, "climax-push");
  assert.equal(climax.playerStyle, "climax");
  assert.equal(climax.intensity, 1);

  const relief = skyDancerArcadeV12CombatPlan({
    gunHeat: .4,
    missileHeat: .35,
    turboHeat: .32,
    recentDamage: 1.4,
    hpRatio: .24,
    chain: 14,
    beatIntensity: 1,
    hard: true,
  });
  assert.equal(relief.mode, "relief-window");
});

test("V13 showcase and climax encounters are four readable combat beats", () => {
  const showcase = skyDancerArcadeV121EncounterGrammar("night-metro", "showcase-break", 3, "phantom-pursuit", 1, false);
  const climax = skyDancerArcadeV121EncounterGrammar("prism-citadel", "climax-push", 7, "titan-approach", 1, true);

  for (const grammar of [showcase, climax]) {
    assert.equal(grammar.phases.length, 4);
    for (let index = 1; index < grammar.phases.length; index += 1) {
      assert.ok(grammar.phases[index].delay - grammar.phases[index - 1].delay >= .5, `${grammar.id} phase spacing`);
    }
    assert.ok(grammar.cadenceScale < .8);
  }
  assert.match(showcase.phases.at(-1)?.label ?? "", /HERO EXIT/);
  assert.match(climax.phases.at(-1)?.label ?? "", /CLIMAX REVEAL/);
});

test("every Arcade Run stage now owns course-anchored signature geometry", () => {
  const scene = new THREE.Scene();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  const root = scene.getObjectByName("arcade-v11-signature-setpieces") as THREE.Group | undefined;
  assert.ok(root);
  assert.equal(root.userData.arcadeV13FlagshipSetpieces, true);

  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    director.setStage(stage);
    assert.ok(root.children.length > 0, `${stage.id} must build at least one flagship setpiece anchor`);
    assert.ok(root.children.every((child) => child.userData.arcadeV13FlagshipAnchor === true), `${stage.id} anchors stay course-owned`);
  }
  director.dispose();
});

test("V13 presentation turns high flow into a stronger trailer-shot envelope", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const previous = {
    turboActive: false,
    nearMisses: 2,
    enemiesDefeated: 8,
    bossActive: false,
    hitSerial: 4,
    damageSerial: 1,
    stageSerial: 1,
    resultSerial: 0,
    chain: 2,
    timelineIntensity: .55,
    combatDirectorIntensity: .55,
    combatDirectorSerial: 2,
    combatDirectorMode: "adaptive-mix",
    encounterGrammarSerial: 4,
  };
  const current = {
    ...previous,
    nearMisses: 3,
    enemiesDefeated: 9,
    chain: 12,
    timelineIntensity: .94,
    combatDirectorIntensity: 1,
    combatDirectorSerial: 3,
    combatDirectorMode: "showcase-break",
    encounterGrammarSerial: 5,
  };
  const frame = director.update(current, previous, 1 / 30);
  assert.ok(frame.rush > .2);
  assert.ok(frame.fovKick > 4);
  assert.ok(frame.pullback > .3);
  assert.ok(frame.bloomBoost > .1);
});
