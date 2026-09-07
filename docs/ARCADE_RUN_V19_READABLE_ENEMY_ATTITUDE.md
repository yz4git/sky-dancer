# Arcade Run V19 — Readable Enemy Attitude

V18 fixed the enemy silhouette and square beacon problem, but a normal enemy could still spend too long in a near-perfect frontal projection. On a phone-sized display that collapses the wing surface into a horizontal strip even when the model has real fuselage volume.

V19 adds a presentation-only child rig to normal enemy aircraft. The outer enemy transform remains authoritative for course heading, maneuver bank, hit reaction, lock cues and gameplay-space placement. The child rig receives a modest deterministic pitch/yaw/roll bias so the aircraft presents upper or lower wing surface and a small amount of side volume.

The pitch sign varies deterministically across aircraft IDs, so formations include both upper-surface and underside reads instead of all enemies sharing the same billboard-like pose. Fighter/interceptor/ace receive the strongest attitude, while bomber and missile boat use a smaller angle because their broader silhouettes already read as heavy aircraft.

A small visual-only Y thickness boost is applied inside the presentation rig. Logical collision, lock and damage behavior are unchanged.
