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
    'import { SkyDancerArcadeRuntime, type SkyDancerArcadeSnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";\n',
    'import { SkyDancerArcadeRuntime, type SkyDancerArcadeSnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";\nimport {\n  skyDancerArcadeV35BossApproach,\n  skyDancerArcadeV35CuePriority,\n  skyDancerArcadeV35SectionIntroVisible,\n} from "../src/sky/arcade/SkyDancerArcadeV35HudContinuity";\n',
    'V35 import',
)

mode = replace_once(
    mode,
'''  const bossHudVisible = snapshot.bossActive || Boolean(bossEnemy && bossEnemy.hp <= 0);
  const routeOverlayVisible = snapshot.branchActive || Boolean(''',
'''  const bossHudVisible = snapshot.bossActive || Boolean(bossEnemy && bossEnemy.hp <= 0);
  const sectionIntroVisible = skyDancerArcadeV35SectionIntroVisible(snapshot.status, snapshot.stageTimeSeconds);
  const bossApproach = skyDancerArcadeV35BossApproach(
    snapshot.stage.id,
    snapshot.stageTimeSeconds,
    snapshot.stageDurationSeconds,
    snapshot.bossActive,
  );
  const routeOverlayVisible = snapshot.branchActive || Boolean(''',
    'V35 continuity state',
)

mode = replace_once(
    mode,
'''  const [missileCueCount = "0", missileCueDanger = "0", missileCueBoss = "0"] = (missileCue.value ?? "0|0|0").split("|");
  const controlsVisible = snapshot.status === "running";''',
'''  const [missileCueCount = "0", missileCueDanger = "0", missileCueBoss = "0"] = (missileCue.value ?? "0|0|0").split("|");
  const messageIsBossWarning = Boolean(messageCue.value?.startsWith("WARNING ·") && snapshot.bossActive);
  const cuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");
  const controlsVisible = snapshot.status === "running";''',
    'V35 cue priority',
)

mode = replace_once(
    mode,
'''        <div ref={mountRef} className={styles.viewport} />
        <div className={productStyles.aimGuide} aria-hidden="true"><i /><b /></div>

        <header className={styles.topHud}>''',
'''        <div ref={mountRef} className={styles.viewport} />
        <div className={productStyles.aimGuide} aria-hidden="true"><i /><b /></div>

        {sectionIntroVisible && (
          <div className={styles.sectionIntro} aria-live="polite">
            <small>{snapshot.mode === "stage-practice" ? "SECTION PRACTICE · ENGAGE" : `SECTION ${snapshot.stageNumber}/7 · ENGAGE`}</small>
            <strong>{snapshot.stage.name}</strong>
            <span>{snapshot.stage.subtitle}</span>
            <i aria-hidden="true"><b /></i>
          </div>
        )}

        <header className={styles.topHud}>''',
    'V35 section intro',
)

mode = replace_once(
    mode,
'''        {messageCue.value && <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting}>{messageCue.value}</div>}
        {chainCue.value !== null && <div className={`${styles.chain} ${productStyles.chainReadout}`} data-exiting={chainCue.exiting}>CHAIN <strong>×{chainCue.value}</strong></div>}''',
'''        {messageCue.value && !messageIsBossWarning && (
          <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting} data-priority={cuePriority}>{messageCue.value}</div>
        )}
        {chainCue.value !== null && (
          <div className={`${styles.chain} ${productStyles.chainReadout}`} data-exiting={chainCue.exiting} data-deemphasized={cuePriority !== "normal"}>CHAIN <strong>×{chainCue.value}</strong></div>
        )}''',
    'V35 transient hierarchy',
)

mode = replace_once(
    mode,
'''        {bossHudVisible && (
          <div className={`${styles.bossHud} ${!snapshot.bossActive ? styles.bossHudExit : ""}`} aria-label="Climax target">''',
'''        {bossApproach.active && (
          <div className={styles.bossApproach} data-urgent={bossApproach.remainingSeconds < .85} aria-live="assertive" aria-label="Climax target approaching">
            <small>WARNING · CLIMAX SIGNATURE</small>
            <strong>{snapshot.stage.bossName}</strong>
            <span>CONTACT {bossApproach.remainingSeconds.toFixed(1)}s</span>
            <i aria-hidden="true"><b style={{ width: `${Math.round(bossApproach.progress * 100)}%` }} /></i>
          </div>
        )}

        {bossHudVisible && (
          <div className={`${styles.bossHud} ${!snapshot.bossActive ? styles.bossHudExit : ""}`} aria-label="Climax target">''',
    'V35 boss approach',
)

