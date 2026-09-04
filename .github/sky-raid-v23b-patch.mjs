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

function insertAfter(path, marker, addition, unique) {
  let text = read(path);
  if (text.includes(unique)) return;
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`insertion marker missing: ${path}`);
  const at = index + marker.length;
  text = text.slice(0, at) + addition + text.slice(at);
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

function replaceRange(path, startMarker, endMarker, replacement, unique = "") {
  let text = read(path);
  if (unique && text.includes(unique)) return;
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`range start missing: ${path}`);
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error(`range end missing: ${path}`);
  text = text.slice(0, start) + replacement + text.slice(end);
  write(path, text);
}

// 1. Pure SKY RAID enemy-package rules.
const rulesPath = "src/sky/SkyDancerSkyRaidRules.ts";
let rules = read(rulesPath);
if (!rules.includes("export type SkyDancerSkyRaidEnemyClass")) {
  rules = rules.trimEnd() + `

export type SkyDancerSkyRaidEnemyClass = "standard" | "striker" | "orbiter" | "drifter" | "bomber" | "heavy";
export type SkyDancerSkyRaidAttackStyle = "intercept" | "knife" | "escort" | "pincer" | "siege";

export interface SkyDancerSkyRaidEnemyDoctrine {
  package: "CITY INTERCEPTORS" | "CANYON KNIVES" | "FLEET ESCORT" | "THUNDER HUNTERS" | "PRISM SIEGE WING";
  roster: readonly [
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
  ];
  attackStyle: SkyDancerSkyRaidAttackStyle;
  speedScale: number;
  turnScale: number;
  missileMinRange: number;
  missileMaxRange: number;
  missileAimTolerance: number;
  missileCooldownScale: number;
  missileTurnScale: number;
  missileDamageScale: number;
}

const SKY_DANCER_SKY_RAID_ENEMY_DOCTRINES: Readonly<Record<SkyDancerSkyRaidActId, SkyDancerSkyRaidEnemyDoctrine>> = {
  "dawn-city": {
    package: "CITY INTERCEPTORS",
    roster: ["standard", "striker", "standard", "orbiter", "drifter", "standard"],
    attackStyle: "intercept",
    speedScale: 1,
    turnScale: 1,
    missileMinRange: 8,
    missileMaxRange: 42,
    missileAimTolerance: 0.56,
    missileCooldownScale: 1.05,
    missileTurnScale: 1,
    missileDamageScale: 0.95,
  },
  "red-canyon": {
    package: "CANYON KNIVES",
    roster: ["drifter", "striker", "drifter", "striker", "standard", "drifter"],
    attackStyle: "knife",
    speedScale: 1.09,
    turnScale: 1.18,
    missileMinRange: 7,
    missileMaxRange: 34,
    missileAimTolerance: 0.70,
    missileCooldownScale: 0.92,
    missileTurnScale: 1.12,
    missileDamageScale: 0.88,
  },
  "cloud-fleet": {
    package: "FLEET ESCORT",
    roster: ["orbiter", "bomber", "heavy", "orbiter", "bomber", "standard"],
    attackStyle: "escort",
    speedScale: 0.94,
    turnScale: 0.90,
    missileMinRange: 13,
    missileMaxRange: 48,
    missileAimTolerance: 0.74,
    missileCooldownScale: 1.14,
    missileTurnScale: 0.90,
    missileDamageScale: 1.10,
  },
  "storm-carrier": {
    package: "THUNDER HUNTERS",
    roster: ["striker", "drifter", "bomber", "striker", "drifter", "standard"],
    attackStyle: "pincer",
    speedScale: 1.12,
    turnScale: 1.15,
    missileMinRange: 8,
    missileMaxRange: 45,
    missileAimTolerance: 0.64,
    missileCooldownScale: 0.78,
    missileTurnScale: 1.08,
    missileDamageScale: 1,
  },
  "prism-citadel": {
    package: "PRISM SIEGE WING",
    roster: ["heavy", "orbiter", "bomber", "striker", "heavy", "orbiter"],
    attackStyle: "siege",
    speedScale: 1.02,
    turnScale: 1.02,
    missileMinRange: 14,
    missileMaxRange: 51,
    missileAimTolerance: 0.78,
    missileCooldownScale: 0.86,
    missileTurnScale: 1.15,
    missileDamageScale: 1.08,
  },
};

export function skyDancerSkyRaidEnemyDoctrine(actId: SkyDancerSkyRaidActId): SkyDancerSkyRaidEnemyDoctrine {
  return SKY_DANCER_SKY_RAID_ENEMY_DOCTRINES[actId];
}

export function skyDancerSkyRaidEnemySpawnPriority(
  actId: SkyDancerSkyRaidActId,
  enemyClass: SkyDancerSkyRaidEnemyClass,
  spawnSerial: number,
): number {
  const doctrine = skyDancerSkyRaidEnemyDoctrine(actId);
  const preferred = doctrine.roster[Math.abs(Math.floor(spawnSerial)) % doctrine.roster.length];
  if (enemyClass === preferred) return 100;
  const supportingIndex = doctrine.roster.indexOf(enemyClass);
  if (supportingIndex >= 0) return 36 - supportingIndex * 2;
  return enemyClass === "heavy" ? -18 : 0;
}
`;
  write(rulesPath, rules);
}

