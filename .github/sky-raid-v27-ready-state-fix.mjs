import fs from "node:fs";

const flightPath = "src/sky/SkyDancerFlightCombat.ts";
let flight = fs.readFileSync(flightPath, "utf8");
const oldCooldownGate = '    if (memory.cooldown <= 0.04 || memory.cooldown > chargeWindow) continue;';
const newCooldownGate = '    if (memory.cooldown > chargeWindow) continue;';
if (!flight.includes(oldCooldownGate)) throw new Error("V27 ready-state cooldown gate marker missing");
flight = flight.replace(oldCooldownGate, newCooldownGate);

const oldAimGate = '    if (aimError > doctrine.missileAimTolerance + 0.34) continue;';
if (!flight.includes(oldAimGate)) throw new Error("V27 charge aim gate marker missing");
flight = flight.replace(
  oldAimGate,
  '    // Charge readability is intentionally independent from the exact fire-cone gate.\n    // tryLaunchMissiles still owns aim tolerance and therefore all real launch authority.',
);
flight = flight.replace(
  '    // exact launch gate; tryLaunchMissiles remains completely unchanged.',
  '    // exact launch gate. Once cooldown reaches zero, keep the cue fully charged while the aircraft waits for exact aim; tryLaunchMissiles remains completely unchanged.',
);
fs.writeFileSync(flightPath, flight);

const testPath = "tests/sky-sky-raid.test.ts";
let test = fs.readFileSync(testPath, "utf8");
const oldCooldownTest = '  assert.match(flightSource, /memory\\.cooldown <= 0\\.04/);';
const newCooldownTest = '  assert.match(flightSource, /memory\\.cooldown > chargeWindow/);\n  assert.doesNotMatch(flightSource, /memory\\.cooldown <= 0\\.04/);';
if (!test.includes(oldCooldownTest)) throw new Error("V27 ready-state test marker missing");
test = test.replace(oldCooldownTest, newCooldownTest);

const oldAimTest = '  assert.match(flightSource, /doctrine\\.missileAimTolerance \\+ 0\\.34/);';
const newAimTest = '  assert.doesNotMatch(flightSource, /doctrine\\.missileAimTolerance \\+ 0\\.34/);\n  assert.match(flightSource, /tryLaunchMissiles\\(session, state\\)/);';
if (!test.includes(oldAimTest)) throw new Error("V27 charge aim test marker missing");
test = test.replace(oldAimTest, newAimTest);
fs.writeFileSync(testPath, test);

console.log("SKY RAID V27 ready-state charge cue fixed without changing fire authority");
