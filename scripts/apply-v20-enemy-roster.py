from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one occurrence, got {count}: {old[:90]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags: int = re.S) -> None:
    text = read(path)
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{path}: regex expected one occurrence, got {count}: {pattern[:90]!r}")
    write(path, new_text)


# -----------------------------------------------------------------------------
# Data: nine real normal enemy kinds and stage-specific progression.
# -----------------------------------------------------------------------------
replace_once(
    "src/sky/arcade/SkyDancerArcadeData.ts",
    'export type SkyDancerArcadeEnemyKind = "fighter" | "interceptor" | "missile-boat" | "bomber" | "ace";\n',
    'export type SkyDancerArcadeEnemyKind =\n'
    '  | "fighter"\n'
    '  | "interceptor"\n'
    '  | "missile-boat"\n'
    '  | "bomber"\n'
    '  | "ace"\n'
    '  | "drone"\n'
    '  | "striker"\n'
    '  | "gunship"\n'
    '  | "raider";\n\n'
    'export const SKY_DANCER_ARCADE_ENEMY_KINDS = [\n'
    '  "fighter", "interceptor", "missile-boat", "bomber", "ace",\n'
    '  "drone", "striker", "gunship", "raider",\n'
    '] as const satisfies readonly SkyDancerArcadeEnemyKind[];\n'
)

stage_pools = {
    '["fighter", "interceptor", "missile-boat"]': '["fighter", "drone", "interceptor", "missile-boat"]',
    '["interceptor", "fighter", "bomber"]': '["interceptor", "fighter", "striker", "bomber"]',
    '["fighter", "missile-boat", "bomber"]': '["fighter", "drone", "missile-boat", "gunship", "bomber"]',
    '["fighter", "interceptor", "missile-boat", "bomber"]': '["fighter", "interceptor", "striker", "missile-boat", "gunship", "bomber"]',
    '["interceptor", "fighter", "ace"]': '["interceptor", "raider", "fighter", "ace"]',
    '["fighter", "interceptor", "ace", "bomber"]': '["fighter", "drone", "raider", "interceptor", "ace", "bomber"]',
    '["fighter", "interceptor", "missile-boat", "ace"]': '["fighter", "interceptor", "striker", "raider", "missile-boat", "ace"]',
    '["interceptor", "bomber", "missile-boat", "ace"]': '["interceptor", "striker", "gunship", "bomber", "missile-boat", "ace"]',
    '["fighter", "interceptor", "missile-boat", "ace", "bomber"]': '["fighter", "drone", "raider", "interceptor", "striker", "missile-boat", "ace", "bomber"]',
    '["fighter", "interceptor", "missile-boat", "bomber", "ace"]': '["fighter", "drone", "interceptor", "raider", "striker", "missile-boat", "gunship", "bomber", "ace"]',
}
# desert shares the old fighter/missile/bomber pool with cloud, so patch it after cloud by context.
path = "src/sky/arcade/SkyDancerArcadeData.ts"
text = read(path)
for old, new in stage_pools.items():
    if old == '["fighter", "missile-boat", "bomber"]':
        continue
    if text.count(old) != 1:
        raise RuntimeError(f"{path}: stage pool {old} expected once, got {text.count(old)}")
    text = text.replace(old, new, 1)
# Cloud + desert had same pool; give them distinct V20 rosters.
old = 'enemies: ["fighter", "missile-boat", "bomber"],'
if text.count(old) != 2:
    raise RuntimeError(f"{path}: expected two cloud/desert shared pools, got {text.count(old)}")
text = text.replace(old, 'enemies: ["fighter", "drone", "missile-boat", "gunship", "bomber"],', 1)
text = text.replace(old, 'enemies: ["fighter", "striker", "missile-boat", "gunship", "bomber"],', 1)
write(path, text)

# -----------------------------------------------------------------------------
# Combat roles / armor.
# -----------------------------------------------------------------------------
replace_once(
    "src/sky/arcade/SkyDancerArcadeV10Systems.ts",
    '  if (kind === "interceptor") return "hunter";\n  if (kind === "missile-boat") return "artillery";\n  if (kind === "bomber") return "heavy";\n  if (kind === "ace") return "ace";\n',
    '  if (kind === "interceptor" || kind === "raider" || kind === "striker") return "hunter";\n'
    '  if (kind === "missile-boat") return "artillery";\n'
    '  if (kind === "bomber" || kind === "gunship") return "heavy";\n'
    '  if (kind === "ace") return "ace";\n'
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeV10Systems.ts",
    '  if (kind === "missile-boat") return .18;\n  if (kind === "bomber") return .3;\n  if (kind === "ace") return .14;\n',
    '  if (kind === "missile-boat") return .18;\n'
    '  if (kind === "gunship") return .34;\n'
    '  if (kind === "bomber") return .3;\n'
    '  if (kind === "striker") return .12;\n'
    '  if (kind === "raider") return .08;\n'
    '  if (kind === "ace") return .14;\n'
)