// 2. SKY-only adapter keeps Cart free of SKY dependencies.
write("src/sky/SkyDancerSkyRaidEnemyDoctrine.ts", `import type { CartEnemyState } from "../cart/CartCombat";
import {
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidEnemySpawnPriority,
  type SkyDancerSkyRaidEnemyClass,
  type SkyDancerSkyRaidEnemyDoctrine,
} from "./SkyDancerSkyRaidRules";

let activeElapsedSeconds: number | null = null;

export function setSkyDancerSkyRaidEnemyDoctrineElapsed(elapsedSeconds: number | null): void {
  activeElapsedSeconds = elapsedSeconds === null ? null : Math.max(0, elapsedSeconds);
}

export function skyDancerSkyRaidEnemyClassFor(enemy: CartEnemyState): SkyDancerSkyRaidEnemyClass {
  if (enemy.kind === "heavy" || enemy.archetype === "tank") return "heavy";
  if (enemy.archetype === "striker") return "striker";
  if (enemy.archetype === "orbiter") return "orbiter";
  if (enemy.archetype === "drifter") return "drifter";
  if (enemy.archetype === "bomber") return "bomber";
  return "standard";
}

export function getSkyDancerSkyRaidEnemyDoctrine(
  enemy: CartEnemyState,
): SkyDancerSkyRaidEnemyDoctrine | null {
  if (activeElapsedSeconds === null || enemy.kind === "boss") return null;
  return skyDancerSkyRaidEnemyDoctrine(skyDancerSkyRaidActFor(activeElapsedSeconds).id);
}

export function skyDancerSkyRaidSpawnPreference(
  enemy: CartEnemyState,
  elapsedSeconds: number,
  spawnSerial: number,
): number {
  if (enemy.kind === "boss") return -999;
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  return skyDancerSkyRaidEnemySpawnPriority(act.id, skyDancerSkyRaidEnemyClassFor(enemy), spawnSerial);
}
`);

// 3. Generic optional spawn preference in Turbo Hunt.
insertAfter(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  "let externalProgressionEnabled = false;\n",
  `
export interface CartTurboHuntSpawnPreferenceContext {
  elapsedSeconds: number;
  phase: CartTurboHuntPhase;
  spawnSerial: number;
}

export type CartTurboHuntSpawnPreference = (
  enemy: CartEnemyState,
  context: CartTurboHuntSpawnPreferenceContext,
) => number;

let externalSpawnPreference: CartTurboHuntSpawnPreference | null = null;

export function setCartTurboHuntSpawnPreference(preference: CartTurboHuntSpawnPreference | null): void {
  externalSpawnPreference = preference;
}
`,
  "CartTurboHuntSpawnPreferenceContext",
);

