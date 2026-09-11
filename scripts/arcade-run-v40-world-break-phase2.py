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

# Runtime: activate Red Canyon continuous low-altitude play and Cloud Fleet destructible deck targets.
runtime = replace_once(runtime,
'''  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40RouteDoctrine,''',
'''  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40FleetTargetAnchorDistance,
  skyDancerArcadeV40RouteDoctrine,''', 'phase2 runtime imports')

runtime = replace_once(runtime,
'''  counterplay: SkyDancerArcadeEnemyCounterplay;
  counterplayIntensity: number;
}''',
'''  counterplay: SkyDancerArcadeEnemyCounterplay;
  counterplayIntensity: number;
  worldBreakTarget?: boolean;
  worldBreakTargetIndex?: number;
  worldBreakLabel?: string;
}''', 'phase2 enemy snapshot')

runtime = replace_once(runtime,
'''  worldBreakGateTotal: number;
  worldBreakGates: SkyDancerArcadeWorldBreakGateSnapshot[];
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  worldBreakGateTotal: number;
  worldBreakGates: SkyDancerArcadeWorldBreakGateSnapshot[];
  worldBreakKnifeActive: boolean;
  worldBreakKnifeAltitudeOk: boolean;
  worldBreakKnifeSeconds: number;
  worldBreakKnifeTargetSeconds: number;
  worldBreakKnifeCeilingY: number;
  worldBreakKnifeComplete: boolean;
  worldBreakKnifeSerial: number;
  worldBreakTargetHits: number;
  worldBreakTargetMisses: number;
  worldBreakTargetSerial: number;
  worldBreakTargetTotal: number;
  worldBreakTargetCurrentLabel: string | null;
  worldBreakTargetCurrentHp: number;
  worldBreakTargetCurrentMaxHp: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''', 'phase2 snapshot fields')

runtime = replace_once(runtime,
'''  retreatSign?: -1 | 1;
  retreatDepthDirection?: -1 | 1;
}''',
'''  retreatSign?: -1 | 1;
  retreatDepthDirection?: -1 | 1;
  // V40 phase 2: capital-ship subsystems are targetable combat actors anchored to the course.
  worldBreakAnchorDistance?: number;
  worldBreakScoreBonus?: number;
  worldBreakResolved?: boolean;
}''', 'phase2 enemy internal')

runtime = replace_once(runtime,
'''  private worldBreakGateStreak = 0;
  private worldBreakGateSerial = 0;
  private nextEntityId = 1;''',
'''  private worldBreakGateStreak = 0;
  private worldBreakGateSerial = 0;
  private worldBreakKnifeSeconds = 0;
  private worldBreakKnifeTick = 0;
  private worldBreakKnifeComplete = false;
  private worldBreakKnifeResolved = false;
  private worldBreakKnifeSerial = 0;
  private worldBreakTargetHits = 0;
  private worldBreakTargetMisses = 0;
  private worldBreakTargetSerial = 0;
  private readonly worldBreakResolvedTargetIndices = new Set<number>();
  private nextEntityId = 1;''', 'phase2 runtime state')

runtime = replace_once(runtime,
'''      this.worldBreakGateHits = 0;
      this.worldBreakGateMisses = 0;
      this.worldBreakGateStreak = 0;
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''',
'''      this.worldBreakGateHits = 0;
      this.worldBreakGateMisses = 0;
      this.worldBreakGateStreak = 0;
      this.worldBreakKnifeSeconds = 0;
      this.worldBreakKnifeTick = 0;
      this.worldBreakKnifeComplete = false;
      this.worldBreakKnifeResolved = false;
      this.worldBreakTargetHits = 0;
      this.worldBreakTargetMisses = 0;
      this.worldBreakResolvedTargetIndices.clear();
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''', 'phase2 reset counters')

runtime = replace_once(runtime,
'''    this.stageBestChain = 0;
    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''',
'''    this.stageBestChain = 0;
    if (this.stage.id === "cloud-fleet") this.spawnV40CloudFleetTargets(rewindTime);
    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''', 'phase2 spawn fleet targets')

runtime = replace_once(runtime,
'''    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateBranch();''',
'''    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateWorldBreakKnifeRun(delta);
    this.updateBranch();''', 'phase2 knife step')

