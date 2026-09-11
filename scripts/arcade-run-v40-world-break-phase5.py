from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'anchor not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# --- World Break definitions -------------------------------------------------
world = 'src/sky/arcade/SkyDancerArcadeV40WorldBreak.ts'
patch(world,
'''  "night-metro": { stageId: "night-metro", objective: "CATCH THE PHANTOM", signature: "NEON PURSUIT", live: false },
  "volcano-core": { stageId: "volcano-core", objective: "OUTRUN THE ERUPTION", signature: "MAGMA PRESSURE", live: false },''',
'''  "night-metro": { stageId: "night-metro", objective: "CATCH THE PHANTOM", signature: "NEON PURSUIT", live: true },
  "volcano-core": { stageId: "volcano-core", objective: "OUTRUN THE ERUPTION", signature: "MAGMA PRESSURE", live: true },''')
patch(world,
'''export const SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS = .235;
export const SKY_DANCER_ARCADE_V40_FLOATING_PORTALS: readonly SkyDancerArcadeV40PortalDefinition[] = [''',
'''export const SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS = .235;
export const SKY_DANCER_ARCADE_V40_FLOATING_PORTALS: readonly SkyDancerArcadeV40PortalDefinition[] = [''')
patch(world,
'''export function skyDancerArcadeV40WorldProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV40WorldProfile {''',
'''export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START = .11;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END = .37;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP = 72;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP = 11;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS = .65;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE = 5600;

export const SKY_DANCER_ARCADE_V40_MAGMA_START = .12;
export const SKY_DANCER_ARCADE_V40_MAGMA_END = .43;
export const SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD = 58;
export const SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD = 26;
export const SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE = 5400;

export function skyDancerArcadeV40NeonPhantomX(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 2.45) * 1.22 + Math.sin(time * 5.1 + .8) * .24;
}

export function skyDancerArcadeV40NeonPhantomY(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 1.8 + 1.2) * .48 + Math.cos(time * 4.05 + .35) * .12;
}

export function skyDancerArcadeV40MagmaPressure(lead: number): number {
  return Math.max(0, Math.min(1, 1 - Math.max(0, lead) / SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD));
}

export function skyDancerArcadeV40WorldProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV40WorldProfile {''')

# --- Runtime imports ---------------------------------------------------------
runtime = 'src/sky/arcade/SkyDancerArcadeRuntime.ts'
patch(runtime,
'''  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS,''',
'''  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS,
  SKY_DANCER_ARCADE_V40_MAGMA_END,
  SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE,
  SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD,
  SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD,
  SKY_DANCER_ARCADE_V40_MAGMA_START,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS,''')
patch(runtime,
'''  skyDancerArcadeV40IceApertureScale,
  skyDancerArcadeV40IceApertureX,
  skyDancerArcadeV40StormLaneAnchorDistance,''',
'''  skyDancerArcadeV40IceApertureScale,
  skyDancerArcadeV40IceApertureX,
  skyDancerArcadeV40MagmaPressure,
  skyDancerArcadeV40NeonPhantomX,
  skyDancerArcadeV40NeonPhantomY,
  skyDancerArcadeV40StormLaneAnchorDistance,''')

# Snapshot contract.
patch(runtime,
'''  worldBreakPortalPressureScale: number;
  worldBreakPortals: SkyDancerArcadeWorldBreakPortalSnapshot[];
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  worldBreakPortalPressureScale: number;
  worldBreakPortals: SkyDancerArcadeWorldBreakPortalSnapshot[];
  worldBreakPursuitActive: boolean;
  worldBreakPursuitX: number;
  worldBreakPursuitY: number;
  worldBreakPursuitDepth: number;
  worldBreakPursuitGap: number;
  worldBreakPursuitTargetGap: number;
  worldBreakPursuitTrackedSeconds: number;
  worldBreakPursuitCaught: boolean;
  worldBreakPursuitResolved: boolean;
  worldBreakPursuitSerial: number;
  worldBreakMagmaActive: boolean;
  worldBreakMagmaLead: number;
  worldBreakMagmaPressure: number;
  worldBreakMagmaHits: number;
  worldBreakMagmaResolved: boolean;
  worldBreakMagmaEscaped: boolean;
  worldBreakMagmaSerial: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''')

