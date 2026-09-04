from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


path = Path("src/sky/SkyDancerPlayerWeapons.ts")
source = path.read_text()
source = replace_once(
    source,
    "  lastHitEnemyId: string | null;\n  lastHitX: number;",
    "  lastHitEnemyId: string | null;\n  lastHitDestroyed: boolean;\n  lastHitX: number;",
    "weapon snapshot destroyed field",
)
source = replace_once(
    source,
    "  hitSerial: number;\n  lastHitEnemyId: string | null;\n  lastHitX: number;",
    "  hitSerial: number;\n  lastHitEnemyId: string | null;\n  lastHitDestroyed: boolean;\n  lastHitX: number;",
    "weapon internal destroyed field",
)
source = replace_once(
    source,
    "    hitSerial: 0,\n    lastHitEnemyId: null,\n    lastHitX: 0,",
    "    hitSerial: 0,\n    lastHitEnemyId: null,\n    lastHitDestroyed: false,\n    lastHitX: 0,",
    "weapon initial destroyed value",
)
source = replace_once(
    source,
    "    state.lastHitEnemyId = hit.id;\n    state.lastHitX = missile.x;",
    "    state.lastHitEnemyId = hit.id;\n    state.lastHitDestroyed = destroyed;\n    state.lastHitX = missile.x;",
    "weapon hit destroyed assignment",
)
source = replace_once(
    source,
    "    lastHitEnemyId: state.lastHitEnemyId,\n    lastHitX: state.lastHitX,",
    "    lastHitEnemyId: state.lastHitEnemyId,\n    lastHitDestroyed: state.lastHitDestroyed,\n    lastHitX: state.lastHitX,",
    "weapon snapshot destroyed return",
)
path.write_text(source)

path = Path("src/sky/SkyDancerAirCombatFxV18.ts")
source = path.read_text()
source = replace_once(
    source,
    "  const destroyed = Boolean(enemy && !enemy.alive);",
    "  // The weapon simulation owns the authoritative hit result. Formation/presence\n  // systems may already have recycled an enemy slot by the presentation frame,\n  // so never infer TARGET DOWN only from the current mutable enemy object.\n  const destroyed = weapon.lastHitDestroyed || Boolean(enemy && !enemy.alive);",
    "impact authoritative destroyed state",
)
path.write_text(source)

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
marker = "  assert.match(fxSource, /sky-raid-target-down-burst-v18/);\n"
addition = (
    "  assert.match(fxSource, /sky-raid-target-down-burst-v18/);\n"
    "  assert.match(fxSource, /weapon\\.lastHitDestroyed \\|\\| Boolean\\(enemy && !enemy\\.alive\\)/);\n"
)
source = replace_once(source, marker, addition, "impact regression assertion")
path.write_text(source)
