import { SkyDancerArcadeRuntime, type SkyDancerArcadeRuntimeOptions, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeDemoHandle } from "./SkyDancerArcadeWebGLDemo";
import { skyDancerArcadeEnemyVisualScaleV17 } from "./SkyDancerArcadeModels";
import { skyDancerArcadeV406FinalBossCue, skyDancerArcadeV406FormMotion, skyDancerArcadeV406FormLabel } from "./SkyDancerArcadeV406FinalBossPresentation";
import { skyDancerArcadeV408SceneFocus } from "./SkyDancerArcadeV408CinematicFocus";
import { skyDancerArcadeV4044IsTerminalThreat, skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";
import { skyDancerArcadeV4045Palette } from "./SkyDancerArcadeV4045ColorGrade";
import { skyDancerArcadeV4010DynamicOcclusion, skyDancerArcadeV4010EntityOcclusion } from "./SkyDancerArcadeV4010DynamicOcclusion";
import { skyDancerArcadeV4011ForegroundCraftCount, skyDancerArcadeV4011ScreenStress } from "./SkyDancerArcadeV4011ScreenStress";
import { skyDancerArcadeV4012RunRhythm } from "./SkyDancerArcadeV4012RunRhythm";

type SnapshotHandler = (snapshot: SkyDancerArcadeSnapshot) => void;

export class SkyDancerArcadeCanvasDemo implements SkyDancerArcadeDemoHandle {
  private readonly mount: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly runtime: SkyDancerArcadeRuntime;
  private readonly onSnapshot: SnapshotHandler;
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private disposed = false;
  private lastFrame = performance.now();
  private accumulator = 0;
  private snapshotClock = 0;

  constructor(mount: HTMLElement, options: SkyDancerArcadeRuntimeOptions, onSnapshot: SnapshotHandler) {
    this.mount = mount;
    this.runtime = new SkyDancerArcadeRuntime(options);
    this.onSnapshot = onSnapshot;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "sky-dancer-arcade-canvas";
    this.canvas.setAttribute("aria-label", "Sky Dancer Arcade Run Canvas fallback view");
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.context = context;
    mount.appendChild(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(mount);
    this.resize();
    this.onSnapshot(this.runtime.getSnapshot());
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    if (this.disposed) return;
    const elapsed = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.accumulator += elapsed;
    while (this.accumulator >= 1 / 60) {
      this.runtime.step(1 / 60);
      this.accumulator -= 1 / 60;
    }
    const snapshot = this.runtime.getSnapshot();
    this.draw(snapshot);
    this.snapshotClock += elapsed;
    if (this.snapshotClock >= 0.075) {
      this.snapshotClock = 0;
      this.onSnapshot(snapshot);
    }
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private draw(snapshot: SkyDancerArcadeSnapshot): void {
    const context = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const palette = skyDancerArcadeV4045Palette(snapshot.stage);
    context.save();
    context.scale(ratio, ratio);
    const cssWidth = width / ratio;
    const cssHeight = height / ratio;
    const v409Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const v409IncomingThreats = snapshot.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30).length;
    const v4044TerminalThreats = snapshot.projectiles.filter(skyDancerArcadeV4044IsTerminalThreat).length;
    const v409Clarity = skyDancerArcadeV409PhoneClarity({
      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,
      sceneMode: v409Focus.mode,
      incomingThreats: v409IncomingThreats,
      terminalThreats: v4044TerminalThreats,
    });
    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({
      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,
      sceneMode: v409Focus.mode,
      incomingThreats: v409IncomingThreats,
    });
    const v4011ForegroundCraft = skyDancerArcadeV4011ForegroundCraftCount(snapshot.enemies, snapshot.playerX, snapshot.playerY);
    const v4011Stress = skyDancerArcadeV4011ScreenStress({
      compactLandscape: cssWidth > cssHeight && cssHeight <= 560, sceneMode: v409Focus.mode,
      incomingThreats: v409IncomingThreats, foregroundCraft: v4011ForegroundCraft,
      impactCount: snapshot.impacts.length, destroyedImpacts: snapshot.impacts.filter((impact) => impact.destroyed).length,
      worldBreakLive: snapshot.worldBreakLive, baseOcclusion: v4010Profile, baseClarity: v409Clarity,
    });
    const v4011CanvasLockLimit = Math.min(v409Clarity.canvasLockLimit, v4011Stress.clarity.canvasLockLimit);
    const v4011OcclusionProfile = v4011Stress.occlusion;
    const v4010PriorityTarget = v409Focus.mode === "boss"
      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null
      : v409Focus.mode === "rival"
        ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null
        : v409Focus.mode === "signature"
          ? snapshot.enemies.find((enemy) => enemy.worldBreakTarget) ?? null
          : null;
    const v409PrimaryLockIds = new Set(snapshot.enemies
      .filter((enemy) => enemy.locked)
      .sort((a, b) => {
        const priorityA = a.boss ? 3 : a.rivalAce ? 2 : a.worldBreakTarget ? 1 : 0;
        const priorityB = b.boss ? 3 : b.rivalAce ? 2 : b.worldBreakTarget ? 1 : 0;
        return priorityB - priorityA || a.depth - b.depth;
      })
      .slice(0, v4011CanvasLockLimit)
      .map((enemy) => enemy.id));
    const gradient = context.createLinearGradient(0, 0, 0, cssHeight);
    gradient.addColorStop(0, `#${palette.sky.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(1, `#${palette.fog.toString(16).padStart(6, "0")}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, cssWidth, cssHeight);
    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawFinalBossPresentation(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakKnifeRun(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakStormLane(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFortressBreach(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakIceCollapse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFloatingPortals(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakNeonPursuit(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakMagmaPressure(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakOrbitalAscent(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakPrismReprise(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);
    for (const hazard of [...snapshot.hazards].sort((a, b) => b.depth - a.depth)) {
      const projected = this.project(hazard.x, hazard.y, hazard.depth, cssWidth, cssHeight);
      context.save();
      context.translate(projected.x, projected.y);
      context.rotate(snapshot.stageTimeSeconds * 0.7 + hazard.id);
      context.fillStyle = hazard.kind === "lightning" || hazard.kind === "mine" ? "#ff6c57" : `#${palette.primary.toString(16).padStart(6, "0")}`;
      context.beginPath();
      context.moveTo(0, -projected.scale * 11 * hazard.scale);
      context.lineTo(projected.scale * 8 * hazard.scale, projected.scale * 8 * hazard.scale);
      context.lineTo(-projected.scale * 8 * hazard.scale, projected.scale * 8 * hazard.scale);
      context.closePath();
      context.fill();
      context.restore();
    }
    for (const enemy of [...snapshot.enemies].sort((a, b) => b.depth - a.depth)) {
      const projected = this.project(enemy.x, enemy.y, enemy.depth, cssWidth, cssHeight);
      const readabilityScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);
      const v4010Occlusion = skyDancerArcadeV4010EntityOcclusion({
        profile: v4011OcclusionProfile,
        protectedTarget: Boolean(enemy.boss || enemy.rivalAce || enemy.worldBreakTarget || v409PrimaryLockIds.has(enemy.id)),
        entityX: enemy.x, entityY: enemy.y, entityDepth: enemy.depth,
        centerX: snapshot.playerX, centerY: snapshot.playerY,
        focusX: v4010PriorityTarget?.x ?? snapshot.playerX,
        focusY: v4010PriorityTarget?.y ?? snapshot.playerY,
        focusDepth: v4010PriorityTarget?.depth ?? 18,
        hasFocusTarget: Boolean(v4010PriorityTarget),
      });
      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "gunship" ? 18 : enemy.kind === "bomber" ? 16 : enemy.kind === "drone" ? 9.5 : 11) * readabilityScale * v4010Occlusion.scale;
      context.save();
      context.translate(projected.x, projected.y);
      context.globalAlpha = v4010Occlusion.alpha;
      context.fillStyle = enemy.boss && enemy.finalBossAccent !== undefined
        ? `#${enemy.finalBossAccent.toString(16).padStart(6, "0")}`
        : `#${palette.enemy.toString(16).padStart(6, "0")}`;
      this.traceEnemySilhouetteV20(context, enemy.kind, size);
      context.fill();
      if (enemy.boss && enemy.finalBossForm) {
        context.strokeStyle = `#${(enemy.finalBossAccent ?? palette.accent).toString(16).padStart(6, "0")}`;
        context.globalAlpha = .82;
        context.lineWidth = Math.max(2, size * .1);
        const rings = enemy.finalBossForm === "SEVEN_SKY" ? 3 : enemy.finalBossForm === "MIRROR_AEGIS" ? 2 : 1;
        for (let ring = 0; ring < rings; ring += 1) {
          context.beginPath();
          context.arc(0, 0, size * (1.55 + ring * .36), 0, Math.PI * 2);
          context.stroke();
        }
        context.globalAlpha = 1;
      }
      if (enemy.worldBreakTarget) {
        context.strokeStyle = "#ffdf69";
        context.globalAlpha = .84;
        context.lineWidth = 2.2;
        context.beginPath();
        context.arc(0, 0, size * 1.9, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
      if (enemy.locked && v409PrimaryLockIds.has(enemy.id)) {
        context.strokeStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
        context.lineWidth = 2.4;
        context.strokeRect(-size * 1.65, -size * 1.65, size * 3.3, size * 3.3);
      }
      context.restore();
    }
    for (const projectile of snapshot.projectiles) {
      const warning = projectile.owner === "enemy" && (projectile.warningSeconds ?? 0) > 0;
      const sourceEnemyV4042 = projectile.sourceEnemyId === undefined
        ? null
        : snapshot.enemies.find((enemy) => enemy.id === projectile.sourceEnemyId) ?? null;
      const warningX = projectile.warningTargetX ?? snapshot.playerX;
      const warningY = projectile.warningTargetY ?? snapshot.playerY;
      // V40.38 mirrors WebGL: never fade a still-visible missed hostile shot. After the
      // near pass, carry it outward until it has naturally left the viewport, then let the
      // existing gameplay despawn remove it later.
      const hostileExitTravel = projectile.owner === "enemy" && !warning && projectile.depth < .35
        ? .35 - projectile.depth
        : 0;
      const exitDx = projectile.x - warningX;
      const exitDy = projectile.y - warningY;
      const exitLength = Math.hypot(exitDx, exitDy);
      const exitUx = exitLength > .01 ? exitDx / exitLength : (projectile.id % 2 === 0 ? 1 : -1);
      const exitUy = exitLength > .01 ? exitDy / exitLength : ((projectile.id % 3) - 1) * .38;
      const hostileExitPush = hostileExitTravel * 2.6;
      const projected = this.project(
        warning ? warningX : projectile.x + exitUx * hostileExitPush,
        warning ? warningY : projectile.y + exitUy * hostileExitPush,
        warning ? 1.65 : projectile.owner === "enemy" ? Math.max(.58, projectile.depth) : projectile.depth,
        cssWidth,
        cssHeight,
      );
      if (warning) {
        const source = this.project(projectile.x, projectile.y, projectile.depth, cssWidth, cssHeight);
        const pulse = .62 + Math.sin(snapshot.runTimeSeconds * 24 + projectile.id) * .2;
        context.save();
        context.strokeStyle = `rgba(255,49,94,${Math.max(.3, pulse)})`;
        context.lineWidth = 2.2;
        context.setLineDash([7, 6]);
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(projected.x, projected.y);
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = 3;
        context.beginPath();
        context.arc(projected.x, projected.y, 18 + pulse * 9, 0, Math.PI * 2);
        context.stroke();
        // V40.42: the warning now visibly charges at the firing craft instead of existing only at the target.
        const warningDuration = Math.max(.001, projectile.warningDuration ?? 0);
        const chargeProgress = Math.max(0, Math.min(1, 1 - (projectile.warningSeconds ?? 0) / warningDuration));
        const chargeRadius = 5 + chargeProgress * 8;
        context.globalCompositeOperation = "lighter";
        const chargeGradient = context.createRadialGradient(source.x, source.y, 0, source.x, source.y, chargeRadius * 1.8);
        const chargeColor = projectile.projectileClass === "seeker"
          ? "255,79,163"
          : projectile.projectileClass === "boss"
            ? "255,54,92"
            : projectile.projectileClass === "heavy"
              ? "255,138,45"
              : "255,99,56";
        chargeGradient.addColorStop(0, `rgba(${chargeColor},${.56 + chargeProgress * .3})`);
        chargeGradient.addColorStop(.35, `rgba(${chargeColor},${.22 + chargeProgress * .24})`);
        chargeGradient.addColorStop(1, `rgba(${chargeColor},0)`);
        context.fillStyle = chargeGradient;
        context.beginPath();
        context.arc(source.x, source.y, chargeRadius * 1.8, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `rgba(${chargeColor},${.22 + chargeProgress * .5})`;
        context.lineWidth = 1.5 + chargeProgress * 1.2;
        context.beginPath();
        context.arc(source.x, source.y, chargeRadius * (1.05 + Math.sin(snapshot.runTimeSeconds * 24 + projectile.id) * .08), 0, Math.PI * 2);
        context.stroke();
        context.restore();
        continue;
      }
      if (projectile.owner === "enemy" && sourceEnemyV4042 && (projectile.flightAge ?? 1) < .15) {
        // V40.42: a bounded launch flash bridges the enemy hardpoint and the moving projectile.
        const source = this.project(sourceEnemyV4042.x, sourceEnemyV4042.y, sourceEnemyV4042.depth, cssWidth, cssHeight);
        const launchFlash = Math.max(0, Math.min(1, 1 - (projectile.flightAge ?? 0) / .15));
        const chargeColor = projectile.projectileClass === "seeker"
          ? "255,79,163"
          : projectile.projectileClass === "boss"
            ? "255,54,92"
            : projectile.projectileClass === "heavy"
              ? "255,138,45"
              : "255,99,56";
        context.save();
        context.globalCompositeOperation = "lighter";
        context.strokeStyle = `rgba(255,245,218,${.35 + launchFlash * .55})`;
        context.lineWidth = 2 + launchFlash * 4;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(
          source.x + (projected.x - source.x) * Math.min(.44, .18 + launchFlash * .24),
          source.y + (projected.y - source.y) * Math.min(.44, .18 + launchFlash * .24),
        );
        context.stroke();
        context.fillStyle = `rgba(${chargeColor},${.18 + launchFlash * .38})`;
        context.beginPath();
        context.arc(source.x, source.y, 5 + launchFlash * 10, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      if (projectile.owner === "player-missile") {
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
        const hostileClass = projectile.projectileClass ?? "bolt";
        const classScale = hostileClass === "boss" ? 1.34 : hostileClass === "heavy" ? 1.16 : hostileClass === "seeker" ? 1.04 : .94;
        const radius = Math.max(4, projected.scale * 3.4 * classScale);
        const danger = projectile.depth < 9;
        const dangerPulse = danger ? 1 + Math.sin(snapshot.runTimeSeconds * 20 + projectile.id) * .06 : 1;
        const bodyColor = hostileClass === "boss" ? "#ff365c" : hostileClass === "seeker" ? "#ff4fa3" : hostileClass === "heavy" ? "#ff7a26" : "#ff6a32";
        const glowColor = hostileClass === "seeker" ? "rgba(255,63,147,.88)" : hostileClass === "boss" ? "rgba(255,36,76,.9)" : "rgba(255,82,38,.82)";
        const targetPoint = this.project(
          projectile.warningTargetX ?? snapshot.playerX,
          projectile.warningTargetY ?? snapshot.playerY,
          1.65,
          cssWidth,
          cssHeight,
        );
        const dx = projected.x - targetPoint.x;
        const dy = projected.y - targetPoint.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const trailMultiplier = hostileClass === "boss" ? 4.2 : hostileClass === "heavy" ? 3.7 : hostileClass === "seeker" ? 3.45 : 3.05;
        const trailLength = Math.max(11, radius * (danger ? trailMultiplier + .35 : trailMultiplier));
        const launchBloom = .72 + Math.min(1, (projectile.flightAge ?? 0) / .22) * .28;
        context.save();
        context.lineCap = "round";
        context.shadowColor = glowColor;
        context.shadowBlur = danger ? 13 : hostileClass === "boss" ? 11 : 8;
        const trailGradient = context.createLinearGradient(
          projected.x,
          projected.y,
          projected.x + ux * trailLength,
          projected.y + uy * trailLength,
        );
        const trailHead = hostileClass === "seeker"
          ? (danger ? "rgba(255,79,163,.68)" : "rgba(255,79,163,.54)")
          : hostileClass === "boss"
            ? (danger ? "rgba(255,54,92,.7)" : "rgba(255,54,92,.56)")
            : (danger ? "rgba(255,106,50,.62)" : "rgba(255,106,50,.48)");
        trailGradient.addColorStop(0, trailHead);
        trailGradient.addColorStop(1, hostileClass === "seeker" ? "rgba(255,79,163,0)" : "rgba(255,106,50,0)");
        context.strokeStyle = trailGradient;
        context.globalAlpha = launchBloom;
        context.lineWidth = Math.max(2.6, radius * (hostileClass === "heavy" || hostileClass === "boss" ? .7 : .6));
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .35, projected.y + uy * radius * .35);
        context.lineTo(projected.x + ux * trailLength, projected.y + uy * trailLength);
        context.stroke();
        context.strokeStyle = hostileClass === "seeker" ? "rgba(255,246,255,.82)" : "rgba(255,238,204,.74)";
        context.lineWidth = Math.max(1.2, radius * .21);
        context.beginPath();
        context.moveTo(projected.x + ux * radius * .18, projected.y + uy * radius * .18);
        context.lineTo(projected.x + ux * trailLength * .62, projected.y + uy * trailLength * .62);
        context.stroke();
        context.globalAlpha = 1;
        context.fillStyle = hostileClass === "seeker"
          ? (danger ? "rgba(255,63,147,.19)" : "rgba(255,63,147,.13)")
          : hostileClass === "boss"
            ? (danger ? "rgba(255,36,76,.22)" : "rgba(255,36,76,.15)")
            : (danger ? "rgba(255,76,38,.17)" : "rgba(255,76,38,.11)");
        context.beginPath();
        context.arc(projected.x, projected.y, radius * 1.58 * dangerPulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = bodyColor;
        context.beginPath();
        context.arc(projected.x, projected.y, radius * dangerPulse, 0, Math.PI * 2);
        context.fill();
        if (hostileClass !== "bolt" || danger) {
          context.save();
          context.translate(projected.x, projected.y);
          context.rotate(snapshot.runTimeSeconds * (hostileClass === "seeker" ? 4.8 : 3.1) + projectile.id);
          context.strokeStyle = hostileClass === "seeker" ? "rgba(255,123,199,.72)" : hostileClass === "boss" ? "rgba(255,85,115,.7)" : "rgba(255,176,90,.48)";
          context.lineWidth = Math.max(1.1, radius * .18);
          context.globalAlpha = .54 + Math.sin(snapshot.runTimeSeconds * 18 + projectile.id) * .14;
          context.beginPath();
          context.ellipse(0, 0, radius * 1.42, radius * .72, 0, 0, Math.PI * 2);
          context.stroke();
          context.restore();
        }
        context.shadowBlur = danger ? 6 : 4;
        context.fillStyle = "#ffffed";
        context.beginPath();
        context.arc(projected.x, projected.y, Math.max(1.4, radius * .3), 0, Math.PI * 2);
        context.fill();
        context.restore();
        continue;
      }
      context.fillStyle = projectile.owner === "player-missile" ? "#fff0c8" : "#fff1a8";
      context.beginPath();
      context.arc(projected.x, projected.y, Math.max(1.5, projected.scale * (projectile.owner === "player-missile" ? 4.8 : 2.4)), 0, Math.PI * 2);
      context.fill();
    }
    this.drawTerminalThreatVectorV4044(context, snapshot, cssWidth, cssHeight);
    this.drawHostileContactFxV4043(context, snapshot, cssWidth, cssHeight);
    this.drawPlayer(context, snapshot, cssWidth, cssHeight);
    this.drawCinematicFocusV408(context, snapshot, cssWidth, cssHeight);
    context.restore();
  }

  private drawCinematicFocusV408(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    const target = focus.mode === "boss"
      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null
      : focus.mode === "rival" ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null : null;
    if (!target) return;
    const projected = this.project(target.x, target.y, target.depth, width, height);
    const radius = Math.max(24, Math.min(68, projected.scale * (focus.mode === "boss" ? 58 : 46)));
    const corner = radius * .34;
    const cinematicPalette = skyDancerArcadeV4045Palette(snapshot.stage);
    const accent = focus.mode === "rival"
      ? "#e06ac1"
      : `#${cinematicPalette.accent.toString(16).padStart(6, "0")}`;
    context.save();
    context.strokeStyle = accent;
    context.globalAlpha = (.18 + focus.strength * .2) * rhythm.secondaryHudAlpha;
    context.lineWidth = focus.mode === "boss" ? 1.6 : 1.35;
    const x0 = projected.x - radius;
    const x1 = projected.x + radius;
    const y0 = projected.y - radius;
    const y1 = projected.y + radius;
    context.beginPath();
    context.moveTo(x0 + corner, y0); context.lineTo(x0, y0); context.lineTo(x0, y0 + corner);
    context.moveTo(x1 - corner, y0); context.lineTo(x1, y0); context.lineTo(x1, y0 + corner);
    context.moveTo(x0, y1 - corner); context.lineTo(x0, y1); context.lineTo(x0 + corner, y1);
    context.moveTo(x1 - corner, y1); context.lineTo(x1, y1); context.lineTo(x1, y1 - corner);
    context.stroke();
    context.restore();
  }

  private drawFinalBossPresentation(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.finalBossReactive || !snapshot.finalBossForm) return;
    const boss = snapshot.enemies.find((enemy) => enemy.boss);
    const defeated = snapshot.message?.startsWith("SOVEREIGN DOWN") ?? false;
    if (!boss && !defeated) return;
    const accent = boss?.finalBossAccent ?? snapshot.stage.palette.accent;
    const hex = `#${accent.toString(16).padStart(6, "0")}`;
    const motion = skyDancerArcadeV406FormMotion(snapshot.finalBossForm, snapshot.bossPhase, snapshot.runTimeSeconds);
    const cue = skyDancerArcadeV406FinalBossCue(snapshot.finalBossForm, snapshot.bossPhase, defeated ? "defeat" : "phase");
    const cx = width * .5;
    const cy = height * .38;
    context.save();
    const glow = context.createRadialGradient(cx, cy, 8, cx, cy, Math.max(width, height) * .48);
    glow.addColorStop(0, `${hex}38`);
    glow.addColorStop(.48, `${hex}14`);
    glow.addColorStop(1, `${hex}00`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.translate(cx, cy);
    context.rotate(motion.wobble + snapshot.runTimeSeconds * motion.spinZ * .08);
    context.strokeStyle = hex;
    context.globalAlpha = defeated ? .82 : .36 + snapshot.bossPhase * .11;
    context.lineWidth = defeated ? 4 : 2.2;
    const ringCount = snapshot.finalBossForm === "SEVEN_SKY" ? 7 : snapshot.finalBossForm === "MIRROR_AEGIS" ? 4 : snapshot.finalBossForm === "PRISM_CROWN" ? 5 : 3;
    for (let ring = 0; ring < ringCount; ring += 1) {
      const radius = (36 + ring * 18) * motion.scale;
      context.beginPath();
      const start = snapshot.runTimeSeconds * motion.spinZ * (ring % 2 === 0 ? 1 : -1);
      context.arc(0, 0, radius, start, start + Math.PI * (snapshot.finalBossForm === "HELLSTAR" ? 1.36 : 1.7));
      context.stroke();
    }
    context.restore();
    context.save();
    context.textAlign = "center";
    context.fillStyle = hex;
    context.globalAlpha = .92;
    context.font = "800 10px system-ui, sans-serif";
    context.fillText(`${skyDancerArcadeV406FormLabel(snapshot.finalBossForm)} · PHASE ${snapshot.bossPhase}`, cx, height * .105);
    if (cue) {
      context.globalAlpha = .68;
      context.font = "700 8px system-ui, sans-serif";
      context.fillText(cue.label, cx, height * .105 + 13);
    }
    context.restore();
  }

  private traceEnemySilhouetteV20(
    context: CanvasRenderingContext2D,
    kind: SkyDancerArcadeSnapshot["enemies"][number]["kind"],
    size: number,
  ): void {
    context.beginPath();
    if (kind === "drone") {
      context.moveTo(0, size * 1.05);
      context.lineTo(-size * 1.9, -size * .3);
      context.lineTo(-size * .34, -size * .12);
      context.lineTo(0, -size * .76);
      context.lineTo(size * .34, -size * .12);
      context.lineTo(size * 1.9, -size * .3);
    } else if (kind === "gunship") {
      context.moveTo(0, size * 1.05);
      context.lineTo(-size * 1.6, size * .18);
      context.lineTo(-size * 1.75, -size * .52);
      context.lineTo(-size * .56, -size * .32);
      context.lineTo(0, -size * .92);
      context.lineTo(size * .56, -size * .32);
      context.lineTo(size * 1.75, -size * .52);
      context.lineTo(size * 1.6, size * .18);
    } else if (kind === "striker") {
      context.moveTo(0, size * 1.22);
      context.lineTo(-size * 1.6, -size * .25);
      context.lineTo(-size * .48, -size * .18);
      context.lineTo(-size * .72, -size * .58);
      context.lineTo(0, -size * 1.05);
      context.lineTo(size * .72, -size * .58);
      context.lineTo(size * .48, -size * .18);
      context.lineTo(size * 1.6, -size * .25);
    } else if (kind === "raider") {
      context.moveTo(0, size);
      context.lineTo(-size * 1.72, -size * .08);
      context.lineTo(-size * 1.12, -size * .55);
      context.lineTo(-size * .28, -size * .16);
      context.lineTo(0, -size);
      context.lineTo(size * .28, -size * .16);
      context.lineTo(size * 1.12, -size * .55);
      context.lineTo(size * 1.72, -size * .08);
    } else {
      const width = kind === "bomber" ? 1.6 : kind === "missile-boat" ? 1.55 : kind === "interceptor" ? 1.3 : 1.45;
      context.moveTo(0, size);
      context.lineTo(-size * width, -size * .42);
      context.lineTo(-size * .28, -size * .15);
      context.lineTo(0, -size);
      context.lineTo(size * .28, -size * .15);
      context.lineTo(size * width, -size * .42);
    }
    context.closePath();
  }

  private drawCourse(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const palette = skyDancerArcadeV4045Palette(snapshot.stage);
    const horizon = height * 0.42;
    context.fillStyle = `#${palette.ground.toString(16).padStart(6, "0")}`;
    context.beginPath();
    context.moveTo(0, height);
    context.lineTo(width * 0.42, horizon);
    context.lineTo(width * 0.58, horizon);
    context.lineTo(width, height);
    context.closePath();
    context.fill();
    context.strokeStyle = `#${palette.accent.toString(16).padStart(6, "0")}77`;
    context.lineWidth = 2;
    for (let lane = -2; lane <= 2; lane += 1) {
      context.beginPath();
      context.moveTo(width * 0.5 + lane * width * 0.16, height);
      context.lineTo(width * 0.5 + lane * width * 0.015, horizon);
      context.stroke();
    }
    const scroll = (snapshot.distance * 0.8) % 80;
    for (let line = 0; line < 9; line += 1) {
      const t = ((line * 80 - scroll + 720) % 720) / 720;
      const eased = t * t;
      const y = horizon + eased * (height - horizon);
      context.globalAlpha = 0.2 + t * 0.5;
      context.beginPath();
      context.moveTo(width * (0.42 - t * 0.42), y);
      context.lineTo(width * (0.58 + t * 0.42), y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  private drawWorldBreakGates(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
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

  private drawWorldBreakKnifeRun(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
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

  private drawWorldBreakStormLane(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakStormActive || snapshot.worldBreakStormIndex < 0) return;
    const center = this.project(snapshot.worldBreakStormSafeX, 0, snapshot.worldBreakStormDepth, width, height);
    const half = Math.max(18, center.scale * snapshot.worldBreakStormWidth * 38);
    context.save();
    context.strokeStyle = "rgba(141,243,255,.88)";
    context.lineWidth = Math.max(2, center.scale * 2.5);
    context.setLineDash([8, 6]);
    for (const x of [center.x - half, center.x + half]) {
      context.beginPath();
      context.moveTo(x, center.y - Math.max(42, center.scale * 48));
      context.lineTo(x, center.y + Math.max(42, center.scale * 48));
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = "#ffe46b";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`LIGHTNING SAFE LANE ${snapshot.worldBreakStormIndex + 1}/${snapshot.worldBreakStormTotal}`, center.x, center.y - Math.max(48, center.scale * 55));
    context.restore();
  }

  private drawWorldBreakFortressBreach(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakFortressBreachActive) return;
    const center = this.project(snapshot.worldBreakFortressBreachX, snapshot.worldBreakFortressBreachY, snapshot.worldBreakFortressBreachDepth, width, height);
    const gapX = Math.max(24, center.scale * snapshot.worldBreakFortressBreachRadiusX * 42);
    const gapY = Math.max(20, center.scale * snapshot.worldBreakFortressBreachRadiusY * 34);
    context.save();
    context.strokeStyle = snapshot.worldBreakFortressBreachOpen ? "#75ffab" : "#ffe08a";
    context.lineWidth = Math.max(2.5, center.scale * 3.2);
    context.strokeRect(center.x - gapX, center.y - gapY, gapX * 2, gapY * 2);
    if (!snapshot.worldBreakFortressBreachOpen) {
      context.fillStyle = "rgba(77,52,33,.72)";
      context.fillRect(center.x - gapX + 2, center.y - gapY + 2, gapX * 2 - 4, gapY * 2 - 4);
    }
    context.fillStyle = snapshot.worldBreakFortressBreachOpen ? "#75ffab" : "#ffe08a";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(snapshot.worldBreakFortressBreachOpen ? "BREACH OPEN" : "DESTROY WALL BATTERIES", center.x, center.y - gapY - 8);
    context.restore();
  }


  private drawWorldBreakIceCollapse(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakIceActive || snapshot.worldBreakIceIndex < 0) return;
    const center = this.project(snapshot.worldBreakIceX, snapshot.worldBreakIceY, snapshot.worldBreakIceDepth, width, height);
    const rx = Math.max(20, center.scale * snapshot.worldBreakIceRadiusX * 43);
    const ry = Math.max(18, center.scale * snapshot.worldBreakIceRadiusY * 38);
    context.save();
    context.translate(center.x, center.y);
    context.rotate(Math.PI / 4);
    context.strokeStyle = "#b7f5ff";
    context.lineWidth = Math.max(2.2, center.scale * 3);
    context.globalAlpha = .86;
    context.strokeRect(-rx, -ry, rx * 2, ry * 2);
    context.globalAlpha = .48;
    context.strokeRect(-rx * .78, -ry * .78, rx * 1.56, ry * 1.56);
    context.restore();
    context.fillStyle = "#d8fbff";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`COLLAPSE ${snapshot.worldBreakIceIndex + 1}/${snapshot.worldBreakIceTotal}`, center.x, center.y - ry - 8);
  }

  private drawWorldBreakFloatingPortals(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "floating-ruins" || snapshot.worldBreakPortals.length === 0 || snapshot.worldBreakPortalDepth < -18) return;
    const colors = ["#76efff", "#ffdd73", "#ff6e96"];
    for (const portal of snapshot.worldBreakPortals) {
      if (snapshot.worldBreakPortalChoiceIndex >= 0 && !portal.selected) continue;
      const p = this.project(portal.x, portal.y, portal.depth, width, height);
      const radius = Math.max(22, p.scale * portal.radius * 44);
      context.save();
      context.strokeStyle = colors[portal.index] ?? "#fff";
      context.lineWidth = portal.selected ? 6 : 3;
      context.globalAlpha = portal.selected ? .96 : .78;
      context.beginPath();
      context.arc(p.x, p.y, portal.selected ? radius * 1.2 : radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(p.x, p.y, radius * .72, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = colors[portal.index] ?? "#fff";
      context.font = "800 9px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(portal.doctrine, p.x, p.y - radius - 6);
      context.restore();
    }
  }

  private drawWorldBreakNeonPursuit(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
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

  private drawWorldBreakOrbitalAscent(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "orbital-ascent" || !snapshot.worldBreakOrbitActive) return;
    const axis = this.project(snapshot.worldBreakOrbitSafeX, .38, 18, width, height);
    const corridor = Math.max(24, axis.scale * snapshot.worldBreakOrbitWidth * 42);
    context.save();
    context.strokeStyle = snapshot.worldBreakOrbitAligned ? "#75ffca" : "#59ddff";
    context.lineWidth = 2.4;
    context.setLineDash([9, 7]);
    context.beginPath();
    context.moveTo(axis.x - corridor, height * .25);
    context.lineTo(axis.x - corridor * .55, height * .82);
    context.moveTo(axis.x + corridor, height * .25);
    context.lineTo(axis.x + corridor * .55, height * .82);
    context.stroke();
    context.setLineDash([]);
    const ratio = Math.min(1, snapshot.worldBreakOrbitAltitude / Math.max(1, snapshot.worldBreakOrbitTargetAltitude));
    context.fillStyle = "rgba(89,221,255,.18)";
    context.fillRect(width * .48, height * .22, width * .04, height * .46);
    context.fillStyle = snapshot.worldBreakOrbitAligned ? "#75ffca" : "#59ddff";
    context.fillRect(width * .48, height * (.68 - .46 * ratio), width * .04, height * .46 * ratio);
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`ZERO-G ALT ${Math.round(snapshot.worldBreakOrbitAltitude)}/${Math.round(snapshot.worldBreakOrbitTargetAltitude)}${snapshot.worldBreakOrbitAligned ? " · CLIMB" : " · FIND AXIS"}`, width * .5, height * .19);
    context.restore();
  }

  private drawWorldBreakPrismReprise(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "prism-citadel" || !snapshot.worldBreakPrismActive || snapshot.worldBreakPrismIndex < 0) return;
    const p = this.project(snapshot.worldBreakPrismX, snapshot.worldBreakPrismY, snapshot.worldBreakPrismDepth, width, height);
    const radius = Math.max(20, p.scale * snapshot.worldBreakPrismRadius * 46);
    const colors = ["#72eeff", "#ffd86b", "#ff77a6", "#9cff8d", "#a58cff", "#ff9a62", "#ffffff"];
    context.save();
    context.translate(p.x, p.y);
    context.rotate(snapshot.runTimeSeconds * .35);
    context.strokeStyle = colors[snapshot.worldBreakPrismIndex % colors.length] ?? "#fff";
    context.lineWidth = 3;
    context.globalAlpha = .9;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = .55;
    context.beginPath();
    context.arc(0, 0, radius * .72, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    context.fillStyle = colors[snapshot.worldBreakPrismIndex % colors.length] ?? "#fff";
    context.font = "800 9px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`${snapshot.worldBreakPrismLabel ?? "ROUTE REPRISE"} · ${snapshot.worldBreakPrismIndex + 1}/${snapshot.worldBreakPrismTotal}`, p.x, p.y - radius - 7);
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.branchActive) return;
    const colors = ["#65e6ff", "#ffd65f", "#ff6ca2"];
    snapshot.branchOptions.forEach((id, index) => {
      const count = snapshot.branchOptions.length;
      const x = width * (count === 2 ? (index === 0 ? 0.3 : 0.7) : 0.22 + index * 0.28);
      const selected = snapshot.branchSelection === id;
      context.strokeStyle = colors[index] ?? "#fff";
      context.lineWidth = selected ? 6 : 3;
      context.beginPath();
      context.arc(x, height * 0.45, selected ? 38 : 31, 0, Math.PI * 2);
      context.stroke();
    });
  }

  private drawTerminalThreatVectorV4044(
    context: CanvasRenderingContext2D,
    snapshot: SkyDancerArcadeSnapshot,
    width: number,
    height: number,
  ): void {
    const candidates = snapshot.projectiles.filter(skyDancerArcadeV4044IsTerminalThreat);
    if (candidates.length === 0) return;
    const threat = [...candidates].sort((a, b) => {
      const aw = a.warningSeconds ?? 0;
      const bw = b.warningSeconds ?? 0;
      const aScore = aw > 0 ? aw * 8 : Math.max(0, a.depth);
      const bScore = bw > 0 ? bw * 8 : Math.max(0, b.depth);
      return aScore - bScore;
    })[0];
    const sourceEnemy = threat.sourceEnemyId === undefined
      ? null
      : snapshot.enemies.find((enemy) => enemy.id === threat.sourceEnemyId) ?? null;
    const sourceX = (threat.warningSeconds ?? 0) > 0 && sourceEnemy ? sourceEnemy.x : threat.x;
    const sourceY = (threat.warningSeconds ?? 0) > 0 && sourceEnemy ? sourceEnemy.y : threat.y;
    const dx = sourceX - snapshot.playerX;
    const dy = sourceY - snapshot.playerY;
    const angle = Math.atan2(-dy, dx);
    const warning = Math.max(0, threat.warningSeconds ?? 0);
    const warningDuration = Math.max(.001, threat.warningDuration ?? .42);
    const warningUrgency = warning > 0 ? Math.max(.3, Math.min(1, 1 - warning / warningDuration)) : 1;
    const depthUrgency = warning > 0 ? 0 : Math.max(.24, Math.min(1, 1 - (threat.depth - 2.2) / 11.8));
    const urgency = Math.max(warningUrgency, depthUrgency);
    const x = width * .5 + snapshot.playerX * width * .25;
    const y = height * .76 - snapshot.playerY * height * .22;
    const radius = Math.max(34, Math.min(52, height * .118));
    const span = Math.PI * .72;
    const rgb = threat.projectileClass === "seeker"
      ? "255,79,163"
      : threat.projectileClass === "boss"
        ? "255,54,92"
        : threat.projectileClass === "heavy"
          ? "255,138,45"
          : "255,99,56";
    const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 19 + threat.id) * .045 * urgency;

    context.save();
    context.translate(x, y);
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";
    context.strokeStyle = `rgba(${rgb},${.3 + urgency * .42})`;
    context.lineWidth = 3.2 + urgency * 1.6;
    context.beginPath();
    context.arc(0, 0, radius * pulse, angle - span * .5, angle + span * .5);
    context.stroke();

    context.strokeStyle = `rgba(255,255,225,${.14 + urgency * .34})`;
    context.lineWidth = 1.6 + urgency * .8;
    context.beginPath();
    context.arc(0, 0, radius * .82, angle - span * .34, angle + span * .34);
    context.stroke();

    const tickRadius = radius * pulse;
    const tx = Math.cos(angle) * tickRadius;
    const ty = Math.sin(angle) * tickRadius;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const tickHalf = 8 + urgency * 5;
    context.strokeStyle = `rgba(255,255,235,${.38 + urgency * .54})`;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(tx - tangentX * tickHalf, ty - tangentY * tickHalf);
    context.lineTo(tx + tangentX * tickHalf, ty + tangentY * tickHalf);
    context.stroke();
    context.restore();
  }

  private drawHostileContactFxV4043(
    context: CanvasRenderingContext2D,
    snapshot: SkyDancerArcadeSnapshot,
    width: number,
    height: number,
  ): void {
    const event = snapshot.hostileContact;
    if (!event) return;
    const duration = event.kind === "hit" ? .3 : .4;
    const age = Math.max(0, snapshot.runTimeSeconds - event.runTimeSeconds);
    if (age > duration) return;

    const t = Math.max(0, Math.min(1, age / duration));
    const fade = (1 - t) * (1 - t);
    const baseX = width * .5 + snapshot.playerX * width * .25;
    const baseY = height * .76 - snapshot.playerY * height * .22;
    const x = baseX + Math.max(-1, Math.min(1, event.offsetX)) * width * .082 + event.vx * age * width * .018;
    const y = baseY - Math.max(-1, Math.min(1, event.offsetY)) * height * .11 - event.vy * age * height * .016;
    const sideMagnitude = Math.hypot(event.offsetX, event.offsetY);
    const sideAngle = sideMagnitude > .045
      ? Math.atan2(-event.offsetY, event.offsetX)
      : Math.atan2(event.vy, -event.vx);
    const motionMagnitude = Math.hypot(event.vx, event.vy);
    const motionAngle = motionMagnitude > .04 ? Math.atan2(-event.vy, event.vx) : sideAngle + Math.PI * .5;
    const rgb = event.projectileClass === "seeker"
      ? "255,79,163"
      : event.projectileClass === "boss"
        ? "255,54,92"
        : event.projectileClass === "heavy"
          ? "255,138,45"
          : "255,99,56";

    context.save();
    context.translate(x, y);
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    const wakeLength = event.kind === "hit" ? 26 + t * 24 : 38 + t * 72;
    context.save();
    context.rotate(motionAngle);
    const wakeGradient = context.createLinearGradient(-wakeLength * .55, 0, wakeLength * .55, 0);
    wakeGradient.addColorStop(0, `rgba(${rgb},0)`);
    wakeGradient.addColorStop(.48, `rgba(${rgb},${(event.kind === "hit" ? .22 : event.committed ? .46 : .3) * fade})`);
    wakeGradient.addColorStop(.58, `rgba(255,250,226,${(event.kind === "hit" ? .34 : .5) * fade})`);
    wakeGradient.addColorStop(1, `rgba(${rgb},0)`);
    context.strokeStyle = wakeGradient;
    context.lineWidth = event.kind === "hit" ? 3 : 2.2 + (event.committed ? 1.1 : 0);
    context.beginPath();
    context.moveTo(-wakeLength * .55, 0);
    context.lineTo(wakeLength * .55, 0);
    context.stroke();
    context.restore();

    const ringRadius = event.kind === "hit" ? 10 + t * 24 : 12 + t * 44;
    context.strokeStyle = event.kind === "hit"
      ? `rgba(255,220,176,${.52 * fade})`
      : `rgba(${rgb},${(event.committed ? .44 : .3) * fade})`;
    context.lineWidth = event.kind === "hit" ? 3.2 - t * 1.2 : 2.4 - t * .8;
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();

    if (event.kind === "hit") {
      context.strokeStyle = `rgba(${rgb},${.84 * fade})`;
      context.lineWidth = 4.2 - t * 1.5;
      context.beginPath();
      context.arc(0, 0, 18 + t * 10, sideAngle - .76, sideAngle + .76);
      context.stroke();

      for (let index = 0; index < 4; index += 1) {
        const angle = sideAngle + (index - 1.5) * .25;
        const start = 8 + t * 7;
        const end = 18 + t * (24 + index * 3);
        context.strokeStyle = index % 2 === 0
          ? `rgba(255,248,220,${(.76 - index * .08) * fade})`
          : `rgba(${rgb},${(.68 - index * .07) * fade})`;
        context.lineWidth = index % 2 === 0 ? 2.4 : 1.8;
        context.beginPath();
        context.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
        context.lineTo(Math.cos(angle) * end, Math.sin(angle) * end);
        context.stroke();
      }

      context.fillStyle = `rgba(255,255,235,${.72 * fade})`;
      context.beginPath();
      context.arc(0, 0, 5 + (1 - t) * 4, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  private drawPlayer(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const x = width * 0.5 + snapshot.playerX * width * 0.25;
    const y = height * 0.76 - snapshot.playerY * height * 0.22;
    context.save();
    context.translate(x, y);
    context.rotate(-snapshot.playerX * 0.28);
    context.fillStyle = "#bccbd1";
    context.beginPath();
    context.moveTo(0, -28);
    context.lineTo(-46, 21);
    context.lineTo(-10, 11);
    context.lineTo(0, 30);
    context.lineTo(10, 11);
    context.lineTo(46, 21);
    context.closePath();
    context.fill();
    context.fillStyle = "#edf6f8";
    context.fillRect(-4, -19, 8, 36);
    context.fillStyle = snapshot.turboActive ? "#fff0c9" : "#a8f0ff";
    context.beginPath();
    context.moveTo(-7, 27);
    context.lineTo(0, snapshot.turboActive ? 68 : 46);
    context.lineTo(7, 27);
    context.fill();
    context.restore();
  }

  private project(x: number, y: number, depth: number, width: number, height: number): { x: number; y: number; scale: number } {
    const scale = Math.max(0.22, Math.min(1.8, 30 / Math.max(12, depth)));
    return {
      x: width * 0.5 + x * width * 0.27 * scale,
      y: height * 0.51 - y * height * 0.25 * scale,
      scale,
    };
  }

  private resize(): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setMove(x: number, y: number): void { this.runtime.setMove(x, y); }
  setFire(active: boolean): void { this.runtime.setFire(active); }
  setLock(active: boolean): void { this.runtime.setLock(active); }
  setTurbo(active: boolean): void { this.runtime.setTurbo(active); }
  releaseInputs(): void { this.runtime.releaseInputs(); }
  pause(): void { this.runtime.pause(); }
  resume(): void { this.runtime.resume(); }
  continueRun(): boolean { return this.runtime.continueRun(); }
  getSnapshot(): SkyDancerArcadeSnapshot { return this.runtime.getSnapshot(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }
}