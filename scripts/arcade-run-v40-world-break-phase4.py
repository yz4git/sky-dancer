from pathlib import Path

world_path = Path('src/sky/arcade/SkyDancerArcadeV40WorldBreak.ts')
runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
canvas_path = Path('src/sky/arcade/SkyDancerArcadeCanvasDemo.ts')
mode_path = Path('app/SkyDancerArcadeMode.tsx')
css_path = Path('app/SkyDancerArcadeMode.module.css')
foundation_test_path = Path('tests/sky-arcade-v40-world-break.test.ts')
phase4_test_path = Path('tests/sky-arcade-v40-world-break-phase4.test.ts')

world = world_path.read_text()
runtime = runtime_path.read_text()
webgl = webgl_path.read_text()
canvas = canvas_path.read_text()
mode = mode_path.read_text()
css = css_path.read_text()
foundation_test = foundation_test_path.read_text()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)


# -----------------------------------------------------------------------------
# World Break authored definitions: ICE CAVERN + FLOATING RUINS.
# -----------------------------------------------------------------------------
world = replace_once(world,
'''export interface SkyDancerArcadeV40StormLaneDefinition {
  index: number;
  progress: number;
  safeX: number;
  amplitude: number;
  phase: number;
  width: number;
  score: number;
}
''',
'''export interface SkyDancerArcadeV40StormLaneDefinition {
  index: number;
  progress: number;
  safeX: number;
  amplitude: number;
  phase: number;
  width: number;
  score: number;
}

export interface SkyDancerArcadeV40IceApertureDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  driftAmplitude: number;
  phase: number;
  radiusX: number;
  radiusY: number;
  score: number;
}

export type SkyDancerArcadeV40PortalDoctrine = "FLOW" | "SCORE" | "DANGER";

export interface SkyDancerArcadeV40PortalDefinition {
  index: number;
  x: number;
  y: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  score: number;
  scoreMultiplier: number;
  pressureScale: number;
  hpRecovery: number;
  turboRecovery: number;
}
''', 'phase4 authored interfaces')

world = replace_once(world,
'''  "ice-cavern": { stageId: "ice-cavern", objective: "ESCAPE THE COLLAPSE", signature: "CRYSTAL TUNNEL", live: false },
  "floating-ruins": { stageId: "floating-ruins", objective: "CHOOSE THE PORTAL", signature: "SKY LABYRINTH", live: false },''',
'''  "ice-cavern": { stageId: "ice-cavern", objective: "ESCAPE THE COLLAPSE", signature: "CRYSTAL TUNNEL", live: true },
  "floating-ruins": { stageId: "floating-ruins", objective: "CHOOSE THE PORTAL", signature: "SKY LABYRINTH", live: true },''', 'phase4 activate profiles')

world = replace_once(world,
'''export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE = 5200;
''',
'''export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE = 5200;

export const SKY_DANCER_ARCADE_V40_ICE_APERTURES: readonly SkyDancerArcadeV40IceApertureDefinition[] = [
  { index: 0, progress: .14, x: -.82, y: .18, driftAmplitude: .16, phase: .2, radiusX: .88, radiusY: .82, score: 1100 },
  { index: 1, progress: .185, x: .74, y: -.14, driftAmplitude: .22, phase: 1.35, radiusX: .8, radiusY: .75, score: 1350 },
  { index: 2, progress: .23, x: -.12, y: .34, driftAmplitude: .28, phase: 2.45, radiusX: .73, radiusY: .69, score: 1650 },
  { index: 3, progress: .275, x: .92, y: .04, driftAmplitude: .2, phase: 3.65, radiusX: .66, radiusY: .63, score: 2000 },
  { index: 4, progress: .325, x: -.66, y: -.24, driftAmplitude: .25, phase: 4.85, radiusX: .61, radiusY: .58, score: 2450 },
];
export const SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS = 4800;

export const SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS = .235;
export const SKY_DANCER_ARCADE_V40_FLOATING_PORTALS: readonly SkyDancerArcadeV40PortalDefinition[] = [
  { index: 0, x: -1.32, y: .12, radius: .76, doctrine: "FLOW", label: "FLOW PORTAL", score: 1200, scoreMultiplier: 1, pressureScale: 1.18, hpRecovery: 14, turboRecovery: 24 },
  { index: 1, x: 0, y: -.05, radius: .72, doctrine: "SCORE", label: "SCORE PORTAL", score: 2600, scoreMultiplier: 1.22, pressureScale: .96, hpRecovery: 4, turboRecovery: 10 },
  { index: 2, x: 1.32, y: .14, radius: .68, doctrine: "DANGER", label: "DANGER PORTAL", score: 4200, scoreMultiplier: 1.38, pressureScale: .8, hpRecovery: 0, turboRecovery: 8 },
];
''', 'phase4 authored constants')

