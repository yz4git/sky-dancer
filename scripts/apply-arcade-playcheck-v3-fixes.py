from pathlib import Path


def rep(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

camera = "src/sky/arcade/SkyDancerArcadeCamera.ts"
rep(camera,
'''    x: playerX * (4.55 + phone * 1.05),
    y: 5.2 + phone * 3 + playerY * 1.68,
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (2.95 + phone * 1.2),
    lookY: .8 + playerY * 1.02,''',
'''    // Landscape deliberately lags so the craft traverses the screen; portrait restores the proven safe framing.
    x: playerX * (4.55 + phone * 3.15),
    y: 5.2 + phone * 3 + playerY * (1.68 + phone * 1.04),
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (2.95 + phone * 4.4),
    lookY: .8 + playerY * (1.02 + phone * 1.26),''')

css = "app/SkyDancerArcadeMode.module.css"
rep(css,
'.routeOverlay{position:absolute;z-index:8;left:50%;top:max(82px,calc(env(safe-area-inset-top) + 76px));transform:translateX(-50%);width:min(330px,38vw);',
'.routeOverlay{position:absolute;z-index:8;left:50%;top:max(76px,calc(env(safe-area-inset-top) + 72px));transform:translateX(-50%);width:min(330px,38vw);')

test = "tests/sky-arcade-run.test.ts"
rep(test,
'''  assert.match(cameraSource, /playerX \\* \\(6\\.35/);
  assert.match(webglSource, /ConeGeometry\\(0\\.3, 2\\.62, 8\\)/);
  assert.match(presentationSource, /width: enemy \\? \\.31 : \\.25/);''',
'''  assert.match(cameraSource, /playerX \\* \\(4\\.55 \\+ phone \\* 3\\.15\\)/);
  assert.match(webglSource, /ConeGeometry\\(0\\.36, 1\\.62, 8\\)/);
  assert.match(presentationSource, /trailSamples: 18/);
  assert.match(presentationSource, /width: enemy \\? \\.19 : \\.22/);''')
rep(test,
'''  assert.match(css, /\\.routeOption\\{padding:2px 5px/);''',
'''  assert.match(css, /\\.routeOption\\{padding:1px 4px/);''')

print("V3 portrait-safe camera and regression contracts applied")