# -----------------------------------------------------------------------------
# V17 phone-readable presentation scaling.
# -----------------------------------------------------------------------------
replace_once(
    "src/sky/arcade/SkyDancerArcadeModelsLegacy.ts",
    '    case "bomber": return 1.2;\n    case "missile-boat": return 1.23;\n    case "ace": return 1.34;\n    case "interceptor": return 1.38;\n    case "fighter": return 1.42;\n',
    '    case "gunship": return 1.16;\n'
    '    case "bomber": return 1.2;\n'
    '    case "missile-boat": return 1.23;\n'
    '    case "striker": return 1.3;\n'
    '    case "ace": return 1.34;\n'
    '    case "raider": return 1.38;\n'
    '    case "interceptor": return 1.38;\n'
    '    case "fighter": return 1.42;\n'
    '    case "drone": return 1.5;\n'
)

# -----------------------------------------------------------------------------
# V18 procedural silhouettes: four genuinely different airframes.
# -----------------------------------------------------------------------------
airframe_path = "src/sky/arcade/SkyDancerArcadeEnemyAirframes.ts"
marker = "function buildAce(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {"
insert = r'''function buildDrone(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  // Compact unmanned flying wing: no canopy, almost all silhouette is a faceted lambda wing.
  add(group, loft([
    [-2.75, .02, .02, 0], [-1.65, .22, .1, .01], [-.35, .48, .2, 0],
    [.95, .38, .16, -.03], [1.65, .12, .07, -.04],
  ], 8), mat.dark);
  addWingPair(group, [[.18, -1.45], [3.15, -.18], [2.42, 1.2], [.48, .68]], mat.body, .105, .015);
  addWingPair(group, [[.32, -.9], [2.5, -.03], [1.9, .68], [.52, .42]], mat.secondary, .035, .13);
  addWingPair(group, [[.18, .58], [.95, 1.28], [.7, 1.62], [.16, 1.12]], mat.dark, .06, .05);
  bakeArcadeAirframe(group);
  addEngineGlow(group, 0, -.04, 1.72, .24, mat.hot);
  return { span: 3.0, rearZ: .72, baseScale: .43 };
}

function buildStriker(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  // Attack craft: thick center body, forward canards and clipped swept wings.
  add(group, loft([
    [-4.45, .02, .02, 0], [-3.0, .3, .18, .02], [-1.35, .62, .36, .05],
    [.45, .8, .42, 0], [1.85, .62, .3, -.05], [2.65, .28, .12, -.06],
  ], 12), mat.body);
  addCommonCockpit(group, mat, -2.62, 1.78, .31);
  addWingPair(group, [[.55, -1.0], [3.75, .48], [3.35, 1.34], [.9, .76]], mat.dark, .16, .015);
  addWingPair(group, [[.42, -1.82], [1.48, -1.18], [1.28, -.76], [.28, -1.12]], mat.secondary, .07, .11);
  addWingPair(group, [[.5, 1.12], [1.68, 1.95], [1.34, 2.38], [.38, 1.72]], mat.body, .09, .06);
  for (const side of [-1, 1]) {
    add(group, loft([[-.65, .16, .14, 0], [.35, .29, .21, 0], [1.62, .25, .17, 0], [2.2, .12, .08, 0]], 8), mat.dark, side * .78, -.07, .28);
  }
  addVerticalFin(group, 0, .2, 1.42, 1.42, 1.34, mat.dark, .3);
  bakeArcadeAirframe(group);
  addEngineGlow(group, -.78, -.07, 2.44, .24, mat.hot);
  addEngineGlow(group, .78, -.07, 2.44, .24, mat.hot);
  return { span: 3.55, rearZ: .95, baseScale: .58 };
}

function buildGunship(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  // Heavy twin-boom gunship: broad shoulders and separated engine nacelles give it a huge readable mass.
  add(group, loft([
    [-3.8, .05, .04, 0], [-2.55, .45, .28, .02], [-.9, .9, .5, .03],
    [.75, 1.08, .52, -.03], [2.35, .78, .34, -.08], [3.05, .38, .16, -.09],
  ], 12), mat.dark);
  addCommonCockpit(group, mat, -2.28, 1.7, .4);
  addWingPair(group, [[.78, -1.3], [4.45, -.05], [4.0, 1.72], [1.2, 1.05]], mat.body, .22, .015);
  addWingPair(group, [[1.0, -.72], [3.7, .12], [3.36, 1.04], [1.35, .62]], mat.secondary, .05, .18);
  for (const side of [-1, 1]) {
    add(group, loft([[-1.25, .2, .16, 0], [-.2, .38, .28, 0], [1.78, .34, .23, 0], [2.75, .17, .1, 0]], 8), mat.body, side * 1.42, -.1, .42);
    addVerticalFin(group, side * 1.45, .12, 1.75, 1.38, 1.42, mat.dark, .24);
  }
  addWingPair(group, [[.7, 1.25], [2.35, 2.3], [1.98, 2.7], [.55, 1.86]], mat.dark, .13, .04);
  bakeArcadeAirframe(group);
  for (const x of [-1.42, -.52, .52, 1.42]) addEngineGlow(group, x, -.1, 2.82, .21, mat.hot);
  return { span: 4.25, rearZ: 1.38, baseScale: .76 };
}

function buildRaider(group: THREE.Group, mat: Materials): { span: number; rearZ: number; baseScale: number } {
  // Agile gull-wing raider: broken arrow silhouette, twin tails and a pronounced dorsal spine.
  add(group, loft([
    [-4.2, .02, .02, 0], [-2.95, .22, .14, .02], [-1.35, .46, .27, .05],
    [.25, .6, .32, .01], [1.55, .47, .22, -.04], [2.3, .22, .1, -.05],
  ], 10), mat.secondary);
  addCommonCockpit(group, mat, -2.62, 1.72, .27);
  addWingPair(group, [[.35, -.72], [2.08, -.25], [3.5, .72], [3.05, 1.2], [.82, .62]], mat.body, .105, .05);
  addWingPair(group, [[.48, -.42], [1.95, -.02], [3.0, .68], [2.72, .92], [.9, .42]], mat.secondary, .035, .16);
  addWingPair(group, [[.38, 1.08], [1.5, 1.92], [1.18, 2.32], [.3, 1.68]], mat.dark, .075, .07);
  addVerticalFin(group, -.5, .2, 1.3, 1.2, 1.15, mat.dark, .2);
  addVerticalFin(group, .5, .2, 1.3, 1.2, 1.15, mat.dark, .2);
  bakeArcadeAirframe(group);
  addEngineGlow(group, -.52, -.05, 2.34, .22, mat.hot);
  addEngineGlow(group, .52, -.05, 2.34, .22, mat.hot);
  return { span: 3.35, rearZ: .8, baseScale: .5 };
}

'''
text = read(airframe_path)
if text.count(marker) != 1:
    raise RuntimeError("EnemyAirframes: buildAce marker missing")
