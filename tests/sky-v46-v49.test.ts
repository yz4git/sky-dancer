import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_CAMPAIGN_MISSIONS_V49,
  getSkyDancerMissionBeatV49,
  gradeSkyDancerMissionV49,
} from "../src/sky/SkyDancerCampaignV49";
import { skyDancerCampaignBossHpV49 } from "../src/sky/SkyDancerCampaignPacingV49";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V55 campaign keeps six missions while tightening each sortie toward the two-minute arcade target", () => {
  assert.equal(SKY_DANCER_CAMPAIGN_MISSIONS_V49.length, 6);
  for (const mission of SKY_DANCER_CAMPAIGN_MISSIONS_V49) {
    assert.ok(mission.killTarget >= 5 && mission.killTarget <= 7);
    assert.ok(mission.activeThreatTarget >= 4 && mission.activeThreatTarget <= 5);
    assert.ok(mission.parSeconds >= 120 && mission.parSeconds <= 160);
    assert.equal(mission.beats.length, 4);
  }
  assert.deepEqual(
    SKY_DANCER_CAMPAIGN_MISSIONS_V49.map((mission) => mission.worldStyle),
    ["city", "clouds", "mountains", "facility", "storm", "citadel"],
  );
});

test("V46 mission beats deliberately rotate cross, intercept, Turbo break and altitude duel decisions", () => {
  const mission = SKY_DANCER_CAMPAIGN_MISSIONS_V49[0];
  assert.equal(getSkyDancerMissionBeatV49(mission, 0).beat.kind, "cross");
  assert.equal(getSkyDancerMissionBeatV49(mission, 2).beat.kind, "intercept");
  assert.equal(getSkyDancerMissionBeatV49(mission, 3).beat.kind, "break");
  assert.equal(getSkyDancerMissionBeatV49(mission, 4).beat.kind, "vertical");
  const source = read("../src/sky/SkyDancerCombatChoreographyV46.ts");
  assert.match(source, /SKY_DANCER_CHOREOGRAPHY_MAX_ACTIVE_THREATS_V46 = 5/);
  assert.match(source, /FORMATION BROKEN · BOSS AIRSPACE OPEN/);
  assert.match(source, /enemy\.moveSpeed = Math\.min\(enemy\.moveSpeed, 1\.45\)/);
  assert.match(source, /state\.perfectEvades \+= 1/);
  assert.match(source, /state\.flow = Math\.min\(SKY_DANCER_FLOW_MAX_V46/);
});

test("V46 bridges the compact kill target into the legacy quota without shrinking CLEANUP population", () => {
  const guard = read("../src/sky/SkyDancerCleanupCadenceGuardV46.ts");
  assert.match(guard, /SKY_DANCER_V46_CLEANUP_SURVIVORS = 5/);
  assert.match(guard, /stage\.phase !== "reinforcements"/);
  assert.match(guard, /stage\.stageKills < mission\.killTarget/);
  assert.match(guard, /-v46-cleanup-/);
  assert.match(guard, /this\.enemies\.push\(\.\.\.cleanup\)/);
  assert.match(guard, /bridgeMode: "fresh-cleanup-ids"/);
  assert.doesNotMatch(guard, /enemy\.alive = true/);
});

test("V49 campaign bosses keep three-phase setpieces without the endurance tail", () => {
  assert.equal(skyDancerCampaignBossHpV49(1), 120);
  assert.equal(skyDancerCampaignBossHpV49(3), 144);
  assert.equal(skyDancerCampaignBossHpV49(6), 180);
  assert.equal(skyDancerCampaignBossHpV49(20), 180);
  const source = read("../src/sky/SkyDancerCampaignPacingV49.ts");
  assert.match(source, /stage\.phase !== "boss"/);
  assert.match(source, /getSkyDancerMissionV49\(stage\.stage\)/);
  assert.match(source, /boss\.maxHp > targetMaxHp/);
  assert.match(source, /final durability owner on every real campaign-boss step/);
  assert.doesNotMatch(source, /scaledBossStage/);
});

test("V49 grade rewards time, accuracy, near-miss evades and FLOW", () => {
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 105, accuracy: 0.78, perfectEvades: 4, peakFlow: 96 }, 130), "S");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 130, accuracy: 0.60, perfectEvades: 3, peakFlow: 72 }, 130), "A");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 145, accuracy: 0.42, perfectEvades: 2, peakFlow: 48 }, 130), "B");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 190, accuracy: 0.24, perfectEvades: 0, peakFlow: 12 }, 130), "C");
});

