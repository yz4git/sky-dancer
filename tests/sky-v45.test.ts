import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { CartEnemyState } from "../src/cart/CartCombat";
import {
  SKY_DANCER_V45_TURBO_ATTACK_SPEED,
  getSkyDancerEnemyDecisionV45,
} from "../src/sky/SkyDancerCombatDecisionV45";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

function enemy(overrides: Partial<CartEnemyState>): CartEnemyState {
  return {
    id: overrides.id ?? "v45-enemy",
    nodeId: "arena-01",
    kind: overrides.kind ?? "chaser",
    archetype: overrides.archetype ?? "standard",
    x: 0,
    z: 20,
    radius: overrides.radius ?? 1.7,
    maxHp: overrides.maxHp ?? 100,
    hp: overrides.hp ?? overrides.maxHp ?? 100,
    alive: true,
    heading: 0,
    moveSpeed: overrides.moveSpeed ?? 4,
    weakPointExposed: overrides.weakPointExposed,
  };
}

test("V45 heavy missile decision changes at Turbo attack speed", () => {
  const heavy = enemy({ id: "v45-heavy", kind: "heavy", archetype: "tank", maxHp: 240, hp: 240 });
  const normal = getSkyDancerEnemyDecisionV45(heavy, SKY_DANCER_V45_TURBO_ATTACK_SPEED - 2);
  const turbo = getSkyDancerEnemyDecisionV45(heavy, SKY_DANCER_V45_TURBO_ATTACK_SPEED + 4);
  assert.equal(normal.vulnerable, false);
  assert.equal(normal.missileDamage, 20);
  assert.match(normal.action, /BUILD TURBO/);
  assert.equal(turbo.vulnerable, true);
  assert.equal(turbo.missileDamage, 64);
  assert.match(turbo.action, /TURBO STRIKE/);
});

test("V45 boss closed core and open core are meaningfully different damage windows", () => {
  const boss = enemy({ id: "v45-boss", kind: "boss", archetype: undefined, maxHp: 192, hp: 192, weakPointExposed: false });
  const closed = getSkyDancerEnemyDecisionV45(boss, 18);
  boss.weakPointExposed = true;
  const open = getSkyDancerEnemyDecisionV45(boss, 18);
  assert.equal(closed.vulnerable, false);
  assert.equal(closed.missileDamage, 14);
  assert.match(closed.action, /WAIT CORE/);
  assert.equal(open.vulnerable, true);
  assert.equal(open.missileDamage, 34);
  assert.match(open.action, /CORE OPEN/);
});

test("V45 player weapon lock exposes target class, altitude and action instead of adding controls", () => {
  const source = read("../src/sky/SkyDancerPlayerWeapons.ts");
  assert.match(source, /SkyDancerPlayerLockSnapshotV45/);
  assert.match(source, /getSkyDancerPlayerLockSnapshotV45/);
  assert.match(source, /getSkyDancerEnemyDecisionV45/);
  assert.match(source, /getSkyDancerMissileDamageV45/);
  assert.match(source, /decision\.priority/);
  assert.doesNotMatch(source, /altitudeButton|climbButton|diveButton/i);
});

test("V45 presentation prioritizes target information, smoke ribbon, Turbo contrast and boss attack lane", () => {
  const source = read("../src/sky/presentation/SkyDancerV45DecisionHierarchyPass.ts");
  assert.match(source, /RIBBON_POINTS = 42/);
  assert.match(source, /RIBBON_MAX_AGE = 0\.86/);
  assert.match(source, /normalSpeedStrength: 0\.34/);
  assert.match(source, /snapshot\.boostActive \? 1 : 0\.34/);
  assert.match(source, /sky-dancer-v45-boss-attack-lane/);
  assert.match(source, /bossStrikeCueObserved/);
  assert.match(source, /sky-dancer-v35-reference-focus-city/);
  assert.match(source, /sky-dancer-v40-multi-direction-city/);
  assert.match(source, /SKY_DANCER_COMBAT_DECISION_EVENT_V45/);
});

test("V45 HUD shows numeric altitude, one action line, and separates Boss/HEAT hierarchy", () => {
  const hud = read("../app/SkyDancerHudV45.tsx");
  const phase = read("../app/CartRogueGamePhase13.tsx");
  assert.match(hud, /▲ \+\$\{rounded\}m/);
  assert.match(hud, /▼ -\$\{rounded\}m/);
  assert.match(hud, /V45 target decision/);
  assert.match(hud, /CORE OPEN · FIRE NOW/);
  assert.match(hud, /DIVE RUN · EVADE → COUNTER/);
  assert.match(hud, /heatCard/);
  assert.match(phase, /SkyDancerHudV45/);
});

test("V45 boss altitude director is installed outside V44 cleanup director", () => {
  const facade = read("../src/sky/SkyDancerAirCombatFx.ts");
  const boss = read("../src/sky/SkyDancerBossAttackRunV45.ts");
  const pipeline = read("../src/sky/presentation/SkyDancerPresentationPipeline.ts");
  assert.match(facade, /installSkyDancerAttackRunsV44\(\);\n    installSkyDancerBossAttackRunV45\(\);/);
  assert.match(boss, /state\.mode === "orbit"/);
  assert.match(boss, /state\.mode === "strike"/);
  assert.match(boss, /requestSkyDancerVerticalManeuverV44/);
  assert.match(pipeline, /this\.v44\.update\(snapshot\);\n    this\.v45\.update\(snapshot\);/);
});
