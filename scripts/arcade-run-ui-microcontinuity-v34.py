from pathlib import Path

mode_path = Path('app/SkyDancerArcadeMode.tsx')
css_path = Path('app/SkyDancerArcadeMode.module.css')
mode = mode_path.read_text()
css = css_path.read_text()

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)

mode = replace_once(
    mode,
'''function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function CombatIcon''',
'''function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

interface ExitLingerValue<T> {
  value: T | null;
  exiting: boolean;
}

/** V34 keeps short-lived HUD cues mounted briefly after their gameplay condition ends. */
function useExitLinger<T>(value: T | null, exitMs: number): ExitLingerValue<T> {
  const valueRef = useRef<T | null>(value);
  const timerRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState<T | null>(value);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (value !== null) {
      valueRef.current = value;
      setDisplayValue(value);
      setExiting(false);
      return undefined;
    }
    if (valueRef.current === null) return undefined;
    setExiting(true);
    timerRef.current = window.setTimeout(() => {
      valueRef.current = null;
      setDisplayValue(null);
      setExiting(false);
      timerRef.current = null;
    }, exitMs);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [exitMs, value]);

  return { value: displayValue, exiting };
}

function CombatIcon''',
    'insert linger hook',
)

mode = replace_once(
    mode,
'''  const missileDanger = incomingMissiles.some((projectile) => projectile.depth < 17);
  const controlsVisible = snapshot.status === "running";''',
'''  const missileDanger = incomingMissiles.some((projectile) => projectile.depth < 17);
  const messageCue = useExitLinger(snapshot.message, 220);
  const chainCue = useExitLinger(snapshot.chain > 1 ? snapshot.chain : null, 260);
  const missileCue = useExitLinger(
    incomingMissiles.length > 0 ? `${incomingMissiles.length}|${missileDanger ? 1 : 0}|${snapshot.bossActive ? 1 : 0}` : null,
    260,
  );
  const [missileCueCount = "0", missileCueDanger = "0", missileCueBoss = "0"] = (missileCue.value ?? "0|0|0").split("|");
  const controlsVisible = snapshot.status === "running";''',
    'add cue linger values',
)

mode = replace_once(
    mode,
'''        {snapshot.message && <div className={`${styles.message} ${productStyles.flightMessage}`}>{snapshot.message}</div>}
        {snapshot.chain > 1 && <div className={`${styles.chain} ${productStyles.chainReadout}`}>CHAIN <strong>×{snapshot.chain}</strong></div>}
        {incomingMissiles.length > 0 && (
          <div className={`${styles.missileWarning} ${snapshot.bossActive ? styles.missileWarningBoss : ""} ${missileDanger ? styles.missileDanger : ""}`} aria-live="polite">
            <span>MISSILE</span><strong>×{incomingMissiles.length}</strong><small>{missileDanger ? "BREAK NOW" : "INCOMING"}</small>
          </div>
        )}''',
'''        {messageCue.value && <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting}>{messageCue.value}</div>}
        {chainCue.value !== null && <div className={`${styles.chain} ${productStyles.chainReadout}`} data-exiting={chainCue.exiting}>CHAIN <strong>×{chainCue.value}</strong></div>}
        {missileCue.value && (
          <div
            className={`${styles.missileWarning} ${missileCueBoss === "1" ? styles.missileWarningBoss : ""} ${missileCueDanger === "1" ? styles.missileDanger : ""}`}
            data-exiting={missileCue.exiting}
            aria-live="polite"
          >
            <span>MISSILE</span><strong>×{missileCueCount}</strong><small>{missileCueDanger === "1" ? "BREAK NOW" : "INCOMING"}</small>
          </div>
        )}''',
    'replace transient cue rendering',
)

mode = replace_once(
    mode,
'''          <div className={styles.resultOverlay} role="dialog" aria-modal="true" aria-label="Section clear">''',
'''          <div className={styles.resultOverlay} data-practice={snapshot.mode === "stage-practice"} role="dialog" aria-modal="true" aria-label="Section clear">''',
    'tag stage clear timing',
)