world = replace_once(world,
'''export function skyDancerArcadeV40FortressBreachAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS;
}
''',
'''export function skyDancerArcadeV40FortressBreachAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS;
}

export function skyDancerArcadeV40IceApertureAnchorDistance(
  aperture: SkyDancerArcadeV40IceApertureDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * aperture.progress;
}

export function skyDancerArcadeV40IceApertureX(aperture: SkyDancerArcadeV40IceApertureDefinition, stageTimeSeconds: number): number {
  return aperture.x + Math.sin(Math.max(0, stageTimeSeconds) * 1.72 + aperture.phase) * aperture.driftAmplitude;
}

export function skyDancerArcadeV40IceApertureScale(depth: number): number {
  const approach = Math.max(0, Math.min(1, Math.max(0, depth) / 42));
  return .52 + approach * .48;
}

export function skyDancerArcadeV40FloatingPortalAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS;
}
''', 'phase4 authored helpers')


# -----------------------------------------------------------------------------
# Runtime simulation + snapshot.
# -----------------------------------------------------------------------------
runtime = replace_once(runtime,
'''  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,''',
'''  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,''', 'phase4 runtime constants imports')

runtime = replace_once(runtime,
'''  skyDancerArcadeV40FortressBreachAnchorDistance,
  skyDancerArcadeV40StormLaneAnchorDistance,''',
'''  skyDancerArcadeV40FortressBreachAnchorDistance,
  skyDancerArcadeV40FloatingPortalAnchorDistance,
  skyDancerArcadeV40IceApertureAnchorDistance,
  skyDancerArcadeV40IceApertureScale,
  skyDancerArcadeV40IceApertureX,
  skyDancerArcadeV40StormLaneAnchorDistance,''', 'phase4 runtime helper imports')

runtime = replace_once(runtime,
'''  type SkyDancerArcadeV40RouteDoctrine,
} from "./SkyDancerArcadeV40WorldBreak";''',
'''  type SkyDancerArcadeV40PortalDoctrine,
  type SkyDancerArcadeV40RouteDoctrine,
} from "./SkyDancerArcadeV40WorldBreak";''', 'phase4 runtime type import')

runtime = replace_once(runtime,
'''export interface SkyDancerArcadeWorldBreakGateSnapshot {
  id: number;
  index: number;
  x: number;
  y: number;
  depth: number;
  radiusX: number;
  radiusY: number;
  resolved: boolean;
  success: boolean | null;
}
''',
'''export interface SkyDancerArcadeWorldBreakGateSnapshot {
  id: number;
  index: number;
  x: number;
  y: number;
  depth: number;
  radiusX: number;
  radiusY: number;
  resolved: boolean;
  success: boolean | null;
}

export interface SkyDancerArcadeWorldBreakPortalSnapshot {
  index: number;
  x: number;
  y: number;
  depth: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  selected: boolean;
}
''', 'phase4 portal snapshot interface')

runtime = replace_once(runtime,
'''  worldBreakFortressBreachRadiusY: number;
  worldBreakFortressSerial: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  worldBreakFortressBreachRadiusY: number;
  worldBreakFortressSerial: number;
  worldBreakIceActive: boolean;
  worldBreakIceX: number;
  worldBreakIceY: number;
  worldBreakIceRadiusX: number;
  worldBreakIceRadiusY: number;
  worldBreakIceDepth: number;
  worldBreakIceIndex: number;
  worldBreakIceHits: number;
  worldBreakIceMisses: number;
  worldBreakIceSerial: number;
  worldBreakIceTotal: number;
  worldBreakIcePerfect: boolean;
  worldBreakPortalActive: boolean;
  worldBreakPortalChoiceIndex: number;
  worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE";
  worldBreakPortalSerial: number;
  worldBreakPortalDepth: number;
  worldBreakPortalScoreMultiplier: number;
  worldBreakPortalPressureScale: number;
  worldBreakPortals: SkyDancerArcadeWorldBreakPortalSnapshot[];
  enemies: SkyDancerArcadeEnemySnapshot[];''', 'phase4 runtime snapshot fields')

