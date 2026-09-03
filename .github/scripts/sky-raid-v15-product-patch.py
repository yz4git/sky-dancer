from pathlib import Path

def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"{label}: marker missing in {path}")
    p.write_text(text.replace(old, new, 1))

# Player weapons: use actual player altitude for 3D selection, launch, and lock telemetry.
p = Path("src/sky/SkyDancerPlayerWeapons.ts")
s = p.read_text()

pairs = [
(
"""  altitudeMeters: number;
  distance: number;
  angle: number;
}""",
"""  altitudeMeters: number;
  playerAltitudeMeters: number;
  altitudeDeltaMeters: number;
  distance: number;
  angle: number;
  signedAngle: number;
}""",
"lock snapshot interface",
),
(
"""interface WeaponSessionView {
  enemies: CartEnemyState[];""",
"""interface WeaponSessionView {
  skyDancerPlayerAltitudeMeters?: number;
  enemies: CartEnemyState[];""",
"weapon session interface",
),
(
"""function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
""",
"""function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function playerAltitudeMeters(session: WeaponSessionView): number {
  const altitude = Number(session.skyDancerPlayerAltitudeMeters ?? 0);
  return Number.isFinite(altitude) ? altitude : 0;
}
""",
"player altitude helper",
),
(
"""  const px = session.car.position.x;
  const pz = session.car.position.z;
  const heading = session.car.heading;
  let best: CartEnemyState | null = null;""",
"""  const px = session.car.position.x;
  const pz = session.car.position.z;
  const heading = session.car.heading;
  const playerAltitude = playerAltitudeMeters(session);
  let best: CartEnemyState | null = null;""",
"target player altitude",
),
(
"""  const launchSpeed = 24 + Math.min(4.5, Math.abs(session.car.forwardVelocity) * 0.14);
  const targetAltitude = target ? getSkyDancerEnemyAltitudeMetersV43(target) : 0;""",
"""  const launchSpeed = 24 + Math.min(4.5, Math.abs(session.car.forwardVelocity) * 0.14);
  const playerAltitude = playerAltitudeMeters(session);
  const targetAltitude = target ? getSkyDancerEnemyAltitudeMetersV43(target) : playerAltitude;""",
"launch player altitude",
),
(
"""export function getSkyDancerPlayerLockSnapshotV45(session: CartArenaSession): SkyDancerPlayerLockSnapshotV45 {
  const view = session as unknown as WeaponSessionView;
  const target = chooseTarget(view);""",
"""export function getSkyDancerPlayerLockSnapshotV45(session: CartArenaSession): SkyDancerPlayerLockSnapshotV45 {
  const view = session as unknown as WeaponSessionView;
  const playerAltitude = playerAltitudeMeters(view);
  const target = chooseTarget(view);""",
"lock player altitude",
),
(
"""      vulnerable: false,
      altitudeMeters: 0,
      distance: Number.POSITIVE_INFINITY,
      angle: 0,
    };""",
"""      vulnerable: false,
      altitudeMeters: 0,
      playerAltitudeMeters: playerAltitude,
      altitudeDeltaMeters: 0,
      distance: Number.POSITIVE_INFINITY,
      angle: 0,
      signedAngle: 0,
    };""",
"empty lock telemetry",
),
]
for old, new, label in pairs:
    if old not in s:
        raise SystemExit(f"{label}: marker missing")
    s = s.replace(old, new, 1)

