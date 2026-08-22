import * as THREE from "three";
import type { CartEnemySnapshot } from "../cart/CartArenaSession";
import type { CartRogueSnapshotHandler } from "../cart/CartRogueDemo";
import { CartRogueWebGLDemo } from "../cart/CartRogueWebGLDemo";
import { CART_WORLD_GRAPH } from "../cart/CartWorldGraph";

interface CartRuntimeView {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  session: { car: { group: THREE.Group } };
  enemyGroups: Map<string, THREE.Group>;
  resourceGroups: Map<string, THREE.Group>;
  obstacleGroups: Map<string, THREE.Group>;
  gateBars: Map<string, THREE.Mesh>;
  playerVisual: THREE.Group;
  playerWheels: THREE.Mesh[];
  boostLight: THREE.PointLight;
  sparkMesh: THREE.InstancedMesh;
}

/**
 * Sky Dancer is intentionally a visual skin over the latest Cart Rogue runtime.
 * Movement, input, collisions, enemies, resources, progression and tuning all
 * remain owned by CartRogueWebGLDemo / CartArenaSession.
 */
export class SkyDancerWebGLDemo extends CartRogueWebGLDemo {
  constructor(
    mount: HTMLElement,
    onSnapshot: CartRogueSnapshotHandler,
    onRuntimeFailure: (message: string, error: unknown) => void,
  ) {
    super(mount, onSnapshot, onRuntimeFailure);
    this.applySkyDancerTheme();
  }

  private applySkyDancerTheme(): void {
    const runtime = this as unknown as CartRuntimeView;
    runtime.renderer.domElement.setAttribute("aria-label", "Sky Dancer WebGL game view");
    runtime.scene.background = new THREE.Color(0x65baf0);
    runtime.scene.fog = new THREE.Fog(0xb9e5ff, 118, 350);

    // Cart Rogue builds its scenery before dynamic gameplay objects. Remove only
    // that visual scenery; keep every gameplay-owned root and all collision data.
    const keep = new Set<THREE.Object3D>([
      runtime.camera,
      runtime.session.car.group,
      runtime.sparkMesh,
      ...runtime.enemyGroups.values(),
      ...runtime.resourceGroups.values(),
      ...runtime.obstacleGroups.values(),
    ]);
    for (const bar of runtime.gateBars.values()) {
      let root: THREE.Object3D = bar;
      while (root.parent && root.parent !== runtime.scene) root = root.parent;
      if (root.parent === runtime.scene) keep.add(root);
    }

    for (const object of [...runtime.scene.children]) {
      if (keep.has(object) || object instanceof THREE.Light || object instanceof THREE.Camera) continue;
      runtime.scene.remove(object);
    }

    this.buildCloudDeck(runtime.scene);
    this.buildAirspaceGuides(runtime.scene);
    this.replacePlayerWithFighter(runtime);
    this.replaceEnemiesWithFighters(runtime);
  }

  private replacePlayerWithFighter(runtime: CartRuntimeView): void {
    runtime.playerVisual.clear();
    runtime.playerWheels.length = 0;

    const fighter = this.buildFighter(0x3eb7d7, 0xe9f8ff, 0x175a82, 1, false);
    fighter.position.y = 0.58;
    runtime.playerVisual.add(fighter);

    runtime.boostLight.color.setHex(0x53d8ff);
    runtime.boostLight.position.set(0, 0.62, -2.25);
    runtime.playerVisual.add(runtime.boostLight);
  }

  private replaceEnemiesWithFighters(runtime: CartRuntimeView): void {
    const enemies = this.getSnapshot().enemies;
    const byId = new Map(enemies.map((enemy) => [enemy.id, enemy]));

    for (const [id, group] of runtime.enemyGroups) {
      const enemy = byId.get(id);
      if (!enemy) continue;
      group.clear();
      group.userData.wheels = [];

      const boss = enemy.kind === "boss";
      const heavy = enemy.kind === "heavy";
      const chaser = enemy.kind === "chaser";
      const primary = boss ? 0x34384d : heavy ? 0xa45c86 : chaser ? 0x75b8d9 : 0xe5a957;
      const accent = boss ? 0xff5e6f : heavy ? 0xe3b4d2 : chaser ? 0xd9f6ff : 0xffefb2;
      const dark = boss ? 0x171b2b : heavy ? 0x50334f : chaser ? 0x2f6886 : 0x77522a;
      const scale = Math.max(0.74, enemy.radius / 1.48) * (boss ? 1.08 : 1);
      const fighter = this.buildFighter(primary, accent, dark, scale, boss);
      fighter.position.y = boss ? 0.72 : 0.5;
      group.add(fighter);
      this.addEnemyHp(group, enemy);
    }
  }

