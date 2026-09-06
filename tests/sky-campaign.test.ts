import assert from "node:assert/strict";
import test from "node:test";
import {
  SKY_DANCER_CAMPAIGN_MISSIONS_V49,
  getSkyDancerMissionBeatV49,
  gradeSkyDancerMissionV49,
} from "../src/sky/SkyDancerCampaignV49";
import { skyDancerCampaignBossHpV49 } from "../src/sky/SkyDancerCampaignPacingV49";

test("campaign keeps six distinct compact arcade sorties", () => {
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

test("mission beats rotate cross, intercept, Turbo break and altitude duel decisions", () => {
  const mission = SKY_DANCER_CAMPAIGN_MISSIONS_V49[0];
  assert.equal(getSkyDancerMissionBeatV49(mission, 0).beat.kind, "cross");
  assert.equal(getSkyDancerMissionBeatV49(mission, 2).beat.kind, "intercept");
  assert.equal(getSkyDancerMissionBeatV49(mission, 3).beat.kind, "break");
  assert.equal(getSkyDancerMissionBeatV49(mission, 4).beat.kind, "vertical");
});

test("campaign boss durability rises by mission and remains capped", () => {
  const first = skyDancerCampaignBossHpV49(1);
  const middle = skyDancerCampaignBossHpV49(3);
  const final = skyDancerCampaignBossHpV49(6);
  assert.ok(first < middle);
  assert.ok(middle < final);
  assert.equal(skyDancerCampaignBossHpV49(20), final);
});

test("mission grade rewards time, accuracy, evades and FLOW", () => {
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 105, accuracy: 0.78, perfectEvades: 4, peakFlow: 96 }, 130), "S");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 130, accuracy: 0.60, perfectEvades: 3, peakFlow: 72 }, 130), "A");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 145, accuracy: 0.42, perfectEvades: 2, peakFlow: 48 }, 130), "B");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 190, accuracy: 0.24, perfectEvades: 0, peakFlow: 12 }, 130), "C");
});