runtime = replace_once(runtime,
'''  private worldBreakFortressBreachSuccess = false;
  private worldBreakFortressSerial = 0;
  private nextEntityId = 1;''',
'''  private worldBreakFortressBreachSuccess = false;
  private worldBreakFortressSerial = 0;
  private worldBreakIceHits = 0;
  private worldBreakIceMisses = 0;
  private worldBreakIceSerial = 0;
  private readonly worldBreakResolvedIceApertureIndices = new Set<number>();
  private worldBreakPortalChoiceIndex = -1;
  private worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE" = "NONE";
  private worldBreakPortalSerial = 0;
  private nextEntityId = 1;''', 'phase4 runtime state')

runtime = replace_once(runtime,
'''      this.worldBreakFortressBreachOpen = false;
      this.worldBreakFortressBreachResolved = false;
      this.worldBreakFortressBreachSuccess = false;
    }''',
'''      this.worldBreakFortressBreachOpen = false;
      this.worldBreakFortressBreachResolved = false;
      this.worldBreakFortressBreachSuccess = false;
      this.worldBreakIceHits = 0;
      this.worldBreakIceMisses = 0;
      this.worldBreakResolvedIceApertureIndices.clear();
      this.worldBreakPortalChoiceIndex = -1;
      this.worldBreakPortalDoctrine = "NONE";
    }''', 'phase4 runtime reset')

runtime = replace_once(runtime,
'''    this.updateWorldBreakStormGrid();
    this.updateWorldBreakFortressBreach();
    this.updateBranch();''',
'''    this.updateWorldBreakStormGrid();
    this.updateWorldBreakFortressBreach();
    this.updateWorldBreakIceCollapse();
    this.updateWorldBreakFloatingPortal();
    this.updateBranch();''', 'phase4 runtime step')

phase4_methods = '''
  private updateWorldBreakIceCollapse(): void {
    if (this.stage.id !== "ice-cavern") return;
    for (const aperture of SKY_DANCER_ARCADE_V40_ICE_APERTURES) {
      if (this.worldBreakResolvedIceApertureIndices.has(aperture.index)) continue;
      const anchorDistance = skyDancerArcadeV40IceApertureAnchorDistance(aperture, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) return;
      const safeX = skyDancerArcadeV40IceApertureX(aperture, this.stageTime);
      const scale = skyDancerArcadeV40IceApertureScale(depth);
      const dx = (this.playerX - safeX) / Math.max(.2, aperture.radiusX * scale);
      const dy = (this.playerY - aperture.y) / Math.max(.2, aperture.radiusY * scale);
      const clean = Math.hypot(dx, dy) <= 1;
      this.worldBreakResolvedIceApertureIndices.add(aperture.index);
      this.worldBreakIceSerial += 1;
      if (clean) {
        this.worldBreakIceHits += 1;
        const awarded = this.addScore(aperture.score + this.worldBreakIceHits * 170, true);
        this.turbo = Math.min(100, this.turbo + 6);
        this.message = `CRYSTAL TUNNEL · APERTURE ${aperture.index + 1} CLEAR · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakIceMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 14 : 10);
        this.message = `CRYSTAL TUNNEL · COLLAPSE HIT ${aperture.index + 1}`;
        this.messageTimer = 1.05;
      }
      if (this.worldBreakResolvedIceApertureIndices.size >= SKY_DANCER_ARCADE_V40_ICE_APERTURES.length && this.worldBreakIceMisses === 0) {
        const awarded = this.addScore(SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS, true);
        this.turbo = Math.min(100, this.turbo + 18);
        this.worldBreakIceSerial += 1;
        this.message = `WORLD BREAK · CRYSTAL ESCAPE PERFECT · +${awarded}`;
        this.messageTimer = 1.5;
      }
      return;
    }
  }

  private worldBreakPortalDefinition() {
    return SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.find((portal) => portal.index === this.worldBreakPortalChoiceIndex) ?? null;
  }

  private updateWorldBreakFloatingPortal(): void {
    if (this.stage.id !== "floating-ruins" || this.worldBreakPortalChoiceIndex >= 0) return;
    const anchorDistance = skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    const depth = anchorDistance - this.distance;
    if (depth > 2.4) return;
    const portal = [...SKY_DANCER_ARCADE_V40_FLOATING_PORTALS]
      .sort((a, b) => Math.abs(this.playerX - a.x) - Math.abs(this.playerX - b.x))[0];
    if (!portal) return;
    this.worldBreakPortalChoiceIndex = portal.index;
    this.worldBreakPortalDoctrine = portal.doctrine;
    this.worldBreakPortalSerial += 1;
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + portal.hpRecovery);
    this.turbo = Math.min(100, this.turbo + portal.turboRecovery);
    const awarded = this.addScore(portal.score, portal.doctrine !== "FLOW");
    this.message = `SKY LABYRINTH · ${portal.label} · +${awarded}`;
    this.messageTimer = 1.55;
  }

'''
runtime = replace_once(runtime,
'''  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''',
phase4_methods + '''  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''', 'phase4 runtime methods')

