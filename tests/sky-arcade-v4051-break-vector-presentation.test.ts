import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  skyDancerArcadeV4050BreakCandidates,
  skyDancerArcadeV4050SafeBreak,
} from "../src/sky/arcade/SkyDancerArcadeV4050SafeBreak";
import { skyDancerArcadeV4051BreakCue } from "../src/sky/arcade/SkyDancerArcadeV4051BreakCue";

test("V40.51 candidate scoring keeps the V40.50 best-direction contract", () => {
  const input = { playerX: 0, playerY: 0, sourceX: -1.4, sourceY: 0 };
  const candidates = skyDancerArcadeV4050BreakCandidates(input);
  assert.equal(candidates.length, 4);
  assert.equal(candidates[0].direction, skyDancerArcadeV4050SafeBreak(input).direction);
  assert.ok(candidates[0].score >= candidates[1].score);
});

test("V40.51 warning fire is readable before launch and escalates only in the break window", () => {
  const base = {
    playerX: 0,
    playerY: 0,
    enemies: [{ id: 9, x: -1.5, y: 0, boss: false }],
  };
  const early = skyDancerArcadeV4051BreakCue({
    ...base,
    projectiles: [{
      id: 1, owner: "enemy", x: -1.5, y: 0, depth: 28,
      warningSeconds: .8, warningDuration: .8, sourceEnemyId: 9, projectileClass: "bolt",
    }],
  });
  const terminal = skyDancerArcadeV4051BreakCue({
    ...base,
    projectiles: [{
      id: 1, owner: "enemy", x: -1.5, y: 0, depth: 28,
      warningSeconds: .3, warningDuration: .8, sourceEnemyId: 9, projectileClass: "bolt",
    }],
  });
  assert.ok(early);
  assert.equal(early.direction, "UP");
  assert.equal(early.danger, false);
  assert.ok(terminal);
  assert.equal(terminal.direction, "UP");
  assert.equal(terminal.danger, true);
  assert.ok(terminal.urgency > early.urgency);
});

test("V40.51 prior vector bias prevents equal-threat left-right chatter", () => {
  const cue = skyDancerArcadeV4051BreakCue({
    playerX: 0,
    playerY: 0,
    previousDirection: "DOWN",
    enemies: [
      { id: 1, x: -1.5, y: 0, boss: false },
      { id: 2, x: 1.5, y: 0, boss: false },
    ],
    projectiles: [
      { id: 11, owner: "enemy", x: -1.5, y: 0, depth: 20, warningSeconds: .28, warningDuration: .8, sourceEnemyId: 1 },
      { id: 12, owner: "enemy", x: 1.5, y: 0, depth: 20, warningSeconds: .3, warningDuration: .8, sourceEnemyId: 2 },
    ],
  });
  assert.ok(cue);
  assert.equal(cue.threatCount, 2);
  assert.equal(cue.direction, "DOWN");
});

test("V40.51 edge safety overrides hysteresis instead of trapping the player", () => {
  const cue = skyDancerArcadeV4051BreakCue({
    playerX: 0,
    playerY: 1.35,
    previousDirection: "UP",
    enemies: [{ id: 3, x: -1.4, y: 1.35, boss: false }],
    projectiles: [{
      id: 13, owner: "enemy", x: -1.4, y: 1.35, depth: 18,
      warningSeconds: .25, warningDuration: .8, sourceEnemyId: 3,
    }],
  });
  assert.ok(cue);
  assert.equal(cue.direction, "DOWN");
});

test("V40.51 boss threat keeps class identity in the break cue", () => {
  const cue = skyDancerArcadeV4051BreakCue({
    playerX: 0,
    playerY: 0,
    enemies: [{ id: 99, x: 0, y: -1.2, boss: true }],
    projectiles: [{
      id: 14, owner: "enemy", x: 0, y: -1.2, depth: 22,
      warningSeconds: .2, warningDuration: .9, sourceEnemyId: 99, projectileClass: "boss",
    }],
  });
  assert.ok(cue);
  assert.equal(cue.boss, true);
  assert.equal(cue.danger, true);
  assert.equal(cue.arrow, "←");
});

test("V40.51 ignores non-hostile and off-window ordnance", () => {
  const cue = skyDancerArcadeV4051BreakCue({
    playerX: 0,
    playerY: 0,
    enemies: [],
    projectiles: [
      { id: 20, owner: "player-gun", x: 0, y: 0, depth: 5 },
      { id: 21, owner: "enemy", x: 0, y: 0, depth: 44, warningSeconds: 0 },
    ],
  });
  assert.equal(cue, null);
});

test("V40.51 Arcade HUD promotes break direction and includes telegraph shots in missile telemetry", () => {
  const source = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.match(source, /skyDancerArcadeV4051BreakCue/);
  assert.match(source, /if \(\(projectile\.warningSeconds \?\? 0\) > 0\) return true/);
  assert.match(source, /className=\{styles\.breakVector\}/);
  assert.match(source, /data-v4051-break-active=\{breakCue\.value \? "true" : "false"\}/);
  assert.match(source, /messageIsBreakVector/);
  assert.match(css, /\.breakVector\{/);
  assert.match(css, /data-v4051-break-active="true"/);
  assert.match(css, /v4051BreakPulse/);
});