replaceRange(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  "function chooseSpawnCandidate(session: MutableHuntSession, state: TurboHuntState): CartEnemyState | null {",
  "\n\nfunction spawnSupportEnemy",
  `function chooseSpawnCandidate(session: MutableHuntSession, state: TurboHuntState): CartEnemyState | null {
  const candidates = session.enemies.filter((enemy) => isSpawnEligible(enemy, state));
  if (candidates.length === 0) return null;
  if (externalSpawnPreference) {
    const context: CartTurboHuntSpawnPreferenceContext = {
      elapsedSeconds: state.elapsed,
      phase: state.phase,
      spawnSerial: state.spawnSerial,
    };
    const scored = candidates.map((enemy) => ({
      enemy,
      score: Number(externalSpawnPreference?.(enemy, context) ?? 0),
    }));
    const bestScore = Math.max(...scored.map((sample) => sample.score));
    if (Number.isFinite(bestScore) && bestScore > 0) {
      const preferred = scored.filter((sample) => sample.score === bestScore);
      return preferred[state.spawnSerial % preferred.length]?.enemy ?? preferred[0]?.enemy ?? null;
    }
  }
  const needHeavy = (state.phase === "elite-invasion" || state.phase === "overdrive" || state.phase === "boss-arrival")
    && !session.enemies.some((enemy) => enemy.alive && enemy.kind === "heavy");
  if (needHeavy) {
    const heavy = candidates.find((enemy) => enemy.kind === "heavy");
    if (heavy) return heavy;
  }
  const bomberWanted = state.phase !== "drop-in" && state.spawnSerial % 7 === 4;
  if (bomberWanted) {
    const bomber = candidates.find((enemy) => enemy.archetype === "bomber");
    if (bomber) return bomber;
  }
  const index = Math.floor(random01(state) * candidates.length) % candidates.length;
  return candidates[index] ?? null;
}`,
  "elapsedSeconds: state.elapsed",
);

// 4. Flight AI and missile doctrine.
insertAfter(
  "src/sky/SkyDancerFlightCombat.ts",
  `} from "./SkyDancerVerticalFlightV43";\n`,
  `import { getSkyDancerSkyRaidEnemyDoctrine } from "./SkyDancerSkyRaidEnemyDoctrine";\n`,
  "SkyDancerSkyRaidEnemyDoctrine",
);

replaceRange(
  "src/sky/SkyDancerFlightCombat.ts",
  "function initialCooldown(enemy: CartEnemyState): number {",
  "\n\nfunction stateFor",
  `function initialCooldown(enemy: CartEnemyState): number {
  const base = enemy.kind === "boss" ? 1.1 : enemy.kind === "heavy" ? 1.75 : enemy.kind === "chaser" ? 2.15 : 2.55;
  const jittered = base + (Math.abs(enemy.id.length * 37) % 9) * 0.11;
  const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
  return jittered * (doctrine?.missileCooldownScale ?? 1);
}`,
  "jittered * (doctrine?.missileCooldownScale ?? 1)",
);

