import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerCampaignSnapshotV49 } from "../SkyDancerCombatChoreographyV46";
import type { SkyDancerMissionWorldStyleV49 } from "../SkyDancerCampaignV49";

interface AtmospherePalette {
  top: number;
  horizon: number;
  lower: number;
  fog: number;
  key: number;
  rim: number;
  fogNear: number;
  fogFar: number;
  keyIntensity: number;
  rimIntensity: number;
}

const PALETTES: Record<SkyDancerMissionWorldStyleV49, AtmospherePalette> = {
  city: {
    top: 0x2f83c8,
    horizon: 0xa5dbef,
    lower: 0xd8eef2,
    fog: 0x94c6d8,
    key: 0xfff1cf,
    rim: 0x65ddff,
    fogNear: 540,
    fogFar: 1840,
    keyIntensity: 1.35,
    rimIntensity: 0.72,
  },
  clouds: {
    top: 0x70b8dd,
    horizon: 0xeef9ff,
    lower: 0xfaf5ea,
    fog: 0xd7edf5,
    key: 0xfff6dc,
    rim: 0x9cecff,
    fogNear: 510,
    fogFar: 1790,
    keyIntensity: 1.48,
    rimIntensity: 0.62,
  },
  mountains: {
    top: 0x234868,
    horizon: 0xd18d67,
    lower: 0x725b65,
    fog: 0x846d70,
    key: 0xffc078,
    rim: 0x8ecfff,
    fogNear: 560,
    fogFar: 1880,
    keyIntensity: 1.28,
    rimIntensity: 0.82,
  },
  facility: {
    top: 0x152938,
    horizon: 0x5e7480,
    lower: 0x283239,
    fog: 0x394b54,
    key: 0xffad67,
    rim: 0x5ce6f2,
    fogNear: 520,
    fogFar: 1810,
    keyIntensity: 1.14,
    rimIntensity: 0.92,
  },
  storm: {
    top: 0x171d38,
    horizon: 0x596681,
    lower: 0x232b45,
    fog: 0x414b65,
    key: 0xb8caff,
    rim: 0x62eeff,
    fogNear: 500,
    fogFar: 1760,
    keyIntensity: 0.88,
    rimIntensity: 1.05,
  },
  citadel: {
    top: 0x172f5a,
    horizon: 0xd59b72,
    lower: 0x47516c,
    fog: 0x655e72,
    key: 0xffd598,
    rim: 0x92ddff,
    fogNear: 550,
    fogFar: 1900,
    keyIntensity: 1.42,
    rimIntensity: 1.0,
  },
};

function color(value: number): THREE.Color {
  return new THREE.Color(value);
}