# Runtime state.
patch(runtime,
'''  private worldBreakPortalChoiceIndex = -1;
  private worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE" = "NONE";
  private worldBreakPortalSerial = 0;
  private nextEntityId = 1;''',
'''  private worldBreakPortalChoiceIndex = -1;
  private worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE" = "NONE";
  private worldBreakPortalSerial = 0;
  private worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP;
  private worldBreakPursuitTrackedSeconds = 0;
  private worldBreakPursuitTick = 0;
  private worldBreakPursuitCaught = false;
  private worldBreakPursuitResolved = false;
  private worldBreakPursuitResolvedAt = -1;
  private worldBreakPursuitSerial = 0;
  private worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
  private worldBreakMagmaHits = 0;
  private worldBreakMagmaResolved = false;
  private worldBreakMagmaEscaped = false;
  private worldBreakMagmaSerial = 0;
  private nextEntityId = 1;''')

# Reset only on fresh stage entry; continue rewind preserves progress like earlier objectives.
patch(runtime,
'''      this.worldBreakPortalChoiceIndex = -1;
      this.worldBreakPortalDoctrine = "NONE";
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''',
'''      this.worldBreakPortalChoiceIndex = -1;
      this.worldBreakPortalDoctrine = "NONE";
      this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP;
      this.worldBreakPursuitTrackedSeconds = 0;
      this.worldBreakPursuitTick = 0;
      this.worldBreakPursuitCaught = false;
      this.worldBreakPursuitResolved = false;
      this.worldBreakPursuitResolvedAt = -1;
      this.worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
      this.worldBreakMagmaHits = 0;
      this.worldBreakMagmaResolved = false;
      this.worldBreakMagmaEscaped = false;
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''')

# Main simulation hooks.
patch(runtime,
'''    this.updateWorldBreakIceCollapse();
    this.updateWorldBreakFloatingPortal();
    this.updateBranch();''',
'''    this.updateWorldBreakIceCollapse();
    this.updateWorldBreakFloatingPortal();
    this.updateWorldBreakNeonPursuit(delta, turboActive);
    this.updateWorldBreakMagmaPressure(delta, turboActive);
    this.updateBranch();''')