text = text.replace(marker, insert + marker, 1)
write(airframe_path, text)

regex_once(
    airframe_path,
    r'export function createSkyDancerArcadeEnemyAirframeV18\([\s\S]*?\n}\s*$',
    r'''export function createSkyDancerArcadeEnemyAirframeV18(
  stage: SkyDancerArcadeStageDefinition,
  kind: SkyDancerArcadeEnemyKind,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-enemy-v18-airframe-${kind}`;
  const mat = materials(stage);
  const identity: Record<SkyDancerArcadeEnemyKind, string> = {
    fighter: "swept-delta-fighter",
    interceptor: "needle-interceptor",
    "missile-boat": "pod-shoulder-missile-boat",
    bomber: "cranked-wing-bomber",
    ace: "forward-swept-ace",
    drone: "lambda-flying-wing-drone",
    striker: "canard-attack-striker",
    gunship: "twin-boom-heavy-gunship",
    raider: "gull-wing-raider",
  };
  const builders: Record<SkyDancerArcadeEnemyKind, (root: THREE.Group, materials: Materials) => { span: number; rearZ: number; baseScale: number }> = {
    fighter: buildFighter,
    interceptor: buildInterceptor,
    "missile-boat": buildMissileBoat,
    bomber: buildBomber,
    ace: buildAce,
    drone: buildDrone,
    striker: buildStriker,
    gunship: buildGunship,
    raider: buildRaider,
  };
  const built = builders[kind](group, mat);

  group.add(createRoundBeaconsV18(built.span, built.rearZ));
  group.scale.setScalar(built.baseScale);
  group.userData.arcadeEnemySilhouetteV18 = true;
  group.userData.arcadeEnemySilhouetteIdentityV18 = identity[kind];
  group.userData.arcadeEnemyBaseScaleV18 = built.baseScale;
  group.userData.arcadeEnemySquareBeaconRemovedV18 = true;
  group.userData.arcadeEnemyLogicalCollisionUnchangedV18 = true;
  group.userData.arcadeEnemyRosterV20 = kind;
  return group;
}
'''
)