replaceRange(
  "src/sky/SkyDancerFlightCombat.ts",
  "function enemyCruiseSpeed(enemy: CartEnemyState): number {",
  "\n\nfunction updateAircraftEnemies",
  `function enemyCruiseSpeed(enemy: CartEnemyState): number {
  const baseSpeed = enemy.kind === "boss"
    ? 10.4
    : enemy.kind === "heavy"
      ? 8.8
      : enemy.archetype === "striker"
        ? 13.2
        : enemy.archetype === "drifter"
          ? 12.4
          : enemy.archetype === "orbiter"
            ? 11.6
            : enemy.archetype === "bomber"
              ? 10.8
              : enemy.kind === "blocker" ? 10.2 : 11.4;
  const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
  return baseSpeed * (doctrine?.speedScale ?? 1);
}

function enemyTurnRate(enemy: CartEnemyState): number {
  const baseRate = enemy.kind === "boss"
    ? 0.82
    : enemy.kind === "heavy"
      ? 0.92
      : enemy.archetype === "drifter"
        ? 1.42
        : enemy.archetype === "striker"
          ? 1.26
          : 1.12;
  const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
  return baseRate * (doctrine?.turnScale ?? 1);
}

function skyRaidAttackHeading(
  enemy: CartEnemyState,
  direct: number,
  distance: number,
  memoryClock: number,
  side: number,
  playerX: number,
  playerZ: number,
  playerHeading: number,
): number {
  const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
  if (!doctrine || doctrine.attackStyle === "intercept") return Number.NaN;
  const leadHeading = (leadScale: number, weave: number): number => {
    const lead = clamp(distance * leadScale, 2, 9);
    const targetX = playerX + Math.sin(playerHeading) * lead;
    const targetZ = playerZ + Math.cos(playerHeading) * lead;
    return normalizeAngle(
      Math.atan2(targetX - enemy.x, targetZ - enemy.z)
      + Math.sin(memoryClock * 1.15 + (side > 0 ? 0 : Math.PI)) * weave,
    );
  };

  if (doctrine.attackStyle === "knife") {
    if (distance < 7) return normalizeAngle(direct + side * 1.68);
    if (distance < 19) return normalizeAngle(direct + side * (0.78 + Math.sin(memoryClock * 2.3) * 0.22));
    return leadHeading(0.17, 0.08);
  }
  if (doctrine.attackStyle === "escort") {
    if (distance < 14) return normalizeAngle(direct + side * 1.35);
    if (distance < 30) return normalizeAngle(direct + side * (0.72 + Math.sin(memoryClock * 1.35) * 0.12));
    return leadHeading(0.12, 0.05);
  }
  if (doctrine.attackStyle === "pincer") {
    if (distance < 6.5) return normalizeAngle(direct + side * 1.55);
    if (distance < 18) return normalizeAngle(direct + side * (0.28 + Math.sin(memoryClock * 2.0) * 0.16));
    return leadHeading(0.28, 0.10);
  }
  if (distance < 16) return normalizeAngle(direct + side * 1.28);
  if (distance < 35) return normalizeAngle(direct + side * (0.88 + Math.sin(memoryClock * 1.05) * 0.10));
  return leadHeading(0.10, 0.04);
}`,
  "function skyRaidAttackHeading(",
);

replaceRange(
  "src/sky/SkyDancerFlightCombat.ts",
  "    // Aircraft never stop and pivot in place. They make attack passes, overshoot,",
  "\n\n    const edgeMargin = 6.5;",
  `    // Aircraft never stop and pivot in place. SKY RAID can author a distinct
    // attack sentence per act while every other mode keeps this proven fallback.
    const authoredSkyRaidHeading = skyRaidAttackHeading(
      enemy,
      direct,
      distance,
      memory.clock,
      side,
      px,
      pz,
      playerHeading,
    );
    let targetHeading = direct;
    if (Number.isFinite(authoredSkyRaidHeading)) {
      targetHeading = authoredSkyRaidHeading;
    } else if (distance < 7.5) {
      targetHeading = normalizeAngle(direct + side * (1.55 + Math.sin(memory.clock * 1.7) * 0.18));
    } else if (distance < 15) {
      targetHeading = normalizeAngle(direct + side * (0.42 + Math.sin(memory.clock * 1.35) * 0.24));
    } else {
      const lead = clamp(distance * 0.22, 2.5, 8.5);
      const targetX = px + Math.sin(playerHeading) * lead;
      const targetZ = pz + Math.cos(playerHeading) * lead;
      targetHeading = Math.atan2(targetX - enemy.x, targetZ - enemy.z);
      targetHeading = normalizeAngle(targetHeading + Math.sin(memory.clock * 0.82 + (side > 0 ? 0 : Math.PI)) * 0.16);
    }`,
  "authoredSkyRaidHeading",
);

