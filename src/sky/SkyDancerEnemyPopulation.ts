import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import type { RallyInputState } from "../rally/RallyTypes";

interface PopulationSession {
  enemies: CartEnemyState[];
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface PopulationState {
  initialized: boolean;
  seenIds: Set<string>;
}

const PATCHED_KEY = "__skyDancerEnemyPopulationInstalled__";
const stateBySession = new WeakMap<object, PopulationState>();

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stateFor(session: PopulationSession): PopulationState {
  const key = session as unknown as object;
  const current = stateBySession.get(key);
  if (current) return current;
  const created: PopulationState = { initialized: false, seenIds: new Set<string>() };
  stateBySession.set(key, created);
  return created;
}

function reduceInitialPopulation(session: PopulationSession, state: PopulationState): void {
  const byNode = new Map<string, CartEnemyState[]>();
  for (const enemy of session.enemies) {
    const list = byNode.get(enemy.nodeId) ?? [];
    list.push(enemy);
    byNode.set(enemy.nodeId, list);
  }

  const keep = new Set<string>();
  for (const enemies of byNode.values()) {
    for (const enemy of enemies) state.seenIds.add(enemy.id);
    const bosses = enemies.filter((enemy) => enemy.kind === "boss");
    bosses.forEach((enemy) => keep.add(enemy.id));
    const regular = enemies.filter((enemy) => enemy.kind !== "boss");
    const target = Math.max(1, Math.ceil(regular.length * 0.5));
    const ranked = [...regular].sort((a, b) => {
      const aPriority = a.kind === "heavy" ? -2 : a.archetype === "bomber" ? -1 : 0;
      const bPriority = b.kind === "heavy" ? -2 : b.archetype === "bomber" ? -1 : 0;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return stableHash(a.id) - stableHash(b.id);
    });
    for (let index = 0; index < target; index += 1) keep.add(ranked[index].id);
  }

  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {
    if (!keep.has(session.enemies[index].id)) session.enemies.splice(index, 1);
  }
  state.initialized = true;
}

function reduceNewSpawns(session: PopulationSession, state: PopulationState): void {
  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = session.enemies[index];
    if (state.seenIds.has(enemy.id)) continue;
    state.seenIds.add(enemy.id);
    if (enemy.kind === "boss") continue;
    if ((stableHash(enemy.id) & 1) !== 0) session.enemies.splice(index, 1);
  }
}

export function installSkyDancerEnemyPopulation(): void {
  const prototype = CartArenaSession.prototype as unknown as PopulationSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerEnemyPopulationStep(input: RallyInputState, fixedDelta?: number): void {
    const session = this as unknown as PopulationSession;
    const state = stateFor(session);
    if (!state.initialized) reduceInitialPopulation(session, state);
    else reduceNewSpawns(session, state);
    previous.call(this, input, fixedDelta);
  };
}

installSkyDancerEnemyPopulation();
