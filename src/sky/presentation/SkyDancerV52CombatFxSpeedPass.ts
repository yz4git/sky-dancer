import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerCampaignSnapshotV49 } from "../SkyDancerCombatChoreographyV46";
import { getSkyDancerPlayerWeaponState } from "../SkyDancerPlayerWeapons";

interface HitRing {
  mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  life: number;
  maxLife: number;
}

function additive(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

export class SkyDancerV52CombatFxSpeedPass {
  private readonly speedRoot = new THREE.Group();
  private readonly speedMaterial = additive(0xd9f8ff, 0);
  private readonly hitRings: HitRing[] = [];
  private readonly evadeRing = new THREE.Mesh(new THREE.TorusGeometry(2.30, 0.065, 7, 46), additive(0x8fffe9, 0));
  private previousHitSerial = 0;
  private previousPerfectEvades = 0;
  private evadePulse = 0;
  private elapsed = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.speedRoot.name = "sky-dancer-v52-peripheral-speed-field";
    const streakGeometry = new THREE.BoxGeometry(0.018, 0.018, 1);
    for (let index = 0; index < 28; index += 1) {
      const line = new THREE.Mesh(streakGeometry, this.speedMaterial);
      const side = index % 2 === 0 ? -1 : 1;
      const lane = Math.floor(index / 2);
      const x = side * (2.2 + (lane % 5) * 0.75);
      const y = -1.7 + (lane % 7) * 0.52;
      line.position.set(x, y, -4.5 - (lane % 6) * 1.45);
      line.scale.z = 2.8 + (lane % 4) * 1.3;
      line.userData.v52BaseZ = line.position.z;
      line.userData.v52Phase = lane * 0.73;
      this.speedRoot.add(line);
    }
    this.speedRoot.visible = false;
    runtime.scene.add(this.speedRoot);

    for (let index = 0; index < 5; index += 1) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.055, 7, 36), additive(index === 0 ? 0xffffff : 0xffb46a, 0));
      mesh.name = "sky-dancer-v52-hit-shock-ring";
      mesh.visible = false;
      mesh.renderOrder = 18;
      runtime.scene.add(mesh);
      this.hitRings.push({ mesh, life: 0, maxLife: 0.42 });
    }

    this.evadeRing.name = "sky-dancer-v52-perfect-evade-ring";
    this.evadeRing.rotation.x = Math.PI / 2;
    this.evadeRing.position.set(0, 0.44, -0.12);
    this.evadeRing.visible = false;
    runtime.playerVisual.add(this.evadeRing);
    runtime.scene.userData.skyDancerV52CombatFxSpeed = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    const delta = 1 / 60;
    this.elapsed += delta;
    this.updateSpeedField(snapshot);
    this.updateHits(delta);
    this.updatePerfectEvade(delta);
    if (this.evadeRing.parent !== this.runtime.playerVisual) this.runtime.playerVisual.add(this.evadeRing);

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV52SpeedFx = () => ({
        streaks: this.speedRoot.children.length,
        speedVisible: this.speedRoot.visible,
        speedOpacity: this.speedMaterial.opacity,
        activeHitRings: this.hitRings.filter((ring) => ring.life > 0).length,
        evadePulse: this.evadePulse,
      });
    }
  }

  private updateSpeedField(snapshot: CartArenaSessionSnapshot): void {
    const speed = THREE.MathUtils.clamp((Math.abs(snapshot.speed) - 12) / 26, 0, 1);
    const intensity = THREE.MathUtils.clamp(speed * 0.56 + (snapshot.boostActive ? 0.58 : 0), 0, 1);
    this.speedRoot.visible = intensity > 0.08;
    this.speedMaterial.opacity = intensity * (snapshot.boostActive ? 0.38 : 0.20);
    this.speedRoot.position.copy(this.runtime.camera.position);
    this.speedRoot.quaternion.copy(this.runtime.camera.quaternion);

    for (let index = 0; index < this.speedRoot.children.length; index += 1) {
      const child = this.speedRoot.children[index];
      const baseZ = Number(child.userData.v52BaseZ ?? -5);
      const phase = Number(child.userData.v52Phase ?? 0);
      const travel = (this.elapsed * (7 + intensity * 24) + phase) % 7.5;
      child.position.z = baseZ + travel;
      if (child.position.z > -1.3) child.position.z -= 8.8;
      child.scale.z = 2.6 + intensity * 6.2 + (index % 4) * 0.55;
    }
  }

  private updateHits(delta: number): void {
    const weapon = getSkyDancerPlayerWeaponState(this.runtime.session);
    if (weapon.hitSerial > this.previousHitSerial) {
      const hitDelta = Math.min(3, weapon.hitSerial - this.previousHitSerial);
      for (let index = 0; index < hitDelta; index += 1) this.spawnHitRing(weapon.lastHitEnemyId, weapon.lastHitX, weapon.lastHitZ, index);
      this.previousHitSerial = weapon.hitSerial;
    }

    for (const ring of this.hitRings) {
      if (ring.life <= 0) continue;
      ring.life = Math.max(0, ring.life - delta);
      const age = 1 - ring.life / ring.maxLife;
      ring.mesh.visible = ring.life > 0;
      ring.mesh.scale.setScalar(0.65 + age * 3.8);
      ring.mesh.material.opacity = Math.pow(1 - age, 1.5) * 0.72;
      ring.mesh.quaternion.copy(this.runtime.camera.quaternion);
    }
  }

  private spawnHitRing(enemyId: string | null, fallbackX: number, fallbackZ: number, serialOffset: number): void {
    const ring = this.hitRings.find((candidate) => candidate.life <= 0) ?? this.hitRings[0];
    const target = enemyId ? this.runtime.enemyGroups.get(enemyId) : null;
    if (target) {
      target.getWorldPosition(ring.mesh.position);
    } else {
      ring.mesh.position.set(fallbackX, 0.5, fallbackZ);
    }
    ring.mesh.position.y += serialOffset * 0.12;
    ring.life = ring.maxLife;
    ring.mesh.visible = true;
    ring.mesh.scale.setScalar(0.68);
    ring.mesh.material.opacity = 0.78;
    this.runtime.emitImpactSparks(ring.mesh.position, 10 + serialOffset * 3);
    this.runtime.cameraShake = Math.max(this.runtime.cameraShake, 0.08 + serialOffset * 0.025);
    this.runtime.impactFlash = Math.max(this.runtime.impactFlash, 0.06);
  }

  private updatePerfectEvade(delta: number): void {
    const campaign = getLatestSkyDancerCampaignSnapshotV49();
    const count = campaign?.perfectEvades ?? 0;
    if (count > this.previousPerfectEvades) {
      this.evadePulse = 1;
      this.previousPerfectEvades = count;
    }
    this.evadePulse = Math.max(0, this.evadePulse - delta * 2.5);
    this.evadeRing.visible = this.evadePulse > 0.01;
    this.evadeRing.scale.setScalar(0.72 + (1 - this.evadePulse) * 1.8);
    this.evadeRing.material.opacity = this.evadePulse * 0.72;
  }
}
