import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-five-act-v24";
fs.mkdirSync(out, { recursive: true });

const ACTS = [
  { elapsed: 3, actId: "dawn-city", package: "CITY INTERCEPTORS", attackStyle: "intercept", doctrine: "GATE SPEAR", worldStyle: "city", requiredClasses: ["standard"], forbiddenClasses: ["heavy", "bomber"], minClassVariety: 3 },
  { elapsed: 27, actId: "red-canyon", package: "CANYON KNIVES", attackStyle: "knife", doctrine: "CANYON SCISSOR", worldStyle: "mountains", requiredClasses: ["drifter", "striker"], forbiddenClasses: ["heavy"], minClassVariety: 3 },
  { elapsed: 51, actId: "cloud-fleet", package: "FLEET ESCORT", attackStyle: "escort", doctrine: "ESCORT WALL", worldStyle: "clouds", requiredClasses: ["orbiter", "bomber", "heavy"], forbiddenClasses: [], minClassVariety: 4 },
  { elapsed: 75, actId: "storm-carrier", package: "THUNDER HUNTERS", attackStyle: "pincer", doctrine: "THUNDER PINCER", worldStyle: "storm", requiredClasses: ["striker", "drifter", "bomber"], forbiddenClasses: [], minClassVariety: 4 },
  { elapsed: 99, actId: "prism-citadel", package: "PRISM SIEGE WING", attackStyle: "siege", doctrine: "SIEGE ORBIT", worldStyle: "citadel", requiredClasses: ["heavy", "orbiter", "bomber", "striker"], forbiddenClasses: [], minClassVariety: 4 },
];

let browser;
let context;
let page;
const watchdog = setTimeout(() => process.exit(124), 90000);

