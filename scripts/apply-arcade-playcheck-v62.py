from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch target in {path}: {old[:120]!r}")
    text = text.replace(old, new, 1)
    p.write_text(text)


runtime = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
presentation = "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
tests = "tests/sky-arcade-run.test.ts"
audit = "scripts/webgl-arcade-run-reference-audit.mjs"

# NORMAL should feel like an arcade flight game, not a burst-death stress test.
replace_once(runtime, "const MAX_ENEMY_PROJECTILES_NORMAL = 6;", "const MAX_ENEMY_PROJECTILES_NORMAL = 5;")
replace_once(runtime, "  private damageSerial = 0;\n  private stageSerial = 1;", "  private damageSerial = 0;\n  private damageCooldown = 0;\n  private stageSerial = 1;")
replace_once(
    runtime,
    "    this.nextWaveAt = this.stageTime + 1.6;\n    this.nextHazardAt = this.stageTime + 2.7;",
    "    // Give each section a readable establishing beat before the first pressure wave.\n    this.nextWaveAt = this.stageTime + (rewindTime > 0 ? 1.35 : 2.35);\n    this.nextHazardAt = this.stageTime + (rewindTime > 0 ? 2.0 : 4.1);\n    this.damageCooldown = 0;",
)
replace_once(
    runtime,
    "    this.messageTimer = Math.max(0, this.messageTimer - delta);\n    if (this.messageTimer <= 0) this.message = null;",
    "    this.messageTimer = Math.max(0, this.messageTimer - delta);\n    this.damageCooldown = Math.max(0, this.damageCooldown - delta);\n    if (this.messageTimer <= 0) this.message = null;",
)
replace_once(
    runtime,
    "    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < 15) {",
    "    const enemyCap = this.options.difficulty === \"hard\" ? 15 : 11;\n    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {",
)
replace_once(
    runtime,
    "    const count = 3 + Math.floor(this.random() * 3) + hardBonus;",
    "    const count = 3 + Math.floor(this.random() * 2) + hardBonus;",
)
replace_once(
    runtime,
    "          this.takeDamage(enemy.boss ? 34 : 22);\n          enemy.alive = false;",
    "          const hard = this.options.difficulty === \"hard\";\n          this.takeDamage(enemy.boss ? (hard ? 34 : 26) : (hard ? 22 : 16));\n          enemy.alive = false;",
)
replace_once(
    runtime,
    "        damage: enemy.boss ? (hard ? 18 : 13) : hard ? 13 : 9,",
    "        damage: enemy.boss ? (hard ? 18 : 11) : hard ? 13 : 8,",
)
replace_once(
    runtime,
    "          this.takeDamage(hazard.kind === \"lightning\" ? 18 : 24);",
    "          const hard = this.options.difficulty === \"hard\";\n          this.takeDamage(hazard.kind === \"lightning\" ? (hard ? 18 : 13) : (hard ? 24 : 18));",
)
replace_once(
    runtime,
    "  private takeDamage(amount: number): void {\n    const effective = this.input.turbo ? amount * 0.72 : amount;",
    "  private takeDamage(amount: number): void {\n    // Prevent overlapping missiles/fly-bys from deleting the airframe in a single unreadable burst.\n    if (this.damageCooldown > 0) return;\n    this.damageCooldown = this.options.difficulty === \"hard\" ? .28 : .5;\n    const effective = this.input.turbo ? amount * 0.72 : amount;",
)

# Keep frequent fighter kills punchy without throwing a full-screen shock ring over every target.
replace_once(
    webgl,
    "        const climaxStrength = previous.boss ? 1.7 : previous.kind === \"bomber\" || previous.kind === \"missile-boat\" ? 1.02 : .72;\n        this.presentation.emitClimax(group.position, climaxStrength);\n        this.cameraShake = Math.min(1.18, this.cameraShake + (previous.boss ? .74 : .18));",
    "        const heavyClimax = previous.boss || previous.kind === \"bomber\" || previous.kind === \"missile-boat\";\n        if (heavyClimax) {\n          const climaxStrength = previous.boss ? 1.7 : 1.02;\n          this.presentation.emitClimax(group.position, climaxStrength);\n        } else {\n          this.presentation.emitBurst(group.position, .72);\n        }\n        this.cameraShake = Math.min(1.18, this.cameraShake + (previous.boss ? .74 : heavyClimax ? .18 : .1));",
)
replace_once(
    webgl,
    "    this.camera.rotateZ(pose.roll + course.bank * .44 + courseAim.bank * .16);",
    "    // Let the aircraft bank dramatically while keeping the horizon readable on a phone.\n    this.camera.rotateZ(pose.roll + course.bank * .28 + courseAim.bank * .08);",
)