# Phase 5 gameplay methods.
patch(runtime,
'''  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''',
'''  private updateWorldBreakNeonPursuit(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "night-metro" || this.worldBreakPursuitResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END) {
      this.worldBreakPursuitResolved = true;
      this.worldBreakPursuitResolvedAt = this.stageTime;
      this.worldBreakPursuitSerial += 1;
      this.message = `NEON PURSUIT · PHANTOM ESCAPED · GAP ${Math.round(this.worldBreakPursuitGap)}m`;
      this.messageTimer = 1.35;
      return;
    }
    const targetX = skyDancerArcadeV40NeonPhantomX(this.stageTime);
    const targetY = skyDancerArcadeV40NeonPhantomY(this.stageTime);
    const normalizedDistance = Math.hypot((this.playerX - targetX) / 1.18, (this.playerY - targetY) / .92);
    const alignment = clamp(1 - normalizedDistance, 0, 1);
    const aligned = normalizedDistance <= 1;
    const closureRate = aligned ? 4.6 + alignment * 3.2 + (turboActive ? 7.8 : 0) : -3.2;
    this.worldBreakPursuitGap = clamp(this.worldBreakPursuitGap - closureRate * delta, 5, 92);
    this.worldBreakPursuitTrackedSeconds = Math.max(0, this.worldBreakPursuitTrackedSeconds + (aligned ? delta : -delta * .35));
    const targetTick = Math.floor(this.worldBreakPursuitTrackedSeconds / SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS);
    while (this.worldBreakPursuitTick < targetTick) {
      this.worldBreakPursuitTick += 1;
      this.addScore(360 + this.worldBreakPursuitTick * 85, true);
      this.turbo = Math.min(100, this.turbo + 2.5);
      this.worldBreakPursuitSerial += 1;
    }
    if (this.worldBreakPursuitGap > SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP) return;
    this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP;
    this.worldBreakPursuitCaught = true;
    this.worldBreakPursuitResolved = true;
    this.worldBreakPursuitResolvedAt = this.stageTime;
    this.worldBreakPursuitSerial += 1;
    const awarded = this.addScore(SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE, true);
    this.turbo = Math.min(100, this.turbo + 20);
    this.message = `WORLD BREAK · PHANTOM CAUGHT · +${awarded}`;
    this.messageTimer = 1.65;
  }

  private updateWorldBreakMagmaPressure(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "volcano-core" || this.worldBreakMagmaResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_MAGMA_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_MAGMA_END) {
      this.worldBreakMagmaResolved = true;
      this.worldBreakMagmaEscaped = this.worldBreakMagmaHits === 0 && this.worldBreakMagmaLead >= SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD;
      this.worldBreakMagmaSerial += 1;
      if (this.worldBreakMagmaEscaped) {
        const awarded = this.addScore(SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE, true);
        this.turbo = Math.min(100, this.turbo + 18);
        this.message = `WORLD BREAK · ERUPTION OUTRUN · +${awarded}`;
      } else {
        this.message = `MAGMA PRESSURE · ESCAPE SURVIVED · LEAD ${Math.round(this.worldBreakMagmaLead)}m`;
      }
      this.messageTimer = 1.55;
      return;
    }
    const eruptionRate = this.options.difficulty === "hard" ? 8.1 : 7.2;
    const escapeRate = turboActive ? 11.2 : 2.05;
    const lineBonus = Math.abs(this.playerX) < 1.12 ? .8 : 0;
    this.worldBreakMagmaLead = clamp(this.worldBreakMagmaLead + (escapeRate + lineBonus - eruptionRate) * delta, -2, 76);
    if (this.worldBreakMagmaLead > 0) return;
    this.worldBreakMagmaHits += 1;
    this.worldBreakMagmaSerial += 1;
    this.takeDamage(this.options.difficulty === "hard" ? 24 : 18);
    this.worldBreakMagmaLead = 22;
    this.message = `MAGMA PRESSURE · ERUPTION HIT ${this.worldBreakMagmaHits} · TURBO NOW`;
    this.messageTimer = 1.25;
  }

  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''')

# Snapshot locals.
patch(runtime,
'''    const portalDefinition = this.worldBreakPortalDefinition();
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));''',
'''    const portalDefinition = this.worldBreakPortalDefinition();
    const worldBreakStageProgress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    const pursuitX = this.stage.id === "night-metro" ? skyDancerArcadeV40NeonPhantomX(this.stageTime) : 0;
    const pursuitY = this.stage.id === "night-metro" ? skyDancerArcadeV40NeonPhantomY(this.stageTime) : 0;
    const pursuitExitAge = this.worldBreakPursuitResolvedAt >= 0 ? this.stageTime - this.worldBreakPursuitResolvedAt : Infinity;
    const pursuitPresenting = this.stage.id === "night-metro"
      && ((!this.worldBreakPursuitResolved
        && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START
        && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END)
        || (this.worldBreakPursuitCaught && pursuitExitAge <= 1.15));
    const pursuitDepth = this.worldBreakPursuitCaught
      ? this.worldBreakPursuitGap - Math.max(0, pursuitExitAge) * 22
      : this.worldBreakPursuitGap;
    const magmaActive = this.stage.id === "volcano-core"
      && !this.worldBreakMagmaResolved
      && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_MAGMA_START
      && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_MAGMA_END;
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));''')

