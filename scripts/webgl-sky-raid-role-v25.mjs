import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-role-v25";
fs.mkdirSync(out, { recursive: true });

const ACTS = [
  { elapsed: 0.12, actId: "dawn-city", package: "CITY INTERCEPTORS", attackStyle: "INTERCEPT", requiredClasses: ["standard", "striker", "orbiter", "drifter"] },
  { elapsed: 24.12, actId: "red-canyon", package: "CANYON KNIVES", attackStyle: "KNIFE", requiredClasses: ["drifter", "striker", "standard"] },
  { elapsed: 48.12, actId: "cloud-fleet", package: "FLEET ESCORT", attackStyle: "ESCORT", requiredClasses: ["orbiter", "bomber", "heavy", "standard"] },
  { elapsed: 72.12, actId: "storm-carrier", package: "THUNDER HUNTERS", attackStyle: "PINCER", requiredClasses: ["striker", "drifter", "bomber", "standard"] },
  { elapsed: 96.12, actId: "prism-citadel", package: "PRISM SIEGE WING", attackStyle: "SIEGE", requiredClasses: ["heavy", "orbiter", "bomber", "striker"] },
];

let browser;
let context;
let page;
const watchdog = setTimeout(() => process.exit(124), 90000);

function countByClass(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text()); });

  await page.goto(`http://127.0.0.1:4173?menu=1&roleAudit=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyRaidGetRoleReadability === "function", null, { timeout: 12000 });

  const results = [];
  const signatureByClass = new Map();

  for (let index = 0; index < ACTS.length; index += 1) {
    const spec = ACTS[index];
    await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, spec.elapsed);
    await page.waitForFunction(
      ({ actId, packageName }) => {
        const root = document.documentElement.dataset;
        return root.skyRaidAct === actId && root.skyRaidEnemyPackage === packageName;
      },
      { actId: spec.actId, packageName: spec.package },
      { timeout: 5000, polling: 50 },
    );
    await page.waitForTimeout(550);

    const diagnostics = await page.evaluate(() => {
      const root = document.documentElement.dataset;
      const role = window.__skyRaidGetRoleReadability?.() ?? null;
      const camera = window.__skyRaidGetCameraPolish?.() ?? null;
      const cue = document.querySelector('[data-sd-enemy-package-cue="true"]');
      return {
        actId: root.skyRaidAct ?? "",
        enemyPackage: root.skyRaidEnemyPackage ?? "",
        enemyAttackStyle: root.skyRaidEnemyAttackStyle ?? "",
        enemyActive: Number(root.skyRaidEnemyActive ?? 0),
        enemyClasses: (root.skyRaidEnemyClasses ?? "").split(",").filter(Boolean),
        cueText: cue?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        role,
        camera,
      };
    });

    const failures = [];
    if (diagnostics.actId !== spec.actId) failures.push(`act=${diagnostics.actId}`);
    if (diagnostics.enemyPackage !== spec.package) failures.push(`package=${diagnostics.enemyPackage}`);
    if (diagnostics.enemyAttackStyle.toUpperCase() !== spec.attackStyle) failures.push(`attack=${diagnostics.enemyAttackStyle}`);
    if (!diagnostics.cueText.includes(spec.package)) failures.push(`cue-missing-package=${diagnostics.cueText}`);
    if (!diagnostics.cueText.includes(spec.attackStyle)) failures.push(`cue-missing-style=${diagnostics.cueText}`);
    if (!diagnostics.role) failures.push("role-hook-missing");

    const roles = diagnostics.role?.roles ?? [];
    if (roles.length !== diagnostics.enemyActive) failures.push(`role-count=${roles.length} active=${diagnostics.enemyActive}`);
    const roleClasses = roles.map((entry) => entry.roleClass).sort();
    const datasetClasses = [...diagnostics.enemyClasses].sort();
    if (JSON.stringify(roleClasses) !== JSON.stringify(datasetClasses)) failures.push(`role-classes=${JSON.stringify(roleClasses)} dataset=${JSON.stringify(datasetClasses)}`);
    for (const required of spec.requiredClasses) if (!roleClasses.includes(required)) failures.push(`missing-role-class=${required}`);
    for (const entry of roles) {
      if (!entry.kitVisible) failures.push(`hidden-kit=${entry.id}`);
      if (entry.kitChildren < 1) failures.push(`empty-kit=${entry.id}`);
      if (!entry.roleSignature) failures.push(`missing-signature=${entry.id}`);
      const prior = signatureByClass.get(entry.roleClass);
      if (prior && prior !== entry.roleSignature) failures.push(`unstable-signature=${entry.roleClass}:${prior}/${entry.roleSignature}`);
      signatureByClass.set(entry.roleClass, entry.roleSignature);
    }

    if (!diagnostics.camera?.playerVisible) failures.push("player-not-visible");
    if (Number(diagnostics.camera?.enemyVisible ?? 0) < 2) failures.push(`enemyVisible=${diagnostics.camera?.enemyVisible}`);
    if (Number(diagnostics.camera?.enemyVisible ?? 0) > 8) failures.push(`screen-clutter=${diagnostics.camera?.enemyVisible}`);
    if (Number(diagnostics.camera?.enemyCombatLane ?? 0) < 1) failures.push(`combatLane=${diagnostics.camera?.enemyCombatLane}`);

    const result = {
      ...spec,
      cueText: diagnostics.cueText,
      enemyActive: diagnostics.enemyActive,
      classCounts: countByClass(roleClasses),
      roles,
      enemyVisible: diagnostics.camera?.enemyVisible ?? 0,
      enemyCombatLane: diagnostics.camera?.enemyCombatLane ?? 0,
      failures,
    };
    results.push(result);
    fs.writeFileSync(path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.json`), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.png`), timeout: 6000 });
    if (failures.length) throw new Error(`${spec.actId} V25 role audit failed: ${failures.join("; ")}`);
  }

  await page.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; });

  const expectedClasses = ["standard", "striker", "orbiter", "drifter", "bomber", "heavy"];
  for (const className of expectedClasses) if (!signatureByClass.has(className)) throw new Error(`missing global role class ${className}`);
  const signatures = expectedClasses.map((className) => signatureByClass.get(className));
  if (new Set(signatures).size !== expectedClasses.length) throw new Error(`role signatures not unique: ${JSON.stringify(Object.fromEntries(signatureByClass))}`);
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);

  const summary = {
    viewport: { width: 844, height: 390, dpr: 2 },
    actCount: results.length,
    uniqueRoleSignatures: new Set(signatures).size,
    roleSignatures: Object.fromEntries(signatureByClass),
    results: results.map(({ actId, package: enemyPackage, attackStyle, cueText, enemyActive, classCounts, enemyVisible, enemyCombatLane }) => ({
      actId, enemyPackage, attackStyle, cueText, enemyActive, classCounts, enemyVisible, enemyCombatLane,
    })),
    errors,
  };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("SKY RAID ROLE V25 PASS", JSON.stringify(summary));
} catch (error) {
  try {
    fs.writeFileSync(path.join(out, "failure.txt"), `${error?.stack ?? error}\n`);
    await page?.screenshot({ path: path.join(out, "failure.png"), timeout: 6000 });
  } catch {}
  throw error;
} finally {
  clearTimeout(watchdog);
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}
