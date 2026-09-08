from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")

runtime = runtime_path.read_text()
webgl = webgl_path.read_text()

IMPORT_MARKER = '''import {
  skyDancerArcadeV122EncounterContinuity,
  type SkyDancerArcadeV122FlowSign,
} from "./SkyDancerArcadeV122EncounterContinuity";
'''
V24_IMPORT = IMPORT_MARKER + '''import { skyDancerArcadeV24Steer } from "./SkyDancerArcadeV24FlightDynamics";
'''
if 'SkyDancerArcadeV24FlightDynamics' not in runtime:
    assert IMPORT_MARKER in runtime
    runtime = runtime.replace(IMPORT_MARKER, V24_IMPORT, 1)

INTERFACE_MARKER = '''  maneuverClock: number;
  maneuverSign: number;
  loadoutStaggerRewarded: boolean;
'''
INTERFACE_REPLACEMENT = '''  maneuverClock: number;
  maneuverSign: number;
  // V24: actual lateral/vertical velocity carries through steering changes so enemies arc instead of strafing.
  flightVX: number;
  flightVY: number;
  loadoutStaggerRewarded: boolean;
'''
if 'flightVX: number;' not in runtime:
    assert INTERFACE_MARKER in runtime
    runtime = runtime.replace(INTERFACE_MARKER, INTERFACE_REPLACEMENT, 1)

SPAWN_MARKER = '''      maneuverClock: 0,
      maneuverSign: maneuverSign < 0 ? -1 : 1,
      loadoutStaggerRewarded: false,
'''
SPAWN_REPLACEMENT = '''      maneuverClock: 0,
      maneuverSign: maneuverSign < 0 ? -1 : 1,
      flightVX: 0,
      flightVY: 0,
      loadoutStaggerRewarded: false,
'''
if 'maneuverSign: maneuverSign < 0 ? -1 : 1,\n      flightVX: 0' not in runtime:
    assert SPAWN_MARKER in runtime
    runtime = runtime.replace(SPAWN_MARKER, SPAWN_REPLACEMENT, 1)

BOSS_MARKER = '''      maneuverClock: 0,
      maneuverSign: 1,
      loadoutStaggerRewarded: false,
'''
BOSS_REPLACEMENT = '''      maneuverClock: 0,
      maneuverSign: 1,
      flightVX: 0,
      flightVY: 0,
      loadoutStaggerRewarded: false,
'''
if 'maneuverSign: 1,\n      flightVX: 0' not in runtime:
    assert BOSS_MARKER in runtime
    runtime = runtime.replace(BOSS_MARKER, BOSS_REPLACEMENT, 1)