# Snapshot values.
patch(runtime,
'''      worldBreakPortals: this.stage.id === "floating-ruins"
        ? SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.map((portal) => ({
            index: portal.index, x: portal.x, y: portal.y, depth: portalDepth, radius: portal.radius,
            doctrine: portal.doctrine, label: portal.label, selected: portal.index === this.worldBreakPortalChoiceIndex,
          }))
        : [],
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''',
'''      worldBreakPortals: this.stage.id === "floating-ruins"
        ? SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.map((portal) => ({
            index: portal.index, x: portal.x, y: portal.y, depth: portalDepth, radius: portal.radius,
            doctrine: portal.doctrine, label: portal.label, selected: portal.index === this.worldBreakPortalChoiceIndex,
          }))
        : [],
      worldBreakPursuitActive: pursuitPresenting,
      worldBreakPursuitX: pursuitX,
      worldBreakPursuitY: pursuitY,
      worldBreakPursuitDepth: pursuitDepth,
      worldBreakPursuitGap: this.worldBreakPursuitGap,
      worldBreakPursuitTargetGap: SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
      worldBreakPursuitTrackedSeconds: this.worldBreakPursuitTrackedSeconds,
      worldBreakPursuitCaught: this.worldBreakPursuitCaught,
      worldBreakPursuitResolved: this.worldBreakPursuitResolved,
      worldBreakPursuitSerial: this.worldBreakPursuitSerial,
      worldBreakMagmaActive: magmaActive,
      worldBreakMagmaLead: this.worldBreakMagmaLead,
      worldBreakMagmaPressure: skyDancerArcadeV40MagmaPressure(this.worldBreakMagmaLead),
      worldBreakMagmaHits: this.worldBreakMagmaHits,
      worldBreakMagmaResolved: this.worldBreakMagmaResolved,
      worldBreakMagmaEscaped: this.worldBreakMagmaEscaped,
      worldBreakMagmaSerial: this.worldBreakMagmaSerial,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''')

# Test hooks.
patch(runtime,
'''  /** Deterministic V12 hook for adaptive encounter regression tests. */''',
'''  triggerV40NeonPursuitForTests(caught: boolean): void {
    if (this.stage.id !== "night-metro") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.playerX = caught ? clamp(skyDancerArcadeV40NeonPhantomX(this.stageTime), -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = caught ? clamp(skyDancerArcadeV40NeonPhantomY(this.stageTime), -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    if (caught) {
      this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP + .4;
      this.updateWorldBreakNeonPursuit(.12, true);
    } else {
      this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END + .01);
      this.distance = this.stageTime * this.stage.courseSpeed;
      this.updateWorldBreakNeonPursuit(0, false);
    }
  }

  triggerV40MagmaPressureForTests(hit: boolean): void {
    if (this.stage.id !== "volcano-core") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_MAGMA_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    if (hit) {
      this.worldBreakMagmaLead = .2;
      this.updateWorldBreakMagmaPressure(.08, false);
    } else {
      this.worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
      this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_MAGMA_END + .01);
      this.distance = this.stageTime * this.stage.courseSpeed;
      this.updateWorldBreakMagmaPressure(0, true);
    }
  }

  /** Deterministic V12 hook for adaptive encounter regression tests. */''')

# --- WebGL ------------------------------------------------------------------
webgl = 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'
patch(webgl,
'''  private readonly worldBreakIceRoot = new THREE.Group();
  private readonly worldBreakPortalRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''',
'''  private readonly worldBreakIceRoot = new THREE.Group();
  private readonly worldBreakPortalRoot = new THREE.Group();
  private readonly worldBreakPursuitRoot = new THREE.Group();
  private readonly worldBreakMagmaRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''')
