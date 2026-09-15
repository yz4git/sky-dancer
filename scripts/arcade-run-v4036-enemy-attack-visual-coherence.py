from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


webgl = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
replace_once(
    webgl,
    '''            ? new THREE.ConeGeometry(0.44, 1.9, 10)''',
    '''            ? new THREE.ConeGeometry(0.38, 1.72, 10)''',
)
replace_once(
    webgl,
    '''            blending: THREE.AdditiveBlending,''',
    '''            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,''',
)
replace_once(
    webgl,
    '''          const glow = new THREE.Mesh(
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
          );''',
    '''          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(.52, 10, 8),
            new THREE.MeshBasicMaterial({
              color: 0xff542e,
              transparent: true,
              opacity: .18,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: true,
              toneMapped: false,
            }),
          );''',
)
replace_once(
    webgl,
    '''          const core = new THREE.Mesh(
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
          );''',
    '''          const core = new THREE.Mesh(
            new THREE.SphereGeometry(.12, 9, 7),
            new THREE.MeshBasicMaterial({
              color: 0xfffff0,
              transparent: true,
              opacity: .96,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: true,
              toneMapped: false,
            }),
          );''',
)
replace_once(
    webgl,
    '''          const trailGeometry = new THREE.CylinderGeometry(.07, .2, 3.1, 6);''',
    '''          const trailGeometry = new THREE.CylinderGeometry(.045, .13, 2.25, 6);''',
)
replace_once(
    webgl,
    '''              color: 0xff6b32,
              transparent: true,
              opacity: .56,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: false,
              toneMapped: false,''',
    '''              color: 0xff7a38,
              transparent: true,
              opacity: .34,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: true,
              toneMapped: false,''',
)
replace_once(
    webgl,
    '''          trail.position.z = 1.55;''',
    '''          // V40.36: hostile fire advances toward the player (+local Z), so its streak must remain behind it.
          trail.position.z = -1.2;''',
)
replace_once(
    webgl,
    '''      mesh.rotation.y = course.yaw;
      mesh.rotation.x = course.pitch;
      if (projectile.owner === "enemy" && mesh.material instanceof THREE.MeshBasicMaterial) {''',
    '''      if (projectile.owner === "enemy" && !warning) {
        // V40.36: aim the projectile body at the locked firing solution instead of letting the course tangent fake its direction.
        const targetX = projectile.warningTargetX ?? snapshot.playerX;
        const targetY = projectile.warningTargetY ?? snapshot.playerY;
        const targetCourse = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, 1.65);
        mesh.lookAt(targetX * 8.4 + targetCourse.x, 1.2 + targetY * 4.9 + targetCourse.y, targetCourse.z);
      } else {
        mesh.rotation.y = course.yaw;
        mesh.rotation.x = course.pitch;
      }
      if (projectile.owner === "enemy" && mesh.material instanceof THREE.MeshBasicMaterial) {''',
)
replace_once(
    webgl,
    '''        const dangerPulse = projectile.depth < 14
          ? 1.18 + Math.sin(performance.now() * .03 + projectile.id) * .14
          : 1;''',
    '''        const dangerPulse = projectile.depth < 9
          ? 1.06 + Math.sin(performance.now() * .028 + projectile.id) * .05
          : 1;''',
)
replace_once(
    webgl,
    '''          trail.scale.z = projectile.depth < 14 ? 1.18 : 1;''',
    '''          trail.scale.z = projectile.depth < 9 ? 1.08 : 1;''',
)
replace_once(
    webgl,
    '''            ? 2.1 + Math.sin(performance.now() * .032 + projectile.id) * .42
            : 1.55 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.12''',
    '''            ? 1.55 + Math.sin(performance.now() * .032 + projectile.id) * .2
            : 1.22 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.05''',
)

