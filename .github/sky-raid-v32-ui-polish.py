from pathlib import Path


def replace(path: str, before: str, after: str, label: str) -> None:
    p = Path(path)
    source = p.read_text()
    if before not in source:
        raise SystemExit(f'V32 marker missing: {label}')
    p.write_text(source.replace(before, after, 1))

# Keep one missile action, but stop shrinking its phone target below a comfortable
# combat size. The old 57px rule became ~48 CSS px inside the inherited mobile
# composition, which was visibly smaller than Turbo.
replace(
    'app/SkyDancerShotControl.module.css',
'''  .shotButton {
    width: 57px;
    height: 57px;
    border-radius: 7px 13px 7px 13px;
  }
  .shotButton strong { font-size: 11px; }
  .shotButton small { font-size: 7px; }''',
'''  .shotButton {
    width: 72px;
    height: 72px;
    min-width: 72px;
    min-height: 72px;
    border-radius: 9px 15px 9px 15px;
  }
  .shotButton strong { font-size: 13px; }
  .shotButton small { font-size: 7px; }''',
    'phone missile target',
)

# Give transient center cards explicit priority identity. Critical missile warnings
# are rendered by the combat HUD, so CSS can yield the shared center lane whenever
# that warning exists without coupling gameplay state into this overlay.
replace(
    'app/SkyDancerSkyRaidOverlay.tsx',
'''        <div className={styles.actBanner}>''',
'''        <div className={styles.actBanner} data-sd-noncritical-alert="act">''',
    'act alert identity',
)
replace(
    'app/SkyDancerSkyRaidOverlay.tsx',
'''        <div className={styles.rushBanner}>''',
'''        <div className={styles.rushBanner} data-sd-noncritical-alert="rush">''',
    'rush alert identity',
)
replace(
    'app/SkyDancerSkyRaidOverlay.tsx',
'''        <div className={styles.bossCue}>''',
'''        <div className={styles.bossCue} data-sd-noncritical-alert="boss">''',
    'boss alert identity',
)

replace(
    'app/SkyDancerSkyRaidOverlay.tsx',
'''      html[data-sky-dancer-mode="sky-raid"] [aria-label="Missile warning"] {
        left: 50% !important;''',
'''      html[data-sky-dancer-mode="sky-raid"]:has([aria-label="Missile warning"]) [data-sd-noncritical-alert] {
        display: none !important;
      }
      html[data-sky-dancer-mode="sky-raid"] [aria-label="Fire missile"] {
        width: 72px !important;
        height: 72px !important;
        min-width: 72px !important;
        min-height: 72px !important;
      }
      html[data-sky-dancer-mode="sky-raid"] [aria-label="Missile warning"] {
        left: 50% !important;''',
    'priority lane and touch target override',
)
replace(
    'app/SkyDancerSkyRaidOverlay.tsx',
'''        opacity: .86 !important;
        box-shadow: 0 3px 12px rgba(70,0,0,.22) !important;''',
'''        opacity: .98 !important;
        border: 1px solid rgba(255, 108, 94, .72) !important;
        background: linear-gradient(90deg, rgba(74, 8, 13, .9), rgba(34, 6, 12, .86)) !important;
        box-shadow: 0 3px 16px rgba(70,0,0,.34), 0 0 16px rgba(255,70,50,.16) !important;''',
    'critical warning contrast',
)

# Source-contract regression test: presentation may change, combat authority may not.
test_path = Path('tests/sky-sky-raid.test.ts')
test_source = test_path.read_text()
addition = r'''

test("SKY RAID V32 gives phone combat controls a full touch target and one critical alert lane", () => {
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  const shotCss = readFileSync(new URL("../app/SkyDancerShotControl.module.css", import.meta.url), "utf8");
  const shotSource = readFileSync(new URL("../app/SkyDancerShotControl.tsx", import.meta.url), "utf8");
  assert.match(shotSource, /aria-label="Fire missile"/);
  assert.match(shotSource, /fireWithRuntimeRetry\(\)/);
  assert.match(shotCss, /min-width: 72px/);
  assert.match(shotCss, /min-height: 72px/);
  assert.match(overlaySource, /\[aria-label="Fire missile"\][\s\S]{0,180}min-width: 72px !important/);
  assert.match(overlaySource, /data-sd-noncritical-alert="act"/);
  assert.match(overlaySource, /data-sd-noncritical-alert="rush"/);
  assert.match(overlaySource, /data-sd-noncritical-alert="boss"/);
  assert.match(overlaySource, /:has\(\[aria-label="Missile warning"\]\) \[data-sd-noncritical-alert\][\s\S]{0,80}display: none !important/);
  assert.match(overlaySource, /opacity: \.98 !important/);
});
'''
if 'SKY RAID V32 gives phone combat controls a full touch target' not in test_source:
    test_path.write_text(test_source.rstrip() + addition + '\n')

print('SKY RAID V32 phone UI polish staged')
