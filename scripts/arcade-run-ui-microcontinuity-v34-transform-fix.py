from pathlib import Path

css_path = Path('app/SkyDancerArcadeMode.module.css')
test_path = Path('tests/sky-arcade-v34-ui-microcontinuity.test.ts')
css = css_path.read_text()
test = test_path.read_text()

old_rule = '.message[data-exiting="true"],.chain[data-exiting="true"],.missileWarning[data-exiting="true"]{pointer-events:none;animation:v34CueExit .24s ease-in forwards}'
new_rule = '.message[data-exiting="true"]{pointer-events:none;animation:v34MessageExit .24s ease-in forwards}.chain[data-exiting="true"]{pointer-events:none;animation:v34ChainExit .24s ease-in forwards}.missileWarning[data-exiting="true"]{pointer-events:none;animation:v34MissileExit .24s ease-in forwards}'
if css.count(old_rule) != 1:
    raise SystemExit(f'expected one shared V34 exit rule, found {css.count(old_rule)}')
css = css.replace(old_rule, new_rule, 1)

old_keyframe = '@keyframes v34CueExit{from{opacity:1;filter:brightness(1)}to{opacity:0;filter:brightness(.72);transform:translateY(-7px) scale(.96)}}'
new_keyframes = '@keyframes v34MessageExit{from{opacity:1;filter:brightness(1);transform:translateX(-50%) translateY(0) scale(1)}to{opacity:0;filter:brightness(.72);transform:translateX(-50%) translateY(-7px) scale(.96)}}@keyframes v34ChainExit{from{opacity:1;filter:brightness(1);transform:translateX(-50%) rotate(-4deg) scale(1)}to{opacity:0;filter:brightness(.72);transform:translateX(-50%) translateY(-7px) rotate(-4deg) scale(.96)}}@keyframes v34MissileExit{from{opacity:1;filter:brightness(1);transform:translateY(0) scale(1)}to{opacity:0;filter:brightness(.72);transform:translateY(-7px) scale(.96)}}'
if css.count(old_keyframe) != 1:
    raise SystemExit(f'expected one shared V34 exit keyframe, found {css.count(old_keyframe)}')
css = css.replace(old_keyframe, new_keyframes, 1)

old_test = '  assert.match(css, /v34CueExit/);'
new_test = '''  assert.match(css, /v34MessageExit/);\n  assert.match(css, /v34ChainExit/);\n  assert.match(css, /v34MissileExit/);\n  assert.match(css, /translateX\\(-50%\\).*rotate\\(-4deg\\)/);'''
if test.count(old_test) != 1:
    raise SystemExit(f'expected one V34 shared-exit assertion, found {test.count(old_test)}')
test = test.replace(old_test, new_test, 1)

css_path.write_text(css)
test_path.write_text(test)
print('Applied V34 centered HUD transform continuity fix')
