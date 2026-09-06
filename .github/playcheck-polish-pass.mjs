import { readFile, writeFile } from "node:fs/promises";

async function patch(path, replacements) {
  let source = await readFile(path, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error(`${path}: expected source not found: ${before.slice(0, 120)}`);
    source = source.replace(before, after);
  }
  await writeFile(path, source);
}

await patch("app/SkyDancerHudV30.tsx", [
  ["background: linear-gradient(90deg, rgba(5,31,51,.72), rgba(7,43,66,.28)) !important;", "background: linear-gradient(90deg, rgba(5,31,51,.86), rgba(7,43,66,.46)) !important;"],
  ["box-shadow: inset 3px 0 0 rgba(91,225,255,.78), 0 4px 14px rgba(1,22,38,.12) !important;", "box-shadow: inset 3px 0 0 rgba(91,225,255,.88), 0 5px 16px rgba(1,18,31,.24) !important;"],
  ["font-size: 8px;\n      letter-spacing: .16em;", "font-size: 9px;\n      letter-spacing: .16em;"],
  ["font-size: 14px !important;\n      font-weight: 900 !important;", "font-size: 15px !important;\n      font-weight: 950 !important;"],
  ["background: linear-gradient(90deg, rgba(4,31,51,.76), rgba(6,39,61,.26)) !important;", "background: linear-gradient(90deg, rgba(4,31,51,.86), rgba(6,39,61,.44)) !important;"],
  ["box-shadow: 0 4px 14px rgba(1,22,38,.10) !important;", "box-shadow: inset 0 1px 0 rgba(184,243,255,.10), 0 5px 16px rgba(1,18,31,.22) !important;"],
  ["[data-sd-turbo-card=\"true\"] > div:first-child strong { font-size: 11px !important; }", "[data-sd-turbo-card=\"true\"] > div:first-child strong { font-size: 12px !important; }"],
  ["[data-sd-turbo-card=\"true\"] > div:first-child span { font-size: 8px !important; }", "[data-sd-turbo-card=\"true\"] > div:first-child span { font-size: 9px !important; }"],
  ["[data-sd-turbo-card=\"true\"] > div:nth-child(3) { margin-top: 3px !important; font-size: 6px !important; }", "[data-sd-turbo-card=\"true\"] > div:nth-child(3) { margin-top: 3px !important; font-size: 7px !important; opacity: .86 !important; }"],
]);

await patch("app/SkyDancerHudV45.tsx", [
  ["width: 42px;\n        height: 42px;", "width: 46px;\n        height: 46px;"],
  ["font: 950 15px/1 ui-monospace", "font: 950 16px/1 ui-monospace"],
  ["min-width: 98px;\n        max-width: min(31vw, 238px);\n        padding: 2px 7px 3px;", "min-width: 118px;\n        max-width: min(34vw, 270px);\n        padding: 3px 8px 4px;"],
  ["color: rgba(223,245,250,.76);\n        background: linear-gradient(90deg, transparent, rgba(4,31,45,.30) 16%, rgba(4,31,45,.38) 84%, transparent);", "color: rgba(231,249,253,.90);\n        background: linear-gradient(90deg, transparent, rgba(4,31,45,.42) 14%, rgba(4,31,45,.52) 86%, transparent);"],
  ["font: 900 clamp(6.5px,.76vw,8.5px)/1.05 system-ui,sans-serif;", "font: 900 clamp(8px,.92vw,10.5px)/1.08 system-ui,sans-serif;"],
  [".skyDancerV45Range { opacity: .62; font-size: .88em; }", ".skyDancerV45Range { opacity: .78; font-size: .92em; }"],
  ["max-width: 27vw;\n        text-overflow: ellipsis;\n        font-size: .88em;", "max-width: 31vw;\n        text-overflow: ellipsis;\n        font-size: .96em;"],
]);

await patch("src/sky/presentation/SkyDancerV52CombatFxSpeedPass.ts", [
  ["for (let index = 0; index < 28; index += 1)", "for (let index = 0; index < 20; index += 1)"],
  ["const x = side * (2.8 + (lane % 5) * 0.82);", "const x = side * (3.3 + (lane % 5) * 0.88);"],
  ["this.speedRoot.visible = intensity > 0.06;\n    this.speedMaterial.opacity = intensity * (snapshot.boostActive ? 0.40 : 0.20);", "this.speedRoot.visible = intensity > 0.10;\n    this.speedMaterial.opacity = intensity * (snapshot.boostActive ? 0.28 : 0.12);"],
  ["child.scale.z = 2.8 + intensity * 7.2 + (index % 4) * 0.55;", "child.scale.z = 2.7 + intensity * 5.6 + (index % 4) * 0.50;"],
]);

await patch(".github/live-playcheck-stage.mjs", [
  ["const stage = await page.evaluate(() => typeof window.__skyDancerGetStageCycle === \"function\" ? window.__skyDancerGetStageCycle() : null);\n    samples.push({ elapsed: Number(elapsed.toFixed(2)), hudText, weapon, flight, stage });", "const stage = await page.evaluate(() => typeof window.__skyDancerGetStageCycle === \"function\" ? window.__skyDancerGetStageCycle() : null);\n    const speedFx = await page.evaluate(() => typeof window.__skyDancerGetV52SpeedFx === \"function\" ? window.__skyDancerGetV52SpeedFx() : null);\n    samples.push({ elapsed: Number(elapsed.toFixed(2)), hudText, weapon, flight, stage, speedFx });"],
  ["diagnostics.largestKillJump = largestKillJump;\nawait writeFile", "diagnostics.largestKillJump = largestKillJump;\nconst speedSamples = samples.map((sample) => sample.speedFx).filter(Boolean);\ndiagnostics.maxSpeedStreaks = speedSamples.reduce((max, speedFx) => Math.max(max, Number(speedFx.streaks ?? 0)), 0);\ndiagnostics.maxSpeedOpacity = speedSamples.reduce((max, speedFx) => Math.max(max, Number(speedFx.speedOpacity ?? 0)), 0);\nawait writeFile"],
  ["if (largestKillJump > 10) throw new Error(`implausible StageCycle kill jump: ${largestKillJump}`);", "if (largestKillJump > 10) throw new Error(`implausible StageCycle kill jump: ${largestKillJump}`);\nif (diagnostics.maxSpeedStreaks > 20) throw new Error(`speed field too dense: ${diagnostics.maxSpeedStreaks} streaks`);\nif (diagnostics.maxSpeedOpacity > 0.29) throw new Error(`speed field too opaque: ${diagnostics.maxSpeedOpacity}`);"],
]);

await patch(".github/workflows/live-stage-playcheck-once.yml", [
  ["      - run: npx playwright install --with-deps chromium\n      - name: Run live visual playcheck", "      - run: npx playwright install --with-deps chromium\n      - name: Wait for Pages deployment\n        run: sleep 70\n      - name: Run live visual playcheck"],
]);

console.log("Applied Turbo Hunt screen-review readability polish.");
