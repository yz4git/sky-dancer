from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
text = path.read_text()

import_anchor = '''import {
  skyDancerArcadeV271CueBudget,
  skyDancerArcadeV271ThreatCueScore,
} from "./SkyDancerArcadeV271ScreenPolish";
'''
import_replacement = import_anchor + 'import { skyDancerArcadeV28ReadableAttitude } from "./SkyDancerArcadeV28DogfightReadability";\n'
assert import_anchor in text, "V27.1 import anchor changed"
assert 'SkyDancerArcadeV28DogfightReadability' not in text, "V28 import already present"
text = text.replace(import_anchor, import_replacement, 1)

rotation_anchor = '''      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.2);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 7.4);
      let existingRing = group.getObjectByName("arcade-lock-ring");
'''
rotation_replacement = '''      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.2);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 7.4);

      // V28: animate only the nested visual body so close dogfight aircraft reveal top/underside/side
      // surfaces without touching authoritative heading, lock UI, collision or hit reactions.
      const readableRigV28 = group.getObjectByName("arcade-enemy-v19-readable-attitude-rig");
      if (!enemy.boss && readableRigV28 instanceof THREE.Group) {
        const readableV28 = skyDancerArcadeV28ReadableAttitude({
          kind: enemy.kind,
          maneuver: enemy.maneuver,
          depth: enemy.depth,
          relativeX: enemy.x - snapshot.playerX,
          relativeY: enemy.y - snapshot.playerY,
          lateralVelocity,
          verticalVelocity,
          lateralAcceleration,
          verticalAcceleration,
          id: enemy.id,
          runTimeSeconds: snapshot.runTimeSeconds,
        });
        const basePitchV19 = Number(readableRigV28.userData.arcadeEnemyPitchBiasV19 ?? 0);
        const baseYawV19 = Number(readableRigV28.userData.arcadeEnemyYawBiasV19 ?? 0);
        const baseRollV19 = Number(readableRigV28.userData.arcadeEnemyRollBiasV19 ?? 0);
        const attitudeResponseV28 = Math.min(1, delta * readableV28.response);
        readableRigV28.rotation.x += (basePitchV19 + readableV28.pitchOffset - readableRigV28.rotation.x) * attitudeResponseV28;
        readableRigV28.rotation.y += (baseYawV19 + readableV28.yawOffset - readableRigV28.rotation.y) * attitudeResponseV28;
        readableRigV28.rotation.z += (baseRollV19 + readableV28.rollOffset - readableRigV28.rotation.z) * attitudeResponseV28;
        readableRigV28.userData.arcadeEnemyReadableAttitudeV28 = true;
        readableRigV28.userData.arcadeEnemyRevealV28 = readableV28.reveal;
        group.userData.arcadeEnemyLogicalCollisionUnchangedV28 = true;
      }
      let existingRing = group.getObjectByName("arcade-lock-ring");
'''
assert rotation_anchor in text, "enemy rotation anchor changed"
text = text.replace(rotation_anchor, rotation_replacement, 1)

path.write_text(text)
print("V28 WebGL dogfight readability integration applied")
