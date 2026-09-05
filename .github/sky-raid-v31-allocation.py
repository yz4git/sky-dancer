from pathlib import Path

path = Path('src/sky/SkyDancerSkyRaid.ts')
source = path.read_text()

def rep(before: str, after: str, label: str) -> None:
    global source
    if before not in source:
        raise SystemExit(f'V31 marker missing: {label}')
    source = source.replace(before, after, 1)

rep(
    'import { CartArenaSession } from "../cart/CartArenaSession";\n',
    'import { CartArenaSession } from "../cart/CartArenaSession";\nimport type { CartEnemyState } from "../cart/CartCombat";\n',
    'enemy state import',
)

rep(
'''interface RaidSession {
  gas: number;
  rewardTimer: number;
  lastReward: string | null;
  car: {
    boostActive: boolean;
    boostCharges: number;
    addBoostCharge(amount: number): void;
    definition: { maxSpeed: number; handling: number };
  };
  step(input: RallyInputState, fixedDelta?: number): void;
}''',
'''interface RaidSession {
  gas: number;
  rewardTimer: number;
  lastReward: string | null;
  location: { node: { id: string } };
  car: {
    position: { x: number; z: number };
    heading: number;
    speed: number;
    boostActive: boolean;
    boostCharges: number;
    addBoostCharge(amount: number): void;
    definition: { maxSpeed: number; handling: number };
  };
  step(input: RallyInputState, fixedDelta?: number): void;
}''',
'runtime scalar view')

rep(
'''  speedColor: THREE.Color;
  turboBackdrop: THREE.Object3D | null;''',
'''  speedColor: THREE.Color;
  attackTelegraphs: Map<string, SkyDancerEnemyAttackTelegraphSnapshot>;
  turboBackdrop: THREE.Object3D | null;''',
'telegraph map cache')

rep(
'''const raidStateBySession = new WeakMap<object, RaidState>();''',
'''interface RaidScreenCandidate {
  enemy: CartEnemyState | null;
  group: THREE.Group | null;
  penalty: number;
}

interface RaidScreenEngagementState {
  nextAllowedAt: number;
  cursor: number;
  recycles: number;
  projection: THREE.Vector3;
  candidates: [RaidScreenCandidate, RaidScreenCandidate, RaidScreenCandidate];
}

const raidStateBySession = new WeakMap<object, RaidState>();''',
'screen scratch types')

rep(
'''const raidScreenEngagementByDemo = new WeakMap<object, { nextAllowedAt: number; cursor: number; recycles: number }>();
const skyRaidCameraPlayerPosition = new THREE.Vector3();''',
'''const raidScreenEngagementByDemo = new WeakMap<object, RaidScreenEngagementState>();
const raidInputBySession = new WeakMap<object, RallyInputState>();
const raidRoleKitByEnemyGroup = new WeakMap<THREE.Group, THREE.Group>();
const raidAttackTelegraphObjectsByKit = new WeakMap<THREE.Group, readonly THREE.Object3D[]>();
const skyRaidCameraPlayerPosition = new THREE.Vector3();''',
'scratch weakmaps')

rep(
'''export function skyDancerSkyRaidSteerInput(value: number): number {
  // The inherited Cart controller aggressively quickens steering after this
  // point. Keep fine stick movement unchanged, but cap large deflections so
  // the aircraft cannot snap-turn on a phone-sized virtual stick.
  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);
}

function isSkyRaidMode(): boolean {''',
'''export function skyDancerSkyRaidSteerInput(value: number): number {
  // The inherited Cart controller aggressively quickens steering after this
  // point. Keep fine stick movement unchanged, but cap large deflections so
  // the aircraft cannot snap-turn on a phone-sized virtual stick.
  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);
}

function skyRaidInputFor(session: RaidSession, input: RallyInputState): RallyInputState {
  const key = session as unknown as object;
  let scratch = raidInputBySession.get(key);
  if (!scratch) {
    scratch = { throttle: 0, brake: 0, steer: 0, strafe: 0, boost: false };
    raidInputBySession.set(key, scratch);
  }
  scratch.throttle = input.throttle;
  scratch.brake = input.brake;
  scratch.steer = skyDancerSkyRaidSteerInput(input.steer);
  scratch.strafe = input.strafe;
  scratch.boost = input.boost;
  return scratch;
}

function isSkyRaidMode(): boolean {''',
'reusable input')

rep(
'''  root.userData.skyRaidAttackTelegraphCount = root.children.reduce(
    (count, child) => count + (child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME ? 1 : 0),
    0,
  );''',
'''  const attackTelegraphObjects = root.children.filter((child) => child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME);
  root.userData.skyRaidAttackTelegraphCount = attackTelegraphObjects.length;
  raidAttackTelegraphObjectsByKit.set(root, attackTelegraphObjects);''',
'telegraph child cache')

