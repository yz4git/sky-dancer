import fs from "node:fs";

function edit(path, transform) {
  const source = fs.readFileSync(path, "utf8");
  const next = transform(source);
  if (next !== source) fs.writeFileSync(path, next);
}

edit("app/SkyDancerSkyRaidOverlay.tsx", (source) => {
  let next = source;
  const cueLine = "  const killCueVisible = snapshot.killCueSecondsRemaining > 0;";
  next = next.replace(`${cueLine}\n${cueLine}`, cueLine);
  if (!next.includes("opacity: 1 !important;\n        animation: skyRaidKillConfirm")) {
    next = next.replace(
      "        text-align: center;\n        pointer-events: none;\n        animation: skyRaidKillConfirm 1.16s cubic-bezier(.16,.84,.28,1) both;",
      "        text-align: center;\n        pointer-events: none;\n        opacity: 1 !important;\n        animation: skyRaidKillConfirm 1.16s cubic-bezier(.16,.84,.28,1) both;",
    );
  }
  if (!next.includes("max-width: min(42vw, 340px) !important")) {
    next = next.replace(
      "      @keyframes skyRaidScorePunch {",
      `      html[data-sky-dancer-mode="sky-raid"] [aria-label="Missile warning"] {\n        left: 50% !important;\n        right: auto !important;\n        top: max(105px, calc(env(safe-area-inset-top) + 95px)) !important;\n        bottom: auto !important;\n        transform: translateX(-50%) !important;\n        width: auto !important;\n        max-width: min(42vw, 340px) !important;\n        padding: 3px 9px !important;\n        border-radius: 7px !important;\n        font-size: clamp(8px, .95vw, 10px) !important;\n        line-height: 1 !important;\n        letter-spacing: .08em !important;\n        opacity: .86 !important;\n        box-shadow: 0 3px 12px rgba(70,0,0,.22) !important;\n        white-space: nowrap !important;\n      }\n      @keyframes skyRaidScorePunch {`,
    );
  }
  if (!next.includes("max-width: min(40vw, 320px) !important")) {
    next = next.replace(
      "        [data-sd-kill-confirm] {\n          top: max(92px, calc(env(safe-area-inset-top) + 82px));\n          min-width: 124px;\n          padding: 5px 9px 6px;\n        }",
      "        [data-sd-kill-confirm] {\n          top: max(92px, calc(env(safe-area-inset-top) + 82px));\n          min-width: 124px;\n          padding: 5px 9px 6px;\n        }\n        html[data-sky-dancer-mode=\"sky-raid\"] [aria-label=\"Missile warning\"] {\n          top: 103px !important;\n          max-width: min(40vw, 320px) !important;\n          padding: 2px 8px !important;\n        }",
    );
  }
  return next;
});

edit("src/sky/SkyDancerSkyRaid.ts", (source) => {
  let next = source;
  next = next.replace(
    "    state.killCueSecondsRemaining = 0;\n    state.killCueSecondsRemaining = 0;",
    "    state.killCueSecondsRemaining = 0;",
  );
  const block = "  if (killDelta > 0) {\n    state.killCueSerial += killDelta;\n    state.killCueSecondsRemaining = 1.18;\n  }";
  next = next.replace(`${block}\n${block}`, block);
  return next;
});

edit("scripts/webgl-sky-raid-camera-edge-v17.mjs", (source) => {
  if (source.includes("cueOpacity < 0.85")) return source;
  return source.replace(
    "  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\") {\n    throw new Error(`kill confirmation has no visible layout box: ${JSON.stringify(cueVisual)}`);\n  }",
    "  const cueOpacity = Number.parseFloat(cueVisual?.opacity ?? \"0\");\n  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\" || cueOpacity < 0.85) {\n    throw new Error(`kill confirmation is not visibly rendered: ${JSON.stringify(cueVisual)}`);\n  }",
  );
});

edit("tests/sky-sky-raid.test.ts", (source) => {
  const marker = 'test("SKY RAID phone feedback stays visible without blocking the combat lane"';
  if (source.includes(marker)) return source;
  return source + `\n\ntest("SKY RAID phone feedback stays visible without blocking the combat lane", () => {\n  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");\n  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");\n  assert.match(overlaySource, /opacity: 1 !important/);\n  assert.match(overlaySource, /max-width: min\\(42vw, 340px\\)/);\n  assert.match(auditSource, /cueOpacity < 0\\.85/);\n});\n`;
});

console.log("Applied idempotent SKY RAID final visual feedback pass");
