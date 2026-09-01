from pathlib import Path

runtime = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
text = runtime.read_text()
text = text.replace(
'''interface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {
  speed: number;
  nearMissChecked: boolean;
}''',
'''interface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {
  speed: number;
  nearMissChecked: boolean;
  // V10.5: terrain/architecture hazards live at one absolute point on the course.
  // Dynamic hazards leave this null and retain their independent closing speed.
  courseAnchorDistance: number | null;
}''')
old_spawn = '''      this.hazards.push({
        id: this.nextEntityId++,
        kind,
        x: clamp(x + (this.random() - 0.5) * 0.2, -ENEMY_X_LIMIT, ENEMY_X_LIMIT),
        y: kind === "lightning" ? (this.random() - 0.5) * 2.8 : (this.random() - 0.5) * 1.8,
        depth: 90 + this.random() * 18,
        scale: kind === "mine" || kind === "debris" ? 0.62 : 0.88,
        speed: 11.5 + this.stage.courseSpeed * 0.035,
        nearMissChecked: false,
      });'''
new_spawn = '''      const spawnDepth = 90 + this.random() * 18;
      const courseAnchored = kind === "tower" || kind === "arch" || kind === "rock";
      this.hazards.push({
        id: this.nextEntityId++,
        kind,
        x: clamp(x + (this.random() - 0.5) * 0.2, -ENEMY_X_LIMIT, ENEMY_X_LIMIT),
        y: kind === "lightning" ? (this.random() - 0.5) * 2.8 : (this.random() - 0.5) * 1.8,
        depth: spawnDepth,
        scale: kind === "mine" || kind === "debris" ? 0.62 : 0.88,
        speed: 11.5 + this.stage.courseSpeed * 0.035,
        nearMissChecked: false,
        courseAnchorDistance: courseAnchored ? this.distance + spawnDepth : null,
      });'''
if old_spawn not in text:
    raise SystemExit('spawn hazard block not found')
text = text.replace(old_spawn, new_spawn)
old_update = '''  private updateHazards(delta: number, turboActive: boolean): void {
    for (const hazard of this.hazards) {
      hazard.depth -= hazard.speed * (turboActive ? 1.24 : 1) * delta;
      if (hazard.depth > 2.4) continue;'''
new_update = '''  private updateHazards(delta: number, turboActive: boolean): void {
    for (const hazard of this.hazards) {
      if (hazard.courseAnchorDistance !== null) {
        // V10.5: architecture/terrain advances only because the aircraft advances along the course.
        // This keeps its position phase-locked with scenery at normal speed and under turbo.
        hazard.depth = hazard.courseAnchorDistance - this.distance;
      } else {
        hazard.depth -= hazard.speed * (turboActive ? 1.24 : 1) * delta;
      }
      if (hazard.depth > 2.4) continue;'''
if old_update not in text:
    raise SystemExit('update hazard block not found')
text = text.replace(old_update, new_update)
text = text.replace(
'''      if (distance < radius) {
        hazard.depth = -10;''',
'''      if (distance < radius) {
        // A collided world anchor is retired instead of being recomputed on the next frame.
        hazard.courseAnchorDistance = null;
        hazard.depth = -10;''')
runtime.write_text(text)

