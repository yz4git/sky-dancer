from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeV4030EnemyDamageState.ts")
text = path.read_text()
old = '''  let driver: THREE.Mesh | null = null;
  group.traverse((object) => {
    if (!driver && object instanceof THREE.Mesh && !object.name.startsWith("arcade-v4030-")) driver = object;
  });
  if (driver) {
    driver.onBeforeRender = () => {
      applyDamageRig(rig, skyDancerArcadeV4030DamageForEnemy(enemyId), enemyId);
      applySkyDancerArcadeV4031DirectionalDamage(rig, enemyId, kind);
    };
  }
'''
new = '''  const renderDrivers: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.name.startsWith("arcade-v4030-")) renderDrivers.push(object);
  });
  const driver = renderDrivers[0];
  if (driver) {
    driver.onBeforeRender = () => {
      applyDamageRig(rig, skyDancerArcadeV4030DamageForEnemy(enemyId), enemyId);
      applySkyDancerArcadeV4031DirectionalDamage(rig, enemyId, kind);
    };
  }
'''
if old not in text:
    raise SystemExit("V40.30 driver narrowing anchor not found")
path.write_text(text.replace(old, new, 1))
print("Fixed V40.30 render driver TypeScript narrowing")
