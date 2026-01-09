import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const audioUrl = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

const pad2 = (n) => String(n).padStart(2, "0");

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default function App() {
  // --- Settings (minutes) ---
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [longBreakEvery, setLongBreakEvery] = useState(4);

  // --- Timer/session state ---
  const [sessionType, setSessionType] = useState("work"); // "work" | "short" | "long"
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Holds the "default" total seconds for the current session type
  // We use this to avoid resetting the timer when you pause.
  const lastSessionTotalRef = useRef(null);

  const sessionLabel = useMemo(() => {
    if (sessionType === "work") return "Work";
    if (sessionType === "short") return "Short Break";
    return "Long Break";
  }, [sessionType]);

  const currentSessionTotalSeconds = useMemo(() => {
    if (sessionType === "work") return workMinutes * 60;
    if (sessionType === "short") return shortBreakMinutes * 60;
    return longBreakMinutes * 60;
  }, [sessionType, workMinutes, shortBreakMinutes, longBreakMinutes]);

  // Initialize lastSessionTotalRef once we know currentSessionTotalSeconds
  useEffect(() => {
    if (lastSessionTotalRef.current === null) {
      lastSessionTotalRef.current = currentSessionTotalSeconds;
    }
  }, [currentSessionTotalSeconds]);

  // Keep secondsLeft in sync when settings change:
  // Only update the displayed time if paused AND user hasn't started counting down
  useEffect(() => {
    if (!isRunning && secondsLeft === lastSessionTotalRef.current) {
      setSecondsLeft(currentSessionTotalSeconds);
    }

    // Always update the ref to the latest "default" total
    lastSessionTotalRef.current = currentSessionTotalSeconds;
  }, [currentSessionTotalSeconds, isRunning, secondsLeft]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Handle reaching 0 (play sound + switch sessions)
  useEffect(() => {
    if (secondsLeft > 0) return;

    setIsRunning(false);
    clearInterval(intervalRef.current);

    // Play sound once at the moment we hit 0
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Decide next session
    if (sessionType === "work") {
      setWorkSessionsCompleted((prev) => {
        const nextCount = prev + 1;
        const isLong = nextCount % longBreakEvery === 0;
        setSessionType(isLong ? "long" : "short");
        return nextCount;
      });
    } else {
      setSessionType("work");
    }
  }, [secondsLeft, sessionType, longBreakEvery]);

  // When sessionType changes, reset secondsLeft to the new session duration
  useEffect(() => {
    setSecondsLeft(currentSessionTotalSeconds);
  }, [sessionType, currentSessionTotalSeconds]);

  function handleStart() {
    if (secondsLeft <= 0) setSecondsLeft(currentSessionTotalSeconds);
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleResume() {
    setIsRunning(true);
  }

  function handleReset() {
    setIsRunning(false);
    setSecondsLeft(currentSessionTotalSeconds);
  }

  function handleSkip() {
    setIsRunning(false);
    setSecondsLeft(0);
  }

  const canEditSettings = !isRunning;

  return (
    <div className="page">
      <main className="card" aria-label="Pomodoro timer application">
        <header className="header">
          <h1 className="title">Pomodoro Timer</h1>
          <p className="subtitle" aria-live="polite">
            Current session: <strong>{sessionLabel}</strong>
          </p>
        </header>

        <section className="timer" aria-label="Timer display">
          <div className="time" aria-live="polite" aria-atomic="true">
            {formatMMSS(Math.max(0, secondsLeft))}
          </div>
          <div className="meta">
            Work sessions completed: <strong>{workSessionsCompleted}</strong>
          </div>
        </section>

        <section className="controls" aria-label="Timer controls">
          {!isRunning ? (
            secondsLeft === currentSessionTotalSeconds ? (
              <button className="btn primary" onClick={handleStart}>
                Start
              </button>
            ) : (
              <button className="btn primary" onClick={handleResume}>
                Resume
              </button>
            )
          ) : (
            <button className="btn primary" onClick={handlePause}>
              Pause
            </button>
          )}

          <button className="btn" onClick={handleReset}>
            Reset
          </button>

          <button className="btn" onClick={handleSkip}>
            Skip
          </button>
        </section>

        <section className="settings" aria-label="Settings">
          <h2 className="sectionTitle">Settings</h2>
          <p className="hint">
            {canEditSettings
              ? "You can edit settings while paused."
              : "Pause to edit settings."}
          </p>

          <div className="grid">
            <label className="field">
              <span>Work (minutes)</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="120"
                value={workMinutes}
                disabled={!canEditSettings}
                onChange={(e) => setWorkMinutes(clampInt(e.target.value, 1, 120))}
              />
            </label>

            <label className="field">
              <span>Short break (minutes)</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="60"
                value={shortBreakMinutes}
                disabled={!canEditSettings}
                onChange={(e) =>
                  setShortBreakMinutes(clampInt(e.target.value, 1, 60))
                }
              />
            </label>

            <label className="field">
              <span>Long break (minutes)</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="90"
                value={longBreakMinutes}
                disabled={!canEditSettings}
                onChange={(e) =>
                  setLongBreakMinutes(clampInt(e.target.value, 1, 90))
                }
              />
            </label>

            <label className="field">
              <span>Long break after (work sessions)</span>
              <input
                type="number"
                inputMode="numeric"
                min="2"
                max="10"
                value={longBreakEvery}
                disabled={!canEditSettings}
                onChange={(e) =>
                  setLongBreakEvery(clampInt(e.target.value, 2, 10))
                }
              />
            </label>
          </div>
        </section>

        {/* Sound (ONE audio element, ONE ref) */}
        <audio ref={audioRef} preload="auto" src={audioUrl} />

        <footer className="footer">
          <small>
            Tip: On some browsers, sound may require you to click Start once.
          </small>
        </footer>
      </main>
    </div>
  );
}