models = Path('src/sky/arcade/SkyDancerArcadeModels.ts')
src = models.read_text()
start = src.index('export function createSkyDancerArcadeHazard(')
head = src[:start]
fn = r'''export function createSkyDancerArcadeHazard(
  stage: SkyDancerArcadeStageDefinition,
  hazard: SkyDancerArcadeHazardSnapshot,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-hazard-${hazard.id}`;
  const primary = flatMaterial(stage.palette.primary);
  const secondary = flatMaterial(stage.palette.secondary);
  const warning = flatMaterial(0xff704f, 0x5a1008);
  const accent = flatMaterial(stage.palette.accent, stage.palette.accent);
  const courseAnchored = hazard.kind === "tower" || hazard.kind === "arch" || hazard.kind === "rock";
  if (courseAnchored) group.userData.arcadeWorldAnchoredHazardV105 = true;

  if ((stage.biome === "city" || stage.biome === "night") && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = stage.biome === "night" ? "neon-pylon" : "city-pylon";
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10.8, 1.4), primary);
    shaft.position.y = -4.9;
    group.add(shaft);
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.0, 2.1), warning);
    shoulder.position.y = 0.65;
    group.add(shoulder);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 6), primary);
    mast.position.y = 3.1;
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), accent);
    beacon.position.y = 5.35;
    group.add(beacon);
  } else if ((stage.biome === "city" || stage.biome === "night") && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = stage.biome === "night" ? "neon-gantry" : "city-gantry";
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.86, 7.8, 1.0), primary);
      support.position.set(side * 2.25, -2.75, 0);
      group.add(support);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 1.0), warning);
      shoulder.position.set(side * 1.55, 1.15, 0);
      shoulder.rotation.z = side * 0.38;
      group.add(shoulder);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.72, 1.0), primary);
    span.position.y = 1.95;
    group.add(span);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.16), accent);
    strip.position.set(0, 1.62, 0.54);
    group.add(strip);
  } else if (stage.biome === "canyon" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "basalt-spire";
    const main = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.8, 10.5, 7, 3), primary);
    main.position.y = -4.2;
    main.rotation.y = 0.22;
    group.add(main);
    const shard = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.35, 6.6, 6, 2), secondary);
    shard.position.set(1.45, -3.0, -0.4);
    shard.rotation.z = -0.12;
    group.add(shard);
  } else if (stage.biome === "canyon" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "canyon-rock-bridge";
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.0, 8.8, 7, 2), primary);
      pillar.position.set(side * 2.55, -3.1, 0);
      pillar.rotation.z = side * 0.08;
      group.add(pillar);
    }
    const bridge = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), secondary);
    bridge.scale.set(2.25, 0.62, 0.9);
    bridge.position.y = 1.55;
    group.add(bridge);
  } else if (stage.biome === "desert" && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "fortress-pylon";
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.1, 9.4, 2.5), primary);
    shaft.position.y = -4.0;
    group.add(shaft);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.15, 3.0), secondary);
    crown.position.y = 0.9;
    group.add(crown);
    for (const side of [-1, 1]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 0.9), warning);
      merlon.position.set(side * 1.15, 1.9, 0);
      group.add(merlon);
    }
  } else if (stage.biome === "ice" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "crystal-rib";
    for (const side of [-1, 1]) {
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(1.55, 9.2, 6), primary);
      crystal.position.set(side * 2.55, -2.75, 0);
      crystal.rotation.z = side * 0.13;
      group.add(crystal);
    }
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), accent);
    crown.scale.set(2.45, 0.66, 0.8);
    crown.position.y = 1.85;
    group.add(crown);
  } else if (stage.biome === "ice" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "ice-stalagmite";
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), primary);
    crystal.scale.set(1.35, 3.7, 1.25);
    crystal.position.y = -3.35;
    group.add(crystal);
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.82, 0), accent);
    shard.scale.set(0.7, 2.15, 0.65);
    shard.position.set(1.25, -2.75, 0.25);
    shard.rotation.z = -0.2;
    group.add(shard);
  } else if (stage.biome === "ruins" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "ruin-portal";
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(1.15, 7.8, 1.3), primary);
      column.position.set(side * 2.4, -2.65, 0);
      group.add(column);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.7, 1.6), secondary);
      cap.position.set(side * 2.4, 1.25, 0);
      group.add(cap);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.92, 1.45), secondary);
    lintel.position.y = 1.75;
    group.add(lintel);
    const glyph = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.14), accent);
    glyph.position.set(0, 1.38, 0.78);
    group.add(glyph);
  } else if (stage.biome === "ruins" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "ruin-island-shard";
    const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 0), primary);
    shard.scale.set(1.7, 2.65, 1.55);
    shard.position.y = -2.2;
    group.add(shard);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.62, 3.1), secondary);
    slab.position.y = 0.25;
    group.add(slab);
  } else if (stage.biome === "volcano" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "magma-pillar";
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.0, 10.2, 7, 3), primary);
    pillar.position.y = -4.15;
    group.add(pillar);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.4, 0.16), accent);
    crack.position.set(0.55, -2.7, 1.52);
    crack.rotation.z = 0.16;
    group.add(crack);
  } else if (stage.biome === "orbit" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "orbital-truss-ring";
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.2, 7, 32), primary);
    group.add(ring);
    for (let index = 0; index < 4; index += 1) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.3), secondary);
      const angle = index * Math.PI / 2;
      strut.position.set(Math.cos(angle) * 2.35, Math.sin(angle) * 2.35, 0);
      strut.rotation.z = angle;
      group.add(strut);
    }
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.16), accent);
    marker.position.y = 2.95;
    group.add(marker);
  } else if (stage.biome === "citadel" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "prism-blade-gate";
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 6.2, 0.65), primary);
      blade.position.set(side * 1.75, -0.55, 0);
      blade.rotation.z = side * 0.34;
      group.add(blade);
    }
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), accent);
    crown.scale.set(1.8, 0.55, 0.7);
    crown.position.y = 2.45;
    group.add(crown);
  } else if (stage.biome === "citadel" && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "prism-spire";
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.7, 10.2, 6, 3), primary);
    spire.position.y = -4.0;
    group.add(spire);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.0, 6), accent);
    tip.position.y = 2.55;
    group.add(tip);
  } else if (hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "terrain-spire";
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), primary);
    rock.scale.set(1.0, 2.9, 0.95);
    rock.position.y = -2.65;
    group.add(rock);
  } else if (hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "supported-gate";
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.78, 7.0, 0.9), primary);
      support.position.set(side * 2.3, -2.45, 0);
      group.add(support);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.72, 0.9), secondary);
    span.position.y = 1.2;
    group.add(span);
  } else if (hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "grounded-tower";
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 9.0, 1.5), primary);
    tower.position.y = -3.9;
    group.add(tower);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 2.0), secondary);
    cap.position.y = 0.8;
    group.add(cap);
  } else if (hazard.kind === "mine") {
    group.userData.arcadeHazardIdentityV105 = "mine";
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), warning));
    for (let index = 0; index < 6; index += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 5), primary);
      spike.rotation.z = (index / 6) * Math.PI * 2;
      spike.position.set(Math.sin(spike.rotation.z) * 0.78, Math.cos(spike.rotation.z) * 0.78, 0);
      group.add(spike);
    }
  } else if (hazard.kind === "lightning") {
    group.userData.arcadeAtmosphericHazardV105 = true;
    group.userData.arcadeHazardIdentityV105 = "lightning-bolt";
    const points: Array<[number, number]> = [[-0.15, 4.4], [0.55, 2.7], [-0.35, 1.15], [0.42, -0.3], [-0.6, -2.0], [0.1, -4.4]];
    for (let index = 0; index < points.length - 1; index += 1) {
      const [x0, y0] = points[index];
      const [x1, y1] = points[index + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const length = Math.hypot(dx, dy);
      const segment = new THREE.Mesh(new THREE.BoxGeometry(0.22, length, 0.22), accent);
      segment.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, 0);
      segment.rotation.z = -Math.atan2(dx, dy);
      group.add(segment);
    }
  } else {
    group.userData.arcadeHazardIdentityV105 = "debris";
    const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), primary);
    debris.scale.set(0.8, 1.35, 0.72);
    group.add(debris);
  }

  group.scale.setScalar(hazard.scale);
  return group;
}
'''
models.write_text(head + fn)

