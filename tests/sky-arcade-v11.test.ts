import test from "node:test";
import assert from "node:assert/strict";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { skyDancerArcadeV11Beat, skyDancerArcadeV11RouteRisk, skyDancerArcadeV11Timeline } from "../src/sky/arcade/SkyDancerArcadeV11Timeline";

test("V11 gives every arcade stage a continuous five-beat authored timeline", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const beats = skyDancerArcadeV11Timeline(stage.id);
    assert.equal(beats.length, 5, `${stage.id} has five authored beats`);
    assert.equal(beats[0]?.start, 0);
    assert.equal(beats[beats.length - 1]?.end, 1);
    assert.equal(beats[beats.length - 1]?.kind, "boss");
    for (let i = 0; i < beats.length; i += 1) {
      const beat = beats[i]!;
      assert.ok(beat.end > beat.start, `${stage.id}/${beat.id} has positive duration`);
      assert.ok(beat.intensity >= 0 && beat.intensity <= 1);
      assert.ok(Math.abs(beat.cameraFov) <= 5 && beat.cameraPullback >= 0 && beat.cameraPullback <= 4);
      assert.ok(beat.preferredEnemies.length > 0 && beat.preferredFormations.length > 0 && beat.maneuvers.length > 0);
      if (i > 0) assert.ok(Math.abs(beats[i - 1]!.end - beat.start) < 1e-9, `${stage.id} has no timeline gap`);
    }
  }
});

test("V11 stage identities expose distinct signature setpieces", () => {
  const signatures = new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => skyDancerArcadeV11Beat(stage.id, .35).setpiece));
  assert.equal(signatures.size, SKY_DANCER_ARCADE_STAGES.length);
  const city = skyDancerArcadeV11Beat("dawn-city", .5);
  assert.equal(city.id, "ace-pursuit");
  assert.ok(city.preferredEnemies.includes("ace"));
  assert.ok(city.maneuvers.includes("overtake") && city.maneuvers.includes("cross-pass"));
  assert.equal(skyDancerArcadeV11Beat("prism-citadel", .5).kind, "boss");
});

test("V11 route risk communicates safe, score and danger choices", () => {
  assert.deepEqual([0,1].map((i) => skyDancerArcadeV11RouteRisk(i,2)), ["SAFE","DANGER"]);
  assert.deepEqual([0,1,2].map((i) => skyDancerArcadeV11RouteRisk(i,3)), ["SAFE","SCORE","DANGER"]);
  assert.equal(skyDancerArcadeV11RouteRisk(0,1), "LOCKED");
});

test("V11 runtime advances course beats and exposes camera/setpiece telemetry", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", startStageId: "dawn-city", difficulty: "normal", seed: 111 });
  const initial = runtime.getSnapshot();
  assert.equal(initial.timelineBeatId, "city-entry");
  runtime.triggerV11TimelineForTests(.14);
  const slalom = runtime.getSnapshot();
  assert.equal(slalom.timelineBeatId, "tower-slalom");
  assert.ok(slalom.timelineSerial > initial.timelineSerial);
  assert.equal(slalom.stageEventLabel, "SKYLINE SLALOM");
  runtime.triggerV11TimelineForTests(.5);
  const pursuit = runtime.getSnapshot();
  assert.equal(pursuit.timelineBeatId, "ace-pursuit");
  assert.ok(pursuit.timelineCameraFov > slalom.timelineCameraFov);
  assert.equal(pursuit.routeRiskLabels.length, 2);
});