rep(
'''  const active = Boolean(telegraph) && Number(kit.userData.skyRaidAttackTelegraphCount ?? 0) > 0;
  const intensity = telegraph?.intensity ?? 0;
  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;
  for (const object of kit.children) {
    if (object.name !== SKY_RAID_ATTACK_TELEGRAPH_NAME) continue;''',
'''  const objects = raidAttackTelegraphObjectsByKit.get(kit) ?? [];
  const active = Boolean(telegraph) && objects.length > 0;
  const intensity = telegraph?.intensity ?? 0;
  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;
  for (const object of objects) {''',
'telegraph iteration cache')

rep(
'''  const attackTelegraphs = new Map(
    getSkyDancerEnemyAttackTelegraphs(demo.session).map((telegraph) => [telegraph.enemyId, telegraph] as const),
  );''',
'''  const visual = raidVisualByDemo.get(demo as unknown as object);
  if (!visual) return;
  const attackTelegraphs = visual.attackTelegraphs;
  attackTelegraphs.clear();
  for (const telegraph of getSkyDancerEnemyAttackTelegraphs(demo.session)) {
    attackTelegraphs.set(telegraph.enemyId, telegraph);
  }''',
'reusable telegraph map')

rep(
'''    let kit = group.getObjectByName(SKY_RAID_ROLE_KIT_NAME) as THREE.Group | undefined;
    if (!kit || kit.userData.skyRaidRoleClass !== roleClass) {
      if (kit) group.remove(kit);
      kit = buildSkyRaidEnemyRoleKit(roleClass);
      group.add(kit);
    }''',
'''    let kit = raidRoleKitByEnemyGroup.get(group);
    if (!kit || kit.userData.skyRaidRoleClass !== roleClass) {
      if (kit) group.remove(kit);
      kit = buildSkyRaidEnemyRoleKit(roleClass);
      group.add(kit);
      raidRoleKitByEnemyGroup.set(group, kit);
    }''',
'role kit cache')

rep(
'''          const kit = group?.getObjectByName(SKY_RAID_ROLE_KIT_NAME) as THREE.Group | undefined;''',
'''          const kit = group ? raidRoleKitByEnemyGroup.get(group) : undefined;''',
'webdriver role cache')

start = source.index('function maintainSkyRaidEnemyPresence(')
end = source.index('\n\nfunction skyRaidScreenSlotsFor', start)
block = source[start:end]
old = '''  const snapshot = session.snapshot();
  const live = session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === snapshot.nodeId,
  );'''
new = '''  const runtime = session as unknown as RaidSession;
  const nodeId = runtime.location.node.id;
  const playerX = runtime.car.position.x;
  const playerZ = runtime.car.position.z;
  const playerHeading = runtime.car.heading;
  const live = session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === nodeId,
  );'''
if old not in block:
    raise SystemExit('V31 marker missing: formation snapshot')
block = block.replace(old, new, 1)
block = block.replace('snapshot.heading', 'playerHeading')
block = block.replace('snapshot.x', 'playerX')
block = block.replace('snapshot.z', 'playerZ')
block = block.replace('snapshot.nodeId', 'nodeId')
source = source[:start] + block + source[end:]

start = source.index('function skyRaidScreenSlotsFor(')
end = source.index('/**\n * Simulation-space engagement', start)
source = source[:start] + source[end:]

