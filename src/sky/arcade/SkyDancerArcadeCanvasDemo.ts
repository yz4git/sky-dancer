import { SkyDancerArcadeRuntime, type SkyDancerArcadeRuntimeOptions, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeDemoHandle } from "./SkyDancerArcadeWebGLDemo";
import { skyDancerArcadeEnemyVisualScaleV17 } from "./SkyDancerArcadeModels";
import { skyDancerArcadeV406FinalBossCue, skyDancerArcadeV406FormMotion, skyDancerArcadeV406FormLabel } from "./SkyDancerArcadeV406FinalBossPresentation";
import { skyDancerArcadeV408SceneFocus } from "./SkyDancerArcadeV408CinematicFocus";
import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";
import { skyDancerArcadeV4010DynamicOcclusion, skyDancerArcadeV4010EntityOcclusion } from "./SkyDancerArcadeV4010DynamicOcclusion";
import { skyDancerArcadeV4011ForegroundCraftCount, skyDancerArcadeV4011ScreenStress } from "./SkyDancerArcadeV4011ScreenStress";

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
    const palette = snapshot.stage.palette;
    context.save();
    context.scale(ratio, ratio);
    const cssWidth = width / ratio;
    const cssHeight = height / ratio;
    const v409Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const v409IncomingThreats = snapshot.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30).length;
    const v409Clarity = skyDancerArcadeV409PhoneClarity({
      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,
      sceneMode: v409Focus.mode,
      incomingThreats: v409IncomingThreats,
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
      const projected = this.project(projectile.x, projectile.y, projectile.depth, cssWidth, cssHeight);
      if (projectile.owner === "player-missile") {
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
      context.fill();
    }
    this.drawPlayer(context, snapshot, cssWidth, cssHeight);
    this.drawCinematicFocusV408(context, snapshot, cssWidth, cssHeight);
    context.restore();
  }

  private drawCinematicFocusV408(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const target = focus.mode === "boss"
      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null
      : focus.mode === "rival" ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null : null;
    if (!target) return;
    const projected = this.project(target.x, target.y, target.depth, width, height);
    const radius = Math.max(24, Math.min(68, projected.scale * (focus.mode === "boss" ? 58 : 46)));
    const corner = radius * .34;
    const accent = focus.mode === "rival"
      ? "#ff65d5"
      : `#${snapshot.stage.palette.accent.toString(16).padStart(6, "0")}`;
    context.save();
    context.strokeStyle = accent;
    context.globalAlpha = .18 + focus.strength * .2;
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
    const palette = snapshot.stage.palette;
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

  private drawPlayer(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const x = width * 0.5 + snapshot.playerX * width * 0.25;
    const y = height * 0.76 - snapshot.playerY * height * 0.22;
    context.save();
    context.translate(x, y);
    context.rotate(-snapshot.playerX * 0.28);
    context.fillStyle = "#4ed9f4";
    context.beginPath();
    context.moveTo(0, -28);
    context.lineTo(-46, 21);
    context.lineTo(-10, 11);
    context.lineTo(0, 30);
    context.lineTo(10, 11);
    context.lineTo(46, 21);
    context.closePath();
    context.fill();
    context.fillStyle = "#eefcff";
    context.fillRect(-4, -19, 8, 36);
    context.fillStyle = snapshot.turboActive ? "#fff3ad" : "#6ee9ff";
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