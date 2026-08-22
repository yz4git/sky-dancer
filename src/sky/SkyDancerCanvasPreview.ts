import type { CartArenaSession } from "../cart/CartArenaSession";
import { CartRogueCanvasPreview } from "../cart/CartRogueCanvasPreview";
import type { CartRogueSnapshotHandler } from "../cart/CartRogueDemo";
import { CART_WORLD_GRAPH } from "../cart/CartWorldGraph";
import {
  getSkyDancerMissileState,
  installSkyDancerFlightCombat,
} from "./SkyDancerFlightCombat";

interface CanvasRuntimeView {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  session: CartArenaSession;
  draw: () => void;
}

/** Canvas fallback using Cart Rogue progression with Sky Dancer flight combat. */
export class SkyDancerCanvasPreview extends CartRogueCanvasPreview {
  private missileHitSerial = 0;
  private damageStartMs = 0;
  private damageUntilMs = 0;

  constructor(mount: HTMLElement, onSnapshot: CartRogueSnapshotHandler) {
    super(mount, onSnapshot);
    installSkyDancerFlightCombat();
    const runtime = this as unknown as CanvasRuntimeView;
    runtime.canvas.setAttribute("aria-label", "Sky Dancer Canvas fallback");
    runtime.draw = () => this.drawSkyFrame(runtime);
  }