# -----------------------------------------------------------------------------
# V19 readable attitude profiles for all nine normal kinds.
# -----------------------------------------------------------------------------
regex_once(
    "src/sky/arcade/SkyDancerArcadeModels.ts",
    r'function applyReadableEnemyAttitudeV19\([\s\S]*?\n}\n\nfunction createStandardEnemy',
    r'''function applyReadableEnemyAttitudeV19(group: THREE.Group, enemy: SkyDancerArcadeEnemySnapshot): void {
  const rig = new THREE.Group();
  rig.name = "arcade-enemy-v19-readable-attitude-rig";

  // Keep lock/aim UI on the outer enemy group. Only the aircraft visual body is tilted.
  const visuals = [...group.children];
  for (const visual of visuals) rig.add(visual);
  group.add(rig);

  if (enemy.kind === "boss") return;
  const kindIndex: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: 0, interceptor: 1, bomber: 2, "missile-boat": 3, ace: 4,
    drone: 5, striker: 6, gunship: 7, raider: 8,
  };
  const pitchByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .155, interceptor: .17, bomber: .115, "missile-boat": .135, ace: .19,
    drone: .205, striker: .16, gunship: .12, raider: .185,
  };
  const rollByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .08, interceptor: .08, bomber: .045, "missile-boat": .045, ace: .105,
    drone: .12, striker: .09, gunship: .05, raider: .115,
  };
  const yawByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .055, interceptor: .055, bomber: .035, "missile-boat": .055, ace: .06,
    drone: .07, striker: .06, gunship: .038, raider: .068,
  };
  const index = kindIndex[enemy.kind];
  const pitchSign = (enemy.id + index) % 3 === 0 ? 1 : -1;
  const rollSign = (enemy.id + index) % 2 === 0 ? 1 : -1;

  rig.rotation.set(
    pitchSign * pitchByKind[enemy.kind],
    rollSign * yawByKind[enemy.kind],
    rollSign * rollByKind[enemy.kind],
  );
  rig.scale.y = enemy.kind === "bomber" || enemy.kind === "missile-boat" || enemy.kind === "gunship" ? 1.08 : 1.1;
  rig.userData.arcadeEnemyReadableAttitudeV19 = true;
  rig.userData.arcadeEnemyPitchBiasV19 = rig.rotation.x;
  rig.userData.arcadeEnemyYawBiasV19 = rig.rotation.y;
  rig.userData.arcadeEnemyRollBiasV19 = rig.rotation.z;
  rig.userData.arcadeEnemyRosterV20 = enemy.kind;
  group.userData.arcadeEnemyReadableAttitudeV19 = true;
  group.userData.arcadeEnemyLogicalCollisionUnchangedV19 = true;
}

function createStandardEnemy'''
)
# The new implementation references the type at runtime compile-time only.
replace_once(
    "src/sky/arcade/SkyDancerArcadeModels.ts",
    'import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";\n',
    'import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";\n'
)

