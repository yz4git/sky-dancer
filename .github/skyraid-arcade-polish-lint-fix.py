from pathlib import Path

path = Path("app/SkyDancerSkyRaidOverlay.tsx")
source = path.read_text()

source = source.replace(
    'import { useEffect, useState, type CSSProperties } from "react";',
    'import { useEffect, useRef, useState, type CSSProperties } from "react";',
    1,
)

old_state = '''  const [personalBest, setPersonalBest] = useState(0);
  const [bestLoaded, setBestLoaded] = useState(false);
  const [newRecord, setNewRecord] = useState(false);'''
new_state = '''  const [personalBest] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = Number(window.localStorage.getItem("sky-dancer-sky-raid-best-score-v1") ?? 0);
      return Number.isFinite(stored) ? Math.max(0, stored) : 0;
    } catch {
      return 0;
    }
  });
  const persistedRecordScore = useRef(0);
  const newRecord = Boolean(snapshot?.clear && snapshot.score > personalBest);'''
if old_state not in source:
    raise SystemExit("PB state anchor missing")
source = source.replace(old_state, new_state, 1)

old_effects = '''  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem("sky-dancer-sky-raid-best-score-v1") ?? 0);
      setPersonalBest(Number.isFinite(stored) ? Math.max(0, stored) : 0);
    } catch {
      setPersonalBest(0);
    } finally {
      setBestLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!bestLoaded || !snapshot?.clear || snapshot.score <= personalBest) return;
    setNewRecord(true);
    setPersonalBest(snapshot.score);
    try {
      window.localStorage.setItem("sky-dancer-sky-raid-best-score-v1", String(snapshot.score));
    } catch {
      // Storage is optional; the result screen must still work in private mode.
    }
  }, [bestLoaded, personalBest, snapshot]);'''
new_effect = '''  useEffect(() => {
    if (!snapshot?.clear || snapshot.score <= personalBest || persistedRecordScore.current === snapshot.score) return;
    persistedRecordScore.current = snapshot.score;
    try {
      window.localStorage.setItem("sky-dancer-sky-raid-best-score-v1", String(snapshot.score));
    } catch {
      // Storage is optional; the result screen must still work in private mode.
    }
  }, [personalBest, snapshot]);'''
if old_effects not in source:
    raise SystemExit("PB effect anchor missing")
source = source.replace(old_effects, new_effect, 1)

path.write_text(source)
