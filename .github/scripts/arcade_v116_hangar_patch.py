from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch anchor in {path}: {old[:90]!r}")
    p.write_text(s.replace(old, new, 1))

# Progress: persist selected equipment while preserving existing unlock compatibility.
path = "src/sky/arcade/SkyDancerArcadeProgress.ts"
replace_once(path,
'''  unlockedPaintSchemes: SkyDancerArcadePaintScheme[];\n  unlockedLoadouts: SkyDancerArcadeLoadout[];\n}''',
'''  unlockedPaintSchemes: SkyDancerArcadePaintScheme[];\n  unlockedLoadouts: SkyDancerArcadeLoadout[];\n  selectedPaintScheme: SkyDancerArcadePaintScheme;\n  selectedLoadout: SkyDancerArcadeLoadout;\n}''')
replace_once(path,
'''    unlockedPaintSchemes: ["default"],\n    unlockedLoadouts: ["standard"],\n  };''',
'''    unlockedPaintSchemes: ["default"],\n    unlockedLoadouts: ["standard"],\n    selectedPaintScheme: "default",\n    selectedLoadout: "standard",\n  };''')
replace_once(path,
'''function validRank(value: unknown): value is SkyDancerArcadeRank {\n  return value === "D" || value === "C" || value === "B" || value === "A" || value === "S" || value === "SS";\n}\n''',
'''function validRank(value: unknown): value is SkyDancerArcadeRank {\n  return value === "D" || value === "C" || value === "B" || value === "A" || value === "S" || value === "SS";\n}\n\nfunction validPaintScheme(value: unknown): value is SkyDancerArcadePaintScheme {\n  return value === "default" || value === "sunset" || value === "storm" || value === "prism";\n}\n\nfunction validLoadout(value: unknown): value is SkyDancerArcadeLoadout {\n  return value === "standard" || value === "missile-focus" || value === "gun-focus";\n}\n''')
replace_once(path,
'''      unlockedPaintSchemes: Array.isArray(parsed.unlockedPaintSchemes)\n        ? parsed.unlockedPaintSchemes.filter((value): value is SkyDancerArcadePaintScheme => value === "default" || value === "sunset" || value === "storm" || value === "prism")\n        : ["default"],\n      unlockedLoadouts: Array.isArray(parsed.unlockedLoadouts)\n        ? parsed.unlockedLoadouts.filter((value): value is SkyDancerArcadeLoadout => value === "standard" || value === "missile-focus" || value === "gun-focus")\n        : ["standard"],\n    };''',
'''      unlockedPaintSchemes: Array.isArray(parsed.unlockedPaintSchemes)\n        ? parsed.unlockedPaintSchemes.filter(validPaintScheme)\n        : ["default"],\n      unlockedLoadouts: Array.isArray(parsed.unlockedLoadouts)\n        ? parsed.unlockedLoadouts.filter(validLoadout)\n        : ["standard"],\n      selectedPaintScheme: validPaintScheme(parsed.selectedPaintScheme) ? parsed.selectedPaintScheme : "default",\n      selectedLoadout: validLoadout(parsed.selectedLoadout) ? parsed.selectedLoadout : "standard",\n    };''')
replace_once(path,
'''    applyUnlocks(progress);\n    return progress;''',
'''    applyUnlocks(progress);\n    if (!progress.unlockedPaintSchemes.includes(progress.selectedPaintScheme)) progress.selectedPaintScheme = "default";\n    if (!progress.unlockedLoadouts.includes(progress.selectedLoadout)) progress.selectedLoadout = "standard";\n    return progress;''')
replace_once(path,
'''  try {\n    applyUnlocks(progress);\n    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));''',
'''  try {\n    applyUnlocks(progress);\n    if (!progress.unlockedPaintSchemes.includes(progress.selectedPaintScheme)) progress.selectedPaintScheme = "default";\n    if (!progress.unlockedLoadouts.includes(progress.selectedLoadout)) progress.selectedLoadout = "standard";\n    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));''')
replace_once(path,
'''export function recordSkyDancerArcadeStageClear(''',
'''export function selectSkyDancerArcadeEquipment(\n  paintScheme: SkyDancerArcadePaintScheme,\n  loadout: SkyDancerArcadeLoadout,\n): SkyDancerArcadeProgress {\n  const progress = loadSkyDancerArcadeProgress();\n  if (progress.unlockedPaintSchemes.includes(paintScheme)) progress.selectedPaintScheme = paintScheme;\n  if (progress.unlockedLoadouts.includes(loadout)) progress.selectedLoadout = loadout;\n  saveSkyDancerArcadeProgress(progress);\n  return progress;\n}\n\nexport function recordSkyDancerArcadeStageClear(''')

