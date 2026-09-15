from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


webgl = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
canvas = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")
test_path = Path("tests/sky-arcade-v4035-projectile-visibility.test.ts")

replace_once(webgl, '''        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.28, 1.58, 8)
          : enemyMissile
            ? new THREE.ConeGeometry(0.36, 1.62, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);
        geometry.rotateX(Math.PI / 2);
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: enemyMissile ? 1 : 0.94,
            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        if (projectile.owner === "enemy") mesh.renderOrder = 8;
        mesh.userData.arcadeLoadoutV117 = snapshot.loadout;
        this.projectileMeshes.set(projectile.id, mesh);
        this.projectileRoot.add(mesh);''', '''        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.28, 1.58, 8)
          : enemyMissile
            ? new THREE.ConeGeometry(0.44, 1.9, 10)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);
        geometry.rotateX(Math.PI / 2);
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: enemyMissile ? .98 : 0.94,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        if (enemyMissile) {
          mesh.renderOrder = 8;
          // V40.35: keep collision untouched while giving hostile fire a bright core, halo and readable motion streak.
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(.72, 10, 8),
            new THREE.MeshBasicMaterial({
              color: 0xff3f24,
              transparent: true,
              opacity: .3,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: false,
              toneMapped: false,
            }),
          );
          glow.name = "arcade-enemy-projectile-glow-v4035";
          glow.renderOrder = 10;
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(.19, 9, 7),
            new THREE.MeshBasicMaterial({
              color: 0xfff2d8,
              transparent: true,
              opacity: .98,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: false,
              toneMapped: false,
            }),
          );
          core.name = "arcade-enemy-projectile-core-v4035";
          core.renderOrder = 11;
          const trailGeometry = new THREE.CylinderGeometry(.07, .2, 3.1, 6);
          trailGeometry.rotateX(Math.PI / 2);
          const trail = new THREE.Mesh(
            trailGeometry,
            new THREE.MeshBasicMaterial({
              color: 0xff6b32,
              transparent: true,
              opacity: .56,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: false,
              toneMapped: false,
            }),
          );
          trail.name = "arcade-enemy-projectile-trail-v4035";
          trail.position.z = 1.55;
          trail.renderOrder = 9;
          mesh.add(glow, core, trail);
        }
        mesh.userData.arcadeLoadoutV117 = snapshot.loadout;
        this.projectileMeshes.set(projectile.id, mesh);
        this.projectileRoot.add(mesh);''')

replace_once(webgl, '''      if (projectile.owner === "enemy" && mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.setHex(warning ? 0xff315e : 0xff8a2b);
        mesh.material.opacity = warning ? .48 : 1;
        mesh.material.wireframe = warning;
      }
      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? warning
            ? 2.1 + Math.sin(performance.now() * .032 + projectile.id) * .42
            : 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
      mesh.scale.setScalar(pulse);''', '''      if (projectile.owner === "enemy" && mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.setHex(warning ? 0xff315e : 0xff5a36);
        mesh.material.opacity = warning ? .5 : .98;
        mesh.material.wireframe = warning;
        const glow = mesh.getObjectByName("arcade-enemy-projectile-glow-v4035");
        const core = mesh.getObjectByName("arcade-enemy-projectile-core-v4035");
        const trail = mesh.getObjectByName("arcade-enemy-projectile-trail-v4035");
        const dangerPulse = projectile.depth < 14
          ? 1.18 + Math.sin(performance.now() * .03 + projectile.id) * .14
          : 1;
        if (glow) {
          glow.visible = !warning;
          glow.scale.setScalar(dangerPulse);
        }
        if (core) core.visible = !warning;
        if (trail) {
          trail.visible = !warning;
          trail.scale.z = projectile.depth < 14 ? 1.18 : 1;
        }
      }
      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? warning
            ? 2.1 + Math.sin(performance.now() * .032 + projectile.id) * .42
            : 1.55 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.12
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
      mesh.scale.setScalar(pulse);''')

