import { readFile, writeFile } from "node:fs/promises";

async function edit(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  await writeFile(path, after);
}

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing expected block: ${label}`);
  return source.replace(from, to);
}

await edit("src/cart/CartRoguePhase67TurboHunt.ts", (source) => mustReplace(
  source,
  `export function reportCartTurboHuntEnemyDefeat(session: CartArenaSession, enemyId: string): boolean {\n  const raw = session as unknown as MutableHuntSession;\n  const state = stateFor(raw);\n  if (!state.enabled) return false;\n  const enemy = raw.enemies.find((candidate) => candidate.id === enemyId);\n  if (!enemy || enemy.alive) return false;\n  return collectEnemyDefeat(raw, state, enemy);\n}\n`,
  `export function reportCartTurboHuntEnemyDefeat(session: CartArenaSession, enemyId: string): boolean {\n  const raw = session as unknown as MutableHuntSession;\n  const state = stateFor(raw);\n  if (!state.enabled) return false;\n  const enemy = raw.enemies.find((candidate) => candidate.id === enemyId);\n  if (!enemy || enemy.alive) return false;\n  return collectEnemyDefeat(raw, state, enemy);\n}\n\n/**\n * StageCycle may recycle an authored aircraft id by replacing its object rather\n * than asking the legacy Hunt pool to respawn it. Re-arm the Hunt defeat ledger\n * so the next real destruction of that id is counted exactly once.\n */\nexport function prepareCartTurboHuntExternalEnemyRespawn(session: CartArenaSession, enemyId: string): void {\n  const raw = session as unknown as MutableHuntSession;\n  const state = stateFor(raw);\n  if (!state.enabled) return;\n  state.accountedDeaths.delete(enemyId);\n  state.enemyRespawn.delete(enemyId);\n  state.spentBombers.delete(enemyId);\n  state.previousAlive.set(enemyId, true);\n}\n`,
  "Turbo Hunt external respawn helper",
));

await edit("src/sky/SkyDancerStageCycle.ts", (source) => {
  source = mustReplace(
    source,
    `  getCartTurboHuntSnapshot,\n  isCartTurboHuntEnabled,\n  setCartTurboHuntExternalProgressionEnabled,`,
    `  getCartTurboHuntSnapshot,\n  isCartTurboHuntEnabled,\n  prepareCartTurboHuntExternalEnemyRespawn,\n  setCartTurboHuntExternalProgressionEnabled,`,
    "StageCycle Hunt imports",
  );
  source = mustReplace(
    source,
    `  bossTemplate: CartEnemyState | null;\n  lastAliveNonBoss: Set<string>;\n}`,
    `  bossTemplate: CartEnemyState | null;\n  lastAliveNonBoss: Set<string>;\n  lastHuntKills: number;\n}`,
    "StageCycle state interface",
  );
  source = mustReplace(
    source,
    `    bossTemplate: null,\n    lastAliveNonBoss: new Set<string>(),\n  };`,
    `    bossTemplate: null,\n    lastAliveNonBoss: new Set<string>(),\n    lastHuntKills: 0,\n  };`,
    "StageCycle state initialization",
  );
  source = mustReplace(
    source,
    `  return {\n    ...template,\n    x: session.car.position.x + Math.sin(angle) * distance,\n    z: session.car.position.z + Math.cos(angle) * distance,\n    heading: angle + Math.PI,\n    maxHp,\n    hp: maxHp,\n    alive: true,\n    aiClock: 0,\n    chargeCooldown: template.archetype === "striker"\n      ? 0.78 + (serial % 4) * 0.13\n      : template.chargeCooldown,\n    chargeTime: template.archetype === "striker" ? 0 : template.chargeTime,\n    armorSegments: template.kind === "heavy" ? template.armorSegments : undefined,\n    maxArmorSegments: template.kind === "heavy" ? template.maxArmorSegments : undefined,\n    weakPointExposed: template.kind === "heavy" ? template.weakPointExposed : undefined,\n  };`,
    `  const spawned: CartEnemyState = {\n    ...template,\n    x: session.car.position.x + Math.sin(angle) * distance,\n    z: session.car.position.z + Math.cos(angle) * distance,\n    heading: angle + Math.PI,\n    maxHp,\n    hp: maxHp,\n    alive: true,\n    aiClock: 0,\n    chargeCooldown: template.archetype === "striker"\n      ? 0.78 + (serial % 4) * 0.13\n      : template.chargeCooldown,\n    chargeTime: template.archetype === "striker" ? 0 : template.chargeTime,\n    armorSegments: template.kind === "heavy" ? template.armorSegments : undefined,\n    maxArmorSegments: template.kind === "heavy" ? template.maxArmorSegments : undefined,\n    weakPointExposed: template.kind === "heavy" ? template.weakPointExposed : undefined,\n  };\n  prepareCartTurboHuntExternalEnemyRespawn(session as unknown as CartArenaSession, spawned.id);\n  return spawned;`,
    "StageCycle spawned aircraft ledger reset",
  );
  source = mustReplace(
    source,
    `  state.lastAliveNonBoss = new Set(liveNonBoss(session).map((enemy) => enemy.id));\n  state.bossWasAlive = Boolean(bossEnemy(session)?.alive);\n  setReward(session, \`STAGE \${state.stage} · ENGAGE\`, 1.8);`,
    `  state.lastAliveNonBoss = new Set(liveNonBoss(session).map((enemy) => enemy.id));\n  state.lastHuntKills = getCartTurboHuntSnapshot(session as unknown as CartArenaSession)?.huntKills ?? 0;\n  state.bossWasAlive = Boolean(bossEnemy(session)?.alive);\n  setReward(session, \`STAGE \${state.stage} · ENGAGE\`, 1.8);`,
    "StageCycle initial Hunt kill baseline",
  );
  source = mustReplace(
    source,
    `    const aliveAfterOriginal = new Set(liveNonBoss(this).map((enemy) => enemy.id));\n    let newKills = 0;\n    for (const id of state.lastAliveNonBoss) {\n      if (!aliveAfterOriginal.has(id)) newKills += 1;\n    }\n    if (newKills > 0 && !state.bossActive && state.clearTimer <= 0) {\n      state.stageKills += newKills;\n    }`,
    `    const huntAfterStep = getCartTurboHuntSnapshot(concrete);\n    const observedHuntKills = huntAfterStep?.huntKills ?? state.lastHuntKills;\n    const newKills = Math.max(0, observedHuntKills - state.lastHuntKills);\n    state.lastHuntKills = observedHuntKills;\n    if (newKills > 0 && !state.bossActive && state.clearTimer <= 0) {\n      state.stageKills += newKills;\n    }`,
    "StageCycle real Hunt kill delta",
  );
  source = mustReplace(
    source,
    `  window.dispatchEvent(new CustomEvent<SkyDancerStageCycleSnapshot>(SKY_DANCER_STAGE_CYCLE_EVENT, { detail: stage }));\n  if (!base) return;`,
    `  window.dispatchEvent(new CustomEvent<SkyDancerStageCycleSnapshot>(SKY_DANCER_STAGE_CYCLE_EVENT, { detail: stage }));\n  if (navigator.webdriver) {\n    (window as unknown as Record<string, unknown>).__skyDancerGetStageCycle = () => ({ ...latestStageSnapshot });\n  }\n  if (!base) return;`,
    "StageCycle webdriver getter",
  );
  return source;
});