# Start request carries equipment into the sortie.
path = "src/sky/arcade/SkyDancerArcadeData.ts"
replace_once(path,
'''  practiceStageId?: SkyDancerArcadeStageId;\n  seed?: number;''',
'''  practiceStageId?: SkyDancerArcadeStageId;\n  paintScheme?: "default" | "sunset" | "storm" | "prism";\n  loadout?: "standard" | "missile-focus" | "gun-focus";\n  seed?: number;''')

# Runtime: real weapon profiles, surfaced in snapshots.
path = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(path,
'''import type { SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";''',
'''import type { SkyDancerArcadeLoadout, SkyDancerArcadePaintScheme, SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";''')
replace_once(path,
'''  startStageId?: SkyDancerArcadeStageId;\n  seed?: number;''',
'''  startStageId?: SkyDancerArcadeStageId;\n  paintScheme?: SkyDancerArcadePaintScheme;\n  loadout?: SkyDancerArcadeLoadout;\n  seed?: number;''')
replace_once(path,
'''  mode: "arcade-run" | "stage-practice";\n  stage: SkyDancerArcadeStageDefinition;''',
'''  mode: "arcade-run" | "stage-practice";\n  paintScheme: SkyDancerArcadePaintScheme;\n  loadout: SkyDancerArcadeLoadout;\n  stage: SkyDancerArcadeStageDefinition;''')
replace_once(path,
'''const MAX_ENEMY_PROJECTILES_HARD = 9;\n''',
'''const MAX_ENEMY_PROJECTILES_HARD = 9;\n\nfunction arcadeLoadoutGunCooldown(loadout: SkyDancerArcadeLoadout | undefined): number {\n  return GUN_COOLDOWN * (loadout === "gun-focus" ? 0.74 : loadout === "missile-focus" ? 1.08 : 1);\n}\n\nfunction arcadeLoadoutGunDamage(loadout: SkyDancerArcadeLoadout | undefined): number {\n  return loadout === "gun-focus" ? 1.18 : loadout === "missile-focus" ? 0.92 : 1;\n}\n\nfunction arcadeLoadoutLockInterval(loadout: SkyDancerArcadeLoadout | undefined): number {\n  return LOCK_INTERVAL * (loadout === "missile-focus" ? 0.72 : loadout === "gun-focus" ? 1.1 : 1);\n}\n\nfunction arcadeLoadoutMissileDamage(loadout: SkyDancerArcadeLoadout | undefined): number {\n  return loadout === "missile-focus" ? 1.22 : loadout === "gun-focus" ? 0.92 : 1;\n}\n\nfunction arcadeLoadoutMissileSpeed(loadout: SkyDancerArcadeLoadout | undefined): number {\n  return loadout === "missile-focus" ? 1.1 : loadout === "gun-focus" ? 0.96 : 1;\n}\n''')
replace_once(path,
'''      this.lockCooldown = LOCK_INTERVAL;''',
'''      this.lockCooldown = arcadeLoadoutLockInterval(this.options.loadout);''')
replace_once(path,
'''    this.gunCooldown = GUN_COOLDOWN;''',
'''    this.gunCooldown = arcadeLoadoutGunCooldown(this.options.loadout);''')
replace_once(path,
'''      damage: this.options.difficulty === "hard" ? 8 : 9.5,''',
'''      damage: (this.options.difficulty === "hard" ? 8 : 9.5) * arcadeLoadoutGunDamage(this.options.loadout),''')
replace_once(path,
'''        speed: 62,\n        damage: target.boss ? 34 : 46,''',
'''        speed: 62 * arcadeLoadoutMissileSpeed(this.options.loadout),\n        damage: (target.boss ? 34 : 46) * arcadeLoadoutMissileDamage(this.options.loadout),''')
replace_once(path,
'''      mode: this.options.mode,\n      stage: this.stage,''',
'''      mode: this.options.mode,\n      paintScheme: this.options.paintScheme ?? "default",\n      loadout: this.options.loadout ?? "standard",\n      stage: this.stage,''')