start_marker = '''      } else {
        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);
'''
end_marker = '''      if (enemy.counterplay === "armor-brace") enemy.fireCooldown += delta * .42;
'''
if 'const flightStateV24 = skyDancerArcadeV24Steer(' not in runtime:
    start = runtime.index(start_marker)
    end = runtime.index(end_marker, start)
    replacement = '''      } else {
        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);
        const frequency = motionProfileV20.frequency;
        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, motionProfileV20.pursuitCap);
        const close = clamp((68 - enemy.depth) / 54, 0, 1);
        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;
        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.82;
        const flankX = Math.sin(enemy.phase * 1.91) * close * 0.42;
        const flankY = Math.cos(enemy.phase * 1.37) * close * 0.28;
        const genericX = () => clamp(enemy.baseX + weaveX + this.playerX * pursuit + flankX, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const genericY = () => clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.82 + flankY, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
        let targetX = enemy.x;
        let targetY = enemy.y;
        let steeringUrgency = 1;

        if (enemy.maneuver === "overtake") {
          steeringUrgency = 1.12;
          if (enemy.depth < 24) {
            // V24: the pass still accelerates forward, but lateral placement is now a steering target.
            enemy.depth += Math.max(32, enemy.speed * 2.25) * delta;
            const pass = clamp((enemy.depth + 6.4) / 30.4, 0, 1);
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.94 - pass * 0.66) + Math.sin(enemy.age * 3.4) * 0.08, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.56 + enemy.baseY * 0.28 + Math.sin(enemy.age * 2.8 + enemy.phase) * 0.22, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          } else {
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5);
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.22 + Math.sin(enemy.maneuverClock * 2.45) * 0.16), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.65 + Math.sin(enemy.maneuverClock * 2.2 + enemy.phase) * 0.4, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.15) {
              enemy.maneuver = "close-bank";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "parallel") {
          steeringUrgency = .88;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.5 * delta;
            targetX = clamp(genericX() + enemy.maneuverSign * 0.34, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = genericY();
          } else {
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5);
            // Match the player with lag rather than gluing the aircraft to the canopy.
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.15) * 0.14), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 1.9 + enemy.phase) * 0.42, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.9) {
              enemy.maneuver = "cross-pass";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "cross-pass") {
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
            if (enemy.maneuverClock >= 1.45) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x - enemy.maneuverSign * 0.42;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "close-bank") {
          steeringUrgency = 1.2;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * delta;
            targetX = genericX();
            targetY = genericY();
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.8, 0, 1);
            const arc = Math.sin(t * Math.PI);
            enemy.depth = moveToward(enemy.depth, 13.2 + Math.sin(enemy.maneuverClock * 2.45) * 1.15, delta * 7.6);
            // The target sweeps inward and back out; velocity continuity supplies the visible turn radius.
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.56 - arc * .74), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.7 + enemy.baseY * 0.22 + Math.sin(t * Math.PI * 1.35 + enemy.phase) * 0.58, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.8) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = clamp(enemy.x + enemy.maneuverSign * 0.7, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
              enemy.baseY = enemy.y;
              enemy.amplitude = Math.min(1.25, enemy.amplitude * 1.15);
            }
          }
        } else {
          enemy.depth -= enemy.speed * delta;
          targetX = genericX();
          targetY = genericY();
        }

        if (enemy.counterplay === "evasive-roll") {
          const intensity = .35 + enemy.counterplayIntensity * .65;
          // Evasion requests a new flight path; it no longer teleports the hull sideways every frame.
          targetX = clamp(targetX + Math.sin(enemy.age * 7.1 + enemy.phase) * .52 * intensity + enemy.maneuverSign * .08, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
          targetY = clamp(targetY + Math.cos(enemy.age * 5.8 + enemy.phase * 1.3) * .34 * intensity, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          steeringUrgency = Math.max(steeringUrgency, 1.25);
        }
        const flightStateV24 = skyDancerArcadeV24Steer(
          { x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY },
          targetX,
          targetY,
          enemy.kind,
          delta,
          steeringUrgency,
          ENEMY_X_LIMIT,
          ENEMY_Y_LIMIT,
        );
        enemy.x = flightStateV24.x;
        enemy.y = flightStateV24.y;
        enemy.flightVX = flightStateV24.vx;
        enemy.flightVY = flightStateV24.vy;
      }
'''
    runtime = runtime[:start] + replacement + runtime[end:]

WEBGL_IMPORT_MARKER = '''import { SkyDancerArcadeV11SetpieceDirector } from "./SkyDancerArcadeV11Setpieces";
'''
WEBGL_IMPORT_REPLACEMENT = WEBGL_IMPORT_MARKER + '''import { skyDancerArcadeV24BankTarget, skyDancerArcadeV24HeadingOffset } from "./SkyDancerArcadeV24FlightDynamics";
'''
if 'skyDancerArcadeV24HeadingOffset' not in webgl:
    assert WEBGL_IMPORT_MARKER in webgl
    webgl = webgl.replace(WEBGL_IMPORT_MARKER, WEBGL_IMPORT_REPLACEMENT, 1)

ATTITUDE_OLD = '''      const targetHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));
      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 7.5 : 5.8));
      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .035, -.2, .2) + (reaction?.pitch ?? 0);
      const maneuverBank = THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);
      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .08) + (reaction?.roll ?? 0);
      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 8);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 9);
'''
ATTITUDE_NEW = '''      const baseHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
      const turnHeading = enemy.boss ? 0 : skyDancerArcadeV24HeadingOffset(lateralVelocity, enemy.maneuver);
      const targetHeading = baseHeading + turnHeading;
      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));
      // V24: the nose leads the curved trajectory with finite yaw response instead of staying camera-square while strafing.
      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 5.4 : 4.6));
      const turnLift = enemy.boss ? 0 : Math.min(.055, Math.abs(lateralVelocity) * .022);
      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .042, -.24, .24) + turnLift + (reaction?.pitch ?? 0);
      const maneuverBank = enemy.boss
        ? THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64)
        : skyDancerArcadeV24BankTarget(lateralVelocity, enemy.maneuver);
      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.45) * (enemy.boss ? .025 : .045) + (reaction?.roll ?? 0);
      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.5);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 6.8);
'''
if 'const turnHeading = enemy.boss ? 0 : skyDancerArcadeV24HeadingOffset' not in webgl:
    assert ATTITUDE_OLD in webgl
    webgl = webgl.replace(ATTITUDE_OLD, ATTITUDE_NEW, 1)

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
print("V24 aircraft behavior patch applied")
