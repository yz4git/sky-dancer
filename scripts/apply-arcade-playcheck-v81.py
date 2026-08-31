from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

# 1) Turbo-only camera safety: keep normal wide-field flight, but pull/follow more while boosting.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCamera.ts",
    '''  return {\n    // Landscape still lets the craft cross the frame, while portrait keeps the proven safe framing.\n    x: playerX * (5.15 + phone * 2.55),\n    y: 5.2 + phone * 3 + playerY * (1.95 + phone * .77),\n    z: 16.35 + portraitPullback + (turbo ? .8 : 0),\n    lookX: playerX * (3.45 + phone * 3.9),\n    lookY: .8 + playerY * (1.15 + phone * 1.13),\n    lookZ: -34,\n    fov: turbo ? 67 : 56,\n    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),\n  };\n''',
    '''  const turboFollow = turbo ? 1 : 0;\n  return {\n    // Normal flight keeps the full cross-frame range; Turbo adds a safety follow/pullback so the\n    // airframe cannot disappear behind the phone edge while the wider FOV sells acceleration.\n    x: playerX * (5.15 + phone * 2.55 + turboFollow * .95),\n    y: 5.2 + phone * 3 + playerY * (1.95 + phone * .77 + turboFollow * 1.08),\n    z: 16.35 + portraitPullback + turboFollow * 1.8,\n    lookX: playerX * (3.45 + phone * 3.9 + turboFollow * .72),\n    lookY: .8 + playerY * (1.15 + phone * 1.13 + turboFollow * .82),\n    lookZ: -34,\n    fov: turbo ? 69 : 56,\n    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),\n  };\n''',
    "turbo camera safety",
)

# 2) Choreography readability: cross-passes remain close but no longer intersect the player's silhouette.
replace_once(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '''            enemy.depth = moveToward(enemy.depth, 12.6, delta * 8);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.86 - eased * 3.72), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.62 + Math.sin(t * Math.PI + enemy.phase) * 0.62, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n''',
    '''            enemy.depth = moveToward(enemy.depth, 13.8, delta * 8);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.86 - eased * 3.72), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            const verticalLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;\n            enemy.y = clamp(this.playerY * .35 + verticalLane * .88 + Math.sin(t * Math.PI + enemy.phase) * .16, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n''',
    "cross pass separation",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '''            enemy.depth = moveToward(enemy.depth, 11.8 + Math.sin(enemy.maneuverClock * 3) * 1.5, delta * 7.6);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.36 - arc * 0.48) + Math.sin(enemy.maneuverClock * 3.15 + enemy.phase) * 0.28, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n''',
    '''            enemy.depth = moveToward(enemy.depth, 13.2 + Math.sin(enemy.maneuverClock * 3) * 1.25, delta * 7.6);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.52 - arc * .34) + Math.sin(enemy.maneuverClock * 3.15 + enemy.phase) * .18, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n''',
    "close bank separation",
)

# 3) Perspective is enough to make close aircraft large; remove the extra V8 scale inflation and clamp only extreme fly-bys.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''      if (!enemy.boss) {\n        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;\n        const closeBoost = 1 + THREE.MathUtils.clamp((28 - enemy.depth) / 24, 0, 1) * .16;\n        group.scale.setScalar(baseScale * closeBoost);\n      }\n''',
    '''      if (!enemy.boss) {\n        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;\n        const extremeCloseClamp = 1 - THREE.MathUtils.clamp((18 - enemy.depth) / 15, 0, 1) * .18;\n        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.035 : 1;\n        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp);\n      }\n''',
    "near pass scale clamp",
)