# -----------------------------------------------------------------------------
# Runtime: stats, motion and weapon personalities for the new kinds.
# -----------------------------------------------------------------------------
runtime_path = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
regex_once(
    runtime_path,
    r'function enemyStats\(kind: SkyDancerArcadeEnemyKind, hard: boolean\): \{ hp: number; speed: number; score: number \} \{[\s\S]*?\n}\n\nfunction rankIndex',
    r'''export function skyDancerArcadeEnemyStatsV20(kind: SkyDancerArcadeEnemyKind, hard: boolean): { hp: number; speed: number; score: number } {
  const healthScale = hard ? 1.24 : 1;
  switch (kind) {
    case "drone": return { hp: 15 * healthScale, speed: hard ? 19.5 : 17.5, score: 300 };
    case "interceptor": return { hp: 24 * healthScale, speed: hard ? 18 : 16, score: 520 };
    case "raider": return { hp: 36 * healthScale, speed: hard ? 17 : 15.2, score: 650 };
    case "striker": return { hp: 48 * healthScale, speed: hard ? 15.2 : 13.6, score: 820 };
    case "missile-boat": return { hp: 42 * healthScale, speed: hard ? 12.4 : 11, score: 760 };
    case "bomber": return { hp: 88 * healthScale, speed: hard ? 9.5 : 8.4, score: 1380 };
    case "gunship": return { hp: 112 * healthScale, speed: hard ? 8.7 : 7.6, score: 1760 };
    case "ace": return { hp: 68 * healthScale, speed: hard ? 16 : 14, score: 1680 };
    default: return { hp: 30 * healthScale, speed: hard ? 14.5 : 12.8, score: 440 };
  }
}

function skyDancerArcadeEnemyMotionV20(kind: SkyDancerArcadeEnemyKind | "boss"): { frequency: number; pursuitCap: number } {
  switch (kind) {
    case "drone": return { frequency: 2.72, pursuitCap: .78 };
    case "interceptor": return { frequency: 2.35, pursuitCap: .74 };
    case "raider": return { frequency: 2.08, pursuitCap: .8 };
    case "ace": return { frequency: 1.75, pursuitCap: .84 };
    case "striker": return { frequency: 1.46, pursuitCap: .64 };
    case "gunship": return { frequency: .76, pursuitCap: .4 };
    case "bomber": return { frequency: .82, pursuitCap: .42 };
    case "missile-boat": return { frequency: .92, pursuitCap: .48 };
    default: return { frequency: 1.02, pursuitCap: .54 };
  }
}

function skyDancerArcadeEnemyWeaponV20(kind: SkyDancerArcadeEnemyKind | "boss"): { spread: number; guidance: number; projectileSpeed: number; cadence: number } {
  switch (kind) {
    case "drone": return { spread: 1, guidance: .78, projectileSpeed: 14.2, cadence: 2.35 };
    case "raider": return { spread: 2, guidance: 1.04, projectileSpeed: 14.4, cadence: 1.86 };
    case "striker": return { spread: 2, guidance: 1.18, projectileSpeed: 14.8, cadence: 1.76 };
    case "gunship": return { spread: 3, guidance: 1.2, projectileSpeed: 14.2, cadence: 2.08 };
    case "missile-boat": return { spread: 2, guidance: 1.52, projectileSpeed: 15.5, cadence: 1.68 };
    case "bomber": return { spread: 2, guidance: 1.26, projectileSpeed: 14.5, cadence: 1.9 };
    case "ace": return { spread: 2, guidance: 1.12, projectileSpeed: 13.2, cadence: 1.78 };
    default: return { spread: 1, guidance: .88, projectileSpeed: 13.2, cadence: 2.18 };
  }
}

export function skyDancerArcadeEnemyHitRadiusV20(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): number {
  if (boss) return .72;
  if (kind === "gunship") return .43;
  if (kind === "bomber") return .38;
  if (kind === "drone") return .21;
  if (kind === "striker") return .3;
  return .25;
}

function rankIndex'''
)
replace_once(runtime_path, '    const stats = enemyStats(kind, this.options.difficulty === "hard");\n', '    const stats = skyDancerArcadeEnemyStatsV20(kind, this.options.difficulty === "hard");\n')
replace_once(
    runtime_path,
    '        const frequency = enemy.kind === "interceptor" ? 2.35 : enemy.kind === "ace" ? 1.75 : 1.02;\n        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, enemy.kind === "ace" ? 0.84 : enemy.kind === "interceptor" ? 0.74 : 0.54);\n',
    '        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);\n        const frequency = motionProfileV20.frequency;\n        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, motionProfileV20.pursuitCap);\n'
)
# Counterplay personalities.
replace_once(
    runtime_path,
    '      if (enemy.boss || enemy.kind === "bomber" || enemy.kind === "missile-boat" || enemy.kind === "ace" || enemy.kind === "interceptor") return "armor-brace";\n',
    '      if (enemy.boss || enemy.kind === "bomber" || enemy.kind === "gunship" || enemy.kind === "missile-boat" || enemy.kind === "striker" || enemy.kind === "ace" || enemy.kind === "interceptor") return "armor-brace";\n'
)
replace_once(
    runtime_path,
    '      if (enemy.boss || enemy.kind === "fighter" || enemy.kind === "interceptor" || enemy.kind === "ace") return "evasive-roll";\n',
    '      if (enemy.boss || enemy.kind === "fighter" || enemy.kind === "drone" || enemy.kind === "interceptor" || enemy.kind === "raider" || enemy.kind === "striker" || enemy.kind === "ace") return "evasive-roll";\n'
)
replace_once(
    runtime_path,
    '    if (enemy.boss || enemy.kind === "missile-boat" || enemy.kind === "bomber" || enemy.kind === "ace") return "turbo-jammer";\n',
    '    if (enemy.boss || enemy.kind === "missile-boat" || enemy.kind === "gunship" || enemy.kind === "bomber" || enemy.kind === "striker" || enemy.kind === "ace") return "turbo-jammer";\n'
)
replace_once(
    runtime_path,
    '      : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;\n',
    '      : skyDancerArcadeEnemyWeaponV20(enemy.kind).spread;\n'
)
replace_once(
    runtime_path,
    '        : enemy.kind === "missile-boat" ? 1.52 : enemy.kind === "bomber" ? 1.26 : enemy.kind === "ace" ? 1.12 : 0.88;\n',
    '        : skyDancerArcadeEnemyWeaponV20(enemy.kind).guidance;\n'
)
replace_once(
    runtime_path,
    '        speed: enemy.boss ? (15.8 + enemy.bossPhase * 1.7) * bossSpeedScale : enemy.kind === "missile-boat" ? 15.5 : enemy.kind === "bomber" ? 14.5 : 13.2,\n',
    '        speed: enemy.boss ? (15.8 + enemy.bossPhase * 1.7) * bossSpeedScale : skyDancerArcadeEnemyWeaponV20(enemy.kind).projectileSpeed,\n'
)
replace_once(
    runtime_path,
    '    const base = enemy.boss ? (1.68 - enemy.bossPhase * .18) * bossCadence : enemy.kind === "missile-boat" ? 1.68 : enemy.kind === "bomber" ? 1.9 : enemy.kind === "ace" ? 1.78 : 2.18;\n',
    '    const base = enemy.boss ? (1.68 - enemy.bossPhase * .18) * bossCadence : skyDancerArcadeEnemyWeaponV20(enemy.kind).cadence;\n'
)
replace_once(
    runtime_path,
    '        const radius = enemy.boss ? 0.72 : enemy.kind === "bomber" ? 0.38 : 0.25;\n',
    '        const radius = skyDancerArcadeEnemyHitRadiusV20(enemy.kind, enemy.boss);\n'
)
replace_once(
    runtime_path,
    '      this.addScore(enemy.boss ? 1800 : enemy.kind === "bomber" ? 900 : 650, true);\n',
    '      this.addScore(enemy.boss ? 1800 : enemy.kind === "gunship" ? 1050 : enemy.kind === "bomber" ? 900 : 650, true);\n'
)