css += r'''

/* Arcade Run V34: micro-continuity for transient combat HUD and result handoff. */
.message{animation:v34CueEnter .2s cubic-bezier(.2,.8,.2,1)}
.message[data-exiting="true"],.chain[data-exiting="true"],.missileWarning[data-exiting="true"]{pointer-events:none;animation:v34CueExit .24s ease-in forwards}
.chain{transform-origin:50% 50%}
.chain[data-exiting="false"]{animation:v34ChainSettle .18s ease-out}
.bossHud:not(.bossHudExit){animation:v34BossHudEnter .38s cubic-bezier(.16,.82,.24,1)}
.bossHudExit{animation:v34BossHudExit .52s cubic-bezier(.4,0,1,1) forwards}
.resultOverlay[data-practice="false"]{animation:v34ResultBackdropIn .22s ease-out,v34ResultBackdropOut .24s ease-in 1.08s forwards}
.resultOverlay[data-practice="false"] .stageResultPanel{animation:v34ResultPanelIn .28s cubic-bezier(.16,.82,.24,1),v34ResultPanelOut .24s ease-in 1.08s forwards}
.resultOverlay[data-practice="true"]{animation:v34ResultBackdropIn .22s ease-out,v34ResultBackdropOut .24s ease-in 2.5s forwards}
.resultOverlay[data-practice="true"] .stageResultPanel{animation:v34ResultPanelIn .28s cubic-bezier(.16,.82,.24,1),v34ResultPanelOut .24s ease-in 2.5s forwards}
@keyframes v34CueEnter{from{opacity:0;transform:translateX(-50%) translateY(-5px) scale(.96)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes v34CueExit{from{opacity:1;filter:brightness(1)}to{opacity:0;filter:brightness(.72);transform:translateY(-7px) scale(.96)}}
@keyframes v34ChainSettle{from{opacity:.55;filter:brightness(1.25)}to{opacity:1;filter:brightness(1)}}
@keyframes v34BossHudEnter{from{opacity:0;transform:translateX(-50%) translateY(-10px) scaleX(.78)}to{opacity:1;transform:translateX(-50%) translateY(0) scaleX(1)}}
@keyframes v34BossHudExit{0%{opacity:1;transform:translateX(-50%) scale(1)}55%{opacity:.68;transform:translateX(-50%) translateY(-3px) scaleX(.94)}100%{opacity:0;transform:translateX(-50%) translateY(-8px) scaleX(.78)}}
@keyframes v34ResultBackdropIn{from{opacity:0}to{opacity:1}}
@keyframes v34ResultBackdropOut{from{opacity:1}to{opacity:0}}
@keyframes v34ResultPanelIn{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes v34ResultPanelOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-10px) scale(.98)}}
'''

mode_path.write_text(mode)
css_path.write_text(css)

Path('tests/sky-arcade-v34-ui-microcontinuity.test.ts').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = readFileSync(resolve("app/SkyDancerArcadeMode.tsx"), "utf8");
const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");

test("V34 transient combat HUD cues linger through a short exit instead of unmounting instantly", () => {
  assert.match(mode, /function useExitLinger<T>/);
  assert.match(mode, /useExitLinger\(snapshot\.message, 220\)/);
  assert.match(mode, /snapshot\.chain > 1 \? snapshot\.chain : null, 260/);
  assert.match(mode, /data-exiting=\{missileCue\.exiting\}/);
  assert.match(css, /v34CueExit/);
});

test("V34 boss HUD enters on the same authored boss beat and exits with the wreck shot", () => {
  assert.match(css, /\.bossHud:not\(\.bossHudExit\)\{animation:v34BossHudEnter/);
  assert.match(css, /\.bossHudExit\{animation:v34BossHudExit/);
});

test("V34 section result card owns both an entrance and a timed handoff exit", () => {
  assert.match(mode, /data-practice=\{snapshot\.mode === "stage-practice"\}/);
  assert.match(css, /v34ResultBackdropIn/);
  assert.match(css, /v34ResultBackdropOut/);
  assert.match(css, /v34ResultPanelIn/);
  assert.match(css, /v34ResultPanelOut/);
});
''')

print('Applied Arcade Run V34 UI micro-continuity')
