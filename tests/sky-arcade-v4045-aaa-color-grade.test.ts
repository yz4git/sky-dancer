import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { skyDancerArcadeStageById } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  skyDancerArcadeV4045Palette,
  skyDancerArcadeV4045Stage,
} from "../src/sky/arcade/SkyDancerArcadeV4045ColorGrade";

test("V40.45 desaturates environment roles while preserving combat accents", () => {
  const stage = skyDancerArcadeStageById("dawn-city");
  const graded = skyDancerArcadeV4045Palette(stage);
  const sourceSky = { h: 0, s: 0, l: 0 };
  const gradedSky = { h: 0, s: 0, l: 0 };
  new THREE.Color(stage.palette.sky).getHSL(sourceSky);
  new THREE.Color(graded.sky).getHSL(gradedSky);
  assert.ok(gradedSky.s < sourceSky.s);
  assert.notEqual(graded.ground, stage.palette.ground);
  assert.notEqual(graded.primary, stage.palette.primary);

  const sourceAccent = { h: 0, s: 0, l: 0 };
  const gradedAccent = { h: 0, s: 0, l: 0 };
  new THREE.Color(stage.palette.accent).getHSL(sourceAccent);
  new THREE.Color(graded.accent).getHSL(gradedAccent);
  assert.ok(gradedAccent.s > gradedSky.s);
});

test("V40.45 grade is presentation-only and does not mutate authoritative stage data", () => {
  const source = skyDancerArcadeStageById("dawn-city");
  const sourceSky = source.palette.sky;
  const display = skyDancerArcadeV4045Stage(source);
  assert.notEqual(display, source);
  assert.notEqual(display.palette, source.palette);
  assert.equal(source.palette.sky, sourceSky);

  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4045 });
  assert.equal(runtime.getSnapshot().stage.palette.sky, source.palette.sky);
});

test("V40.45 WebGL uses lower ACES exposure and graded render-only stage copies", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /toneMapping = THREE\.ACESFilmicToneMapping/);
  assert.match(source, /toneMappingExposure = \.96/);
  assert.match(source, /createSkyDancerArcadeHazard\(skyDancerArcadeV4045Stage\(snapshot\.stage\), hazard\)/);
  assert.match(source, /referenceAtmosphere\(skyDancerArcadeV4045Stage\(snapshot\.stage\)\)/);
});

test("V40.45 cinematic renderer uses restrained saturation and split-tone shadows", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCinematicRenderer.ts"), "utf8");
  assert.match(source, /mix\(vec3\(luma\),result,1\.015\)/);
  assert.match(source, /float highlight=smoothstep\(\.62,1\.2,luma\)/);
  assert.match(source, /vec3\(-\.012,\.007,\.027\)\*shadow/);
});

test("V40.45 Canvas and HUD share the muted environment / white-hot danger hierarchy", () => {
  const canvas = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  const hud = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.module.css"), "utf8");
  const product = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeProduct.module.css"), "utf8");
  assert.match(canvas, /skyDancerArcadeV4045Palette\(snapshot\.stage\)/);
  assert.match(canvas, /context\.fillStyle = "#bccbd1"/);
  assert.match(hud, /color:#fff7e8/);
  assert.match(hud, /background:rgba\(39,10,12,\.8\)/);
  assert.match(product, /--arcade-cyan: #a9dce5/);
  assert.match(product, /--arcade-gold: #e6c690/);
});


test("V40.45 review keeps environmental cyan subordinate to combat readability", () => {
  const stage = skyDancerArcadeStageById("dawn-city");
  const graded = skyDancerArcadeV4045Palette(stage);
  const accent = { h: 0, s: 0, l: 0 };
  new THREE.Color(graded.accent).getHSL(accent);
  assert.ok(accent.s < .8);

  const materials = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceMaterials.ts"), "utf8");
  const world = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(materials, /vec3 water=mix\(vec3\(\.028,\.105,\.145\),vec3\(\.045,\.19,\.25\),ripples\)/);
  assert.match(world, /new THREE\.DirectionalLight\(0x7fb9c8,\.62\)/);
});