# Airframe paint schemes are baked into the actual player mesh.
path = "src/sky/arcade/SkyDancerArcadeReferenceAirframes.ts"
replace_once(path,
'''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";''',
'''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";\nimport type { SkyDancerArcadePaintScheme } from "./SkyDancerArcadeProgress";''')
replace_once(path,
'''export function createReferenceFighter(enemy = false, heavy = false): THREE.Group {\n  const group = new THREE.Group();\n  group.name = enemy ? "arcade-reference-raider" : "arcade-player-fighter";\n  const ceramic = paint(enemy ? 0xa72224 : 0xe4eef3, 0.36, 0.48);\n  const cyan = paint(enemy ? 0xee6d28 : 0x05bddd, 0.29, 0.5);\n  const edge = paint(0x11202b, 0.42, 0.62);\n  const silver = paint(0x7c8f9c, 0.33, 0.72);\n  const glow = emissive(enemy ? 0xff5b28 : 0x2ee7ff, 1.5);\n  const canopy = new THREE.MeshPhysicalMaterial({\n    color: 0x082b48, metalness: 0.7, roughness: 0.13, clearcoat: 1,\n    clearcoatRoughness: 0.06, emissive: 0x064664, emissiveIntensity: 0.18,\n  });''',
'''export function createReferenceFighter(\n  enemy = false,\n  heavy = false,\n  playerPaintScheme: SkyDancerArcadePaintScheme = "default",\n): THREE.Group {\n  const group = new THREE.Group();\n  group.name = enemy ? "arcade-reference-raider" : "arcade-player-fighter";\n  const playerPalette = playerPaintScheme === "sunset"\n    ? { ceramic: 0xf1d7c4, accent: 0xff6b35, glow: 0xffc75f, canopy: 0x402018, canopyGlow: 0x7d2d14, engine: 0xff9b55 }\n    : playerPaintScheme === "storm"\n      ? { ceramic: 0x75889d, accent: 0x63d8ff, glow: 0xa9efff, canopy: 0x071827, canopyGlow: 0x0a5873, engine: 0x8de8ff }\n      : playerPaintScheme === "prism"\n        ? { ceramic: 0xeee8ff, accent: 0xc45cff, glow: 0x78f6ff, canopy: 0x251948, canopyGlow: 0x6f2f9a, engine: 0x8ff7ff }\n        : { ceramic: 0xe4eef3, accent: 0x05bddd, glow: 0x2ee7ff, canopy: 0x082b48, canopyGlow: 0x064664, engine: 0x55dfff };\n  const ceramic = paint(enemy ? 0xa72224 : playerPalette.ceramic, 0.36, 0.48);\n  const cyan = paint(enemy ? 0xee6d28 : playerPalette.accent, 0.29, 0.5);\n  const edge = paint(0x11202b, 0.42, 0.62);\n  const silver = paint(0x7c8f9c, 0.33, 0.72);\n  const glow = emissive(enemy ? 0xff5b28 : playerPalette.glow, 1.5);\n  const canopy = new THREE.MeshPhysicalMaterial({\n    color: enemy ? 0x082b48 : playerPalette.canopy, metalness: 0.7, roughness: 0.13, clearcoat: 1,\n    clearcoatRoughness: 0.06, emissive: enemy ? 0x064664 : playerPalette.canopyGlow, emissiveIntensity: 0.18,\n  });''')
replace_once(path,
'''  engines(group,[-.67,.67],2.05,.31,enemy?0xff742e:0x55dfff);\n  bakeArcadeAirframe(group);\n  group.scale.setScalar(enemy ? (heavy ? .71 : .49) : 1.12);\n  group.userData.referenceAirframe = true;''',
'''  engines(group,[-.67,.67],2.05,.31,enemy?0xff742e:playerPalette.engine);\n  bakeArcadeAirframe(group);\n  group.scale.setScalar(enemy ? (heavy ? .71 : .49) : 1.12);\n  group.userData.referenceAirframe = true;\n  if (!enemy) group.userData.arcadePaintSchemeV116 = playerPaintScheme;''')

path = "src/sky/arcade/SkyDancerArcadeModels.ts"
replace_once(path,
'''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";''',
'''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";\nimport type { SkyDancerArcadePaintScheme } from "./SkyDancerArcadeProgress";''')
replace_once(path,
'''export function createSkyDancerArcadePlayer(): THREE.Group {\n  return createReferenceFighter();\n}''',
'''export function createSkyDancerArcadePlayer(paintScheme: SkyDancerArcadePaintScheme = "default"): THREE.Group {\n  return createReferenceFighter(false, false, paintScheme);\n}''')

