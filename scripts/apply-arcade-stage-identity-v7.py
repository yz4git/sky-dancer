from pathlib import Path

course = r'''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeCoursePose {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  bank: number;
}

interface CourseProfile {
  turns: number;
  lateral: number;
  vertical: number;
  phase: number;
}

const TAU = Math.PI * 2;
const COURSE_PROFILES: Record<SkyDancerArcadeStageDefinition["biome"], CourseProfile> = {
  city: { turns: 1.62, lateral: 1.18, vertical: 4.8, phase: 0.15 },
  canyon: { turns: 2.15, lateral: 1.16, vertical: 6.8, phase: 0.72 },
  cloud: { turns: 1.62, lateral: 0.92, vertical: 8.6, phase: 1.18 },
  storm: { turns: 2.42, lateral: 1.12, vertical: 9.4, phase: 1.91 },
  desert: { turns: 1.28, lateral: 0.9, vertical: 5.0, phase: 2.46 },
  ice: { turns: 2.72, lateral: 1.14, vertical: 10.6, phase: 2.98 },
  ruins: { turns: 2.08, lateral: 1.02, vertical: 11.2, phase: 3.57 },
  night: { turns: 2.86, lateral: 1.18, vertical: 7.8, phase: 4.13 },
  volcano: { turns: 2.24, lateral: 1.08, vertical: 12.8, phase: 4.71 },
  orbit: { turns: 1.76, lateral: 0.92, vertical: 15.8, phase: 5.22 },
  citadel: { turns: 2.48, lateral: 1.1, vertical: 9.8, phase: 5.81 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function courseCenter(stage: SkyDancerArcadeStageDefinition, distance: number): { x: number; y: number } {
  const profile = COURSE_PROFILES[stage.biome];
  const stageLength = Math.max(1, stage.durationSeconds * stage.courseSpeed);
  const u = distance / stageLength;
  const phase = profile.phase + stage.order * 0.17;
  const lateralAmplitude = (18 + stage.curveStrength * 40) * profile.lateral;

  const p1 = phase + u * TAU * profile.turns;
  const p2 = phase * 0.61 + 1.17 + u * TAU * (profile.turns * 0.53 + 0.31);
  let x = lateralAmplitude * (
    (Math.sin(p1) - Math.sin(phase)) * 0.72
    + (Math.sin(p2) - Math.sin(phase * 0.61 + 1.17)) * 0.28
  );

  const v1 = phase * 0.43 - 0.8 + u * TAU * (profile.turns * 0.58 + 0.21);
  const v2 = phase * 0.77 + 0.35 + u * TAU * (profile.turns * 0.29 + 0.17);
  let y = profile.vertical * (
    (Math.sin(v1) - Math.sin(phase * 0.43 - 0.8)) * 0.72
    + (Math.sin(v2) - Math.sin(phase * 0.77 + 0.35)) * 0.28
  );

  const authoredU = clamp(u, 0, 1);
  if (stage.biome === "cloud") y += Math.sin(authoredU * Math.PI) * 4.2;
  if (stage.biome === "ruins") y += Math.sin(authoredU * Math.PI * 2) * 3.2;
  if (stage.biome === "citadel") y += Math.sin(authoredU * Math.PI) * 5.2;

  // V7 stage signatures: the course shape itself is now part of each biome's identity.
  if (stage.biome === "canyon") {
    // Fast knife-edge switchbacks with a low valley floor: frequent lateral reversals, restrained vertical motion.
    x += (Math.sin(u * TAU * 2.65 + 0.18) - Math.sin(0.18)) * 14;
    x += Math.sin(u * TAU * 5.3) * 3.2;
    y -= Math.sin(authoredU * Math.PI) * 7.2;
    y += (Math.sin(u * TAU * 2.1 - 0.35) - Math.sin(-0.35)) * 2.8;
  }
  if (stage.biome === "ice") {
    // Crystal-tunnel slalom: tightly alternating horizontal gates plus pronounced ceiling/floor waves.
    x += (Math.sin(u * TAU * 3.4 + 1.1) - Math.sin(1.1)) * 11;
    x += (Math.sin(u * TAU * 6.8 + 0.2) - Math.sin(0.2)) * 2.8;
    y += (Math.sin(u * TAU * 2.35 - 0.4) - Math.sin(-0.4)) * 8.5;
    y += (Math.sin(u * TAU * 4.7 + 0.8) - Math.sin(0.8)) * 3.2;
  }
  if (stage.biome === "volcano") {
    // Crater spiral: wide orbital sweeps dive toward the magma core, then pull back to the rim before the boss.
    x += (Math.sin(u * TAU * 1.45 + 2.1) - Math.sin(2.1)) * 22;
    x += (Math.sin(u * TAU * 3.2 + 0.35) - Math.sin(0.35)) * 8;
    y -= Math.sin(authoredU * Math.PI) * 22;
    y += (Math.sin(u * TAU * 1.45 + 0.6) - Math.sin(0.6)) * 4.6;
    y += authoredU * 20;
  }
  if (stage.biome === "orbit") {
    // Rising corkscrew: lateral radius opens with altitude while the whole course climbs toward orbit.
    const spiralRadius = 9 + authoredU * 14;
    x += (Math.sin(u * TAU * 1.85 + 0.3) - Math.sin(0.3)) * spiralRadius;
    y += u * 62;
    y += (Math.sin(u * TAU * 1.85 - 0.5) - Math.sin(-0.5)) * 3.4;
  }

  return { x, y };
}

function limitsFor(stage: SkyDancerArcadeStageDefinition) {
  switch (stage.biome) {
    case "canyon": return { yaw: 0.48, pitch: 0.24, bank: 1.48 };
    case "ice": return { yaw: 0.43, pitch: 0.30, bank: 1.38 };
    case "volcano": return { yaw: 0.45, pitch: 0.29, bank: 1.44 };
    case "orbit": return { yaw: 0.39, pitch: 0.34, bank: 1.34 };
    default: return { yaw: 0.34, pitch: 0.19, bank: 1.28 };
  }
}

export function arcadeCoursePose(stage: SkyDancerArcadeStageDefinition, distance: number): SkyDancerArcadeCoursePose {
  const center = courseCenter(stage, distance);
  const sample = 6;
  const before = courseCenter(stage, distance - sample);
  const after = courseCenter(stage, distance + sample);
  const dx = (after.x - before.x) / (sample * 2);
  const dy = (after.y - before.y) / (sample * 2);
  const limits = limitsFor(stage);
  const yaw = clamp(Math.atan(dx), -limits.yaw, limits.yaw);
  const pitch = clamp(Math.atan(dy), -limits.pitch, limits.pitch);
  return {
    x: center.x,
    y: center.y,
    yaw,
    pitch,
    bank: clamp(-yaw * limits.bank, -0.46, 0.46),
  };
}

/** Visual pose of a point `depth` metres ahead, relative to the player's current course centre. */
export function arcadeCourseRelativePose(
  stage: SkyDancerArcadeStageDefinition,
  distance: number,
  depth: number,
): SkyDancerArcadeCoursePose {
  const here = arcadeCoursePose(stage, distance);
  const there = arcadeCoursePose(stage, distance + depth);
  return {
    x: there.x - here.x,
    y: there.y - here.y,
    yaw: there.yaw - here.yaw,
    pitch: there.pitch - here.pitch,
    bank: there.bank - here.bank,
  };
}
'''
Path('src/sky/arcade/SkyDancerArcadeCoursePath.ts').write_text(course)

