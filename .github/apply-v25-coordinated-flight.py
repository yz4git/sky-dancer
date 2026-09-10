from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")

runtime = runtime_path.read_text()
webgl = webgl_path.read_text()

runtime = runtime.replace(
    'import { skyDancerArcadeV24Steer } from "./SkyDancerArcadeV24FlightDynamics";\n',
    'import { skyDancerArcadeV25ClosureScale, skyDancerArcadeV25Step } from "./SkyDancerArcadeV25CoordinatedFlight";\n',
    1,
)

old_fields = '''  flightVX: number;\n  flightVY: number;\n  loadoutStaggerRewarded: boolean;\n'''
new_fields = '''  flightVX: number;\n  flightVY: number;\n  // V25: coordinated-turn state. Bank/pitch generate acceleration; energy softly couples maneuver load to closure speed.\n  flightBank: number;\n  flightPitch: number;\n  flightEnergy: number;\n  loadoutStaggerRewarded: boolean;\n'''
if 'flightEnergy: number;' not in runtime:
    assert old_fields in runtime
    runtime = runtime.replace(old_fields, new_fields, 1)

runtime = runtime.replace(
    '''      flightVX: 0,\n      flightVY: 0,\n      loadoutStaggerRewarded: false,\n''',
    '''      flightVX: 0,\n      flightVY: 0,\n      flightBank: 0,\n      flightPitch: 0,\n      flightEnergy: 1,\n      loadoutStaggerRewarded: false,\n''',
)

nonboss_marker = '''      } else {\n        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);\n'''
nonboss_replacement = '''      } else {\n        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);\n        const closureScaleV25 = skyDancerArcadeV25ClosureScale(\n          enemy.kind, enemy.flightEnergy, enemy.flightBank, enemy.flightPitch, enemy.maneuver,\n        );\n'''
if 'const closureScaleV25 = skyDancerArcadeV25ClosureScale(' not in runtime:
    assert nonboss_marker in runtime
    runtime = runtime.replace(nonboss_marker, nonboss_replacement, 1)

replacements = {
    'enemy.depth += Math.max(32, enemy.speed * 2.25) * delta;': 'enemy.depth += Math.max(32, enemy.speed * 2.25) * closureScaleV25 * delta;',
    'enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5);': 'enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5 * closureScaleV25);',
    'enemy.depth -= enemy.speed * 1.5 * delta;': 'enemy.depth -= enemy.speed * 1.5 * closureScaleV25 * delta;',
    'enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5);': 'enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5 * closureScaleV25);',
    'enemy.depth -= enemy.speed * 1.42 * delta;': 'enemy.depth -= enemy.speed * 1.42 * closureScaleV25 * delta;',
    'enemy.depth = moveToward(enemy.depth, 13.8, delta * 8);': 'enemy.depth = moveToward(enemy.depth, 13.8, delta * 8 * closureScaleV25);',
    'enemy.depth = moveToward(enemy.depth, 13.2 + Math.sin(enemy.maneuverClock * 2.45) * 1.15, delta * 7.6);': 'enemy.depth = moveToward(enemy.depth, 13.2 + Math.sin(enemy.maneuverClock * 2.45) * 1.15, delta * 7.6 * closureScaleV25);',
    'enemy.depth -= enemy.speed * delta;': 'enemy.depth -= enemy.speed * closureScaleV25 * delta;',
}
for old, new in replacements.items():
    runtime = runtime.replace(old, new)

old_step = '''        const flightStateV24 = skyDancerArcadeV24Steer(\n          { x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY },\n          targetX,\n          targetY,\n          enemy.kind,\n          delta,\n          steeringUrgency,\n          ENEMY_X_LIMIT,\n          ENEMY_Y_LIMIT,\n        );\n        enemy.x = flightStateV24.x;\n        enemy.y = flightStateV24.y;\n        enemy.flightVX = flightStateV24.vx;\n        enemy.flightVY = flightStateV24.vy;\n'''
new_step = '''        const flightStateV25 = skyDancerArcadeV25Step(\n          {\n            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,\n            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,\n          },\n          targetX,\n          targetY,\n          enemy.kind,\n          delta,\n          steeringUrgency,\n          ENEMY_X_LIMIT,\n          ENEMY_Y_LIMIT,\n        );\n        enemy.x = flightStateV25.x;\n        enemy.y = flightStateV25.y;\n        enemy.flightVX = flightStateV25.vx;\n        enemy.flightVY = flightStateV25.vy;\n        enemy.flightBank = flightStateV25.bank;\n        enemy.flightPitch = flightStateV25.pitch;\n        enemy.flightEnergy = flightStateV25.energy;\n'''
if 'const flightStateV25 = skyDancerArcadeV25Step(' not in runtime:
    assert old_step in runtime
    runtime = runtime.replace(old_step, new_step, 1)

