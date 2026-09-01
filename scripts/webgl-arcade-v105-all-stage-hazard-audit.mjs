import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/v105-all-stage-hazards";
const stages = [
  { id: "dawn-city", name: "DAWN CITY" },
  { id: "red-canyon", name: "RED CANYON" },
  { id: "cloud-fleet", name: "CLOUD FLEET" },
  { id: "storm-carrier", name: "STORM CARRIER" },
  { id: "desert-fortress", name: "DESERT FORTRESS" },
  { id: "ice-cavern", name: "ICE CAVERN" },
  { id: "floating-ruins", name: "FLOATING RUINS" },
  { id: "night-metro", name: "NIGHT METRO" },
  { id: "volcano-core", name: "VOLCANO CORE" },
  { id: "orbital-ascent", name: "ORBITAL ASCENT" },
  { id: "prism-citadel", name: "PRISM CITADEL" },
];
const ids = stages.map((stage) => stage.id);
const structuralKinds = new Set(["tower", "arch", "rock"]);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((stageIds) => {
  localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: stageIds, unlockedStageIds: stageIds, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 }));
}, ids);

async function startPractice(page, index) {
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
  const mode = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
  await mode.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const modeRoot = document.querySelector('[aria-label="Select game mode"]');
    const button = modeRoot && [...modeRoot.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("STAGE PRACTICE"));
    return Boolean(button && !button.disabled);
  });
  await mode.click();
  const practice = page.locator('[aria-label="Select practice stage"]');
  await practice.waitFor({ state: "visible" });
  const buttons = practice.locator("button");
  const count = await buttons.count();
  if (count < stages.length) throw new Error(`Expected ${stages.length} practice stages, got ${count}`);
  const label = (await buttons.nth(index).innerText()).replace(/\s+/g, " ").trim();
  await buttons.nth(index).click();
  await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV105Demo));
  return { canvas, label };
}

async function readDebug(page) {
  return page.evaluate(() => {
    const demo = window.__skyDancerV105Demo;
    if (!demo) return null;
    const snapshot = demo.getSnapshot();
    const groups = demo.hazardGroups ? [...demo.hazardGroups.entries()].map(([id, group]) => ({
      id,
      worldAnchored: group.userData.arcadeWorldAnchoredHazardV105 === true,
      atmospheric: group.userData.arcadeAtmosphericHazardV105 === true,
      identity: group.userData.arcadeHazardIdentityV105 ?? null,
      position: [group.position.x, group.position.y, group.position.z],
      rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
    })) : [];
    return {
      distance: snapshot.distance,
      stageId: snapshot.stage.id,
      stageHazards: [...snapshot.stage.hazards],
      hazards: snapshot.hazards.map((hazard) => ({ id: hazard.id, kind: hazard.kind, depth: hazard.depth, x: hazard.x, y: hazard.y })),
      groups,
      hp: snapshot.playerHp,
    };
  });
}

async function forceHazard(page, kind) {
  await page.evaluate((forcedKind) => {
    const demo = window.__skyDancerV105Demo;
    if (!demo?.runtime?.spawnHazardPattern) throw new Error("V10.5 audit bridge cannot access runtime hazard spawner");
    demo.runtime.spawnHazardPattern(forcedKind);
  }, kind);
}

async function captureCanvas(page, canvas, path) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Arcade Run canvas has no bounding box");
  await page.screenshot({ path, clip: box, timeout: 60_000 });
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

