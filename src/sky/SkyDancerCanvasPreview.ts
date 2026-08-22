import type { CartArenaSession } from "../cart/CartArenaSession";
import { CartRogueCanvasPreview } from "../cart/CartRogueCanvasPreview";
import type { CartRogueSnapshotHandler } from "../cart/CartRogueDemo";
import { CART_WORLD_GRAPH } from "../cart/CartWorldGraph";

interface CanvasRuntimeView {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  session: CartArenaSession;
  draw: () => void;
}

/** Canvas fallback using the exact Cart Rogue simulation with Sky Dancer visuals. */
export class SkyDancerCanvasPreview extends CartRogueCanvasPreview {
  constructor(mount: HTMLElement, onSnapshot: CartRogueSnapshotHandler) {
    super(mount, onSnapshot);
    const runtime = this as unknown as CanvasRuntimeView;
    runtime.canvas.setAttribute("aria-label", "Sky Dancer Canvas fallback");
    runtime.draw = () => this.drawSkyFrame(runtime);
  }

  private drawSkyFrame(runtime: CanvasRuntimeView): void {
    const canvas = runtime.canvas;
    const ctx = runtime.context;
    const snapshot = runtime.session.snapshot();
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#4aa9e6");
    gradient.addColorStop(0.58, "#8dd4f6");
    gradient.addColorStop(1, "#dff6ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / 82, height / 68);
    const centerX = width * 0.5;
    const centerZ = height * 0.63;
    const worldToScreen = (x: number, z: number) => ({
      x: centerX + (x - snapshot.x) * scale,
      y: centerZ - (z - snapshot.z) * scale,
    });

    this.drawCloudLayer(ctx, width, height, snapshot.x, snapshot.z);

    // No ground fill: only faint airspace limits corresponding to Cart Rogue's
    // unchanged collision rectangles.
    ctx.save();
    ctx.strokeStyle = "rgba(215,247,255,.3)";
    ctx.lineWidth = Math.max(1, scale * 0.07);
    ctx.setLineDash([Math.max(3, scale * 0.6), Math.max(3, scale * 0.48)]);
    for (const node of CART_WORLD_GRAPH.nodes) {
      const p = worldToScreen(node.rect.centerX, node.rect.centerZ);
      ctx.strokeRect(
        p.x - node.rect.halfWidth * scale,
        p.y - node.rect.halfDepth * scale,
        node.rect.halfWidth * 2 * scale,
        node.rect.halfDepth * 2 * scale,
      );
    }
    ctx.restore();

    for (const pickup of snapshot.resources) {
      if (pickup.collected) continue;
      const p = worldToScreen(pickup.x, pickup.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      if (pickup.kind === "gas") {
        ctx.fillStyle = "rgba(255,86,104,.28)";
        ctx.beginPath();
        ctx.arc(0, 0, 1.3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff5668";
        ctx.fillRect(-0.95 * scale, -0.72 * scale, 1.9 * scale, 1.44 * scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-0.18 * scale, -0.55 * scale, 0.36 * scale, 1.1 * scale);
        ctx.fillRect(-0.55 * scale, -0.18 * scale, 1.1 * scale, 0.36 * scale);
      } else {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "rgba(67,210,255,.3)";
        ctx.fillRect(-1.05 * scale, -1.05 * scale, 2.1 * scale, 2.1 * scale);
        ctx.fillStyle = "#43d2ff";
        ctx.fillRect(-0.72 * scale, -0.72 * scale, 1.44 * scale, 1.44 * scale);
      }
      ctx.restore();
    }

    for (const obstacle of snapshot.obstacles) {
      if (obstacle.destroyed) continue;
      const p = worldToScreen(obstacle.x, obstacle.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = obstacle.variant === 0 ? "#a6b9c9" : obstacle.variant === 1 ? "#8fa9bd" : "#b7c9d5";
      ctx.strokeStyle = "#66dcff";
      ctx.lineWidth = Math.max(1, scale * 0.12);
      ctx.beginPath();
      for (let index = 0; index < 8; index += 1) {
        const angle = Math.PI * 2 * index / 8 + 0.18;
        const radius = obstacle.radius * scale * (index % 2 === 0 ? 1 : 0.78);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      const p = worldToScreen(enemy.x, enemy.z);
      const primary = enemy.kind === "boss" ? "#34384d" : enemy.kind === "heavy" ? "#a45c86" : enemy.kind === "chaser" ? "#75b8d9" : "#e5a957";
      const accent = enemy.kind === "boss" ? "#ff5e6f" : enemy.kind === "heavy" ? "#e3b4d2" : enemy.kind === "chaser" ? "#d9f6ff" : "#ffefb2";
      this.drawFighter(ctx, p.x, p.y, enemy.heading, enemy.radius * scale, primary, accent, enemy.kind === "boss");

      const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
      ctx.fillStyle = "rgba(28,46,66,.88)";
      ctx.fillRect(p.x - enemy.radius * scale, p.y - enemy.radius * 1.65 * scale, enemy.radius * 2 * scale, Math.max(2, 0.17 * scale));
      ctx.fillStyle = enemy.kind === "boss" ? "#ff6576" : "#8be6ff";
      ctx.fillRect(p.x - enemy.radius * scale, p.y - enemy.radius * 1.65 * scale, enemy.radius * 2 * scale * ratio, Math.max(2, 0.17 * scale));
    }

    this.drawGate(ctx, worldToScreen, 52, snapshot.arena1GateLocked, scale);
    this.drawGate(ctx, worldToScreen, 140, snapshot.arena2GateLocked, scale);

    this.drawFighter(
      ctx,
      centerX,
      centerZ,
      snapshot.heading,
      1.48 * scale,
      snapshot.boostActive ? "#55d8f5" : "#3eb7d7",
      "#e9f8ff",
      false,
    );

    if (snapshot.boostActive) {
      ctx.save();
      ctx.translate(centerX, centerZ);
      ctx.rotate(snapshot.heading);
      ctx.fillStyle = "rgba(100,225,255,.72)";
      ctx.beginPath();
      ctx.moveTo(-0.45 * scale, 1.25 * scale);
      ctx.lineTo(0, 3.3 * scale);
      ctx.lineTo(0.45 * scale, 1.25 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFighter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    heading: number,
    radius: number,
    primary: string,
    accent: string,
    boss: boolean,
  ): void {
    const s = radius / 1.48;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(0, -2.1 * s);
    ctx.lineTo(0.62 * s, -0.65 * s);
    ctx.lineTo(2.35 * s, 0.45 * s);
    ctx.lineTo(0.72 * s, 0.15 * s);
    ctx.lineTo(0.58 * s, 1.75 * s);
    ctx.lineTo(0, 1.28 * s);
    ctx.lineTo(-0.58 * s, 1.75 * s);
    ctx.lineTo(-0.72 * s, 0.15 * s);
    ctx.lineTo(-2.35 * s, 0.45 * s);
    ctx.lineTo(-0.62 * s, -0.65 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -2.1 * s);
    ctx.lineTo(0.28 * s, -0.85 * s);
    ctx.lineTo(-0.28 * s, -0.85 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1.72 * s, 0.24 * s, 3.44 * s, 0.16 * s);

    ctx.fillStyle = "#173d5b";
    ctx.beginPath();
    ctx.ellipse(0, -0.25 * s, 0.35 * s, 0.62 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    if (boss) {
      ctx.fillStyle = accent;
      ctx.fillRect(-2.0 * s, 0.42 * s, 0.42 * s, 1.25 * s);
      ctx.fillRect(1.58 * s, 0.42 * s, 0.42 * s, 1.25 * s);
    }
    ctx.restore();
  }

  private drawGate(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (x: number, z: number) => { x: number; y: number },
    z: number,
    locked: boolean,
    scale: number,
  ): void {
    const gate = worldToScreen(0, z);
    ctx.save();
    ctx.strokeStyle = locked ? "#ff6d79" : "#75e4c1";
    ctx.lineWidth = Math.max(2, 0.3 * scale);
    ctx.beginPath();
    ctx.moveTo(gate.x - 6.5 * scale, gate.y);
    ctx.lineTo(gate.x + 6.5 * scale, gate.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawCloudLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    worldX: number,
    worldZ: number,
  ): void {
    ctx.save();
    ctx.fillStyle = "rgba(248,253,255,.55)";
    const driftX = ((worldX * 1.7) % 110 + 110) % 110;
    const driftY = ((worldZ * 0.42) % 64 + 64) % 64;
    for (let row = 0; row < 4; row += 1) {
      for (let col = -1; col < 8; col += 1) {
        const x = col * 110 - driftX + (row % 2) * 42;
        const y = height * 0.7 + row * 58 - driftY;
        ctx.beginPath();
        ctx.ellipse(x, y, 48, 17, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 31, y - 7, 35, 19, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 28, y - 4, 31, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