replaceRange(
  "src/sky/SkyDancerFlightCombat.ts",
  "function missileSpec(enemy: CartEnemyState): MissileSpecV43 {",
  "\n\nfunction tryLaunchMissiles",
  `function missileSpec(enemy: CartEnemyState): MissileSpecV43 {
  const baseSpec = enemy.kind === "boss"
    ? { launchSpeed: 19.5, maxSpeed: 29.5, acceleration: 18, turnRate: 1.72, pitchRate: 1.28, damage: 0.105, cooldown: 1.2 }
    : enemy.kind === "heavy"
      ? { launchSpeed: 17.5, maxSpeed: 25.5, acceleration: 15, turnRate: 1.48, pitchRate: 1.12, damage: 0.085, cooldown: 2.0 }
      : enemy.archetype === "bomber"
        ? { launchSpeed: 16.0, maxSpeed: 23.5, acceleration: 14, turnRate: 1.2, pitchRate: 0.98, damage: 0.078, cooldown: 2.15 }
        : enemy.archetype === "striker"
          ? { launchSpeed: 18.5, maxSpeed: 28.0, acceleration: 17, turnRate: 1.62, pitchRate: 1.22, damage: 0.068, cooldown: 2.35 }
          : { launchSpeed: 17.5, maxSpeed: 26.5, acceleration: 16, turnRate: 1.5, pitchRate: 1.16, damage: 0.062, cooldown: 2.7 };
  const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
  if (!doctrine || enemy.kind === "boss") return baseSpec;
  return {
    ...baseSpec,
    turnRate: baseSpec.turnRate * doctrine.missileTurnScale,
    pitchRate: baseSpec.pitchRate * (0.92 + doctrine.missileTurnScale * 0.08),
    damage: baseSpec.damage * doctrine.missileDamageScale,
    cooldown: baseSpec.cooldown * doctrine.missileCooldownScale,
  };
}`,
  "baseSpec.turnRate * doctrine.missileTurnScale",
);

replaceRange(
  "src/sky/SkyDancerFlightCombat.ts",
  "    const horizontalDistance = Math.hypot(dx, dz);\n    const distance = skyDancerDistance3DV43(enemy.x, vertical.altitudeOffsetMeters, enemy.z, px, 0, pz);",
  "\n\n    const spec = missileSpec(enemy);",
  `    const horizontalDistance = Math.hypot(dx, dz);
    const distance = skyDancerDistance3DV43(enemy.x, vertical.altitudeOffsetMeters, enemy.z, px, 0, pz);
    const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);
    const minRange = enemy.kind === "boss" ? 8 : doctrine?.missileMinRange ?? 8;
    const maxRange = enemy.kind === "boss" ? 52 : doctrine?.missileMaxRange ?? 43;
    if (distance < minRange || distance > maxRange) continue;
    const direct = Math.atan2(dx, dz);
    const aimError = Math.abs(normalizeAngle(direct - enemy.heading));
    const aimTolerance = enemy.kind === "boss" ? 0.82 : doctrine?.missileAimTolerance ?? 0.58;
    if (aimError > aimTolerance) continue;`,
  "doctrine?.missileMinRange ?? 8",
);

// 5. SKY RAID owns the callback and active doctrine lifetime.
replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `import {
  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";`,
  `import {
  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  setCartTurboHuntSpawnPreference,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";`,
  "setCartTurboHuntSpawnPreference",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidKillScore,`,
  `  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidKillScore,`,
  "skyDancerSkyRaidEnemyDoctrine,",
);

insertAfter(
  "src/sky/SkyDancerSkyRaid.ts",
  `import { SkyDancerSkyRaidArcadeWorld } from "./SkyDancerSkyRaidArcadeWorld";\n`,
  `import {
  setSkyDancerSkyRaidEnemyDoctrineElapsed,
  skyDancerSkyRaidEnemyClassFor,
  skyDancerSkyRaidSpawnPreference,
} from "./SkyDancerSkyRaidEnemyDoctrine";\n`,
  'from "./SkyDancerSkyRaidEnemyDoctrine";',
);

insertAfter(
  "src/sky/SkyDancerSkyRaid.ts",
  `function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.skyRaidAct = snapshot.actId;
  document.documentElement.dataset.skyRaidWorldStyle = skyDancerSkyRaidWorldStyle(snapshot.actId);
}
`,
  `