runtime = replace_once(runtime,
'''    const worldBreakPressureScale = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale;''',
'''    const portalPressureScale = this.stage.id === "floating-ruins" ? (this.worldBreakPortalDefinition()?.pressureScale ?? 1) : 1;
    const worldBreakPressureScale = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale * portalPressureScale;''', 'phase4 portal director effect')

runtime = replace_once(runtime,
'''    const routeMultiplier = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier;
    const awarded = Math.round(base * chainMultiplier * riskMultiplier * routeMultiplier);''',
'''    const routeMultiplier = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier;
    const portalMultiplier = this.stage.id === "floating-ruins" ? (this.worldBreakPortalDefinition()?.scoreMultiplier ?? 1) : 1;
    const awarded = Math.round(base * chainMultiplier * riskMultiplier * routeMultiplier * portalMultiplier);''', 'phase4 portal score effect')

runtime = replace_once(runtime,
'''    const fortressBreachDepth = this.stage.id === "desert-fortress"
      ? skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const activeStageCount''',
'''    const fortressBreachDepth = this.stage.id === "desert-fortress"
      ? skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const iceAperture = this.stage.id === "ice-cavern"
      ? SKY_DANCER_ARCADE_V40_ICE_APERTURES.find((aperture) => !this.worldBreakResolvedIceApertureIndices.has(aperture.index)) ?? null
      : null;
    const iceDepth = iceAperture
      ? skyDancerArcadeV40IceApertureAnchorDistance(iceAperture, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const iceScale = iceAperture ? skyDancerArcadeV40IceApertureScale(iceDepth) : 1;
    const portalDepth = this.stage.id === "floating-ruins"
      ? skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const portalDefinition = this.worldBreakPortalDefinition();
    const activeStageCount''', 'phase4 snapshot locals')

runtime = replace_once(runtime,
'''      worldBreakFortressBreachRadiusY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
      worldBreakFortressSerial: this.worldBreakFortressSerial,
      enemies:''',
'''      worldBreakFortressBreachRadiusY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
      worldBreakFortressSerial: this.worldBreakFortressSerial,
      worldBreakIceActive: Boolean(iceAperture && iceDepth > -10 && iceDepth < 145),
      worldBreakIceX: iceAperture ? skyDancerArcadeV40IceApertureX(iceAperture, this.stageTime) : 0,
      worldBreakIceY: iceAperture?.y ?? 0,
      worldBreakIceRadiusX: (iceAperture?.radiusX ?? 0) * iceScale,
      worldBreakIceRadiusY: (iceAperture?.radiusY ?? 0) * iceScale,
      worldBreakIceDepth: iceDepth,
      worldBreakIceIndex: iceAperture?.index ?? -1,
      worldBreakIceHits: this.worldBreakIceHits,
      worldBreakIceMisses: this.worldBreakIceMisses,
      worldBreakIceSerial: this.worldBreakIceSerial,
      worldBreakIceTotal: this.stage.id === "ice-cavern" ? SKY_DANCER_ARCADE_V40_ICE_APERTURES.length : 0,
      worldBreakIcePerfect: this.stage.id === "ice-cavern"
        && this.worldBreakResolvedIceApertureIndices.size >= SKY_DANCER_ARCADE_V40_ICE_APERTURES.length
        && this.worldBreakIceMisses === 0,
      worldBreakPortalActive: this.stage.id === "floating-ruins" && this.worldBreakPortalChoiceIndex < 0 && portalDepth > -10 && portalDepth < 145,
      worldBreakPortalChoiceIndex: this.worldBreakPortalChoiceIndex,
      worldBreakPortalDoctrine: this.worldBreakPortalDoctrine,
      worldBreakPortalSerial: this.worldBreakPortalSerial,
      worldBreakPortalDepth: portalDepth,
      worldBreakPortalScoreMultiplier: portalDefinition?.scoreMultiplier ?? 1,
      worldBreakPortalPressureScale: portalDefinition?.pressureScale ?? 1,
      worldBreakPortals: this.stage.id === "floating-ruins"
        ? SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.map((portal) => ({
            index: portal.index, x: portal.x, y: portal.y, depth: portalDepth, radius: portal.radius,
            doctrine: portal.doctrine, label: portal.label, selected: portal.index === this.worldBreakPortalChoiceIndex,
          }))
        : [],
      enemies:''', 'phase4 snapshot values')

