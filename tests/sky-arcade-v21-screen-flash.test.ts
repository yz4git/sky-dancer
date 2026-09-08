import test from "node:test";
import assert from "node:assert/strict";
import {
  SKY_DANCER_ARCADE_SUPPRESSED_SCREEN_FLASH_OBJECTS_V21,
  skyDancerArcadeCinematicPostFxV21,
} from "../src/sky/arcade/SkyDancerArcadeCinematicRenderer";
import {
  SkyDancerArcadePresentationDirector,
  type SkyDancerArcadePresentationFrame,
} from "../src/sky/arcade/SkyDancerArcadePresentationDirector";

const baseSignals = {
  turboActive: false,
  nearMisses: 0,
  enemiesDefeated: 0,
  bossActive: false,
  hitSerial: 0,
  damageSerial: 0,
  stageSerial: 1,
  resultSerial: 0,
  bossPhaseSerial: 0,
  stageEventSerial: 0,
  armorBreaks: 0,
  formationBreaks: 0,
};

test("routine hits and kills no longer spike whole-frame exposure", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const hit = director.update({ ...baseSignals, hitSerial: 1 }, baseSignals, 1 / 60);
  assert.equal(hit.exposureBoost, 0, "ordinary hit feedback must stay local instead of flashing the framebuffer");
  assert.ok(hit.bloomBoost <= .02, `ordinary hit bloom ${hit.bloomBoost} must remain subtle`);

  director.reset();
  const kill = director.update({ ...baseSignals, enemiesDefeated: 1 }, baseSignals, 1 / 60);
  assert.equal(kill.exposureBoost, 0, "ordinary kills must not change global exposure");
  assert.ok(kill.bloomBoost <= .04, `ordinary kill bloom ${kill.bloomBoost} must remain bounded`);

  director.reset();
  const damage = director.update({ ...baseSignals, damageSerial: 1 }, baseSignals, 1 / 60);
  assert.equal(damage.exposureBoost, 0, "player damage may tint/shake the edges but must not white-flash the screen");
});

test("authored major beats retain a bounded cinematic light lift", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const bossPhase = director.update({ ...baseSignals, bossActive: true, bossPhaseSerial: 1 }, { ...baseSignals, bossActive: true }, 1 / 60);
  assert.ok(bossPhase.exposureBoost > 0);
  assert.ok(bossPhase.exposureBoost <= .14);

  director.reset();
  const stageBeat = director.update({ ...baseSignals, stageEventSerial: 1 }, baseSignals, 1 / 60);
  assert.ok(stageBeat.exposureBoost > 0);
  assert.ok(stageBeat.exposureBoost <= .14);
});

test("cinematic post FX hard-bounds brightness and suppresses legacy viewport flash meshes", () => {
  const extreme: SkyDancerArcadePresentationFrame = {
    rush: 2,
    turboKick: 1,
    nearMiss: 1,
    impact: 2,
    damage: 2,
    kill: 2,
    boss: 2,
    transition: 2,
    fovKick: 10,
    cameraShake: 1,
    pullback: 3,
    bloomBoost: 2,
    exposureBoost: 2,
  };
  const fx = skyDancerArcadeCinematicPostFxV21(true, extreme);
  assert.ok(fx.bloomStrength <= .5);
  assert.ok(fx.exposureBoost <= .1);
  assert.ok(fx.impactStrength <= .42);
  assert.ok(fx.rushStrength <= 1);
  assert.ok(fx.damageStrength <= 1);
  assert.ok(fx.bossStrength <= 1);
  assert.ok(fx.transitionStrength <= 1);
  assert.deepEqual(SKY_DANCER_ARCADE_SUPPRESSED_SCREEN_FLASH_OBJECTS_V21, [
    "arcade-climax-flash-v5",
    "arcade-climax-shock-ring-v51",
  ]);
});
