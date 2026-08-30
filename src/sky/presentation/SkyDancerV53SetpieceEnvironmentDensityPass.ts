import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerCampaignSnapshotV49 } from "../SkyDancerCombatChoreographyV46";
import type { SkyDancerMissionWorldStyleV49 } from "../SkyDancerCampaignV49";

interface RouteSetpiece {
  root: THREE.Group;
  rotating: THREE.Object3D[];
  count: number;
}

const REANCHOR_DISTANCE = 164;
const STYLES: readonly SkyDancerMissionWorldStyleV49[] = ["city", "clouds", "mountains", "facility", "storm", "citadel"];

function solid(color: number, roughness = 0.72, metalness = 0.08): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function emissive(color: number, opacity = 0.52): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
}

export class SkyDancerV53SetpieceEnvironmentDensityPass {
  private readonly root = new THREE.Group();
  private readonly routes = new Map<SkyDancerMissionWorldStyleV49, RouteSetpiece>();
  private activeStyle: SkyDancerMissionWorldStyleV49 = "city";
  private anchorX = Number.NaN;
  private anchorZ = Number.NaN;
  private anchorResets = 0;
  private elapsed = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.root.name = "sky-dancer-v53-setpiece-density";
    this.root.renderOrder = -1;
    runtime.scene.add(this.root);
    for (const style of STYLES) {
      const route = this.buildRoute(style);
      route.root.visible = style === this.activeStyle;
      this.root.add(route.root);
      this.routes.set(style, route);
    }
    runtime.scene.userData.skyDancerV53SetpieceEnvironmentDensity = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.elapsed += 1 / 60;
    const style = getLatestSkyDancerCampaignSnapshotV49()?.worldStyle ?? "city";
    if (style !== this.activeStyle) {
      this.activeStyle = style;
      for (const [candidate, route] of this.routes) route.root.visible = candidate === style;
      this.resetAnchor(snapshot);
    }
    if (!Number.isFinite(this.anchorX) || Math.hypot(snapshot.x - this.anchorX, snapshot.z - this.anchorZ) > REANCHOR_DISTANCE) {
      this.resetAnchor(snapshot);
    }

