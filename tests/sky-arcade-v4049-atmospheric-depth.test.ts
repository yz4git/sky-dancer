import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  ARCADE_FOG_FAR,
  ARCADE_FOG_NEAR,
  arcadeAtmosphericDepthV4049,
  createArcadeCloudMaterial,
  createArcadeWaterMaterial,
} from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";

test("V40.49 atmospheric depth gives each biome a bounded aerial-perspective profile", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const profile = arcadeAtmosphericDepthV4049(stage);
    assert.ok(profile.fogNear >= 60 && profile.fogNear <= 150, `${stage.biome} fogNear`);
    assert.ok(profile.fogFar >= 400 && profile.fogFar <= 760, `${stage.biome} fogFar`);
    assert.ok(profile.fogFar - profile.fogNear >= 300, `${stage.biome} keeps readable depth range`);
    assert.ok(profile.horizonHaze >= .1 && profile.horizonHaze <= .6);
    assert.ok(profile.cloudExtinction >= .2 && profile.cloudExtinction <= 1);
    assert.ok(profile.waterReflection >= .4 && profile.waterReflection <= .85);
  }
  assert.equal(ARCADE_FOG_NEAR, 88);
  assert.equal(ARCADE_FOG_FAR, 560);
});

test("V40.49 world applies the biome profile to scene fog without changing geometry ownership", () => {
  const city = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.biome === "city");
  assert.ok(city);
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const profile = arcadeAtmosphericDepthV4049(city);
  assert.ok(scene.fog instanceof THREE.Fog);
  assert.equal(scene.fog.near, profile.fogNear);
  assert.equal(scene.fog.far, profile.fogFar);
  const environment = scene.getObjectByName("arcade-course-environment");
  assert.ok(environment);
  assert.deepEqual(environment.userData.arcadeAtmosphericDepthV4049, profile);
  world.dispose();
});

test("V40.49 cloud and water shaders share biome fog depth and restrained reflection uniforms", () => {
  const city = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.biome === "city");
  assert.ok(city);
  const profile = arcadeAtmosphericDepthV4049(city);
  const cloud = createArcadeCloudMaterial(city);
  const water = createArcadeWaterMaterial(city);
  assert.equal(cloud.uniforms.fogNear.value, profile.fogNear);
  assert.equal(cloud.uniforms.fogFar.value, profile.fogFar);
  assert.equal(cloud.uniforms.cloudExtinction.value, profile.cloudExtinction);
  assert.equal(water.uniforms.fogNear.value, profile.fogNear);
  assert.equal(water.uniforms.fogFar.value, profile.fogFar);
  assert.equal(water.uniforms.reflectionStrength.value, profile.waterReflection);
  cloud.dispose();
  water.dispose();
});

test("V40.49 adds horizon haze, cloud extinction and Fresnel water without extra textures", () => {
  const source = readFileSync(
    new URL("../src/sky/arcade/SkyDancerArcadeReferenceMaterials.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /horizonBand=exp\(-pow\(\(d\.y-\.035\)\/\.115,2\.0\)\)/);
  assert.match(source, /extinction=clamp\(fog\*cloudExtinction,0\.0,\.94\)/);
  assert.match(source, /fresnel=pow\(1\.0-clamp\(abs\(normalize\(vView\)\.y\),0\.0,1\.0\),3\.0\)/);
  assert.match(source, /float fine=fbm\(uv\*vec2\(\.42,\.16\)/);
  assert.doesNotMatch(source, /TextureLoader/);
  assert.doesNotMatch(source, /CanvasTexture/);
});
