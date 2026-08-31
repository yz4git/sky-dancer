from pathlib import Path

path=Path("tests/sky-arcade-run.test.ts")
text=path.read_text()
old='''  assert.match(world, /stage\\.biome==="desert" && index%3===1/);\n'''
new='''  assert.match(world, /arcadeDesertV93SandwallCitadel/);\n  assert.match(world, /arcadeDesertV93BreachSide/);\n  assert.match(world, /arcade-desert-fortress-citadel/);\n'''
if old not in text:
    raise SystemExit("missing obsolete V8.2 desert source contract")
path.write_text(text.replace(old,new,1))
print("Updated V8.2 branch-stage source contract for Desert Fortress V9.3")
