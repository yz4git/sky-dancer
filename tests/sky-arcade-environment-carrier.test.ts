import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";

const CARRIER_NAME = "arcade-horizon-fleet-carrier";

test("live arcade stages do not show the reference carrier as permanent scenery", () => {
  for (const biome of ["city", "cloud", "storm"] as const) {
    const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.biome === biome);
    assert.ok(stage, `missing ${biome} stage fixture`);

    const scene = new THREE.Scene();
    const environment = new SkyDancerArcadeEnvironment(scene);
    environment.setStage(stage);

    const carrier = scene.getObjectByName(CARRIER_NAME);
    assert.ok(carrier, `${biome} keeps the carrier model available for a scripted event`);
    assert.equal(carrier.visible, false, `${biome} must start without a horizon carrier`);
    assert.equal(carrier.userData.skyDancerReferenceOnly, true);

    environment.dispose();
  }
});