test("V55 leaves normal WAVE flight to V41 and only forces cleanup finishers into attack lanes", () => {
  const source = read("../src/sky/SkyDancerArcadePacingV55.ts");
  const facade = read("../src/sky/SkyDancerAirCombatFx.ts");
  const cleanupBlock = source.indexOf("if (cleanup) {");
  const firstLaneWrite = source.indexOf("moveTowardLane(this");
  assert.ok(cleanupBlock >= 0);
  assert.ok(firstLaneWrite > cleanupBlock);
  assert.match(source, /const cleanup = stageCycle\.phase === "cleanup"/);
  assert.doesNotMatch(source, /stageCycle\.phase === "reinforcements"/);
  assert.doesNotMatch(source, /capThreatDurability/);
  assert.match(source, /SKY_DANCER_V55_CLEANUP_FINISHER_START = 12/);
  assert.match(source, /SKY_DANCER_V55_CLEANUP_LAST_TARGET_START = 18/);
  assert.match(source, /targets\.length <= 2/);
  assert.match(source, /targets\.length === 1/);
  assert.match(source, /attackLane\(this, 0, 27, 0\)/);
  assert.match(source, /capCleanupDurability/);
  assert.match(source, /isSkyDancerCombatTargetableV42/);
  assert.match(facade, /installSkyDancerCampaignPacingV49\(\);\n    installSkyDancerArcadePacingV55\(\);/);
});

test("V47 creates six route-specific world setpieces instead of one repeated test field", () => {
  const source = read("../src/sky/presentation/SkyDancerV47WorldReconstructionPass.ts");
  assert.match(source, /sky-dancer-v47-city-corridor/);
  assert.match(source, /sky-dancer-v47-cloud-knife/);
  assert.match(source, /sky-dancer-v47-iron-valley/);
  assert.match(source, /sky-dancer-v47-halo-foundry/);
  assert.match(source, /sky-dancer-v47-storm-crown/);
  assert.match(source, /sky-dancer-v47-last-light-citadel/);
  assert.match(source, /ANCHOR_RESET_DISTANCE = 178/);
  assert.match(source, /InstancedMesh/);
});

test("V48 makes the boss a large readable setpiece with animated core and four engines", () => {
  const source = read("../src/sky/presentation/SkyDancerV48BossSetpiecePass.ts");
  assert.match(source, /visualSpanUnits: 20\.3/);
  assert.match(source, /sky-dancer-v48-boss-core/);
  assert.match(source, /coreOpen \? 1\.18/);
  assert.match(source, /mode === "strike"/);
  assert.match(source, /\[-5\.4, -2\.35, 2\.35, 5\.4\]/);
});

test("V49 HUD and presentation pipeline are mounted after V45 without adding player controls", () => {
  const phase = read("../app/CartRogueGamePhase13.tsx");
  const hud = read("../app/SkyDancerHudV49.tsx");
  const facade = read("../src/sky/SkyDancerAirCombatFx.ts");
  const pipeline = read("../src/sky/presentation/SkyDancerPresentationPipeline.ts");
  assert.match(phase, /SkyDancerHudV45 \/>/);
  assert.match(phase, /SkyDancerHudV49 \/>/);
  assert.match(hud, /FLOW/);
  assert.match(hud, /PERFECT EVADE/);
  assert.match(hud, /CAMPAIGN COMPLETE/);
  assert.match(facade, /installSkyDancerBossAttackRunV45\(\);\n    installSkyDancerCombatChoreographyV46\(\);/);
  assert.match(facade, /installSkyDancerCleanupCadenceGuardV46\(\);\n    installSkyDancerCampaignPacingV49\(\);/);
  assert.match(pipeline, /this\.v45\.update\(snapshot\);\n    this\.v47\.update\(snapshot\);\n    this\.v48\.update\(snapshot\);/);
  assert.doesNotMatch(hud, /button|onClick|pointerdown/i);
});
