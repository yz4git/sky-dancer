import fs from "node:fs";

function patch(path, transforms) {
  let source = fs.readFileSync(path, "utf8");
  for (const transform of transforms) {
    const { from, to, label } = transform;
    if (source.includes(to)) continue;
    if (!source.includes(from)) throw new Error(`${path}: missing patch anchor: ${label}`);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

patch("src/cart/CartRoguePhase67TurboHunt.ts", [
  {
    label: "defer respawn until kill transition is observed",
    from: `function isSpawnEligible(enemy: CartEnemyState, state: TurboHuntState): boolean {\n  if (enemy.alive || enemy.kind === "boss") return false;\n  if ((state.enemyRespawn.get(enemy.id) ?? 0) > 0) return false;`,
    to: `function isSpawnEligible(enemy: CartEnemyState, state: TurboHuntState): boolean {\n  if (enemy.alive || enemy.kind === "boss") return false;\n  // A missile can destroy an aircraft just before the Hunt wrapper begins its\n  // frame. Do not recycle that slot until handleEnemyTransitions has observed\n  // the alive -> dead edge and installed the normal respawn cooldown.\n  if (state.previousAlive.get(enemy.id) === true) return false;\n  if ((state.enemyRespawn.get(enemy.id) ?? 0) > 0) return false;`,
  },
  {
    label: "track accounted enemy deaths",
    from: `  previousAlive: Map<string, boolean>;\n  enemyRespawn: Map<string, number>;\n  spentBombers: Set<string>;`,
    to: `  previousAlive: Map<string, boolean>;\n  enemyRespawn: Map<string, number>;\n  accountedDeaths: Set<string>;\n  spentBombers: Set<string>;`,
  },
  {
    label: "initialize accounted enemy deaths",
    from: `    previousAlive: new Map<string, boolean>(),\n    enemyRespawn: new Map<string, number>(),\n    spentBombers: new Set<string>(),`,
    to: `    previousAlive: new Map<string, boolean>(),\n    enemyRespawn: new Map<string, number>(),\n    accountedDeaths: new Set<string>(),\n    spentBombers: new Set<string>(),`,
  },
  {
    label: "clear death accounting when support aircraft respawns",
    from: `  resetEnemyForSpawn(enemy, point.x, point.z, point.heading);\n  state.previousAlive.set(enemy.id, true);\n  state.spawnSerial += 1;`,
    to: `  resetEnemyForSpawn(enemy, point.x, point.z, point.heading);\n  state.accountedDeaths.delete(enemy.id);\n  state.previousAlive.set(enemy.id, true);\n  state.spawnSerial += 1;`,
  },
  {
    label: "clear death accounting when boss spawns",
    from: `  );\n  state.previousAlive.set(boss.id, true);\n  addHeat(state, 8);\n  setReward(session, "RAM TITAN INBOUND · KEEP THE FLOW ALIVE", 3.2);`,
    to: `  );\n  state.accountedDeaths.delete(boss.id);\n  state.previousAlive.set(boss.id, true);\n  addHeat(state, 8);\n  setReward(session, "RAM TITAN INBOUND · KEEP THE FLOW ALIVE", 3.2);`,
  },
  {
    label: "centralize exactly-once defeat accounting",
    from: `function handleEnemyTransitions(session: MutableHuntSession, state: TurboHuntState): void {\n  for (const enemy of session.enemies) {\n    const wasAlive = state.previousAlive.get(enemy.id) ?? false;\n    if (wasAlive && !enemy.alive) {\n      if (enemy.kind === "boss") {\n        addHeat(state, 20);\n        setReward(session, "RAM TITAN DOWN · HUNT CLEAR", 4);\n      } else {\n        state.kills += 1;\n        addHeat(state, enemy.kind === "heavy" ? 13 : enemy.archetype === "bomber" ? 10 : 7);\n        state.enemyRespawn.set(enemy.id, enemy.kind === "heavy" ? 4.4 : 2.35 + random01(state) * 1.3);\n        if (enemy.archetype === "bomber") state.spentBombers.add(enemy.id);\n        if (state.objective.kind === "HUNT") state.objective.progress += 1;\n        if (state.objective.kind === "ELITE" && enemy.kind === "heavy") state.objective.progress += 1;\n      }\n    }\n    state.previousAlive.set(enemy.id, enemy.alive);\n  }\n}`,
    to: `function collectEnemyDefeat(session: MutableHuntSession, state: TurboHuntState, enemy: CartEnemyState): boolean {\n  if (enemy.alive || state.accountedDeaths.has(enemy.id)) return false;\n  state.accountedDeaths.add(enemy.id);\n  state.previousAlive.set(enemy.id, false);\n  if (enemy.kind === "boss") {\n    addHeat(state, 20);\n    setReward(session, "RAM TITAN DOWN · HUNT CLEAR", 4);\n    return true;\n  }\n  state.kills += 1;\n  addHeat(state, enemy.kind === "heavy" ? 13 : enemy.archetype === "bomber" ? 10 : 7);\n  state.enemyRespawn.set(enemy.id, enemy.kind === "heavy" ? 4.4 : 2.35 + random01(state) * 1.3);\n  if (enemy.archetype === "bomber") state.spentBombers.add(enemy.id);\n  if (state.objective.kind === "HUNT") state.objective.progress += 1;\n  if (state.objective.kind === "ELITE" && enemy.kind === "heavy") state.objective.progress += 1;\n  return true;\n}\n\n/**\n * Records an externally-produced enemy defeat immediately. Player missiles can\n * advance between Hunt fixed steps, so relying only on sampled alive edges can\n * miss an aircraft that becomes active and dies inside one observation window.\n * The shared accountedDeaths guard makes this safe alongside normal transition\n * detection and permits the same pooled enemy id to score again after respawn.\n */\nexport function reportCartTurboHuntEnemyDefeat(session: CartArenaSession, enemyId: string): boolean {\n  const raw = session as unknown as MutableHuntSession;\n  const state = stateFor(raw);\n  if (!state.enabled) return false;\n  const enemy = raw.enemies.find((candidate) => candidate.id === enemyId);\n  if (!enemy || enemy.alive) return false;\n  return collectEnemyDefeat(raw, state, enemy);\n}\n\nfunction handleEnemyTransitions(session: MutableHuntSession, state: TurboHuntState): void {\n  for (const enemy of session.enemies) {\n    const wasAlive = state.previousAlive.get(enemy.id) ?? false;\n    if (wasAlive && !enemy.alive) collectEnemyDefeat(session, state, enemy);\n    state.previousAlive.set(enemy.id, enemy.alive);\n  }\n}`,
  },
]);

patch("src/sky/SkyDancerPlayerWeapons.ts", [
  {
    label: "import Hunt defeat reporter",
    from: `import { CartArenaSession } from "../cart/CartArenaSession";\nimport {\n  CART_TURBO_HUNT_WORLD_DEPTH,`,
    to: `import { CartArenaSession } from "../cart/CartArenaSession";\nimport { reportCartTurboHuntEnemyDefeat } from "../cart/CartRoguePhase67TurboHunt";\nimport {\n  CART_TURBO_HUNT_WORLD_DEPTH,`,
  },
  {
    label: "report destroyed missile targets immediately",
    from: `    hit.alive = !destroyed;\n    if (destroyed) session.car.ramCount += 1;\n    session.car.collisionImpact = Math.max(session.car.collisionImpact, destroyed ? 1 : 0.72);`,
    to: `    hit.alive = !destroyed;\n    if (destroyed) {\n      session.car.ramCount += 1;\n      reportCartTurboHuntEnemyDefeat(session as unknown as CartArenaSession, hit.id);\n    }\n    session.car.collisionImpact = Math.max(session.car.collisionImpact, destroyed ? 1 : 0.72);`,
  },
]);

patch("app/SkyDancerHudV45.tsx", [
  {
    label: "derive target card position from reticle",
    from: `  const reticleY = -altitudeRatio * 24;\n\n  return <>`,
    to: `  const reticleY = -altitudeRatio * 24;\n  // Keep doctrine close to the tracked aircraft instead of laying it across\n  // the player's fuselage. The clamp protects the top HUD and thumb controls.\n  const lockX = clamp(reticleX, -18, 18);\n  const lockTopVh = clamp(43 + reticleY - 9, 29, 55);\n\n  return <>`,
  },
  {
    label: "enlarge combat reticle",
    from: `        width: 48px;\n        height: 48px;`,
    to: `        width: 58px;\n        height: 58px;`,
  },
  {
    label: "make target doctrine compact and readable",
    from: `        left: 50%;\n        top: calc(42% + 48px);\n        transform: translateX(-50%);\n        display: grid;\n        justify-items: center;\n        gap: 2px;\n        min-width: 152px;\n        max-width: min(54vw, 430px);\n        padding: 3px 9px 4px;`,
    to: `        left: 50%;\n        top: 42%;\n        transform: translateX(-50%);\n        display: grid;\n        justify-items: center;\n        gap: 2px;\n        min-width: 142px;\n        max-width: min(46vw, 360px);\n        padding: 4px 10px 5px;`,
  },
  {
    label: "strengthen target card separation",
    from: `        border-bottom: 1px solid rgba(180,235,247,.20);\n        font: 850 clamp(8px,.92vw,10px)/1.05 system-ui,sans-serif;`,
    to: `        border-top: 1px solid rgba(180,235,247,.12);\n        border-bottom: 1px solid rgba(180,235,247,.28);\n        box-shadow: 0 4px 18px rgba(0,18,32,.18);\n        font: 900 clamp(8px,.94vw,10px)/1.05 system-ui,sans-serif;`,
  },
  {
    label: "emphasize fire doctrine",
    from: `        font-size: .92em;\n        letter-spacing: .075em;`,
    to: `        font-size: .98em;\n        font-weight: 950;\n        letter-spacing: .085em;`,
  },
  {
    label: "position doctrine beside tracked target",
    from: `        data-class={decision.className ?? "none"}\n        aria-label="V45 target decision"\n      >`,
    to: `        data-class={decision.className ?? "none"}\n        aria-label="V45 target decision"\n        style={{\n          left: \`calc(50% + \${lockX.toFixed(2)}vw)\`,\n          top: \`\${lockTopVh.toFixed(2)}vh\`,\n        }}\n      >`,
  },
]);

patch("src/sky/SkyDancerAirCombatFxV18.ts", [
  {
    label: "shrink inherited missile warning ring",
    from: `    this.missileWarningRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 28), warningMaterial);`,
    to: `    // This legacy camera-space cue used to fill most of a phone viewport\n    // under the newer SKY RAID chase camera. Keep it as a compact threat halo\n    // around the aircraft; the top HUD now carries the explicit warning text.\n    this.missileWarningRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0055, 4, 24), warningMaterial);`,
  },
  {
    label: "pull warning ticks inward",
    from: `      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.004), warningMaterial.clone());\n      const angle = index * Math.PI * 0.5;\n      marker.position.set(Math.cos(angle) * 0.205, Math.sin(angle) * 0.205, 0);`,
    to: `      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.007, 0.004), warningMaterial.clone());\n      const angle = index * Math.PI * 0.5;\n      marker.position.set(Math.cos(angle) * 0.108, Math.sin(angle) * 0.108, 0);`,
  },
  {
    label: "reduce warning spin and opacity",
    from: `    this.missileWarningRoot.rotation.z += delta * (urgent ? 1.8 : 0.8);\n    this.missileWarningRoot.scale.setScalar(0.9 + strength * 0.2 + pulse * 0.05);\n    for (const child of this.missileWarningRoot.children) {\n      if (!(child instanceof THREE.Mesh)) continue;\n      const material = child.material as THREE.MeshBasicMaterial;\n      material.color.setHex(color);\n      material.opacity = 0.28 + strength * 0.68 * pulse;\n    }`,
    to: `    this.missileWarningRoot.rotation.z += delta * (urgent ? 0.72 : 0.38);\n    this.missileWarningRoot.scale.setScalar(0.92 + strength * 0.12 + pulse * 0.025);\n    for (const child of this.missileWarningRoot.children) {\n      if (!(child instanceof THREE.Mesh)) continue;\n      const material = child.material as THREE.MeshBasicMaterial;\n      material.color.setHex(color);\n      material.opacity = 0.18 + strength * 0.44 * pulse;\n    }`,
  },
]);

patch("tests/sky-sky-raid.test.ts", [
  {
    label: "import Hunt defeat integration helpers",
    from: `} from "../src/sky/SkyDancerSkyRaidRules";\n`,
    to: `} from "../src/sky/SkyDancerSkyRaidRules";\nimport { CartArenaSession } from "../src/cart/CartArenaSession";\nimport {\n  enableCartTurboHunt,\n  getCartTurboHuntSnapshot,\n  reportCartTurboHuntEnemyDefeat,\n} from "../src/cart/CartRoguePhase67TurboHunt";\n`,
  },
  {
    label: "verify missile defeat is counted once",
    from: `test("SKY RAID maps every act to a visibly distinct surface world", () => {\n  assert.deepEqual(\n    SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidWorldStyle(act.id)),\n    ["city", "mountains", "clouds", "storm", "citadel"],\n  );\n});\n`,
    to: `test("SKY RAID maps every act to a visibly distinct surface world", () => {\n  assert.deepEqual(\n    SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidWorldStyle(act.id)),\n    ["city", "mountains", "clouds", "storm", "citadel"],\n  );\n});\n\ntest("SKY RAID missile defeats are counted once even between Hunt fixed steps", () => {\n  const session = new CartArenaSession();\n  enableCartTurboHunt(session);\n  const enemy = session.enemies.find((candidate) => candidate.alive && candidate.kind !== "boss");\n  assert.ok(enemy);\n  const before = getCartTurboHuntSnapshot(session)?.huntKills ?? 0;\n  enemy.hp = 0;\n  enemy.alive = false;\n  assert.equal(reportCartTurboHuntEnemyDefeat(session, enemy.id), true);\n  assert.equal(getCartTurboHuntSnapshot(session)?.huntKills, before + 1);\n  assert.equal(reportCartTurboHuntEnemyDefeat(session, enemy.id), false);\n  session.step({ throttle: 0, brake: 0, steer: 0, boost: false }, 1 / 60);\n  assert.equal(getCartTurboHuntSnapshot(session)?.huntKills, before + 1);\n});\n`,
  },
]);

console.log("SKY RAID review pass patched source files");
