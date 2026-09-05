import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, source) {
  fs.writeFileSync(path, source);
}

function replaceOnce(path, marker, replacement, label) {
  const source = read(path);
  if (!source.includes(marker)) throw new Error(`${label} marker missing in ${path}`);
  write(path, source.replace(marker, replacement));
}

// V26: keep V25's role geometry and add short class-colored exhaust ribbons.
replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  'const SKY_RAID_ROLE_KIT_NAME = "sky-raid-enemy-role-kit";',
  'const SKY_RAID_ROLE_KIT_NAME = "sky-raid-enemy-role-kit";\nconst SKY_RAID_ROLE_TRAIL_NAME = "sky-raid-enemy-role-trail";',
  "role trail constant",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `function buildSkyRaidEnemyRoleKit(\n  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,\n): THREE.Group {`,
  `function skyRaidRoleTrailProfile(\n  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,\n): { signature: string; offsets: readonly number[]; length: number; radius: number; opacity: number } {\n  switch (className) {\n    case "striker": return { signature: "orange-lance", offsets: [-0.34, 0.34], length: 1.05, radius: 0.09, opacity: 0.45 };\n    case "orbiter": return { signature: "cyan-twin", offsets: [-0.58, 0.58], length: 0.72, radius: 0.075, opacity: 0.34 };\n    case "drifter": return { signature: "violet-wide", offsets: [-0.52, 0.52], length: 0.64, radius: 0.07, opacity: 0.30 };\n    case "bomber": return { signature: "gold-twin", offsets: [-0.72, 0.72], length: 0.92, radius: 0.11, opacity: 0.42 };\n    case "heavy": return { signature: "red-thrust", offsets: [-0.46, 0.46], length: 0.58, radius: 0.13, opacity: 0.48 };\n    case "standard": return { signature: "cyan-short", offsets: [0], length: 0.52, radius: 0.07, opacity: 0.30 };\n  }\n}\n\nfunction buildSkyRaidEnemyRoleKit(\n  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,\n): THREE.Group {`,
  "role trail profile",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  }\n  root.traverse((object) => {\n    if (object instanceof THREE.Mesh) {`,
  `  }\n\n  const trailProfile = skyRaidRoleTrailProfile(className);\n  root.userData.skyRaidRoleTrailSignature = trailProfile.signature;\n  for (const offset of trailProfile.offsets) {\n    const trail = new THREE.Mesh(\n      new THREE.ConeGeometry(trailProfile.radius, trailProfile.length, 7, 1, true),\n      new THREE.MeshBasicMaterial({\n        color,\n        transparent: true,\n        opacity: trailProfile.opacity,\n        blending: THREE.AdditiveBlending,\n        depthWrite: false,\n        toneMapped: false,\n      }),\n    );\n    trail.name = SKY_RAID_ROLE_TRAIL_NAME;\n    trail.rotation.x = -Math.PI / 2;\n    trail.position.set(offset, 0.20, -0.72 - trailProfile.length * 0.46);\n    trail.renderOrder = 1010;\n    root.add(trail);\n  }\n\n  root.traverse((object) => {\n    if (object instanceof THREE.Mesh) {`,
  "role trail geometry",
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `            roleSignature: String(kit?.userData.skyRaidRoleSignature ?? ""),\n            kitVisible: kit?.visible === true,\n            kitChildren: kit?.children.length ?? 0,`,
  `            roleSignature: String(kit?.userData.skyRaidRoleSignature ?? ""),\n            trailSignature: String(kit?.userData.skyRaidRoleTrailSignature ?? ""),\n            trailCount: kit?.children.filter((child) => child.name === SKY_RAID_ROLE_TRAIL_NAME).length ?? 0,\n            trailVisible: kit?.children.filter((child) => child.name === SKY_RAID_ROLE_TRAIL_NAME).every((child) => child.visible) ?? false,\n            kitVisible: kit?.visible === true,\n            kitChildren: kit?.children.length ?? 0,`,
  "role audit trail diagnostics",
);

// V26: put a compact role word next to the existing timing instruction.
replaceOnce(
  "app/SkyDancerHudV45.tsx",
  `function clamp(value: number, min: number, max: number): number {`,
  `function skyRaidRoleCue(className: SkyDancerCombatDecisionSnapshotV45["className"]): string {\n  switch (className) {\n    case "boss": return "FINAL THREAT";\n    case "heavy": return "ARMORED";\n    case "striker": return "FAST DIVE";\n    case "orbiter": return "VERTICAL";\n    case "bomber": return "LONG RANGE";\n    case "drifter": return "JINKER";\n    case "standard": return "INTERCEPT";\n    default: return "TRACK";\n  }\n}\n\nfunction clamp(value: number, min: number, max: number): number {`,
  "HUD role cue helper",
);

replaceOnce(
  "app/SkyDancerHudV45.tsx",
  `      .skyDancerV45Altitude { color: #d9f7ff; }\n      .skyDancerV45Range { opacity: .62; font-size: .88em; }\n      .skyDancerV45Action {`,
  `      .skyDancerV45Altitude { color: #d9f7ff; }\n      .skyDancerV45Range { opacity: .62; font-size: .88em; }\n      .skyDancerV45Role {\n        display: inline-block;\n        margin-right: 4px;\n        padding: 1px 4px;\n        border: 1px solid currentColor;\n        border-radius: 999px;\n        font-size: .82em;\n        font-weight: 1000;\n        letter-spacing: .09em;\n        opacity: .92;\n      }\n      .skyDancerV45Lock[data-class="striker"] .skyDancerV45Role { color: #ffb66f; }\n      .skyDancerV45Lock[data-class="orbiter"] .skyDancerV45Role { color: #75ecff; }\n      .skyDancerV45Lock[data-class="drifter"] .skyDancerV45Role { color: #d2a9ff; }\n      .skyDancerV45Lock[data-class="bomber"] .skyDancerV45Role { color: #ffdc72; }\n      .skyDancerV45Lock[data-class="heavy"] .skyDancerV45Role { color: #ff8589; }\n      .skyDancerV45Lock[data-class="standard"] .skyDancerV45Role { color: #a8efff; }\n      .skyDancerV45Action {`,
  "HUD role cue styles",
);

replaceOnce(
  "app/SkyDancerHudV45.tsx",
  `        data-ready={decision.vulnerable ? "true" : "false"}\n        aria-label="Sky Raid target reticle"`,
  `        data-ready={decision.vulnerable ? "true" : "false"}\n        data-class={decision.className ?? "none"}\n        aria-label="Sky Raid target reticle"`,
  "reticle role class",
);

replaceOnce(
  "app/SkyDancerHudV45.tsx",
  `        data-class={decision.className ?? "none"}\n        aria-label="V45 target decision"`,
  `        data-class={decision.className ?? "none"}\n        data-role-cue={skyRaidRoleCue(decision.className)}\n        aria-label="V45 target decision"`,
  "lock role cue dataset",
);

replaceOnce(
  "app/SkyDancerHudV45.tsx",
  `        <span className="skyDancerV45Action">{decision.action}</span>`,
  `        <span className="skyDancerV45Action"><b className="skyDancerV45Role" aria-label="Sky Raid target role">{skyRaidRoleCue(decision.className)}</b>{decision.action}</span>`,
  "lock role cue content",
);

// V26: carry the firing aircraft role on every enemy missile snapshot.
replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `import { getSkyDancerSkyRaidEnemyDoctrine } from "./SkyDancerSkyRaidEnemyDoctrine";`,
  `import {\n  getSkyDancerSkyRaidEnemyDoctrine,\n  skyDancerSkyRaidEnemyClassFor,\n} from "./SkyDancerSkyRaidEnemyDoctrine";`,
  "missile source class import",
);

replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `export interface SkyDancerMissileSnapshot {\n  id: number;`,
  `export type SkyDancerMissileSourceClass = "boss" | ReturnType<typeof skyDancerSkyRaidEnemyClassFor>;\n\nexport interface SkyDancerMissileSnapshot {\n  id: number;`,
  "missile source class type",
);

replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `  sourceEnemyId: string;\n  sourceKind: CartEnemyState["kind"];\n  x: number;`,
  `  sourceEnemyId: string;\n  sourceKind: CartEnemyState["kind"];\n  sourceClass: SkyDancerMissileSourceClass;\n  x: number;`,
  "missile source class snapshot",
);

replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `function initialCooldown(enemy: CartEnemyState): number {`,
  `function missileSourceClass(enemy: CartEnemyState): SkyDancerMissileSourceClass {\n  return enemy.kind === "boss" ? "boss" : skyDancerSkyRaidEnemyClassFor(enemy);\n}\n\nfunction initialCooldown(enemy: CartEnemyState): number {`,
  "missile source class helper",
);

replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `      sourceEnemyId: missile.sourceEnemyId,\n      sourceKind: missile.sourceKind,\n      x: missile.x,`,
  `      sourceEnemyId: missile.sourceEnemyId,\n      sourceKind: missile.sourceKind,\n      sourceClass: missile.sourceClass,\n      x: missile.x,`,
  "public missile source class",
);

replaceOnce(
  "src/sky/SkyDancerFlightCombat.ts",
  `      sourceEnemyId: enemy.id,\n      sourceKind: enemy.kind,\n      x: enemy.x + Math.sin(enemy.heading) * muzzle,`,
  `      sourceEnemyId: enemy.id,\n      sourceKind: enemy.kind,\n      sourceClass: missileSourceClass(enemy),\n      x: enemy.x + Math.sin(enemy.heading) * muzzle,`,
  "launched missile source class",
);

// V26: missile warning names the threat source instead of showing one generic alert.
replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `  type SkyDancerMissileState,\n} from "../src/sky/SkyDancerFlightCombat";`,
  `  type SkyDancerMissileSourceClass,\n  type SkyDancerMissileState,\n} from "../src/sky/SkyDancerFlightCombat";`,
  "warning source class import",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `export default function SkyDancerCombatPolish() {\n  const [warning, setWarning] = useState<{ count: number; distance: number } | null>(null);`,
  `function missileSourceCue(sourceClass: SkyDancerMissileSourceClass): string {\n  switch (sourceClass) {\n    case "boss": return "BOSS MISSILE";\n    case "heavy": return "HEAVY MISSILE";\n    case "bomber": return "BOMBER SALVO";\n    case "striker": return "STRIKER MISSILE";\n    case "orbiter": return "ORBITER MISSILE";\n    case "drifter": return "JINKER MISSILE";\n    case "standard": return "MISSILE WARNING";\n  }\n}\n\nfunction missileSourceColor(sourceClass: SkyDancerMissileSourceClass): string {\n  switch (sourceClass) {\n    case "boss": return "#ff6f68";\n    case "heavy": return "#ff8589";\n    case "bomber": return "#ffdc72";\n    case "striker": return "#ffb66f";\n    case "orbiter": return "#75ecff";\n    case "drifter": return "#d2a9ff";\n    case "standard": return "#ffd67a";\n  }\n}\n\nexport default function SkyDancerCombatPolish() {\n  const [warning, setWarning] = useState<{ count: number; distance: number; sourceClass: SkyDancerMissileSourceClass } | null>(null);`,
  "warning role helpers",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `      let nearest = Number.POSITIVE_INFINITY;\n      for (const missile of detail.missiles) nearest = Math.min(nearest, missile.distanceToPlayer);\n      if (!Number.isFinite(nearest) || nearest >= 30) {\n        setWarning(null);\n        return;\n      }\n      const closeCount = detail.missiles.filter((missile) => missile.distanceToPlayer < 30).length;\n      setWarning({ count: Math.max(detail.incomingCount, closeCount, 1), distance: nearest });`,
  `      let nearestMissile: SkyDancerMissileState["missiles"][number] | null = null;\n      for (const missile of detail.missiles) {\n        if (!nearestMissile || missile.distanceToPlayer < nearestMissile.distanceToPlayer) nearestMissile = missile;\n      }\n      if (!nearestMissile || !Number.isFinite(nearestMissile.distanceToPlayer) || nearestMissile.distanceToPlayer >= 30) {\n        setWarning(null);\n        return;\n      }\n      const closeCount = detail.missiles.filter((missile) => missile.distanceToPlayer < 30).length;\n      setWarning({\n        count: Math.max(detail.incomingCount, closeCount, 1),\n        distance: nearestMissile.distanceToPlayer,\n        sourceClass: nearestMissile.sourceClass,\n      });`,
  "warning nearest source role",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `  const urgent = warning.distance < 12;\n  return (`,
  `  const urgent = warning.distance < 12;\n  const roleColor = missileSourceColor(warning.sourceClass);\n  const warningColor = urgent ? "#ff8b82" : roleColor;\n  const warningBackground = urgent ? "rgba(80,8,12,.62)" : "rgba(18,30,39,.58)";\n  const warningLabel = missileSourceCue(warning.sourceClass);\n  return (`,
  "warning role presentation variables",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `      aria-label="Missile warning"\n      aria-live="assertive"`,
  `      aria-label="Missile warning"\n      data-source-class={warning.sourceClass}\n      aria-live="assertive"`,
  "warning source dataset",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `        border: \`1px solid \${urgent ? "rgba(255,86,76,.9)" : "rgba(255,194,84,.82)"}\`,\n        borderRadius: 6,\n        background: urgent ? "rgba(80,8,12,.62)" : "rgba(54,35,6,.48)",\n        color: urgent ? "#ff8b82" : "#ffd67a",`,
  `        border: \`1px solid \${warningColor}\`,\n        borderRadius: 6,\n        background: warningBackground,\n        color: warningColor,`,
  "warning role color",
);

replaceOnce(
  "app/SkyDancerCombatPolish.tsx",
  `      MISSILE WARNING · {warning.count} INBOUND · {Math.max(1, Math.round(warning.distance))}m`,
  `      {warningLabel} · {warning.count} INBOUND · {Math.max(1, Math.round(warning.distance))}m`,
  "warning role label",
);

const testPath = "tests/sky-sky-raid.test.ts";
let tests = read(testPath);
if (tests.includes("SKY RAID V26 carries threat identity")) throw new Error("V26 test already present");
tests += `\n\ntest("SKY RAID V26 carries threat identity from airframe trail through lock HUD and missile warning", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");\n  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");\n  const polishSource = readFileSync(new URL("../app/SkyDancerCombatPolish.tsx", import.meta.url), "utf8");\n  assert.match(raidSource, /SKY_RAID_ROLE_TRAIL_NAME/);\n  for (const signature of ["orange-lance", "cyan-twin", "violet-wide", "gold-twin", "red-thrust", "cyan-short"]) {\n    assert.match(raidSource, new RegExp(signature));\n  }\n  assert.match(raidSource, /trailSignature/);\n  assert.match(hudSource, /FAST DIVE/);\n  assert.match(hudSource, /LONG RANGE/);\n  assert.match(hudSource, /ARMORED/);\n  assert.match(hudSource, /data-role-cue=/);\n  assert.match(flightSource, /SkyDancerMissileSourceClass/);\n  assert.match(flightSource, /sourceClass: missileSourceClass\(enemy\)/);\n  assert.match(polishSource, /BOMBER SALVO/);\n  assert.match(polishSource, /HEAVY MISSILE/);\n  assert.match(polishSource, /data-source-class=/);\n});\n`;
write(testPath, tests);

console.log("SKY RAID V26 threat readability patch applied");
