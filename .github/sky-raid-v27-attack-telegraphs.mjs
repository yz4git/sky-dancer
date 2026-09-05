import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`V27 marker missing: ${label}`);
  return source.replace(marker, replacement);
}

// 1) Expose read-only pre-attack telemetry from the existing flight-combat memory.
{
  const path = "src/sky/SkyDancerFlightCombat.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    'export const SKY_DANCER_V43_MISSILE_MAX_PITCH = 0.62;\n',
    `export const SKY_DANCER_V43_MISSILE_MAX_PITCH = 0.62;\n\nexport type SkyDancerEnemyAttackTelegraphCue = "striker-dive" | "bomber-salvo" | "heavy-charge";\n\nexport interface SkyDancerEnemyAttackTelegraphSnapshot {\n  enemyId: string;\n  sourceClass: "striker" | "bomber" | "heavy";\n  cue: SkyDancerEnemyAttackTelegraphCue;\n  intensity: number;\n  secondsToReady: number;\n  distanceToPlayer: number;\n}\n\nexport interface SkyDancerEnemyAttackTelegraphState {\n  telegraphs: SkyDancerEnemyAttackTelegraphSnapshot[];\n}\n\nexport const SKY_DANCER_ATTACK_TELEGRAPH_EVENT = "sky-dancer-attack-telegraph";\n`,
    "flight telegraph types",
  );

  const cruiseMarker = 'function enemyCruiseSpeed(enemy: CartEnemyState): number {';
  const telegraphHelpers = `function enemyAttackTelegraphs(\n  session: FlightSessionView,\n  state: FlightCombatState,\n): SkyDancerEnemyAttackTelegraphSnapshot[] {\n  const result: SkyDancerEnemyAttackTelegraphSnapshot[] = [];\n  const nodeId = session.location.node.id;\n  const px = session.car.position.x;\n  const pz = session.car.position.z;\n\n  for (const enemy of session.enemies) {\n    if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== nodeId) continue;\n    const doctrine = getSkyDancerSkyRaidEnemyDoctrine(enemy);\n    if (!doctrine) continue;\n    const sourceClass = skyDancerSkyRaidEnemyClassFor(enemy);\n    if (sourceClass !== "striker" && sourceClass !== "bomber" && sourceClass !== "heavy") continue;\n    const memory = state.enemyMemory.get(enemy.id);\n    if (!memory) continue;\n\n    const vertical = getSkyDancerEnemyVerticalSnapshotV43(enemy);\n    const dx = px - enemy.x;\n    const dz = pz - enemy.z;\n    const distance = skyDancerDistance3DV43(enemy.x, vertical.altitudeOffsetMeters, enemy.z, px, 0, pz);\n    const direct = Math.atan2(dx, dz);\n    const aimError = Math.abs(normalizeAngle(direct - enemy.heading));\n\n    if (sourceClass === "striker") {\n      // A striker cue describes the physical knife-pass itself, not a synthetic\n      // attack timer. It appears only while the fighter is actually converging.\n      if (distance < 7.5 || distance > 27 || aimError > 0.88) continue;\n      const proximity = clamp((27 - distance) / 17, 0, 1);\n      const alignment = clamp(1 - aimError / 0.88, 0, 1);\n      const intensity = clamp(0.28 + proximity * 0.44 + alignment * 0.28, 0, 1);\n      result.push({\n        enemyId: enemy.id,\n        sourceClass,\n        cue: "striker-dive",\n        intensity,\n        secondsToReady: 0,\n        distanceToPlayer: distance,\n      });\n      continue;\n    }\n\n    // Bomber and Heavy use the existing missile cooldown as their real charge\n    // clock. The relaxed envelope starts the visual warning just before the\n    // exact launch gate; tryLaunchMissiles remains completely unchanged.\n    const chargeWindow = sourceClass === "heavy" ? 1.08 : 0.92;\n    if (memory.cooldown <= 0.04 || memory.cooldown > chargeWindow) continue;\n    const minRange = doctrine.missileMinRange;\n    const maxRange = doctrine.missileMaxRange;\n    if (distance < Math.max(0, minRange - 3) || distance > maxRange + 7) continue;\n    if (aimError > doctrine.missileAimTolerance + 0.34) continue;\n    const progress = clamp(1 - memory.cooldown / chargeWindow, 0, 1);\n    result.push({\n      enemyId: enemy.id,\n      sourceClass,\n      cue: sourceClass === "heavy" ? "heavy-charge" : "bomber-salvo",\n      intensity: 0.24 + progress * 0.76,\n      secondsToReady: memory.cooldown,\n      distanceToPlayer: distance,\n    });\n  }\n  return result;\n}\n\nexport function getSkyDancerEnemyAttackTelegraphs(\n  session: CartArenaSession,\n): SkyDancerEnemyAttackTelegraphSnapshot[] {\n  const view = session as unknown as FlightSessionView;\n  return enemyAttackTelegraphs(view, stateFor(view)).map((telegraph) => ({ ...telegraph }));\n}\n\n`;
  source = replaceOnce(source, cruiseMarker, telegraphHelpers + cruiseMarker, "flight telegraph helper");

  const broadcastMarker = `function broadcast(session: FlightSessionView, state: FlightCombatState): void {\n  const snapshot = publicState(session, state);\n  latestState = snapshot;\n  if (typeof window !== "undefined") {\n    window.dispatchEvent(new CustomEvent<SkyDancerMissileState>(SKY_DANCER_MISSILE_EVENT, { detail: snapshot }));\n  }\n}`;
  const broadcastReplacement = `function broadcast(session: FlightSessionView, state: FlightCombatState): void {\n  const snapshot = publicState(session, state);\n  latestState = snapshot;\n  if (typeof window !== "undefined") {\n    window.dispatchEvent(new CustomEvent<SkyDancerMissileState>(SKY_DANCER_MISSILE_EVENT, { detail: snapshot }));\n    const telegraphs: SkyDancerEnemyAttackTelegraphState = { telegraphs: enemyAttackTelegraphs(session, state) };\n    window.dispatchEvent(new CustomEvent<SkyDancerEnemyAttackTelegraphState>(SKY_DANCER_ATTACK_TELEGRAPH_EVENT, { detail: telegraphs }));\n  }\n}`;
  source = replaceOnce(source, broadcastMarker, broadcastReplacement, "flight telegraph broadcast");
  write(path, source);
}

