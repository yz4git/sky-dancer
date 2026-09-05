from pathlib import Path

path = Path('app/SkyDancerArcadeVirtualPad.tsx')
source = path.read_text()
source = source.replace(
'''  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (touchRef.current !== null || pointerRef.current !== null) return;
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    touchRef.current = touch.identifier;
    setActive(true);
    updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
  };
''',
'''  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (touchRef.current !== null) return;
    const touch = event.changedTouches.item(0);
    if (!touch) return;
    // Pointer Events normally arrive first on modern Safari. Keep the Touch
    // identifier anyway so touchend/touchcancel remains an independent release
    // path if pointer capture or pointerup is lost by browser chrome.
    touchRef.current = touch.identifier;
    if (pointerRef.current !== null) return;
    setActive(true);
    updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
  };
''',
1,
)
source = source.replace(
'''    event.preventDefault();
    updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
  };
''',
'''    event.preventDefault();
    if (pointerRef.current === null) {
      updateFromClient(event.currentTarget, touch.clientX, touch.clientY, "touch");
    }
  };
''',
1,
)
source = source.replace(
'''  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Finger input is intentionally owned by Touch Events on iOS. Pointer
    // Events remain for mouse/pen and desktop audits only.
    if (event.pointerType === "touch") return;
    event.preventDefault();
''',
'''  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Pointer Events are the primary motion path on modern Safari. Touch Events
    // track the same contact as a redundant release channel, never as a second
    // gameplay owner.
    event.preventDefault();
''',
1,
)
source = source.replace(
'''  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || pointerRef.current !== event.pointerId) return;
''',
'''  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
''',
1,
)
source = source.replace(
'''  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || pointerRef.current !== event.pointerId) return;
''',
'''  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
''',
1,
)
if 'Finger input is intentionally owned by Touch Events on iOS' in source:
    raise SystemExit('V34 dual-release failed to remove touch pointer bypass')
path.write_text(source)

test = Path('tests/sky-sky-raid.test.ts')
t = test.read_text()
marker = '  assert.match(padSource, /onTouchStart=\\{onTouchStart\\}/);\n'
replacement = marker + '  assert.doesNotMatch(padSource, /event\\.pointerType === "touch"\\) return/);\n  assert.match(padSource, /Pointer Events are the primary motion path on modern Safari/);\n'
if marker not in t:
    raise SystemExit('V34 dual-release test marker missing')
test.write_text(t.replace(marker, replacement, 1).rstrip() + '\n')
print('SKY RAID V34 dual pointer/touch release staged')
