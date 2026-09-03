import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import {
  getSkyDancerPlayerLockSnapshotV45,
  getSkyDancerPlayerWeaponState,
  requestSkyDancerPlayerMissile,
} from "./SkyDancerPlayerWeapons";

let activeSession: CartArenaSession | null = null;
const WEAPON_LOOP_PATCH_KEY = "__skyDancerPlayerWeaponLoopInstalled__";
const WEAPON_AUDIT_KEY = "__skyDancerGetActiveWeaponDebug";

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

function activeWeaponDebug() {
  if (!activeSession) return null;
  const lock = getSkyDancerPlayerLockSnapshotV45(activeSession);
  const weapon = getSkyDancerPlayerWeaponState(activeSession);
  const target = lock.targetEnemyId
    ? activeSession.enemies.find((enemy) => enemy.id === lock.targetEnemyId) ?? null
    : null;
  return {
    lock,
    weapon,
    target: target ? { id: target.id, hp: target.hp, maxHp: target.maxHp, alive: target.alive } : null,
  };
}

function installWeaponAuditBridge(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.webdriver) return;
  (window as unknown as Record<string, unknown>)[WEAPON_AUDIT_KEY] = activeWeaponDebug;
}

/** Keep the SHOT control bound to the renderer that is actually on screen. */
export function bindSkyDancerWeaponSession(session: CartArenaSession): void {
  activeSession = session;
  installWeaponAuditBridge();
}

export function unbindSkyDancerWeaponSession(session: CartArenaSession): void {
  if (activeSession !== session) return;
  activeSession = null;
  if (typeof window !== "undefined") {
    delete (window as unknown as Record<string, unknown>)[WEAPON_AUDIT_KEY];
  }
}

export function fireSkyDancerActiveWeapon(): boolean {
  if (!activeSession) return false;
  return requestSkyDancerPlayerMissile(activeSession);
}

export function getSkyDancerActiveWeaponSession(): CartArenaSession | null {
  return activeSession;
}
