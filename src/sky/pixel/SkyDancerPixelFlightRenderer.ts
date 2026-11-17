import {
  type PixelFlightState, type PixelWorld, type PixelCamera,
  mixPixel, pixelWorldDelta, rgba, samplePixelTerrain, terrainIndex,
} from "./SkyDancerPixelFlightCore";

/** Software VoxelSpace column marcher + procedural sprite-stacked aircraft.
 * Everything is original artwork, with no downloaded or copyrighted game textures.
 * The scene is painted into an ImageData framebuffer and stretched with nearest-neighbor.
 */
export class SkyDancerPixelFlightRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 384;
  private height = 192;
  private image: ImageData;
  private pixels: Uint32Array;
  private yBuffer: Int16Array;
  private readonly planeLayers: HTMLCanvasElement[];
  private readonly sky = rgba(126, 196, 233);
  private readonly fog = rgba(162, 211, 227);
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D unavailable");
    this.ctx = context;
    this.image = context.createImageData(this.width, this.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.yBuffer = new Int16Array(this.width);
    this.planeLayers = this.buildJet();
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.max(.9, Math.min(2.35, rect.width / Math.max(1, rect.height)));
    const nextWidth = Math.max(300, Math.min(448, Math.round(192 * ratio)));
    if (this.width === nextWidth && this.canvas.height === this.height) return;
    this.width = nextWidth;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
    this.image = this.ctx.createImageData(this.width, this.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.yBuffer = new Int16Array(this.width);
  }
  private buildJet(): HTMLCanvasElement[] {
    const layers: HTMLCanvasElement[] = [];
    for (let i = 0; i < 16; i++) {
      const layer = document.createElement("canvas");
      layer.width = 44;
      layer.height = 44;
      const c = layer.getContext("2d");
      if (!c) continue;
      const wing = i >= 3 && i <= 10 ? 17 - Math.abs(i - 7) * 1.3 : 5.4;
      const half = i < 5 ? 4.5 : i < 13 ? 6.2 - Math.abs(i - 8) * .4 : 2.2;
      const nose = i < 5 ? 11 : i < 11 ? 16 : 8;
      const tail = i < 5 ? 12 : 10;
      c.fillStyle = "#071723";
      c.beginPath();
      c.moveTo(22, 22 - nose - 1);
      c.lineTo(22 + half + 1, 15);
      c.lineTo(22 + wing + 1, 23);
      c.lineTo(22 + wing, 27);
      c.lineTo(22 + 4, 26);
      c.lineTo(22 + 9, 22 + tail);
      c.lineTo(22, 30);
      c.lineTo(22 - 9, 22 + tail);
      c.lineTo(22 - 4, 26);
      c.lineTo(22 - wing, 27);
      c.lineTo(22 - wing - 1, 23);
      c.lineTo(22 - half - 1, 15);
      c.closePath();
      c.fill();
      c.fillStyle = i < 6 ? "#43657a" : i < 12 ? "#8cafbf" : "#c6d9dc";
      c.beginPath();
      c.moveTo(22, 22 - nose);
      c.lineTo(22 + half, 16);
      c.lineTo(22 + wing, 23);
      c.lineTo(22 + wing - 1, 25);
      c.lineTo(25, 24);
      c.lineTo(29, 32);
      c.lineTo(22, 29);
      c.lineTo(15, 32);
      c.lineTo(19, 24);
      c.lineTo(23 - wing, 25);
      c.lineTo(22 - wing, 23);
      c.lineTo(22 - half, 16);
      c.closePath();
      c.fill();
      if (i >= 9 && i <= 13) {
        c.fillStyle = "#17364a";
        c.fillRect(20, 14, 4, 11);
        c.fillStyle = "#65e5f9";
        c.fillRect(21, 15, 2, 7);
      }
      if (i >= 3 && i <= 8) {
        c.fillStyle = "#ffca70";
        c.fillRect(22 - wing + 1, 24, 3, 2);
        c.fillRect(22 + wing - 4, 24, 3, 2);
      }
      layers.push(layer);
    }
    return layers;
  }
  private skyFill(time: number) {
    const w = this.width, h = this.height;
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const color = rgba(58 + t * 99, 134 + t * 93, 192 + t * 49);
      this.pixels.fill(color, y * w, (y + 1) * w);
    }
    // Distant cloud ribbons, rendered directly to the tiny framebuffer.
    for (let cloud = 0; cloud < 21; cloud++) {
      const x = (((cloud * 83 + 41 - time * (cloud % 3 + 1) * 1.5) % (w + 130)) + w + 130) % (w + 130) - 65;
      const y = 19 + ((cloud * 29) % 64);
      const radius = 8 + cloud % 11;
      const shade = rgba(182 + cloud % 6 * 7, 224 + cloud % 4 * 5, 246);
      for (let yy = Math.max(0, y - 2); yy <= Math.min(h - 1, y + 2); yy++) {
        const edge = Math.abs(yy - y) * 3;
        for (let xx = Math.max(0, Math.floor(x - radius + edge)); xx < Math.min(w, x + radius - edge); xx++) {
          this.pixels[yy * w + xx] = shade;
        }
      }
    }
  }
  private drawTerrain(world: PixelWorld, state: PixelFlightState) {
    const w = this.width, h = this.height;
    const fX = Math.sin(state.heading), fY = Math.cos(state.heading);
    const rX = Math.cos(state.heading), rY = -Math.sin(state.heading);
    const camX = state.x - fX * 7, camY = state.y - fY * 7;
    const camZ = state.z + 4;
    const horizon = Math.round(h * .42);
    const lens = h * .95;
    this.yBuffer.fill(h);
    for (let d = 3; d < 235; d += 0.85 + d * .021) {
      const perspective = d / lens;
      const worldLeftX = camX + fX * d - rX * (w * .5) * perspective;
      const worldLeftY = camY + fY * d - rY * (w * .5) * perspective;
      const stepX = rX * perspective, stepY = rY * perspective;
      const fade = Math.max(0, (d - 132) / 105);
      for (let x = 0; x < w; x++) {
        const idx = terrainIndex(world, worldLeftX + x * stepX, worldLeftY + x * stepY);
        const ground = world.heights[idx];
        const screenTop = Math.max(0, Math.min(h, Math.floor(horizon + (camZ - ground) * lens / d)));
        const bottom = this.yBuffer[x];
        if (screenTop >= bottom) continue;
        const col = fade > .015 ? mixPixel(world.colors[idx], this.fog, fade) : world.colors[idx];
        for (let y = screenTop; y < bottom; y++) this.pixels[y * w + x] = col;
        this.yBuffer[x] = screenTop;
      }
    }
  }
  private drawMap(world: PixelWorld, state: PixelFlightState) {
    const w = this.width, h = this.height, scale = .42;
    const forwardX = Math.sin(state.heading), forwardY = Math.cos(state.heading);
    const rightX = Math.cos(state.heading), rightY = -Math.sin(state.heading);
    for (let y = 0; y < h; y++) {
      const ahead = (h * .52 - y) * scale;
      for (let x = 0; x < w; x++) {
        const across = (x - w * .5) * scale;
        const idx = terrainIndex(world, state.x + forwardX * ahead + rightX * across, state.y + forwardY * ahead + rightY * across);
        const shade = world.colors[idx];
        this.pixels[y * w + x] = shade;
      }
    }
  }
  private drawGates(world: PixelWorld, state: PixelFlightState, camera: PixelCamera) {
    const w = this.width, h = this.height;
    const c = this.ctx, fX = Math.sin(state.heading), fY = Math.cos(state.heading);
    const rX = Math.cos(state.heading), rY = -Math.sin(state.heading);
    const camX = camera === "map" ? state.x : state.x - fX * 7;
    const camY = camera === "map" ? state.y : state.y - fY * 7;
    const lens = h * .95;
    let closest = Number.POSITIVE_INFINITY;
    let guidance: { x: number; y: number } | null = null;
    for (const gate of state.gates) {
      const dx = pixelWorldDelta(camX, gate.x, world.size);
      const dy = pixelWorldDelta(camY, gate.y, world.size);
      const ahead = fX * dx + fY * dy;
      const across = rX * dx + rY * dy;
      if (ahead < -8) continue;
      let x: number, y: number, radius: number;
      if (camera === "map") {
        x = w / 2 + across / .42;
        y = h * .52 - ahead / .42;
        radius = 7;
      } else {
        if (ahead < 4) continue;
        x = w / 2 + across * lens / ahead;
        y = h * .42 + ((state.z + 4) - gate.z) * lens / ahead;
        radius = Math.max(3, Math.min(24, 350 / ahead));
      }
      if (ahead < closest) { closest = ahead; guidance = { x, y }; }
      if (x < -radius || x > w + radius || y < -radius || y > h + radius) continue;
      c.lineWidth = radius > 7 ? 3 : 2;
      c.strokeStyle = "#143b53";
      c.beginPath(); c.arc(x, y, radius + 2, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "#ffd47a";
      c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 1.65); c.stroke();
      c.strokeStyle = "#f9ffff";
      c.beginPath(); c.arc(x, y, radius, Math.PI * 1.65, Math.PI * 2); c.stroke();
      c.fillStyle = "#fff2b4";
      c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    if (guidance && (guidance.x < 14 || guidance.x > w - 14 || guidance.y < 14 || guidance.y > h - 14)) {
      const x = Math.max(17, Math.min(w - 17, guidance.x));
      const y = Math.max(17, Math.min(h - 17, guidance.y));
      c.strokeStyle = "#ffe4a5"; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.stroke();
    }
  }
  private drawAircraft(state: PixelFlightState, camera: PixelCamera, time: number) {
    const c = this.ctx, w = this.width, h = this.height;
    if (camera === "cockpit") {
      c.strokeStyle = "#0d273c"; c.lineWidth = 8;
      c.beginPath(); c.moveTo(0, h); c.lineTo(w * .22, h * .79); c.lineTo(w * .36, h); c.stroke();
      c.beginPath(); c.moveTo(w, h); c.lineTo(w * .78, h * .79); c.lineTo(w * .64, h); c.stroke();
      c.strokeStyle = "#85e4e1"; c.lineWidth = 1;
      c.strokeRect(w / 2 - 9, h / 2 - 9, 18, 18);
      c.beginPath(); c.moveTo(w / 2 - 15, h / 2); c.lineTo(w / 2 + 15, h / 2); c.moveTo(w / 2, h / 2 - 15); c.lineTo(w / 2, h / 2 + 15); c.stroke();
      return;
    }
    const x = w * .5, y = camera === "map" ? h * .52 : h * .78;
    const scale = camera === "map" ? 1.05 : 1.28;
    c.save();
    c.translate(Math.round(x), Math.round(y + Math.sin(time * 8) * 1.1));
    c.rotate(camera === "map" ? 0 : -state.bank * .23);
    c.scale(scale, camera === "map" ? scale * .8 : scale * .57);
    if (state.invulnerable > 0 && Math.floor(time * 9) % 2 === 0) c.globalAlpha = .55;
    c.fillStyle = "rgba(0, 15, 28, 0.35)";
    c.beginPath(); c.ellipse(0, 9, 21, 8, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < this.planeLayers.length; i++) {
      c.drawImage(this.planeLayers[i], -22, -22 - i * (camera === "map" ? .6 : 1.2));
    }
    c.fillStyle = state.speed > 32 ? "#ffffaf" : "#ffbe6a";
    c.fillRect(-6, 29, 4, state.speed > 32 ? 13 : 6);
    c.fillRect(2, 29, 4, state.speed > 32 ? 13 : 6);
    c.restore();
  }
  draw(world: PixelWorld, state: PixelFlightState, camera: PixelCamera, time: number) {
    this.resize();
    if (camera === "map") this.drawMap(world, state);
    else {
      this.skyFill(time);
      this.drawTerrain(world, state);
    }
    this.ctx.putImageData(this.image, 0, 0);
    this.drawGates(world, state, camera);
    this.drawAircraft(state, camera, time);
    // Always-visible aircraft clearance bar: easy to read near-ground risk.
    const clearance = state.z - samplePixelTerrain(world, state.x, state.y);
    this.ctx.fillStyle = "#061622";
    this.ctx.fillRect(this.width * .5 - 24, this.height - 9, 48, 5);
    this.ctx.fillStyle = clearance < 12 ? "#ff836d" : "#70edc3";
    this.ctx.fillRect(this.width * .5 - 23, this.height - 8, Math.min(46, clearance * .8), 3);
  }
}
