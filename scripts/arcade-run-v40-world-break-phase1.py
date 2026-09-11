from pathlib import Path

runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
canvas_path = Path('src/sky/arcade/SkyDancerArcadeCanvasDemo.ts')
mode_path = Path('app/SkyDancerArcadeMode.tsx')
css_path = Path('app/SkyDancerArcadeMode.module.css')

runtime = runtime_path.read_text()
webgl = webgl_path.read_text()
canvas = canvas_path.read_text()
mode = mode_path.read_text()
css = css_path.read_text()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)

# Runtime imports and snapshot schema.
runtime = replace_once(runtime,
'import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";\n',
'import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";\nimport {\n  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,\n  skyDancerArcadeV40DawnCityGateAnchorDistance,\n  skyDancerArcadeV40RouteDoctrine,\n  skyDancerArcadeV40RouteEffect,\n  skyDancerArcadeV40WorldProfile,\n  type SkyDancerArcadeV40RouteDoctrine,\n} from "./SkyDancerArcadeV40WorldBreak";\n', 'runtime V40 import')

runtime = replace_once(runtime,
'''export interface SkyDancerArcadeHazardSnapshot {
  id: number;
  kind: SkyDancerArcadeHazardKind;
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export interface SkyDancerArcadeSnapshot {''',
'''export interface SkyDancerArcadeHazardSnapshot {
  id: number;
  kind: SkyDancerArcadeHazardKind;
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export interface SkyDancerArcadeWorldBreakGateSnapshot {
  id: number;
  index: number;
  x: number;
  y: number;
  depth: number;
  radiusX: number;
  radiusY: number;
  resolved: boolean;
  success: boolean | null;
}

export interface SkyDancerArcadeSnapshot {''', 'runtime V40 gate snapshot')

runtime = replace_once(runtime,
'''  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];
  worldBreakObjective: string;
  worldBreakSignature: string;
  worldBreakLive: boolean;
  worldBreakRouteDoctrine: SkyDancerArcadeV40RouteDoctrine;
  worldBreakScoreMultiplier: number;
  worldBreakPressureScale: number;
  worldBreakGateHits: number;
  worldBreakGateMisses: number;
  worldBreakGateStreak: number;
  worldBreakGateSerial: number;
  worldBreakGateTotal: number;
  worldBreakGates: SkyDancerArcadeWorldBreakGateSnapshot[];
  enemies: SkyDancerArcadeEnemySnapshot[];''', 'runtime V40 snapshot fields')

runtime = replace_once(runtime,
'''interface ArcadeInput {
  x: number;''',
'''interface ArcadeWorldBreakGate extends SkyDancerArcadeWorldBreakGateSnapshot {
  anchorDistance: number;
  scoreValue: number;
}

interface ArcadeInput {
  x: number;''', 'runtime V40 gate internal')

runtime = replace_once(runtime,
'''  private hazards: ArcadeHazard[] = [];
  private nextEntityId = 1;''',
'''  private hazards: ArcadeHazard[] = [];
  // V40 WORLD BREAK: authored world-navigation objectives coexist with combat actors.
  private worldBreakGates: ArcadeWorldBreakGate[] = [];
  private worldBreakRouteDoctrine: SkyDancerArcadeV40RouteDoctrine = "LOCKED";
  private worldBreakGateHits = 0;
  private worldBreakGateMisses = 0;
  private worldBreakGateStreak = 0;
  private worldBreakGateSerial = 0;
  private nextEntityId = 1;''', 'runtime V40 state')

runtime = replace_once(runtime,
'''    this.hazards = [];
    this.waveSerial = 0;''',
'''    this.hazards = [];
    if (rewindTime <= 0) {
      this.worldBreakGateHits = 0;
      this.worldBreakGateMisses = 0;
      this.worldBreakGateStreak = 0;
    }
    this.worldBreakGates = this.stage.id === "dawn-city"
      ? SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.map((gate) => {
          const anchorDistance = skyDancerArcadeV40DawnCityGateAnchorDistance(gate, this.stage.durationSeconds, this.stage.courseSpeed);
          const alreadyPassed = rewindTime > 0 && anchorDistance <= this.distance + 2.4;
          return {
            id: this.nextEntityId++, index: gate.index, x: gate.x, y: gate.y,
            depth: anchorDistance - this.distance, radiusX: gate.radiusX, radiusY: gate.radiusY,
            resolved: alreadyPassed, success: null, anchorDistance, scoreValue: gate.score,
          };
        })
      : [];
    this.waveSerial = 0;''', 'runtime V40 reset gates')