replace_once(canvas, '''      if (projectile.owner === "player-missile") {
        context.strokeStyle = "rgba(255,255,255,.84)";
        context.lineWidth = Math.max(2.4, projected.scale * 5.2);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(projected.x, projected.y + projected.scale * 3);
        context.lineTo(projected.x, projected.y + projected.scale * 20);
        context.stroke();
      }
      context.fillStyle = projectile.owner === "enemy" ? "#ff4968" : projectile.owner === "player-missile" ? "#fff0c8" : "#fff1a8";
      context.beginPath();
      context.arc(projected.x, projected.y, Math.max(1.5, projected.scale * (projectile.owner === "player-missile" ? 4.8 : 2.4)), 0, Math.PI * 2);
      context.fill();''', '''      if (projectile.owner === "player-missile") {
        context.strokeStyle = "rgba(255,255,255,.84)";
        context.lineWidth = Math.max(2.4, projected.scale * 5.2);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(projected.x, projected.y + projected.scale * 3);
        context.lineTo(projected.x, projected.y + projected.scale * 20);
        context.stroke();
      }
      if (projectile.owner === "enemy") {
        // V40.35: hostile shots keep a phone-readable minimum footprint without changing their hit radius.
        const radius = Math.max(5, projected.scale * 4.2);
        const danger = projectile.depth < 14;
        const dangerPulse = danger ? 1 + Math.sin(snapshot.runTimeSeconds * 22 + projectile.id) * .12 : 1;
        const playerPoint = this.project(snapshot.playerX, snapshot.playerY, 1.65, cssWidth, cssHeight);
        const dx = projected.x - playerPoint.x;
        const dy = projected.y - playerPoint.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const trailLength = Math.max(14, radius * (danger ? 4.6 : 3.7));
        context.save();
        context.lineCap = "round";
        context.shadowColor = "rgba(255,61,36,.95)";
        context.shadowBlur = danger ? 18 : 13;
        context.strokeStyle = "rgba(255,76,42,.52)";
        context.lineWidth = Math.max(4.5, radius * 1.05);
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .4, projected.y + uy * radius * .4);
        context.lineTo(projected.x + ux * trailLength, projected.y + uy * trailLength);
        context.stroke();
        context.strokeStyle = "rgba(255,224,183,.92)";
        context.lineWidth = Math.max(1.8, radius * .3);
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .25, projected.y + uy * radius * .25);
        context.lineTo(projected.x + ux * trailLength * .72, projected.y + uy * trailLength * .72);
        context.stroke();
        context.fillStyle = "rgba(255,64,34,.24)";
        context.beginPath();
        context.arc(projected.x, projected.y, radius * 2.15 * dangerPulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#ff5a36";
        context.beginPath();
        context.arc(projected.x, projected.y, radius * dangerPulse, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 8;
        context.fillStyle = "#fff2d8";
        context.beginPath();
        context.arc(projected.x, projected.y, Math.max(2.2, radius * .42), 0, Math.PI * 2);
        context.fill();
        if (danger) {
          context.shadowBlur = 0;
          context.strokeStyle = "rgba(255,240,215,.72)";
          context.lineWidth = 1.8;
          context.beginPath();
          context.arc(projected.x, projected.y, radius * 1.55 * dangerPulse, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
        continue;
      }
      context.fillStyle = projectile.owner === "player-missile" ? "#fff0c8" : "#fff1a8";
      context.beginPath();
      context.arc(projected.x, projected.y, Math.max(1.5, projected.scale * (projectile.owner === "player-missile" ? 4.8 : 2.4)), 0, Math.PI * 2);
      context.fill();''')

test_path.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\ntest("V40.35 hostile projectiles have a dedicated WebGL glow, bright core and trail", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");\n  assert.match(source, /arcade-enemy-projectile-glow-v4035/);\n  assert.match(source, /arcade-enemy-projectile-core-v4035/);\n  assert.match(source, /arcade-enemy-projectile-trail-v4035/);\n  assert.match(source, /depthTest: false/);\n  assert.match(source, /1\\.55 \+ Math\\.sin/);\n});\n\ntest("V40.35 Canvas hostile projectiles keep a large phone-readable footprint", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");\n  assert.match(source, /const radius = Math\\.max\\(5, projected\\.scale \\* 4\\.2\\)/);\n  assert.match(source, /trailLength/);\n  assert.match(source, /#fff2d8/);\n  assert.match(source, /projectile\\.depth < 14/);\n});\n''')

print("Applied Arcade Run V40.35 projectile visibility patch")
