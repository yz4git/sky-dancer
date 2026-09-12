from pathlib import Path

webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
text = webgl_path.read_text()

old_decl = '''    const v409Clarity = skyDancerArcadeV409PhoneClarity({
      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,
    });
'''
new_decl = '''    let v409Clarity = skyDancerArcadeV409PhoneClarity({
      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,
    });
'''
if text.count(old_decl) != 1:
    raise SystemExit("missing/duplicate V40.11 v409 clarity declaration")
text = text.replace(old_decl, new_decl, 1)

old_alias = '''    const v4011Clarity = v4011Stress.clarity;
'''
new_alias = '''    v409Clarity = v4011Stress.clarity;
'''
if text.count(old_alias) != 1:
    raise SystemExit("missing/duplicate V40.11 clarity alias")
text = text.replace(old_alias, new_alias, 1)
text = text.replace("v4011Clarity.", "v409Clarity.")

old_fx = '''    this.v4010FxClarity = v4011Stress.fxClarity;
'''
new_fx = '''    this.v4010FxClarity = v4011Stress.pressure > 0 ? v4011Stress.fxClarity : v4010Profile.fxClarity;
'''
if text.count(old_fx) != 1:
    raise SystemExit("missing/duplicate V40.11 V40.10 FX compatibility anchor")
text = text.replace(old_fx, new_fx, 1)
webgl_path.write_text(text)

canvas_path = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")
canvas = canvas_path.read_text()
old_canvas_alias = '''    const v4011Clarity = v4011Stress.clarity;
    const v4011OcclusionProfile = v4011Stress.occlusion;
'''
new_canvas_alias = '''    const v4011CanvasLockLimit = Math.min(v409Clarity.canvasLockLimit, v4011Stress.clarity.canvasLockLimit);
    const v4011OcclusionProfile = v4011Stress.occlusion;
'''
if canvas.count(old_canvas_alias) != 1:
    raise SystemExit("missing/duplicate V40.11 Canvas clarity compatibility anchor")
canvas = canvas.replace(old_canvas_alias, new_canvas_alias, 1)
if canvas.count("v4011Clarity.canvasLockLimit") != 1:
    raise SystemExit("missing/duplicate V40.11 Canvas lock limit use")
canvas = canvas.replace("v4011Clarity.canvasLockLimit", "v4011CanvasLockLimit", 1)
canvas_path.write_text(canvas)

print("V40.11 WebGL/Canvas compatibility contracts fixed")