simple_pairs = [
(
"const distance = skyDancerDistance3DV43(px, 0, pz, enemy.x, altitude, enemy.z);",
"const distance = skyDancerDistance3DV43(px, playerAltitude, pz, enemy.x, altitude, enemy.z);",
"target 3D distance",
),
(
"const verticalPenalty = Math.abs(altitude) * 0.12;",
"const verticalPenalty = Math.abs(altitude - playerAltitude) * 0.12;",
"target vertical penalty",
),
(
"Math.atan2(targetAltitude, Math.max(8, horizontalDistance)) * 0.28",
"Math.atan2(targetAltitude - playerAltitude, Math.max(8, horizontalDistance)) * 0.28",
"initial missile pitch",
),
(
"    altitudeOffsetMeters: 0,\n",
"    altitudeOffsetMeters: playerAltitude,\n",
"missile altitude",
),
(
"? skyDancerDistance3DV43(session.car.position.x, 0, session.car.position.z, target.x, targetAltitude, target.z)",
"? skyDancerDistance3DV43(session.car.position.x, playerAltitude, session.car.position.z, target.x, targetAltitude, target.z)",
"missile target distance",
),
]
for old, new, label in simple_pairs:
    if old not in s:
        raise SystemExit(f"{label}: marker missing")
    s = s.replace(old, new, 1)

lock_start = s.index("export function getSkyDancerPlayerLockSnapshotV45")
lock_end = s.index("export function getSkyDancerPlayerWeaponState", lock_start)
lock = s[lock_start:lock_end]
old = """    view.car.position.x,
    0,
    view.car.position.z,"""
new = """    view.car.position.x,
    playerAltitude,
    view.car.position.z,"""
if old not in lock:
    raise SystemExit("lock distance player Y marker missing")
lock = lock.replace(old, new, 1)
old = "  const angle = Math.abs(normalizeAngle(Math.atan2(dx, dz) - view.car.heading));"
new = "  const signedAngle = normalizeAngle(Math.atan2(dx, dz) - view.car.heading);\n  const angle = Math.abs(signedAngle);"
if old not in lock:
    raise SystemExit("lock angle marker missing")
lock = lock.replace(old, new, 1)
old = """    vulnerable: decision.vulnerable,
    altitudeMeters,
    distance,
    angle,
  };"""
new = """    vulnerable: decision.vulnerable,
    altitudeMeters,
    playerAltitudeMeters: playerAltitude,
    altitudeDeltaMeters: altitudeMeters - playerAltitude,
    distance,
    angle,
    signedAngle,
  };"""
if old not in lock:
    raise SystemExit("lock return marker missing")
lock = lock.replace(old, new, 1)
s = s[:lock_start] + lock + s[lock_end:]
p.write_text(s)

# SKY RAID: publish actual player altitude into the combat session and strengthen TURBO camera presentation.
replace_once(
    "src/sky/SkyDancerSkyRaid.ts",
"""  const flight = flightControllerFor(demo).step(delta, base.heading, demo.steer, base.boostActive);
  demo.playerVisual.position.y = 0.62 + flight.altitude;""",
"""  const flight = flightControllerFor(demo).step(delta, base.heading, demo.steer, base.boostActive);
  (demo.session as unknown as { skyDancerPlayerAltitudeMeters?: number }).skyDancerPlayerAltitudeMeters = flight.altitude;
  demo.playerVisual.position.y = 0.62 + flight.altitude;""",
    "SKY RAID altitude publication",
)
p = Path("src/sky/SkyDancerSkyRaid.ts")
s = p.read_text()
old = """    const chaseDistance = 9.6 + Math.min(4.0, speed * 0.085);
    const lookAhead = 6.8 + Math.min(5.2, speed * 0.105);"""
new = """    const turboCamera = snapshot.boostActive ? 1 : 0;
    const chaseDistance = 9.6 + Math.min(4.0, speed * 0.085) + turboCamera * 2.2;
    const lookAhead = 6.8 + Math.min(5.2, speed * 0.105) + turboCamera * 3.2;"""
if old not in s:
    raise SystemExit("camera chase marker missing")
s = s.replace(old, new, 1)
old = """    this.camera.rotateZ(bank * 0.075);
  };"""
new = """    this.camera.rotateZ(bank * 0.075);
    if (turboCamera > 0) {
      this.camera.fov = Math.min(96, this.camera.fov + 2.8);
      this.camera.updateProjectionMatrix();
    }
  };"""
if old not in s:
    raise SystemExit("camera tail marker missing")
