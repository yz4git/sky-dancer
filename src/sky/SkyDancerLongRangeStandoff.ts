import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { installSkyDancerFlightAvoidance } from "./SkyDancerFlightAvoidance";

interface StandoffSession {
  enemies: CartEnemyState[];
  location: {
    node: {
      id: string;
      rect: { centerX: number; centerZ: number; halfWidth: number; halfDepth: number };
    };
  };
  car: { position: { x: number; z: number } };
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCHED_KEY = "__skyDancerLongRangeStandoffInstalled__";
export const SKY_DANCER_COMBAT_STANDOFF = 23;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function installSkyDancerLongRangeStandoff(): void {
  installSkyDancerFlightAvoidance();
  const prototype = CartArenaSession.prototype as unknown as StandoffSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerLongRangeStandoffStep(input: RallyInputState, fixedDelta?: number): void {
    previous.call(this, input, fixedDelta);
    const delta = Math.max(0.001, Math.min(0.05, fixedDelta ?? 1 / 60));
    const px = this.car.position.x;
    const pz = this.car.position.z;
    const node = this.location.node;

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.nodeId !== node.id) continue;
      const dx = enemy.x - px;
      const dz = enemy.z - pz;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.001) continue;
      const preferred = enemy.kind === "boss" ? 27 : enemy.kind === "heavy" ? 25 : SKY_DANCER_COMBAT_STANDOFF;
      if (distance >= preferred) continue;

      // Strong enough to beat the inherited intercept speed, but applied as a
      // continuous velocity-like correction so fighters visibly open distance
      // instead of teleporting or bouncing on contact.
      const deficit = preferred - distance;
      const outwardSpeed = Math.min(16, 3 + deficit * 1.15);
      enemy.x += dx / distance * outwardSpeed * delta;
      enemy.z += dz / distance * outwardSpeed * delta;

      const margin = 1.2;
      enemy.x = clamp(enemy.x, node.rect.centerX - node.rect.halfWidth + margin, node.rect.centerX + node.rect.halfWidth - margin);
      enemy.z = clamp(enemy.z, node.rect.centerZ - node.rect.halfDepth + margin, node.rect.centerZ + node.rect.halfDepth - margin);
    }
  };
}

installSkyDancerLongRangeStandoff();