# WebGL creates the player with the chosen paint.
path = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(path,
'''  private readonly player = createSkyDancerArcadePlayer();''',
'''  private readonly player: THREE.Group;''')
replace_once(path,
'''  private readonly engineGlows = this.player.getObjectsByProperty("name", "arcade-engine-glow");\n  private readonly engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");''',
'''  private readonly engineGlows: THREE.Object3D[];\n  private readonly engineTrails: THREE.Object3D[];''')
replace_once(path,
'''    this.mount = mount;\n    this.runtime = new SkyDancerArcadeRuntime(options);''',
'''    this.mount = mount;\n    this.player = createSkyDancerArcadePlayer(options.paintScheme ?? "default");\n    this.engineGlows = this.player.getObjectsByProperty("name", "arcade-engine-glow");\n    this.engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");\n    this.runtime = new SkyDancerArcadeRuntime(options);''')

# Product mode passes selected equipment to both runtime and renderer and surfaces it unobtrusively.
path = "app/SkyDancerArcadeMode.tsx"
replace_once(path,
'''    startStageId: request.practiceStageId,\n    seed: (request.seed ?? 0x51f15e) ^ Math.imul(runSerial + 1, 0x45d9f3b),\n  }), [request.difficulty, request.mode, request.practiceStageId, request.seed, runSerial]);''',
'''    startStageId: request.practiceStageId,\n    paintScheme: request.paintScheme ?? "default",\n    loadout: request.loadout ?? "standard",\n    seed: (request.seed ?? 0x51f15e) ^ Math.imul(runSerial + 1, 0x45d9f3b),\n  }), [request.difficulty, request.loadout, request.mode, request.paintScheme, request.practiceStageId, request.seed, runSerial]);''')
replace_once(path,
'''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? "3D FLIGHT · V11.4 MASTERY LOOP" : "COMPATIBILITY · CANVAS · V11.4"}</span>''',
'''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · V11.6 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · V11.6 · ${snapshot.loadout.toUpperCase()}`}</span>''')

