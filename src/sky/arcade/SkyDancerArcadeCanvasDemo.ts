import { SkyDancerArcadeRuntime, type SkyDancerArcadeRuntimeOptions, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeDemoHandle } from "./SkyDancerArcadeWebGLDemo";

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
    const gradient = context.createLinearGradient(0, 0, 0, cssHeight);
    gradient.addColorStop(0, `#${palette.sky.toString(16).padStart(6, "0")}`);
    gradient.addColorStop(1, `#${palette.fog.toString(16).padStart(6, "0")}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, cssWidth, cssHeight);
    this.drawCourse(context, snapshot, cssWidth, cssHeight);
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
      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "bomber" ? 16 : 11);
      context.save();
      context.translate(projected.x, projected.y);
      context.fillStyle = `#${palette.enemy.toString(16).padStart(6, "0")}`;
      context.beginPath();
      context.moveTo(0, size);
      context.lineTo(-size * 1.45, -size * 0.42);
      context.lineTo(-size * 0.28, -size * 0.15);
      context.lineTo(0, -size);
      context.lineTo(size * 0.28, -size * 0.15);
      context.lineTo(size * 1.45, -size * 0.42);
      context.closePath();
      context.fill();
      if (enemy.locked) {
        context.strokeStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
        context.lineWidth = 2;
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
    context.restore();
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
