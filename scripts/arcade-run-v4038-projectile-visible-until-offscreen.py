from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:140]!r}")
    path.write_text(text.replace(old, new, 1))


webgl = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
replace_once(
    webgl,
    '''      // V40.37: after a hostile shot passes the player plane, keep it in front of the camera\n      // long enough to fade out instead of letting the near clip plane visibly slice it away.\n      const hostileExitFade = projectile.owner === "enemy" && !warning && projectile.depth < .8\n        ? Math.max(0, Math.min(1, (projectile.depth + 3) / 3.8))\n        : 1;\n      const visualDepth = warning\n        ? 1.65\n        : projectile.owner === "enemy"\n          ? Math.max(.58, projectile.depth)\n          : projectile.depth;\n      const visualX = warning ? (projectile.warningTargetX ?? snapshot.playerX) : projectile.x;\n      const visualY = warning ? (projectile.warningTargetY ?? snapshot.playerY) : projectile.y;\n''',
    '''      // V40.38: once a missed hostile shot crosses the player plane, keep it fully visible\n      // and carry it outward until it has actually left the viewport. Gameplay lifetime still\n      // owns deletion at depth < -3, so the renderer never makes a visible shot vanish early.\n      const hostileExitTravel = projectile.owner === "enemy" && !warning && projectile.depth < .35\n        ? .35 - projectile.depth\n        : 0;\n      const exitTargetX = projectile.warningTargetX ?? snapshot.playerX;\n      const exitTargetY = projectile.warningTargetY ?? snapshot.playerY;\n      const exitDx = projectile.x - exitTargetX;\n      const exitDy = projectile.y - exitTargetY;\n      const exitLength = Math.hypot(exitDx, exitDy);\n      const exitUx = exitLength > .01 ? exitDx / exitLength : (projectile.id % 2 === 0 ? 1 : -1);\n      const exitUy = exitLength > .01 ? exitDy / exitLength : ((projectile.id % 3) - 1) * .38;\n      const hostileExitPush = hostileExitTravel * 2.6;\n      const visualDepth = warning\n        ? 1.65\n        : projectile.owner === "enemy"\n          ? Math.max(.58, projectile.depth)\n          : projectile.depth;\n      const visualX = warning ? exitTargetX : projectile.x + exitUx * hostileExitPush;\n      const visualY = warning ? exitTargetY : projectile.y + exitUy * hostileExitPush;\n''',
)
replace_once(
    webgl,
    '''        mesh.material.color.setHex(warning ? 0xff315e : 0xff5a36);\n        mesh.material.opacity = warning ? .5 : .98 * hostileExitFade;\n        mesh.material.wireframe = warning;\n''',
    '''        mesh.material.color.setHex(warning ? 0xff315e : 0xff5a36);\n        mesh.material.opacity = warning ? .5 : .98;\n        mesh.material.wireframe = warning;\n''',
)
replace_once(
    webgl,
    '''        if (glow) {\n          glow.visible = !warning;\n          glow.scale.setScalar(dangerPulse);\n          if (glow instanceof THREE.Mesh && glow.material instanceof THREE.MeshBasicMaterial) glow.material.opacity = .18 * hostileExitFade;\n        }\n        if (core) {\n          core.visible = !warning;\n          if (core instanceof THREE.Mesh && core.material instanceof THREE.MeshBasicMaterial) core.material.opacity = .94 * hostileExitFade;\n        }\n        if (trail) {\n          trail.visible = !warning;\n          trail.scale.z = projectile.depth < 9 ? 1.08 : 1;\n          if (trail instanceof THREE.Mesh && trail.material instanceof THREE.MeshBasicMaterial) trail.material.opacity = .38 * hostileExitFade;\n        }\n''',
    '''        if (glow) {\n          glow.visible = !warning;\n          glow.scale.setScalar(dangerPulse);\n          if (glow instanceof THREE.Mesh && glow.material instanceof THREE.MeshBasicMaterial) glow.material.opacity = .18;\n        }\n        if (core) {\n          core.visible = !warning;\n          if (core instanceof THREE.Mesh && core.material instanceof THREE.MeshBasicMaterial) core.material.opacity = .94;\n        }\n        if (trail) {\n          trail.visible = !warning;\n          trail.scale.z = projectile.depth < 9 ? 1.08 : 1;\n          if (trail instanceof THREE.Mesh && trail.material instanceof THREE.MeshBasicMaterial) trail.material.opacity = .38;\n        }\n''',
)

