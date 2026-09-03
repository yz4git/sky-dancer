import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import {
  getSkyDancerPlayerWeaponState,
  requestSkyDancerPlayerMissile,
} from "./SkyDancerPlayerWeapons";

let activeSession: CartArenaSession | null = null;
const WEAPON_LOOP_PATCH_KEY = "__skyDancerPlayerWeaponLoopInstalled__";

/**
 * Keep player missiles advancing even when a presentation pass is skipped.
 * The weapon model's getter advances from a shared wall-clock cursor, so using
 * that same path from session.step() cannot double-step when render code also
 * reads the state later in the frame.
 */
function installSkyDancerPlayerWeaponLoop(): void {
  const prototype = CartArenaSession.prototype as unknown as Record<string, unknown> & {
    step(input: RallyInputState, fixedDelta?: number): void;
  };
  if (prototype[WEAPON_LOOP_PATCH_KEY]) return;
  prototype[WEAPON_LOOP_PATCH_KEY] = true;
  const baseStep = prototype.step;
  prototype.step = function skyDancerPlayerWeaponLoop(
    this: CartArenaSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    baseStep.call(this, input, fixedDelta);
    getSkyDancerPlayerWeaponState(this);
  };
}

installSkyDancerPlayerWeaponLoop();

/** Keep the SHOT control bound to the renderer that is actually on screen. */
export function bindSkyDancerWeaponSession(session: CartArenaSession): void {
  activeSession = session;
}

export function unbindSkyDancerWeaponSession(session: CartArenaSession): void {
  if (activeSession === session) activeSession = null;
}

export function fireSkyDancerActiveWeapon(): boolean {
  if (!activeSession) return false;
  return requestSkyDancerPlayerMissile(activeSession);
}

export function getSkyDancerActiveWeaponSession(): CartArenaSession | null {
  return activeSession;
}
