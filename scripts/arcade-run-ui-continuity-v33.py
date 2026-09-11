from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return source.replace(old, new, 1)

# WebGL route gates: preserve the committed gate long enough to read as a fly-through.
webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
webgl = webgl_path.read_text()
webgl = replace_once(webgl,
'''  private currentStageId: string;
  private cameraShake = 0;''',
'''  private currentStageId: string;
  // V33: route gates own a short exit shot after route resolution instead of hard-toggling invisible.
  private branchGateExitTimer = 0;
  private branchGateExitSelection: string | null = null;
  private cameraShake = 0;''', 'webgl fields')
webgl = replace_once(webgl,
'''  private syncBranchGates(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.branchRoot.visible = snapshot.branchActive;
    if (!snapshot.branchActive) return;
    const gateDepth = 82;
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, gateDepth);
    this.branchRoot.children.forEach((child, index) => {
      const baseX = typeof child.userData.baseX === "number" ? child.userData.baseX : 0;
      child.position.set(baseX + course.x, 1.2 + course.y, course.z);
      child.rotation.y = course.yaw;
      child.rotation.x = course.pitch;
      child.rotation.z += delta * (index % 2 === 0 ? 0.7 : -0.7);
      const selected = snapshot.branchSelection === snapshot.branchOptions[index];
      child.scale.setScalar(selected ? 1.2 + Math.sin(performance.now() * 0.012) * 0.08 : 0.92);
    });
  }''',
'''  private syncBranchGates(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const resolvedThisFrame = this.previousSnapshot.branchActive && !snapshot.branchActive && snapshot.branchSelection !== null;
    if (snapshot.branchActive) {
      this.branchGateExitTimer = .82;
      this.branchGateExitSelection = snapshot.branchSelection;
    } else if (resolvedThisFrame) {
      this.branchGateExitTimer = .82;
      this.branchGateExitSelection = snapshot.branchSelection;
    } else {
      this.branchGateExitTimer = Math.max(0, this.branchGateExitTimer - delta);
    }

    const exiting = !snapshot.branchActive && this.branchGateExitTimer > 0;
    const presenting = snapshot.branchActive || exiting;
    this.branchRoot.visible = presenting;
    if (!presenting) return;

    const exitProgress = exiting ? THREE.MathUtils.clamp(1 - this.branchGateExitTimer / .82, 0, 1) : 0;
    const gateDepth = exiting ? 82 - exitProgress * 34 : 82;
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, gateDepth);
    const selectedId = snapshot.branchSelection ?? this.branchGateExitSelection;
    this.branchRoot.children.forEach((child, index) => {
      const baseX = typeof child.userData.baseX === "number" ? child.userData.baseX : 0;
      const selected = selectedId === snapshot.branchOptions[index];
      const side = Math.abs(baseX) > .01 ? Math.sign(baseX) : index % 2 === 0 ? -1 : 1;
      const exitX = exiting && !selected ? side * exitProgress * 4.6 : 0;
      child.position.set(baseX + exitX + course.x, 1.2 + course.y + (exiting && selected ? exitProgress * .35 : 0), course.z);
      child.rotation.y = course.yaw;
      child.rotation.x = course.pitch;
      child.rotation.z += delta * (index % 2 === 0 ? 0.7 : -0.7) * (exiting ? 1.75 : 1);

      if (exiting) {
        child.scale.setScalar(selected ? 1.2 + exitProgress * 1.18 : Math.max(.2, .92 * (1 - exitProgress * .72)));
      } else {
        child.scale.setScalar(selected ? 1.2 + Math.sin(performance.now() * 0.012) * 0.08 : 0.92);
      }

      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        if (!exiting) {
          object.material.opacity = .82;
          return;
        }
        const selectedAlpha = exitProgress < .3
          ? .82 + exitProgress * .4
          : Math.max(0, .94 * (1 - (exitProgress - .3) / .7));
        object.material.opacity = selected ? selectedAlpha : .82 * Math.pow(1 - exitProgress, 1.7);
      });
    });
    if (!snapshot.branchActive && this.branchGateExitTimer <= 0) this.branchGateExitSelection = null;
  }''', 'syncBranchGates')
webgl_path.write_text(webgl)

# React HUD: keep route copy and defeated-boss HUD mounted long enough for CSS exit motion.
mode_path = Path('app/SkyDancerArcadeMode.tsx')
mode = mode_path.read_text()
mode = replace_once(mode,
'''  const bossEnemy = snapshot.enemies.find((enemy) => enemy.boss) ?? null;
  const bossArmorPercent = bossEnemy && bossEnemy.maxArmor > 0 ? Math.round(bossEnemy.armor / bossEnemy.maxArmor * 100) : 0;''',
'''  const bossEnemy = snapshot.enemies.find((enemy) => enemy.boss) ?? null;
  const bossArmorPercent = bossEnemy && bossEnemy.maxArmor > 0 ? Math.round(bossEnemy.armor / bossEnemy.maxArmor * 100) : 0;
  const bossHudVisible = snapshot.bossActive || Boolean(bossEnemy && bossEnemy.hp <= 0);
  const routeOverlayVisible = snapshot.branchActive || Boolean(
    snapshot.branchSelection
    && snapshot.stageProgress >= .26
    && snapshot.stageProgress < .47
  );''', 'mode presentation booleans')
