import test from "node:test";
import assert from "node:assert/strict";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { arcadeCoursePose, arcadeCourseRelativePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";

test("V6 course path creates authored horizontal bends instead of a straight corridor", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const length = stage.durationSeconds * stage.courseSpeed;
    const samples = Array.from({ length: 13 }, (_, index) => arcadeCoursePose(stage, length * index / 12));
    const xs = samples.map((sample) => sample.x);
    const yawPeak = Math.max(...samples.map((sample) => Math.abs(sample.yaw)));
    assert.ok(Math.max(...xs) - Math.min(...xs) > 22, `${stage.id} horizontal span`);
    assert.ok(yawPeak > 0.045, `${stage.id} yaw peak ${yawPeak}`);
  }
});

test("V6 course path includes vertical flying lines and stage-specific signatures", () => {
  const signatures = new Set<string>();
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const length = stage.durationSeconds * stage.courseSpeed;
    const samples = Array.from({ length: 13 }, (_, index) => arcadeCoursePose(stage, length * index / 12));
    const ys = samples.map((sample) => sample.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 3.2, `${stage.id} vertical span`);
    signatures.add(samples.slice(2, 10).map((sample) => `${Math.round(sample.x / 3)},${Math.round(sample.y / 2)}`).join("|"));
  }
  assert.equal(signatures.size, SKY_DANCER_ARCADE_STAGES.length);
});

test("V6 near and far objects resolve onto the same curved corridor", () => {
  const stage = SKY_DANCER_ARCADE_STAGES[0];
  const length = stage.durationSeconds * stage.courseSpeed;
  let visibleBend = 0;
  for (let i = 1; i <= 9; i += 1) {
    const pose = arcadeCourseRelativePose(stage, length * i / 12, 88);
    visibleBend = Math.max(visibleBend, Math.abs(pose.x));
    assert.ok(Number.isFinite(pose.yaw) && Number.isFinite(pose.pitch));
  }
  assert.ok(visibleBend > 7.5, `dawn-city visible bend ${visibleBend}`);
});
