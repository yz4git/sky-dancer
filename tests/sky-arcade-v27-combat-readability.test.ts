import test from "node:test";
import assert from "node:assert/strict";
import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
  skyDancerArcadeV27CloseCombatCrowded,
  skyDancerArcadeV27CuePointSize,
  skyDancerArcadeV27DensityCaps,
  skyDancerArcadeV27EnemyPresenceScale,
} from "../src/sky/arcade/SkyDancerArcadeV27CombatReadability";

test("V27 keeps the player away from phone-screen edge zones", () => {
  assert.ok(SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT < 2.0);
  assert.ok(SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT < 1.6);
  assert.ok(SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT > 1.7);
  assert.ok(SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT > 1.35);
});

test("V27 only reduces extreme-close enemy visual presence", () => {
  assert.equal(skyDancerArcadeV27EnemyPresenceScale(30), 1);
  assert.equal(skyDancerArcadeV27EnemyPresenceScale(24), 1);
  assert.ok(skyDancerArcadeV27EnemyPresenceScale(12) < .85);
  assert.ok(skyDancerArcadeV27EnemyPresenceScale(2) <= .69);
  assert.ok(skyDancerArcadeV27EnemyPresenceScale(2) >= .67);
});

test("V27 targeting cues are materially smaller than the old fixed 76px marker", () => {
  assert.ok(skyDancerArcadeV27CuePointSize("fighter", false, 40, "lock") <= 44);
  assert.ok(skyDancerArcadeV27CuePointSize("fighter", false, 12, "lock") < 44);
  assert.ok(skyDancerArcadeV27CuePointSize("fighter", false, 40, "aim") < skyDancerArcadeV27CuePointSize("fighter", false, 40, "lock"));
  assert.ok(skyDancerArcadeV27CuePointSize("boss", true, 30, "lock") < 76);
});

test("V27 caps combat density lower on normal while retaining hard-mode pressure", () => {
  const normal = skyDancerArcadeV27DensityCaps(false);
  const hard = skyDancerArcadeV27DensityCaps(true);
  assert.deepEqual(normal, { enemyCap: 9, closeEnemyCap: 5, closeDepth: 36 });
  assert.deepEqual(hard, { enemyCap: 12, closeEnemyCap: 7, closeDepth: 36 });
  assert.equal(skyDancerArcadeV27CloseCombatCrowded([8, 14, 20, 28, 34], false), true);
  assert.equal(skyDancerArcadeV27CloseCombatCrowded([8, 14, 20, 28], false), false);
});
