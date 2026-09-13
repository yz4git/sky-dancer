from pathlib import Path

root = Path(__file__).resolve().parents[1]
for relative in [
    "src/sky/arcade/SkyDancerArcadeV4021LightningEffect.ts",
    "src/sky/arcade/SkyDancerArcadeV4022EnvironmentalFx.ts",
]:
    path = root / relative
    text = path.read_text(encoding="utf-8")
    old = "points: readonly THREE.Vector3[]"
    if old not in text:
        raise RuntimeError(f"{relative}: expected readonly point signature")
    path.write_text(text.replace(old, "points: THREE.Vector3[]", 1), encoding="utf-8")
print("V40.22 Three.js mutable point typing aligned")
