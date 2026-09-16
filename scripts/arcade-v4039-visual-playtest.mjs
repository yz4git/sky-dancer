import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const outputDir = "visual-playtest-v4039";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader-webgl",
    "--ignore-gpu-blocklist",
  ],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  recordVideo: { dir: `${outputDir}/video`, size: { width: 844, height: 390 } },
});
const page = await context.newPage();
const consoleLines = [];
let continueCount = 0;
page.on("console", (msg) => consoleLines.push(`[console:${msg.type()}] ${msg.text()}`));
page.on("pageerror", (error) => consoleLines.push(`[pageerror] ${error.stack ?? error.message}`));

async function shot(name) {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
}

async function hold(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function combatBeat(index) {
  const horizontal = index % 2 === 0 ? "ArrowLeft" : "ArrowRight";
  const vertical = index % 3 === 0 ? "ArrowUp" : index % 3 === 1 ? "ArrowDown" : null;
  await page.keyboard.down(horizontal);
  if (vertical) await page.keyboard.down(vertical);
  if (index % 4 === 1 || index % 4 === 3) await page.keyboard.down(" ");
  await page.waitForTimeout(1150);
  await page.keyboard.up(horizontal);
  if (vertical) await page.keyboard.up(vertical);
  await page.keyboard.up(" ").catch(() => {});
  await page.waitForTimeout(420);
}

async function continueIfNeeded(index) {
  const button = page.getByRole("button", { name: /^CONTINUE/i }).first();
  if (!await button.isVisible().catch(() => false)) return false;
  continueCount += 1;
  await page.keyboard.up("x").catch(() => {});
  await page.keyboard.up("c").catch(() => {});
  await shot(`death-${String(continueCount).padStart(2, "0")}-beat-${String(index).padStart(2, "0")}`);
  await button.click();
  await page.waitForTimeout(1500);
  await shot(`continue-${String(continueCount).padStart(2, "0")}`);
  await page.keyboard.down("x");
  await page.keyboard.down("c");
  return true;
}

try {
  await page.goto("http://127.0.0.1:4173/?menu&visual-playtest-v4039=1", { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("dialog", { name: "Sky Dancer title screen" }).waitFor({ timeout: 30_000 });
  await shot("00-title");

  await page.getByRole("button", { name: /START ARCADE RUN/i }).click();
  await page.waitForTimeout(2200);
  await shot("01-run-start");

  await page.keyboard.down("x");
  await page.keyboard.down("c");

  for (let i = 0; i < 48; i += 1) {
    await combatBeat(i);
    await continueIfNeeded(i);
    if (i === 5) await shot("02-first-combat");
    if (i === 13) await shot("03-dodge-pressure");
    if (i === 27) await shot("04-mid-run");
    if (i === 47) await shot("05-late-run");
  }

  await page.keyboard.up("x").catch(() => {});
  await page.keyboard.up("c").catch(() => {});
  await hold(" ", 800);
  await page.waitForTimeout(900);
  await shot("06-after-turbo");

  const bodyText = await page.locator("body").innerText();
  const mode = await page.evaluate(() => document.documentElement.dataset.skyDancerMode ?? "missing");
  const canvasInfo = await page.evaluate(() => Array.from(document.querySelectorAll("canvas")).map((canvas) => ({
    width: canvas.width,
    height: canvas.height,
    cssWidth: canvas.getBoundingClientRect().width,
    cssHeight: canvas.getBoundingClientRect().height,
  })));
  await writeFile(`${outputDir}/dom.txt`, `mode=${mode}\ncontinues=${continueCount}\ncanvases=${JSON.stringify(canvasInfo)}\n\n${bodyText}\n`);
} finally {
  await writeFile(`${outputDir}/console.txt`, `${consoleLines.join("\n")}\n`);
  await context.close();
  await browser.close();
}