canvas = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")
replace_once(
    canvas,
    '''      // V40.37 mirrors WebGL: keep a missed hostile shot visually alive through its near pass,\n      // then fade it instead of visibly popping at the gameplay despawn depth.\n      const hostileExitFade = projectile.owner === "enemy" && !warning && projectile.depth < .8\n        ? Math.max(0, Math.min(1, (projectile.depth + 3) / 3.8))\n        : 1;\n      const projected = this.project(\n        warning ? warningX : projectile.x,\n        warning ? warningY : projectile.y,\n        warning ? 1.65 : projectile.owner === "enemy" ? Math.max(.58, projectile.depth) : projectile.depth,\n        cssWidth,\n        cssHeight,\n      );\n''',
    '''      // V40.38 mirrors WebGL: never fade a still-visible missed hostile shot. After the\n      // near pass, carry it outward until it has naturally left the viewport, then let the\n      // existing gameplay despawn remove it later.\n      const hostileExitTravel = projectile.owner === "enemy" && !warning && projectile.depth < .35\n        ? .35 - projectile.depth\n        : 0;\n      const exitDx = projectile.x - warningX;\n      const exitDy = projectile.y - warningY;\n      const exitLength = Math.hypot(exitDx, exitDy);\n      const exitUx = exitLength > .01 ? exitDx / exitLength : (projectile.id % 2 === 0 ? 1 : -1);\n      const exitUy = exitLength > .01 ? exitDy / exitLength : ((projectile.id % 3) - 1) * .38;\n      const hostileExitPush = hostileExitTravel * 2.6;\n      const projected = this.project(\n        warning ? warningX : projectile.x + exitUx * hostileExitPush,\n        warning ? warningY : projectile.y + exitUy * hostileExitPush,\n        warning ? 1.65 : projectile.owner === "enemy" ? Math.max(.58, projectile.depth) : projectile.depth,\n        cssWidth,\n        cssHeight,\n      );\n''',
)
replace_once(
    canvas,
    '''        context.save();\n        context.globalAlpha *= hostileExitFade;\n        context.lineCap = "round";\n''',
    '''        context.save();\n        context.lineCap = "round";\n''',
)

Path("tests/sky-arcade-v4038-projectile-visible-until-offscreen.test.ts").write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\ntest("V40.38 WebGL keeps hostile shots opaque and moves them offscreen before gameplay despawn", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");\n  assert.match(source, /const hostileExitTravel = projectile\.owner === "enemy"/);\n  assert.match(source, /const hostileExitPush = hostileExitTravel \* 2\.6/);\n  assert.match(source, /projectile\.x \+ exitUx \* hostileExitPush/);\n  assert.match(source, /projectile\.y \+ exitUy \* hostileExitPush/);\n  assert.match(source, /mesh\.material\.opacity = warning \? \.5 : \.98/);\n  assert.doesNotMatch(source, /hostileExitFade/);\n});\n\ntest("V40.38 Canvas keeps hostile shots fully visible until their projected path leaves the viewport", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");\n  assert.match(source, /const hostileExitTravel = projectile\.owner === "enemy"/);\n  assert.match(source, /const hostileExitPush = hostileExitTravel \* 2\.6/);\n  assert.match(source, /projectile\.x \+ exitUx \* hostileExitPush/);\n  assert.match(source, /projectile\.y \+ exitUy \* hostileExitPush/);\n  assert.doesNotMatch(source, /hostileExitFade/);\n});\n''')