// 2) Render class-specific pre-attack hardware without touching simulation geometry.
{
  const path = "src/sky/SkyDancerSkyRaid.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    'import { getSkyDancerTurboState } from "./SkyDancerTurboModel";\n',
    'import { getSkyDancerTurboState } from "./SkyDancerTurboModel";\nimport { getSkyDancerEnemyAttackTelegraphs, type SkyDancerEnemyAttackTelegraphSnapshot } from "./SkyDancerFlightCombat";\n',
    "raid flight telegraph import",
  );
  source = replaceOnce(
    source,
    'const SKY_RAID_ROLE_TRAIL_NAME = "sky-raid-enemy-role-trail";\n',
    'const SKY_RAID_ROLE_TRAIL_NAME = "sky-raid-enemy-role-trail";\nconst SKY_RAID_ATTACK_TELEGRAPH_NAME = "sky-raid-enemy-attack-telegraph";\n',
    "raid telegraph name",
  );

  const trailMarker = `  const trailProfile = skyRaidRoleTrailProfile(className);`;
  const attackGeometry = `  if (className === "striker") {\n    const diveMarker = new THREE.Mesh(\n      new THREE.ConeGeometry(0.16, 0.82, 3, 1, true),\n      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),\n    );\n    diveMarker.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;\n    diveMarker.userData.skyRaidAttackTelegraphCue = "striker-dive";\n    diveMarker.rotation.x = Math.PI / 2;\n    diveMarker.position.set(0, 0.30, 1.30);\n    diveMarker.visible = false;\n    root.add(diveMarker);\n  } else if (className === "bomber") {\n    for (const side of [-1, 1] as const) {\n      const podGlow = new THREE.Mesh(\n        new THREE.SphereGeometry(0.18, 8, 6),\n        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),\n      );\n      podGlow.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;\n      podGlow.userData.skyRaidAttackTelegraphCue = "bomber-salvo";\n      podGlow.position.set(side * 0.74, 0.18, 0.44);\n      podGlow.visible = false;\n      root.add(podGlow);\n    }\n  } else if (className === "heavy") {\n    const coreGlow = new THREE.Mesh(\n      new THREE.IcosahedronGeometry(0.22, 1),\n      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),\n    );\n    coreGlow.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;\n    coreGlow.userData.skyRaidAttackTelegraphCue = "heavy-charge";\n    coreGlow.position.set(0, 0.48, 0.92);\n    coreGlow.visible = false;\n    root.add(coreGlow);\n    const chargeRing = new THREE.Mesh(\n      new THREE.TorusGeometry(0.34, 0.035, 5, 18),\n      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),\n    );\n    chargeRing.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;\n    chargeRing.userData.skyRaidAttackTelegraphCue = "heavy-charge";\n    chargeRing.position.set(0, 0.48, 0.95);\n    chargeRing.visible = false;\n    root.add(chargeRing);\n  }\n\n`;
  source = replaceOnce(source, trailMarker, attackGeometry + trailMarker, "raid attack geometry");

  const applyMarker = `function applySkyRaidEnemyRoleReadability(\n  demo: RaidWebGLDemo,\n  snapshot: ReturnType<CartArenaSession["snapshot"]>,\n): void {\n  for (const enemySnapshot of snapshot.enemies) {`;
  const applyReplacement = `function applySkyRaidAttackTelegraphVisual(\n  kit: THREE.Group,\n  telegraph: SkyDancerEnemyAttackTelegraphSnapshot | null,\n  pulseClock: number,\n): void {\n  const objects = kit.children.filter((child) => child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME);\n  const active = Boolean(telegraph) && objects.length > 0;\n  const intensity = telegraph?.intensity ?? 0;\n  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;\n  for (const object of objects) {\n    object.visible = active;\n    const scale = active ? 0.82 + intensity * 0.46 + pulse * 0.12 : 1;\n    object.scale.setScalar(scale);\n    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {\n      object.material.opacity = active ? clamp(0.18 + intensity * 0.62 + pulse * 0.12, 0, 0.96) : 0;\n    }\n  }\n  kit.userData.skyRaidAttackTelegraphCue = telegraph?.cue ?? "";\n  kit.userData.skyRaidAttackTelegraphIntensity = intensity;\n  kit.userData.skyRaidAttackTelegraphVisible = active;\n  kit.userData.skyRaidAttackTelegraphSeconds = telegraph?.secondsToReady ?? 0;\n}\n\nfunction applySkyRaidEnemyRoleReadability(\n  demo: RaidWebGLDemo,\n  snapshot: ReturnType<CartArenaSession["snapshot"]>,\n): void {\n  const attackTelegraphs = new Map(\n    getSkyDancerEnemyAttackTelegraphs(demo.session).map((telegraph) => [telegraph.enemyId, telegraph] as const),\n  );\n  const pulseClock = typeof performance !== "undefined" ? performance.now() * 0.001 : 0;\n  for (const enemySnapshot of snapshot.enemies) {`;
  source = replaceOnce(source, applyMarker, applyReplacement, "raid telegraph application");

  const roleDataMarker = `    group.userData.skyRaidRoleClass = roleClass;\n    group.userData.skyRaidRoleSignature = kit.userData.skyRaidRoleSignature;`;
  const roleDataReplacement = `    group.userData.skyRaidRoleClass = roleClass;\n    group.userData.skyRaidRoleSignature = kit.userData.skyRaidRoleSignature;\n    const attackTelegraph = attackTelegraphs.get(enemyState.id) ?? null;\n    applySkyRaidAttackTelegraphVisual(kit, attackTelegraph, pulseClock);\n    group.userData.skyRaidAttackTelegraphCue = attackTelegraph?.cue ?? "";`;
  source = replaceOnce(source, roleDataMarker, roleDataReplacement, "raid telegraph per enemy");

  const auditMarker = `            kitVisible: kit?.visible === true,\n            kitChildren: kit?.children.length ?? 0,`;
  const auditReplacement = `            kitVisible: kit?.visible === true,\n            kitChildren: kit?.children.length ?? 0,\n            attackCue: String(kit?.userData.skyRaidAttackTelegraphCue ?? ""),\n            attackIntensity: Number(kit?.userData.skyRaidAttackTelegraphIntensity ?? 0),\n            attackVisible: kit?.userData.skyRaidAttackTelegraphVisible === true,\n            attackSeconds: Number(kit?.userData.skyRaidAttackTelegraphSeconds ?? 0),`;
  source = replaceOnce(source, auditMarker, auditReplacement, "raid telegraph webdriver bridge");
  write(path, source);
}

