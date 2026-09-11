import test from "node:test";
import assert from "node:assert/strict";
import { skyDancerArcadeV29EnemyColorIdentity } from "../src/sky/arcade/SkyDancerArcadeV29EnemyColorIdentity";

const kinds = [
  "fighter",
  "interceptor",
  "missile-boat",
  "bomber",
  "ace",
  "drone",
  "striker",
  "gunship",
  "raider",
] as const;

const rgb = (hex: number) => [hex >> 16 & 0xff, hex >> 8 & 0xff, hex & 0xff] as const;
const distance = (a: number, b: number) => {
  const aa = rgb(a);
  const bb = rgb(b);
  return Math.hypot(aa[0] - bb[0], aa[1] - bb[1], aa[2] - bb[2]);
};

test("V29 gives every standard enemy kind a unique semantic body color", () => {
  const colors = kinds.map((kind) => skyDancerArcadeV29EnemyColorIdentity(kind).body);
  assert.equal(new Set(colors).size, kinds.length);
});

test("V29 role colors remain visibly separated before stage tinting", () => {
  for (let i = 0; i < kinds.length; i += 1) {
    for (let j = i + 1; j < kinds.length; j += 1) {
      const a = skyDancerArcadeV29EnemyColorIdentity(kinds[i]).body;
      const b = skyDancerArcadeV29EnemyColorIdentity(kinds[j]).body;
      assert.ok(distance(a, b) >= 42, `${kinds[i]} and ${kinds[j]} are too close in RGB space`);
    }
  }
});

test("V29 keeps ace near-neutral while drone and gunship occupy green/violet families", () => {
  const ace = rgb(skyDancerArcadeV29EnemyColorIdentity("ace").body);
  assert.ok(Math.max(...ace) - Math.min(...ace) < 20);
  const drone = rgb(skyDancerArcadeV29EnemyColorIdentity("drone").body);
  assert.ok(drone[1] > drone[0] && drone[1] > drone[2]);
  const gunship = rgb(skyDancerArcadeV29EnemyColorIdentity("gunship").body);
  assert.ok(gunship[2] > gunship[0] && gunship[0] > gunship[1]);
});

test("V29 engine glow is identity-colored for every kind", () => {
  for (const kind of kinds) {
    const identity = skyDancerArcadeV29EnemyColorIdentity(kind);
    assert.notEqual(identity.glow, 0xff6545);
  }
});
