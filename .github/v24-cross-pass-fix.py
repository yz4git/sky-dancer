from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
test_path = Path("tests/sky-arcade-v24-flight-dynamics.test.ts")

runtime = runtime_path.read_text()
tests = test_path.read_text()

old = '''        } else if (enemy.maneuver === "cross-pass") {
          steeringUrgency = 1.35;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * delta;
            targetX = genericX();
            targetY = genericY();
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.45, 0, 1);
            // Lead with a destination on the opposite side; inertia turns this into a broad banked arc.
            targetX = clamp(this.playerX - enemy.maneuverSign * (1.82 + t * .24), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            const verticalLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;
            targetY = clamp(this.playerY * .35 + verticalLane * (.78 + Math.sin(t * Math.PI) * .18), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            enemy.depth = moveToward(enemy.depth, 13.8, delta * 8);
'''
new = '''        } else if (enemy.maneuver === "cross-pass") {
          steeringUrgency = 1.35;
          const verticalLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * delta;
            targetX = genericX();
            // V24.1: begin the altitude split before the lateral crossing. Real aircraft establish
            // vertical separation before slicing through another flight path rather than dodging at the merge point.
            const separationLead = clamp((34 - enemy.depth) / 15, 0, 1);
            targetY = clamp(genericY() + verticalLane * separationLead * .78, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.45, 0, 1);
            // Lead with a destination on the opposite side; inertia turns this into a broad banked arc.
            targetX = clamp(this.playerX - enemy.maneuverSign * (1.82 + t * .24), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * .25 + verticalLane * (1.08 + Math.sin(t * Math.PI) * .22), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            enemy.depth = moveToward(enemy.depth, 13.8, delta * 8);
'''
if old not in runtime:
    raise SystemExit("cross-pass block not found")
runtime = runtime.replace(old, new, 1)

tests = tests.replace(
    'assert.equal(skyDancerArcadeV24BankTarget(0, "approach"), 0);',
    'assert.ok(Math.abs(skyDancerArcadeV24BankTarget(0, "approach")) < 1e-12);',
)

runtime_path.write_text(runtime)
test_path.write_text(tests)