runtime = replace_once(runtime,
'''    this.updateV12CombatSignals(delta, turboActive);
    this.updatePlayer(delta, turboActive);
    this.updateBranch();''',
'''    this.updateV12CombatSignals(delta, turboActive);
    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateBranch();''', 'runtime V40 step')

runtime = replace_once(runtime,
'''  private get branchActive(): boolean {''',
'''  private updateWorldBreakGates(): void {
    if (this.worldBreakGates.length === 0) return;
    for (const gate of this.worldBreakGates) {
      gate.depth = gate.anchorDistance - this.distance;
      if (gate.resolved || gate.depth > 2.4) continue;
      const dx = (this.playerX - gate.x) / gate.radiusX;
      const dy = (this.playerY - gate.y) / gate.radiusY;
      const clean = Math.hypot(dx, dy) <= 1;
      gate.resolved = true;
      gate.success = clean;
      this.worldBreakGateSerial += 1;
      if (clean) {
        this.worldBreakGateHits += 1;
        this.worldBreakGateStreak += 1;
        const awarded = this.addScore(gate.scoreValue + Math.max(0, this.worldBreakGateStreak - 1) * 280, true);
        this.turbo = Math.min(100, this.turbo + 8 + this.worldBreakGateStreak * 2);
        this.message = `WORLD BREAK · GATE ${gate.index + 1} CLEAN · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakGateMisses += 1;
        this.worldBreakGateStreak = 0;
        this.message = `WORLD BREAK · GATE ${gate.index + 1} MISSED`;
        this.messageTimer = .82;
      }
    }
  }

  private get branchActive(): boolean {''', 'runtime V40 update gates')

runtime = replace_once(runtime,
'''    if (this.branchSelection) {
      this.message = `ROUTE LOCKED · ${skyDancerArcadeStageById(this.branchSelection).name}`;
      this.messageTimer = 2.4;
      this.addScore(2500, false);
    }''',
'''    if (this.branchSelection) {
      const selectedIndex = this.stage.next.indexOf(this.branchSelection);
      const doctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
      this.message = `ROUTE LOCKED · ${doctrine} · ${skyDancerArcadeStageById(this.branchSelection).name}`;
      this.messageTimer = 2.4;
      this.addScore(doctrine === "DANGER" ? 3600 : doctrine === "SCORE" ? 3000 : 2500, false);
    }''', 'runtime V40 route lock')

runtime = replace_once(runtime,
'''    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const bossTime = this.stage.durationSeconds * skyDancerArcadeBossStartProgress(this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);''',
'''    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const worldBreakPressureScale = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale;
    const bossTime = this.stage.durationSeconds * skyDancerArcadeBossStartProgress(this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);''', 'runtime V40 director pressure')

runtime = replace_once(runtime,
'''      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * this.combatDirectorCadenceScale * this.encounterGrammarCadenceScale * (0.84 + this.random() * 0.34);''',
'''      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * worldBreakPressureScale * this.combatDirectorCadenceScale * this.encounterGrammarCadenceScale * (0.84 + this.random() * 0.34);''', 'runtime V40 wave pressure')

runtime = replace_once(runtime,
'''      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * beat.hazardIntervalScale * (0.82 + this.random() * 0.42);''',
'''      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * beat.hazardIntervalScale * worldBreakPressureScale * (0.82 + this.random() * 0.42);''', 'runtime V40 hazard pressure')

runtime = replace_once(runtime,
'''  private addScore(base: number, risk: boolean): number {
    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;
    const riskMultiplier = risk ? 1.25 : 1;
    const awarded = Math.round(base * chainMultiplier * riskMultiplier);
    this.score += awarded;
    return awarded;
  }''',
'''  private addScore(base: number, risk: boolean): number {
    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;
    const riskMultiplier = risk ? 1.25 : 1;
    const routeMultiplier = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier;
    const awarded = Math.round(base * chainMultiplier * riskMultiplier * routeMultiplier);
    this.score += awarded;
    return awarded;
  }''', 'runtime V40 score multiplier')