// 3) Put the same pre-attack cue on the currently tracked target HUD.
{
  const path = "app/SkyDancerHudV45.tsx";
  let source = read(path);
  source = replaceOnce(
    source,
    '} from "../src/sky/presentation/SkyDancerV45DecisionHierarchyPass";\n',
    '} from "../src/sky/presentation/SkyDancerV45DecisionHierarchyPass";\nimport {\n  SKY_DANCER_ATTACK_TELEGRAPH_EVENT,\n  type SkyDancerEnemyAttackTelegraphSnapshot,\n  type SkyDancerEnemyAttackTelegraphState,\n} from "../src/sky/SkyDancerFlightCombat";\n',
    "hud telegraph import",
  );

  const cueFnMarker = `function clamp(value: number, min: number, max: number): number {`;
  const cueFn = `function skyRaidAttackTelegraphLabel(cue: SkyDancerEnemyAttackTelegraphSnapshot["cue"]): string {\n  switch (cue) {\n    case "striker-dive": return "DIVE BREAK";\n    case "bomber-salvo": return "SALVO CHARGE";\n    case "heavy-charge": return "HEAVY CHARGE";\n  }\n}\n\n`;
  source = replaceOnce(source, cueFnMarker, cueFn + cueFnMarker, "hud telegraph label");

  source = replaceOnce(
    source,
    '  const [hitPulse, setHitPulse] = useState(false);\n',
    '  const [hitPulse, setHitPulse] = useState(false);\n  const [attackTelegraphs, setAttackTelegraphs] = useState<SkyDancerEnemyAttackTelegraphSnapshot[]>([]);\n',
    "hud telegraph state",
  );

  const effectMarker = `  const bossActive = Boolean(decision?.bossActive);`;
  const effectInsert = `  useEffect(() => {\n    const onTelegraph = (event: Event) => {\n      const detail = (event as CustomEvent<SkyDancerEnemyAttackTelegraphState>).detail;\n      setAttackTelegraphs(detail?.telegraphs ?? []);\n    };\n    window.addEventListener(SKY_DANCER_ATTACK_TELEGRAPH_EVENT, onTelegraph);\n    return () => window.removeEventListener(SKY_DANCER_ATTACK_TELEGRAPH_EVENT, onTelegraph);\n  }, []);\n\n  const bossActive = Boolean(decision?.bossActive);`;
  source = replaceOnce(source, effectMarker, effectInsert, "hud telegraph listener");

  const lockedMarker = `  const locked = Boolean(decision?.targetEnemyId);`;
  const lockedReplacement = `  const locked = Boolean(decision?.targetEnemyId);\n  const targetTelegraph = decision?.targetEnemyId\n    ? attackTelegraphs.find((telegraph) => telegraph.enemyId === decision.targetEnemyId) ?? null\n    : null;`;
  source = replaceOnce(source, lockedMarker, lockedReplacement, "hud target telegraph");

  const cssMarker = `      .skyDancerV45Action {\n`;
  const cssInsert = `      .skyDancerV27Telegraph {\n        color: #ffe6a0;\n        font-size: .86em;\n        font-weight: 1000;\n        letter-spacing: .13em;\n        text-shadow: 0 0 8px currentColor;\n        animation: skyDancerV27ThreatPulse 360ms ease-in-out infinite;\n      }\n      .skyDancerV45Lock[data-class="striker"] .skyDancerV27Telegraph { color: #ffb66f; }\n      .skyDancerV45Lock[data-class="bomber"] .skyDancerV27Telegraph { color: #ffdc72; }\n      .skyDancerV45Lock[data-class="heavy"] .skyDancerV27Telegraph { color: #ff8589; }\n      @keyframes skyDancerV27ThreatPulse {\n        0%,100% { opacity: .56; transform: scale(.96); }\n        50% { opacity: 1; transform: scale(1.03); }\n      }\n      .skyDancerV45Action {\n`;
  source = replaceOnce(source, cssMarker, cssInsert, "hud telegraph css");

  source = replaceOnce(
    source,
    '        data-role-cue={skyRaidRoleCue(decision.className)}\n',
    '        data-role-cue={skyRaidRoleCue(decision.className)}\n        data-threat-cue={targetTelegraph?.cue ?? ""}\n',
    "hud telegraph dataset",
  );

  const actionMarker = `        <span className="skyDancerV45Action"><b className="skyDancerV45Role" aria-label="Sky Raid target role">{skyRaidRoleCue(decision.className)}</b>{decision.action}</span>`;
  const actionReplacement = `        {targetTelegraph && (\n          <span className="skyDancerV27Telegraph" aria-label="Sky Raid pre-attack cue">\n            {skyRaidAttackTelegraphLabel(targetTelegraph.cue)}\n          </span>\n        )}\n        <span className="skyDancerV45Action"><b className="skyDancerV45Role" aria-label="Sky Raid target role">{skyRaidRoleCue(decision.className)}</b>{decision.action}</span>`;
  source = replaceOnce(source, actionMarker, actionReplacement, "hud telegraph rendering");
  write(path, source);
}