function skyRaidWorldStyle(): SkyDancerMissionWorldStyleV49 | null {
  if (typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid") return null;
  const style = document.documentElement.dataset.skyRaidWorldStyle;
  return style === "mountains" || style === "clouds" || style === "storm" || style === "citadel" ? style : "city";
}

export class SkyDancerV50ColorScriptAtmospherePass {
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  private readonly rimLight = new THREE.DirectionalLight(0x80dcff, 0.7);
  private readonly fillLight = new THREE.HemisphereLight(0xbce9ff, 0x253240, 0.56);
  private readonly currentTop = new THREE.Color();
  private readonly currentHorizon = new THREE.Color();
  private readonly currentLower = new THREE.Color();
  private readonly currentFog = new THREE.Color();
  private readonly currentKey = new THREE.Color();
  private readonly currentRim = new THREE.Color();
  private fogNear = 540;
  private fogFar = 1840;
  private initialized = false;
  private activeStyle: SkyDancerMissionWorldStyleV49 = "city";

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(PALETTES.city.top) },
        horizonColor: { value: new THREE.Color(PALETTES.city.horizon) },
        lowerColor: { value: new THREE.Color(PALETTES.city.lower) },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(world.xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 lowerColor;
        varying vec3 vWorldDir;
        void main() {
          float y = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
          float upperMix = smoothstep(0.50, 0.92, y);
          float lowerMix = smoothstep(0.05, 0.48, y);
          vec3 lowBand = mix(lowerColor, horizonColor, lowerMix);
          vec3 c = mix(lowBand, topColor, upperMix);
          float glow = exp(-pow((y - 0.51) * 6.5, 2.0));
          c += horizonColor * glow * 0.08;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(760, 20, 12), material);
    this.sky.name = "sky-dancer-v50-color-script-sky";
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    runtime.scene.add(this.sky);

    this.keyLight.name = "sky-dancer-v50-key-light";
    this.rimLight.name = "sky-dancer-v50-rim-light";
    this.fillLight.name = "sky-dancer-v50-hemisphere-fill";
    runtime.scene.add(this.keyLight, this.rimLight, this.fillLight);
    runtime.scene.userData.skyDancerV50ColorScriptAtmosphere = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    // Older presentation passes run earlier in the same frame and may hide
    // objects whose semantic names contain "sky". V50 is the final atmosphere
    // owner, so reclaim visibility here after all legacy cleanup has run.
    this.sky.visible = true;

    const campaign = getLatestSkyDancerCampaignSnapshotV49();
    this.activeStyle = skyRaidWorldStyle() ?? campaign?.worldStyle ?? "city";
    const target = PALETTES[this.activeStyle];
    if (!this.initialized) {
      this.currentTop.copy(color(target.top));
      this.currentHorizon.copy(color(target.horizon));
      this.currentLower.copy(color(target.lower));
      this.currentFog.copy(color(target.fog));
      this.currentKey.copy(color(target.key));
      this.currentRim.copy(color(target.rim));
      this.fogNear = target.fogNear;
      this.fogFar = target.fogFar;
      this.initialized = true;
    } else {
      const t = 0.035;
      this.currentTop.lerp(color(target.top), t);
      this.currentHorizon.lerp(color(target.horizon), t);
      this.currentLower.lerp(color(target.lower), t);
      this.currentFog.lerp(color(target.fog), t);
      this.currentKey.lerp(color(target.key), t);
      this.currentRim.lerp(color(target.rim), t);
      this.fogNear = THREE.MathUtils.lerp(this.fogNear, target.fogNear, t);
      this.fogFar = THREE.MathUtils.lerp(this.fogFar, target.fogFar, t);
    }

    const uniforms = this.sky.material.uniforms;
    (uniforms.topColor.value as THREE.Color).copy(this.currentTop);
    (uniforms.horizonColor.value as THREE.Color).copy(this.currentHorizon);
    (uniforms.lowerColor.value as THREE.Color).copy(this.currentLower);
    this.sky.position.copy(this.runtime.camera.position);

    this.runtime.scene.background = this.currentHorizon.clone();
    if (!(this.runtime.scene.fog instanceof THREE.Fog)) {
      this.runtime.scene.fog = new THREE.Fog(this.currentFog.getHex(), this.fogNear, this.fogFar);
    } else {
      this.runtime.scene.fog.color.copy(this.currentFog);
      this.runtime.scene.fog.near = this.fogNear;
      this.runtime.scene.fog.far = this.fogFar;
    }

    const speed = THREE.MathUtils.clamp(Math.abs(snapshot.speed) / 36, 0, 1);
    this.keyLight.color.copy(this.currentKey);
    this.rimLight.color.copy(this.currentRim);
    this.keyLight.intensity = target.keyIntensity + speed * 0.12;
    this.rimLight.intensity = target.rimIntensity + (snapshot.boostActive ? 0.34 : speed * 0.12);
    this.fillLight.color.copy(this.currentHorizon);
    this.fillLight.groundColor.copy(this.currentLower);
    this.fillLight.intensity = 0.48 + speed * 0.14;

    this.keyLight.position.set(snapshot.x - 80, 120, snapshot.z - 90);
    this.keyLight.target.position.set(snapshot.x, 0, snapshot.z + 45);
    this.rimLight.position.set(snapshot.x + 70, 36, snapshot.z + 25);
    this.rimLight.target.position.set(snapshot.x, 0, snapshot.z);
    if (!this.keyLight.target.parent) this.runtime.scene.add(this.keyLight.target);
    if (!this.rimLight.target.parent) this.runtime.scene.add(this.rimLight.target);

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV50Atmosphere = () => ({
        style: this.activeStyle,
        fogNear: this.fogNear,
        fogFar: this.fogFar,
        keyIntensity: this.keyLight.intensity,
        rimIntensity: this.rimLight.intensity,
        hasGradientSky: this.sky.visible,
      });
    }
  }
}