runtime = replace_once(runtime,
'''  private get branchActive(): boolean {''',
'''  private updateWorldBreakKnifeRun(delta: number): void {
    if (this.stage.id !== "red-canyon" || this.worldBreakKnifeResolved) return;
    const totalDistance = Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed);
    const courseProgress = clamp(this.distance / totalDistance, 0, 1);
    if (courseProgress < SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START) return;
    if (courseProgress <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END) {
      if (this.playerY <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y) {
        this.worldBreakKnifeSeconds += delta;
        const nextTick = Math.floor(this.worldBreakKnifeSeconds / .75);
        while (this.worldBreakKnifeTick < nextTick) {
          this.worldBreakKnifeTick += 1;
          this.addScore(320 + this.worldBreakKnifeTick * 70, true);
          this.turbo = Math.min(100, this.turbo + 2.5);
          this.worldBreakKnifeSerial += 1;
        }
      }
      return;
    }
    this.worldBreakKnifeResolved = true;
    this.worldBreakKnifeComplete = this.worldBreakKnifeSeconds >= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS;
    this.worldBreakKnifeSerial += 1;
    if (this.worldBreakKnifeComplete) {
      const awarded = this.addScore(3400, true);
      this.turbo = Math.min(100, this.turbo + 18);
      this.message = `WORLD BREAK · KNIFE RUN COMPLETE · +${awarded}`;
      this.messageTimer = 1.35;
    } else {
      this.message = `WORLD BREAK · KNIFE RUN LOST · ${this.worldBreakKnifeSeconds.toFixed(1)}s`;
      this.messageTimer = 1.05;
    }
  }

  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {
    if (!enemy.worldBreakTarget || enemy.worldBreakResolved || enemy.worldBreakTargetIndex === undefined) return;
    enemy.worldBreakResolved = true;
    this.worldBreakResolvedTargetIndices.add(enemy.worldBreakTargetIndex);
    this.worldBreakTargetSerial += 1;
    if (destroyed) {
      this.worldBreakTargetHits += 1;
      const awarded = this.addScore(enemy.worldBreakScoreBonus ?? 1400, true);
      this.turbo = Math.min(100, this.turbo + 8);
      this.message = `DECK STRIKE · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} DOWN · +${awarded}`;
      this.messageTimer = 1.2;
    } else {
      this.worldBreakTargetMisses += 1;
      this.message = `DECK STRIKE · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} ESCAPED`;
      this.messageTimer = .9;
    }
  }

  private get branchActive(): boolean {''', 'phase2 objective methods')

runtime = replace_once(runtime,
'''  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,''',
'''  private spawnV40CloudFleetTargets(rewindTime: number): void {
    for (const target of SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS) {
      if (this.worldBreakResolvedTargetIndices.has(target.index)) continue;
      const anchorDistance = skyDancerArcadeV40FleetTargetAnchorDistance(target, this.stage.durationSeconds, this.stage.courseSpeed);
      if (rewindTime > 0 && anchorDistance <= this.distance + 3) {
        this.worldBreakResolvedTargetIndices.add(target.index);
        this.worldBreakTargetMisses += 1;
        continue;
      }
      this.spawnEnemy(target.kind, target.x, target.y, anchorDistance - this.distance, "parallel", target.x < 0 ? -1 : 1);
      const enemy = this.enemies.at(-1);
      if (!enemy) continue;
      const hpScale = this.options.difficulty === "hard" ? 1.14 : 1;
      enemy.hp = Math.round(target.hp * hpScale);
      enemy.maxHp = enemy.hp;
      enemy.armor = 0;
      enemy.maxArmor = 0;
      enemy.scoreValue = Math.round(target.score * .42);
      enemy.speed = 0;
      enemy.fireCooldown = 999;
      enemy.amplitude = 0;
      enemy.worldBreakTarget = true;
      enemy.worldBreakTargetIndex = target.index;
      enemy.worldBreakLabel = target.label;
      enemy.worldBreakAnchorDistance = anchorDistance;
      enemy.worldBreakScoreBonus = target.score;
      enemy.worldBreakResolved = false;
      enemy.counterplayCooldown = 999;
    }
  }

  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,''', 'phase2 fleet spawn method')

runtime = replace_once(runtime,
'''      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));
      this.updateEnemyCounterplay(enemy, delta, turboActive);''',
'''      if (enemy.worldBreakTarget && enemy.worldBreakAnchorDistance !== undefined) {
        enemy.depth = enemy.worldBreakAnchorDistance - this.distance;
        enemy.x = enemy.baseX;
        enemy.y = enemy.baseY;
        enemy.locked = enemy.locked && enemy.depth > 2;
        enemy.counterplay = "none";
        enemy.counterplayTimer = 0;
        enemy.counterplayIntensity = 0;
        enemy.fireCooldown = 999;
        enemy.flightVX = 0;
        enemy.flightVY = 0;
        enemy.flightBank = 0;
        enemy.flightPitch = 0;
        if (enemy.depth < -4.5) {
          this.resolveV40FleetTarget(enemy, false);
          enemy.alive = false;
          enemy.locked = false;
        }
        continue;
      }
      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));
      this.updateEnemyCounterplay(enemy, delta, turboActive);''', 'phase2 anchored target update')