patch(webgl,
'''    this.worldBreakIceRoot.name = "arcade-world-break-crystal-collapse";
    this.worldBreakPortalRoot.name = "arcade-world-break-sky-labyrinth";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.scene.add''',
'''    this.worldBreakIceRoot.name = "arcade-world-break-crystal-collapse";
    this.worldBreakPortalRoot.name = "arcade-world-break-sky-labyrinth";
    this.worldBreakPursuitRoot.name = "arcade-world-break-neon-pursuit";
    this.worldBreakMagmaRoot.name = "arcade-world-break-magma-pressure";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.scene.add''')
patch(webgl,
'''    this.syncWorldBreakIceCollapse(snapshot);
    this.syncWorldBreakFloatingPortals(snapshot);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncWorldBreakIceCollapse(snapshot);
    this.syncWorldBreakFloatingPortals(snapshot);
    this.syncWorldBreakNeonPursuit(snapshot);
    this.syncWorldBreakMagmaPressure(snapshot);
    this.syncBranchGates(snapshot, delta);''')
patch(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
'''  private syncWorldBreakNeonPursuit(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "night-metro" && snapshot.worldBreakPursuitActive && snapshot.worldBreakPursuitDepth > -14;
    this.worldBreakPursuitRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPursuitRoot.children.length === 0) {
      const neon = new THREE.MeshBasicMaterial({ color: 0xff4fbb, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const cyan = new THREE.MeshBasicMaterial({ color: 0x41f2ff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const body = new THREE.Mesh(new THREE.ConeGeometry(.54, 3.8, 5), neon.clone());
      body.rotation.x = Math.PI / 2;
      body.position.z = -.2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.8, .12, 1.2), cyan.clone());
      wing.rotation.x = -.12;
      const trail = new THREE.Mesh(new THREE.CylinderGeometry(.12, .42, 6.4, 6), neon.clone());
      trail.rotation.x = Math.PI / 2;
      trail.position.z = 3.9;
      trail.material.opacity = .38;
      this.worldBreakPursuitRoot.add(body, wing, trail);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, Math.max(-12, snapshot.worldBreakPursuitDepth));
    this.worldBreakPursuitRoot.position.set(snapshot.worldBreakPursuitX * 8.4 + course.x, 1.2 + snapshot.worldBreakPursuitY * 4.9 + course.y, course.z);
    this.worldBreakPursuitRoot.rotation.set(course.pitch, course.yaw + Math.PI, course.bank + Math.sin(snapshot.runTimeSeconds * 7.5) * .08);
    const caughtPulse = snapshot.worldBreakPursuitCaught ? 1.35 : 1 + Math.sin(snapshot.runTimeSeconds * 12) * .08;
    this.worldBreakPursuitRoot.scale.setScalar(caughtPulse);
  }

  private syncWorldBreakMagmaPressure(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "volcano-core" && (snapshot.worldBreakMagmaActive || (snapshot.worldBreakMagmaResolved && snapshot.worldBreakMagmaPressure > .08));
    this.worldBreakMagmaRoot.visible = active;
    if (!active) return;
    if (this.worldBreakMagmaRoot.children.length === 0) {
      const heat = new THREE.MeshBasicMaterial({ color: 0xff6a22, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), heat.clone());
      wall.name = "arcade-world-break-magma-wall";
      this.worldBreakMagmaRoot.add(wall);
      for (let index = 0; index < 9; index += 1) {
        const jet = new THREE.Mesh(new THREE.ConeGeometry(.5 + (index % 3) * .15, 3.2 + (index % 2) * 1.4, 6), heat.clone());
        jet.position.set((index - 4) * 3.2, -2.1 + (index % 2) * .7, -.35);
        jet.name = "arcade-world-break-magma-jet";
        this.worldBreakMagmaRoot.add(jet);
      }
    }
    const pressure = snapshot.worldBreakMagmaPressure;
    this.worldBreakMagmaRoot.position.set(0, -5.7 + pressure * 2.2, 4.8 + pressure * .9);
    this.worldBreakMagmaRoot.scale.set(1 + pressure * .16, .72 + pressure * .48, 1);
    const pulse = .12 + pressure * .32 + Math.sin(snapshot.runTimeSeconds * 19) * .035;
    this.worldBreakMagmaRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.opacity = object.name === "arcade-world-break-magma-wall" ? Math.max(.08, pulse * .7) : Math.max(.1, pulse);
      object.material.color.setHex(snapshot.worldBreakMagmaHits > 0 ? 0xff4020 : 0xff7a24);
    });
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''')
patch(webgl,
'''    for (const child of this.worldBreakIceRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPortalRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''',
'''    for (const child of this.worldBreakIceRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPortalRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPursuitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakMagmaRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''')
patch(webgl,
'''    this.worldBreakIceRoot.clear();
    this.worldBreakPortalRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);''',
'''    this.worldBreakIceRoot.clear();
    this.worldBreakPortalRoot.clear();
    this.worldBreakPursuitRoot.clear();
    this.worldBreakMagmaRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);''')

