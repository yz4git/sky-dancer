import test from "node:test";
import assert from "node:assert/strict";
import { skyDancerArcadeV26FormationCommand } from "../src/sky/arcade/SkyDancerArcadeV26FormationTactics";

const neighbor = (id: number, x: number, y: number, depth: number, maneuverSign: number) => ({ id, x, y, depth, maneuverSign });

test("V26 approach pairs establish opposite pincer lanes", () => {
  const left = skyDancerArcadeV26FormationCommand({
    id: 11, x: -.25, y: 0, depth: 46, maneuver: "approach", maneuverSign: -1,
    targetX: -.2, targetY: .05, playerX: .15, playerY: -.1, steeringUrgency: 1,
    neighbors: [neighbor(12, .25, 0, 45, 1)],
  });
  const right = skyDancerArcadeV26FormationCommand({
    id: 12, x: .25, y: 0, depth: 45, maneuver: "approach", maneuverSign: 1,
    targetX: .2, targetY: .05, playerX: .15, playerY: -.1, steeringUrgency: 1,
    neighbors: [neighbor(11, -.25, 0, 46, -1)],
  });
  assert.equal(left.tactic, "pincer");
  assert.equal(right.tactic, "pincer");
  assert.ok(left.targetX < -.55, `left pincer lane ${left.targetX}`);
  assert.ok(right.targetX > .75, `right pincer lane ${right.targetX}`);
  assert.ok(right.targetX - left.targetX > 1.4);
});

test("V26 cross-pass pairs break in opposite lateral and altitude lanes", () => {
  const a = skyDancerArcadeV26FormationCommand({
    id: 21, x: -.12, y: .04, depth: 17, maneuver: "cross-pass", maneuverSign: -1,
    targetX: .1, targetY: .1, playerX: 0, playerY: 0, steeringUrgency: 1.1,
    neighbors: [neighbor(22, .12, -.04, 17.4, 1)],
  });
  const b = skyDancerArcadeV26FormationCommand({
    id: 22, x: .12, y: -.04, depth: 17.4, maneuver: "cross-pass", maneuverSign: 1,
    targetX: -.1, targetY: -.1, playerX: 0, playerY: 0, steeringUrgency: 1.1,
    neighbors: [neighbor(21, -.12, .04, 17, -1)],
  });
  assert.equal(a.tactic, "break");
  assert.equal(b.tactic, "break");
  assert.ok(a.targetX < -.9 && b.targetX > .9);
  assert.ok(a.targetY > .55 && b.targetY < -.55);
  assert.ok(a.steeringUrgency >= 1.3 && b.steeringUrgency >= 1.3);
});

test("V26 overtake and close-bank aircraft re-form into an offset echelon", () => {
  const left = skyDancerArcadeV26FormationCommand({
    id: 31, x: -1.8, y: 1.1, depth: 23, maneuver: "overtake", maneuverSign: -1,
    targetX: -1.5, targetY: .9, playerX: .2, playerY: -.2, steeringUrgency: .9,
    neighbors: [neighbor(32, 1.6, -.8, 24, 1)],
  });
  const right = skyDancerArcadeV26FormationCommand({
    id: 32, x: 1.6, y: -.8, depth: 24, maneuver: "close-bank", maneuverSign: 1,
    targetX: 1.45, targetY: -.7, playerX: .2, playerY: -.2, steeringUrgency: .9,
    neighbors: [neighbor(31, -1.8, 1.1, 23, -1)],
  });
  assert.equal(left.tactic, "rejoin");
  assert.equal(right.tactic, "rejoin");
  assert.ok(left.targetX > -1.5, `left should pull inward, got ${left.targetX}`);
  assert.ok(right.targetX < 1.45, `right should pull inward, got ${right.targetX}`);
  assert.ok(right.targetX - left.targetX > .8, "rejoin should keep two distinct slots");
});

test("V26 local separation pushes overlapping wingmen apart without teleporting them", () => {
  const left = skyDancerArcadeV26FormationCommand({
    id: 41, x: 0, y: 0, depth: 30, maneuver: "parallel", maneuverSign: -1,
    targetX: 0, targetY: 0, playerX: 0, playerY: 0, steeringUrgency: .88,
    neighbors: [neighbor(42, .08, .02, 30.4, 1)],
  });
  const right = skyDancerArcadeV26FormationCommand({
    id: 42, x: .08, y: .02, depth: 30.4, maneuver: "parallel", maneuverSign: 1,
    targetX: 0, targetY: 0, playerX: 0, playerY: 0, steeringUrgency: .88,
    neighbors: [neighbor(41, 0, 0, 30, -1)],
  });
  assert.ok(left.targetX < 0);
  assert.ok(right.targetX > 0);
  assert.ok(left.steeringUrgency >= 1.18 && right.steeringUrgency >= 1.18);
});

test("V26 leaves a lone aircraft on its authored V25 target", () => {
  const command = skyDancerArcadeV26FormationCommand({
    id: 51, x: .2, y: -.1, depth: 40, maneuver: "approach", maneuverSign: 1,
    targetX: .72, targetY: -.44, playerX: 0, playerY: 0, steeringUrgency: .96,
    neighbors: [],
  });
  assert.equal(command.tactic, "independent");
  assert.equal(command.targetX, .72);
  assert.equal(command.targetY, -.44);
  assert.equal(command.steeringUrgency, .96);
});