# -----------------------------------------------------------------------------
# WebGL presentation: heavy craft / lock UI knows about the gunship.
# -----------------------------------------------------------------------------
webgl_path = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
text = read(webgl_path)
old = 'impact.kind === "bomber" || impact.kind === "missile-boat"'
if text.count(old) < 1:
    raise RuntimeError("WebGL: heavyCraft condition missing")
text = text.replace(old, 'impact.kind === "bomber" || impact.kind === "gunship" || impact.kind === "missile-boat"')
old = 'enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1'
if text.count(old) != 1:
    raise RuntimeError("WebGL: lock scale expression missing")
text = text.replace(old, 'enemy.boss ? 4.2 : enemy.kind === "gunship" ? 1.85 : enemy.kind === "bomber" ? 1.7 : 1.1', 1)
old = 'enemy.boss ? 3.7 : enemy.kind === "bomber" ? 1.5 : .92'
if text.count(old) != 1:
    raise RuntimeError("WebGL: aim scale expression missing")
text = text.replace(old, 'enemy.boss ? 3.7 : enemy.kind === "gunship" ? 1.65 : enemy.kind === "bomber" ? 1.5 : .92', 1)
old = 'enemy.boss ? 4.75 : enemy.kind === "bomber" ? 2.05 : 1.38'
if text.count(old) != 1:
    raise RuntimeError("WebGL: counterplay scale expression missing")
text = text.replace(old, 'enemy.boss ? 4.75 : enemy.kind === "gunship" ? 2.2 : enemy.kind === "bomber" ? 2.05 : 1.38', 1)
write(webgl_path, text)