function countByClass(classes) {
  return classes.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function sampleAct(spec, index) {
  await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, spec.elapsed);
  await page.waitForFunction(
    ({ actId, packageName, attackStyle }) => {
      const root = document.documentElement.dataset;
      return root.skyRaidAct === actId && root.skyRaidFormationAct === actId && root.skyRaidEnemyPackage === packageName && root.skyRaidEnemyAttackStyle === attackStyle;
    },
    { actId: spec.actId, packageName: spec.package, attackStyle: spec.attackStyle },
    { timeout: 5000, polling: 50 },
  );
  await page.waitForTimeout(650);

  const diagnostics = await page.evaluate(() => {
    const root = document.documentElement.dataset;
    const camera = window.__skyRaidGetCameraPolish?.() ?? null;
    return {
      actId: root.skyRaidAct ?? "",
      worldStyle: root.skyRaidWorldStyle ?? "",
      enemyPackage: root.skyRaidEnemyPackage ?? "",
      enemyAttackStyle: root.skyRaidEnemyAttackStyle ?? "",
      enemyPool: Number(root.skyRaidEnemyPool ?? 0),
      enemyActive: Number(root.skyRaidEnemyActive ?? 0),
      enemyClasses: (root.skyRaidEnemyClasses ?? "").split(",").filter(Boolean),
      formationAct: root.skyRaidFormationAct ?? "",
      formationDoctrine: root.skyRaidCombatDoctrine ?? "",
      formationBeat: root.skyRaidFormationBeat ?? "",
      formationPhase: Number(root.skyRaidFormationPhase ?? 0),
      camera,
    };
  });

  const classes = diagnostics.enemyClasses;
  const uniqueClasses = [...new Set(classes)];
  const counts = countByClass(classes);
  const failures = [];
  if (diagnostics.actId !== spec.actId) failures.push(`act=${diagnostics.actId}`);
  if (diagnostics.worldStyle !== spec.worldStyle) failures.push(`world=${diagnostics.worldStyle}`);
  if (diagnostics.enemyPackage !== spec.package) failures.push(`package=${diagnostics.enemyPackage}`);
  if (diagnostics.enemyAttackStyle !== spec.attackStyle) failures.push(`attack=${diagnostics.enemyAttackStyle}`);
  if (diagnostics.formationAct !== spec.actId) failures.push(`formationAct=${diagnostics.formationAct}`);
  if (diagnostics.formationDoctrine !== spec.doctrine) failures.push(`doctrine=${diagnostics.formationDoctrine}`);
  if (diagnostics.enemyPool < 18) failures.push(`full-pool-missing=${diagnostics.enemyPool}`);
  if (diagnostics.enemyActive < 6) failures.push(`active=${diagnostics.enemyActive}`);
  if (diagnostics.enemyPool < diagnostics.enemyActive) failures.push(`pool=${diagnostics.enemyPool}<active=${diagnostics.enemyActive}`);
  if (uniqueClasses.length < spec.minClassVariety) failures.push(`variety=${uniqueClasses.join(",")}`);
  for (const className of spec.requiredClasses) if (!classes.includes(className)) failures.push(`missing-class=${className}`);
  for (const className of spec.forbiddenClasses) if (classes.includes(className)) failures.push(`forbidden-class=${className}`);

  const camera = diagnostics.camera;
  if (!camera?.playerVisible) failures.push("player-not-visible");
  if (Number(camera?.enemyVisible ?? 0) < 2) failures.push(`enemyVisible=${camera?.enemyVisible}`);
  if (Number(camera?.enemyCombatLane ?? 0) < 1) failures.push(`combatLane=${camera?.enemyCombatLane}`);
  if (Number(camera?.enemyVisible ?? 0) > 8) failures.push(`screen-clutter=${camera?.enemyVisible}`);
  if (Math.abs(Number(camera?.playerNdcY ?? 99)) > 0.56) failures.push(`playerNdcY=${camera?.playerNdcY}`);

  const result = { ...spec, ...diagnostics, classCounts: counts, uniqueClasses, failures };
  fs.writeFileSync(path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.json`), JSON.stringify(result, null, 2));
  await page.screenshot({ path: path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.png`), timeout: 6000 });
  if (failures.length) throw new Error(`${spec.actId} five-act audit failed: ${failures.join("; ")} :: ${JSON.stringify({ classes, counts, enemyPool: diagnostics.enemyPool, enemyActive: diagnostics.enemyActive, enemyVisible: camera?.enemyVisible, enemyCombatLane: camera?.enemyCombatLane })}`);
  return result;
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

  await page.goto(`http://127.0.0.1:4173?menu=1&fiveAct=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyRaidGetCameraPolish === "function", null, { timeout: 12000 });
  await page.waitForTimeout(500);

  const results = [];
  for (let index = 0; index < ACTS.length; index += 1) results.push(await sampleAct(ACTS[index], index));
  await page.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; });

  const signatures = results.map((result) => `${result.enemyPackage}|${result.enemyAttackStyle}|${result.formationDoctrine}|${result.worldStyle}`);
  if (new Set(signatures).size !== ACTS.length) throw new Error(`act signatures are not unique: ${JSON.stringify(signatures)}`);
  const classSignatures = results.map((result) => JSON.stringify(result.classCounts));
  if (new Set(classSignatures).size < 4) throw new Error(`live enemy compositions are insufficiently distinct: ${JSON.stringify(classSignatures)}`);
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);

  const summary = {
    viewport: { width: 844, height: 390, dpr: 2 },
    actCount: results.length,
    uniqueSignatures: new Set(signatures).size,
    uniqueClassSignatures: new Set(classSignatures).size,
    results: results.map((result) => ({
      elapsed: result.elapsed,
      actId: result.actId,
      worldStyle: result.worldStyle,
      enemyPackage: result.enemyPackage,
      enemyAttackStyle: result.enemyAttackStyle,
      formationDoctrine: result.formationDoctrine,
      formationBeat: result.formationBeat,
      enemyPool: result.enemyPool,
      enemyActive: result.enemyActive,
      classCounts: result.classCounts,
      enemyVisible: result.camera?.enemyVisible ?? 0,
      enemyCombatLane: result.camera?.enemyCombatLane ?? 0,
      playerNdcY: result.camera?.playerNdcY ?? null,
    })),
    errors,
  };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("SKY RAID FIVE ACT V24 PASS", JSON.stringify(summary));
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
