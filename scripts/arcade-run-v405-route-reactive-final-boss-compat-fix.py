from pathlib import Path

path = Path("tests/sky-arcade-bosses.test.ts")
source = path.read_text()
source = source.replace(
    "    assert.equal(phase1.bossMechanicLabel, profile.mechanicLabels[0]);",
    "    assert.equal(phase1.bossMechanicLabel, stage.id === \"prism-citadel\" ? \"SEVEN SKY ARMOR\" : profile.mechanicLabels[0]);",
    1,
)
source = source.replace(
    "    assert.equal(phase2.bossMechanicLabel, profile.mechanicLabels[1]);",
    "    assert.equal(phase2.bossMechanicLabel, stage.id === \"prism-citadel\" ? \"ROUTE ECHO ARRAY\" : profile.mechanicLabels[1]);",
    1,
)
source = source.replace(
    "    assert.equal(phase3.bossMechanicLabel, profile.mechanicLabels[2]);",
    "    assert.equal(phase3.bossMechanicLabel, stage.id === \"prism-citadel\" ? \"SPECTRUM OVERDRIVE · FINAL MEMORY\" : profile.mechanicLabels[2]);",
    1,
)
source = source.replace(
    "    if (profile.phaseHazards[2]) assert.ok(phase3.hazards.some(h => h.kind === profile.phaseHazards[2]), `${stage.id} phase3 hazard`);",
    "    if (stage.id === \"prism-citadel\") assert.ok(phase3.hazards.some(h => h.kind === \"debris\"), `${stage.id} V40.5 phase3 route-memory hazard`);\n    else if (profile.phaseHazards[2]) assert.ok(phase3.hazards.some(h => h.kind === profile.phaseHazards[2]), `${stage.id} phase3 hazard`);",
    1,
)
if "SEVEN SKY ARMOR" not in source or "ROUTE ECHO ARRAY" not in source or "SPECTRUM OVERDRIVE · FINAL MEMORY" not in source or "V40.5 phase3 route-memory hazard" not in source:
    raise SystemExit("V40.5 legacy boss compatibility patch did not apply")
path.write_text(source)
print("V40.5 legacy boss test compatibility fixed")