await edit("src/sky/SkyDancerCombatChoreographyV46.ts", (source) => {
  source = mustReplace(
    source,
    `function skyDancerCampaignOwnsEnemyShapeV23(): boolean {\n  return typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid";\n}`,
    `export function skyDancerCampaignOwnsEnemyShapeForMode(mode: string | undefined): boolean {\n  return mode === "arcade-run" || mode === "stage-practice";\n}\n\nfunction skyDancerCampaignOwnsEnemyShapeV23(): boolean {\n  const mode = typeof document === "undefined" ? undefined : document.documentElement.dataset.skyDancerMode;\n  return skyDancerCampaignOwnsEnemyShapeForMode(mode);\n}`,
    "Campaign mode ownership helper",
  );
  source = mustReplace(
    source,
    `    // Campaign choreography owns enemy archetype conversion in campaign mode.\n    // SKY RAID has its own V23 Act doctrine and must remain the final roster owner.`,
    `    // Campaign choreography may shape only the dedicated campaign modes.\n    // Turbo Hunt StageCycle and SKY RAID Acts are authoritative for their own\n    // enemy population; legacy campaign retirement must never kill those waves.`,
    "Campaign ownership comment",
  );
  return source;
});

await edit("tests/sky-flight-runtime.test.ts", (source) => {
  source = mustReplace(
    source,
    `import { enableCartTurboHunt } from "../src/cart/CartRoguePhase67TurboHunt";`,
    `import {\n  enableCartTurboHunt,\n  getCartTurboHuntSnapshot,\n  prepareCartTurboHuntExternalEnemyRespawn,\n  reportCartTurboHuntEnemyDefeat,\n} from "../src/cart/CartRoguePhase67TurboHunt";`,
    "flight runtime Hunt imports",
  );
  const anchor = `test("stage reinforcement targets scale gradually and cap", () => {`;
  if (!source.includes(anchor)) throw new Error("Missing flight runtime insertion anchor");
  const testBlock = `test("externally recycled Hunt aircraft score each real defeat exactly once", () => {\n  const session = new CartArenaSession();\n  enableCartTurboHunt(session);\n  const target = session.enemies.find((candidate) => candidate.alive && candidate.kind !== "boss");\n  assert.ok(target);\n\n  target.alive = false;\n  assert.equal(reportCartTurboHuntEnemyDefeat(session, target.id), true);\n  const firstKills = getCartTurboHuntSnapshot(session)?.huntKills ?? -1;\n  assert.equal(firstKills, 1);\n  assert.equal(reportCartTurboHuntEnemyDefeat(session, target.id), false);\n\n  target.hp = target.maxHp;\n  target.alive = true;\n  prepareCartTurboHuntExternalEnemyRespawn(session, target.id);\n  target.alive = false;\n  assert.equal(reportCartTurboHuntEnemyDefeat(session, target.id), true);\n  assert.equal(getCartTurboHuntSnapshot(session)?.huntKills, firstKills + 1);\n});\n\n`;
  return source.replace(anchor, testBlock + anchor);
});