s = s.replace(old, new, 1)
p.write_text(s)

# V43: SKY RAID renders combat altitude directly, legacy modes keep compression.
p = Path("src/sky/presentation/SkyDancerV43VerticalCombatPass.ts")
s = p.read_text()
marker = """interface PlayerMissileVisual {
  root: THREE.Group;
  flame: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
}
"""
if marker not in s:
    raise SystemExit("V43 interface marker missing")
s = s.replace(
marker,
marker + """
function verticalWorldOffset(meters: number): number {
  const skyRaid = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
  return skyRaid ? meters : meters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT;
}
""",
1,
)
s = s.replace(
    "vertical.altitudeOffsetMeters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT",
    "verticalWorldOffset(vertical.altitudeOffsetMeters)",
)
s = s.replace(
    "missile.altitudeOffsetMeters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT",
    "verticalWorldOffset(missile.altitudeOffsetMeters)",
)
p.write_text(s)

# V45: expose shot/hit sequence and use the same vertical mapping for ribbons/boss lane.
p = Path("src/sky/presentation/SkyDancerV45DecisionHierarchyPass.ts")
s = p.read_text()
old = """  bossMode: "orbit" | "strike" | "break" | null;
  bossCoreOpen: boolean;
}"""
new = """  bossMode: "orbit" | "strike" | "break" | null;
  bossCoreOpen: boolean;
  shotSerial: number;
  hitSerial: number;
}"""
if old not in s:
    raise SystemExit("V45 snapshot marker missing")
s = s.replace(old, new, 1)
marker = """interface RibbonPoint {
  position: THREE.Vector3;
  age: number;
}
"""
if marker not in s:
    raise SystemExit("V45 ribbon marker missing")
s = s.replace(
marker,
marker + """
function verticalWorldOffset(meters: number): number {
  const skyRaid = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
  return skyRaid ? meters : meters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT;
}
""",
1,
)
s = s.replace(
    "missile.altitudeOffsetMeters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT",
    "verticalWorldOffset(missile.altitudeOffsetMeters)",
)
s = s.replace(
    "vertical.altitudeOffsetMeters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT",
    "verticalWorldOffset(vertical.altitudeOffsetMeters)",
)
old = """    const playerY = 1.02;
    const positions = this.bossLane.geometry.getAttribute("position") as THREE.BufferAttribute;"""
new = """    const playerAltitude = getSkyDancerPlayerLockSnapshotV45(this.runtime.session).playerAltitudeMeters;
    const playerY = 1.02 + verticalWorldOffset(playerAltitude);
    const positions = this.bossLane.geometry.getAttribute("position") as THREE.BufferAttribute;"""
if old not in s:
    raise SystemExit("V45 boss player marker missing")
s = s.replace(old, new, 1)
old = """    const lock = getSkyDancerPlayerLockSnapshotV45(this.runtime.session);
    const boss = getLatestSkyDancerBossQualityV34();"""
new = """    const lock = getSkyDancerPlayerLockSnapshotV45(this.runtime.session);
    const weapon = getSkyDancerPlayerWeaponState(this.runtime.session);
    const boss = getLatestSkyDancerBossQualityV34();"""
if old not in s:
    raise SystemExit("V45 publish marker missing")
s = s.replace(old, new, 1)
old = """      bossCoreOpen: Boolean(boss?.active && boss.coreOpen),
    };"""
new = """      bossCoreOpen: Boolean(boss?.active && boss.coreOpen),
      shotSerial: weapon.shotSerial,
      hitSerial: weapon.hitSerial,
    };"""
if old not in s:
    raise SystemExit("V45 serial return marker missing")
s = s.replace(old, new, 1)
p.write_text(s)

# HUD: player-relative altitude + explicit hit confirmation.
p = Path("app/SkyDancerHudV45.tsx")
s = p.read_text()
old = 'import { useEffect, useMemo, useState } from "react";'
new = 'import { useEffect, useMemo, useRef, useState } from "react";'
if old not in s:
    raise SystemExit("HUD import marker missing")