css += r'''

/* Arcade Run V35: authored HUD continuity between section ingress, warnings and combat cues. */
.sectionIntro{position:absolute;z-index:12;left:50%;top:18%;transform:translateX(-50%);min-width:min(390px,58vw);padding:9px 26px 11px;text-align:center;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(5,20,39,.82) 16%,rgba(7,28,51,.9) 50%,rgba(5,20,39,.82) 84%,transparent);clip-path:polygon(7% 0,93% 0,100% 50%,93% 100%,7% 100%,0 50%);animation:v35SectionIntro 2.35s cubic-bezier(.2,.72,.2,1) both}.sectionIntro small,.sectionIntro strong,.sectionIntro span{display:block}.sectionIntro small{font-size:7px;font-weight:1000;letter-spacing:.24em;color:#70eaff}.sectionIntro strong{margin-top:2px;font-size:clamp(21px,3.5vw,34px);line-height:1;letter-spacing:.13em;text-shadow:0 0 22px rgba(76,225,255,.35)}.sectionIntro span{margin-top:4px;font-size:7px;font-weight:900;letter-spacing:.14em;color:rgba(255,255,255,.62)}.sectionIntro>i{display:block;width:72%;height:2px;margin:8px auto 0;background:rgba(116,231,255,.14);overflow:hidden}.sectionIntro>i b{display:block;width:100%;height:100%;background:linear-gradient(90deg,transparent,#72ebff,transparent);animation:v35SectionScan 1.05s ease-in-out infinite}
.bossApproach{position:absolute;z-index:13;left:50%;top:max(70px,calc(env(safe-area-inset-top) + 69px));transform:translateX(-50%);width:min(430px,52vw);padding:6px 14px 7px;border:1px solid rgba(255,85,90,.64);background:linear-gradient(90deg,rgba(44,5,12,.14),rgba(66,7,15,.86),rgba(44,5,12,.14));text-align:center;pointer-events:none;box-shadow:0 0 28px rgba(255,44,67,.13);animation:v35BossApproach .42s cubic-bezier(.16,.8,.24,1) both}.bossApproach small,.bossApproach strong,.bossApproach span{display:block}.bossApproach small{font-size:6px;font-weight:1000;letter-spacing:.23em;color:#ff6d7f}.bossApproach strong{margin-top:1px;font-size:clamp(14px,2.2vw,20px);letter-spacing:.13em;color:#fff;text-shadow:0 0 16px rgba(255,75,91,.4)}.bossApproach span{margin-top:2px;font-size:7px;font-weight:1000;letter-spacing:.18em;color:#ffd6c6}.bossApproach>i{display:block;height:3px;margin-top:5px;background:rgba(255,255,255,.08);overflow:hidden}.bossApproach>i b{display:block;height:100%;background:linear-gradient(90deg,#ff405c,#ffb45d);box-shadow:0 0 12px rgba(255,63,83,.65);transition:width .08s linear}.bossApproach[data-urgent="true"]{animation:v35BossApproach .42s cubic-bezier(.16,.8,.24,1) both,v35BossUrgent .22s steps(2,end) infinite}
.message[data-priority="alert"]{border-color:rgba(255,199,91,.72);text-shadow:0 0 15px rgba(255,193,74,.72)}.message[data-priority="critical"]{border-color:rgba(255,91,92,.76);background:rgba(40,7,16,.76);text-shadow:0 0 15px rgba(255,69,84,.75)}.chain[data-deemphasized="true"]{opacity:.42;transform:translateX(-50%) translateY(12px) rotate(-4deg) scale(.82);filter:saturate(.72);transition:opacity .16s ease,transform .18s ease,filter .18s ease}.missileWarning{transition:opacity .14s ease,filter .14s ease}
@keyframes v35SectionIntro{0%{opacity:0;transform:translateX(-50%) translateY(10px) scaleX(.82)}12%{opacity:1;transform:translateX(-50%) translateY(0) scaleX(1)}72%{opacity:1;transform:translateX(-50%) translateY(0) scaleX(1)}100%{opacity:0;transform:translateX(-50%) translateY(-7px) scaleX(.94)}}@keyframes v35SectionScan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes v35BossApproach{from{opacity:0;transform:translateX(-50%) translateY(-8px) scaleX(.78)}to{opacity:1;transform:translateX(-50%) translateY(0) scaleX(1)}}@keyframes v35BossUrgent{50%{filter:brightness(1.34);box-shadow:0 0 36px rgba(255,44,67,.3)}}
'''

mode_path.write_text(mode)
css_path.write_text(css)
print('Applied Arcade Run V35 HUD continuity')