runtime = replace_once(runtime,
'''  triggerV40FortressBreachForTests(clean: boolean): void {
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_X : PLAYER_X_LIMIT;
    this.playerY = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y : PLAYER_Y_LIMIT;
    this.updateWorldBreakFortressBreach();
  }
''',
'''  triggerV40FortressBreachForTests(clean: boolean): void {
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_X : PLAYER_X_LIMIT;
    this.playerY = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y : PLAYER_Y_LIMIT;
    this.updateWorldBreakFortressBreach();
  }

  triggerV40IceApertureForTests(index: number, clean: boolean): void {
    const aperture = SKY_DANCER_ARCADE_V40_ICE_APERTURES.find((candidate) => candidate.index === index);
    if (!aperture) return;
    const anchorDistance = skyDancerArcadeV40IceApertureAnchorDistance(aperture, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const safeX = skyDancerArcadeV40IceApertureX(aperture, this.stageTime);
    this.playerX = clean ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? clamp(aperture.y, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    this.updateWorldBreakIceCollapse();
  }

  triggerV40FloatingPortalForTests(index: number): void {
    const portal = SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.find((candidate) => candidate.index === index);
    if (!portal) return;
    const anchorDistance = skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clamp(portal.x, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(portal.y, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.updateWorldBreakFloatingPortal();
  }
''', 'phase4 deterministic hooks')


# -----------------------------------------------------------------------------
# WebGL physical guides + audio cues.
# -----------------------------------------------------------------------------
webgl = replace_once(webgl,
'''  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly worldBreakStormRoot = new THREE.Group();
  private readonly worldBreakFortressRoot = new THREE.Group();''',
'''  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly worldBreakStormRoot = new THREE.Group();
  private readonly worldBreakFortressRoot = new THREE.Group();
  private readonly worldBreakIceRoot = new THREE.Group();
  private readonly worldBreakPortalRoot = new THREE.Group();''', 'phase4 webgl roots')

webgl = replace_once(webgl,
'''    this.worldBreakFortressRoot.name = "arcade-world-break-fortress-gate";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot);''',
'''    this.worldBreakFortressRoot.name = "arcade-world-break-fortress-gate";
    this.worldBreakIceRoot.name = "arcade-world-break-crystal-collapse";
    this.worldBreakPortalRoot.name = "arcade-world-break-sky-labyrinth";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);''', 'phase4 webgl root attach')

webgl = replace_once(webgl,
'''    this.syncWorldBreakStormLane(snapshot);
    this.syncWorldBreakFortressBreach(snapshot);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncWorldBreakStormLane(snapshot);
    this.syncWorldBreakFortressBreach(snapshot);
    this.syncWorldBreakIceCollapse(snapshot);
    this.syncWorldBreakFloatingPortals(snapshot);
    this.syncBranchGates(snapshot, delta);''', 'phase4 webgl sync calls')