test_path = Path('tests/sky-arcade-run.test.ts')
test = test_path.read_text()
import_line = 'import { arcadeCoursePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";\n'
if import_line not in test:
    marker = 'import {\n  SkyDancerArcadeRuntime,\n  skyDancerArcadeRankForScore,\n} from "../src/sky/arcade/SkyDancerArcadeRuntime";\n'
    test = test.replace(marker, marker + import_line, 1)
identity_test = r'''

test("V7 signature stages have measurably distinct course geometry", () => {
  const sample = (id: "red-canyon" | "ice-cavern" | "volcano-core" | "orbital-ascent") => {
    const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;
    const length = stage.durationSeconds * stage.courseSpeed;
    return Array.from({ length: 121 }, (_, index) => arcadeCoursePose(stage, length * index / 120));
  };
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const signChanges = (values: number[], epsilon = .03) => {
    const signs = values.filter((value) => Math.abs(value) >= epsilon).map((value) => Math.sign(value));
    return signs.reduce((count, sign, index) => index > 0 && sign !== signs[index - 1] ? count + 1 : count, 0);
  };

  const canyon = sample("red-canyon");
  assert.ok(span(canyon.map((pose) => pose.x)) > 90, "canyon switchback width");
  assert.ok(signChanges(canyon.map((pose) => pose.yaw)) >= 5, "canyon switchback reversals");

  const ice = sample("ice-cavern");
  assert.ok(span(ice.map((pose) => pose.y)) > 30, "ice tunnel vertical span");
  assert.ok(signChanges(ice.map((pose) => pose.yaw)) >= 6, "ice slalom reversals");

  const volcano = sample("volcano-core");
  assert.ok(span(volcano.map((pose) => pose.y)) > 25, "volcano crater dive span");
  assert.ok(Math.min(...volcano.map((pose) => pose.y)) < -25, "volcano dives toward the core");

  const orbit = sample("orbital-ascent");
  assert.ok(orbit.at(-1)!.y - orbit[0].y > 40, "orbit gains major altitude");
  assert.ok(span(orbit.map((pose) => pose.x)) > 60, "orbit corkscrew opens laterally");
});
'''
if 'V7 signature stages have measurably distinct course geometry' not in test:
    test += identity_test