  private addEnemyHp(group: THREE.Group, enemy: CartEnemySnapshot): void {
    const boss = enemy.kind === "boss";
    const heavy = enemy.kind === "heavy";
    const y = boss ? 4.25 : heavy ? 3.15 : 2.7;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(enemy.radius * 1.9, 0.2, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x223247, transparent: true, opacity: 0.86 }),
    );
    back.position.y = y;
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(enemy.radius * 1.76, 0.13, 0.16),
      new THREE.MeshBasicMaterial({ color: boss ? 0xff6576 : 0x8be6ff }),
    );
    fill.name = "hp-fill";
    fill.position.set(0, y, -0.02);
    group.add(back, fill);
  }

  private buildFighter(
    primary: number,
    accent: number,
    dark: number,
    scale: number,
    boss: boolean,
  ): THREE.Group {
    const group = new THREE.Group();
    const primaryMat = this.fighterMaterial(primary, 0.2);
    const accentMat = this.fighterMaterial(accent, 0.08);
    const darkMat = this.fighterMaterial(dark, 0.38);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x173d5b,
      roughness: 0.22,
      metalness: 0.18,
      flatShading: true,
      emissive: 0x0d2942,
      emissiveIntensity: 0.26,
    });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.66, 3.15, 8), primaryMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, 0.42, -0.05);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.49, 1.55, 8), accentMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.4, 2.25);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 2.15), darkMat);
    spine.position.set(0, 0.7, -0.22);
    group.add(fuselage, nose, spine);

    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0.35, 0.72,  -2.65, 0.24, -0.62,  0, 0.25, -0.95,
      0, 0.35, 0.72,   0, 0.25, -0.95,  2.65, 0.24, -0.62,
    ], 3));
    wingGeometry.computeVertexNormals();
    const wings = new THREE.Mesh(wingGeometry, primaryMat);
    wings.castShadow = true;
    group.add(wings);

    const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.08, 0.24), accentMat);
    wingStripe.position.set(0, 0.36, -0.48);
    wingStripe.rotation.y = -0.02;
    group.add(wingStripe);

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.11, 0.78), darkMat);
    tailWing.position.set(0, 0.5, -1.55);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.88, 0.78), accentMat);
    fin.position.set(0, 0.9, -1.48);
    fin.rotation.x = -0.16;
    group.add(tailWing, fin);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.53, 8, 5), glassMat);
    canopy.scale.set(0.72, 0.58, 1.12);
    canopy.position.set(0, 0.83, 0.62);
    group.add(canopy);

    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x29455a,
      roughness: 0.34,
      metalness: 0.54,
      emissive: 0x10334e,
      emissiveIntensity: 0.4,
      flatShading: true,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x65ddff, transparent: true, opacity: 0.8 });
    for (const x of [-0.34, 0.34]) {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.72, 8), exhaustMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(x, 0.35, -1.72);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), glowMat);
      glow.position.set(x, 0.35, -2.09);
      glow.rotation.x = -Math.PI / 2;
      group.add(engine, glow);
    }

    if (boss) {
      for (const side of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 2.05), darkMat);
        pod.position.set(side * 1.55, 0.38, -0.45);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 6), accentMat);
        tip.rotation.x = Math.PI / 2;
        tip.position.set(side * 1.55, 0.38, 0.94);
        group.add(pod, tip);
      }
    }

    group.scale.setScalar(scale);
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
    return group;
  }

  private fighterMaterial(color: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.48,
      metalness,
      flatShading: true,
    });
  }

  private buildCloudDeck(scene: THREE.Scene): void {
    const nodes = CART_WORLD_GRAPH.nodes;
    const count = Math.max(48, nodes.length * 14);
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshLambertMaterial({
      color: 0xf7fcff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const clouds = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let index = 0; index < count; index += 1) {
      const node = nodes[index % nodes.length];
      const seed = index * 12.9898 + (index % 7) * 3.17;
      const rx = Math.sin(seed) * 0.5 + 0.5;
      const rz = Math.sin(seed * 1.91 + 2.4) * 0.5 + 0.5;
      const side = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
      const x = node.rect.centerX + (rx * 2 - 1) * (node.rect.halfWidth + 22) + side * 11;
      const z = node.rect.centerZ + (rz * 2 - 1) * (node.rect.halfDepth + 18);
      const y = -5.2 - (index % 6) * 1.15;
      const s = 4.4 + (index % 5) * 1.45;
      dummy.position.set(x, y, z);
      dummy.rotation.set(index * 0.17, index * 0.31, index * 0.09);
      dummy.scale.set(s * (1.4 + (index % 3) * 0.22), s * 0.42, s);
      dummy.updateMatrix();
      clouds.setMatrixAt(index, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    clouds.frustumCulled = false;
    scene.add(clouds);
  }

  private buildAirspaceGuides(scene: THREE.Scene): void {
    const positions: number[] = [];
    const y = -0.48;
    for (const node of CART_WORLD_GRAPH.nodes) {
      const minX = node.rect.centerX - node.rect.halfWidth;
      const maxX = node.rect.centerX + node.rect.halfWidth;
      const minZ = node.rect.centerZ - node.rect.halfDepth;
      const maxZ = node.rect.centerZ + node.rect.halfDepth;
      positions.push(
        minX, y, minZ, maxX, y, minZ,
        maxX, y, minZ, maxX, y, maxZ,
        maxX, y, maxZ, minX, y, maxZ,
        minX, y, maxZ, minX, y, minZ,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0xbcecff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const guides = new THREE.LineSegments(geometry, material);
    guides.renderOrder = 2;
    scene.add(guides);
  }
}
