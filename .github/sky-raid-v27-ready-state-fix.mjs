import fs from "node:fs";

const flightPath = "src/sky/SkyDancerFlightCombat.ts";
let flight = fs.readFileSync(flightPath, "utf8");
const oldGate = '    if (memory.cooldown <= 0.04 || memory.cooldown > chargeWindow) continue;';
const newGate = '    if (memory.cooldown > chargeWindow) continue;';
if (!flight.includes(oldGate)) throw new Error("V27 ready-state cooldown gate marker missing");
flight = flight.replace(oldGate, newGate);
flight = flight.replace(
  '    // exact launch gate; tryLaunchMissiles remains completely unchanged.',
  '    // exact launch gate. Once cooldown reaches zero, keep the cue fully charged while the aircraft waits for exact aim; tryLaunchMissiles remains completely unchanged.',
);
fs.writeFileSync(flightPath, flight);

const testPath = "tests/sky-sky-raid.test.ts";
let test = fs.readFileSync(testPath, "utf8");
const oldTest = '  assert.match(flightSource, /memory\\.cooldown <= 0\\.04/);';
const newTest = '  assert.match(flightSource, /memory\\.cooldown > chargeWindow/);\n  assert.doesNotMatch(flightSource, /memory\\.cooldown <= 0\\.04/);';
if (!test.includes(oldTest)) throw new Error("V27 ready-state test marker missing");
test = test.replace(oldTest, newTest);
fs.writeFileSync(testPath, test);

console.log("SKY RAID V27 ready-state telegraph gap fixed");