    const route = this.routes.get(style);
    if (route) {
      const spin = style === "storm" ? 0.014 : style === "facility" ? 0.009 : 0.004;
      for (let index = 0; index < route.rotating.length; index += 1) {
        const object = route.rotating[index];
        object.rotation.z += spin * (index % 2 === 0 ? 1 : -1);
      }
    }

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV53Setpieces = () => ({
        style,
        setpieceCount: route?.count ?? 0,
        rotatingCount: route?.rotating.length ?? 0,
        anchorResets: this.anchorResets,
        reanchorDistance: REANCHOR_DISTANCE,
      });
    }
  }

  private resetAnchor(snapshot: CartArenaSessionSnapshot): void {
    this.anchorX = snapshot.x;
    this.anchorZ = snapshot.z;
    this.root.position.set(snapshot.x, 0, snapshot.z);
    this.root.rotation.y = snapshot.heading;
    this.anchorResets += 1;
  }

  private buildRoute(style: SkyDancerMissionWorldStyleV49): RouteSetpiece {
    const root = new THREE.Group();
    root.name = `sky-dancer-v53-${style}-route`;
    const rotating: THREE.Object3D[] = [];
    let count = 0;

    const config: Record<SkyDancerMissionWorldStyleV49, { body: number; accent: number; span: number; height: number }> = {
      city: { body: 0x536b7c, accent: 0x69e5ff, span: 58, height: 48 },
      clouds: { body: 0xdceaf0, accent: 0xc2f4ff, span: 52, height: 34 },
      mountains: { body: 0x4b5251, accent: 0xffb078, span: 64, height: 54 },
      facility: { body: 0x394a55, accent: 0x55e7ee, span: 50, height: 52 },
      storm: { body: 0x343d52, accent: 0x8beeff, span: 62, height: 58 },
      citadel: { body: 0x343d59, accent: 0xffbd86, span: 68, height: 64 },
    };
    const c = config[style];
    const body = solid(c.body, style === "facility" ? 0.46 : 0.76, style === "facility" ? 0.30 : 0.08);
    const accent = emissive(c.accent, style === "storm" ? 0.66 : 0.48);
    const shadow = solid(style === "clouds" ? 0x9ebac5 : style === "mountains" ? 0x303a38 : 0x263744, 0.90, 0.02);

    // Repeating side silhouettes create near/mid/far parallax without expensive
    // textures. The corridor stays open so enemies and lock cues remain readable.
    for (let marker = 0; marker < 10; marker += 1) {
      const z = 28 + marker * 31;
      for (const side of [-1, 1]) {
        let landmark: THREE.Mesh;
        if (style === "clouds" || style === "storm") {
          landmark = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), shadow);
          landmark.scale.set(8 + (marker % 3) * 2.2, 2.8 + (marker % 2) * 1.2, 5.6 + (marker % 4));
          landmark.position.set(side * (43 + (marker % 3) * 8), -13 - (marker % 2) * 5, z);
        } else if (style === "mountains") {
          landmark = new THREE.Mesh(new THREE.ConeGeometry(10 + (marker % 3) * 2.4, 36 + (marker % 4) * 7, 6), shadow);
          landmark.position.set(side * (46 + (marker % 3) * 9), -42, z);
        } else {
          landmark = new THREE.Mesh(new THREE.BoxGeometry(7 + (marker % 3) * 2.2, 20 + (marker % 4) * 8, 8), shadow);
          landmark.position.set(side * (44 + (marker % 3) * 10), -43 + landmark.geometry.parameters.height * 0.5, z);
          landmark.rotation.y = side * (0.08 + (marker % 2) * 0.05);
        }
        landmark.name = `sky-dancer-v53-${style}-depth-landmark`;
        root.add(landmark);
        count += 1;
      }
    }

    for (let gate = 0; gate < 4; gate += 1) {
      const z = 54 + gate * 69;
      const sideOffset = c.span * 0.5;
      const bottomY = -50;
      const topY = bottomY + c.height;

      if (style === "clouds") {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(15 + gate * 0.8, 0.72, 7, 42), accent);
        ring.position.set(0, -4 + (gate % 2) * 5, z);
        ring.name = "sky-dancer-v53-cloud-flight-ring";
        root.add(ring);
        rotating.push(ring);
        count += 1;
        for (const side of [-1, 1]) {
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(5.4 + gate * 0.35, 0), body);
          shard.scale.set(0.75, 2.3, 0.62);
          shard.position.set(side * (25 + gate * 2), -8, z + side * 5);
          root.add(shard);
          count += 1;
        }
        continue;
      }

      for (const side of [-1, 1]) {
        let tower: THREE.Mesh;
        if (style === "mountains") {
          tower = new THREE.Mesh(new THREE.ConeGeometry(8.5, c.height, 7), body);
          tower.position.set(side * sideOffset, bottomY + c.height * 0.5, z);
        } else if (style === "citadel") {
          tower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 7.8, c.height, 6), body);
          tower.position.set(side * sideOffset, bottomY + c.height * 0.5, z);
          tower.rotation.y = Math.PI / 6;
        } else {
          tower = new THREE.Mesh(new THREE.BoxGeometry(style === "facility" ? 7.5 : 6.2, c.height, 8.5), body);
          tower.position.set(side * sideOffset, bottomY + c.height * 0.5, z);
        }
        tower.name = `sky-dancer-v53-${style}-pylon`;
        root.add(tower);
        count += 1;

        const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.8, 0.7), accent);
        beacon.position.set(side * (sideOffset - 0.5), topY - 5, z - 1.0);
        root.add(beacon);
        count += 1;
      }

      const span = new THREE.Mesh(new THREE.BoxGeometry(c.span + 7, style === "storm" ? 2.0 : 3.4, 7.0), body);
      span.position.set(0, topY, z);
      span.name = `sky-dancer-v53-${style}-overhead-span`;
      root.add(span);
      count += 1;

      const halo = new THREE.Mesh(new THREE.TorusGeometry(Math.max(12, c.span * 0.22), 0.48, 6, 36), accent);
      halo.position.set(0, topY - 8, z + 0.2);
      halo.name = `sky-dancer-v53-${style}-route-halo`;
      root.add(halo);
      rotating.push(halo);
      count += 1;

      if (style === "city" || style === "facility") {
        const lowerBridge = new THREE.Mesh(new THREE.BoxGeometry(c.span * 0.68, 1.1, 3.0), body);
        lowerBridge.position.set(0, topY - 20, z + 4.0);
        root.add(lowerBridge);
        count += 1;
      }
      if (style === "storm") {
        for (const side of [-1, 1]) {
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 20, 5), accent);
          rod.position.set(side * (sideOffset + 3), topY + 9, z);
          root.add(rod);
          count += 1;
        }
      }
    }

    const farMarker = new THREE.Mesh(
      new THREE.TorusGeometry(style === "citadel" ? 27 : 22, style === "citadel" ? 1.15 : 0.72, 8, 54),
      accent,
    );
    farMarker.position.set(0, style === "citadel" ? 6 : -4, 336);
    farMarker.name = `sky-dancer-v53-${style}-destination-marker`;
    root.add(farMarker);
    rotating.push(farMarker);
    count += 1;

    return { root, rotating, count };
  }
}
