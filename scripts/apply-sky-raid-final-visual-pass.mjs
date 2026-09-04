import fs from "node:fs";

function replaceExact(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) {
    if (source.includes(to)) return false;
    throw new Error(`Missing expected source in ${path}: ${from}`);
  }
  fs.writeFileSync(path, source.replace(from, to));
  return true;
}

const overlay = "app/SkyDancerSkyRaidOverlay.tsx";
replaceExact(
  overlay,
  "        text-align: center;\n        pointer-events: none;\n        animation: skyRaidKillConfirm 1.16s cubic-bezier(.16,.84,.28,1) both;",
  "        text-align: center;\n        pointer-events: none;\n        opacity: 1 !important;\n        animation: skyRaidKillConfirm 1.16s cubic-bezier(.16,.84,.28,1) both;",
);
replaceExact(
  overlay,
  "      @keyframes skyRaidScorePunch {",
  `      html[data-sky-dancer-mode="sky-raid"] [aria-label="Missile warning"] {\n        left: 50% !important;\n        right: auto !important;\n        top: max(105px, calc(env(safe-area-inset-top) + 95px)) !important;\n        bottom: auto !important;\n        transform: translateX(-50%) !important;\n        width: auto !important;\n        max-width: min(42vw, 340px) !important;\n        padding: 3px 9px !important;\n        border-radius: 7px !important;\n        font-size: clamp(8px, .95vw, 10px) !important;\n        line-height: 1 !important;\n        letter-spacing: .08em !important;\n        opacity: .86 !important;\n        box-shadow: 0 3px 12px rgba(70,0,0,.22) !important;\n        white-space: nowrap !important;\n      }\n      @keyframes skyRaidScorePunch {`,
);
replaceExact(
  overlay,
  "        [data-sd-kill-confirm] {\n          top: max(92px, calc(env(safe-area-inset-top) + 82px));\n          min-width: 124px;\n          padding: 5px 9px 6px;\n        }",
  "        [data-sd-kill-confirm] {\n          top: max(92px, calc(env(safe-area-inset-top) + 82px));\n          min-width: 124px;\n          padding: 5px 9px 6px;\n        }\n        html[data-sky-dancer-mode=\"sky-raid\"] [aria-label=\"Missile warning\"] {\n          top: 103px !important;\n          max-width: min(40vw, 320px) !important;\n          padding: 2px 8px !important;\n        }",
);

const audit = "scripts/webgl-sky-raid-camera-edge-v17.mjs";
replaceExact(
  audit,
  "  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\") {\n    throw new Error(`kill confirmation has no visible layout box: ${JSON.stringify(cueVisual)}`);\n  }",
  "  const cueOpacity = Number.parseFloat(cueVisual?.opacity ?? \"0\");\n  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\" || cueOpacity < 0.85) {\n    throw new Error(`kill confirmation is not visibly rendered: ${JSON.stringify(cueVisual)}`);\n  }",
);

const testPath = "tests/sky-sky-raid.test.ts";
let testSource = fs.readFileSync(testPath, "utf8");
const marker = 'test("SKY RAID phone feedback stays visible without blocking the combat lane"';
if (!testSource.includes(marker)) {
  testSource += `\n\ntest("SKY RAID phone feedback stays visible without blocking the combat lane", () => {\n  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");\n  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");\n  assert.match(overlaySource, /opacity: 1 !important/);\n  assert.match(overlaySource, /max-width: min\\(42vw, 340px\\)/);\n  assert.match(overlaySource, /font-size: clamp\\(8px, \\.95vw, 10px\\)/);\n  assert.match(auditSource, /cueOpacity < 0\\.85/);\n});\n`;
}
fs.writeFileSync(testPath, testSource);

console.log("Applied final SKY RAID visual feedback pass");
