import { SkySimulation, FIXED_STEP } from "./SkySimulation";
import { SkyInput } from "./SkyInput";
import type { SkyDemoHandle } from "./SkyDemo";
import type { SkyStats } from "./SkyTypes";

interface Point { x: number; y: number; depth: number; }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class SkyCanvasPreview implements SkyDemoHandle {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly simulation = new SkySimulation();
  private readonly input: SkyInput;
  private readonly onStats: (stats: SkyStats) => void;
  private frameId = 0;
  private lastTime = performance.now();
  private accumulator = 0;
  private paused = false;
  private statsTimer = 0;
  private width = 1;
  private height = 1;

  constructor(private readonly mount: HTMLElement, onStats: (stats: SkyStats) => void) {
    this.onStats = onStats;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "sky-canvas sky-canvas-fallback";
    this.canvas.setAttribute("aria-label", "Sky Dancer Canvas 2D fallback");
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    mount.appendChild(this.canvas);
    this.input = new SkyInput({
      onMove: (x, y) => this.simulation.setMove(x, y),
      onFire: (active) => this.simulation.setFire(active),
    });
    this.input.attach(window);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    this.animate();
  }

  start(): void { this.simulation.start(); }
  reset(): void { this.simulation.reset(); }
  pause(): void { this.paused = true; this.input.clear(); }
  resume(): void { this.paused = false; this.lastTime = performance.now(); }
  setMove(x: number, y: number): void { this.simulation.setMove(x, y); }
  setFire(active: boolean): void { this.simulation.setFire(active); }
  getStats(): SkyStats { return this.simulation.getStats("canvas"); }

  dispose(): void {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);
    this.input.detach();
    this.canvas.remove();
  }

  private readonly animate = (): void => {
    const now = performance.now();
    const delta = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (!this.paused) {
      this.input.update();
      this.accumulator += delta;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < 5) {
        this.simulation.step(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps += 1;
      }
      this.draw();
      this.statsTimer += delta;
      if (this.statsTimer >= 0.15) {
        this.onStats(this.simulation.getStats("canvas"));
        this.statsTimer = 0;
      }
    }
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  private draw(): void {
    const context = this.context;
    const width = this.width;
    const height = this.height;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#07152d");
    sky.addColorStop(0.56, "#173d73");
    sky.addColorStop(1, "#07152d");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.65;
    context.fillStyle = "#b6ecff";
    for (let index = 0; index < 55; index += 1) {
      const x = (index * 97) % width;
      const y = 30 + ((index * 43) % Math.max(80, height * 0.5));
      context.fillRect(x, y, index % 4 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1);
    }
    context.restore();

    const project = (x: number, y: number, z: number): Point => {
      const depth = 18 - z;
      const scale = 470 / Math.max(8, depth);
      return {
        x: width / 2 + (x - this.simulation.plane.x * 0.25) * scale,
        y: height * 0.48 - (y - this.simulation.plane.y) * scale + depth * 1.45,
        depth,
      };
    };

    const platforms = [...this.simulation.platforms].sort((a, b) => b.z - a.z);
    for (const platform of platforms) {
      const a = project(platform.x - platform.width / 2, platform.y, platform.z);
      const b = project(platform.x + platform.width / 2, platform.y, platform.z);
      const c = project(platform.x + platform.width / 2, platform.y, platform.z + platform.depth);
      const d = project(platform.x - platform.width / 2, platform.y, platform.z + platform.depth);
      if (Math.max(a.depth, b.depth, c.depth, d.depth) < 1 || Math.min(a.depth, b.depth, c.depth, d.depth) > 220) continue;
      context.fillStyle = "#1b4775";
      context.beginPath();
      context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.lineTo(c.x, c.y); context.lineTo(d.x, d.y); context.closePath(); context.fill();
      context.strokeStyle = "#53d9ff";
      context.globalAlpha = 0.75;
      context.lineWidth = clamp(1.5 * (220 / Math.max(20, a.depth)), 1, 4);
      context.stroke();
      context.globalAlpha = 1;
    }

    const enemies = [...this.simulation.enemies].sort((a, b) => b.z - a.z);
    for (const enemy of enemies) {
      const point = project(enemy.x, enemy.y, enemy.z);
      if (point.depth < 1 || point.depth > 220) continue;
      const size = clamp(690 / point.depth, 5, 36);
      context.save();
      context.translate(point.x, point.y);
      context.rotate(enemy.phase + enemy.z * 0.02);
      context.fillStyle = "#ff6e85";
      context.beginPath(); context.moveTo(0, -size); context.lineTo(size, 0); context.lineTo(0, size); context.lineTo(-size, 0); context.closePath(); context.fill();
      context.strokeStyle = "#ffd26b";
      context.lineWidth = Math.max(1, size * 0.12);
      context.strokeRect(-size * 1.2, -size * 0.15, size * 2.4, size * 0.3);
      context.restore();
    }

    for (const bullet of this.simulation.bullets) {
      const point = project(bullet.x, bullet.y, bullet.z);
      if (point.depth < 1 || point.depth > 220) continue;
      const size = clamp(420 / point.depth, 2, 9);
      context.fillStyle = "#ffe477";
      context.fillRect(point.x - size / 2, point.y - size * 1.8, size, size * 3.6);
    }

    const plane = project(this.simulation.plane.x, this.simulation.plane.y, 0);
    const planeSize = clamp(width * 0.06, 24, 48);
    context.save();
    context.translate(plane.x, plane.y + planeSize * 0.65);
    context.fillStyle = "#2fd0e6";
    context.beginPath(); context.moveTo(0, -planeSize); context.lineTo(planeSize * 0.35, planeSize * 0.7); context.lineTo(0, planeSize * 0.35); context.lineTo(-planeSize * 0.35, planeSize * 0.7); context.closePath(); context.fill();
    context.fillStyle = "#ffd466";
    context.beginPath(); context.moveTo(-planeSize * 1.35, planeSize * 0.16); context.lineTo(planeSize * 1.35, planeSize * 0.16); context.lineTo(planeSize * 0.5, planeSize * 0.4); context.lineTo(-planeSize * 0.5, planeSize * 0.4); context.closePath(); context.fill();
    context.strokeStyle = "#ff765a";
    context.lineWidth = 3;
    context.beginPath(); context.moveTo(-planeSize * 0.2, planeSize * 0.85); context.lineTo(-planeSize * 0.2, planeSize * 1.35); context.moveTo(planeSize * 0.2, planeSize * 0.85); context.lineTo(planeSize * 0.2, planeSize * 1.35); context.stroke();
    context.restore();
  }

  private readonly resize = (): void => {
    this.width = Math.max(1, this.mount.clientWidth);
    this.height = Math.max(1, this.mount.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
}