test_path.write_text(test)

audit = r'''import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-stage-identity";
const stages = [
  { id: "red-canyon", short: "CANYON", name: "RED CANYON" },
  { id: "ice-cavern", short: "ICE", name: "ICE CAVERN" },
  { id: "volcano-core", short: "VOLCANO", name: "VOLCANO CORE" },
  { id: "orbital-ascent", short: "ORBIT", name: "ORBITAL ASCENT" },
];
const allStageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: ids, unlockedStageIds: ids, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 }));
}, allStageIds);
const diagnostics = [];
for (const [index, stage] of stages.entries()) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator("button").filter({ hasText: /STAGE PRACTICE/i }).click({ force: true });
  await page.locator("button").filter({ hasText: new RegExp(stage.short, "i") }).first().click({ force: true });
  await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).click({ force: true });
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  const prefix = `${String(index + 1).padStart(2, "0")}-${stage.id}`;
  const shot = async (suffix) => page.screenshot({ path: `${outputDir}/${prefix}-${suffix}.png`, fullPage: true });
  await page.waitForTimeout(1400);
  await shot("entry");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(850);
  await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(2900);
  await shot("signature-a");
  await page.keyboard.down(" ");
  await page.waitForTimeout(1100);
  await shot("turbo");
  await page.keyboard.up(" ");
  await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(950);
  await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(3300);
  await shot("signature-b");
  const body = await page.locator("body").innerText();
  const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i) || [0, 0])[1]);
  const glState = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    return { webgl: Boolean(gl), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height };
  });
  diagnostics.push({ stage: stage.id, stageVisible: body.includes(stage.name), hp, glState, consoleErrors, pageErrors, failed: /AIRFRAME LOST|MISSION FAILED/i.test(body) });
  await page.close();
}
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
for (const item of diagnostics) {
  if (!item.stageVisible) throw new Error(`Stage HUD mismatch: ${JSON.stringify(item)}`);
  if (!item.glState.webgl || item.glState.width < 800 || item.glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(item)}`);
  if (item.failed) throw new Error(`Stage identity audit lost airframe: ${JSON.stringify(item)}`);
  if (item.consoleErrors.length || item.pageErrors.length) throw new Error(`Stage identity audit errors: ${JSON.stringify(item)}`);
}
'''
Path('scripts/webgl-arcade-stage-identity-audit.mjs').write_text(audit)

workflow = r'''name: Sky Dancer Arcade Stage Identity Audit

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "src/sky/arcade/SkyDancerArcadeCoursePath.ts"
      - "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
      - "scripts/webgl-arcade-stage-identity-audit.mjs"
      - ".github/workflows/arcade-stage-identity-audit.yml"

permissions:
  contents: read

jobs:
  stage-identity:
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.13.0
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: |
          npm install --no-save --package-lock=false --legacy-peer-deps playwright@1.55.0
          npx playwright install --with-deps chromium
      - run: npm run build:pages
      - run: |
          python3 -m http.server 4173 --bind 127.0.0.1 --directory out > /tmp/sky-dancer-stage-http.log 2>&1 &
          for i in {1..30}; do
            if curl -fsS http://127.0.0.1:4173/ >/dev/null; then exit 0; fi
            sleep 1
          done
          cat /tmp/sky-dancer-stage-http.log
          exit 1
      - run: node scripts/webgl-arcade-stage-identity-audit.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: sky-dancer-stage-identity-${{ github.sha }}
          path: artifacts/arcade-stage-identity
          if-no-files-found: error
          retention-days: 14
'''
Path('.github/workflows/arcade-stage-identity-audit.yml').write_text(workflow)
print('Arcade stage identity V7 patch prepared')