runtime = replace_once(runtime,
'''    this.stage = skyDancerArcadeStageById(nextId);
    this.route.push(nextId);
    this.stageNumber += 1;
    this.status = "running";
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + 28);
    this.turbo = Math.min(100, this.turbo + 38);
    this.message = `${this.stage.name} · DROP IN`;''',
'''    const selectedIndex = this.branchSelection ? this.stage.next.indexOf(this.branchSelection) : -1;
    const nextDoctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
    this.stage = skyDancerArcadeStageById(nextId);
    this.worldBreakRouteDoctrine = nextDoctrine;
    const routeEffect = skyDancerArcadeV40RouteEffect(nextDoctrine);
    this.route.push(nextId);
    this.stageNumber += 1;
    this.status = "running";
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + routeEffect.entryHpRecovery);
    this.turbo = Math.min(100, this.turbo + routeEffect.entryTurboRecovery);
    this.message = `${this.stage.name} · ${nextDoctrine === "LOCKED" ? "DROP IN" : `${nextDoctrine} ROUTE`}`;''', 'runtime V40 advance doctrine')

runtime = replace_once(runtime,
'''    this.hazards = this.hazards.filter((hazard) => hazard.depth > -6);
  }

  getSnapshot(): SkyDancerArcadeSnapshot {''',
'''    this.hazards = this.hazards.filter((hazard) => hazard.depth > -6);
    this.worldBreakGates = this.worldBreakGates.filter((gate) => gate.depth > -10);
  }

  getSnapshot(): SkyDancerArcadeSnapshot {''', 'runtime V40 cleanup')

runtime = replace_once(runtime,
'''      timelineSerial: this.timelineSerial,
      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''',
'''      timelineSerial: this.timelineSerial,
      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),
      worldBreakObjective: skyDancerArcadeV40WorldProfile(this.stage.id).objective,
      worldBreakSignature: skyDancerArcadeV40WorldProfile(this.stage.id).signature,
      worldBreakLive: skyDancerArcadeV40WorldProfile(this.stage.id).live,
      worldBreakRouteDoctrine: this.worldBreakRouteDoctrine,
      worldBreakScoreMultiplier: skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier,
      worldBreakPressureScale: skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale,
      worldBreakGateHits: this.worldBreakGateHits,
      worldBreakGateMisses: this.worldBreakGateMisses,
      worldBreakGateStreak: this.worldBreakGateStreak,
      worldBreakGateSerial: this.worldBreakGateSerial,
      worldBreakGateTotal: this.stage.id === "dawn-city" ? SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.length : 0,
      worldBreakGates: this.worldBreakGates.filter((gate) => gate.depth < 135).map((gate) => ({
        id: gate.id, index: gate.index, x: gate.x, y: gate.y, depth: gate.depth,
        radiusX: gate.radiusX, radiusY: gate.radiusY, resolved: gate.resolved, success: gate.success,
      })),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''', 'runtime V40 snapshot values')

runtime = replace_once(runtime,
'''  /** Deterministic V12 hook for adaptive encounter regression tests. */''',
'''  /** Deterministic V40 hook for skyline-gate gameplay regression tests. */
  triggerV40WorldBreakGateForTests(index: number, playerX: number, playerY: number): void {
    const gate = this.worldBreakGates.find((candidate) => candidate.index === index);
    if (!gate) return;
    this.playerX = clamp(playerX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(playerY, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.distance = gate.anchorDistance - 2.2;
    this.updateWorldBreakGates();
  }

  /** Deterministic V12 hook for adaptive encounter regression tests. */''', 'runtime V40 test hook')

# WebGL physical gates.
webgl = replace_once(webgl,
'''  private readonly hazardRoot = new THREE.Group();
  private readonly branchRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''',
'''  private readonly hazardRoot = new THREE.Group();
  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''', 'webgl V40 root')
webgl = replace_once(webgl,
'''  private readonly hazardGroups = new Map<number, THREE.Group>();
  private readonly engineGlows: THREE.Object3D[];''',
'''  private readonly hazardGroups = new Map<number, THREE.Group>();
  private readonly worldBreakGateGroups = new Map<number, THREE.Group>();
  private readonly engineGlows: THREE.Object3D[];''', 'webgl V40 map')
webgl = replace_once(webgl,
'''    this.branchRoot.name = "arcade-route-gates";
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.player);''',
'''    this.branchRoot.name = "arcade-route-gates";
    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);''', 'webgl V40 scene')