webgl_methods = '''
  private syncWorldBreakIceCollapse(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "ice-cavern" && snapshot.worldBreakIceActive && snapshot.worldBreakIceIndex >= 0;
    this.worldBreakIceRoot.visible = active;
    if (!active) return;
    if (this.worldBreakIceRoot.children.length === 0) {
      const crystal = new THREE.MeshBasicMaterial({ color: 0xb7f5ff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, .17, 5, 8), crystal.clone());
      ring.name = "arcade-world-break-ice-ring";
      ring.rotation.z = Math.PI / 8;
      this.worldBreakIceRoot.add(ring);
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(.38, 2.2, 4), crystal.clone());
        shard.position.set(Math.cos(angle) * 6.1, Math.sin(angle) * 5.4, 0);
        shard.rotation.z = angle - Math.PI / 2;
        shard.name = "arcade-world-break-ice-shard";
        this.worldBreakIceRoot.add(shard);
      }
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakIceDepth);
    this.worldBreakIceRoot.position.set(snapshot.worldBreakIceX * 8.4 + course.x, 1.2 + snapshot.worldBreakIceY * 4.9 + course.y, course.z);
    this.worldBreakIceRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const sx = Math.max(.45, snapshot.worldBreakIceRadiusX / .72);
    const sy = Math.max(.45, snapshot.worldBreakIceRadiusY / .69);
    this.worldBreakIceRoot.scale.set(sx, sy, 1);
    const pulse = .58 + Math.sin(snapshot.runTimeSeconds * 14 + snapshot.worldBreakIceIndex) * .16;
    this.worldBreakIceRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.opacity = object.name === "arcade-world-break-ice-ring" ? .72 + pulse * .12 : .38 + pulse * .2;
    });
  }

  private syncWorldBreakFloatingPortals(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "floating-ruins" && (snapshot.worldBreakPortalActive || snapshot.worldBreakPortalChoiceIndex >= 0) && snapshot.worldBreakPortalDepth > -18;
    this.worldBreakPortalRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPortalRoot.children.length === 0) {
      const colors = [0x76efff, 0xffdd73, 0xff6e96];
      for (let index = 0; index < 3; index += 1) {
        const group = new THREE.Group();
        group.name = `arcade-world-break-portal-${index}`;
        const material = new THREE.MeshBasicMaterial({ color: colors[index], transparent: true, opacity: .76, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        const outer = new THREE.Mesh(new THREE.TorusGeometry(4.25, .22, 7, 40), material.clone());
        const inner = new THREE.Mesh(new THREE.TorusGeometry(3.35, .07, 5, 32), material.clone());
        inner.rotation.z = Math.PI / 5;
        group.add(outer, inner);
        this.worldBreakPortalRoot.add(group);
      }
    }
    for (const portal of snapshot.worldBreakPortals) {
      const group = this.worldBreakPortalRoot.getObjectByName(`arcade-world-break-portal-${portal.index}`);
      if (!group) continue;
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, portal.depth);
      group.position.set(portal.x * 8.4 + course.x, 1.2 + portal.y * 4.9 + course.y, course.z);
      group.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * (portal.index === 1 ? -.34 : .34));
      const selected = portal.selected;
      const dismissed = snapshot.worldBreakPortalChoiceIndex >= 0 && !selected;
      group.visible = !dismissed;
      group.scale.setScalar(selected ? 1.35 : 1 + Math.sin(snapshot.runTimeSeconds * 5 + portal.index) * .04);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.opacity = selected ? .95 : .66;
      });
    }
  }

'''
webgl = replace_once(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
webgl_methods + '''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''', 'phase4 webgl methods')

webgl = replace_once(webgl,
'''    if (snapshot.worldBreakTargetSerial !== this.previousSnapshot.worldBreakTargetSerial) {
      const destroyed = snapshot.worldBreakTargetHits > this.previousSnapshot.worldBreakTargetHits;
      this.audio.tone(destroyed ? 128 : 190, destroyed ? .24 : .13, destroyed ? .045 : .02, destroyed ? "sawtooth" : "triangle");
      if (destroyed) this.presentation.emitRushAccent();
    }
    const incoming''',
'''    if (snapshot.worldBreakTargetSerial !== this.previousSnapshot.worldBreakTargetSerial) {
      const destroyed = snapshot.worldBreakTargetHits > this.previousSnapshot.worldBreakTargetHits;
      this.audio.tone(destroyed ? 128 : 190, destroyed ? .24 : .13, destroyed ? .045 : .02, destroyed ? "sawtooth" : "triangle");
      if (destroyed) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakIceSerial !== this.previousSnapshot.worldBreakIceSerial) {
      const clean = snapshot.worldBreakIceHits > this.previousSnapshot.worldBreakIceHits;
      this.audio.tone(clean ? 1160 : 150, clean ? .1 : .2, clean ? .024 : .04, clean ? "triangle" : "sawtooth");
      if (snapshot.worldBreakIcePerfect && !this.previousSnapshot.worldBreakIcePerfect) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakPortalSerial !== this.previousSnapshot.worldBreakPortalSerial) {
      const frequency = snapshot.worldBreakPortalDoctrine === "DANGER" ? 250 : snapshot.worldBreakPortalDoctrine === "SCORE" ? 720 : 980;
      this.audio.tone(frequency, .2, .032, snapshot.worldBreakPortalDoctrine === "DANGER" ? "sawtooth" : "triangle");
      this.presentation.emitRushAccent();
    }
    const incoming''', 'phase4 webgl audio')

