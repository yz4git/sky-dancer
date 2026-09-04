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

edit("src/sky/SkyDancerVerticalFlightV43.ts", (source) => {
  if (source.includes("setSkyDancerEnemyAltitudeReferenceV56")) return source;
  let next = source.replace(
    "export const SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS = 0.30;",
    `export const SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS = 0.30;\n\nlet skyRaidEnemyAltitudeReferenceMetersV56 = 0;\n\n/**\n * SKY RAID moves the player through a much wider 20-64 m flight envelope than\n * the historical fixed-altitude combat model. Enemy tactical altitude remains\n * a local +/-10 m maneuver offset; this reference lifts that local band into\n * the current SKY RAID engagement layer without changing other game modes.\n */\nexport function setSkyDancerEnemyAltitudeReferenceV56(altitudeMeters: number): void {\n  if (!Number.isFinite(altitudeMeters)) return;\n  skyRaidEnemyAltitudeReferenceMetersV56 = altitudeMeters;\n}`,
  );
  next = next.replace(
    `export function getSkyDancerEnemyAltitudeMetersV43(enemy: CartEnemyState): number {\n  return stateFor(enemy).altitudeOffsetMeters;\n}`,
    `export function getSkyDancerEnemyAltitudeMetersV43(enemy: CartEnemyState): number {\n  const skyRaid = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";\n  return stateFor(enemy).altitudeOffsetMeters + (skyRaid ? skyRaidEnemyAltitudeReferenceMetersV56 : 0);\n}`,
  );
  return next;
});

edit("src/sky/SkyDancerSkyRaid.ts", (source) => {
  let next = source;
  next = next.replace(
    "import { getSkyDancerPlayerWeaponState } from \"./SkyDancerPlayerWeapons\";",
    `import { getSkyDancerPlayerWeaponState } from "./SkyDancerPlayerWeapons";\nimport {\n  getSkyDancerEnemyAltitudeMetersV43,\n  setSkyDancerEnemyAltitudeReferenceV56,\n} from "./SkyDancerVerticalFlightV43";`,
  );
  next = next.replace(
    "  playerVisual: THREE.Group;\n  steer: number;",
    "  playerVisual: THREE.Group;\n  enemyGroups: Map<string, THREE.Group>;\n  steer: number;",
  );
  next = next.replace(
    `  (demo.session as unknown as { skyDancerPlayerAltitudeMeters?: number }).skyDancerPlayerAltitudeMeters = flight.altitude;\n  demo.scene.userData.skyRaidPlayerAltitude = flight.altitude;`,
    `  (demo.session as unknown as { skyDancerPlayerAltitudeMeters?: number }).skyDancerPlayerAltitudeMeters = flight.altitude;\n  // Keep enemy attack runs in the same broad camera band as the player while\n  // preserving meaningful vertical separation at the upper altitude limit.\n  const enemyAltitudeReference = 20 + (flight.altitude - 20) * 0.70;\n  setSkyDancerEnemyAltitudeReferenceV56(enemyAltitudeReference);\n  demo.scene.userData.skyRaidEnemyAltitudeReference = enemyAltitudeReference;\n  demo.scene.userData.skyRaidPlayerAltitude = flight.altitude;`,
  );
  if (!next.includes("function applySkyRaidEnemyFlightBand")) {
    next = next.replace(
      `function applySkyRaidFlightVisuals(demo: RaidWebGLDemo, flight: SkyDancerSkyRaidFlightSnapshot): void {\n  demo.playerVisual.position.y = 0.62 + flight.altitude;\n  demo.playerVisual.rotation.x = flight.pitch;\n  demo.playerVisual.rotation.z = flight.bank;\n}\n`,
      `function applySkyRaidFlightVisuals(demo: RaidWebGLDemo, flight: SkyDancerSkyRaidFlightSnapshot): void {\n  demo.playerVisual.position.y = 0.62 + flight.altitude;\n  demo.playerVisual.rotation.x = flight.pitch;\n  demo.playerVisual.rotation.z = flight.bank;\n}\n\nfunction applySkyRaidEnemyFlightBand(demo: RaidWebGLDemo): void {\n  const snapshot = demo.session.snapshot();\n  for (const enemy of snapshot.enemies) {\n    if (!enemy.alive) continue;\n    const group = demo.enemyGroups.get(enemy.id);\n    if (!group) continue;\n    // V18's inherited aircraft presentation still writes enemy Y around the\n    // old y=1 flight plane. SKY RAID is the final visual owner, so lift every\n    // live aircraft to the shared engagement altitude after inherited FX run.\n    group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(\n      demo.session.enemies.find((candidate) => candidate.id === enemy.id) ?? enemy as never,\n    );\n  }\n}\n`,
    );
  }
  next = next.replace(
    "  applySkyRaidFlightVisuals(demo, resolvedFlight);\n  visual.arcadeWorld.update",
    "  applySkyRaidFlightVisuals(demo, resolvedFlight);\n  applySkyRaidEnemyFlightBand(demo);\n  visual.arcadeWorld.update",
  );
  if (!next.includes("enemyCombatLane")) {
    next = next.replace(
      `      const projected = player.clone().project(this.camera);\n      return {`,
      `      const projected = player.clone().project(this.camera);\n      let enemyVisible = 0;\n      let enemyCombatLane = 0;\n      const enemyScreenSamples: Array<{ id: string; x: number; y: number; z: number; visible: boolean }> = [];\n      for (const enemy of snapshot.enemies) {\n        if (!enemy.alive || enemy.kind === "boss") continue;\n        const group = this.enemyGroups.get(enemy.id);\n        if (!group) continue;\n        const world = new THREE.Vector3();\n        group.getWorldPosition(world);\n        const ndc = world.clone().project(this.camera);\n        const visible = ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < 0.96 && Math.abs(ndc.y) < 0.94;\n        if (visible) enemyVisible += 1;\n        if (visible && Math.abs(ndc.x) < 0.70 && ndc.y > -0.72 && ndc.y < 0.70) enemyCombatLane += 1;\n        if (enemyScreenSamples.length < 8) enemyScreenSamples.push({ id: enemy.id, x: ndc.x, y: ndc.y, z: ndc.z, visible });\n      }\n      return {`,
    );
    next = next.replace(
      "        hitSerial: weapon.hitSerial,\n        playerVisible:",
      "        hitSerial: weapon.hitSerial,\n        enemyVisible,\n        enemyCombatLane,\n        enemyScreenSamples,\n        playerVisible:",
    );
  }
  next = next.replace(
    "    state.killCueSecondsRemaining = 0;\n    state.killCueSecondsRemaining = 0;",
    "    state.killCueSecondsRemaining = 0;",
  );
  const block = "  if (killDelta > 0) {\n    state.killCueSerial += killDelta;\n    state.killCueSecondsRemaining = 1.18;\n  }";
  next = next.replace(`${block}\n${block}`, block);
  return next;
});