start = source.index('function maintainSkyRaidScreenPresence(')
end = source.index('\n\nfunction publishSkyRaidWorldStyle', start)
new_screen = '''function maintainSkyRaidScreenPresence(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  const key = demo as unknown as object;
  let state = raidScreenEngagementByDemo.get(key);
  if (!state) {
    state = {
      nextAllowedAt: 0,
      cursor: 0,
      recycles: 0,
      projection: new THREE.Vector3(),
      candidates: [
        { enemy: null, group: null, penalty: -Infinity },
        { enemy: null, group: null, penalty: -Infinity },
        { enemy: null, group: null, penalty: -Infinity },
      ],
    };
    raidScreenEngagementByDemo.set(key, state);
  }

  for (const candidate of state.candidates) {
    candidate.enemy = null;
    candidate.group = null;
    candidate.penalty = -Infinity;
  }

  demo.camera.updateMatrixWorld(true);
  let liveCount = 0;
  let visibleCount = 0;
  let candidateCount = 0;
  for (const enemy of demo.session.enemies) {
    if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== snapshot.nodeId) continue;
    liveCount += 1;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    group.getWorldPosition(state.projection);
    state.projection.project(demo.camera);
    const visible = state.projection.z > -1 && state.projection.z < 1
      && Math.abs(state.projection.x) < 0.96 && Math.abs(state.projection.y) < 0.94;
    if (visible) {
      visibleCount += 1;
      continue;
    }
    candidateCount += 1;
    const penalty = Math.abs(state.projection.x) + Math.abs(state.projection.y) + Math.abs(state.projection.z) * 0.12;
    let insertAt = 0;
    while (insertAt < state.candidates.length && state.candidates[insertAt].enemy && penalty <= state.candidates[insertAt].penalty) {
      insertAt += 1;
    }
    if (insertAt >= state.candidates.length) continue;
    for (let index = state.candidates.length - 1; index > insertAt; index -= 1) {
      const target = state.candidates[index];
      const previous = state.candidates[index - 1];
      target.enemy = previous.enemy;
      target.group = previous.group;
      target.penalty = previous.penalty;
    }
    const target = state.candidates[insertAt];
    target.enemy = enemy;
    target.group = group;
    target.penalty = penalty;
  }
  if (liveCount < 2) return;

  demo.scene.userData.skyRaidScreenPresenceVisible = visibleCount;
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
  if (visibleCount >= 3) {
    state.nextAllowedAt = 0;
    return;
  }

  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  if (now < state.nextAllowedAt) return;

  const pattern = skyRaidFormationPattern(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const needed = Math.min(3 - visibleCount, candidateCount, state.candidates.length);
  for (let index = 0; index < needed; index += 1) {
    const sample = state.candidates[index];
    if (!sample.enemy || !sample.group) continue;
    const authoredSlot = pattern.slots[(state.cursor + index) % pattern.slots.length];
    const lateral = clamp(authoredSlot.lateral * 0.86, -12.5, 12.5);
    const forward = clamp(authoredSlot.forward, 22, 42);
    const x = snapshot.x + forwardX * forward + rightX * lateral;
    const z = snapshot.z + forwardZ * forward + rightZ * lateral;
    sample.enemy.x = x;
    sample.enemy.z = z;
    sample.enemy.heading = Math.atan2(snapshot.x - x, snapshot.z - z);
    sample.enemy.aiClock = 0;
    sample.enemy.chargeTime = 0;
    sample.group.position.x = x;
    sample.group.position.z = z;
    sample.group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(sample.enemy);
    sample.group.userData.lastX = x;
    sample.group.userData.lastZ = z;
    sample.group.updateMatrixWorld(true);
    state.recycles += 1;
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.nextAllowedAt = now + (needed > 0 ? 0.28 : 0.12);
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
}'''
source = source[:start] + new_screen + source[end:]

rep(
'''function stepSkyRaidFlight(demo: RaidWebGLDemo, delta: number): SkyDancerSkyRaidFlightSnapshot {
  const base = demo.session.snapshot();
  const flight = flightControllerFor(demo).step(delta, base.heading, demo.steer, base.boostActive);''',
'''function stepSkyRaidFlight(demo: RaidWebGLDemo, delta: number): SkyDancerSkyRaidFlightSnapshot {
  const car = demo.session.car;
  const flight = flightControllerFor(demo).step(delta, car.heading, demo.steer, car.boostActive);''',
'flight snapshot removal')

rep(
'''    speedColor: new THREE.Color(SKY_DANCER_SKY_RAID_ACTS[0].palette.accent),
    turboBackdrop,''',
'''    speedColor: new THREE.Color(SKY_DANCER_SKY_RAID_ACTS[0].palette.accent),
    attackTelegraphs: new Map(),
    turboBackdrop,''',
'telegraph map init')

start = source.index('function updateRaidVisuals(')
end = source.index('\n\nexport function installSkyDancerSkyRaid()', start)
block = source[start:end]
old = '''  const base = demo.session.snapshot();
  const movedFar = !Number.isFinite(visual.anchorX) || Math.hypot(base.x - visual.anchorX, base.z - visual.anchorZ) > 105;'''
new = '''  const car = demo.session.car;
  const playerX = car.position.x;
  const playerZ = car.position.z;
  const playerHeading = car.heading;
  const playerSpeed = car.speed;
  const playerBoostActive = car.boostActive;
  const movedFar = !Number.isFinite(visual.anchorX) || Math.hypot(playerX - visual.anchorX, playerZ - visual.anchorZ) > 105;'''
if old not in block:
    raise SystemExit('V31 marker missing: visual snapshot')
block = block.replace(old, new, 1)
block = block.replace('base.x', 'playerX')
block = block.replace('base.z', 'playerZ')
block = block.replace('base.heading', 'playerHeading')
block = block.replace('base.speed', 'playerSpeed')
block = block.replace('base.boostActive', 'playerBoostActive')
block = block.replace('  visual.actGroups.forEach((group) => { group.visible = false; });', '  for (const group of visual.actGroups) group.visible = false;')
block = block.replace('  visual.legacyLayers.forEach((layer) => { layer.visible = false; });', '  for (const layer of visual.legacyLayers) layer.visible = false;')
old_loop = '''  visual.speedFx.children.forEach((line, index) => {
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);
    if (line.position.z < -12) line.position.z = 34 + (index % 6) * 8;
    const thickness = 0.72 + speedFxIntensity * 0.32;
    line.scale.x = thickness;
    line.scale.y = thickness;
    line.scale.z = 0.82 + speedFxIntensity * (1.10 + (index % 3) * 0.12);
  });'''
