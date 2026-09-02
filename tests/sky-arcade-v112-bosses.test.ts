import test from "node:test";
import assert from "node:assert/strict";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  skyDancerArcadeV11BossMotion,
  skyDancerArcadeV11BossProfile,
  skyDancerArcadeV11BossWeakpointOpen,
} from "../src/sky/arcade/SkyDancerArcadeV11Bosses";

test("V11.2 gives all eleven climax targets distinct boss identities", () => {
  const styles = new Set();
  const finalMechanics = new Set();
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const profile = skyDancerArcadeV11BossProfile(stage.id);
    assert.equal(profile.stageId, stage.id);
    styles.add(profile.motionStyle);
    finalMechanics.add(profile.mechanicLabels[2]);
    assert.equal(profile.mechanicLabels.length, 3);
    assert.ok(profile.depthTargets[0] > profile.depthTargets[2], `${stage.id} closes distance by the final phase`);
    assert.ok(profile.intensity[0] < profile.intensity[2]);
    assert.equal(skyDancerArcadeV11BossWeakpointOpen(stage.id, 1, 999), false);
    const phase2EverOpens = Array.from({length:80},(_,i)=>skyDancerArcadeV11BossWeakpointOpen(stage.id,2,i*.08)).some(Boolean);
    const phase3EverOpens = Array.from({length:80},(_,i)=>skyDancerArcadeV11BossWeakpointOpen(stage.id,3,i*.08)).some(Boolean);
    assert.ok(phase2EverOpens && phase3EverOpens, `${stage.id} exposes a readable attack window`);
  }
  assert.equal(styles.size, SKY_DANCER_ARCADE_STAGES.length, "every boss owns a unique motion identity");
  assert.equal(finalMechanics.size, SKY_DANCER_ARCADE_STAGES.length, "every boss owns a unique final mechanic label");
});

test("V11.2 boss motion stays finite and inside the combat envelope", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    for (const phase of [1,2,3] as const) {
      for (const age of [0,.5,1.3,2.7,5.1,9.4]) {
        const pose = skyDancerArcadeV11BossMotion(stage.id, phase, age, 1.9, -1.4, 1.42, .2);
        assert.ok(Number.isFinite(pose.x + pose.y + pose.depthTarget + pose.depthSpeed));
        assert.ok(Math.abs(pose.x) <= 2.58 && Math.abs(pose.y) <= 2.02, `${stage.id} phase ${phase} stays readable`);
        assert.ok(pose.depthTarget > 10 && pose.depthTarget < 45);
        assert.ok(pose.depthSpeed > 0);
      }
    }
  }
});

test("V11.2 phase transitions trigger stage-specific mechanics, hazards and escorts", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const runtime = new SkyDancerArcadeRuntime({ mode:"stage-practice", startStageId:stage.id, difficulty:"normal", seed:812 });
    const profile = skyDancerArcadeV11BossProfile(stage.id);
    runtime.triggerBossPhaseForTests(1);
    const phase1 = runtime.getSnapshot();
    assert.equal(phase1.bossMechanicLabel, profile.mechanicLabels[0]);
    const initialSerial = phase1.bossMechanicSerial;

    runtime.triggerBossPhaseForTests(2);
    const phase2 = runtime.getSnapshot();
    assert.equal(phase2.bossPhase, 2);
    assert.equal(phase2.bossMechanicLabel, profile.mechanicLabels[1]);
    assert.ok(phase2.bossMechanicSerial > initialSerial);
    if (profile.phaseHazards[1]) assert.ok(phase2.hazards.some(h => h.kind === profile.phaseHazards[1]), `${stage.id} phase2 hazard`);
    assert.ok(phase2.enemies.filter(e => !e.boss).length >= profile.escortCounts[1], `${stage.id} phase2 escorts`);

    runtime.triggerBossPhaseForTests(3);
    const phase3 = runtime.getSnapshot();
    assert.equal(phase3.bossPhase, 3);
    assert.equal(phase3.bossMechanicLabel, profile.mechanicLabels[2]);
    assert.ok(phase3.bossMechanicIntensity >= phase2.bossMechanicIntensity);
    if (profile.phaseHazards[2]) assert.ok(phase3.hazards.some(h => h.kind === profile.phaseHazards[2]), `${stage.id} phase3 hazard`);
  }
});