# --- Canvas parity -----------------------------------------------------------
canvas = 'src/sky/arcade/SkyDancerArcadeCanvasDemo.ts'
patch(canvas,
'''    this.drawWorldBreakIceCollapse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFloatingPortals(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawWorldBreakIceCollapse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFloatingPortals(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakNeonPursuit(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakMagmaPressure(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''')
patch(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
'''  private drawWorldBreakNeonPursuit(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakPursuitActive) return;
    const p = this.project(snapshot.worldBreakPursuitX, snapshot.worldBreakPursuitY, Math.max(2, snapshot.worldBreakPursuitDepth), width, height);
    const size = Math.max(13, p.scale * 18);
    context.save();
    context.translate(p.x, p.y);
    context.strokeStyle = snapshot.worldBreakPursuitCaught ? "#ffffff" : "#ff4fbb";
    context.fillStyle = "#41f2ff";
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(0, -size * 1.2);
    context.lineTo(-size * 1.6, size * .7);
    context.lineTo(0, size * .28);
    context.lineTo(size * 1.6, size * .7);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.arc(0, 0, size * 1.9, 0, Math.PI * 2);
    context.globalAlpha = .45;
    context.stroke();
    context.restore();
    context.fillStyle = "#ff8add";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`PHANTOM GAP ${Math.round(snapshot.worldBreakPursuitGap)}m`, p.x, p.y - size * 2.2);
  }

  private drawWorldBreakMagmaPressure(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "volcano-core" || (!snapshot.worldBreakMagmaActive && snapshot.worldBreakMagmaPressure <= .08)) return;
    const pressure = snapshot.worldBreakMagmaPressure;
    const heightSpan = Math.max(18, height * (.08 + pressure * .28));
    const gradient = context.createLinearGradient(0, height - heightSpan, 0, height);
    gradient.addColorStop(0, "rgba(255,92,28,0)");
    gradient.addColorStop(1, `rgba(255,72,24,${(.18 + pressure * .42).toFixed(3)})`);
    context.save();
    context.fillStyle = gradient;
    context.fillRect(0, height - heightSpan, width, heightSpan);
    context.fillStyle = pressure > .68 ? "#ffb05b" : "#ffd18a";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`MAGMA LEAD ${Math.max(0, Math.round(snapshot.worldBreakMagmaLead))}m · PRESSURE ${Math.round(pressure * 100)}%`, width * .5, height - heightSpan + 14);
    context.restore();
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''')