// 4) Lock the V27 contract into the fast suite.
{
  const path = "tests/sky-sky-raid.test.ts";
  let source = read(path);
  if (!source.includes('SKY RAID V27 exposes real pre-attack timing without changing launch rules')) {
    source += `\n\ntest("SKY RAID V27 exposes real pre-attack timing without changing launch rules", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");\n  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");\n  assert.match(flightSource, /SKY_DANCER_ATTACK_TELEGRAPH_EVENT/);\n  assert.match(flightSource, /striker-dive/);\n  assert.match(flightSource, /bomber-salvo/);\n  assert.match(flightSource, /heavy-charge/);\n  assert.match(flightSource, /memory\\.cooldown <= 0\\.04/);\n  assert.match(flightSource, /doctrine\\.missileAimTolerance \\+ 0\\.34/);\n  assert.match(flightSource, /tryLaunchMissiles\\(session, state\\)/);\n  assert.match(raidSource, /SKY_RAID_ATTACK_TELEGRAPH_NAME/);\n  assert.match(raidSource, /applySkyRaidAttackTelegraphVisual/);\n  assert.match(raidSource, /attackCue/);\n  assert.match(hudSource, /DIVE BREAK/);\n  assert.match(hudSource, /SALVO CHARGE/);\n  assert.match(hudSource, /HEAVY CHARGE/);\n  assert.match(hudSource, /data-threat-cue=/);\n});\n`;
  }
  write(path, source);
}

