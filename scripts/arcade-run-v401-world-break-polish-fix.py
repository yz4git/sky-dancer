from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish.ts")
text = path.read_text()
old = '"red-canyon": { startProgress: .12, leadSeconds: 1.45, hint: "DESCEND · HOLD THE CANYON FLOOR", tone: "precision" },'
new = '"red-canyon": { startProgress: .12, leadSeconds: 1.15, hint: "DESCEND · HOLD THE CANYON FLOOR", tone: "precision" },'
if old not in text:
    raise SystemExit("V40.1 Red Canyon briefing anchor not found")
path.write_text(text.replace(old, new, 1))
print("V40.1 Red Canyon briefing now starts after the section intro")
