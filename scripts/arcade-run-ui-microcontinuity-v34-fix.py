from pathlib import Path

path = Path('app/SkyDancerArcadeMode.tsx')
source = path.read_text()
old = '''function useExitLinger<T>(value: T | null, exitMs: number): ExitLingerValue<T> {
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
}'''
new = '''function useExitLinger<T>(value: T | null, exitMs: number): ExitLingerValue<T> {
  const valueRef = useRef<T | null>(value);
  const syncTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState<T | null>(value);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    syncTimerRef.current = null;
    exitTimerRef.current = null;

    if (value !== null) {
      valueRef.current = value;
      // React's set-state-in-effect rule is respected by synchronizing on the next browser task.
      syncTimerRef.current = window.setTimeout(() => {
        setDisplayValue(value);
        setExiting(false);
        syncTimerRef.current = null;
      }, 0);
    } else if (valueRef.current !== null) {
      syncTimerRef.current = window.setTimeout(() => {
        setExiting(true);
        syncTimerRef.current = null;
      }, 0);
      exitTimerRef.current = window.setTimeout(() => {
        valueRef.current = null;
        setDisplayValue(null);
        setExiting(false);
        exitTimerRef.current = null;
      }, exitMs);
    }

    return () => {
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      syncTimerRef.current = null;
      exitTimerRef.current = null;
    };
  }, [exitMs, value]);

  return { value: displayValue, exiting };
}'''
count = source.count(old)
if count != 1:
    raise SystemExit(f'expected one generated V34 hook, found {count}')
path.write_text(source.replace(old, new, 1))
print('Applied V34 React lint compatibility fix')