# Title hangar: compact modal so the proven 393px title layout does not grow vertically.
path = "app/CartGameMenu.tsx"
replace_once(path,
'''  SKY_DANCER_ARCADE_MAX_MEDALS,\n  loadSkyDancerArcadeProgress,\n  skyDancerArcadeNextMasteryReward,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";''',
'''  SKY_DANCER_ARCADE_MAX_MEDALS,\n  loadSkyDancerArcadeProgress,\n  selectSkyDancerArcadeEquipment,\n  skyDancerArcadeNextMasteryReward,\n  type SkyDancerArcadeLoadout,\n  type SkyDancerArcadePaintScheme,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";''')
replace_once(path,
'''const MENU_RESUME_EVENT = "cart-rogue-menu-resume";\n\ntype PausePage''',
'''const MENU_RESUME_EVENT = "cart-rogue-menu-resume";\n\nconst PAINT_OPTIONS: readonly { id: SkyDancerArcadePaintScheme; label: string; unlock: number }[] = [\n  { id: "default", label: "CLASSIC", unlock: 0 },\n  { id: "sunset", label: "SUNSET", unlock: 6 },\n  { id: "storm", label: "STORM", unlock: 18 },\n  { id: "prism", label: "PRISM", unlock: 30 },\n];\n\nconst LOADOUT_OPTIONS: readonly { id: SkyDancerArcadeLoadout; label: string; detail: string; unlock: number }[] = [\n  { id: "standard", label: "STANDARD", detail: "BALANCED GUN / LOCK / MISSILE", unlock: 0 },\n  { id: "missile-focus", label: "MISSILE", detail: "LOCK +28% · MISSILE +22% · GUN -8%", unlock: 12 },\n  { id: "gun-focus", label: "GUN", detail: "GUN RATE +35% · DAMAGE +18% · MISSILE -8%", unlock: 24 },\n];\n\ntype PausePage''')
replace_once(path,
'''  const [arcadeMeta, setArcadeMeta] = useState(() => loadSkyDancerArcadeProgress());\n  const [hardSnapshot, setHardSnapshot]''',
'''  const [arcadeMeta, setArcadeMeta] = useState(() => loadSkyDancerArcadeProgress());\n  const [selectedPaintScheme, setSelectedPaintScheme] = useState<SkyDancerArcadePaintScheme>(arcadeMeta.selectedPaintScheme);\n  const [selectedLoadout, setSelectedLoadout] = useState<SkyDancerArcadeLoadout>(arcadeMeta.selectedLoadout);\n  const [hangarOpen, setHangarOpen] = useState(false);\n  const [hardSnapshot, setHardSnapshot]''')
replace_once(path,
'''    setPaused(false);\n    setPausePage("menu");\n    setHardSnapshot(null);\n    onStart({''',
'''    setPaused(false);\n    setPausePage("menu");\n    setHangarOpen(false);\n    setHardSnapshot(null);\n    onStart({''')
replace_once(path,
'''      practiceStageId: nextMode === "stage-practice" ? practiceStageId : undefined,\n      seed:''',
'''      practiceStageId: nextMode === "stage-practice" ? practiceStageId : undefined,\n      paintScheme: nextMode === "turbo-hunt" ? undefined : selectedPaintScheme,\n      loadout: nextMode === "turbo-hunt" ? undefined : selectedLoadout,\n      seed:''')
replace_once(path,
'''  const returnTitle = () => {''',
'''  const selectEquipment = (paintScheme: SkyDancerArcadePaintScheme, loadout: SkyDancerArcadeLoadout) => {\n    const next = selectSkyDancerArcadeEquipment(paintScheme, loadout);\n    setArcadeMeta(next);\n    setSelectedPaintScheme(next.selectedPaintScheme);\n    setSelectedLoadout(next.selectedLoadout);\n  };\n\n  const returnTitle = () => {''')
replace_once(path,
'''      setArcadeMeta(progress);\n      const cleared =''',
'''      setArcadeMeta(progress);\n      setSelectedPaintScheme(progress.selectedPaintScheme);\n      setSelectedLoadout(progress.selectedLoadout);\n      const cleared =''')
replace_once(path,
'''          <div className={`${styles.eyebrow} ${modeStyles.compactEyebrow}`}>HIGH SPEED AIR RAID ACTION</div>\n          <h1>''',
'''          <div className={`${styles.eyebrow} ${modeStyles.compactEyebrow}`}>HIGH SPEED AIR RAID ACTION</div>\n          {selectedMode !== "turbo-hunt" && (\n            <button className={modeStyles.hangarButton} onClick={() => setHangarOpen(true)} aria-label="Open hangar">\n              <strong>HANGAR</strong><small>{selectedPaintScheme.toUpperCase()} · {selectedLoadout.toUpperCase()}</small>\n            </button>\n          )}\n          <h1>''')
replace_once(path,
'''                ? `2 CONTINUES · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · MASTERY ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${masteryRewardSummary}${hard ? " · ACE PRESSURE" : ""}`\n                : `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3 · PILOT ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${masteryRewardSummary}${hard ? " · ACE DIFFICULTY" : ""}`}''',
'''                ? `2 CONTINUES · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · MASTERY ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${selectedPaintScheme.toUpperCase()} / ${selectedLoadout.toUpperCase()} · ${masteryRewardSummary}${hard ? " · ACE PRESSURE" : ""}`\n                : `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3 · PILOT ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${selectedPaintScheme.toUpperCase()} / ${selectedLoadout.toUpperCase()} · ${masteryRewardSummary}${hard ? " · ACE DIFFICULTY" : ""}`}''')
replace_once(path,
'''        </div>\n        <div className={styles.titleFooter}>ONE SKY · TWO STYLES · ELEVEN COURSES</div>''',
'''        </div>\n        {hangarOpen && selectedMode !== "turbo-hunt" && (\n          <div className={modeStyles.hangarOverlay} role="dialog" aria-label="Arcade hangar">\n            <div className={modeStyles.hangarPanel}>\n              <div className={modeStyles.hangarHeading}><span>PILOT CONFIGURATION</span><strong>HANGAR</strong><small>{arcadeMeta.totalMedals}/{SKY_DANCER_ARCADE_MAX_MEDALS} MASTERY MEDALS</small></div>\n              <section className={modeStyles.hangarSection} aria-label="Paint schemes">\n                <div><span>PAINT</span><small>VISUAL AIRFRAME IDENTITY</small></div>\n                <div className={modeStyles.hangarChoices}>\n                  {PAINT_OPTIONS.map((option) => {\n                    const unlocked = arcadeMeta.unlockedPaintSchemes.includes(option.id);\n                    return <button key={option.id} disabled={!unlocked} data-selected={selectedPaintScheme === option.id} onClick={() => selectEquipment(option.id, selectedLoadout)}><strong>{option.label}</strong><small>{unlocked ? (selectedPaintScheme === option.id ? "EQUIPPED" : "READY") : `${option.unlock}◆`}</small></button>;\n                  })}\n                </div>\n              </section>\n              <section className={modeStyles.hangarSection} aria-label="Weapon loadouts">\n                <div><span>LOADOUT</span><small>{LOADOUT_OPTIONS.find((option) => option.id === selectedLoadout)?.detail}</small></div>\n                <div className={modeStyles.hangarChoices}>\n                  {LOADOUT_OPTIONS.map((option) => {\n                    const unlocked = arcadeMeta.unlockedLoadouts.includes(option.id);\n                    return <button key={option.id} disabled={!unlocked} data-selected={selectedLoadout === option.id} onClick={() => selectEquipment(selectedPaintScheme, option.id)}><strong>{option.label}</strong><small>{unlocked ? (selectedLoadout === option.id ? "EQUIPPED" : "READY") : `${option.unlock}◆`}</small></button>;\n                  })}\n                </div>\n              </section>\n              <button className={modeStyles.hangarReady} onClick={() => setHangarOpen(false)}><strong>READY</strong><small>{selectedPaintScheme.toUpperCase()} · {selectedLoadout.toUpperCase()}</small></button>\n            </div>\n          </div>\n        )}\n        <div className={styles.titleFooter}>ONE SKY · TWO STYLES · ELEVEN COURSES</div>''')