runtime = replace_once(runtime,
'''      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role);''',
'''      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role) - (enemy.worldBreakTarget ? 14 : 0);''', 'phase2 lock priority')

runtime = replace_once(runtime,
'''      if (cone > (enemy.boss ? 1.45 : 0.72)) continue;
      const score = cone * 28 + enemy.depth * 0.04 - skyDancerArcadeTargetPriority(enemy.role) * .45;''',
'''      if (cone > (enemy.boss ? 1.45 : enemy.worldBreakTarget ? 1.08 : 0.72)) continue;
      const score = cone * 28 + enemy.depth * 0.04 - skyDancerArcadeTargetPriority(enemy.role) * .45 - (enemy.worldBreakTarget ? 16 : 0);''', 'phase2 gun priority')

runtime = replace_once(runtime,
'''    this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, destroyed, armorBreak);
    if (!enemy.boss) return;''',
'''    this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, destroyed, armorBreak);
    if (enemy.worldBreakTarget) this.resolveV40FleetTarget(enemy, true);
    if (!enemy.boss) return;''', 'phase2 target destruction resolution')

runtime = replace_once(runtime,
'''      worldBreakGates: this.worldBreakGates.filter((gate) => gate.depth < 135).map((gate) => ({
        id: gate.id, index: gate.index, x: gate.x, y: gate.y, depth: gate.depth,
        radiusX: gate.radiusX, radiusY: gate.radiusY, resolved: gate.resolved, success: gate.success,
      })),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''',
'''      worldBreakGates: this.worldBreakGates.filter((gate) => gate.depth < 135).map((gate) => ({
        id: gate.id, index: gate.index, x: gate.x, y: gate.y, depth: gate.depth,
        radiusX: gate.radiusX, radiusY: gate.radiusY, resolved: gate.resolved, success: gate.success,
      })),
      worldBreakKnifeActive: this.stage.id === "red-canyon"
        && !this.worldBreakKnifeResolved
        && this.distance / Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed) >= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START
        && this.distance / Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed) <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
      worldBreakKnifeAltitudeOk: this.playerY <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
      worldBreakKnifeSeconds: this.worldBreakKnifeSeconds,
      worldBreakKnifeTargetSeconds: SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
      worldBreakKnifeCeilingY: SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
      worldBreakKnifeComplete: this.worldBreakKnifeComplete,
      worldBreakKnifeSerial: this.worldBreakKnifeSerial,
      worldBreakTargetHits: this.worldBreakTargetHits,
      worldBreakTargetMisses: this.worldBreakTargetMisses,
      worldBreakTargetSerial: this.worldBreakTargetSerial,
      worldBreakTargetTotal: this.stage.id === "cloud-fleet" ? SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length : 0,
      worldBreakTargetCurrentLabel: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.worldBreakLabel ?? null,
      worldBreakTargetCurrentHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.hp ?? 0,
      worldBreakTargetCurrentMaxHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.maxHp ?? 1,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''', 'phase2 snapshot objective values')

runtime = replace_once(runtime,
'''        counterplay: enemy.counterplay,
        counterplayIntensity: enemy.counterplayIntensity,
      })),''',
'''        counterplay: enemy.counterplay,
        counterplayIntensity: enemy.counterplayIntensity,
        worldBreakTarget: enemy.worldBreakTarget,
        worldBreakTargetIndex: enemy.worldBreakTargetIndex,
        worldBreakLabel: enemy.worldBreakLabel,
      })),''', 'phase2 snapshot enemy target fields')

runtime = replace_once(runtime,
'''  /** Deterministic V12 hook for adaptive encounter regression tests. */''',
'''  /** Deterministic V40 phase 2 hooks for world-objective regression tests. */
  triggerV40KnifeRunForTests(seconds: number, playerY: number): void {
    if (this.stage.id !== "red-canyon") return;
    const totalDistance = this.stage.durationSeconds * this.stage.courseSpeed;
    this.distance = totalDistance * ((SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START + SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END) * .5);
    this.playerY = clamp(playerY, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.updateWorldBreakKnifeRun(Math.max(0, seconds));
    this.distance = totalDistance * (SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END + .01);
    this.updateWorldBreakKnifeRun(0);
  }

  destroyV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (enemy) this.damageEnemy(enemy, enemy.maxHp * 4, false);
  }

  missV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.updateEnemies(1 / 60, false);
  }

  /** Deterministic V12 hook for adaptive encounter regression tests. */''', 'phase2 test hooks')

