from pathlib import Path

p = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
text = p.read_text()
old = '''  releaseInputs(): void {
    this.input.x = 0;
    this.input.y = 0;
    this.input.fire = false;
    this.input.lock = false;
    this.input.turbo = false;
  }'''
new = '''  releaseInputs(): void {
    this.input.x = 0;
    this.input.y = 0;
    this.input.fire = false;
    this.input.lock = false;
    this.input.turbo = false;
    this.playerVX = 0;
    this.playerVY = 0;
  }'''
if text.count(old) != 1:
    raise SystemExit(f'releaseInputs match count: {text.count(old)}')
text = text.replace(old, new, 1)
old = '      const threshold = enemy.boss ? 1.36 : 0.9;'
new = '      const threshold = enemy.boss ? 1.85 : 1.45;'
if text.count(old) != 1:
    raise SystemExit(f'lock threshold match count: {text.count(old)}')
text = text.replace(old, new, 1)
p.write_text(text)
