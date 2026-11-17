/** Pixel Flight: deterministic, browser-independent 2.5D terrain and arcade flight rules.
 * Terrain and code are original. Inspiration: s-macke/VoxelSpace (MIT), sprite stacking.
 */
export const PIXEL_WORLD_SIZE = 256;
export const PIXEL_RUN_SECONDS = 120;
export type PixelCamera = "chase" | "map" | "cockpit";
export interface PixelWorld {
  size: number;
  heights: Uint8Array;
  colors: Uint32Array;
}
export interface PixelGate { id: number; x: number; y: number; z: number; active: boolean; }
export interface PixelFlightInput { x: number; y: number; boost: boolean; }
export interface PixelFlightState {
  x: number; y: number; z: number; heading: number; bank: number;
  speed: number; charge: number; shield: number; score: number; gatesPassed: number;
  elapsed: number; invulnerable: number; finished: boolean;
  rng: number; nextGateId: number; gates: PixelGate[];
}
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap = (v: number, size: number) => ((v % size) + size) % size;
function hash(x: number, y: number, seed: number) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 144269)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number, cells: number, seed: number) {
  const u = x * cells / PIXEL_WORLD_SIZE, v = y * cells / PIXEL_WORLD_SIZE;
  const ix = Math.floor(u), iy = Math.floor(v);
  const fx = u - ix, fy = v - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash(((a % cells) + cells) % cells, ((b % cells) + cells) % cells, seed);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bottom = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}
