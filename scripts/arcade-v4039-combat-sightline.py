from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))


mode = Path("app/SkyDancerArcadeMode.tsx")
replace_once(
    mode,
    '''        data-v407-focus={v407Focus}\n        data-v408-scene={v408Focus.mode}\n        data-v4012-rhythm={v4012Rhythm.phase}\n''',
    '''        data-v407-focus={v407Focus}\n        data-v408-scene={v408Focus.mode}\n        data-v4012-rhythm={v4012Rhythm.phase}\n        data-v4039-boss-approach={bossApproachPresentationActive ? "true" : "false"}\n''',
)

css = Path("app/SkyDancerArcadeMode.module.css")
with css.open("a") as handle:
    handle.write(r'''

/* Arcade Run V40.39: visual-playtest combat sightline pass.
   During a climax approach the signature warning owns the hierarchy; secondary authored copy
   yields so the reticle, enemy body and hostile projectiles remain readable on phone landscape. */
.stage[data-v4039-boss-approach="true"] .timelineV407 {
  opacity: 0;
  transform: translateY(-5px) scale(.98);
  filter: saturate(.45);
}
.stage[data-v4039-boss-approach="true"] .sectionIntro { display: none; }

@media (orientation: landscape) and (max-height: 430px) {
  .bossApproach {
    top: max(61px, calc(env(safe-area-inset-top) + 56px));
    width: min(360px, 44vw);
    padding: 3px 10px 4px;
    border-color: rgba(255,85,90,.58);
    background: linear-gradient(90deg,rgba(44,5,12,.08),rgba(66,7,15,.72),rgba(44,5,12,.08));
    box-shadow: 0 0 20px rgba(255,44,67,.1);
  }
  .bossApproach small { font-size: 5px; letter-spacing: .2em; }
  .bossApproach strong { margin-top: 0; font-size: clamp(12px, 1.75vw, 15px); line-height: 1.05; letter-spacing: .11em; }
  .bossApproach span { margin-top: 1px; font-size: 5.5px; letter-spacing: .16em; }
  .bossApproach > i { height: 2px; margin-top: 3px; }
}
''')

Path("tests/sky-arcade-v4039-combat-sightline.test.ts").write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/SkyDancerArcadeMode.module.css"), "utf8");

test("V40.39 exposes climax-approach state to the HUD hierarchy", () => {
  assert.match(mode, /data-v4039-boss-approach=\{bossApproachPresentationActive \? "true" : "false"\}/);
  assert.match(css, /\.stage\[data-v4039-boss-approach="true"\] \.timelineV407\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\.stage\[data-v4039-boss-approach="true"\] \.sectionIntro\s*\{\s*display:\s*none/);
});

test("V40.39 compacts the climax warning in phone landscape without removing it", () => {
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 430px\)[\s\S]*?\.bossApproach\s*\{[\s\S]*?width:\s*min\(360px, 44vw\)/);
  assert.match(css, /\.bossApproach strong\s*\{[^}]*font-size:\s*clamp\(12px, 1\.75vw, 15px\)/s);
  assert.match(css, /\.bossApproach > i\s*\{[^}]*height:\s*2px/s);
});
''')