edit("scripts/webgl-sky-raid-camera-edge-v17.mjs", (source) => {
  let next = source;
  if (!next.includes("cueOpacity < 0.85")) {
    next = next.replace(
      "  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\") {\n    throw new Error(`kill confirmation has no visible layout box: ${JSON.stringify(cueVisual)}`);\n  }",
      "  const cueOpacity = Number.parseFloat(cueVisual?.opacity ?? \"0\");\n  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === \"none\" || cueVisual.visibility === \"hidden\" || cueOpacity < 0.85) {\n    throw new Error(`kill confirmation is not visibly rendered: ${JSON.stringify(cueVisual)}`);\n  }",
    );
  }
  if (!next.includes("baseline.enemyVisible < 2")) {
    next = next.replace(
      `  if (Math.abs(baseline.playerNdcY - desiredPlayerNdcY) > baselineFrameTolerance) {\n    throw new Error(\`baseline missed intended combat framing: \${baseline.playerNdcY} target=\${desiredPlayerNdcY}\`);\n  }`,
      `  if (Math.abs(baseline.playerNdcY - desiredPlayerNdcY) > baselineFrameTolerance) {\n    throw new Error(\`baseline missed intended combat framing: \${baseline.playerNdcY} target=\${desiredPlayerNdcY}\`);\n  }\n  if (Number(baseline.enemyVisible ?? 0) < 2) {\n    throw new Error(\`too few enemies are actually visible in the SKY RAID opening frame: \${JSON.stringify(baseline.enemyScreenSamples ?? [])}\`);\n  }\n  if (Number(baseline.enemyCombatLane ?? 0) < 1) {\n    throw new Error(\`SKY RAID opening has no enemy in the central combat lane: \${JSON.stringify(baseline.enemyScreenSamples ?? [])}\`);\n  }`,
    );
  }
  return next;
});

edit("tests/sky-sky-raid.test.ts", (source) => {
  let next = source;
  const marker = 'test("SKY RAID phone feedback stays visible without blocking the combat lane"';
  if (!next.includes(marker)) {
    next += `\n\ntest("SKY RAID phone feedback stays visible without blocking the combat lane", () => {\n  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");\n  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");\n  assert.match(overlaySource, /opacity: 1 !important/);\n  assert.match(overlaySource, /max-width: min\\(42vw, 340px\\)/);\n  assert.match(auditSource, /cueOpacity < 0\\.85/);\n});\n`;
  }
  const enemyMarker = 'test("SKY RAID keeps live enemies inside the visible flight band"';
  if (!next.includes(enemyMarker)) {
    next += `\n\ntest("SKY RAID keeps live enemies inside the visible flight band", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const verticalSource = readFileSync(new URL("../src/sky/SkyDancerVerticalFlightV43.ts", import.meta.url), "utf8");\n  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");\n  assert.match(raidSource, /applySkyRaidEnemyFlightBand/);\n  assert.match(raidSource, /enemyCombatLane/);\n  assert.match(verticalSource, /setSkyDancerEnemyAltitudeReferenceV56/);\n  assert.match(auditSource, /baseline\\.enemyVisible < 2/);\n});\n`;
  }
  return next;
});

console.log("Applied idempotent SKY RAID enemy presence and visual feedback pass");