# 4) Full-screen shock rings are boss-only. Heavy ordinary craft get a strong local burst instead.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''        const heavyClimax = previous.boss || previous.kind === "bomber" || previous.kind === "missile-boat";\n        if (heavyClimax) {\n          const climaxStrength = previous.boss ? 1.7 : 1.02;\n          this.presentation.emitClimax(group.position, climaxStrength);\n        } else {\n          this.presentation.emitBurst(group.position, .72);\n        }\n        this.cameraShake = Math.min(1.18, this.cameraShake + (previous.boss ? .74 : heavyClimax ? .18 : .1));\n''',
    '''        const heavyCraft = previous.kind === "bomber" || previous.kind === "missile-boat";\n        if (previous.boss) {\n          this.presentation.emitClimax(group.position, 1.5);\n        } else if (heavyCraft) {\n          this.presentation.emitBurst(group.position, .98);\n        } else {\n          this.presentation.emitBurst(group.position, .72);\n        }\n        this.cameraShake = Math.min(1.08, this.cameraShake + (previous.boss ? .68 : heavyCraft ? .14 : .1));\n''',
    "boss-only climax",
)

# 5) Even boss climax should punctuate, not whitewash the HUD/corridor.
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '''    this.climaxMaterial.opacity = Math.min(.32, .035 + this.climaxEnergy * .24);\n    this.climaxFlash.visible = this.climaxEnergy > .001;\n    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 3.4);\n    this.climaxRing.quaternion.copy(camera.quaternion);\n    this.climaxRing.scale.setScalar(.72 + (1 - this.climaxPulse) * 1.75);\n    this.climaxRingMaterial.opacity = Math.min(.38, this.climaxPulse * .42);\n''',
    '''    this.climaxMaterial.opacity = Math.min(.2, .018 + this.climaxEnergy * .15);\n    this.climaxFlash.visible = this.climaxEnergy > .001;\n    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 3.8);\n    this.climaxRing.quaternion.copy(camera.quaternion);\n    this.climaxRing.scale.setScalar(.62 + (1 - this.climaxPulse) * 1.2);\n    this.climaxRingMaterial.opacity = Math.min(.24, this.climaxPulse * .27);\n''',
    "restrained boss climax",
)

# 6) Tests: preserve V8 speed contract and add concrete V8.1 separation/presentation contracts.
test_path = Path("tests/sky-arcade-run.test.ts")
test = test_path.read_text()
test = test.replace('assert.match(cameraSource, /fov: turbo \\? 67 : 56/);', 'assert.match(cameraSource, /fov: turbo \\? 69 : 56/);', 1)
anchor = '''test("V8 speed pass keeps enemies close and choreographs dogfight fly-bys", async () => {'''
if anchor not in test:
    raise SystemExit("missing V8 test anchor")
append = r'''

test("V8.1 playcheck keeps close dogfights readable and the Turbo airframe on-screen", async () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  let minCrossPassSeparation = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 1500; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss || enemy.maneuver !== "cross-pass" || enemy.depth >= 18) continue;
      minCrossPassSeparation = Math.min(minCrossPassSeparation, Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY));
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(Number.isFinite(minCrossPassSeparation), "expected at least one close cross-pass sample");
  assert.ok(minCrossPassSeparation >= .58, `cross-pass separation ${minCrossPassSeparation}`);

  const [webgl, presentation, camera] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeCamera.ts", import.meta.url), "utf8"),
  ]);
  assert.match(webgl, /extremeCloseClamp/);
  assert.match(webgl, /if \(previous\.boss\)[\s\S]*emitClimax\(group\.position, 1\.5\)/);
  assert.match(webgl, /heavyCraft[\s\S]*emitBurst\(group\.position, \.98\)/);
  assert.match(presentation, /Math\.min\(\.2, \.018 \+ this\.climaxEnergy \* \.15\)/);
  assert.match(presentation, /Math\.min\(\.24, this\.climaxPulse \* \.27\)/);
  assert.match(camera, /turboFollow \* \.95/);
  assert.match(camera, /turboFollow \* 1\.08/);
  assert.match(camera, /fov: turbo \? 69 : 56/);
});
'''
test_path.write_text(test + append)

# Self-delete helper/workflow after successful patch; the workflow itself performs the commit.
Path("scripts/apply-arcade-playcheck-v81.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-playcheck-v81-once.yml").unlink(missing_ok=True)