# Hangar CSS is a fixed overlay; it adds zero height to the base 393px title composition.
path = "app/CartGameMenuModes.module.css"
p = Path(path)
s = p.read_text()
if "/* V11.6 — Hangar / Loadout */" not in s:
    s += r'''

/* V11.6 — Hangar / Loadout */
.modeTitlePanel { position: relative; }
.hangarButton {
  position: absolute; z-index: 3; top: 10px; right: 12px;
  min-width: 104px; padding: 6px 9px; border: 1px solid rgba(116,225,255,.32); border-radius: 10px;
  background: rgba(4,18,30,.64); color: #dffaff; font: inherit; touch-action: manipulation;
}
.hangarButton strong,.hangarButton small { display: block; }
.hangarButton strong { font-size: 8px; letter-spacing: .18em; }
.hangarButton small { margin-top: 2px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 5px; letter-spacing: .08em; color: rgba(255,255,255,.58); }
.hangarOverlay { position: fixed; z-index: 80; inset: 0; display: grid; place-items: center; padding: max(14px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left)); background: rgba(1,7,13,.78); backdrop-filter: blur(7px); }
.hangarPanel { width: min(680px,92vw); max-height: min(330px,88dvh); overflow: auto; box-sizing: border-box; padding: 15px 16px 14px; border: 1px solid rgba(116,225,255,.31); border-radius: 18px; background: linear-gradient(145deg,rgba(8,31,47,.98),rgba(3,13,24,.98)); box-shadow: 0 24px 70px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.08); color: white; }
.hangarHeading { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 1px 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(116,225,255,.14); text-align: left; }
.hangarHeading span { grid-column: 1/-1; color: #77e8ff; font-size: 6px; font-weight: 1000; letter-spacing: .2em; }
.hangarHeading strong { font-size: 24px; letter-spacing: .1em; }
.hangarHeading small { font-size: 7px; color: rgba(255,255,255,.5); }
.hangarSection { display: grid; grid-template-columns: 150px 1fr; align-items: center; gap: 9px; margin-top: 9px; text-align: left; }
.hangarSection > div:first-child span,.hangarSection > div:first-child small { display: block; }
.hangarSection > div:first-child span { color: #fff; font-size: 9px; font-weight: 1000; letter-spacing: .16em; }
.hangarSection > div:first-child small { margin-top: 3px; color: rgba(255,255,255,.46); font-size: 6px; line-height: 1.3; }
.hangarChoices { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0,1fr); gap: 6px; }
.hangarChoices button { min-width: 0; padding: 8px 5px 7px; border: 1px solid rgba(255,255,255,.13); border-radius: 9px; background: rgba(255,255,255,.035); color: rgba(255,255,255,.68); font: inherit; touch-action: manipulation; }
.hangarChoices button strong,.hangarChoices button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hangarChoices button strong { font-size: 8px; letter-spacing: .08em; }
.hangarChoices button small { margin-top: 3px; font-size: 6px; color: rgba(255,255,255,.44); }
.hangarChoices button[data-selected="true"] { border-color: #71e8ff; background: linear-gradient(145deg,rgba(34,138,178,.52),rgba(17,72,104,.56)); color: white; box-shadow: 0 0 15px rgba(72,221,255,.15); }
.hangarChoices button:disabled { opacity: .28; filter: saturate(.25); }
.hangarReady { display: block; width: min(260px,62vw); margin: 12px auto 0; padding: 8px 12px; border: 1px solid rgba(255,215,106,.5); border-radius: 11px; background: linear-gradient(145deg,rgba(174,112,17,.62),rgba(88,54,6,.62)); color: white; font: inherit; touch-action: manipulation; }
.hangarReady strong,.hangarReady small { display: block; }
.hangarReady strong { font-size: 11px; letter-spacing: .16em; }
.hangarReady small { margin-top: 2px; font-size: 6px; color: rgba(255,255,255,.6); }
@media (max-height: 430px) and (orientation: landscape) {
  .hangarButton { top: 3px; right: 5px; padding: 4px 6px; min-width: 94px; }
  .hangarPanel { max-height: 365px; padding: 9px 11px; }
  .hangarHeading { padding-bottom: 5px; }
  .hangarHeading strong { font-size: 20px; }
  .hangarSection { grid-template-columns: 130px 1fr; gap: 6px; margin-top: 6px; }
  .hangarChoices { gap: 4px; }
  .hangarChoices button { padding: 5px 4px; }
  .hangarReady { margin-top: 7px; padding-top: 6px; padding-bottom: 5px; }
}
@media (orientation: portrait) {
  .hangarButton { top: 24px; }
  .hangarSection { grid-template-columns: 1fr; }
  .hangarChoices { grid-auto-flow: row; grid-template-columns: repeat(2,minmax(0,1fr)); }
}
'''
    p.write_text(s)