# WebGL: low-altitude physical guide and persistent mission rings around flagship subsystems.
webgl = replace_once(webgl,
'''  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''',
'''  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''', 'phase2 webgl knife root')

webgl = replace_once(webgl,
'''    this.branchRoot.name = "arcade-route-gates";
    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);''',
'''    this.branchRoot.name = "arcade-route-gates";
    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.worldBreakKnifeRoot.name = "arcade-world-break-knife-run";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot);
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);''', 'phase2 webgl knife scene')

webgl = replace_once(webgl,
'''    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncWorldBreakKnifeRun(snapshot);
    this.syncBranchGates(snapshot, delta);''', 'phase2 webgl knife sync call')

webgl = replace_once(webgl,
'''      let existingRing = group.getObjectByName("arcade-lock-ring");''',
'''      let missionRing = group.getObjectByName("arcade-world-break-target-ring");
      if (enemy.worldBreakTarget && !missionRing) {
        missionRing = createSkyDancerArcadeLockRing(0xffdf69);
        missionRing.name = "arcade-world-break-target-ring";
        missionRing.position.z = .16;
        missionRing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const material = object.material as THREE.MeshBasicMaterial;
          material.opacity = .58;
        });
        group.add(missionRing);
      }
      if (missionRing) {
        missionRing.rotation.y = -group.rotation.y;
        missionRing.rotation.z = -group.rotation.z;
        missionRing.rotation.x = this.camera.rotation.x;
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 7 + enemy.id) * .06;
        setArcadeCuePointSizeV27(missionRing, skyDancerArcadeV27CuePointSize(enemy.kind, false, enemy.depth, "counterplay") * 1.18 * pulse);
      }
      let existingRing = group.getObjectByName("arcade-lock-ring");''', 'phase2 webgl fleet mission ring')

webgl = replace_once(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
'''  private syncWorldBreakKnifeRun(snapshot: SkyDancerArcadeSnapshot): void {
    this.worldBreakKnifeRoot.visible = snapshot.worldBreakKnifeActive;
    if (!snapshot.worldBreakKnifeActive) return;
    if (this.worldBreakKnifeRoot.children.length === 0) {
      const material = new THREE.MeshBasicMaterial({ color: 0x72eeff, transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      for (let index = 0; index < 4; index += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, .075, 5, 28), material.clone());
        ring.userData.arcadeKnifeDepth = 22 + index * 18;
        this.worldBreakKnifeRoot.add(ring);
      }
    }
    this.worldBreakKnifeRoot.children.forEach((child, index) => {
      const depth = Number(child.userData.arcadeKnifeDepth ?? (22 + index * 18));
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      child.position.set(course.x, 1.2 + snapshot.worldBreakKnifeCeilingY * 4.9 + course.y, course.z);
      child.rotation.set(course.pitch, course.yaw, 0);
      child.scale.setScalar(snapshot.worldBreakKnifeAltitudeOk ? 1.08 : .94);
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(snapshot.worldBreakKnifeAltitudeOk ? 0x76ffba : 0x72eeff);
        object.material.opacity = snapshot.worldBreakKnifeAltitudeOk ? .62 : .32;
      });
    });
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''', 'phase2 webgl knife method')

webgl = replace_once(webgl,
'''    if (snapshot.worldBreakGateSerial !== this.previousSnapshot.worldBreakGateSerial) {
      const clean = snapshot.worldBreakGateHits > this.previousSnapshot.worldBreakGateHits;
      this.audio.tone(clean ? 1040 : 180, clean ? .12 : .18, .026, clean ? "triangle" : "sawtooth");
      if (clean) this.audio.tone(1560, .07, .014, "triangle");
    }
    const incoming = snapshot.projectiles.some''',
'''    if (snapshot.worldBreakGateSerial !== this.previousSnapshot.worldBreakGateSerial) {
      const clean = snapshot.worldBreakGateHits > this.previousSnapshot.worldBreakGateHits;
      this.audio.tone(clean ? 1040 : 180, clean ? .12 : .18, .026, clean ? "triangle" : "sawtooth");
      if (clean) this.audio.tone(1560, .07, .014, "triangle");
    }
    if (snapshot.worldBreakKnifeSerial !== this.previousSnapshot.worldBreakKnifeSerial) {
      const complete = snapshot.worldBreakKnifeComplete && !this.previousSnapshot.worldBreakKnifeComplete;
      this.audio.tone(complete ? 920 : 660, complete ? .2 : .07, complete ? .03 : .012, "triangle");
      if (complete) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakTargetSerial !== this.previousSnapshot.worldBreakTargetSerial) {
      const destroyed = snapshot.worldBreakTargetHits > this.previousSnapshot.worldBreakTargetHits;
      this.audio.tone(destroyed ? 128 : 190, destroyed ? .24 : .13, destroyed ? .045 : .02, destroyed ? "sawtooth" : "triangle");
      if (destroyed) this.presentation.emitRushAccent();
    }
    const incoming = snapshot.projectiles.some''', 'phase2 webgl objective audio')

