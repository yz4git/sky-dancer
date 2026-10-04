import test from "node:test";
import assert from "node:assert/strict";
import {
  createSkyDancerMissionGraph,
  skyDancerMissionHash,
  skyDancerMissionPatch,
  SkyDancerMissionRuntime,
} from "../src/sky/mission/SkyDancerMissionIR";
import {
  getSkyDancerMissionRuntime,
  skyDancerArcadeDirectorNodeId,
  skyDancerArcadeMissionTuning,
  skyDancerMissionGraph,
  skyDancerSkyRaidDirectorNodeId,
  skyDancerSkyRaidMissionTuning,
  skyDancerTurboHuntDirectorNodeId,
  skyDancerTurboHuntMissionTuning,
} from "../src/sky/mission/SkyDancerMissionCatalog";

test("Mission IR canonical hash is deterministic across object key order", () => {
  assert.equal(
    skyDancerMissionHash({ b: 2, a: 1, nested: { y: true, x: "ok" } }),
    skyDancerMissionHash({ nested: { x: "ok", y: true }, a: 1, b: 2 }),
  );
});

test("Mission IR patch propagates through the reverse dependency graph", () => {
  const graph = createSkyDancerMissionGraph("arcade", [
    {
      id: "mission",
      kind: "mission",
      label: "MISSION",
      dependsOn: [],
      values: { enabled: true },
    },
    {
      id: "segment",
      kind: "segment",
      label: "SEGMENT",
      dependsOn: ["mission"],
      values: { intensity: 1 },
    },
    {
      id: "director",
      kind: "director",
      label: "DIRECTOR",
      dependsOn: ["segment"],
      values: { pressureScale: 1 },
    },
    {
      id: "camera",
      kind: "camera",
      label: "CAMERA",
      dependsOn: ["director"],
      values: { enabled: true },
    },
  ]);
  const runtime = new SkyDancerMissionRuntime(graph);
  const result = runtime.applyPatch(skyDancerMissionPatch(
    "test-pressure",
    "test",
    [{ nodeId: "director", set: { pressureScale: 1.1 } }],
  ));

  assert.deepEqual(result.changedNodeIds, ["director"]);
  assert.deepEqual(result.impactedNodeIds, ["camera", "director"]);
  assert.equal(runtime.number("director", "pressureScale", 0), 1.1);
  assert.notEqual(result.revisionHash, graph.revisionHash);
});

test("Mission IR no-op patches do not advance revision or patch serial", () => {
  const graph = createSkyDancerMissionGraph("turbo-hunt", [{
    id: "mission",
    kind: "mission",
    label: "MISSION",
    dependsOn: [],
    values: { enabled: true },
  }]);
  const runtime = new SkyDancerMissionRuntime(graph);
  const before = runtime.snapshot();
  const result = runtime.applyPatch(skyDancerMissionPatch(
    "noop",
    "same value",
    [{ nodeId: "mission", set: { enabled: true } }],
  ));
  const after = runtime.snapshot();

  assert.deepEqual(result.changedNodeIds, []);
  assert.equal(after.revisionHash, before.revisionHash);
  assert.equal(after.patchSerial, before.patchSerial);
});

test("Mission catalog maps all three modes into stable dependency graphs", () => {
  const arcade = skyDancerMissionGraph("arcade");
  const hunt = skyDancerMissionGraph("turbo-hunt");
  const raid = skyDancerMissionGraph("sky-raid");

  assert.equal(arcade.format, "sky-dancer-mission-ir");
  assert.ok(arcade.nodes.some((node) => node.id === "arcade:stage:dawn-city"));
  assert.ok(arcade.nodes.some((node) => node.id === "arcade:director:dawn-city:city-entry"));
  assert.ok(hunt.nodes.some((node) => node.id === "turbo-hunt:director:overdrive"));
  assert.ok(raid.nodes.some((node) => node.id === "sky-raid:director:prism-citadel"));

  for (const graph of [arcade, hunt, raid]) {
    assert.match(graph.revisionHash, /^sd1-/);
    assert.equal(new Set(graph.nodes.map((node) => node.id)).size, graph.nodes.length);
  }
});