// 5) Browser audit: wait for natural V27 cues in the three role-defining acts.
write("scripts/webgl-sky-raid-telegraphs-v27.mjs", `import fs from "node:fs";\nimport path from "node:path";\nimport { pathToFileURL } from "node:url";\n\nconst playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;\nconst playwrightModule = await import(playwrightUrl);\nconst chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;\nif (!chromium) throw new Error("playwright chromium export missing");\n\nconst out = "artifacts/sky-raid-telegraphs-v27";\nfs.mkdirSync(out, { recursive: true });\nconst ACTS = [\n  { elapsed: 27, actId: "red-canyon", roleClass: "striker", cue: "striker-dive" },\n  { elapsed: 51, actId: "cloud-fleet", roleClass: "bomber", cue: "bomber-salvo" },\n  { elapsed: 99, actId: "prism-citadel", roleClass: "heavy", cue: "heavy-charge" },\n];\nlet browser;\nlet context;\nlet page;\nconst watchdog = setTimeout(() => process.exit(124), 150000);\n\ntry {\n  browser = await chromium.launch({ headless: true, executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });\n  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });\n  page = await context.newPage();\n  const errors = [];\n  page.on("pageerror", (error) => errors.push(String(error)));\n  page.on("console", (message) => { if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text()); });\n  await page.goto(\`http://127.0.0.1:4173?menu=1&v27=\${Date.now()}\`, { waitUntil: "networkidle", timeout: 30000 });\n  await page.locator("button").filter({ hasText: /^\\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });\n  await page.waitForTimeout(100);\n  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });\n  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });\n  await page.waitForFunction(() => typeof window.__skyRaidGetRoleReadability === "function", null, { timeout: 12000 });\n\n  const results = [];\n  for (let i = 0; i < ACTS.length; i += 1) {\n    const spec = ACTS[i];\n    await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, spec.elapsed);\n    await page.waitForFunction((actId) => document.documentElement.dataset.skyRaidAct === actId, spec.actId, { timeout: 7000, polling: 50 });\n    await page.waitForFunction(({ roleClass }) => {\n      const roles = window.__skyRaidGetRoleReadability?.().roles ?? [];\n      return roles.some((role) => role.roleClass === roleClass && role.kitVisible);\n    }, { roleClass: spec.roleClass }, { timeout: 7000, polling: 80 });\n    await page.waitForFunction(({ roleClass, cue }) => {\n      const roles = window.__skyRaidGetRoleReadability?.().roles ?? [];\n      return roles.some((role) => role.roleClass === roleClass && role.attackCue === cue && role.attackVisible && role.attackIntensity > 0.2);\n    }, { roleClass: spec.roleClass, cue: spec.cue }, { timeout: 18000, polling: 80 });\n    const diagnostic = await page.evaluate(({ roleClass }) => {\n      const roles = window.__skyRaidGetRoleReadability?.().roles ?? [];\n      const role = roles.find((candidate) => candidate.roleClass === roleClass && candidate.attackVisible) ?? null;\n      const lock = document.querySelector('[aria-label="V45 target decision"]');\n      return {\n        actId: document.documentElement.dataset.skyRaidAct ?? "",\n        role,\n        lock: lock ? { className: lock.getAttribute("data-class") ?? "", threatCue: lock.getAttribute("data-threat-cue") ?? "", text: (lock.textContent ?? "").replace(/\\s+/g, " ").trim() } : null,\n      };\n    }, { roleClass: spec.roleClass });\n    results.push({ ...spec, ...diagnostic });\n    await page.screenshot({ path: path.join(out, \`0\${i + 1}-\${spec.actId}-\${spec.roleClass}.png\`), timeout: 6000 });\n  }\n\n  if (errors.length) throw new Error(\`browser errors: \${JSON.stringify(errors)}\`);\n  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ viewport: { width: 844, height: 390, dpr: 2 }, results, errors }, null, 2));\n  console.log("SKY RAID V27 TELEGRAPH PASS", JSON.stringify(results));\n} catch (error) {\n  try { fs.writeFileSync(path.join(out, "failure.txt"), String(error?.stack ?? error)); await page?.screenshot({ path: path.join(out, "failure.png"), timeout: 6000 }); } catch {}\n  throw error;\n} finally {\n  clearTimeout(watchdog);\n  try { await page?.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; }); } catch {}\n  await context?.close().catch(() => {});\n  await browser?.close().catch(() => {});\n}\n`);

console.log("SKY RAID V27 attack telegraph patch applied");
