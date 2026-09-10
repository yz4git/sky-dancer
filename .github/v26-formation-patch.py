from pathlib import Path

p = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
s = p.read_text()

old_import = 'import { skyDancerArcadeV25ClosureScale, skyDancerArcadeV25Step } from "./SkyDancerArcadeV25CoordinatedFlight";'
new_import = old_import + '\nimport { skyDancerArcadeV26FormationCommand } from "./SkyDancerArcadeV26FormationTactics";'
if old_import not in s:
    raise SystemExit('V25 import anchor not found')
s = s.replace(old_import, new_import, 1)

anchor = '''        const flightStateV25 = skyDancerArcadeV25Step(
          {
            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,
            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,
          },
          targetX,
          targetY,
          enemy.kind,
          delta,
          steeringUrgency,
          ENEMY_X_LIMIT,
          ENEMY_Y_LIMIT,
        );'''

replacement = '''        // V26: nearby aircraft now shape one another's steering target. This preserves the authored
        // maneuver state while making pairs establish pincer lanes, split through crossings and
        // re-form after a pass instead of independently converging on the same screen point.
        const formationNeighborsV26 = this.enemies
          .filter((other) => other.alive && !other.boss && other.id !== enemy.id && Math.abs(other.depth - enemy.depth) <= 18)
          .slice(0, 4)
          .map((other) => ({
            id: other.id,
            x: other.x,
            y: other.y,
            depth: other.depth,
            maneuverSign: other.maneuverSign,
          }));
        const formationV26 = skyDancerArcadeV26FormationCommand({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          depth: enemy.depth,
          maneuver: enemy.maneuver,
          maneuverSign: enemy.maneuverSign,
          targetX,
          targetY,
          playerX: this.playerX,
          playerY: this.playerY,
          steeringUrgency,
          neighbors: formationNeighborsV26,
          xLimit: ENEMY_X_LIMIT,
          yLimit: ENEMY_Y_LIMIT,
        });
        targetX = formationV26.targetX;
        targetY = formationV26.targetY;
        steeringUrgency = formationV26.steeringUrgency;

        const flightStateV25 = skyDancerArcadeV25Step(
          {
            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,
            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,
          },
          targetX,
          targetY,
          enemy.kind,
          delta,
          steeringUrgency,
          ENEMY_X_LIMIT,
          ENEMY_Y_LIMIT,
        );'''

if anchor not in s:
    raise SystemExit('V25 step anchor not found')
s = s.replace(anchor, replacement, 1)
p.write_text(s)