test("Arcade mission patch changes only the active beat director and dependents", () => {
  const owner = {};
  const neutral = skyDancerArcadeMissionTuning(owner, "dawn-city", "city-entry", {
    hpRatio: 1,
    chain: 0,
    recentDamage: 0,
  });
  assert.equal(neutral.pressureScale, 1);

  const recovery = skyDancerArcadeMissionTuning(owner, "dawn-city", "city-entry", {
    hpRatio: 0.2,
    chain: 0,
    recentDamage: 1.3,
  });
  assert.equal(recovery.pressureScale, 1);
  assert.equal(recovery.waveCadenceScale, 1);
  assert.equal(recovery.hazardCadenceScale, 1);
  assert.equal(recovery.cameraFovOffset, -0.4);
  assert.equal(recovery.cameraPullbackOffset, 0.35);

  const runtime = getSkyDancerMissionRuntime(owner, "arcade");
  const node = runtime.getNode(skyDancerArcadeDirectorNodeId("dawn-city", "city-entry"));
  const untouched = runtime.getNode(skyDancerArcadeDirectorNodeId("dawn-city", "tower-slalom"));
  assert.equal(node?.values.pressureScale, 1);
  assert.equal(node?.values.cameraFovOffset, -0.4);
  assert.equal(untouched?.values.pressureScale, 1);
  assert.notEqual(recovery.revisionHash, neutral.revisionHash);
});

test("Turbo Hunt mission patch adjusts target population without mutating base phase data", () => {
  const owner = {};
  const baseGraph = skyDancerMissionGraph("turbo-hunt");
  const baseRevision = baseGraph.revisionHash;
  const hot = skyDancerTurboHuntMissionTuning(owner, "overdrive", {
    heat: 94,
    ordersCompleted: 5,
    elapsedSeconds: 100,
  });
  assert.equal(hot.targetCountOffset, 1);
  assert.equal(hot.spawnAggression, 1.08);

  const runtime = getSkyDancerMissionRuntime(owner, "turbo-hunt");
  assert.equal(
    runtime.number(skyDancerTurboHuntDirectorNodeId("overdrive"), "targetCountOffset", 0),
    1,
  );
  assert.equal(skyDancerMissionGraph("turbo-hunt").revisionHash, baseRevision);
});

test("Arcade mission carry mutates only the following beat presentation", () => {
  const owner = {};
  skyDancerArcadeMissionTuning(owner, "dawn-city", "city-entry", {
    hpRatio: 0.9,
    chain: 10,
    recentDamage: 0,
  });
  const next = skyDancerArcadeMissionTuning(owner, "dawn-city", "tower-slalom", {
    hpRatio: 0.8,
    chain: 0,
    recentDamage: 0,
  });

  assert.equal(next.cameraFovOffset, 0.25);
  assert.equal(next.cameraPullbackOffset, 0.15);

  const runtime = getSkyDancerMissionRuntime(owner, "arcade");
  const later = runtime.getNode(skyDancerArcadeDirectorNodeId("dawn-city", "drone-swarm"));
  assert.equal(later?.values.carryCameraFovOffset, 0);
});

test("Turbo Hunt carries a hot streak into the next phase only", () => {
  const owner = {};
  skyDancerTurboHuntMissionTuning(owner, "heat-up", {
    heat: 96,
    ordersCompleted: 5,
    elapsedSeconds: 42,
  });
  const next = skyDancerTurboHuntMissionTuning(owner, "elite-invasion", {
    heat: 50,
    ordersCompleted: 0,
    elapsedSeconds: 5,
  });

  assert.equal(next.targetCountOffset, 1);
  assert.equal(next.spawnAggression, 1.04);
});

test("SKY RAID carries dominant act performance into the next act", () => {
  const owner = {};
  skyDancerSkyRaidMissionTuning(owner, "dawn-city", {
    chain: 9,
    actKills: 12,
    perfectRushes: 4,
    actBreaks: 2,
  });
  const next = skyDancerSkyRaidMissionTuning(owner, "red-canyon", {
    chain: 0,
    actKills: 5,
    perfectRushes: 0,
    actBreaks: 1,
  });

  assert.equal(next.pressureScale, 1.03);
  assert.equal(next.rushTargetOffset, 1);
  assert.equal(next.speedScale, 1.01);
});

test("SKY RAID mission patch escalates high-chain and repeated perfect-rush play", () => {
  const owner = {};
  const tuning = skyDancerSkyRaidMissionTuning(owner, "cloud-fleet", {
    chain: 9,
    actKills: 12,
    perfectRushes: 4,
    actBreaks: 2,
  });

  assert.equal(tuning.pressureScale, 1.08);
  assert.equal(tuning.rushTargetOffset, 1);
  assert.equal(tuning.speedScale, 1.025);

  const runtime = getSkyDancerMissionRuntime(owner, "sky-raid");
  assert.equal(
    runtime.number(skyDancerSkyRaidDirectorNodeId("cloud-fleet"), "pressureScale", 0),
    1.08,
  );
});