s = s.replace(old, new, 1)
old = """export default function SkyDancerHudV45() {
  const [decision, setDecision] = useState<SkyDancerCombatDecisionSnapshotV45 | null>(null);

  useEffect(() => {
    const onDecision = (event: Event) => {
      setDecision((event as CustomEvent<SkyDancerCombatDecisionSnapshotV45>).detail ?? null);
    };
    window.addEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
    return () => window.removeEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
  }, []);"""
new = """export default function SkyDancerHudV45() {
  const [decision, setDecision] = useState<SkyDancerCombatDecisionSnapshotV45 | null>(null);
  const [hitPulse, setHitPulse] = useState(false);
  const hitSerialRef = useRef(0);
  const hitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onDecision = (event: Event) => {
      const detail = (event as CustomEvent<SkyDancerCombatDecisionSnapshotV45>).detail ?? null;
      if (detail && detail.hitSerial > hitSerialRef.current) {
        hitSerialRef.current = detail.hitSerial;
        setHitPulse(true);
        if (hitTimerRef.current !== null) window.clearTimeout(hitTimerRef.current);
        hitTimerRef.current = window.setTimeout(() => {
          hitTimerRef.current = null;
          setHitPulse(false);
        }, 180);
      } else if (detail) {
        hitSerialRef.current = Math.max(hitSerialRef.current, detail.hitSerial);
      }
      setDecision(detail);
    };
    window.addEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
    return () => {
      window.removeEventListener(SKY_DANCER_COMBAT_DECISION_EVENT_V45, onDecision);
      if (hitTimerRef.current !== null) window.clearTimeout(hitTimerRef.current);
    };
  }, []);"""
if old not in s:
    raise SystemExit("HUD event block missing")
s = s.replace(old, new, 1)

if "      .skyDancerV45Lock {" not in s:
    raise SystemExit("HUD CSS marker missing")
s = s.replace(
"      .skyDancerV45Lock {",
"""      .skyDancerV45Hit {
        position: fixed;
        z-index: 140;
        left: 50%;
        top: 36%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        padding: 3px 10px 4px;
        color: #efffff;
        border: 1px solid rgba(145,255,236,.86);
        background: rgba(8,66,65,.58);
        box-shadow: 0 0 22px rgba(94,255,222,.42);
        font: 950 clamp(13px,2.2vw,20px)/1 system-ui,sans-serif;
        letter-spacing: .18em;
        text-shadow: 0 0 8px rgba(116,255,235,.72);
      }
      .skyDancerV45Lock {""",
1,
)
if "{altitudeLabel(decision.altitudeMeters)}" not in s:
    raise SystemExit("HUD altitude label marker missing")
s = s.replace(
    "{altitudeLabel(decision.altitudeMeters)}",
    "{altitudeLabel(decision.altitudeDeltaMeters)}",
    1,
)
old = """    )}
    {bossDirective && <div className="skyDancerV45BossDirective" aria-label="V45 boss directive">{bossDirective}</div>}"""
new = """    )}
    {hitPulse && <div className="skyDancerV45Hit" aria-label="Sky Raid hit confirmation">HIT</div>}
    {bossDirective && <div className="skyDancerV45BossDirective" aria-label="V45 boss directive">{bossDirective}</div>}"""
if old not in s:
    raise SystemExit("HUD hit render marker missing")
s = s.replace(old, new, 1)
p.write_text(s)

# SKY RAID gets only the compact V45 lock layer, not the legacy HUD stack.
replace_once(
    "app/CartRogueGamePhase13.tsx",
"""        <SkyDancerSkyRaidOverlay />
        <SkyDancerArcadeVirtualPad />""",
"""        <SkyDancerSkyRaidOverlay />
        <SkyDancerHudV45 />
        <SkyDancerArcadeVirtualPad />""",
    "SKY RAID V45 mount",
)

print("V15 product patch complete")
