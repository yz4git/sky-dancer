from pathlib import Path

helper = Path('src/sky/arcade/SkyDancerArcadeV122EncounterContinuity.ts')
s = helper.read_text()
old = '''  const lateralBias = entrySign === 0
    ? 0
    : entrySign * clamp(.34 + input.phaseIndex * .16 + Math.min(4, survivorCount) * .035, .34, .92);
'''
new = '''  const lateralBias = entrySign === 0
    ? 0
    : entrySign * clamp(.74 + input.phaseIndex * .18 + Math.min(4, survivorCount) * .04, .74, 1.18);
'''
if old not in s:
    raise SystemExit('V12.2 bias anchor missing')
helper.write_text(s.replace(old, new, 1))

runtime = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
s = runtime.read_text()
old = '''      const flowBias = phaseIndex > 0 && maneuver !== "overtake" ? continuity.lateralBias : 0;
      const x = maneuver === "overtake"
        ? sign * 1.9
        : maneuver === "cross-pass"
          ? clamp(formationX + sign * .18 + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT)
          : clamp(formationX + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
'''
new = '''      const flowActive = phaseIndex > 0 && maneuver !== "overtake" && continuity.entrySign !== 0;
      const flowBias = flowActive ? continuity.lateralBias : 0;
      // Continuity does not discard the authored formation: it compresses its width,
      // then recenters it into the lane the player is trying to escape through.
      // This also guarantees a one-ship reinforcement can actually occupy that lane.
      const flowFormationX = flowActive ? formationX * .45 : formationX;
      const x = maneuver === "overtake"
        ? sign * 1.9
        : maneuver === "cross-pass"
          ? clamp(flowFormationX + sign * .18 + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT)
          : clamp(flowFormationX + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
'''
if old not in s:
    raise SystemExit('V12.2 runtime lane anchor missing')
runtime.write_text(s.replace(old, new, 1))
