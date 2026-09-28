import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skyDancerArcadeV4050SafeBreak } from "../src/sky/arcade/SkyDancerArcadeV4050SafeBreak";

test("V40.50 horizontal incoming fire recommends a perpendicular break", () => {
  const decision = skyDancerArcadeV4050SafeBreak({
    playerX: 0,
    playerY: 0,
    sourceX: -1.4,
    sourceY: 0,
  });
  assert.equal(decision.direction, "UP");
  assert.ok(decision.lateralClearance > .99);
});

test("V40.50 safe break respects the nearest vertical phone-flight edge", () => {
  const decision = skyDancerArcadeV4050SafeBreak({
    playerX: 0,
    playerY: 1.35,
    sourceX: -1.4,
    sourceY: 1.35,
  });
  assert.equal(decision.direction, "DOWN");
  assert.ok(decision.edgeClearance > .5);
});

test("V40.50 vertical incoming fire near the right edge breaks back toward centre", () => {
  const decision = skyDancerArcadeV4050SafeBreak({
    playerX: 1.75,
    playerY: 0,
    sourceX: 1.75,
    sourceY: -1.2,
  });
  assert.equal(decision.direction, "LEFT");
  assert.ok(decision.lateralClearance > .99);
});

test("V40.50 coincident-source fallback recovers toward open screen space", () => {
  const decision = skyDancerArcadeV4050SafeBreak({
    playerX: 1.5,
    playerY: 0,
    sourceX: 1.5,
    sourceY: 0,
  });
  assert.equal(decision.direction, "LEFT");
});

test("V40.50 runtime publishes the safe direction through the existing warning message", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(source, /skyDancerArcadeV4050SafeBreak\(\{/);
  assert.match(source, /BOSS LOCK · BREAK \$\{safeBreakV4050\.direction\}/);
  assert.match(source, /INCOMING · BREAK \$\{safeBreakV4050\.direction\}/);
  assert.doesNotMatch(source, /INCOMING · BREAK VECTOR/);
});