mode = replace_once(mode,
'''        {snapshot.bossActive && (
          <div className={styles.bossHud} aria-label="Climax target">
            <div><small>CLIMAX TARGET · PHASE {snapshot.bossPhase}{snapshot.bossWeakpointOpen ? " · CORE OPEN" : bossArmorPercent > 0 ? ` · ARMOR ${bossArmorPercent}%` : ""}</small><strong>{snapshot.bossName}<em>{snapshot.bossMechanicLabel}</em></strong><span>{bossPercent}%</span></div>
            <i><b style={{ width: `${bossPercent}%` }} /></i>
          </div>
        )}

        {snapshot.branchActive && (
          <div className={styles.routeOverlay}>
            <small>FLY THROUGH A ROUTE GATE</small>''',
'''        {bossHudVisible && (
          <div className={`${styles.bossHud} ${!snapshot.bossActive ? styles.bossHudExit : ""}`} aria-label="Climax target">
            <div>
              <small>{snapshot.bossActive ? `CLIMAX TARGET · PHASE ${snapshot.bossPhase}${snapshot.bossWeakpointOpen ? " · CORE OPEN" : bossArmorPercent > 0 ? ` · ARMOR ${bossArmorPercent}%` : ""}` : "TARGET DESTROYED · WRECK CLEARING"}</small>
              <strong>{snapshot.bossName}<em>{snapshot.bossMechanicLabel}</em></strong><span>{bossPercent}%</span>
            </div>
            <i><b style={{ width: `${bossPercent}%` }} /></i>
          </div>
        )}

        {routeOverlayVisible && (
          <div className={`${styles.routeOverlay} ${!snapshot.branchActive ? styles.routeResolved : ""}`}>
            <small>{snapshot.branchActive ? "FLY THROUGH A ROUTE GATE" : "ROUTE COMMITTED"}</small>''', 'mode boss/route HUD')
mode_path.write_text(mode)

# CSS: animate mount/exit rather than relying on conditional DOM disappearance.
css_path = Path('app/SkyDancerArcadeMode.module.css')
css = css_path.read_text()
css = replace_once(css,
'''.bossHud{position:absolute;z-index:8;left:50%;top:max(68px,calc(env(safe-area-inset-top) + 67px));transform:translateX(-50%);width:min(480px,56vw);pointer-events:none}''',
'''.bossHud{position:absolute;z-index:8;left:50%;top:max(68px,calc(env(safe-area-inset-top) + 67px));transform:translateX(-50%);width:min(480px,56vw);pointer-events:none;opacity:1;filter:blur(0);transition:opacity .72s ease,transform .72s cubic-bezier(.2,.7,.2,1),filter .72s ease;animation:bossHudIn .34s ease-out both}.bossHudExit{opacity:0;transform:translateX(-50%) translateY(-8px) scale(.965);filter:blur(1.5px)}@keyframes bossHudIn{from{opacity:0;transform:translateX(-50%) translateY(8px) scale(.97)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}''', 'boss HUD css')
css = replace_once(css,
'''.routeOverlay{position:absolute;z-index:8;left:50%;top:max(76px,calc(env(safe-area-inset-top) + 72px));transform:translateX(-50%);width:min(330px,38vw);text-align:center;pointer-events:none}''',
'''.routeOverlay{position:absolute;z-index:8;left:50%;top:max(76px,calc(env(safe-area-inset-top) + 72px));transform:translateX(-50%);width:min(330px,38vw);text-align:center;pointer-events:none;opacity:1;transition:opacity .42s ease,transform .48s cubic-bezier(.2,.7,.2,1);animation:routeOverlayIn .24s ease-out both}.routeResolved{opacity:0;transform:translateX(-50%) translateY(-7px) scale(1.045)}@keyframes routeOverlayIn{from{opacity:0;transform:translateX(-50%) translateY(5px) scale(.98)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}''', 'route overlay css')
css_path.write_text(css)

# Source-level regression checks; build/lint validate the actual component/CSS integration.
test_path = Path('tests/sky-arcade-v33-ui-continuity.test.ts')
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("V33 route gates retain an authored exit shot after route resolution", () => {
  const webgl = read("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts");
  assert.match(webgl, /branchGateExitTimer = 0/);
  assert.match(webgl, /this\.previousSnapshot\.branchActive && !snapshot\.branchActive/);
  assert.match(webgl, /const presenting = snapshot\.branchActive \|\| exiting/);
  assert.match(webgl, /selected \? 1\.2 \+ exitProgress \* 1\.18/);
  assert.doesNotMatch(webgl, /this\.branchRoot\.visible = snapshot\.branchActive;\n\s*if \(!snapshot\.branchActive\) return/);
});

test("V33 route and boss HUDs stay mounted for CSS exit transitions", () => {
  const mode = read("app/SkyDancerArcadeMode.tsx");
  const css = read("app/SkyDancerArcadeMode.module.css");
  assert.match(mode, /const bossHudVisible = snapshot\.bossActive \|\| Boolean/);
  assert.match(mode, /const routeOverlayVisible = snapshot\.branchActive \|\| Boolean/);
  assert.match(mode, /styles\.bossHudExit/);
  assert.match(mode, /styles\.routeResolved/);
  assert.match(mode, /TARGET DESTROYED · WRECK CLEARING/);
  assert.match(mode, /ROUTE COMMITTED/);
  assert.match(css, /\.bossHudExit\{opacity:0/);
  assert.match(css, /\.routeResolved\{opacity:0/);
  assert.match(css, /@keyframes bossHudIn/);
  assert.match(css, /@keyframes routeOverlayIn/);
});
''')

print('Applied Arcade Run V33 UI continuity polish')
