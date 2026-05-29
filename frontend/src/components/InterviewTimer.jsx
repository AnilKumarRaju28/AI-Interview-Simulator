import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../utils/timerConfig";

function TimerRing({ progress, urgent, size = "md" }) {
  const r = size === "sm" ? 28 : 36;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const view = size === "sm" ? 64 : 80;
  const center = view / 2;
  return (
    <svg className="timer-ring-svg" viewBox={`0 0 ${view} ${view}`} aria-hidden>
      <circle className="timer-ring-bg" cx={center} cy={center} r={r} />
      <circle
        className={`timer-ring-progress ${urgent ? "timer-ring-progress--urgent" : ""}`}
        cx={center}
        cy={center}
        r={r}
        style={{ strokeDasharray: c, strokeDashoffset: offset }}
      />
    </svg>
  );
}

export default function InterviewTimer({
  totalSeconds,
  perQuestionSeconds,
  difficulty,
  role,
  questionNumber,
  totalQuestions,
  remainingSeconds,
  paused,
  waitingToStart = false,
  onToggleExpand,
  expanded,
}) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const urgent = !waitingToStart && remainingSeconds <= 60 && remainingSeconds > 0;
  const critical = remainingSeconds === 0;
  const questionsLeft = totalQuestions - questionNumber + 1;
  const suggestedPerQ = formatDuration(perQuestionSeconds);
  const ringSize = expanded ? "md" : "sm";

  return (
    <aside
      className={`interview-timer ${expanded ? "interview-timer--expanded" : "interview-timer--minimized"} ${paused ? "interview-timer--paused" : ""} ${waitingToStart ? "interview-timer--waiting" : ""} ${urgent ? "interview-timer--urgent" : ""} ${critical ? "interview-timer--critical" : ""}`}
      aria-label="Interview timer"
    >
      <div className="timer-shell-header">
        <div className="timer-shell-labels">
          <span className="timer-shell-title">Timer</span>
          {waitingToStart && (
            <span className="timer-badge timer-badge--waiting" role="status">
              Not started
            </span>
          )}
          {urgent && (
            <span className="timer-badge" role="status">
              Under 1 min
            </span>
          )}
        </div>
        <button
          type="button"
          className="timer-toggle"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? "Minimize timer" : "Expand timer"}
          title={expanded ? "Minimize" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      <div className="timer-shell-body">
        <div className="timer-ring-wrap">
          <TimerRing progress={progress} urgent={urgent || critical} size={ringSize} />
          <div className="timer-ring-center">
            <span className={`timer-display ${urgent ? "timer-display--urgent" : ""}`}>
              {formatDuration(remainingSeconds)}
            </span>
            {waitingToStart && (
              <span className="timer-paused-label">Ready?</span>
            )}
            {!waitingToStart && paused && (
              <span className="timer-paused-label">Paused</span>
            )}
          </div>
        </div>

        {expanded ? (
          <div className="timer-details">
            <ul className="timer-details-list">
              <li>
                <span>Total</span>
                <strong>{formatDuration(totalSeconds)}</strong>
              </li>
              <li>
                <span>Per question</span>
                <strong>{suggestedPerQ}</strong>
              </li>
              <li>
                <span>Difficulty</span>
                <strong>{difficulty}</strong>
              </li>
              <li>
                <span>Role</span>
                <strong className="timer-role" title={role}>
                  {role}
                </strong>
              </li>
              <li>
                <span>Question</span>
                <strong>
                  {questionNumber} / {totalQuestions}
                </strong>
              </li>
              <li>
                <span>Remaining</span>
                <strong>{questionsLeft}</strong>
              </li>
            </ul>
            <p className="timer-warning">
              Submit before time runs out. At zero, your answer is submitted automatically.
            </p>
          </div>
        ) : (
          <div className="timer-minimal">
            <span className="timer-minimal-q">
              Q{questionNumber}/{totalQuestions}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Countdown with pause; fires onExpire once at zero */
export function useInterviewCountdown({ totalSeconds, paused, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(totalSeconds);
    firedRef.current = false;
  }, [totalSeconds]);

  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      const r = remainingRef.current;
      if (r <= 0) return;
      if (r <= 1) {
        if (!firedRef.current) {
          firedRef.current = true;
          queueMicrotask(() => onExpireRef.current?.());
        }
        setRemaining(0);
        return;
      }
      setRemaining(r - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [paused]);

  return { remainingSeconds: remaining };
}
