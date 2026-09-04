import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, text) {
  fs.writeFileSync(path, text);
}

function replaceOnce(path, oldText, newText, unique = "") {
  let text = read(path);
  if (unique && text.includes(unique)) return;
  if (!text.includes(oldText)) {
    if (text.includes(newText)) return;
    throw new Error(`replacement marker missing: ${path}`);
  }
  text = text.replace(oldText, newText);
  write(path, text);
}

function insertBefore(path, marker, addition, unique) {
  let text = read(path);
  if (text.includes(unique)) return;
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`insertion marker missing: ${path}`);
  text = text.slice(0, index) + addition + text.slice(index);
  write(path, text);
}

// The first Hunt population is created before SKY RAID's first simulation step.
// Re-seed the live slots without scoring phantom kills so the selected Act package
// owns the opening frame and every subsequent Act handoff.
insertBefore(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  "function ensureTargetPopulation(session: MutableHuntSession, state: TurboHuntState): void {",
  `export function reseedCartTurboHuntActiveTargets(session: CartArenaSession): number {
  const raw = session as unknown as MutableHuntSession;
  const state = stateFor(raw);
  if (!state.enabled || state.phase === "clear" || state.phase === "boss-arrival") return 0;

  for (const enemy of raw.enemies) {
    if (enemy.kind === "boss") continue;
    enemy.alive = false;
    enemy.hp = enemy.maxHp;
    state.previousAlive.set(enemy.id, false);
    state.enemyRespawn.delete(enemy.id);
    state.accountedDeaths.delete(enemy.id);
  }
  state.spentBombers.clear();
  state.spawnSerial = 0;

  const desired = cartTurboHuntActiveTargetCount(state.phase);
  let spawned = 0;
  while (spawned < desired && spawned < 20) {
    if (!spawnSupportEnemy(raw, state, spawned)) break;
    spawned += 1;
  }
  return spawned;
}

`,
  "reseedCartTurboHuntActiveTargets",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  setCartTurboHuntSpawnPreference,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";`,
  `  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  reseedCartTurboHuntActiveTargets,
  setCartTurboHuntSpawnPreference,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";`,
  "reseedCartTurboHuntActiveTargets,",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  actKills: number;
  actBreak: boolean;
  previousKills: number;`,
  `  actKills: number;
  actBreak: boolean;
  enemyRosterActIndex: number;
  previousKills: number;`,
  "enemyRosterActIndex: number",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `    actKills: 0,
    actBreak: false,
    previousKills: hunt.huntKills,`,
  `    actKills: 0,
    actBreak: false,
    enemyRosterActIndex: -1,
    previousKills: hunt.huntKills,`,
  "enemyRosterActIndex: -1",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `    const hunt = getCartTurboHuntSnapshot(typedSession);
    if (!hunt) return;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(hunt.huntElapsedSeconds);
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);
    publishSkyRaidWorldStyle(snapshot);
    publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);
    const state = stateFor(this, hunt);`,
  `    const hunt = getCartTurboHuntSnapshot(typedSession);
    if (!hunt) return;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(hunt.huntElapsedSeconds);
    const state = stateFor(this, hunt);
    const activeAct = skyDancerSkyRaidActFor(hunt.huntElapsedSeconds);
    if (state.enemyRosterActIndex !== activeAct.index && hunt.huntPhase !== "boss-arrival" && hunt.huntPhase !== "clear") {
      reseedCartTurboHuntActiveTargets(typedSession);
      state.enemyRosterActIndex = activeAct.index;
    }
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);
    publishSkyRaidWorldStyle(snapshot);
    publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);`,
  "state.enemyRosterActIndex !== activeAct.index",
);

insertBefore(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID formation and phone recycler both consume the active act doctrine", () => {`,
  `test("SKY RAID re-seeds the inherited live Hunt population at each Act boundary without phantom defeats", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  assert.match(raidSource, /enemyRosterActIndex: -1/);
  assert.match(raidSource, /state\\.enemyRosterActIndex !== activeAct\\.index/);
  assert.match(raidSource, /reseedCartTurboHuntActiveTargets\\(typedSession\\)/);
  assert.match(huntSource, /export function reseedCartTurboHuntActiveTargets/);
  assert.match(huntSource, /state\\.previousAlive\\.set\\(enemy\\.id, false\\)/);
  assert.match(huntSource, /state\\.spawnSerial = 0/);
  assert.match(huntSource, /spawnSupportEnemy\\(raw, state, spawned\\)/);
});

`,
  "re-seeds the inherited live Hunt population at each Act boundary",
);

for (const path of [
  "src/cart/CartRoguePhase67TurboHunt.ts",
  "src/sky/SkyDancerSkyRaid.ts",
  "tests/sky-sky-raid.test.ts",
]) {
  if (read(path).includes("\0")) throw new Error(`NUL byte leaked into ${path}`);
}