webgl = replace_once(webgl,
'''    this.syncHazards(snapshot, delta);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncBranchGates(snapshot, delta);''', 'webgl V40 sync')
webgl = replace_once(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
'''  private syncWorldBreakGates(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    for (const gate of snapshot.worldBreakGates) {
      active.add(gate.id);
      let group = this.worldBreakGateGroups.get(gate.id);
      if (!group) {
        group = new THREE.Group();
        group.name = `arcade-world-break-gate-${gate.index}`;
        const material = new THREE.MeshBasicMaterial({ color: 0x66ecff, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        const outer = new THREE.Mesh(new THREE.TorusGeometry(5.15, .19, 7, 40), material);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(4.48, .055, 5, 36), material.clone());
        inner.rotation.z = Math.PI / 4;
        group.add(outer, inner);
        for (let markerIndex = 0; markerIndex < 4; markerIndex += 1) {
          const marker = new THREE.Mesh(new THREE.BoxGeometry(1.25, .12, .12), material.clone());
          const angle = markerIndex / 4 * Math.PI * 2;
          marker.position.set(Math.cos(angle) * 5.15, Math.sin(angle) * 5.15, 0);
          marker.rotation.z = angle + Math.PI / 2;
          group.add(marker);
        }
        this.worldBreakGateGroups.set(gate.id, group);
        this.worldBreakRoot.add(group);
      }
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, gate.depth);
      group.position.set(gate.x * 8.4 + course.x, 1.2 + gate.y * 4.9 + course.y, course.z);
      group.rotation.y = course.yaw;
      group.rotation.x = course.pitch;
      group.rotation.z += delta * .9;
      const pulse = gate.resolved ? (gate.success ? 1.16 : .88) : 1 + Math.sin(snapshot.runTimeSeconds * 8 + gate.index) * .035;
      group.scale.setScalar(pulse);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(gate.resolved ? (gate.success ? 0x75ffab : 0xff647b) : 0x66ecff);
        object.material.opacity = gate.resolved ? .5 : .88;
      });
    }
    for (const [id, group] of this.worldBreakGateGroups) {
      if (active.has(id)) continue;
      this.worldBreakGateGroups.delete(id);
      this.worldBreakRoot.remove(group);
      this.disposeObject(group);
    }
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''', 'webgl V40 method')
webgl = replace_once(webgl,
'''    for (const group of this.hazardGroups.values()) this.disposeObject(group);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();''',
'''    for (const group of this.hazardGroups.values()) this.disposeObject(group);
    for (const group of this.worldBreakGateGroups.values()) this.disposeObject(group);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();
    this.worldBreakRoot.clear();''', 'webgl V40 clear groups')
webgl = replace_once(webgl,
'''    this.hazardGroups.clear();
  }''',
'''    this.hazardGroups.clear();
    this.worldBreakGateGroups.clear();
  }''', 'webgl V40 clear map')
webgl = replace_once(webgl,
'''    if (snapshot.timelineSerial !== this.previousSnapshot.timelineSerial) { this.audio.tone(520, .12, .018, "triangle"); this.audio.tone(780, .08, .012, "square"); }
    const incoming = snapshot.projectiles.some''',
'''    if (snapshot.timelineSerial !== this.previousSnapshot.timelineSerial) { this.audio.tone(520, .12, .018, "triangle"); this.audio.tone(780, .08, .012, "square"); }
    if (snapshot.worldBreakGateSerial !== this.previousSnapshot.worldBreakGateSerial) {
      const clean = snapshot.worldBreakGateHits > this.previousSnapshot.worldBreakGateHits;
      this.audio.tone(clean ? 1040 : 180, clean ? .12 : .18, .026, clean ? "triangle" : "sawtooth");
      if (clean) this.audio.tone(1560, .07, .014, "triangle");
    }
    const incoming = snapshot.projectiles.some''', 'webgl V40 audio')

