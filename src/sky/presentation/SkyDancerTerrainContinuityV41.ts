import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

const TILE_SIZE = 360;
const TILE_RADIUS = 2;
const TILE_SEGMENTS = 12;
const GROUND_Y = -66.30;
const GLOBAL_DEBUG_KEY = "__skyDancerGetTerrainContinuityV41";

export interface SkyDancerTerrainContinuitySnapshotV41 {
  centerTileX: number;
  centerTileZ: number;
  visibleTiles: number;
  reliefSpan: number;
  legacyTerrainHidden: boolean;
}

interface TerrainTile {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  positions: THREE.BufferAttribute;
  colors: THREE.BufferAttribute;
  tileX: number;
  tileZ: number;
}

type SkyRaidSurfaceStyle = "city" | "mountains" | "clouds" | "storm" | "citadel";

function skyRaidSurfaceStyle(): SkyRaidSurfaceStyle | null {
  if (typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid") return null;
  const style = document.documentElement.dataset.skyRaidWorldStyle;
  return style === "mountains" || style === "clouds" || style === "storm" || style === "citadel" ? style : "city";
}

function worldHeight(x: number, z: number, style: SkyRaidSurfaceStyle): number {
  const broad = Math.sin(x * 0.0061) * Math.cos(z * 0.0053);
  const ridge = Math.sin((x + z) * 0.0107 + Math.cos(z * 0.0039));
  const secondary = Math.cos((x - z * 0.72) * 0.0141);
  if (style === "mountains") return GROUND_Y - 0.8 + broad * 4.8 + ridge * 3.2 + secondary * 1.4;
  if (style === "clouds") return GROUND_Y - 8.5 + broad * 0.55 + ridge * 0.32 + secondary * 0.18;
  if (style === "storm") return GROUND_Y - 2.2 + broad * 2.1 + ridge * 1.7 + secondary * 0.75;
  if (style === "citadel") {
    const prism = Math.abs(Math.sin(x * 0.018) * Math.cos(z * 0.016));
    return GROUND_Y - 0.4 + broad * 1.2 + ridge * 0.8 + prism * 2.4;
  }
  return GROUND_Y + 0.34 + broad * 1.65 + ridge * 0.92 + secondary * 0.48;
}

function terrainColor(height: number, x: number, z: number, style: SkyRaidSurfaceStyle): THREE.Color {
  const normalized = THREE.MathUtils.clamp((height - (GROUND_Y - 10)) / 18.0, 0, 1);
  const palettes: Record<SkyRaidSurfaceStyle, readonly [number, number]> = {
    city: [0x28485b, 0xf2b77a],
    mountains: [0x6f2f2b, 0xd98245],
    clouds: [0x6fafd0, 0xe8f4f8],
    storm: [0x14364c, 0x778da2],
    citadel: [0x17122f, 0xb69cf4],
  };
  const [lowHex, highHex] = palettes[style];
  const color = new THREE.Color(lowHex).lerp(new THREE.Color(highHex), normalized);
  const variation = 0.91 + (Math.sin(x * 0.021) * Math.cos(z * 0.018) * 0.5 + 0.5) * 0.13;
  return color.multiplyScalar(variation);
}

/**
 * Persistent rolling terrain for the infinite flight world.
 *
 * V36 rebuilt one large mesh on a 420 m snap, so every snap replaced all of
 * the visible vertex heights at once. V41 keeps a 5x5 ring of deterministic
 * world-space tiles. Crossing a tile boundary only recycles the distant outer
 * row; overlapping tiles retain exactly the same world coordinates/heights.
 */
export class SkyDancerTerrainContinuityV41 {
  private readonly root = new THREE.Group();
  private readonly tiles: TerrainTile[] = [];
  private centerTileX = Number.NaN;
  private centerTileZ = Number.NaN;
  private activeSurfaceStyle: SkyRaidSurfaceStyle = "city";
  private latest: SkyDancerTerrainContinuitySnapshotV41 = {
    centerTileX: 0,
    centerTileZ: 0,
    visibleTiles: 0,
    reliefSpan: 0,
    legacyTerrainHidden: false,
  };

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.root.name = "sky-dancer-v41-continuous-terrain-root";
    for (let index = 0; index < (TILE_RADIUS * 2 + 1) ** 2; index += 1) {
      const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, TILE_SEGMENTS, TILE_SEGMENTS);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.getAttribute("position") as THREE.BufferAttribute;
      const colors = new Float32Array(position.count * 3);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
        fog: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `sky-dancer-v41-continuous-terrain-${index}`;
      mesh.frustumCulled = false;
      mesh.renderOrder = -2;
      this.root.add(mesh);
      this.tiles.push({
        mesh,
        positions: position,
        colors: geometry.getAttribute("color") as THREE.BufferAttribute,
        tileX: Number.NaN,
        tileZ: Number.NaN,
      });
    }
    runtime.scene.add(this.root);
    runtime.scene.userData.skyDancerV41TerrainContinuity = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    const legacyTerrain = this.runtime.scene.getObjectByName("sky-dancer-v36-faceted-terrain");
    if (legacyTerrain) {
      legacyTerrain.visible = false;
      legacyTerrain.userData.skyDancerV41Superseded = true;
    }
    this.root.visible = true;
    const nextStyle = skyRaidSurfaceStyle() ?? "city";
    const styleChanged = nextStyle !== this.activeSurfaceStyle;
    this.activeSurfaceStyle = nextStyle;
    this.root.userData.skyRaidSurfaceStyle = nextStyle;
    const nextTileX = Math.floor((snapshot.x + TILE_SIZE * 0.5) / TILE_SIZE);
    const nextTileZ = Math.floor((snapshot.z + TILE_SIZE * 0.5) / TILE_SIZE);
    if (styleChanged || nextTileX !== this.centerTileX || nextTileZ !== this.centerTileZ) {
      this.centerTileX = nextTileX;
      this.centerTileZ = nextTileZ;
      this.rebuildRing();
    }
    this.latest.legacyTerrainHidden = legacyTerrain ? !legacyTerrain.visible : true;
    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>)[GLOBAL_DEBUG_KEY] = () => ({ ...this.latest });
    }
  }

  private rebuildRing(): void {
    let tileIndex = 0;
    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = Number.NEGATIVE_INFINITY;
    for (let dz = -TILE_RADIUS; dz <= TILE_RADIUS; dz += 1) {
      for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx += 1) {
        const tile = this.tiles[tileIndex++];
        const tileX = this.centerTileX + dx;
        const tileZ = this.centerTileZ + dz;
        tile.tileX = tileX;
        tile.tileZ = tileZ;
        tile.mesh.position.set(tileX * TILE_SIZE, 0, tileZ * TILE_SIZE);
        const position = tile.positions;
        for (let index = 0; index < position.count; index += 1) {
          const localX = position.getX(index);
          const localZ = position.getZ(index);
          const worldX = tileX * TILE_SIZE + localX;
          const worldZ = tileZ * TILE_SIZE + localZ;
          const height = worldHeight(worldX, worldZ, this.activeSurfaceStyle);
          position.setY(index, height);
          const color = terrainColor(height, worldX, worldZ, this.activeSurfaceStyle);
          tile.colors.setXYZ(index, color.r, color.g, color.b);
          minHeight = Math.min(minHeight, height);
          maxHeight = Math.max(maxHeight, height);
        }
        position.needsUpdate = true;
        tile.colors.needsUpdate = true;
        tile.mesh.geometry.computeVertexNormals();
        tile.mesh.geometry.computeBoundingSphere();
        tile.mesh.visible = true;
      }
    }
    this.latest = {
      centerTileX: this.centerTileX,
      centerTileZ: this.centerTileZ,
      visibleTiles: this.tiles.filter((tile) => tile.mesh.visible).length,
      reliefSpan: maxHeight - minHeight,
      legacyTerrainHidden: true,
    };
  }
}
