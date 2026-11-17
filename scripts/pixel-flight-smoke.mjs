import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const base = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const dir = "artifacts/pixel-flight-smoke";
await mkdir(dir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(25_000);
const pageErrors = [], consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

try {
  await page.goto(`${base}?menu=1`, { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor();
  await page.getByRole("button", { name: /PIXEL FLIGHT/i }).first().click();
  await page.getByRole("button", { name: /START PIXEL FLIGHT/i }).click();
  const stage = page.locator('[aria-label="Sky Dancer Pixel Flight"]');
  await stage.waitFor({ state: "visible" });
  const canvas = stage.locator('canvas[aria-label="Software rendered island flight scene"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForTimeout(850);
  const initial = await canvas.evaluate((element) => {
    const ctx = element.getContext("2d");
    const data = ctx.getImageData(0, 0, element.width, element.height).data;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 127 * 4) colors.add(`${data[i]}-${data[i + 1]}-${data[i + 2]}`);
    return {
      logicalWidth: element.width,
      logicalHeight: element.height,
      displayWidth: element.getBoundingClientRect().width,
      displayHeight: element.getBoundingClientRect().height,
      distinctSampleColors: colors.size,
      hasWebGL: Boolean(element.getContext("webgl")),
    };
  });
  await page.screenshot({ path: `${dir}/chase.png` });

  const camera = stage.getByRole("button", { name: /change camera view/i });
  await camera.click();
  await page.getByText("MAP", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${dir}/map.png` });
  await camera.click();
  await page.getByText("COCKPIT", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${dir}/cockpit.png` });
  await camera.click();
  await page.getByText("CHASE", { exact: true }).waitFor({ state: "visible" });

  const boost = stage.getByRole("button", { name: "Hold turbo boost" });
  const stick = stage.getByRole("slider", { name: "Turn and climb flight stick" });
  const controls = await stick.evaluate(async (element) => {
    const boost = document.querySelector('[aria-label="Hold turbo boost"]');
    if (!boost) throw new Error("Boost control missing");
    const rect = element.getBoundingClientRect(), b = boost.getBoundingClientRect();
    const make = (type, id, x, y) => new PointerEvent(type, {
      pointerId: id, pointerType: "touch", isPrimary: id === 700,
      clientX: x, clientY: y, buttons: type.endsWith("up") ? 0 : 1, bubbles: true, cancelable: true,
    });
    const px = rect.left + rect.width * .81, py = rect.top + rect.height * .23;
    const bx = b.left + b.width * .5, by = b.top + b.height * .5;
    element.dispatchEvent(make("pointerdown", 700, px, py));
    element.dispatchEvent(make("pointermove", 700, px, py));
    boost.dispatchEvent(make("pointerdown", 701, bx, by));
    await new Promise((resolve) => setTimeout(resolve, 110));
    const held = { stickX: Number(element.getAttribute("aria-valuenow")), boost: boost.className.includes("boosting") };
    window.dispatchEvent(make("pointerup", 701, bx, by));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const remaining = Number(element.getAttribute("aria-valuenow"));
    window.dispatchEvent(make("pointerup", 700, px, py));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return { ...held, remaining, releasedX: Number(element.getAttribute("aria-valuenow")), releasedBoost: boost.className.includes("boosting") };
  });
  await boost.waitFor({ state: "visible" });
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("Space");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.up("Space");
  const gameText = await stage.innerText();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Game paused" }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /RESUME/i }).first().click();
  await page.getByRole("dialog", { name: "Game paused" }).waitFor({ state: "hidden" });

  const diagnostics = { initial, controls, text: gameText.slice(0, 900), pageErrors, consoleErrors };
  await writeFile(`${dir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
  if (initial.logicalWidth < 300 || initial.logicalHeight !== 192 || initial.displayWidth < 800 || initial.displayHeight < 360) {
    throw new Error(`Invalid Pixel Flight frame: ${JSON.stringify(diagnostics)}`);
  }
  if (initial.distinctSampleColors < 15) throw new Error(`Pixel terrain frame appears blank: ${JSON.stringify(diagnostics)}`);
  if (controls.stickX !== 1 || !controls.boost || controls.remaining !== 1 || controls.releasedX !== 0 || controls.releasedBoost) {
    throw new Error(`Pixel Flight multi-touch ownership failed: ${JSON.stringify(diagnostics)}`);
  }
  if (pageErrors.length || consoleErrors.filter(x => !/Failed to load resource:.*404/i.test(x)).length) {
    throw new Error(`Pixel Flight browser errors: ${JSON.stringify(diagnostics)}`);
  }
  console.log(`[pixel-flight-smoke] success ${initial.logicalWidth}x${initial.logicalHeight}, ${initial.distinctSampleColors} sample colors; touch/camera/pause OK`);
} finally {
  await browser.close();
}