new_loop = '''  for (let index = 0; index < visual.speedFx.children.length; index += 1) {
    const line = visual.speedFx.children[index];
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);
    if (line.position.z < -12) line.position.z = 34 + (index % 6) * 8;
    const thickness = 0.72 + speedFxIntensity * 0.32;
    line.scale.x = thickness;
    line.scale.y = thickness;
    line.scale.z = 0.82 + speedFxIntensity * (1.10 + (index % 3) * 0.12);
  }'''
if old_loop not in block:
    raise SystemExit('V31 marker missing: speed loop')
block = block.replace(old_loop, new_loop, 1)
source = source[:start] + block + source[end:]

rep(
'''    const flightInput = skyRaidActive
      ? { ...input, steer: skyDancerSkyRaidSteerInput(input.steer) }
      : input;''',
'''    const flightInput = skyRaidActive ? skyRaidInputFor(this, input) : input;''',
'input allocation removal')

rep(
'''    publishSkyRaidWorldStyle(snapshot);
    publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);
    state.broadcastClock += delta;
    if (state.broadcastClock >= 0.1 || snapshot.actElapsedSeconds < 0.12 || snapshot.clear) {
      state.broadcastClock %= 0.1;
      broadcast(snapshot);
    }''',
'''    publishSkyRaidWorldStyle(snapshot);
    state.broadcastClock += delta;
    if (state.broadcastClock >= 0.1 || snapshot.actElapsedSeconds < 0.12 || snapshot.clear) {
      state.broadcastClock %= 0.1;
      publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);
      broadcast(snapshot);
    }''',
'diagnostics throttle')

path.write_text(source)

test_path = Path('tests/sky-sky-raid.test.ts')
tests = test_path.read_text()
tests = tests.replace('assert.match(raidSource, /if \\(visible\\.length >= 3\\)/);', 'assert.match(raidSource, /if \\(visibleCount >= 3\\)/);')
tests = tests.replace('assert.match(raidSource, /Math\\.min\\(3 - visible\\.length, candidates\\.length\\)/);', 'assert.match(raidSource, /Math\\.min\\(3 - visibleCount, candidateCount, state\\.candidates\\.length\\)/);')
addition = r'''

test("SKY RAID V31 removes hot-path copies without reducing presentation", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const formationStart = raidSource.indexOf("function maintainSkyRaidEnemyPresence(");
  const formationEnd = raidSource.indexOf("function maintainSkyRaidScreenPresence(", formationStart);
  const formationBlock = raidSource.slice(formationStart, formationEnd);
  const flightStart = raidSource.indexOf("function stepSkyRaidFlight(");
  const flightEnd = raidSource.indexOf("function applySkyRaidFlightVisuals(", flightStart);
  const flightBlock = raidSource.slice(flightStart, flightEnd);
  const visualStart = raidSource.indexOf("function updateRaidVisuals(");
  const visualEnd = raidSource.indexOf("export function installSkyDancerSkyRaid()", visualStart);
  const visualBlock = raidSource.slice(visualStart, visualEnd);
  const screenStart = raidSource.indexOf("function maintainSkyRaidScreenPresence(");
  const screenEnd = raidSource.indexOf("function publishSkyRaidWorldStyle(", screenStart);
  const screenBlock = raidSource.slice(screenStart, screenEnd);

  assert.doesNotMatch(formationBlock, /session\.snapshot\(\)/);
  assert.doesNotMatch(flightBlock, /session\.snapshot\(\)/);
  assert.doesNotMatch(visualBlock, /session\.snapshot\(\)/);
  assert.match(raidSource, /raidInputBySession/);
  assert.match(raidSource, /attackTelegraphs\.clear\(\)/);
  assert.match(raidSource, /raidRoleKitByEnemyGroup/);
  assert.match(raidSource, /raidAttackTelegraphObjectsByKit/);
  assert.match(screenBlock, /projection: new THREE\.Vector3\(\)/);
  assert.doesNotMatch(screenBlock, /\.filter\(/);
  assert.match(screenBlock, /visibleCount/);
  assert.match(screenBlock, /candidateCount/);
  assert.match(visualBlock, /for \(let index = 0; index < visual\.speedFx\.children\.length; index \+= 1\)/);
});
'''
if 'SKY RAID V31 removes hot-path copies without reducing presentation' in tests:
    raise SystemExit('V31 test already present')
test_path.write_text(tests + addition)
print('SKY RAID V31 allocation patch applied')
