import { readFile, writeFile } from "node:fs/promises";

async function edit(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  await writeFile(path, after);
}

const ownershipPath = "src/cart/CartTurboHuntProductOwnership.ts";
await writeFile(ownershipPath, `/**\n * Product-level progression ownership for Sky Dancer modes that reuse Turbo Hunt combat.\n * Legacy cart milestone/domino directors may still exist for regression coverage, but they\n * must not mutate progression while the Sky Dancer stage/act directors are authoritative.\n */\nexport function cartTurboHuntProductProgressionOwned(mode: string | null | undefined): boolean {\n  return mode === "turbo-hunt" || mode === "sky-raid";\n}\n\nexport function cartTurboHuntCurrentProductMode(): string | null {\n  if (typeof document === "undefined") return null;\n  return document.documentElement.dataset.skyDancerMode ?? null;\n}\n`);

await edit("src/cart/CartRoguePhase74TurboHuntPerkMilestones.ts", (source) => {
  source = source.replace(
    'import { getCartTurboHuntSnapshot, isCartTurboHuntEnabled } from "./CartRoguePhase67TurboHunt";\n',
    'import { getCartTurboHuntSnapshot, isCartTurboHuntEnabled } from "./CartRoguePhase67TurboHunt";\nimport { cartTurboHuntCurrentProductMode, cartTurboHuntProductProgressionOwned } from "./CartTurboHuntProductOwnership";\n',
  );
  source = source.replace(
    '    if (!isCartTurboHuntEnabled(session)) return base;\n\n    const hunt = getCartTurboHuntSnapshot(session);',
    '    if (!isCartTurboHuntEnabled(session)) return base;\n    if (cartTurboHuntProductProgressionOwned(cartTurboHuntCurrentProductMode())) return base;\n\n    const hunt = getCartTurboHuntSnapshot(session);',
  );
  return source;
});

await edit("src/cart/CartRoguePhase110TurboDominoCoreLoop.ts", (source) => {
  source = source.replace(
    'import { restoreCartPrePhase108CoreLoopSessionMethods } from "./CartRoguePhase108CoreLoopBridge";\n',
    'import { restoreCartPrePhase108CoreLoopSessionMethods } from "./CartRoguePhase108CoreLoopBridge";\nimport { cartTurboHuntCurrentProductMode, cartTurboHuntProductProgressionOwned } from "./CartTurboHuntProductOwnership";\n',
  );
  const guard = '    if (!isCartTurboHuntEnabled(typed)) return;\n';
  const guarded = `${guard}    if (cartTurboHuntProductProgressionOwned(cartTurboHuntCurrentProductMode())) return;\n`;
  if (!source.includes(guard)) throw new Error("Phase110 step guard not found");
  source = source.replace(guard, guarded);
  const snapshotGuard = '    if (!isCartTurboHuntEnabled(typed)) return base;\n';
  const snapshotGuarded = `${snapshotGuard}    if (cartTurboHuntProductProgressionOwned(cartTurboHuntCurrentProductMode())) return base;\n`;
  if (!source.includes(snapshotGuard)) throw new Error("Phase110 snapshot guard not found");
  source = source.replace(snapshotGuard, snapshotGuarded);
  return source;
});

await edit("src/sky/SkyDancerStageCycle.ts", (source) => source.replace(
`export function skyDancerStageSpawnSlot(serial: number): { angleOffset: number; distance: number } {\n  const slot = ((Math.floor(serial) % 12) + 12) % 12;\n  const side = slot % 2 === 0 ? -1 : 1;\n  const rank = Math.floor(slot / 2);\n  return {\n    angleOffset: side * (0.34 + rank * 0.22),\n    distance: 28 + (slot % 3) * 7 + Math.floor(slot / 6) * 4,\n  };\n}\n`,
`export function skyDancerStageSpawnSlot(serial: number): { angleOffset: number; distance: number } {\n  const slot = ((Math.floor(serial) % 12) + 12) % 12;\n  // Six readable forward lanes across two depth rings. All lanes remain inside\n  // the normal missile acquisition cone, while the two rings keep simultaneous\n  // aircraft visually separated instead of stacking into one blob.\n  const lane = slot % 6;\n  const ring = Math.floor(slot / 6);\n  const angleOffsets = [-0.65, -0.39, -0.13, 0.13, 0.39, 0.65] as const;\n  return {\n    angleOffset: angleOffsets[lane],\n    distance: ring === 0 ? 34 : 46,\n  };\n}\n`,
));

await edit("tests/sky-flight-runtime.test.ts", (source) => source.replace(
`test("stage reinforcement spawn fan keeps simultaneous aircraft from sharing a slot", () => {\n  const points = Array.from({ length: 10 }, (_, serial) => {\n    const slot = skyDancerStageSpawnSlot(serial);\n    return { x: Math.sin(slot.angleOffset) * slot.distance, z: Math.cos(slot.angleOffset) * slot.distance };\n  });\n  let minimum = Number.POSITIVE_INFINITY;\n  for (let left = 0; left < points.length; left += 1) {\n    for (let right = left + 1; right < points.length; right += 1) {\n      minimum = Math.min(minimum, Math.hypot(points[left].x - points[right].x, points[left].z - points[right].z));\n    }\n  }\n  assert.ok(minimum > 7.5, \`spawn fan minimum spacing was \${minimum.toFixed(2)}m\`);\n});\n`,
`test("stage reinforcement lanes stay separated while remaining in the forward combat cone", () => {\n  const slots = Array.from({ length: 12 }, (_, serial) => skyDancerStageSpawnSlot(serial));\n  const points = slots.map((slot) => ({\n    x: Math.sin(slot.angleOffset) * slot.distance,\n    z: Math.cos(slot.angleOffset) * slot.distance,\n  }));\n  let minimum = Number.POSITIVE_INFINITY;\n  for (let left = 0; left < points.length; left += 1) {\n    for (let right = left + 1; right < points.length; right += 1) {\n      minimum = Math.min(minimum, Math.hypot(points[left].x - points[right].x, points[left].z - points[right].z));\n    }\n  }\n  assert.ok(minimum > 8, \`spawn lane minimum spacing was \${minimum.toFixed(2)}m\`);\n  assert.ok(Math.max(...slots.map((slot) => Math.abs(slot.angleOffset))) <= 0.65);\n  assert.ok(slots.filter((slot) => Math.abs(slot.angleOffset) <= 0.4).length >= 8);\n});\n`,
));

await edit("tests/sky-rules.test.ts", (source) => {
  source = source.replace(
    'import { CartArenaSession } from "../src/cart/CartArenaSession";\n',
    'import { CartArenaSession } from "../src/cart/CartArenaSession";\nimport { cartTurboHuntProductProgressionOwned } from "../src/cart/CartTurboHuntProductOwnership";\n',
  );
  source += `\ntest("Sky Dancer product modes reserve Turbo Hunt progression from legacy cart directors", () => {\n  assert.equal(cartTurboHuntProductProgressionOwned("turbo-hunt"), true);\n  assert.equal(cartTurboHuntProductProgressionOwned("sky-raid"), true);\n  assert.equal(cartTurboHuntProductProgressionOwned("title"), false);\n  assert.equal(cartTurboHuntProductProgressionOwned(undefined), false);\n});\n`;
  return source;
});

console.log("Applied live playcheck fixes: authoritative progression ownership + forward separated spawn lanes");
