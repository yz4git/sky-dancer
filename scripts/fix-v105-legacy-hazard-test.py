from pathlib import Path

path = Path('tests/sky-arcade-run.test.ts')
text = path.read_text()
old = '''test("V10.4.2 city hazards are grounded architecture instead of floating primitives", async () => {
  const models = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeModels.ts", import.meta.url), "utf8");
  const demo = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  assert.match(models, /arcadeCityAnchoredHazardV1042 = true/);
  assert.match(models, /arcadeCityHazardKindV1042 = "tower"/);
  assert.match(models, /arcadeCityHazardKindV1042 = "gantry"/);
  assert.match(models, /new THREE\\.BoxGeometry\\(5\\.8, 0\\.72, 1\\.0\\)/);
  assert.match(demo, /arcadeSharedSceneryAttitudeV1041/);
  assert.match(demo, /group\\.rotation\\.set\\(sceneryAttitude\\.pitch, sceneryAttitude\\.yaw, sceneryAttitude\\.roll\\)/);
});'''
new = '''test("V10.5 city hazards remain grounded architecture and are phase-locked to the course world", async () => {
  const models = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeModels.ts", import.meta.url), "utf8");
  const demo = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(models, /arcadeWorldAnchoredHazardV105 = true/);
  assert.match(models, /"city-pylon"/);
  assert.match(models, /"city-gantry"/);
  assert.match(models, /new THREE\\.BoxGeometry\\(5\\.8, 0\\.72, 1\\.0\\)/);
  assert.match(demo, /arcadeSharedSceneryAttitudeV1041/);
  assert.match(demo, /arcadeWorldAnchoredHazardV105 === true/);
  assert.match(demo, /group\\.rotation\\.set\\(sceneryAttitude\\.pitch, sceneryAttitude\\.yaw, sceneryAttitude\\.roll\\)/);
  assert.match(runtime, /hazard\\.depth = hazard\\.courseAnchorDistance - this\\.distance/);
});'''
if old not in text:
    raise SystemExit('legacy V10.4.2 test block not found')
path.write_text(text.replace(old, new))