canvas = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")
replace_once(
    canvas,
    '''        const radius = Math.max(5, projected.scale * 4.2);
        const danger = projectile.depth < 14;
        const dangerPulse = danger ? 1 + Math.sin(snapshot.runTimeSeconds * 22 + projectile.id) * .12 : 1;
        const playerPoint = this.project(snapshot.playerX, snapshot.playerY, 1.65, cssWidth, cssHeight);
        const dx = projected.x - playerPoint.x;
        const dy = projected.y - playerPoint.y;''',
    '''        const radius = Math.max(4, projected.scale * 3.4);
        const danger = projectile.depth < 9;
        const dangerPulse = danger ? 1 + Math.sin(snapshot.runTimeSeconds * 20 + projectile.id) * .06 : 1;
        const targetPoint = this.project(
          projectile.warningTargetX ?? snapshot.playerX,
          projectile.warningTargetY ?? snapshot.playerY,
          1.65,
          cssWidth,
          cssHeight,
        );
        const dx = projected.x - targetPoint.x;
        const dy = projected.y - targetPoint.y;''',
)
replace_once(
    canvas,
    '''        const trailLength = Math.max(14, radius * (danger ? 4.6 : 3.7));
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
        }''',
    '''        const trailLength = Math.max(10, radius * (danger ? 3.3 : 2.8));
        context.save();
        context.lineCap = "round";
        context.shadowColor = "rgba(255,82,38,.82)";
        context.shadowBlur = danger ? 12 : 8;
        const trailGradient = context.createLinearGradient(
          projected.x,
          projected.y,
          projected.x + ux * trailLength,
          projected.y + uy * trailLength,
        );
        trailGradient.addColorStop(0, danger ? "rgba(255,106,50,.58)" : "rgba(255,106,50,.46)");
        trailGradient.addColorStop(1, "rgba(255,106,50,0)");
        context.strokeStyle = trailGradient;
        context.lineWidth = Math.max(2.6, radius * .62);
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .35, projected.y + uy * radius * .35);
        context.lineTo(projected.x + ux * trailLength, projected.y + uy * trailLength);
        context.stroke();
        context.strokeStyle = "rgba(255,238,204,.68)";
        context.lineWidth = Math.max(1.2, radius * .2);
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .2, projected.y + uy * radius * .2);
        context.lineTo(projected.x + ux * trailLength * .58, projected.y + uy * trailLength * .58);
        context.stroke();
        context.fillStyle = danger ? "rgba(255,76,38,.17)" : "rgba(255,76,38,.11)";
        context.beginPath();
        context.arc(projected.x, projected.y, radius * 1.58 * dangerPulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#ff6a32";
        context.beginPath();
        context.arc(projected.x, projected.y, radius * dangerPulse, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = danger ? 6 : 4;
        context.fillStyle = "#ffffed";
        context.beginPath();
        context.arc(projected.x, projected.y, Math.max(1.4, radius * .3), 0, Math.PI * 2);
        context.fill();''',
)

v4035_test = Path("tests/sky-arcade-v4035-projectile-visibility.test.ts")
replace_once(v4035_test, '''  assert.match(source, /depthTest: false/);''', '''  assert.match(source, /trail\\.position\\.z = -1\\.2/);''')
replace_once(v4035_test, '''  assert.match(source, /1\\.55 \\+ Math\\.sin/);''', '''  assert.match(source, /1\\.22 \\+ Math\\.sin/);''')
replace_once(v4035_test, '''  assert.match(source, /const radius = Math\\.max\\(5, projected\\.scale \\* 4\\.2\\)/);''', '''  assert.match(source, /const radius = Math\\.max\\(4, projected\\.scale \\* 3\\.4\\)/);''')
replace_once(v4035_test, '''  assert.match(source, /#fff2d8/);''', '''  assert.match(source, /#ffffed/);''')
replace_once(v4035_test, '''  assert.match(source, /projectile\\.depth < 14/);''', '''  assert.match(source, /projectile\\.depth < 9/);''')

v4036_test = Path("tests/sky-arcade-v4036-enemy-attack-visual-coherence.test.ts")
v4036_test.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\ntest("V40.36 WebGL hostile shots point at their locked solution and trail behind the projectile", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");\n  assert.match(source, /projectile\\.warningTargetX \\?\\? snapshot\\.playerX/);\n  assert.match(source, /mesh\\.lookAt\\(/);\n  assert.match(source, /trail\\.position\\.z = -1\\.2/);\n  assert.match(source, /depthTest: true/);\n  assert.match(source, /1\\.22 \\+ Math\\.sin/);\n});\n\ntest("V40.36 Canvas hostile shots use the locked solution and a fading directional streak", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");\n  assert.match(source, /const targetPoint = this\\.project/);\n  assert.match(source, /projectile\\.warningTargetX \\?\\? snapshot\\.playerX/);\n  assert.match(source, /createLinearGradient/);\n  assert.match(source, /trailGradient\\.addColorStop\\(1, "rgba\\(255,106,50,0\\)"\\)/);\n  assert.match(source, /const danger = projectile\\.depth < 9/);\n});\n''')

print("Applied Arcade Run V40.36 enemy attack visual coherence patch")
