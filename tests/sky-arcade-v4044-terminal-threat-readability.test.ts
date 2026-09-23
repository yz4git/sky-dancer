import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  skyDancerArcadeV4044IsTerminalThreat,
  skyDancerArcadeV409PhoneClarity,
} from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";

test("V40.44 terminal threat detection covers BREAK NOW and close live ordnance only", () => {
  assert.equal(skyDancerArcadeV4044IsTerminalThreat({ owner: "enemy", depth: 24, warningSeconds: .3, warningDuration: .8 }), true);
  assert.equal(skyDancerArcadeV4044IsTerminalThreat({ owner: "enemy", depth: 24, warningSeconds: .65, warningDuration: .8 }), false);
  assert.equal(skyDancerArcadeV4044IsTerminalThreat({ owner: "enemy", depth: 8, warningSeconds: 0, warningDuration: .8 }), true);
  assert.equal(skyDancerArcadeV4044IsTerminalThreat({ owner: "enemy", depth: 18, warningSeconds: 0, warningDuration: .8 }), false);
  assert.equal(skyDancerArcadeV4044IsTerminalThreat({ owner: "player-gun", depth: 8, warningSeconds: 0 }), false);
});

test("V40.44 one terminal threat reserves compact landscape cue budget", () => {
  const baseline = skyDancerArcadeV409PhoneClarity({
    compactLandscape: true,
    sceneMode: "standard",
    incomingThreats: 1,
    terminalThreats: 0,
  });
  const urgent = skyDancerArcadeV409PhoneClarity({
    compactLandscape: true,
    sceneMode: "standard",
    incomingThreats: 1,
    terminalThreats: 1,
  });
  assert.equal(urgent.aimCues, 0);
  assert.equal(urgent.counterplayCues, 0);
  assert.ok(urgent.primaryLocks <= 2);
  assert.ok(urgent.canvasLockLimit <= 2);
  assert.ok(urgent.cueOpacity < baseline.cueOpacity);
});

test("V40.44 WebGL threat vector is player-local, camera-facing and class-colored", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /arcade-hostile-threat-vector-v4044/);
  assert.match(source, /arcade-hostile-threat-arc-v4044/);
  assert.match(source, /arcade-hostile-threat-tick-v4044/);
  assert.match(source, /this\.hostileThreatVectorFx\.quaternion\.copy\(this\.camera\.quaternion\)/);
  assert.match(source, /hostileLaunchColorV4042\(projectileClass\)/);
  assert.match(source, /terminalThreats: v4044TerminalThreats/);
});

test("V40.44 Canvas fallback mirrors the incoming-side arc without safe-direction text", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /drawTerminalThreatVectorV4044/);
  assert.match(source, /context\.arc\(0, 0, radius \* pulse, angle - span \* \.5, angle \+ span \* \.5\)/);
  assert.match(source, /terminalThreats: v4044TerminalThreats/);
  assert.doesNotMatch(source, /SAFE DIRECTION|DODGE LEFT|DODGE RIGHT/);
});
