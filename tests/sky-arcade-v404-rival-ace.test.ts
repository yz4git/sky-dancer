import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS,
  SKY_DANCER_ARCADE_V404_RIVAL_NAME,
  skyDancerArcadeV404RivalAdaptation,
  skyDancerArcadeV404RivalManeuver,
} from "../src/sky/arcade/SkyDancerArcadeV404RivalAce";

function advanceSection(runtime: SkyDancerArcadeRuntime): void {
  const snapshot = runtime.getSnapshot();
  const choice = snapshot.branchOptions[0];
  runtime.completeCurrentStageForTests(choice);
  runtime.advanceResultForTests();
}

function runtimeAtSection(section: number, loadout: "standard" | "gun-focus" | "missile-focus" = "standard"): SkyDancerArcadeRuntime {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "arcade-run", loadout, seed: 0x404ace });
  while (runtime.getSnapshot().stageNumber < section) advanceSection(runtime);
  return runtime;
}

test("V40.4 authors three escalating NOVA-7 contacts after World Break route decisions", () => {
  assert.equal(SKY_DANCER_ARCADE_V404_RIVAL_NAME, "NOVA-7");
  assert.deepEqual(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS.map((entry) => entry.section), [2, 4, 6]);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].startProgress > .43);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].baseHp < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[1].baseHp);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[1].baseHp < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].baseHp);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].advantageTarget < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].advantageTarget);
});

test("V40.4 Rival adaptation reads the player's real loadout and route doctrine", () => {
  assert.match(skyDancerArcadeV404RivalAdaptation("gun-focus", "SAFE", 1), /CANNON READER · ARMOR BRACE/);
  assert.match(skyDancerArcadeV404RivalAdaptation("missile-focus", "SCORE", 2), /MISSILE BREAKER · EVASIVE ROLL/);
  assert.match(skyDancerArcadeV404RivalAdaptation("standard", "DANGER", 3), /TURBO HUNTER · JAMMER · DANGER CUT · NO RESERVE/);
});

test("V40.4 Rival flies a changing real dogfight sentence instead of one sinusoid", () => {
  const first = new Set(Array.from({ length: 9 }, (_, i) => skyDancerArcadeV404RivalManeuver(1, i * 1.45)));
  const final = new Set(Array.from({ length: 10 }, (_, i) => skyDancerArcadeV404RivalManeuver(3, i * 1.08)));
  for (const required of ["cross-pass", "parallel", "overtake", "close-bank"] as const) assert.ok(first.has(required));
  assert.ok(final.has("overtake"));
  assert.ok(final.has("cross-pass"));
  assert.ok(final.size >= 4);
});

test("V40.4 section two spawns one targetable persistent ace with dedicated telemetry", () => {
  const runtime = runtimeAtSection(2, "missile-focus");
  const id = runtime.triggerV404RivalSpawnForTests();
  const snapshot = runtime.getSnapshot();
  assert.ok(id !== null);
  assert.equal(snapshot.rivalAceActive, true);
  assert.equal(snapshot.rivalAceName, "NOVA-7");
  assert.equal(snapshot.rivalAceAppearance, 1);
  assert.match(snapshot.rivalAceAdaptation, /MISSILE BREAKER/);
  const rival = snapshot.enemies.find((enemy) => enemy.id === id);
  assert.equal(rival?.kind, "ace");
  assert.equal(rival?.rivalAce, true);
  assert.ok((rival?.hp ?? 0) > 100);
});

test("V40.4 breaking NOVA-7 wins the pass without turning the recurring pilot into a normal kill", () => {
  const runtime = runtimeAtSection(2);
  runtime.triggerV404RivalSpawnForTests();
  const beforeKills = runtime.getSnapshot().enemiesDefeated;
  runtime.triggerV404RivalOutcomeForTests("BROKEN");
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.rivalAceActive, false);
  assert.equal(snapshot.rivalAceOutcome, "BROKEN");
  assert.equal(snapshot.rivalAcePlayerWins, 1);
  assert.equal(snapshot.enemiesDefeated, beforeKills);
  assert.match(snapshot.message ?? "", /BROKEN · DISENGAGING/);
  assert.ok(snapshot.enemies.some((enemy) => enemy.rivalAce));
});

test("V40.4 pressure advantage can outfly the Rival without requiring an HP kill", () => {
  const runtime = runtimeAtSection(4, "gun-focus");
  runtime.triggerV404RivalSpawnForTests();
  runtime.triggerV404RivalOutcomeForTests("OUTFLOWN");
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.rivalAceOutcome, "OUTFLOWN");
  assert.equal(snapshot.rivalAcePlayerWins, 1);
  assert.equal(snapshot.rivalAceEscapes, 0);
  assert.match(snapshot.message ?? "", /OUTFLOWN/);
});

test("V40.4 an escape preserves the rivalry and later sections escalate to the same callsign", () => {
  const runtime = runtimeAtSection(2);
  runtime.triggerV404RivalSpawnForTests();
  runtime.triggerV404RivalOutcomeForTests("ESCAPED");
  assert.equal(runtime.getSnapshot().rivalAceEscapes, 1);
  advanceSection(runtime);
  advanceSection(runtime);
  assert.equal(runtime.getSnapshot().stageNumber, 4);
  runtime.triggerV404RivalSpawnForTests();
  const rematch = runtime.getSnapshot();
  assert.equal(rematch.rivalAceName, "NOVA-7");
  assert.equal(rematch.rivalAceAppearance, 2);
  assert.equal(rematch.rivalAceEncounters, 2);
  assert.equal(rematch.rivalAceEscapes, 1);
});

test("V40.4 final section-six duel resolves before Prism and has the strongest contract", () => {
  const runtime = runtimeAtSection(6);
  runtime.triggerV404RivalSpawnForTests();
  const contact = runtime.getSnapshot();
  assert.equal(contact.rivalAceAppearance, 3);
  assert.ok(contact.rivalAceMaxHp >= SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].baseHp);
  runtime.triggerV404RivalOutcomeForTests("BROKEN");
  const result = runtime.getSnapshot();
  assert.equal(result.rivalAcePlayerWins, 1);
  assert.match(result.message ?? "", /DEFEATED · SKY IS YOURS/);
});

test("V40.4 HUD and WebGL expose the named Rival without creating a second flight solver", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(ui, /RIVAL ACE · CONTACT/);
  assert.match(ui, /BREAK OR OUTFIGHT/);
  assert.match(css, /\.rivalAceHud/);
  assert.match(webgl, /arcade-rival-ace-identity/);
  assert.match(webgl, /snapshot\.rivalAceSerial/);
  assert.match(runtime, /skyDancerArcadeV404RivalManeuver\(encounter\.appearance, rival\.age\)/);
  assert.match(runtime, /skyDancerArcadeV25Step\(/);
  assert.doesNotMatch(runtime, /class Rival.*FlightSolver/);
});