# WebGL: attitude comes from acceleration so the roll visually leads the curved path.
webgl = webgl.replace(
    'import { skyDancerArcadeV24BankTarget, skyDancerArcadeV24HeadingOffset } from "./SkyDancerArcadeV24FlightDynamics";\n',
    'import { skyDancerArcadeV25VisualAttitude } from "./SkyDancerArcadeV25CoordinatedFlight";\n',
    1,
)

history_marker = '''  private readonly enemyHitReactions = new Map<number, EnemyHitReaction>();\n'''
history_replacement = '''  private readonly enemyHitReactions = new Map<number, EnemyHitReaction>();\n  // V25: previous render-space velocity lets bank follow acceleration rather than sideways displacement.\n  private readonly enemyVelocityHistory = new Map<number, { vx: number; vy: number }>();\n'''
if 'enemyVelocityHistory' not in webgl:
    assert history_marker in webgl
    webgl = webgl.replace(history_marker, history_replacement, 1)

old_attitude = '''      const previousEnemy = this.previousSnapshot.enemies.find((previous) => previous.id === enemy.id);\n      const safeDelta = Math.max(delta, 1 / 120);\n      const lateralVelocity = previousEnemy ? (enemy.x - previousEnemy.x) / safeDelta : 0;\n      const verticalVelocity = previousEnemy ? (enemy.y - previousEnemy.y) / safeDelta : 0;\n      const baseHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;\n      const turnHeading = enemy.boss ? 0 : skyDancerArcadeV24HeadingOffset(lateralVelocity, enemy.maneuver);\n      const targetHeading = baseHeading + turnHeading;\n      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));\n      // V24: the nose leads the curved trajectory with finite yaw response instead of staying camera-square while strafing.\n      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 5.4 : 4.6));\n      const turnLift = enemy.boss ? 0 : Math.min(.055, Math.abs(lateralVelocity) * .022);\n      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .042, -.24, .24) + turnLift + (reaction?.pitch ?? 0);\n      const maneuverBank = enemy.boss\n        ? THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64)\n        : skyDancerArcadeV24BankTarget(lateralVelocity, enemy.maneuver);\n      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.45) * (enemy.boss ? .025 : .045) + (reaction?.roll ?? 0);\n      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.5);\n      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 6.8);\n'''
new_attitude = '''      const previousEnemy = this.previousSnapshot.enemies.find((previous) => previous.id === enemy.id);\n      const safeDelta = Math.max(delta, 1 / 120);\n      const lateralVelocity = previousEnemy ? (enemy.x - previousEnemy.x) / safeDelta : 0;\n      const verticalVelocity = previousEnemy ? (enemy.y - previousEnemy.y) / safeDelta : 0;\n      const previousVelocity = this.enemyVelocityHistory.get(enemy.id);\n      const lateralAcceleration = previousVelocity\n        ? THREE.MathUtils.clamp((lateralVelocity - previousVelocity.vx) / safeDelta, -12, 12)\n        : 0;\n      const verticalAcceleration = previousVelocity\n        ? THREE.MathUtils.clamp((verticalVelocity - previousVelocity.vy) / safeDelta, -10, 10)\n        : 0;\n      this.enemyVelocityHistory.set(enemy.id, { vx: lateralVelocity, vy: verticalVelocity });\n      const coordinated = enemy.boss\n        ? null\n        : skyDancerArcadeV25VisualAttitude(\n            lateralVelocity, verticalVelocity, lateralAcceleration, verticalAcceleration, enemy.maneuver,\n          );\n      const baseHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;\n      const targetHeading = baseHeading + (coordinated?.headingOffset ?? 0);\n      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));\n      // V25: roll follows acceleration, so the airframe banks before its path visibly bends instead of skidding sideways.\n      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 5.2 : 4.45));\n      const bossTurnLift = enemy.boss ? Math.min(.055, Math.abs(lateralVelocity) * .022) : 0;\n      const targetPitch = course.pitch * .72\n        + (coordinated?.pitchOffset ?? THREE.MathUtils.clamp(verticalVelocity * .042, -.24, .24) + bossTurnLift)\n        + (reaction?.pitch ?? 0);\n      const maneuverBank = coordinated?.bank ?? THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);\n      const targetBank = maneuverBank + course.bank * .46\n        + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.35) * (enemy.boss ? .025 : .032)\n        + (reaction?.roll ?? 0);\n      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.2);\n      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 7.4);\n'''
if 'const coordinated = enemy.boss' not in webgl:
    assert old_attitude in webgl
    webgl = webgl.replace(old_attitude, new_attitude, 1)

cleanup_old = '''      this.enemyGroups.delete(id);\n      this.enemyHitReactions.delete(id);\n      this.entityRoot.remove(group);\n'''
cleanup_new = '''      this.enemyGroups.delete(id);\n      this.enemyHitReactions.delete(id);\n      this.enemyVelocityHistory.delete(id);\n      this.entityRoot.remove(group);\n'''
if 'this.enemyVelocityHistory.delete(id);' not in webgl:
    assert cleanup_old in webgl
    webgl = webgl.replace(cleanup_old, cleanup_new, 1)

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
print("V25 coordinated-flight patch applied")