function publishSkyRaidEnemyDoctrineDiagnostics(
  session: CartArenaSession,
  elapsedSeconds: number,
): void {
  if (typeof document === "undefined") return;
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const doctrine = skyDancerSkyRaidEnemyDoctrine(act.id);
  const liveClasses = session.enemies
    .filter((enemy) => enemy.alive && enemy.kind !== "boss")
    .map((enemy) => skyDancerSkyRaidEnemyClassFor(enemy))
    .sort();
  document.documentElement.dataset.skyRaidEnemyPackage = doctrine.package;
  document.documentElement.dataset.skyRaidEnemyAttackStyle = doctrine.attackStyle;
  document.documentElement.dataset.skyRaidEnemyClasses = liveClasses.join(",");
}
`,
  "function publishSkyRaidEnemyDoctrineDiagnostics(",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `export function installSkyDancerSkyRaid(): void {
  const sessionPrototype = CartArenaSession.prototype as unknown as RaidSession;`,
  `export function installSkyDancerSkyRaid(): void {
  setCartTurboHuntSpawnPreference((enemy, context) => {
    if (!isSkyRaidMode()) return 0;
    return skyDancerSkyRaidSpawnPreference(enemy, context.elapsedSeconds, context.spawnSerial);
  });
  const sessionPrototype = CartArenaSession.prototype as unknown as RaidSession;`,
  "setCartTurboHuntSpawnPreference((enemy, context)",
);

replaceRange(
  "src/sky/SkyDancerSkyRaid.ts",
  "  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {",
  "\n\n  const webglPrototype",
  `  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {
    const skyRaidActive = isSkyRaidMode();
    const typedSession = this as unknown as CartArenaSession;
    const preHunt = skyRaidActive ? getCartTurboHuntSnapshot(typedSession) : null;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(skyRaidActive ? preHunt?.huntElapsedSeconds ?? 0 : null);
    const flightInput = skyRaidActive
      ? { ...input, steer: skyDancerSkyRaidSteerInput(input.steer) }
      : input;
    previousStep.call(this, flightInput, fixedDelta);
    if (!skyRaidActive) {
      setSkyDancerSkyRaidEnemyDoctrineElapsed(null);
      return;
    }
    const delta = clamp(fixedDelta, 0, 0.05);
    const hunt = getCartTurboHuntSnapshot(typedSession);
    if (!hunt) return;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(hunt.huntElapsedSeconds);
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);
    publishSkyRaidWorldStyle(snapshot);
    publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);
    const state = stateFor(this, hunt);
    state.broadcastClock += delta;
    if (state.broadcastClock >= 0.1 || snapshot.actElapsedSeconds < 0.12 || snapshot.clear) {
      state.broadcastClock %= 0.1;
      broadcast(snapshot);
    }
  };`,
  "publishSkyRaidEnemyDoctrineDiagnostics(typedSession",
);

// 6. Tests.
replaceOnce(
  "tests/sky-sky-raid.test.ts",
  `  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidKillScore,`,
  `  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidEnemySpawnPriority,
  skyDancerSkyRaidKillScore,`,
  "skyDancerSkyRaidEnemySpawnPriority,",
);

insertBefore(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID formation and phone recycler both consume the active act doctrine", () => {`,
  `test("SKY RAID gives every act its own enemy package and attack geometry", () => {
  const doctrines = SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id));
  assert.deepEqual(doctrines.map((doctrine) => doctrine.package), [
    "CITY INTERCEPTORS",
    "CANYON KNIVES",
    "FLEET ESCORT",
    "THUNDER HUNTERS",
    "PRISM SIEGE WING",
  ]);
  assert.equal(new Set(doctrines.map((doctrine) => doctrine.roster.join(">"))).size, 5);
  assert.equal(new Set(doctrines.map((doctrine) => doctrine.attackStyle)).size, 5);
  assert.ok(doctrines[1].turnScale > doctrines[0].turnScale);
  assert.ok(doctrines[2].missileMinRange > doctrines[0].missileMinRange);
  assert.ok(doctrines[3].missileCooldownScale < doctrines[0].missileCooldownScale);
  assert.ok(doctrines[4].missileMaxRange > doctrines[0].missileMaxRange);
});

test("SKY RAID spawn priority rotates pooled aircraft classes by act", () => {
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("red-canyon", "drifter", 0) > skyDancerSkyRaidEnemySpawnPriority("red-canyon", "bomber", 0));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "bomber", 1) > skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "striker", 1));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "heavy", 2) > skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "drifter", 2));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("storm-carrier", "striker", 0) > skyDancerSkyRaidEnemySpawnPriority("storm-carrier", "heavy", 0));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("prism-citadel", "heavy", 0) > skyDancerSkyRaidEnemySpawnPriority("prism-citadel", "standard", 0));
});

test("SKY RAID wires enemy packages into Hunt spawning, flight AI and missile envelopes", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(raidSource, /setCartTurboHuntSpawnPreference/);
  assert.match(raidSource, /setSkyDancerSkyRaidEnemyDoctrineElapsed/);
  assert.match(raidSource, /skyRaidEnemyPackage/);
  assert.match(huntSource, /externalSpawnPreference/);
  assert.match(huntSource, /elapsedSeconds: state\\.elapsed/);
  assert.match(flightSource, /skyRaidAttackHeading/);
  assert.match(flightSource, /doctrine\\?\\.missileMinRange/);
  assert.match(flightSource, /doctrine\\?\\.missileMaxRange/);
  assert.match(flightSource, /baseSpec\\.turnRate \\* doctrine\\.missileTurnScale/);
  assert.match(auditSource, /CITY INTERCEPTORS/);
  assert.match(auditSource, /enemyClasses/);
});

`,
  "SKY RAID gives every act its own enemy package",
);