await edit("tests/sky-campaign.test.ts", (source) => {
  source = mustReplace(
    source,
    `import { skyDancerCampaignBossHpV49 } from "../src/sky/SkyDancerCampaignPacingV49";`,
    `import { skyDancerCampaignBossHpV49 } from "../src/sky/SkyDancerCampaignPacingV49";\nimport { skyDancerCampaignOwnsEnemyShapeForMode } from "../src/sky/SkyDancerCombatChoreographyV46";`,
    "campaign ownership test import",
  );
  const anchor = `test("campaign keeps six distinct compact arcade sorties", () => {`;
  if (!source.includes(anchor)) throw new Error("Missing campaign test insertion anchor");
  const block = `test("campaign enemy shaping never owns Turbo Hunt or SKY RAID waves", () => {\n  assert.equal(skyDancerCampaignOwnsEnemyShapeForMode("arcade-run"), true);\n  assert.equal(skyDancerCampaignOwnsEnemyShapeForMode("stage-practice"), true);\n  assert.equal(skyDancerCampaignOwnsEnemyShapeForMode("turbo-hunt"), false);\n  assert.equal(skyDancerCampaignOwnsEnemyShapeForMode("sky-raid"), false);\n  assert.equal(skyDancerCampaignOwnsEnemyShapeForMode(undefined), false);\n});\n\n`;
  return source.replace(anchor, block + anchor);
});

await edit(".github/live-playcheck-stage.mjs", (source) => {
  source = mustReplace(
    source,
    `await writeFile(\`${'${outputDir}'}/diagnostics.json\`, JSON.stringify(diagnostics, null, 2));\nawait browser.close();\nif (pageErrors.length) throw new Error(\`page errors: \${pageErrors.join(" | ")}\`);`,
    `const stageSamples = samples.filter((sample) => sample.stage && Number.isFinite(sample.stage.stageKills));\nlet largestKillJump = 0;\nfor (let index = 1; index < stageSamples.length; index += 1) {\n  const previous = stageSamples[index - 1];\n  const current = stageSamples[index];\n  if (current.stage.stage === previous.stage.stage) {\n    largestKillJump = Math.max(largestKillJump, current.stage.stageKills - previous.stage.stageKills);\n  }\n}\ndiagnostics.largestKillJump = largestKillJump;\nawait writeFile(\`${'${outputDir}'}/diagnostics.json\`, JSON.stringify(diagnostics, null, 2));\nawait browser.close();\nif (pageErrors.length) throw new Error(\`page errors: \${pageErrors.join(" | ")}\`);\nif (/CHOOSE YOUR BUILD/i.test(finalText)) throw new Error("legacy perk overlay returned during Turbo Hunt");\nif (largestKillJump > 10) throw new Error(\`implausible StageCycle kill jump: \${largestKillJump}\`);\nconst preFloor = stageSamples.filter((sample) => sample.elapsed < 82);\nif (preFloor.some((sample) => sample.stage.stage !== 1 || sample.stage.phase !== "reinforcements")) {\n  throw new Error("Stage 1 advanced before the 84-second combat floor");\n}`,
    "live playcheck assertions",
  );
  return source;
});

console.log("Applied StageCycle real-defeat accounting and campaign ownership fix.");