# Canvas fallback shows the same physical objective.
canvas = replace_once(canvas,
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''', 'canvas V40 draw call')
canvas = replace_once(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
'''  private drawWorldBreakGates(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    for (const gate of snapshot.worldBreakGates) {
      const projected = this.project(gate.x, gate.y, gate.depth, width, height);
      const radius = Math.max(15, projected.scale * 42);
      context.save();
      context.translate(projected.x, projected.y);
      context.strokeStyle = gate.resolved ? (gate.success ? "#75ffab" : "#ff647b") : "#66ecff";
      context.globalAlpha = gate.resolved ? .55 : .9;
      context.lineWidth = gate.resolved ? 4 : 3;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      context.rotate(Math.PI / 4);
      context.globalAlpha *= .55;
      context.beginPath();
      context.arc(0, 0, radius * .78, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''', 'canvas V40 method')

# React HUD: World Break objective plus route contract.
mode = replace_once(mode,
'''import {
  SkyDancerArcadeWebGLDemo,
  type SkyDancerArcadeDemoHandle,
} from "../src/sky/arcade/SkyDancerArcadeWebGLDemo";''',
'''import {
  SkyDancerArcadeWebGLDemo,
  type SkyDancerArcadeDemoHandle,
} from "../src/sky/arcade/SkyDancerArcadeWebGLDemo";
import { skyDancerArcadeV40RouteDoctrine, skyDancerArcadeV40RouteEffect } from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";''', 'mode V40 import')
mode = replace_once(mode,
'''          <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount} · {snapshot.encounterContinuityLabel}</em>
        </div>''',
'''          <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount} · {snapshot.encounterContinuityLabel}</em>
          {(snapshot.worldBreakLive || snapshot.worldBreakRouteDoctrine !== "LOCKED") && (
            <em className={styles.worldBreakLine} data-live={snapshot.worldBreakLive}>
              WORLD BREAK · {snapshot.worldBreakObjective}
              {snapshot.worldBreakGateTotal > 0 ? ` · GATE ${snapshot.worldBreakGateHits + snapshot.worldBreakGateMisses}/${snapshot.worldBreakGateTotal} · STREAK ${snapshot.worldBreakGateStreak}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}
            </em>
          )}
        </div>''', 'mode V40 objective line')
mode = replace_once(mode,
'''              {snapshot.branchOptions.map((id, index) => {
                const stage = skyDancerArcadeStageById(id);
                return (
                  <div key={id} className={`${styles.routeOption} ${snapshot.branchSelection === id ? styles.routeSelected : ""}`}>
                    <span>{index === 0 ? "LEFT" : index === snapshot.branchOptions.length - 1 ? "RIGHT" : "CENTER"} · {snapshot.routeRiskLabels[index] ?? "ROUTE"}</span>
                    <strong>{stage.name}</strong>
                  </div>
                );
              })}''',
'''              {snapshot.branchOptions.map((id, index) => {
                const stage = skyDancerArcadeStageById(id);
                const doctrine = skyDancerArcadeV40RouteDoctrine(index, snapshot.branchOptions.length);
                const effect = skyDancerArcadeV40RouteEffect(doctrine);
                return (
                  <div key={id} className={`${styles.routeOption} ${snapshot.branchSelection === id ? styles.routeSelected : ""}`} data-doctrine={doctrine}>
                    <span>{index === 0 ? "LEFT" : index === snapshot.branchOptions.length - 1 ? "RIGHT" : "CENTER"} · {doctrine}</span>
                    <strong>{stage.name}</strong>
                    <em>{effect.detail}</em>
                  </div>
                );
              })}''', 'mode V40 route contracts')

css += r'''

/* Arcade Run V40 WORLD BREAK phase 1: world objective + route-contract readability. */
.worldBreakLine{display:block;margin-top:3px;color:#7ef2ff!important;font-style:normal!important;font-size:6px!important;font-weight:1000!important;letter-spacing:.1em!important;text-shadow:0 0 12px rgba(64,222,255,.32)}.worldBreakLine[data-live="true"]{animation:v40WorldBreakPulse 1.6s ease-in-out infinite}.routeOption em{display:block;margin-top:2px;font-size:5px;font-style:normal;font-weight:900;letter-spacing:.08em;color:rgba(255,255,255,.58);white-space:nowrap}.routeOption[data-doctrine="SAFE"] em{color:#85f3ff}.routeOption[data-doctrine="SCORE"] em{color:#ffe083}.routeOption[data-doctrine="DANGER"] em{color:#ff8d9d}.routeOption[data-doctrine="DANGER"]{box-shadow:inset 0 0 18px rgba(255,68,93,.08)}@keyframes v40WorldBreakPulse{0%,100%{opacity:.72}50%{opacity:1}}
'''

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
canvas_path.write_text(canvas)
mode_path.write_text(mode)
css_path.write_text(css)
print('Applied Arcade Run V40 WORLD BREAK phase 1')