// 7. Browser audit proves the actual opening package.
replaceRange(
  "scripts/webgl-sky-raid-camera-edge-v17.mjs",
  "  const combatDiagnostics = await page.evaluate(() => ({",
  "\n\n  const baseline = await camera();",
  `  const combatDiagnostics = await page.evaluate(() => ({
    populationProfile: document.documentElement.dataset.skyRaidPopulationProfile ?? "",
    enemyPool: Number(document.documentElement.dataset.skyRaidEnemyPool ?? 0),
    enemyActive: Number(document.documentElement.dataset.skyRaidEnemyActive ?? 0),
    enemyPackage: document.documentElement.dataset.skyRaidEnemyPackage ?? "",
    enemyAttackStyle: document.documentElement.dataset.skyRaidEnemyAttackStyle ?? "",
    enemyClasses: (document.documentElement.dataset.skyRaidEnemyClasses ?? "").split(",").filter(Boolean),
  }));
  if (combatDiagnostics.populationProfile !== "arcade-dense") throw new Error(\`SKY RAID population profile missing: \${JSON.stringify(combatDiagnostics)}\`);
  if (combatDiagnostics.enemyActive < 1) throw new Error(\`SKY RAID has no live combat targets: \${JSON.stringify(combatDiagnostics)}\`);
  if (combatDiagnostics.enemyPool < combatDiagnostics.enemyActive) throw new Error(\`SKY RAID population diagnostics inconsistent: \${JSON.stringify(combatDiagnostics)}\`);
  if (combatDiagnostics.enemyPackage !== "CITY INTERCEPTORS" || combatDiagnostics.enemyAttackStyle !== "intercept") {
    throw new Error(\`SKY RAID opening enemy package is not active: \${JSON.stringify(combatDiagnostics)}\`);
  }
  if (combatDiagnostics.enemyClasses.includes("heavy") || combatDiagnostics.enemyClasses.includes("bomber")) {
    throw new Error(\`SKY RAID opening leaked a late-act aircraft class: \${JSON.stringify(combatDiagnostics)}\`);
  }
  if (!combatDiagnostics.enemyClasses.includes("standard") || new Set(combatDiagnostics.enemyClasses).size < 3) {
    throw new Error(\`SKY RAID opening package lacks interceptor variety: \${JSON.stringify(combatDiagnostics)}\`);
  }`,
  "enemyPackage: document.documentElement.dataset.skyRaidEnemyPackage",
);

for (const path of [
  rulesPath,
  "src/sky/SkyDancerSkyRaidEnemyDoctrine.ts",
  "src/cart/CartRoguePhase67TurboHunt.ts",
  "src/sky/SkyDancerFlightCombat.ts",
  "src/sky/SkyDancerSkyRaid.ts",
  "tests/sky-sky-raid.test.ts",
  "scripts/webgl-sky-raid-camera-edge-v17.mjs",
]) {
  if (read(path).includes("\0")) throw new Error(`NUL byte leaked into ${path}`);
}
