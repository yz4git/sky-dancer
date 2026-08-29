import * as THREE from "three";
import type { CartArenaSessionSnapshot, CartEnemySnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

function planformGeometry(points: readonly [number, number][]): THREE.BufferGeometry {
  const vertices: number[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    for (const point of [points[0], points[index], points[index + 1]]) {
      vertices.push(point[0], 0, point[1]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function standard(color: number, metalness = 0.24, roughness = 0.30): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, flatShading: true, side: THREE.DoubleSide });
}

function glow(color: number, opacity = 0.72): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

export class SkyDancerV51AircraftSilhouettePass {
  private readonly playerRoot = new THREE.Group();
  private readonly enemyDecorated = new Set<string>();
  private readonly playerGlowMaterials: THREE.MeshBasicMaterial[] = [];
  private elapsed = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.playerRoot.name = "sky-dancer-v51-player-silhouette";
    this.buildPlayerSilhouette();
    this.attachPlayer();
    runtime.scene.userData.skyDancerV51AircraftSilhouette = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.elapsed += 1 / 60;
    this.attachPlayer();
    this.decorateEnemies(snapshot.enemies);
    const speed = THREE.MathUtils.clamp(Math.abs(snapshot.speed) / 36, 0, 1);
    const pulse = 0.88 + Math.sin(this.elapsed * 9.0) * 0.08;
    for (const material of this.playerGlowMaterials) {
      material.opacity = (snapshot.boostActive ? 0.92 : 0.58 + speed * 0.16) * pulse;
    }
    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV51Silhouette = () => ({
        playerAttached: this.playerRoot.parent === this.runtime.playerVisual,
        playerParts: this.playerRoot.children.length,
        enemyKits: this.enemyDecorated.size,
        visualSpan: 6.8,
      });
    }
  }

  private attachPlayer(): void {
    if (this.playerRoot.parent !== this.runtime.playerVisual) this.runtime.playerVisual.add(this.playerRoot);
  }

  private buildPlayerSilhouette(): void {
    const white = standard(0xeaf1f2, 0.30, 0.25);
    const blue = standard(0x1569aa, 0.30, 0.24);
    const navy = standard(0x112e49, 0.34, 0.28);
    const edgeGlow = glow(0x6ce9ff, 0.68);
    this.playerGlowMaterials.push(edgeGlow);

    const deltaWing = new THREE.Mesh(
      planformGeometry([
        [-3.40, -0.84],
        [-0.62, 0.54],
        [0, 1.18],
        [0.62, 0.54],
        [3.40, -0.84],
        [1.10, -1.18],
        [0, -0.76],
        [-1.10, -1.18],
      ]),
      blue,
    );
    deltaWing.name = "sky-dancer-v51-delta-wing";
    deltaWing.position.y = 0.29;
    this.playerRoot.add(deltaWing);

    const centerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.13, 3.28), white);
    centerPlate.position.set(0, 0.43, 0.12);
    centerPlate.rotation.x = -0.015;
    centerPlate.name = "sky-dancer-v51-center-spine";
    this.playerRoot.add(centerPlate);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.40, 1.72, 6), white);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.38, 1.78);
    nose.name = "sky-dancer-v51-nose-wedge";
    this.playerRoot.add(nose);

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.43, 1.62, 7), navy);
      shoulder.rotation.x = Math.PI / 2;
      shoulder.position.set(side * 0.78, 0.34, -0.76);
      shoulder.name = "sky-dancer-v51-engine-shoulder";
      this.playerRoot.add(shoulder);

      const tail = new THREE.Mesh(
        planformGeometry([
          [0, -0.50],
          [side * 0.62, 0.52],
          [side * 0.28, 1.05],
          [0, 0.38],
        ]),
        navy,
      );
      tail.rotation.x = side * 1.06;
      tail.position.set(side * 0.74, 0.47, -1.26);
      tail.name = "sky-dancer-v51-twin-tail";
      this.playerRoot.add(tail);

      const canard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.24), white);
      canard.position.set(side * 0.73, 0.43, 0.95);
      canard.rotation.y = side * -0.18;
      canard.name = "sky-dancer-v51-canard";
      this.playerRoot.add(canard);

      const engineGlow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), edgeGlow);
      engineGlow.rotation.y = Math.PI;
      engineGlow.position.set(side * 0.78, 0.34, -1.60);
      engineGlow.name = "sky-dancer-v51-engine-disc";
      this.playerRoot.add(engineGlow);

      const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.028, 0.055), edgeGlow);
      wingEdge.position.set(side * 2.08, 0.33, -0.78);
      wingEdge.rotation.y = side * -0.37;
      wingEdge.name = "sky-dancer-v51-wing-edge";
      this.playerRoot.add(wingEdge);
    }
  }

  private decorateEnemies(enemies: readonly CartEnemySnapshot[]): void {
    for (const enemy of enemies) {
      if (!enemy.alive || this.enemyDecorated.has(enemy.id) || enemy.kind === "boss") continue;
      const group = this.runtime.enemyGroups.get(enemy.id);
      if (!group) continue;
      const kit = new THREE.Group();
      kit.name = `sky-dancer-v51-enemy-${enemy.kind}`;
      const red = standard(enemy.kind === "heavy" ? 0x8d2532 : 0xb2313d, 0.22, enemy.kind === "heavy" ? 0.44 : 0.31);
      const dark = standard(0x2b2028, 0.18, 0.42);
      const hot = glow(enemy.kind === "heavy" ? 0xff5a42 : 0xff8b59, 0.62);

      if (enemy.kind === "heavy") {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.32, 1.72), red);
        slab.position.set(0, 0.20, -0.28);
        const core = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.66, 2.20), dark);
        core.position.set(0, 0.30, 0.18);
        kit.add(slab, core);
      } else if (enemy.kind === "blocker") {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.18, 0.68), red);
        wing.position.set(0, 0.24, -0.42);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.64, 1.8, 5), dark);
        crown.rotation.x = Math.PI / 2;
        crown.position.set(0, 0.35, 0.72);
        kit.add(wing, crown);
      } else {
        const dart = new THREE.Mesh(
          planformGeometry([[-2.35, -0.72], [-0.38, 0.44], [0, 1.40], [0.38, 0.44], [2.35, -0.72], [0, -0.28]]),
          red,
        );
        dart.position.y = 0.24;
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 2.55), dark);
        spine.position.set(0, 0.34, 0.14);
        kit.add(dart, spine);
      }

      for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 5), hot);
        lamp.position.set(side * (enemy.kind === "heavy" ? 2.18 : 1.72), 0.30, -0.58);
        kit.add(lamp);
      }
      group.add(kit);
      group.userData.skyDancerV51Silhouette = enemy.kind;
      this.enemyDecorated.add(enemy.id);
    }
  }
}