webgl = replace_once(webgl,
'''    for (const child of this.worldBreakFortressRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''',
'''    for (const child of this.worldBreakFortressRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakIceRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPortalRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''', 'phase4 webgl dispose roots')

webgl = replace_once(webgl,
'''    this.worldBreakStormRoot.clear();
    this.worldBreakFortressRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot);''',
'''    this.worldBreakStormRoot.clear();
    this.worldBreakFortressRoot.clear();
    this.worldBreakIceRoot.clear();
    this.worldBreakPortalRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);''', 'phase4 webgl clear roots')


# -----------------------------------------------------------------------------
# Canvas fallback parity.
# -----------------------------------------------------------------------------
canvas = replace_once(canvas,
'''    this.drawWorldBreakStormLane(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFortressBreach(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawWorldBreakStormLane(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFortressBreach(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakIceCollapse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFloatingPortals(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''', 'phase4 canvas calls')

canvas_methods = '''
  private drawWorldBreakIceCollapse(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakIceActive || snapshot.worldBreakIceIndex < 0) return;
    const center = this.project(snapshot.worldBreakIceX, snapshot.worldBreakIceY, snapshot.worldBreakIceDepth, width, height);
    const rx = Math.max(20, center.scale * snapshot.worldBreakIceRadiusX * 43);
    const ry = Math.max(18, center.scale * snapshot.worldBreakIceRadiusY * 38);
    context.save();
    context.translate(center.x, center.y);
    context.rotate(Math.PI / 4);
    context.strokeStyle = "#b7f5ff";
    context.lineWidth = Math.max(2.2, center.scale * 3);
    context.globalAlpha = .86;
    context.strokeRect(-rx, -ry, rx * 2, ry * 2);
    context.globalAlpha = .48;
    context.strokeRect(-rx * .78, -ry * .78, rx * 1.56, ry * 1.56);
    context.restore();
    context.fillStyle = "#d8fbff";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`COLLAPSE ${snapshot.worldBreakIceIndex + 1}/${snapshot.worldBreakIceTotal}`, center.x, center.y - ry - 8);
  }

  private drawWorldBreakFloatingPortals(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "floating-ruins" || snapshot.worldBreakPortals.length === 0 || snapshot.worldBreakPortalDepth < -18) return;
    const colors = ["#76efff", "#ffdd73", "#ff6e96"];
    for (const portal of snapshot.worldBreakPortals) {
      if (snapshot.worldBreakPortalChoiceIndex >= 0 && !portal.selected) continue;
      const p = this.project(portal.x, portal.y, portal.depth, width, height);
      const radius = Math.max(22, p.scale * portal.radius * 44);
      context.save();
      context.strokeStyle = colors[portal.index] ?? "#fff";
      context.lineWidth = portal.selected ? 6 : 3;
      context.globalAlpha = portal.selected ? .96 : .78;
      context.beginPath();
      context.arc(p.x, p.y, portal.selected ? radius * 1.2 : radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(p.x, p.y, radius * .72, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = colors[portal.index] ?? "#fff";
      context.font = "800 9px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(portal.doctrine, p.x, p.y - radius - 6);
      context.restore();
    }
  }

'''
canvas = replace_once(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
canvas_methods + '''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''', 'phase4 canvas methods')


