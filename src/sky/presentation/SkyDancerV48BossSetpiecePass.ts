import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerBossQualityV34 } from "../SkyDancerBossCombatV34";
import { getSkyDancerMissionV49 } from "../SkyDancerCampaignV49";
import { getSkyDancerStageCycleSnapshot } from "../SkyDancerStageCycle";

const ROOT_NAME = "sky-dancer-v48-boss-setpiece";
const CORE_NAME = "sky-dancer-v48-boss-core";
const CORE_RING_NAME = "sky-dancer-v48-boss-core-ring";

interface DecoratedBoss {
  group: THREE.Group;
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  core: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  coreRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  engineGlows: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[];
}

export class SkyDancerV48BossSetpiecePass {
  private decorated: DecoratedBoss | null = null;
  private elapsed = 0;
  private observedModes = new Set<string>();
  private maxCoreScale = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    runtime.scene.userData.skyDancerV48BossSetpiece = true;
  }

  update(_snapshot: CartArenaSessionSnapshot): void {
    this.elapsed += 1 / 60;
    const bossEnemy = this.runtime.session.enemies.find((enemy) => enemy.kind === "boss") ?? null;
    if (!bossEnemy) return;
    const bossGroup = this.runtime.enemyGroups.get(bossEnemy.id);
    if (!bossGroup) return;
    if (!this.decorated || this.decorated.group !== bossGroup) this.decorated = this.decorateBoss(bossGroup);

    const state = getLatestSkyDancerBossQualityV34();
    const stageCycle = getSkyDancerStageCycleSnapshot(this.runtime.session);
    const campaignMission = stageCycle ? getSkyDancerMissionV49(stageCycle.stage) : null;
    const campaignBossWindowOpen = !campaignMission || stageCycle?.phase === "boss";
    const active = Boolean(campaignBossWindowOpen && bossEnemy.alive && state?.active);

    // The reference art used a distant capital ship as an illustrative beat,
    // not as permanent scenery. During the six-mission campaign hide the whole
    // boss vehicle (including its legacy base mesh) until the actual BOSS phase.
    // Standalone V34 boss audits have no campaign mission and remain unchanged.
    if (campaignMission) bossGroup.visible = active;
    this.decorated.root.visible = active;
    if (!active) {
      this.installAuditBridge(false, false, "inactive");
      return;
    }

    const mode = state?.mode ?? "orbit";
    this.observedModes.add(mode);
    const coreOpen = Boolean(state?.coreOpen);
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * (coreOpen ? 9.5 : 3.2));
    const targetWing = mode === "strike" ? 0.38 : mode === "break" ? -0.18 : 0.08;
    this.decorated.leftWing.rotation.z += (targetWing - this.decorated.leftWing.rotation.z) * 0.12;
    this.decorated.rightWing.rotation.z += (-targetWing - this.decorated.rightWing.rotation.z) * 0.12;
    this.decorated.root.rotation.y = Math.sin(this.elapsed * 0.75) * 0.025;

    const coreScale = coreOpen ? 1.18 + pulse * 0.34 : 0.72 + pulse * 0.08;
    this.decorated.core.scale.setScalar(coreScale);
    this.decorated.coreRing.scale.setScalar(coreOpen ? 1.08 + pulse * 0.44 : 0.82 + pulse * 0.08);
    this.decorated.core.material.emissiveIntensity = coreOpen ? 1.6 + pulse * 1.2 : 0.24 + pulse * 0.10;
    this.decorated.coreRing.material.opacity = coreOpen ? 0.62 + pulse * 0.30 : 0.16 + pulse * 0.08;
    this.maxCoreScale = Math.max(this.maxCoreScale, coreScale);

    const engineStrength = mode === "strike" ? 1 : mode === "break" ? 0.82 : 0.56;
    for (let index = 0; index < this.decorated.engineGlows.length; index += 1) {
      const glow = this.decorated.engineGlows[index];
      glow.scale.setScalar(0.8 + engineStrength * 0.58 + Math.sin(this.elapsed * 12 + index) * 0.08);
      glow.material.opacity = 0.34 + engineStrength * 0.46;
    }
    this.installAuditBridge(true, coreOpen, mode);
  }

  private decorateBoss(group: THREE.Group): DecoratedBoss {
    group.getObjectByName(ROOT_NAME)?.removeFromParent();
    const root = new THREE.Group();
    root.name = ROOT_NAME;

    const armor = new THREE.MeshStandardMaterial({
      color: 0x252c3c,
      roughness: 0.38,
      metalness: 0.34,
      flatShading: true,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: 0x6e7589,
      roughness: 0.30,
      metalness: 0.42,
      flatShading: true,
    });
    const hot = new THREE.MeshBasicMaterial({
      color: 0xff704e,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const leftWing = this.buildCapitalWing(-1, armor, edge);
    const rightWing = this.buildCapitalWing(1, armor, edge);
    leftWing.name = "sky-dancer-v48-boss-wing-left";
    rightWing.name = "sky-dancer-v48-boss-wing-right";
    root.add(leftWing, rightWing);

    const keel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 8.6), armor);
    keel.position.set(0, 0.2, -0.8);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(1.35, 5.4, 6), edge);
    dorsal.rotation.x = -Math.PI / 2;
    dorsal.position.set(0, 1.25, -0.65);
    root.add(keel, dorsal);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7258,
      emissive: 0xff321f,
      emissiveIntensity: 0.35,
      roughness: 0.24,
      metalness: 0.12,
      flatShading: true,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), coreMaterial);
    core.name = CORE_NAME;
    core.position.set(0, 0.82, 2.8);
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.13, 7, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffa06c,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    coreRing.name = CORE_RING_NAME;
    coreRing.position.copy(core.position);
    root.add(core, coreRing);

    const engineGlows: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
    for (const x of [-5.4, -2.35, 2.35, 5.4]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 3.5, 7), armor);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(x, 0.05, -3.2);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.66, 8, 5), hot.clone());
      glow.position.set(x, 0.05, -5.0);
      glow.scale.set(1, 0.75, 1.65);
      glow.name = "sky-dancer-v48-boss-engine-glow";
      engineGlows.push(glow);
      root.add(nacelle, glow);
    }

    const arrivalHalo = new THREE.Mesh(
      new THREE.TorusGeometry(8.8, 0.18, 5, 52),
      new THREE.MeshBasicMaterial({
        color: 0xff8063,
        transparent: true,
        opacity: 0.20,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    arrivalHalo.rotation.x = Math.PI / 2;
    arrivalHalo.position.y = -0.25;
    arrivalHalo.name = "sky-dancer-v48-boss-arrival-halo";
    root.add(arrivalHalo);

    root.visible = false;
    group.add(root);
    return { group, root, leftWing, rightWing, core, coreRing, engineGlows };
  }

  private buildCapitalWing(
    side: -1 | 1,
    armor: THREE.MeshStandardMaterial,
    edge: THREE.MeshStandardMaterial,
  ): THREE.Group {
    const root = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.46, 3.4), armor);
    plate.position.set(side * 5.8, 0.3, -0.35);
    plate.rotation.y = side * -0.12;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.4, 5), edge);
    tip.rotation.z = side * -Math.PI / 2;
    tip.rotation.y = Math.PI / 2;
    tip.position.set(side * 9.15, 0.24, -0.25);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 5.8), edge);
    blade.position.set(side * 6.2, 0.42, -2.8);
    blade.rotation.y = side * 0.22;
    root.add(plate, tip, blade);
    return root;
  }

  private installAuditBridge(active: boolean, coreOpen: boolean, mode: string): void {
    if (typeof window === "undefined" || !navigator.webdriver) return;
    (window as unknown as Record<string, unknown>).__skyDancerGetV48BossSetpiece = () => ({
      active,
      coreOpen,
      mode,
      decorated: Boolean(this.decorated),
      observedModes: [...this.observedModes],
      maxCoreScale: this.maxCoreScale,
      hasCore: Boolean(this.decorated?.group.getObjectByName(CORE_NAME)),
      engineCount: this.decorated?.engineGlows.length ?? 0,
      visualSpanUnits: 20.3,
    });
  }
}