const results = [];
for (let index = 0; index < stages.length; index += 1) {
  const expected = stages[index];
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  console.log(`[v105-hazard-audit] ${expected.id}: start`);
  const { canvas, label } = await startPractice(page, index);
  await page.waitForTimeout(600);
  let debug = await readDebug(page);
  if (!debug || debug.stageId !== expected.id) throw new Error(`Stage mismatch ${expected.id}: ${JSON.stringify(debug)} label=${label}`);
  const structuralKind = debug.stageHazards.find((kind) => structuralKinds.has(kind)) ?? null;
  const forcedKind = structuralKind ?? debug.stageHazards[0];
  if (!forcedKind) throw new Error(`Stage ${expected.id} has no authored hazards`);
  await forceHazard(page, forcedKind);
  await page.waitForTimeout(120);

  let targetId = null;
  for (let tries = 0; tries < 20 && targetId === null; tries += 1) {
    debug = await readDebug(page);
    const target = debug?.hazards.find((hazard) => hazard.kind === forcedKind);
    if (target) targetId = target.id;
    else await page.waitForTimeout(50);
  }
  if (targetId === null) throw new Error(`Forced hazard ${forcedKind} did not appear in ${expected.id}`);

  const prefix = `${String(index + 1).padStart(2, "0")}-${expected.id}`;
  const captures = [];
  captures.push({ suffix: "a", ...(await captureCanvas(page, canvas, `${outputDir}/${prefix}-a.png`)) });
  const samples = [];
  await page.keyboard.down(" ");
  for (let sampleIndex = 0; sampleIndex < 6; sampleIndex += 1) {
    debug = await readDebug(page);
    const hazard = debug?.hazards.find((entry) => entry.id === targetId) ?? null;
    const group = debug?.groups.find((entry) => entry.id === targetId) ?? null;
    if (hazard && group) {
      samples.push({
        distance: debug.distance,
        depth: hazard.depth,
        anchor: debug.distance + hazard.depth,
        worldAnchored: group.worldAnchored,
        atmospheric: group.atmospheric,
        identity: group.identity,
        position: group.position,
        rotation: group.rotation,
      });
    }
    await page.waitForTimeout(70);
  }
  await page.keyboard.up(" ");
  captures.push({ suffix: "b", ...(await captureCanvas(page, canvas, `${outputDir}/${prefix}-b.png`)) });

  const body = await page.locator("body").innerText();
  const glState = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl: Boolean(gl),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      renderer: info && gl ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null,
    };
  });
  const anchors = samples.map((sample) => sample.anchor);
  const anchorSpread = anchors.length ? Math.max(...anchors) - Math.min(...anchors) : null;
  const blockingConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource:.*404/i.test(message));
  const result = {
    stage: expected.id,
    expectedName: expected.name,
    selectorLabel: label,
    authoredHazards: debug?.stageHazards ?? [],
    forcedKind,
    structural: structuralKinds.has(forcedKind),
    targetId,
    samples,
    anchorSpread,
    captures,
    hp: debug?.hp ?? null,
    stageVisible: body.includes(expected.name),
    glState,
    consoleErrors,
    blockingConsoleErrors,
    pageErrors,
  };
  results.push(result);
  console.log(`[v105-hazard-audit] ${expected.id}: ${JSON.stringify({ forcedKind, structural: result.structural, anchorSpread, samples: samples.length, hp: result.hp, identity: samples[0]?.identity ?? null })}`);
  await page.close();
}

await writeFile(`${outputDir}/report.json`, JSON.stringify(results, null, 2));
await browser.close();

for (const result of results) {
  if (!result.stageVisible) throw new Error(`HUD stage mismatch: ${JSON.stringify(result)}`);
  if (!result.glState.webgl || result.glState.width < 800 || result.glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(result)}`);
  if (result.samples.length < 3) throw new Error(`Hazard disappeared too early to audit: ${JSON.stringify(result)}`);
  if (result.structural) {
    if (!result.samples.every((sample) => sample.worldAnchored)) throw new Error(`Structural hazard lacks world anchor marker: ${JSON.stringify(result)}`);
    if (result.anchorSpread === null || result.anchorSpread > 0.02) throw new Error(`Structural hazard slid independently from course: ${JSON.stringify(result)}`);
  } else if (result.samples.some((sample) => sample.worldAnchored)) {
    throw new Error(`Dynamic hazard incorrectly world-anchored: ${JSON.stringify(result)}`);
  }
  if (result.blockingConsoleErrors.length || result.pageErrors.length) throw new Error(`WebGL errors in ${result.stage}: ${JSON.stringify(result)}`);
}
console.log(`[v105-hazard-audit] complete: ${results.length} stages`);