# -----------------------------------------------------------------------------
# Canvas fallback: distinct silhouettes, not nine copies of the same triangle.
# -----------------------------------------------------------------------------
canvas_path = "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"
replace_once(
    canvas_path,
    '      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "bomber" ? 16 : 11) * readabilityScale;\n',
    '      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "gunship" ? 18 : enemy.kind === "bomber" ? 16 : enemy.kind === "drone" ? 9.5 : 11) * readabilityScale;\n'
)
replace_once(
    canvas_path,
    '      context.beginPath();\n      context.moveTo(0, size);\n      context.lineTo(-size * 1.45, -size * 0.42);\n      context.lineTo(-size * 0.28, -size * 0.15);\n      context.lineTo(0, -size);\n      context.lineTo(size * 0.28, -size * 0.15);\n      context.lineTo(size * 1.45, -size * 0.42);\n      context.closePath();\n      context.fill();\n',
    '      this.traceEnemySilhouetteV20(context, enemy.kind, size);\n      context.fill();\n'
)
insert_marker = '  private drawCourse(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {'
canvas_method = r'''  private traceEnemySilhouetteV20(
    context: CanvasRenderingContext2D,
    kind: SkyDancerArcadeSnapshot["enemies"][number]["kind"],
    size: number,
  ): void {
    context.beginPath();
    if (kind === "drone") {
      context.moveTo(0, size * 1.05);
      context.lineTo(-size * 1.9, -size * .3);
      context.lineTo(-size * .34, -size * .12);
      context.lineTo(0, -size * .76);
      context.lineTo(size * .34, -size * .12);
      context.lineTo(size * 1.9, -size * .3);
    } else if (kind === "gunship") {
      context.moveTo(0, size * 1.05);
      context.lineTo(-size * 1.6, size * .18);
      context.lineTo(-size * 1.75, -size * .52);
      context.lineTo(-size * .56, -size * .32);
      context.lineTo(0, -size * .92);
      context.lineTo(size * .56, -size * .32);
      context.lineTo(size * 1.75, -size * .52);
      context.lineTo(size * 1.6, size * .18);
    } else if (kind === "striker") {
      context.moveTo(0, size * 1.22);
      context.lineTo(-size * 1.6, -size * .25);
      context.lineTo(-size * .48, -size * .18);
      context.lineTo(-size * .72, -size * .58);
      context.lineTo(0, -size * 1.05);
      context.lineTo(size * .72, -size * .58);
      context.lineTo(size * .48, -size * .18);
      context.lineTo(size * 1.6, -size * .25);
    } else if (kind === "raider") {
      context.moveTo(0, size);
      context.lineTo(-size * 1.72, -size * .08);
      context.lineTo(-size * 1.12, -size * .55);
      context.lineTo(-size * .28, -size * .16);
      context.lineTo(0, -size);
      context.lineTo(size * .28, -size * .16);
      context.lineTo(size * 1.12, -size * .55);
      context.lineTo(size * 1.72, -size * .08);
    } else {
      const width = kind === "bomber" ? 1.6 : kind === "missile-boat" ? 1.55 : kind === "interceptor" ? 1.3 : 1.45;
      context.moveTo(0, size);
      context.lineTo(-size * width, -size * .42);
      context.lineTo(-size * .28, -size * .15);
      context.lineTo(0, -size);
      context.lineTo(size * .28, -size * .15);
      context.lineTo(size * width, -size * .42);
    }
    context.closePath();
  }

'''
text = read(canvas_path)
if text.count(insert_marker) != 1:
    raise RuntimeError("Canvas: drawCourse marker missing")
text = text.replace(insert_marker, canvas_method + insert_marker, 1)
write(canvas_path, text)

# -----------------------------------------------------------------------------
# Regression test: roster count, stage progression, stats, roles, silhouettes and V19 rigs.
# -----------------------------------------------------------------------------
test_path = ROOT / "tests/sky-arcade-v20-enemy-roster.test.ts"
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SKY_DANCER_ARCADE_ENEMY_KINDS,
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeEnemyKind,
} from "../src/sky/arcade/SkyDancerArcadeData";
import { createSkyDancerArcadeEnemyAirframeV18 } from "../src/sky/arcade/SkyDancerArcadeEnemyAirframes";
import { createSkyDancerArcadeEnemy } from "../src/sky/arcade/SkyDancerArcadeModels";
import {
  skyDancerArcadeEnemyHitRadiusV20,
  skyDancerArcadeEnemyStatsV20,
  type SkyDancerArcadeEnemySnapshot,
} from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { skyDancerArcadeArmorRatio, skyDancerArcadeEnemyRole } from "../src/sky/arcade/SkyDancerArcadeV10Systems";

const stage = SKY_DANCER_ARCADE_STAGES[0];
const newKinds = ["drone", "striker", "gunship", "raider"] as const satisfies readonly SkyDancerArcadeEnemyKind[];

