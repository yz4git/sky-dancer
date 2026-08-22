import type { SkyStats } from "./SkyTypes";

export interface SkyDemoHandle {
  start(): void;
  reset(): void;
  pause(): void;
  resume(): void;
  setMove(x: number, y: number): void;
  setFire(active: boolean): void;
  getStats(): SkyStats;
  dispose(): void;
}
