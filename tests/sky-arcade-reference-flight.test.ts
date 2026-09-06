import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { normalizeArcadeStick } from "../src/sky/arcade/SkyDancerArcadeInput";
import { arcadeCameraPose } from "../src/sky/arcade/SkyDancerArcadeCamera";
import { arcadeCoursePose, arcadeCourseRelativePose, arcadeCourseRelativeVisualPose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { createReferenceFighter, createReferenceCarrier } from "../src/sky/arcade/SkyDancerArcadeReferenceAirframes";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("stick maps from its visible center with radial dead zone and bounded diagonals", () => {
  assert.deepEqual(normalizeArcadeStick(0, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(normalizeArcadeStick(2, 1, 50), { x: 0, y: 0 });
  assert.equal(normalizeArcadeStick(0, 50, 50).y, -1);
  assert.equal(normalizeArcadeStick(0, -50, 50).y, 1);
  const diagonal = normalizeArcadeStick(100, 100, 50);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
  assert.deepEqual(normalizeArcadeStick(NaN, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(normalizeArcadeStick(10, 10, 0), { x: 0, y: 0 });
});

test("releasing a downward stick removes drift, including after pause/resume", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 73 });
  runtime.setMove(0, -1);
  for (let i = 0; i < 20; i++) runtime.step(1 / 60);
  const pressed = runtime.getSnapshot().playerY;
  runtime.pause(); runtime.releaseInputs(); runtime.resume();
  for (let i = 0; i < 90; i++) runtime.step(1 / 60);
  const released = runtime.getSnapshot().playerY;
  for (let i = 0; i < 90; i++) runtime.step(1 / 60);
  assert.ok(released > -.9, "release must not keep moving to lower limit");
  assert.ok(Math.abs(runtime.getSnapshot().playerY - released) < .001);
  assert.ok(pressed < 0);
});

test("hero airframe is solid, detailed and batched instead of hundreds of draw calls", () => {
  const player = createReferenceFighter();
  let meshCount = 0, vertices = 0;
  player.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount++;
    const position = object.geometry.getAttribute("position");
    vertices += position.count;
    for (const number of position.array) assert.ok(Number.isFinite(number));
    const normals = object.geometry.getAttribute("normal");
    for (const number of normals.array) assert.ok(Number.isFinite(number));
  });
  const box = new THREE.Box3().setFromObject(player);
  assert.ok(box.max.x - box.min.x > 8, "hero silhouette has broad swept wings");
  assert.ok(box.max.y > 1.2, "twin tail fins stand vertically");
  assert.ok(vertices > 5_000, "beveled panels, canopy and mechanical detail exist");
  assert.ok(meshCount <= 16, `airframe uses ${meshCount} draws`);
  const carrier = createReferenceCarrier(SKY_DANCER_ARCADE_STAGES[0]);
  assert.equal(carrier.getObjectsByProperty("name", "arcade-boss-weakpoint").length, 2);
  assert.equal(carrier.getObjectsByProperty("name", "arcade-engine-glow").length, 4);
});

test("actual airframe vertices fit landscape and portrait at all steering limits", () => {
  const player = createReferenceFighter();
  const vertex = new THREE.Vector3();
  for (const aspect of [16 / 9, 844 / 390, 390 / 844, 3 / 4]) {
    for (const x of [-1, 0, 1]) for (const y of [-.9, 0, .9]) for (const turbo of [false, true]) {
      const pose = arcadeCameraPose(x, y, aspect, turbo);
      const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .1, 1200);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.lookX, pose.lookY, pose.lookZ); camera.rotateZ(pose.roll); camera.updateMatrixWorld();
      player.position.set(x * 7.8, 1.1 + y * 4.25, 2.8); player.updateMatrixWorld(true);
      player.traverse(object => {
        if (!(object instanceof THREE.Mesh) || object.name === "arcade-engine-trail") return;
        const positions = object.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
          assert.ok(Math.abs(vertex.x) < .99 && Math.abs(vertex.y) < .99, `frame aspect=${aspect} x=${x} y=${y}: ${vertex.x},${vertex.y}`);
        }
      });
    }
  }
});

test("flight courses contain visible chicanes, vertical beats and bank reversals before the boss", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const length = stage.durationSeconds * stage.courseSpeed;
    const samples = Array.from({ length: 64 }, (_, i) => arcadeCoursePose(stage, length * (i / 63) * .55));
    const yawRange = Math.max(...samples.map(p => p.yaw)) - Math.min(...samples.map(p => p.yaw));
    const bankRange = Math.max(...samples.map(p => p.bank)) - Math.min(...samples.map(p => p.bank));
    const verticalRange = Math.max(...samples.map(p => p.y)) - Math.min(...samples.map(p => p.y));
    const signs = samples.map(p => p.yaw).filter(value => Math.abs(value) >= .035).map(Math.sign);
    const signChanges = signs.reduce((count, sign, i) => count + (i > 0 && sign !== signs[i - 1] ? 1 : 0), 0);
    assert.ok(yawRange > .24, `${stage.id} yaw range ${yawRange} must read as a real turn`);
    assert.ok(bankRange > .28, `${stage.id} bank range ${bankRange} must visibly reverse`);
    assert.ok(verticalRange > 4.5, `${stage.id} vertical range ${verticalRange} must climb/dive`);
    assert.ok(signChanges >= 2, `${stage.id} needs at least two heading reversals, got ${signChanges}`);
    const ahead = arcadeCourseRelativePose(stage, length * .31, 120);
    assert.ok(Math.abs(ahead.x) > 3 || Math.abs(ahead.y) > 3, `${stage.id} 120m look-ahead must leave the screen centre`);
  }
});

test("visual relative pose rotates the complete centreline delta into the current tangent frame", () => {
  for(const stage of SKY_DANCER_ARCADE_STAGES){
    const distance=stage.durationSeconds*stage.courseSpeed*.31;
    const zero=arcadeCourseRelativeVisualPose(stage,distance,0);
    assert.ok(Math.abs(zero.x)+Math.abs(zero.y)+Math.abs(zero.z)+Math.abs(zero.yaw)+Math.abs(zero.pitch)+Math.abs(zero.bank)<1e-10);
    for(const depth of [24,72,160]){
      const visual=arcadeCourseRelativeVisualPose(stage,distance,depth);
      assert.ok([visual.x,visual.y,visual.z,visual.yaw,visual.pitch,visual.bank].every(Number.isFinite));
      assert.ok(visual.z<0,`${stage.id} depth ${depth} remains ahead of the camera`);
    }
  }
});