/** Native little-endian RGBA pixels for Uint32Array over ImageData. */
export function rgba(r: number, g: number, b: number): number {
  return (0xff000000 | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
}
export function mixPixel(color: number, fog: number, amount: number): number {
  const t = clamp(amount, 0, 1);
  return rgba(
    (color & 255) * (1 - t) + (fog & 255) * t,
    ((color >>> 8) & 255) * (1 - t) + ((fog >>> 8) & 255) * t,
    ((color >>> 16) & 255) * (1 - t) + ((fog >>> 16) & 255) * t,
  );
}
export function createPixelWorld(seed = 11): PixelWorld {
  const size = PIXEL_WORLD_SIZE, heights = new Uint8Array(size * size);
  const colors = new Uint32Array(size * size);
  const seed32 = seed | 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const broad = noise(x, y, 5, seed32);
    const mid = noise(x, y, 11, seed32 + 11);
    const fine = noise(x, y, 31, seed32 + 47);
    const tiny = noise(x, y, 63, seed32 + 83);
    const shaped = broad * .49 + mid * .31 + fine * .15 + tiny * .05;
    const land = Math.max(0, shaped - .485);
    const h = Math.round(11 + Math.pow(land * 6.8, 1.65) * 53);
    const i = y * size + x;
    heights[i] = clamp(h, 11, 88);
    const sunSlope = Math.max(-1, Math.min(1, (noise(x + 1, y, 11, seed32 + 11) - noise(x - 1, y, 11, seed32 + 11)) * 8));
    const light = Math.round(sunSlope * 17 + (tiny - .5) * 14);
    if (h <= 11) colors[i] = rgba(15, 82 + light, 142 + light);
    else if (h <= 14) colors[i] = rgba(39 + light, 144 + light, 180 + light);
    else if (h < 19) colors[i] = rgba(221 + light, 192 + light, 124 + light);
    else if (h < 37) colors[i] = rgba(62 + light, 147 + light, 91 + light);
    else if (h < 54) colors[i] = rgba(51 + light, 106 + light, 83 + light);
    else if (h < 70) colors[i] = rgba(116 + light, 127 + light, 127 + light);
    else colors[i] = rgba(219 + light, 230 + light, 226 + light);
  }
  return { size, heights, colors };
}
export function terrainIndex(world: PixelWorld, x: number, y: number): number {
  return (Math.floor(wrap(y, world.size)) * world.size) + Math.floor(wrap(x, world.size));
}
export function samplePixelTerrain(world: PixelWorld, x: number, y: number): number {
  return world.heights[terrainIndex(world, x, y)];
}
/** Signed shortest distance across the wrapped island map. */
export function pixelWorldDelta(from: number, to: number, size = PIXEL_WORLD_SIZE): number {
  const d = wrap(to - from, size);
  return d > size / 2 ? d - size : d;
}
function random(state: PixelFlightState) {
  let v = state.rng | 0;
  v ^= v << 13; v ^= v >>> 17; v ^= v << 5;
  state.rng = v || 0x1a2b3c4d;
  return (state.rng >>> 0) / 4294967296;
}
function placeGate(world: PixelWorld, state: PixelFlightState, first = false): PixelGate {
  const along = first ? 35 + state.gates.length * 24 : 80 + random(state) * 38;
  const across = first ? (state.gates.length % 2 === 0 ? -9 : 13) : (random(state) - .5) * 48;
  const forwardX = Math.sin(state.heading), forwardY = Math.cos(state.heading);
  const x = wrap(state.x + forwardX * along + forwardY * across, world.size);
  const y = wrap(state.y + forwardY * along - forwardX * across, world.size);
  const z = Math.max(25, samplePixelTerrain(world, x, y) + 17 + random(state) * 6);
  return { id: state.nextGateId++, x, y, z, active: true };
}
export function createPixelFlightRun(world: PixelWorld, seed = 121): PixelFlightState {
  const x = 128, y = 128;
  const state: PixelFlightState = {
    x, y, z: Math.max(38, samplePixelTerrain(world, x, y) + 22),
    heading: 0, bank: 0, speed: 24, charge: 1, shield: 3, score: 0,
    gatesPassed: 0, elapsed: 0, invulnerable: 0, finished: false,
    rng: (seed | 0) || 0x1a2b3c4d, nextGateId: 1, gates: [],
  };
  for (let i = 0; i < 4; i++) state.gates.push(placeGate(world, state, true));
  return state;
}
export function stepPixelFlight(world: PixelWorld, state: PixelFlightState, input: PixelFlightInput, seconds: number): PixelFlightState {
  if (state.finished) return state;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .05);
  const turn = clamp(input.x || 0, -1, 1), climb = clamp(input.y || 0, -1, 1);
  const boosting = Boolean(input.boost && state.charge > .015);
  state.heading = (state.heading + turn * dt * (boosting ? 1.25 : 1.52) + TAU) % TAU;
  state.bank += (turn - state.bank) * Math.min(1, dt * 6);
  state.speed += ((boosting ? 43 : 25) - state.speed) * Math.min(1, dt * 3);
  state.z = clamp(state.z + climb * dt * (boosting ? 25 : 18), 14, 112);
  state.x = wrap(state.x + Math.sin(state.heading) * dt * state.speed, world.size);
  state.y = wrap(state.y + Math.cos(state.heading) * dt * state.speed, world.size);
  state.charge = clamp(state.charge + (boosting ? -.34 : .12) * dt, 0, 1);
  state.elapsed += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  const floor = samplePixelTerrain(world, state.x, state.y) + 5;
  if (state.z < floor) {
    state.z = floor + 3;
    if (state.invulnerable <= 0) {
      state.shield -= 1;
      state.invulnerable = 2;
    }
  } else if (state.z - floor < 10) state.score += dt * 2.5;
  for (let i = 0; i < state.gates.length; i++) {
    const gate = state.gates[i];
    const dx = pixelWorldDelta(state.x, gate.x, world.size);
    const dy = pixelWorldDelta(state.y, gate.y, world.size);
    if (Math.hypot(dx, dy) < 6.5 && Math.abs(state.z - gate.z) < 10) {
      state.score += boosting ? 220 : 140;
      state.gatesPassed += 1;
      state.charge = clamp(state.charge + .22, 0, 1);
      state.gates[i] = placeGate(world, state);
    }
  }
  if (state.shield <= 0 || state.elapsed >= PIXEL_RUN_SECONDS) {
    state.elapsed = Math.min(state.elapsed, PIXEL_RUN_SECONDS);
    state.finished = true;
  }
  return state;
}
