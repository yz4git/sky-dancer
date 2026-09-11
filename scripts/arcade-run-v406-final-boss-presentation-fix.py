from pathlib import Path

canvas_path = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")
canvas = canvas_path.read_text()
old_canvas = '    const accent = snapshot.finalBossAccent ?? snapshot.stage.palette.accent;'
new_canvas = '    const accent = boss?.finalBossAccent ?? snapshot.stage.palette.accent;'
if old_canvas not in canvas:
    raise SystemExit("V40.6 Canvas boss accent anchor not found")
canvas_path.write_text(canvas.replace(old_canvas, new_canvas, 1))

webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
webgl = webgl_path.read_text()
envelope = '''    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
'''
if envelope not in webgl:
    raise SystemExit("V40.6 misplaced final-boss envelope not found")
webgl = webgl.replace(envelope, "")
anchor = '''    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;
'''
replacement = '''    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;
'''
if anchor not in webgl:
    raise SystemExit("V40.6 updateCamera envelope anchor not found")
webgl_path.write_text(webgl.replace(anchor, replacement, 1))
print("V40.6 presentation compile fixes applied")