webgl = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
w = webgl.read_text()
old = '''      if (group.userData.arcadeCityAnchoredHazardV1042 === true) {
        // V10.4.2: city architecture shares the same world attitude as the skyline/background.
        // It must never tumble independently like debris.
        const sceneryAttitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
        group.rotation.set(sceneryAttitude.pitch, sceneryAttitude.yaw, sceneryAttitude.roll);
      } else {
        group.rotation.x += delta * 0.42;
        group.rotation.y += delta * 0.58;
      }'''
new = '''      if (group.userData.arcadeWorldAnchoredHazardV105 === true) {
        // V10.5: terrain and architecture are one part of the course world, never independent actors.
        const sceneryAttitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
        group.rotation.set(sceneryAttitude.pitch, sceneryAttitude.yaw, sceneryAttitude.roll);
      } else if (group.userData.arcadeAtmosphericHazardV105 === true) {
        // Lightning translates with the weather hazard but does not tumble like a solid object.
        group.rotation.set(0, 0, 0);
      } else {
        // Only genuinely free objects (mine/debris) retain independent tumble.
        group.rotation.x += delta * 0.42;
        group.rotation.y += delta * 0.58;
      }'''
if old not in w:
    raise SystemExit('V10.4.2 hazard rotation block not found')
webgl.write_text(w.replace(old, new))

test = Path('tests/sky-arcade-run.test.ts')
t = test.read_text()
marker = 'V10.5 world anchors keep structural hazards phase-locked to course scenery'
if marker not in t:
    t += r'''

test("V10.5 world anchors keep structural hazards phase-locked to course scenery", () => {
  const sourcePromise = readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  return sourcePromise.then((source) => {
    assert.match(source, /courseAnchorDistance: number \| null/);
    assert.match(source, /courseAnchored = kind === "tower" \|\| kind === "arch" \|\| kind === "rock"/);
    assert.match(source, /hazard\.depth = hazard\.courseAnchorDistance - this\.distance/);
  });
});

test("V10.5 reserves independent tumble for free hazards only", async () => {
  const [models, webgl] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeModels.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
  ]);
  assert.match(models, /arcadeWorldAnchoredHazardV105/);
  assert.match(models, /canyon-rock-bridge/);
  assert.match(models, /crystal-rib/);
  assert.match(models, /ruin-portal/);
  assert.match(models, /orbital-truss-ring/);
  assert.match(models, /prism-blade-gate/);
  assert.match(webgl, /Only genuinely free objects \(mine\/debris\) retain independent tumble/);
});
'''
    test.write_text(t)