# Canvas fallback mirrors both new world objectives.
canvas = replace_once(canvas,
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakKnifeRun(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''', 'phase2 canvas knife draw call')

canvas = replace_once(canvas,
'''      this.traceEnemySilhouetteV20(context, enemy.kind, size);
      context.fill();
      if (enemy.locked) {''',
'''      this.traceEnemySilhouetteV20(context, enemy.kind, size);
      context.fill();
      if (enemy.worldBreakTarget) {
        context.strokeStyle = "#ffdf69";
        context.globalAlpha = .84;
        context.lineWidth = 2.2;
        context.beginPath();
        context.arc(0, 0, size * 1.9, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
      if (enemy.locked) {''', 'phase2 canvas fleet ring')

canvas = replace_once(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
'''  private drawWorldBreakKnifeRun(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakKnifeActive) return;
    const marker = this.project(0, snapshot.worldBreakKnifeCeilingY, 12, width, height);
    context.save();
    context.strokeStyle = snapshot.worldBreakKnifeAltitudeOk ? "rgba(118,255,186,.82)" : "rgba(114,238,255,.52)";
    context.lineWidth = 2;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(width * .16, marker.y);
    context.lineTo(width * .84, marker.y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = snapshot.worldBreakKnifeAltitudeOk ? "#76ffba" : "#72eeff";
    context.font = "700 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`KNIFE ALTITUDE · ${snapshot.worldBreakKnifeSeconds.toFixed(1)} / ${snapshot.worldBreakKnifeTargetSeconds.toFixed(1)}s`, width * .5, marker.y - 8);
    context.restore();
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''', 'phase2 canvas knife method')

# HUD exposes the physical objective progress without adding another large panel.
mode = replace_once(mode,
'''              {snapshot.worldBreakGateTotal > 0 ? ` · GATE ${snapshot.worldBreakGateHits + snapshot.worldBreakGateMisses}/${snapshot.worldBreakGateTotal} · STREAK ${snapshot.worldBreakGateStreak}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''',
'''              {snapshot.worldBreakGateTotal > 0 ? ` · GATE ${snapshot.worldBreakGateHits + snapshot.worldBreakGateMisses}/${snapshot.worldBreakGateTotal} · STREAK ${snapshot.worldBreakGateStreak}` : ""}
              {snapshot.stage.id === "red-canyon" ? ` · LOW ${snapshot.worldBreakKnifeSeconds.toFixed(1)}/${snapshot.worldBreakKnifeTargetSeconds.toFixed(1)}s${snapshot.worldBreakKnifeActive ? snapshot.worldBreakKnifeAltitudeOk ? " · HOLD" : " · DESCEND" : snapshot.worldBreakKnifeComplete ? " · CLEAR" : ""}` : ""}
              {snapshot.worldBreakTargetTotal > 0 ? ` · DECK ${snapshot.worldBreakTargetHits + snapshot.worldBreakTargetMisses}/${snapshot.worldBreakTargetTotal}${snapshot.worldBreakTargetCurrentLabel ? ` · ${snapshot.worldBreakTargetCurrentLabel} ${Math.round(snapshot.worldBreakTargetCurrentHp / Math.max(1, snapshot.worldBreakTargetCurrentMaxHp) * 100)}%` : ""}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''', 'phase2 HUD details')

css += r'''

/* Arcade Run V40 WORLD BREAK phase 2: low-altitude and flagship-objective emphasis. */
.worldBreakLine{max-width:min(540px,76vw)}.worldBreakLine[data-live="true"]{filter:drop-shadow(0 0 5px rgba(88,230,255,.22))}
'''

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
canvas_path.write_text(canvas)
mode_path.write_text(mode)
css_path.write_text(css)
print('Applied Arcade Run V40 WORLD BREAK phase 2')
