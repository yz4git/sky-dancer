import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("V55 pacing never writes normal WAVE aircraft outside the V41 motion guard", () => {
  const source = read("../src/sky/SkyDancerArcadePacingV55.ts");
  const cleanupBlock = source.indexOf("if (cleanup) {");
  const firstLaneWrite = source.indexOf("moveTowardLane(this");

  assert.ok(cleanupBlock >= 0);
  assert.ok(firstLaneWrite > cleanupBlock);
  assert.match(source, /const cleanup = stageCycle\.phase === "cleanup"/);
  assert.doesNotMatch(source, /stageCycle\.phase === "reinforcements"/);
  assert.doesNotMatch(source, /capThreatDurability/);
});

test("V55 keeps the cleanup finisher readable and bounded in front of the player", () => {
  const source = read("../src/sky/SkyDancerArcadePacingV55.ts");
  assert.match(source, /SKY_DANCER_V55_CLEANUP_FINISHER_START = 12/);
  assert.match(source, /SKY_DANCER_V55_CLEANUP_LAST_TARGET_START = 18/);
  assert.match(source, /attackLane\(this, index, 30 \+ index \* 4, 4\.2\)/);
  assert.match(source, /attackLane\(this, 0, 27, 0\)/);
  assert.match(source, /capCleanupDurability/);
});
