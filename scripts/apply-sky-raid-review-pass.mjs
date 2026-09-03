import fs from "node:fs";

function patch(path, transforms) {
  let source = fs.readFileSync(path, "utf8");
  for (const transform of transforms) {
    const { from, to, label } = transform;
    if (source.includes(to)) continue;
    if (!source.includes(from)) throw new Error(`${path}: missing patch anchor: ${label}`);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

patch("src/cart/CartRoguePhase67TurboHunt.ts", [
  {
    label: "defer respawn until kill transition is observed",
    from: `function isSpawnEligible(enemy: CartEnemyState, state: TurboHuntState): boolean {\n  if (enemy.alive || enemy.kind === "boss") return false;\n  if ((state.enemyRespawn.get(enemy.id) ?? 0) > 0) return false;`,
    to: `function isSpawnEligible(enemy: CartEnemyState, state: TurboHuntState): boolean {\n  if (enemy.alive || enemy.kind === "boss") return false;\n  // A missile can destroy an aircraft just before the Hunt wrapper begins its\n  // frame. Do not recycle that slot until handleEnemyTransitions has observed\n  // the alive -> dead edge and installed the normal respawn cooldown.\n  if (state.previousAlive.get(enemy.id) === true) return false;\n  if ((state.enemyRespawn.get(enemy.id) ?? 0) > 0) return false;`,
  },
]);

patch("app/SkyDancerHudV45.tsx", [
  {
    label: "derive target card position from reticle",
    from: `  const reticleY = -altitudeRatio * 24;\n\n  return <>`,
    to: `  const reticleY = -altitudeRatio * 24;\n  // Keep doctrine close to the tracked aircraft instead of laying it across\n  // the player's fuselage. The clamp protects the top HUD and thumb controls.\n  const lockX = clamp(reticleX, -18, 18);\n  const lockTopVh = clamp(43 + reticleY - 9, 29, 55);\n\n  return <>`,
  },
  {
    label: "enlarge combat reticle",
    from: `        width: 48px;\n        height: 48px;`,
    to: `        width: 58px;\n        height: 58px;`,
  },
  {
    label: "make target doctrine compact and readable",
    from: `        left: 50%;\n        top: calc(42% + 48px);\n        transform: translateX(-50%);\n        display: grid;\n        justify-items: center;\n        gap: 2px;\n        min-width: 152px;\n        max-width: min(54vw, 430px);\n        padding: 3px 9px 4px;`,
    to: `        left: 50%;\n        top: 42%;\n        transform: translateX(-50%);\n        display: grid;\n        justify-items: center;\n        gap: 2px;\n        min-width: 142px;\n        max-width: min(46vw, 360px);\n        padding: 4px 10px 5px;`,
  },
  {
    label: "strengthen target card separation",
    from: `        border-bottom: 1px solid rgba(180,235,247,.20);\n        font: 850 clamp(8px,.92vw,10px)/1.05 system-ui,sans-serif;`,
    to: `        border-top: 1px solid rgba(180,235,247,.12);\n        border-bottom: 1px solid rgba(180,235,247,.28);\n        box-shadow: 0 4px 18px rgba(0,18,32,.18);\n        font: 900 clamp(8px,.94vw,10px)/1.05 system-ui,sans-serif;`,
  },
  {
    label: "emphasize fire doctrine",
    from: `        font-size: .92em;\n        letter-spacing: .075em;`,
    to: `        font-size: .98em;\n        font-weight: 950;\n        letter-spacing: .085em;`,
  },
  {
    label: "position doctrine beside tracked target",
    from: `        data-class={decision.className ?? "none"}\n        aria-label="V45 target decision"\n      >`,
    to: `        data-class={decision.className ?? "none"}\n        aria-label="V45 target decision"\n        style={{\n          left: \`calc(50% + \${lockX.toFixed(2)}vw)\`,\n          top: \`\${lockTopVh.toFixed(2)}vh\`,\n        }}\n      >`,
  },
]);

patch("src/sky/SkyDancerAirCombatFxV18.ts", [
  {
    label: "shrink inherited missile warning ring",
    from: `    this.missileWarningRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 28), warningMaterial);`,
    to: `    // This legacy camera-space cue used to fill most of a phone viewport\n    // under the newer SKY RAID chase camera. Keep it as a compact threat halo\n    // around the aircraft; the top HUD now carries the explicit warning text.\n    this.missileWarningRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0055, 4, 24), warningMaterial);`,
  },
  {
    label: "pull warning ticks inward",
    from: `      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.004), warningMaterial.clone());\n      const angle = index * Math.PI * 0.5;\n      marker.position.set(Math.cos(angle) * 0.205, Math.sin(angle) * 0.205, 0);`,
    to: `      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.007, 0.004), warningMaterial.clone());\n      const angle = index * Math.PI * 0.5;\n      marker.position.set(Math.cos(angle) * 0.108, Math.sin(angle) * 0.108, 0);`,
  },
  {
    label: "reduce warning spin and opacity",
    from: `    this.missileWarningRoot.rotation.z += delta * (urgent ? 1.8 : 0.8);\n    this.missileWarningRoot.scale.setScalar(0.9 + strength * 0.2 + pulse * 0.05);\n    for (const child of this.missileWarningRoot.children) {\n      if (!(child instanceof THREE.Mesh)) continue;\n      const material = child.material as THREE.MeshBasicMaterial;\n      material.color.setHex(color);\n      material.opacity = 0.28 + strength * 0.68 * pulse;\n    }`,
    to: `    this.missileWarningRoot.rotation.z += delta * (urgent ? 0.72 : 0.38);\n    this.missileWarningRoot.scale.setScalar(0.92 + strength * 0.12 + pulse * 0.025);\n    for (const child of this.missileWarningRoot.children) {\n      if (!(child instanceof THREE.Mesh)) continue;\n      const material = child.material as THREE.MeshBasicMaterial;\n      material.color.setHex(color);\n      material.opacity = 0.18 + strength * 0.44 * pulse;\n    }`,
  },
]);

console.log("SKY RAID review pass patched source files");
