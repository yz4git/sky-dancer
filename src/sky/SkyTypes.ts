export type SkyPhase = "ready" | "running" | "gameover";

export interface SkyPlaneState {
  x: number;
  y: number;
  z: number;
  speed: number;
}

export interface SkyEnemyState {
  id: number;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface SkyBulletState {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface SkyPlatformState {
  id: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
}

export interface SkyStats {
  phase: SkyPhase;
  score: number;
  hull: number;
  maxHull: number;
  wave: number;
  enemies: number;
  shots: number;
  hits: number;
  speed: number;
  message: string;
  plane: SkyPlaneState;
  renderer: "webgl" | "canvas";
}

export interface SkySnapshot {
  plane: SkyPlaneState;
  enemies: readonly SkyEnemyState[];
  bullets: readonly SkyBulletState[];
  platforms: readonly SkyPlatformState[];
}