  private drawSkyFrame(runtime: CanvasRuntimeView): void {
    const canvas = runtime.canvas;
    const ctx = runtime.context;
    const snapshot = runtime.session.snapshot();
    const missiles = getSkyDancerMissileState(runtime.session);
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    const now = performance.now();

    if (missiles.hitSerial > this.missileHitSerial) {
      this.missileHitSerial = missiles.hitSerial;
      this.damageStartMs = now;
      this.damageUntilMs = now + 1350;
    }

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#4aa9e6");
    gradient.addColorStop(0.5, "#88d0f3");
    gradient.addColorStop(1, "#d9eff0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / 82, height / 68);
    const centerX = width * 0.5;
    const centerZ = height * 0.63;
    const worldToScreen = (x: number, z: number) => ({
      x: centerX + (x - snapshot.x) * scale,
      y: centerZ - (z - snapshot.z) * scale,
    });

    const damageActive = now < this.damageUntilMs;
    if (damageActive) {
      const age = Math.max(0, (now - this.damageStartMs) / 1000);
      const shake = Math.max(0, 1 - age / 0.48);
      ctx.save();
      ctx.translate(Math.sin(now * 0.11) * shake * 7, Math.cos(now * 0.137) * shake * 5);
    }

    this.drawTerrain150m(ctx, width, height, snapshot.x, snapshot.z);
    this.drawCloudLayer(ctx, width, height, snapshot.x, snapshot.z);

    ctx.save();
    ctx.strokeStyle = "rgba(215,247,255,.18)";
    ctx.lineWidth = Math.max(1, scale * 0.06);
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
      ctx.fillStyle = pickup.kind === "gas" ? "#ff5668" : "#43d2ff";
      ctx.beginPath();
      ctx.arc(0, 0, 0.82 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.fillRect(-0.12 * scale, -0.55 * scale, 0.24 * scale, 1.1 * scale);
      ctx.fillRect(-0.55 * scale, -0.12 * scale, 1.1 * scale, 0.24 * scale);
      ctx.restore();
    }

    for (const obstacle of snapshot.obstacles) {
      if (obstacle.destroyed) continue;
      const p = worldToScreen(obstacle.x, obstacle.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = obstacle.variant === 0 ? "#a6b9c9" : obstacle.variant === 1 ? "#8fa9bd" : "#b7c9d5";
      ctx.strokeStyle = "#66dcff";
      ctx.lineWidth = Math.max(1, scale * 0.1);
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
      this.drawFighter(ctx, p.x, p.y, enemy.heading, enemy.radius * scale, primary, accent, enemy.kind === "boss", true);
      const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
      ctx.fillStyle = "rgba(28,46,66,.88)";
      ctx.fillRect(p.x - enemy.radius * scale, p.y - enemy.radius * 1.65 * scale, enemy.radius * 2 * scale, Math.max(2, 0.17 * scale));
      ctx.fillStyle = enemy.kind === "boss" ? "#ff6576" : "#8be6ff";
      ctx.fillRect(p.x - enemy.radius * scale, p.y - enemy.radius * 1.65 * scale, enemy.radius * 2 * scale * ratio, Math.max(2, 0.17 * scale));
    }

    for (const missile of missiles.missiles) {
      const p = worldToScreen(missile.x, missile.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(missile.heading);
      const danger = Math.max(0, Math.min(1, (14 - missile.distanceToPlayer) / 12));
      const s = scale * (0.34 + danger * 0.08);

      const smokeGradient = ctx.createLinearGradient(0, 0.7 * s, 0, 8.2 * s);
      smokeGradient.addColorStop(0, `rgba(255,244,224,${0.46 + danger * 0.14})`);
      smokeGradient.addColorStop(0.5, "rgba(226,231,235,.22)");
      smokeGradient.addColorStop(1, "rgba(184,192,200,0)");
      ctx.strokeStyle = smokeGradient;
      ctx.lineWidth = Math.max(2, 0.72 * s);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0.7 * s);
      ctx.lineTo(Math.sin(now * 0.018 + missile.id) * 0.3 * s, 8.2 * s);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,178,52,${0.38 + danger * 0.48})`;
      ctx.lineWidth = Math.max(1, 0.16 * s);
      ctx.beginPath();
      ctx.arc(0, -0.6 * s, (1.15 + danger * 0.65) * s, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = missile.sourceKind === "boss" ? "#ff4055" : "#eee4cf";
      ctx.beginPath();
      ctx.moveTo(0, -2.0 * s);
      ctx.lineTo(0.5 * s, 0.7 * s);
      ctx.lineTo(0, 0.4 * s);
      ctx.lineTo(-0.5 * s, 0.7 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,166,55,${0.62 + danger * 0.34})`;
      ctx.beginPath();
      ctx.moveTo(-0.35 * s, 0.55 * s);
      ctx.lineTo(0, 2.8 * s);
      ctx.lineTo(0.35 * s, 0.55 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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
      false,
    );

    if (snapshot.boostActive) {
      ctx.save();
      ctx.translate(centerX, centerZ);
      ctx.rotate(snapshot.heading);
      ctx.fillStyle = "rgba(100,225,255,.72)";
      ctx.beginPath();
      ctx.moveTo(-0.45 * scale, 1.25 * scale);
      ctx.lineTo(0, 4.4 * scale);
      ctx.lineTo(0.45 * scale, 1.25 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (damageActive) {
      this.drawPlayerDamageSmoke(ctx, centerX, centerZ, snapshot.heading, scale, now);
      ctx.restore();
    }

    if (missiles.incomingCount > 0) {
      ctx.save();
      const pulse = 0.72 + Math.sin(now * 0.012) * 0.18;
      ctx.fillStyle = `rgba(104,12,24,${pulse})`;
      ctx.strokeStyle = "rgba(255,222,120,.95)";
      ctx.lineWidth = 2;
      const labelWidth = Math.min(198, width * 0.38);
      ctx.fillRect(width * 0.5 - labelWidth * 0.5, height * 0.16, labelWidth, 28);
      ctx.strokeRect(width * 0.5 - labelWidth * 0.5, height * 0.16, labelWidth, 28);
      ctx.fillStyle = "#fff1c7";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`MISSILE INBOUND ×${missiles.incomingCount}`, width * 0.5, height * 0.16 + 18);
      ctx.restore();
    }

    if (damageActive) this.drawMissileHitOverlay(ctx, width, height, centerX, centerZ, scale, now);
  }

  private drawTerrain150m(ctx: CanvasRenderingContext2D, width: number, height: number, worldX: number, worldZ: number): void {
    ctx.save();
    ctx.globalAlpha = 0.72;
    const horizon = height * 0.37;
    ctx.fillStyle = "#718f5b";
    ctx.fillRect(0, horizon, width, height - horizon);

    const tile = Math.max(26, Math.min(width, height) * 0.09);
    const offsetX = ((worldX * 0.72) % tile + tile) % tile;
    const offsetZ = ((worldZ * 0.48) % tile + tile) % tile;
    const palette = ["#739453", "#9d9257", "#6f8753", "#a88359", "#829d62"];
    let row = 0;
    for (let y = horizon - tile - offsetZ; y < height + tile; y += tile, row += 1) {
      let col = 0;
      for (let x = -tile - offsetX; x < width + tile; x += tile, col += 1) {
        const perspective = 0.56 + Math.max(0, (y - horizon) / Math.max(1, height - horizon)) * 0.62;
        ctx.fillStyle = palette[(row * 3 + col * 5) % palette.length];
        ctx.fillRect(x, y, tile * perspective + 1, tile * perspective + 1);
      }
    }

    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = "#4d91aa";
    ctx.lineWidth = Math.max(5, width * 0.012);
    ctx.beginPath();
    ctx.moveTo(width * 0.04, height * 0.94);
    ctx.bezierCurveTo(width * 0.28, height * 0.68, width * 0.27, height * 0.52, width * 0.45, horizon - 8);
    ctx.stroke();

    ctx.globalAlpha = 0.62;
    ctx.fillStyle = "#a9aaa1";
    for (let index = 0; index < 28; index += 1) {
      const x = width * 0.62 + ((index * 37) % 110) - 55;
      const y = horizon + 34 + ((index * 53) % Math.max(60, height - horizon - 48));
      const w = 3 + index % 4;
      const h = 3 + (index * 3) % 9;
      ctx.fillRect(x, y - h, w, h);
    }
    ctx.restore();
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
    enemy: boolean,
  ): void {
    const s = radius / 1.48;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    ctx.strokeStyle = enemy ? "rgba(255,236,190,.22)" : "rgba(223,250,255,.34)";
    ctx.lineWidth = Math.max(1, 0.12 * s);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 1.8 * s, 0.4 * s);
      ctx.lineTo(side * 1.9 * s, (boss ? 5.4 : 4.5) * s);
      ctx.stroke();
    }

    ctx.fillStyle = enemy ? "rgba(255,174,65,.66)" : "rgba(81,222,255,.78)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.28 * s, 1.0 * s);
      ctx.lineTo(side * 0.05 * s, 3.25 * s);
      ctx.lineTo(side * 0.52 * s, 1.0 * s);
      ctx.closePath();
      ctx.fill();
    }

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

  private drawPlayerDamageSmoke(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    heading: number,
    scale: number,
    now: number,
  ): void {
    const age = Math.max(0, (now - this.damageStartMs) / 1000);
    const life = Math.max(0, 1 - age / 1.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    for (let index = 0; index < 8; index += 1) {
      const phase = (age * (0.72 + index * 0.03) + index * 0.13) % 1;
      const sx = Math.sin(index * 2.2 + age * 4) * scale * (0.12 + phase * 0.22);
      const sy = scale * (1.1 + phase * (3.4 + index * 0.08));
      const radius = scale * (0.18 + phase * 0.42);
      ctx.fillStyle = `rgba(${index % 3 === 0 ? "24,20,22" : "48,52,58"},${life * (1 - phase) * 0.42})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (age < 0.75) {
      const flicker = 0.65 + Math.sin(now * 0.04) * 0.2;
      ctx.fillStyle = `rgba(255,92,34,${flicker * life})`;
      ctx.beginPath();
      ctx.moveTo(-0.5 * scale, 1.0 * scale);
      ctx.lineTo(-0.2 * scale, 2.6 * scale);
      ctx.lineTo(0.02 * scale, 1.0 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMissileHitOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    scale: number,
    now: number,
  ): void {
    const age = Math.max(0, (now - this.damageStartMs) / 1000);
    const pulse = Math.max(0, 1 - age / 1.35);
    ctx.save();

    const vignette = ctx.createRadialGradient(centerX, centerY, Math.min(width, height) * 0.12, centerX, centerY, Math.max(width, height) * 0.68);
    vignette.addColorStop(0, "rgba(255,40,25,0)");
    vignette.addColorStop(0.56, `rgba(190,18,24,${pulse * 0.08})`);
    vignette.addColorStop(1, `rgba(112,0,12,${pulse * 0.58})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    if (age < 0.16) {
      ctx.fillStyle = `rgba(255,235,210,${(1 - age / 0.16) * 0.34})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.strokeStyle = `rgba(255,178,74,${pulse * 0.9})`;
    ctx.lineWidth = Math.max(2, scale * 0.16);
    ctx.beginPath();
    ctx.arc(centerX, centerY, scale * (2.1 + age * 5.5), 0, Math.PI * 2);
    ctx.stroke();

    for (let index = 0; index < 10; index += 1) {
      const angle = index / 10 * Math.PI * 2 + now * 0.001;
      const r1 = scale * (1.2 + age * 3.2);
      const r2 = r1 + scale * (1.2 + index % 3 * 0.45);
      ctx.strokeStyle = `rgba(255,222,135,${pulse * 0.78})`;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
      ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
      ctx.stroke();
    }

    if (age < 0.72) {
      ctx.textAlign = "center";
      ctx.font = `900 ${Math.max(18, Math.min(32, width * 0.038))}px system-ui`;
      ctx.fillStyle = `rgba(255,242,222,${Math.max(0, 1 - age / 0.72)})`;
      ctx.strokeStyle = `rgba(112,0,12,${Math.max(0, 1 - age / 0.72)})`;
      ctx.lineWidth = 5;
      ctx.strokeText("MISSILE HIT", width * 0.5, height * 0.34);
      ctx.fillText("MISSILE HIT", width * 0.5, height * 0.34);
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

  private drawCloudLayer(ctx: CanvasRenderingContext2D, width: number, height: number, worldX: number, worldZ: number): void {
    ctx.save();
    ctx.fillStyle = "rgba(248,253,255,.28)";
    const driftX = ((worldX * 1.7) % 110 + 110) % 110;
    const driftY = ((worldZ * 0.42) % 64 + 64) % 64;
    for (let row = 0; row < 3; row += 1) {
      for (let col = -1; col < 8; col += 1) {
        const x = col * 110 - driftX + (row % 2) * 42;
        const y = height * 0.5 + row * 62 - driftY;
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
