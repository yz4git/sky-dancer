import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`V30 marker missing: ${label}`);
  return source.replace(before, after);
}

{
  const path = "src/sky/SkyDancerSkyRaidArcadeWorld.ts";
  let source = fs.readFileSync(path, "utf8");
  source = replaceOnce(source,
`function suppressLegacyEnvironment(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (insideArcadeEnvironment(object)) return;
    const legacyNamed = object.name === "phase67-turbo-hunt-world"
      || object.name === "sky-dancer-legacy-environment"
      || LEGACY_ENV_PREFIXES.some((prefix) => object.name.startsWith(prefix));
    const legacyTheme = object.userData.skyDancerLegacyEnvironment === true;
    const legacyLargeSky = object instanceof THREE.Mesh
      && object.geometry instanceof THREE.SphereGeometry
      && object.geometry.parameters.radius >= 250;
    if (legacyNamed || legacyTheme || legacyLargeSky) object.visible = false;
  });
}`,
`function suppressLegacyEnvironment(scene: THREE.Scene): THREE.Object3D[] {
  const suppressed: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (insideArcadeEnvironment(object)) return;
    const legacyNamed = object.name === "phase67-turbo-hunt-world"
      || object.name === "sky-dancer-legacy-environment"
      || LEGACY_ENV_PREFIXES.some((prefix) => object.name.startsWith(prefix));
    const legacyTheme = object.userData.skyDancerLegacyEnvironment === true;
    const legacyLargeSky = object instanceof THREE.Mesh
      && object.geometry instanceof THREE.SphereGeometry
      && object.geometry.parameters.radius >= 250;
    if (legacyNamed || legacyTheme || legacyLargeSky) {
      object.visible = false;
      suppressed.push(object);
    }
  });
  return suppressed;
}`,
"legacy environment collector");

  source = replaceOnce(source,
`  private anchorX = 0;
  private anchorZ = 0;
  private anchorYaw = Math.PI;

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    suppressLegacyEnvironment(scene);`,
`  private anchorX = 0;
  private anchorZ = 0;
  private anchorYaw = Math.PI;
  private legacyEnvironment: THREE.Object3D[] = [];

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    this.legacyEnvironment = suppressLegacyEnvironment(scene);`,
"cached legacy environment");

  source = replaceOnce(source,
`  ): void {
    suppressLegacyEnvironment(this.scene);

    if (!this.stage || this.stage.id !== actId) {`,
`  ): void {
    // V30: legacy presentation roots are stable after bootstrap. Re-hiding the
    // cached objects is equivalent to a full scene traversal, but avoids walking
    // the complete three-sector Arcade world every rendered frame.
    for (const object of this.legacyEnvironment) {
      if (object.visible) object.visible = false;
    }

    if (!this.stage || this.stage.id !== actId) {`,
"per-frame legacy traversal removal");

  source = replaceOnce(source,
`      this.buildFreeFlightDepthWorld();
      this.buildFreeFlightCopies();
      suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);
    this.applyFreeFlightBackdropPolicy();
    this.tuneSkyRaidAtmosphere();
    this.applyFreeFlightChunkClearance();
    this.freeFlightCopies.forEach((copy, index) => {
      this.positionFreeFlightSector(copy, FREE_FLIGHT_SECTOR_ANGLES[index], index);
    });`,
`      this.buildFreeFlightDepthWorld();
      this.buildFreeFlightCopies();
      this.legacyEnvironment = suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    // World frame, backdrop stripping, chunk clearance and sector placement are
    // immutable for the lifetime of an Act. Keep only fog ownership live; the
    // previous code redundantly repeated all static work every rendered frame.
    this.tuneSkyRaidAtmosphere();`,
"static world work removal");

  fs.writeFileSync(path, source);
}

