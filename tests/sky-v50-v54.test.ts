import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V50 defines six mission color scripts with lightweight compatible fog and key/rim lighting", () => {
  const source = read("../src/sky/presentation/SkyDancerV50ColorScriptAtmospherePass.ts");
  for (const style of ["city", "clouds", "mountains", "facility", "storm", "citadel"]) {
    assert.match(source, new RegExp(`${style}: \\{`));
  }
  assert.match(source, /sky-dancer-v50-color-script-sky/);
  assert.match(source, /new THREE\.Fog\(/);
  assert.match(source, /fogNear: 540/);
  assert.match(source, /fogFar: 1840/);
  assert.match(source, /sky-dancer-v50-key-light/);
  assert.match(source, /sky-dancer-v50-rim-light/);
  assert.match(source, /SphereGeometry\(760, 20, 12\)/);
});

test("V51 reconstructs player and enemy silhouettes without changing control or hitbox code", () => {
  const source = read("../src/sky/presentation/SkyDancerV51AircraftSilhouettePass.ts");
  assert.match(source, /sky-dancer-v51-delta-wing/);
  assert.match(source, /sky-dancer-v51-twin-tail/);
  assert.match(source, /sky-dancer-v51-engine-shoulder/);
  assert.match(source, /visualSpan: 6\.8/);
  assert.match(source, /enemy\.kind === "heavy"/);
  assert.match(source, /enemy\.kind === "blocker"/);
  assert.doesNotMatch(source, /applyDamage|hitbox|RallyInputState|requestShot/);
});

test("V52 adds peripheral speed, hit shock and perfect-evade feedback as presentation only", () => {
  const source = read("../src/sky/presentation/SkyDancerV52CombatFxSpeedPass.ts");
  assert.match(source, /sky-dancer-v52-peripheral-speed-field/);
  assert.match(source, /for \(let index = 0; index < 28; index \+= 1\)/);
  assert.match(source, /sky-dancer-v52-hit-shock-ring/);
  assert.match(source, /sky-dancer-v52-perfect-evade-ring/);
  assert.match(source, /getSkyDancerPlayerWeaponState/);
  assert.match(source, /getLatestSkyDancerCampaignSnapshotV49/);
  assert.match(source, /intensity \* \(snapshot\.boostActive \? 0\.40 : 0\.24\)/);
  assert.doesNotMatch(source, /enemy\.hp\s*=|damage\s*=|forwardVelocity\s*=/);
});

test("V53 creates route-scale fly-through setpieces and layered parallax for all six visual worlds", () => {
  const source = read("../src/sky/presentation/SkyDancerV53SetpieceEnvironmentDensityPass.ts");
  assert.match(source, /REANCHOR_DISTANCE = 164/);
  assert.match(source, /for \(let marker = 0; marker < 10; marker \+= 1\)/);
  assert.match(source, /depth-landmark/);
  assert.match(source, /for \(let gate = 0; gate < 4; gate \+= 1\)/);
  assert.match(source, /destination-marker/);
  assert.match(source, /cloud-flight-ring/);
  assert.match(source, /overhead-span/);
  assert.match(source, /rotatingCount/);
});

test("V54 replaces visual hierarchy, not controls, with cinematic mission/boss/clear beats", () => {
  const source = read("../app/SkyDancerHudV54.tsx");
  const phase = read("../app/CartRogueGamePhase13.tsx");
  assert.match(source, /CinematicKind = "mission" \| "boss" \| "clear"/);
  assert.match(source, /skyDancerV54Active \.skyDancerV49Mission/);
  assert.match(source, /BOSS AIRSPACE \/\/ READ THE ATTACK RUN/);
  assert.match(source, /FLOW/);
  assert.match(source, /width:min\(28vw,220px\)/);
  assert.doesNotMatch(source, /<button|onClick=|pointerdown/i);
  assert.match(phase, /SkyDancerHudV49 \/>/);
  assert.match(phase, /SkyDancerHudV54 \/>/);
});

test("V49 campaign bosses keep compact arcade durability and remain inside the missile lock envelope", () => {
  const pacing = read("../src/sky/SkyDancerCampaignPacingV49.ts");
  const boss = read("../src/sky/SkyDancerBossCombatV34.ts");
  const guard = read("../src/sky/SkyDancerBossDurabilityGuardV34.ts");
  assert.match(pacing, /SKY_DANCER_V49_BOSS_BASE_HP = 120/);
  assert.match(pacing, /SKY_DANCER_V49_BOSS_MAX_HP = 180/);
  assert.match(boss, /function liveBossDurability/);
  assert.match(boss, /skyDancerCampaignBossHpV49\(campaignStage\)/);
  assert.match(boss, /const targetMaxHp = liveBossDurability\(session\)/);
  assert.match(boss, /SKY_DANCER_V49_CAMPAIGN_BOSS_LOCK_MAX_DISTANCE = 54/);
  assert.match(boss, /SKY_DANCER_V49_CAMPAIGN_BOSS_LOCK_TARGET_DISTANCE = 46/);
  assert.match(boss, /keepCampaignBossInLockEnvelope/);
  assert.match(guard, /stageCycle\?\.phase === "boss" && getSkyDancerMissionV49\(stageCycle\.stage\)/);
  assert.match(boss, /SKY_DANCER_V34_BOSS_BASE_HP = 192/);
});

test("V50-V53 execute after the proven V45/V47/V48 presentation stack", () => {
  const pipeline = read("../src/sky/presentation/SkyDancerPresentationPipeline.ts");
  assert.match(pipeline, /this\.v45\.update\(snapshot\);[\s\S]*this\.v47\.update\(snapshot\);[\s\S]*this\.v48\.update\(snapshot\);/);
  assert.match(pipeline, /this\.v50\.update\(snapshot\);\n    this\.v51\.update\(snapshot\);\n    this\.v52\.update\(snapshot\);\n    this\.v53\.update\(snapshot\);/);
});
