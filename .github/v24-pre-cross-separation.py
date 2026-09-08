from pathlib import Path
p=Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
s=p.read_text()
old='''            targetX = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.15) * 0.14), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 1.9 + enemy.phase) * 0.42, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.9) {
              enemy.maneuver = "cross-pass";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
'''
new='''            targetX = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.15) * 0.14), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            const preCrossLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;
            const preCross = clamp((enemy.maneuverClock - 1.35) / .55, 0, 1);
            // V24.2: establish vertical separation while still parallel. The maneuver label changes
            // only after the aircraft is physically clear, so the first cross-pass frame is never a near-overlap.
            targetY = clamp(
              this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 1.9 + enemy.phase) * 0.32 + preCrossLane * preCross * .82,
              -ENEMY_Y_LIMIT,
              ENEMY_Y_LIMIT,
            );
            const preCrossSeparation = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
            if (enemy.maneuverClock >= 1.9 && preCrossSeparation >= .68) {
              enemy.maneuver = "cross-pass";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
'''
if old not in s: raise SystemExit("parallel transition block not found")
s=s.replace(old,new,1)
p.write_text(s)
