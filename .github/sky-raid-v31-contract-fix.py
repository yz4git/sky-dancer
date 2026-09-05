from pathlib import Path

path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()


def rep(before: str, after: str, label: str) -> None:
    global source
    if before not in source:
        raise SystemExit(f"V31 contract marker missing: {label}")
    source = source.replace(before, after, 1)


rep(
    "scratch = { throttle: 0, brake: 0, steer: 0, strafe: 0, boost: false };",
    "scratch = { throttle: 0, brake: 0, steer: skyDancerSkyRaidSteerInput(input.steer), strafe: 0, boost: false };",
    "steering source contract",
)

comment_marker = "/**\n * Simulation-space engagement"
if "function skyRaidScreenSlotsFor(" not in source:
    helper = '''function skyRaidScreenSlotsFor(elapsedSeconds: number): readonly SkyRaidFormationSlot[] {
  // Preserve the doctrine ownership boundary without allocating a mapped slot
  // array every render frame. Phone-safe clamping happens only for slots that
  // are actually recycled onto screen.
  return skyRaidFormationPattern(elapsedSeconds).slots;
}

'''
    if comment_marker not in source:
        raise SystemExit("V31 contract marker missing: screen slot insertion point")
    source = source.replace(comment_marker, helper + comment_marker, 1)

rep(
    "const pattern = skyRaidFormationPattern(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);",
    "const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);",
    "screen recycler doctrine call",
)
rep(
    "const authoredSlot = pattern.slots[(state.cursor + index) % pattern.slots.length];",
    "const authoredSlot = screenSlots[(state.cursor + index) % screenSlots.length];",
    "screen recycler slot lookup",
)
rep(
    "state.cursor = (state.cursor + needed) % pattern.slots.length;",
    "state.cursor = (state.cursor + needed) % screenSlots.length;",
    "screen recycler cursor",
)

path.write_text(source)
print("SKY RAID V31 source contracts restored without restoring per-frame slot allocation")