function snapshot(kind: SkyDancerArcadeEnemyKind, id: number): SkyDancerArcadeEnemySnapshot {
  const stats = skyDancerArcadeEnemyStatsV20(kind, false);
  const armor = Math.round(stats.hp * skyDancerArcadeArmorRatio(kind));
  return {
    id, kind, x: 0, y: 0, depth: 48,
    hp: stats.hp, maxHp: stats.hp, locked: false, boss: false, phase: 0,
    maneuver: "approach", role: skyDancerArcadeEnemyRole(kind),
    armor, maxArmor: armor, bossPhase: 1, weakpointOpen: false, stagger: 0,
    counterplay: "none", counterplayIntensity: 0,
  };
}

test("V20 expands the normal Arcade Run roster from five to nine enemy kinds", () => {
  assert.equal(SKY_DANCER_ARCADE_ENEMY_KINDS.length, 9);
  assert.equal(new Set(SKY_DANCER_ARCADE_ENEMY_KINDS).size, 9);
  for (const kind of newKinds) assert.ok(SKY_DANCER_ARCADE_ENEMY_KINDS.includes(kind));
});

test("V20 introduces new enemies progressively and the finale can remix the full roster", () => {
  assert.ok(SKY_DANCER_ARCADE_STAGES[0].enemies.includes("drone"));
  const finale = SKY_DANCER_ARCADE_STAGES.find(stage => stage.id === "prism-citadel");
  assert.ok(finale);
  assert.deepEqual(new Set(finale.enemies), new Set(SKY_DANCER_ARCADE_ENEMY_KINDS));
  for (const kind of newKinds) {
    const appearances = SKY_DANCER_ARCADE_STAGES.filter(stage => stage.enemies.includes(kind)).length;
    assert.ok(appearances >= 3, `${kind} only appears in ${appearances} stages`);
  }
});

test("V20 new enemy classes occupy different combat niches", () => {
  const drone = skyDancerArcadeEnemyStatsV20("drone", false);
  const fighter = skyDancerArcadeEnemyStatsV20("fighter", false);
  const raider = skyDancerArcadeEnemyStatsV20("raider", false);
  const striker = skyDancerArcadeEnemyStatsV20("striker", false);
  const gunship = skyDancerArcadeEnemyStatsV20("gunship", false);
  const bomber = skyDancerArcadeEnemyStatsV20("bomber", false);
  assert.ok(drone.hp < fighter.hp && drone.speed > fighter.speed);
  assert.ok(raider.speed > fighter.speed && raider.hp > fighter.hp);
  assert.ok(striker.hp > fighter.hp && striker.speed > fighter.speed);
  assert.ok(gunship.hp > bomber.hp && gunship.speed < bomber.speed);
  assert.equal(skyDancerArcadeEnemyRole("gunship"), "heavy");
  assert.equal(skyDancerArcadeEnemyRole("raider"), "hunter");
  assert.ok(skyDancerArcadeArmorRatio("gunship") > skyDancerArcadeArmorRatio("bomber"));
  assert.ok(skyDancerArcadeEnemyHitRadiusV20("drone") < skyDancerArcadeEnemyHitRadiusV20("gunship"));
});

test("V20 new aircraft have unique procedural silhouettes and retain V19 3D-readable attitude", () => {
  const identities = new Set<string>();
  newKinds.forEach((kind, index) => {
    const airframe = createSkyDancerArcadeEnemyAirframeV18(stage, kind);
    assert.equal(airframe.userData.arcadeEnemyRosterV20, kind);
    assert.equal(airframe.userData.arcadeEnemyLogicalCollisionUnchangedV18, true);
    const identity = String(airframe.userData.arcadeEnemySilhouetteIdentityV18);
    assert.ok(identity.length > 4);
    identities.add(identity);

    const enemy = createSkyDancerArcadeEnemy(stage, snapshot(kind, 700 + index));
    const rig = enemy.getObjectByName("arcade-enemy-v19-readable-attitude-rig");
    assert.ok(rig instanceof THREE.Group, `${kind} missing readable attitude rig`);
    assert.ok(Math.abs(rig.rotation.x) >= .11, `${kind} pitch too flat`);
    assert.ok(Math.abs(rig.rotation.y) >= .03, `${kind} yaw too flat`);
    assert.ok(Math.abs(rig.rotation.z) >= .045, `${kind} roll too flat`);
  });
  assert.equal(identities.size, newKinds.length);
});
''')

print("V20 enemy roster patch applied")
