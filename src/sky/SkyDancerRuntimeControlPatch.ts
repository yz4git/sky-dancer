import { CartArenaSession } from "../cart/CartArenaSession";
import { CartRogueCanvasPreview } from "../cart/CartRogueCanvasPreview";
import { CartRogueWebGLDemo } from "../cart/CartRogueWebGLDemo";

interface RuntimeControlView {
  session: CartArenaSession;
  setBoost(active: boolean): void;
  updateVisuals?(delta: number): void;
  draw?(): void;
}

interface BoostHoldState {
  held: boolean;
  speedFloor: number;
  lastClockMs: number;
}

const WEBGL_PATCHED = "__skyDancerRuntimeBoostWebGLPatched__";
const CANVAS_PATCHED = "__skyDancerRuntimeBoostCanvasPatched__";
const stateByRuntime = new WeakMap<object, BoostHoldState>();

export const SKY_DANCER_RUNTIME_TURBO_MIN_SPEED = 15.8;
export const SKY_DANCER_RUNTIME_TURBO_ACCEL = 6.4;
export const SKY_DANCER_RUNTIME_TURBO_SPEED_CAP = 25.5;

function stateFor(runtime: RuntimeControlView): BoostHoldState {
  const key = runtime as unknown as object;
  const current = stateByRuntime.get(key);
  if (current) return current;
  const created: BoostHoldState = {
    held: false,
    speedFloor: 0,
    lastClockMs: typeof performance !== "undefined" ? performance.now() : Date.now(),
  };
  stateByRuntime.set(key, created);
  return created;
}

function beginOrEndBoost(runtime: RuntimeControlView, active: boolean): void {
  const state = stateFor(runtime);
  state.held = active;
  state.lastClockMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!active) {
    state.speedFloor = 0;
    return;
  }
  const forward = Math.abs(runtime.session.car.forwardVelocity);
  state.speedFloor = Math.max(SKY_DANCER_RUNTIME_TURBO_MIN_SPEED, forward);
}

function enforceTurboMotion(runtime: RuntimeControlView, suppliedDelta?: number): void {
  const state = stateFor(runtime);
  if (!state.held) return;

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const wallDelta = Math.max(0.001, Math.min(0.05, (now - state.lastClockMs) / 1000));
  state.lastClockMs = now;
  const delta = Math.max(0.001, Math.min(0.05, suppliedDelta ?? wallDelta));
  const car = runtime.session.car;
  const currentMagnitude = Math.abs(car.forwardVelocity);

  state.speedFloor = Math.min(
    SKY_DANCER_RUNTIME_TURBO_SPEED_CAP,
    Math.max(state.speedFloor, currentMagnitude, SKY_DANCER_RUNTIME_TURBO_MIN_SPEED)
      + SKY_DANCER_RUNTIME_TURBO_ACCEL * delta,
  );

  if (currentMagnitude >= state.speedFloor - 0.01) return;
  const sign = car.forwardVelocity < -0.2 ? -1 : 1;
  car.forwardVelocity = sign * state.speedFloor;

  // Rebuild world velocity after every inherited Cart step. This is the final
  // runtime authority, so no drift/boost prototype earlier in the chain can
  // accidentally leave the aircraft stationary while Turbo is held.
  const forwardX = Math.sin(car.heading);
  const forwardZ = Math.cos(car.heading);
  const rightX = Math.cos(car.heading);
  const rightZ = -Math.sin(car.heading);
  car.velocity.x = forwardX * car.forwardVelocity + rightX * car.lateralVelocity;
  car.velocity.z = forwardZ * car.forwardVelocity + rightZ * car.lateralVelocity;
  car.speed = Math.hypot(car.velocity.x, car.velocity.z);
}

function patchWebGL(): void {
  const prototype = CartRogueWebGLDemo.prototype as unknown as RuntimeControlView & Record<string, unknown>;
  if (prototype[WEBGL_PATCHED]) return;
  prototype[WEBGL_PATCHED] = true;

  const previousSetBoost = prototype.setBoost;
  prototype.setBoost = function skyDancerRuntimeSetBoost(active: boolean): void {
    beginOrEndBoost(this, active);
    previousSetBoost.call(this, active);
  };

  const previousUpdate = prototype.updateVisuals;
  if (typeof previousUpdate === "function") {
    prototype.updateVisuals = function skyDancerRuntimeUpdateVisuals(delta: number): void {
      enforceTurboMotion(this, delta);
      previousUpdate.call(this, delta);
    };
  }
}

function patchCanvas(): void {
  const prototype = CartRogueCanvasPreview.prototype as unknown as RuntimeControlView & Record<string, unknown>;
  if (prototype[CANVAS_PATCHED]) return;
  prototype[CANVAS_PATCHED] = true;

  const previousSetBoost = prototype.setBoost;
  prototype.setBoost = function skyDancerRuntimeCanvasSetBoost(active: boolean): void {
    beginOrEndBoost(this, active);
    previousSetBoost.call(this, active);
  };

  const previousDraw = prototype.draw;
  if (typeof previousDraw === "function") {
    prototype.draw = function skyDancerRuntimeCanvasDraw(): void {
      enforceTurboMotion(this);
      previousDraw.call(this);
    };
  }
}

export function installSkyDancerRuntimeControlPatch(): void {
  patchWebGL();
  patchCanvas();
}

installSkyDancerRuntimeControlPatch();