{
  const path = "src/sky/SkyDancerSkyRaid.ts";
  let source = fs.readFileSync(path, "utf8");

  source = replaceOnce(source,
`interface RaidVisualState {
  root: THREE.Group;
  actGroups: THREE.Group[];
  speedFx: THREE.Group;
  arcadeWorld: SkyDancerSkyRaidArcadeWorld;
  legacyLayers: THREE.Object3D[];`,
`interface RaidVisualState {
  root: THREE.Group;
  actGroups: THREE.Group[];
  speedFx: THREE.Group;
  speedMaterial: THREE.MeshBasicMaterial;
  speedColor: THREE.Color;
  turboBackdrop: THREE.Object3D | null;
  arcadeWorld: SkyDancerSkyRaidArcadeWorld;
  legacyLayers: THREE.Object3D[];`,
"visual cache fields");

  source = replaceOnce(source,
`function applySkyRaidAttackTelegraphVisual(
  kit: THREE.Group,
  telegraph: SkyDancerEnemyAttackTelegraphSnapshot | null,
  pulseClock: number,
): void {
  const objects = kit.children.filter((child) => child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME);
  const active = Boolean(telegraph) && objects.length > 0;
  const intensity = telegraph?.intensity ?? 0;
  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;
  for (const object of objects) {`,
`function applySkyRaidAttackTelegraphVisual(
  kit: THREE.Group,
  telegraph: SkyDancerEnemyAttackTelegraphSnapshot | null,
  pulseClock: number,
): void {
  const active = Boolean(telegraph) && Number(kit.userData.skyRaidAttackTelegraphCount ?? 0) > 0;
  const intensity = telegraph?.intensity ?? 0;
  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;
  for (const object of kit.children) {
    if (object.name !== SKY_RAID_ATTACK_TELEGRAPH_NAME) continue;`,
"telegraph allocation removal");

  source = replaceOnce(source,
`  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {`,
`  root.userData.skyRaidAttackTelegraphCount = root.children.reduce(
    (count, child) => count + (child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME ? 1 : 0),
    0,
  );
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {`,
"telegraph count cache");

  source = replaceOnce(source,
`function applySkyRaidEnemyRoleReadability(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  const attackTelegraphs = new Map(
    getSkyDancerEnemyAttackTelegraphs(demo.session).map((telegraph) => [telegraph.enemyId, telegraph] as const),
  );
  const pulseClock = typeof performance !== "undefined" ? performance.now() * 0.001 : 0;
  for (const enemySnapshot of snapshot.enemies) {
    const group = demo.enemyGroups.get(enemySnapshot.id);
    const enemyState = demo.session.enemies.find((candidate) => candidate.id === enemySnapshot.id);
    if (!group || !enemyState || enemyState.kind === "boss") continue;`,
`function applySkyRaidEnemyRoleReadability(demo: RaidWebGLDemo): void {
  const attackTelegraphs = new Map(
    getSkyDancerEnemyAttackTelegraphs(demo.session).map((telegraph) => [telegraph.enemyId, telegraph] as const),
  );
  const pulseClock = typeof performance !== "undefined" ? performance.now() * 0.001 : 0;
  for (const enemyState of demo.session.enemies) {
    const group = demo.enemyGroups.get(enemyState.id);
    if (!group || enemyState.kind === "boss") continue;`,
"role state lookup removal");

  source = replaceOnce(source,
`    kit.visible = enemySnapshot.alive;`,
`    kit.visible = enemyState.alive;`,
"role visibility state");

  source = replaceOnce(source,
`  demo.scene.updateMatrixWorld(true);
  demo.camera.updateMatrixWorld(true);
  const measured = live.flatMap((enemy) => {`,
`  // V30: projecting at most seven aircraft only needs their ancestor chains.
  // Updating the entire three-sector scene here duplicated the renderer's full
  // matrix walk every frame and was the largest avoidable CPU cost in SKY RAID.
  demo.camera.updateMatrixWorld(true);
  const measured = live.flatMap((enemy) => {`,
"screen presence full scene matrix removal");

  source = replaceOnce(source,
`    const world = new THREE.Vector3();
    group.getWorldPosition(world);`,
`    group.updateWorldMatrix(true, false);
    const world = new THREE.Vector3();
    group.getWorldPosition(world);`,
"screen presence local matrix update");

  source = replaceOnce(source,
`  const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const key = demo as unknown as object;`,
`  const key = demo as unknown as object;`,
"defer screen slots");

  source = replaceOnce(source,
`  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  if (now < state.nextAllowedAt) return;

  const forwardX = Math.sin(snapshot.heading);`,
`  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  if (now < state.nextAllowedAt) return;

  const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const forwardX = Math.sin(snapshot.heading);`,
"deferred screen slots creation");

  source = replaceOnce(source,
`function applySkyRaidEnemyFlightBand(demo: RaidWebGLDemo): void {
  const snapshot = demo.session.snapshot();
  for (const enemy of snapshot.enemies) {
    if (!enemy.alive) continue;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    // V18's inherited aircraft presentation still writes enemy Y around the
    // old y=1 flight plane. SKY RAID is the final visual owner, so lift every
    // live aircraft to the shared engagement altitude after inherited FX run.
    group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(
      demo.session.enemies.find((candidate) => candidate.id === enemy.id) ?? enemy as never,
    );
  }
}`,
`function applySkyRaidEnemyFlightBand(demo: RaidWebGLDemo): void {
  // The authoritative session already owns the same enemy state. Iterating it
  // directly avoids allocating another full snapshot plus an O(n²) id search on
  // every presentation pass while preserving the exact altitude result.
  for (const enemy of demo.session.enemies) {
    if (!enemy.alive) continue;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(enemy);
  }
}`,
"enemy altitude snapshot removal");

  source = replaceOnce(source,
`function suppressTurboHuntBackdrop(scene: THREE.Scene): void {
  // Phase67 owns a 360m fixed blue sky sphere plus a pastel test field. Because
  // that sphere sits inside the later V38/V50 sky domes, it completely masks
  // their color-script changes. SKY RAID has its own world owners, so remove
  // only this legacy decorative root while keeping enemies/pickups/combat.
  const turboBackdrop = scene.getObjectByName("phase67-turbo-hunt-world");
  if (turboBackdrop) turboBackdrop.visible = false;
}

`,
``,
"backdrop recursive lookup function");

  source = replaceOnce(source,
`  const speedFx = buildSpeedFx();
  speedFx.name = "sky-raid-speed-fx";
  demo.scene.add(root, speedFx);
  const arcadeWorld = new SkyDancerSkyRaidArcadeWorld(demo.scene);
  const legacyLayers = collectLegacyRaidLayers(demo.scene);`,
`  const speedFx = buildSpeedFx();
  speedFx.name = "sky-raid-speed-fx";
  const speedMaterial = (speedFx.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  demo.scene.add(root, speedFx);
  const arcadeWorld = new SkyDancerSkyRaidArcadeWorld(demo.scene);
  const legacyLayers = collectLegacyRaidLayers(demo.scene);
  const turboBackdrop = demo.scene.getObjectByName("phase67-turbo-hunt-world");`,
"build visual caches");

  source = replaceOnce(source,
`    root,
    actGroups,
    speedFx,
    arcadeWorld,
    legacyLayers,`,
`    root,
    actGroups,
    speedFx,
    speedMaterial,
    speedColor: new THREE.Color(SKY_DANCER_SKY_RAID_ACTS[0].palette.accent),
    turboBackdrop,
    arcadeWorld,
    legacyLayers,`,
"store visual caches");

  source = replaceOnce(source,
`  publishSkyRaidWorldStyle(raid);
  suppressTurboHuntBackdrop(demo.scene);
  const base = demo.session.snapshot();`,
`  publishSkyRaidWorldStyle(raid);
  if (visual.turboBackdrop) visual.turboBackdrop.visible = false;
  const base = demo.session.snapshot();`,
"cached backdrop hide");

  source = replaceOnce(source,
`  const speedColor = new THREE.Color(raid.palette.accent);
  visual.speedFx.children.forEach((line, index) => {
    if (line instanceof THREE.Mesh && line.material instanceof THREE.MeshBasicMaterial) {
      line.material.color.lerp(speedColor, 1 - Math.exp(-delta * 5.5));
      line.material.opacity = 0.045 + speedFxIntensity * 0.32;
    }
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);`,
`  // All 24 speed streaks share one material. The previous loop lerped and wrote
  // that same material 24 times per frame. One mathematically equivalent combined
  // lerp preserves the exact converged appearance with a fraction of the work.
  visual.speedColor.setHex(raid.palette.accent);
  const sharedLerp = 1 - Math.exp(-delta * 5.5 * Math.max(1, visual.speedFx.children.length));
  visual.speedMaterial.color.lerp(visual.speedColor, sharedLerp);
  visual.speedMaterial.opacity = 0.045 + speedFxIntensity * 0.32;
  visual.speedFx.children.forEach((line, index) => {
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);`,
"shared speed material update");

  source = replaceOnce(source,
`  applySkyRaidEnemyRoleReadability(this, snapshot);`,
`  applySkyRaidEnemyRoleReadability(this);`,
"role readability call");

  source = replaceOnce(source,
`  const playerPosition = new THREE.Vector3();
  this.playerVisual.getWorldPosition(playerPosition);`,
`  const playerPosition = this.cameraLookTarget;
  this.playerVisual.getWorldPosition(playerPosition);`,
"reuse camera scratch vector");

  source = replaceOnce(source,
`  const preFrameProjection = playerPosition.clone().project(this.camera);`,
`  const preFrameProjection = this.cameraLookTarget.clone().copy(playerPosition).project(this.camera);`,
"projection marker");

  // The previous replacement still clones once. Give the SKY RAID wrapper its own
  // module-level scratch vector without depending on private base-class fields.
  source = replaceOnce(source,
`const raidScreenEngagementByDemo = new WeakMap<object, { nextAllowedAt: number; cursor: number; recycles: number }>();
let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;`,
`const raidScreenEngagementByDemo = new WeakMap<object, { nextAllowedAt: number; cursor: number; recycles: number }>();
const skyRaidCameraPlayerPosition = new THREE.Vector3();
const skyRaidCameraProjection = new THREE.Vector3();
let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;`,
"module camera scratch");
  source = replaceOnce(source,
`  const playerPosition = this.cameraLookTarget;
  this.playerVisual.getWorldPosition(playerPosition);`,
`  const playerPosition = skyRaidCameraPlayerPosition;
  this.playerVisual.getWorldPosition(playerPosition);`,
"camera scratch final");
  source = replaceOnce(source,
`  const preFrameProjection = this.cameraLookTarget.clone().copy(playerPosition).project(this.camera);`,
`  const preFrameProjection = skyRaidCameraProjection.copy(playerPosition).project(this.camera);`,
"projection scratch final");

  source = replaceOnce(source,
`function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.skyRaidAct = snapshot.actId;
  document.documentElement.dataset.skyRaidWorldStyle = skyDancerSkyRaidWorldStyle(snapshot.actId);
}`,
`function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const worldStyle = skyDancerSkyRaidWorldStyle(snapshot.actId);
  if (root.dataset.skyRaidAct !== snapshot.actId) root.dataset.skyRaidAct = snapshot.actId;
  if (root.dataset.skyRaidWorldStyle !== worldStyle) root.dataset.skyRaidWorldStyle = worldStyle;
}`,
"world dataset write cache");

  fs.writeFileSync(path, source);
}

console.log("SKY RAID V30 performance patch applied");