# -----------------------------------------------------------------------------
# HUD telemetry.
# -----------------------------------------------------------------------------
mode = replace_once(mode,
'''              {snapshot.stage.id === "desert-fortress" ? ` · BREACH ${snapshot.worldBreakFortressBreachResolved ? snapshot.worldBreakFortressBreachSuccess ? "CLEAR" : "FAILED" : snapshot.worldBreakFortressBreachOpen ? "OPEN" : "LOCKED"}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''',
'''              {snapshot.stage.id === "desert-fortress" ? ` · BREACH ${snapshot.worldBreakFortressBreachResolved ? snapshot.worldBreakFortressBreachSuccess ? "CLEAR" : "FAILED" : snapshot.worldBreakFortressBreachOpen ? "OPEN" : "LOCKED"}` : ""}
              {snapshot.stage.id === "ice-cavern" ? ` · ESCAPE ${snapshot.worldBreakIceHits + snapshot.worldBreakIceMisses}/${snapshot.worldBreakIceTotal}${snapshot.worldBreakIceIndex >= 0 ? ` · APERTURE ${snapshot.worldBreakIceIndex + 1}` : snapshot.worldBreakIcePerfect ? " · PERFECT" : ""}` : ""}
              {snapshot.stage.id === "floating-ruins" ? ` · PORTAL ${snapshot.worldBreakPortalDoctrine}${snapshot.worldBreakPortalChoiceIndex >= 0 ? ` ×${snapshot.worldBreakPortalScoreMultiplier.toFixed(2)}` : " · CHOOSE"}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''', 'phase4 HUD telemetry')

css += '''\n\n/* Arcade Run V40 WORLD BREAK phase 4: collapse/portal telemetry stays legible on compact iPhone landscape. */\n.worldBreakLine{max-width:min(720px,86vw)}\n'''

foundation_test = replace_once(foundation_test,
'''  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 5);''',
'''  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 7);''', 'phase4 foundation live count')

phase4_test = '''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 4 activates Ice Cavern and Floating Ruins as physical World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").signature, "CRYSTAL TUNNEL");
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").signature, "SKY LABYRINTH");
});

test("V40 Ice Cavern resolves shrinking apertures and rewards a perfect escape", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "ice-cavern", seed: 4048 });
  const before = runtime.getSnapshot().score;
  for (const aperture of SKY_DANCER_ARCADE_V40_ICE_APERTURES) runtime.triggerV40IceApertureForTests(aperture.index, true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakIceHits, SKY_DANCER_ARCADE_V40_ICE_APERTURES.length);
  assert.equal(snapshot.worldBreakIceMisses, 0);
  assert.equal(snapshot.worldBreakIcePerfect, true);
  assert.ok(snapshot.score > before);
});

test("V40 Ice Cavern collapse can damage the player without ending the stage objective", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "ice-cavern", seed: 4049 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40IceApertureForTests(0, false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakIceMisses, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.equal(snapshot.worldBreakIceIndex, 1);
});

test("V40 Floating Ruins portals alter the following section score/pressure contract", () => {
  const flowRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "floating-ruins", seed: 4050 });
  flowRun.triggerV40FloatingPortalForTests(0);
  const flow = flowRun.getSnapshot();
  assert.equal(flow.worldBreakPortalDoctrine, "FLOW");
  assert.equal(flow.worldBreakPortalChoiceIndex, 0);

  const dangerRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "floating-ruins", seed: 4051 });
  dangerRun.triggerV40FloatingPortalForTests(2);
  const danger = dangerRun.getSnapshot();
  assert.equal(danger.worldBreakPortalDoctrine, "DANGER");
  assert.ok(danger.worldBreakPortalScoreMultiplier > flow.worldBreakPortalScoreMultiplier);
  assert.ok(danger.worldBreakPortalPressureScale < flow.worldBreakPortalPressureScale);
  assert.equal(danger.worldBreakPortals.filter((portal) => portal.selected).length, 1);
  assert.equal(danger.worldBreakPortals.length, SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.length);
});

test("V40 phase 4 keeps WebGL and Canvas parity for crystal and portal objectives", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakIceCollapse\(snapshot\)/);
  assert.match(webgl, /syncWorldBreakFloatingPortals\(snapshot\)/);
  assert.match(webgl, /worldBreakIceRoot/);
  assert.match(webgl, /worldBreakPortalRoot/);
  assert.match(canvas, /drawWorldBreakIceCollapse\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakFloatingPortals\(context, snapshot/);
});
'''

world_path.write_text(world)
runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
canvas_path.write_text(canvas)
mode_path.write_text(mode)
css_path.write_text(css)
foundation_test_path.write_text(foundation_test)
phase4_test_path.write_text(phase4_test)
