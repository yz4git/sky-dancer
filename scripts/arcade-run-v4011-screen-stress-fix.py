from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
text = path.read_text()

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
path.write_text(text)

print("V40.11 WebGL clarity scope fixed")