# Heavy destruction still gets a shock wave, but it should frame the action rather than wash over the HUD.
replace_once(
    presentation,
    "    this.climaxMaterial.opacity = Math.min(.48, .055 + this.climaxEnergy * .36);",
    "    this.climaxMaterial.opacity = Math.min(.32, .035 + this.climaxEnergy * .24);",
)
replace_once(
    presentation,
    "    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 2.2);\n    this.climaxRing.quaternion.copy(camera.quaternion);\n    this.climaxRing.scale.setScalar(.82 + (1 - this.climaxPulse) * 2.8);\n    this.climaxRingMaterial.opacity = Math.min(.62, this.climaxPulse * .7);",
    "    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 3.4);\n    this.climaxRing.quaternion.copy(camera.quaternion);\n    this.climaxRing.scale.setScalar(.72 + (1 - this.climaxPulse) * 1.75);\n    this.climaxRingMaterial.opacity = Math.min(.38, this.climaxPulse * .42);",
)

# Update contracts and add a deterministic NORMAL-pressure regression check.
replace_once(tests, "assert.match(runtimeSource, /MAX_ENEMY_PROJECTILES_NORMAL = 6/);", "assert.match(runtimeSource, /MAX_ENEMY_PROJECTILES_NORMAL = 5/);")
replace_once(tests, "assert.ok(maxThreats <= 6, `normal threat budget ${maxThreats}`);", "assert.ok(maxThreats <= 5, `normal threat budget ${maxThreats}`);")
marker = 'test("enemy missiles curve during guidance then commit to a dodgeable terminal path", async () => {'
insert = '''test("V6.2 NORMAL opening pressure preserves reaction time and readable damage cadence", async () => {\n  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });\n  for (let frame = 0; frame < 720; frame += 1) runtime.step(1 / 60);\n  const snapshot = runtime.getSnapshot();\n  assert.equal(snapshot.status, "running");\n  assert.equal(snapshot.continuesRemaining, SKY_DANCER_ARCADE_MAX_CONTINUES);\n  assert.ok(snapshot.playerHp > 20, `opening HP ${snapshot.playerHp}`);\n\n  const [runtimeSource, webglSource, presentationSource] = await Promise.all([\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),\n  ]);\n  assert.match(runtimeSource, /damageCooldown = this\\.options\\.difficulty === "hard" \\? \\.28 : \\.5/);\n  assert.match(runtimeSource, /enemyCap = this\\.options\\.difficulty === "hard" \\? 15 : 11/);\n  assert.match(webglSource, /heavyClimax/);\n  assert.match(webglSource, /emitBurst\\(group\\.position, \\.72\\)/);\n  assert.match(presentationSource, /addScaledVector\\(this\\.forward, 3\\.4\\)/);\n  assert.match(webglSource, /course\\.bank \\* \\.28 \\+ courseAim\\.bank \\* \\.08/);\n});\n\n'''
replace_once(tests, marker, insert + marker)

# Make the real-screen audit explicitly measure survivability during the course showcase.
replace_once(
    audit,
    "// 2026-08-31 V6.1 visual playcheck: verify the stronger opening S-turn, readable banking, fly-bys and combat.",
    "// 2026-08-31 V6.2 visual playcheck: verify course readability, fair NORMAL pressure and restrained kill feedback.",
)
replace_once(
    audit,
    "const bodyText = async () => page.locator(\"body\").innerText();\nconst destroyedCount = async () => {",
    "const bodyText = async () => page.locator(\"body\").innerText();\nconst hpPercent = (text) => {\n  const match = text.match(/AIRFRAME\\s*([0-9]+)%/i);\n  return match ? Number(match[1]) : null;\n};\nconst destroyedCount = async () => {",
)
replace_once(
    audit,
    "await page.waitForTimeout(1700);\nawait page.screenshot({ path: `${outputDir}/00c-course-bend-b.png`, fullPage: true });",
    "await page.waitForTimeout(1700);\nawait page.screenshot({ path: `${outputDir}/00c-course-bend-b.png`, fullPage: true });\nconst bendText = await bodyText();\nconst bendHp = hpPercent(bendText);",
)
replace_once(
    audit,
    "  courseTime,\n  destroyedBefore,",
    "  courseTime,\n  bendHp,\n  finalHp: hpPercent(finalText),\n  destroyedBefore,",
)
replace_once(
    audit,
    "if (!renderState.webgl || renderState.cssWidth < 800 || renderState.cssHeight < 360) throw new Error(`Arcade Run WebGL surface is invalid: ${JSON.stringify(renderState)}`);\n// Destruction capture is diagnostic only;",
    "if (!renderState.webgl || renderState.cssWidth < 800 || renderState.cssHeight < 360) throw new Error(`Arcade Run WebGL surface is invalid: ${JSON.stringify(renderState)}`);\nif (bendHp !== null && bendHp < 55) throw new Error(`NORMAL opening pressure is still too bursty during the course showcase: ${bendHp}%`);\nif (/AIRFRAME LOST|MISSION FAILED/i.test(finalText)) throw new Error(`Arcade playcheck lost the airframe before the first section climax`);\n// Destruction capture is diagnostic only;",
)

print("Arcade Run V6.2 playcheck patch applied")