# --- HUD --------------------------------------------------------------------
mode = 'app/SkyDancerArcadeMode.tsx'
patch(mode,
'''              {snapshot.stage.id === "floating-ruins" ? ` · PORTAL ${snapshot.worldBreakPortalDoctrine}${snapshot.worldBreakPortalChoiceIndex >= 0 ? ` ×${snapshot.worldBreakPortalScoreMultiplier.toFixed(2)}` : " · CHOOSE"}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''',
'''              {snapshot.stage.id === "floating-ruins" ? ` · PORTAL ${snapshot.worldBreakPortalDoctrine}${snapshot.worldBreakPortalChoiceIndex >= 0 ? ` ×${snapshot.worldBreakPortalScoreMultiplier.toFixed(2)}` : " · CHOOSE"}` : ""}
              {snapshot.stage.id === "night-metro" ? ` · ${snapshot.worldBreakPursuitCaught ? "CAUGHT" : snapshot.worldBreakPursuitResolved ? "ESCAPED" : "CHASE"} · GAP ${Math.round(snapshot.worldBreakPursuitGap)}m · TRACK ${snapshot.worldBreakPursuitTrackedSeconds.toFixed(1)}s` : ""}
              {snapshot.stage.id === "volcano-core" ? ` · ${snapshot.worldBreakMagmaEscaped ? "OUTRUN" : "LEAD"} ${Math.max(0, Math.round(snapshot.worldBreakMagmaLead))}m · PRESSURE ${Math.round(snapshot.worldBreakMagmaPressure * 100)}%${snapshot.worldBreakMagmaHits > 0 ? ` · HIT ${snapshot.worldBreakMagmaHits}` : ""}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''')
css = 'app/SkyDancerArcadeMode.module.css'
Path(css).write_text(Path(css).read_text() + '\n/* Arcade Run V40 WORLD BREAK phase 5: pursuit/eruption telemetry on compact landscape. */\n.worldBreakLine{max-width:min(790px,88vw)}\n')

# --- Base coverage now 9/11 --------------------------------------------------
base_test = 'tests/sky-arcade-v40-world-break.test.ts'
patch(base_test,
'''  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 7);''',
'''  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 9);''')

phase5 = '''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
  skyDancerArcadeV40NeonPhantomX,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 5 activates Night Metro and Volcano Core as distinct World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").signature, "NEON PURSUIT");
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").signature, "MAGMA PRESSURE");
});

test("V40 Night Metro phantom is a moving pursuit target and can be physically caught", () => {
  assert.notEqual(skyDancerArcadeV40NeonPhantomX(4), skyDancerArcadeV40NeonPhantomX(4.5));
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "night-metro", seed: 4054 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40NeonPursuitForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPursuitCaught, true);
  assert.equal(snapshot.worldBreakPursuitResolved, true);
  assert.equal(snapshot.worldBreakPursuitGap, SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP);
  assert.ok(snapshot.score > before);
});

test("V40 Night Metro can lose the phantom without fake collision damage", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "night-metro", seed: 4055 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40NeonPursuitForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPursuitResolved, true);
  assert.equal(snapshot.worldBreakPursuitCaught, false);
  assert.equal(snapshot.playerHp, hp);
});

test("V40 Volcano Core eruption pressure can catch and damage the player then restore escape lead", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "volcano-core", seed: 4056 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40MagmaPressureForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakMagmaHits, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.ok(snapshot.worldBreakMagmaLead > 0);
});

test("V40 Volcano Core awards a clean outrun when the eruption never reaches the aircraft", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "volcano-core", seed: 4057 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40MagmaPressureForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakMagmaResolved, true);
  assert.equal(snapshot.worldBreakMagmaEscaped, true);
  assert.equal(snapshot.worldBreakMagmaHits, 0);
  assert.equal(snapshot.worldBreakMagmaLead, SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD);
  assert.ok(snapshot.score > before);
});

test("V40 phase 5 keeps WebGL and Canvas parity for pursuit and eruption pressure", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakNeonPursuit\\(snapshot\\)/);
  assert.match(webgl, /syncWorldBreakMagmaPressure\\(snapshot\\)/);
  assert.match(webgl, /worldBreakPursuitRoot/);
  assert.match(webgl, /worldBreakMagmaRoot/);
  assert.match(canvas, /drawWorldBreakNeonPursuit\\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakMagmaPressure\\(context, snapshot/);
});
'''
Path('tests/sky-arcade-v40-world-break-phase5.test.ts').write_text(phase5)