# Regression contract for V11.6.
path = "tests/sky-arcade-run.test.ts"
p = Path(path)
s = p.read_text()
if 'V11.6 hangar selections persist and change the actual sortie profile' not in s:
    s += r'''

test("V11.6 hangar selections persist and change the actual sortie profile", async () => {
  const [progressSource, menuSource, runtimeSource, airframeSource, webglSource] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProgress.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceAirframes.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
  ]);
  assert.match(progressSource, /selectedPaintScheme: SkyDancerArcadePaintScheme/);
  assert.match(progressSource, /selectedLoadout: SkyDancerArcadeLoadout/);
  assert.match(progressSource, /selectSkyDancerArcadeEquipment/);
  assert.match(menuSource, /Open hangar/);
  assert.match(menuSource, /MISSILE \+22%/);
  assert.match(runtimeSource, /arcadeLoadoutGunCooldown/);
  assert.match(runtimeSource, /arcadeLoadoutLockInterval/);
  assert.match(runtimeSource, /arcadeLoadoutMissileDamage/);
  assert.match(airframeSource, /arcadePaintSchemeV116/);
  assert.match(airframeSource, /playerPaintScheme === "prism"/);
  assert.match(webglSource, /createSkyDancerArcadePlayer\(options\.paintScheme \?\? "default"\)/);

  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", paintScheme: "default", seed: 116 });
  const gun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", paintScheme: "prism", seed: 116 });
  standard.setFire(true);
  gun.setFire(true);
  for (let frame = 0; frame < 60; frame += 1) { standard.step(1 / 60); gun.step(1 / 60); }
  assert.equal(gun.getSnapshot().paintScheme, "prism");
  assert.equal(gun.getSnapshot().loadout, "gun-focus");
  assert.ok(gun.getSnapshot().shotSerial > standard.getSnapshot().shotSerial, `${gun.getSnapshot().shotSerial} > ${standard.getSnapshot().shotSerial}`);
});
'''
    p.write_text(s)

print("V11.6 hangar patch applied")
