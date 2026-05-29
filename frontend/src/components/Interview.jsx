import { useCallback, useEffect, useRef, useState } from "react";
import { submitAnswer } from "../api";
import { IconWave, IconX } from "./icons";
import InterviewTimer, { useInterviewCountdown } from "./InterviewTimer";
import Toast from "./Toast";
import {
  clearDraft,
  loadDraft,
  saveDraft,
} from "../utils/storage";
import {
  formatDuration,
  getPerQuestionSeconds,
  getTotalInterviewSeconds,
} from "../utils/timerConfig";

const TIMEOUT_ANSWER_PLACEHOLDER = "[No answer submitted — time expired]";

export default function Interview({ session, onComplete, onInterviewActive }) {
  const [question, setQuestion] = useState(session.question);
  const [questionNumber, setQuestionNumber] = useState(session.question_number);
  const [totalQuestions] = useState(session.total_questions);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitFailed, setSubmitFailed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(Boolean(session.welcome_message));
  const [timerStarted, setTimerStarted] = useState(!session.welcome_message);
  const [questionKey, setQuestionKey] = useState(0);
  const [draftHint, setDraftHint] = useState(false);
  const [timerExpanded, setTimerExpanded] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches
  );
  const [urgentToast, setUrgentToast] = useState("");
  const urgentNotifiedRef = useRef(false);
  const textareaRef = useRef(null);
  const questionRef = useRef(null);

  const perQuestionSeconds =
    session.per_question_seconds ?? getPerQuestionSeconds(session.difficulty);
  const totalSeconds =
    session.total_seconds ??
    getTotalInterviewSeconds(session.difficulty, session.total_questions);

  const answerRef = useRef(answer);
  const loadingRef = useRef(loading);
  answerRef.current = answer;
  loadingRef.current = loading;

  const progressPct = ((questionNumber - 1) / totalQuestions) * 100;
  const isLast = questionNumber === totalQuestions;
  const charCount = answer.length;
  const timerPaused = loading || !timerStarted;

  useEffect(() => {
    onInterviewActive?.(true);
    return () => onInterviewActive?.(false);
  }, [onInterviewActive]);

  useEffect(() => {
    const draft = loadDraft(session.interview_id, questionNumber);
    setAnswer(draft);
    setDraftHint(Boolean(draft.trim()));
  }, [session.interview_id, questionNumber]);

  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(session.interview_id, questionNumber, answer);
    }, 500);
    return () => clearTimeout(t);
  }, [answer, session.interview_id, questionNumber]);

  useEffect(() => {
    if (questionNumber > 1) setTimerStarted(true);
  }, [questionNumber]);

  const handleStartTimer = useCallback(() => {
    setShowWelcome(false);
    setTimerStarted(true);
  }, []);

  useEffect(() => {
    if (questionNumber !== 1 || !session.welcome_message || showWelcome) return;
    const t = setTimeout(handleStartTimer, 5000);
    return () => clearTimeout(t);
  }, [questionNumber, session.welcome_message, showWelcome, handleStartTimer]);

  const submitAnswerFlow = useCallback(
    async ({ timedOut = false } = {}) => {
      if (loadingRef.current) return;

      const text = timedOut
        ? answerRef.current.trim() || TIMEOUT_ANSWER_PLACEHOLDER
        : answerRef.current.trim();

      if (!timedOut && !text) {
        setError("Please enter an answer before submitting.");
        return;
      }

      setError("");
      setSubmitFailed(false);
      if (timedOut) {
        setError("Time's up — submitting your answer now.");
      }
      setLoading(true);

      try {
        const result = await submitAnswer(session.interview_id, text);
        clearDraft(session.interview_id, questionNumber);
        if (result.completed) {
          onComplete(session.interview_id);
        } else {
          setQuestion(result.question);
          setQuestionNumber(result.question_number);
          setAnswer("");
          setDraftHint(false);
          setQuestionKey((k) => k + 1);
          if (timedOut) setError("");
        }
      } catch (err) {
        setError(err.message);
        setSubmitFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [session.interview_id, questionNumber, onComplete]
  );

  const expireRef = useRef(false);
  const handleExpire = useCallback(() => {
    if (!timerStarted || expireRef.current || loadingRef.current) return;
    expireRef.current = true;
    submitAnswerFlow({ timedOut: true }).finally(() => {
      expireRef.current = false;
    });
  }, [submitAnswerFlow, timerStarted]);

  const displaySeconds = timerStarted
    ? undefined
    : totalSeconds;

  const { remainingSeconds } = useInterviewCountdown({
    totalSeconds,
    paused: timerPaused,
    onExpire: handleExpire,
  });

  const shownSeconds = displaySeconds ?? remainingSeconds;
  const isUrgent = timerStarted && remainingSeconds <= 60 && remainingSeconds > 0;

  useEffect(() => {
    if (!isUrgent || urgentNotifiedRef.current) return;
    urgentNotifiedRef.current = true;
    setUrgentToast(
      `Less than 1 minute left (${formatDuration(remainingSeconds)}) — submit your answer now!`
    );
    const t = setTimeout(() => setUrgentToast(""), 8000);
    return () => clearTimeout(t);
  }, [isUrgent, remainingSeconds]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => setTimerExpanded(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (loading) return;
    questionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 200);
    return () => clearTimeout(t);
  }, [questionKey, loading]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loadingRef.current && answerRef.current.trim()) {
        e.preventDefault();
        submitAnswerFlow({ timedOut: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitAnswerFlow]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitAnswerFlow({ timedOut: false });
  };

  const evaluatingLabel = isLast
    ? "Generating your final report…"
    : `Evaluating answer ${questionNumber} of ${totalQuestions}…`;

  return (
    <div className="page-enter interview-page interview-page--with-timer">
      <Toast message={urgentToast} variant="warning" />

      <div className="interview-main">
        <div className={`interview-top ${isUrgent ? "interview-top--urgent" : ""}`}>
          <div className="progress-meta">
            <span className="progress-label">
              Question <strong>{questionNumber}</strong> of {totalQuestions}
            </span>
            <div className="meta-tags">
              <span className="tag tag--difficulty">{session.difficulty}</span>
              <span className="tag tag--role" title={session.role}>
                {session.role}
              </span>
            </div>
          </div>

          {isUrgent && (
            <p className="timer-urgent-inline" role="alert" aria-live="assertive">
              <span className="timer-urgent-inline-dot" aria-hidden="true" />
              <span>
                <strong>Under 1 minute</strong> — {formatDuration(remainingSeconds)} left. Submit
                your answer now.
              </span>
            </p>
          )}

          <div className="step-dots" aria-hidden="true">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <span
                key={i}
                className={`step-dot ${
                  i + 1 < questionNumber ? "done" : i + 1 === questionNumber ? "current" : ""
                }`}
              />
            ))}
          </div>

          <div className="progress-bar progress-bar--thick">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {questionNumber === 1 && session.welcome_message && showWelcome && (
          <div className="welcome-banner welcome-banner--animated">
            <div className="welcome-content">
              <span className="welcome-icon" aria-hidden="true">
                <IconWave size={22} />
              </span>
              <p>{session.welcome_message}</p>
            </div>
            <div className="welcome-actions">
              <button type="button" className="btn primary" onClick={handleStartTimer}>
                I&apos;m ready — start timer
              </button>
              <button
                type="button"
                className="welcome-dismiss"
                onClick={() => setShowWelcome(false)}
                aria-label="Dismiss welcome message"
              >
                <IconX size={18} />
              </button>
            </div>
          </div>
        )}

        {!timerStarted && questionNumber === 1 && !showWelcome && (
          <div className="timer-start-bar">
            <p>Your interview timer hasn&apos;t started yet.</p>
            <button type="button" className="btn primary" onClick={handleStartTimer}>
              Start timer
            </button>
          </div>
        )}

        <div className={`card interview-card ${loading ? "interview-card--loading" : ""}`}>
          {loading && (
            <div className="interview-loading-overlay" role="status" aria-live="polite">
              <span className="spinner large" />
              <p className="loading-overlay-title">{evaluatingLabel}</p>
              <p className="loading-overlay-sub">This usually takes a few seconds</p>
            </div>
          )}

          <div
            ref={questionRef}
            key={questionKey}
            className="question-box question-box--accent question-box--animate"
          >
            <span className="question-label">Interview question</span>
            <h2>{question}</h2>
          </div>

          <form onSubmit={handleSubmit} className="answer-form">
            <div className="answer-header">
              <label htmlFor="answer-textarea">Your answer</label>
              <span className={`char-count ${charCount > 20 ? "char-count--ok" : ""}`}>
                {charCount} chars
              </span>
            </div>
            <textarea
              ref={textareaRef}
              id="answer-textarea"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (draftHint) setDraftHint(false);
              }}
              placeholder="Explain your thinking clearly. Include examples where helpful…"
              rows={8}
              disabled={loading}
            />
            {draftHint && (
              <p className="draft-hint" role="status">
                Restored your saved draft for this question.
              </p>
            )}
            <p className="keyboard-hint keyboard-hint--subtle">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit
            </p>

            {error && (
              <div className="error-banner" role="alert">
                {error}
                {submitFailed && (
                  <button
                    type="button"
                    className="btn secondary btn-sm error-retry-btn"
                    onClick={() => submitAnswerFlow({ timedOut: false })}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <button
              id="submit-answer-btn"
              type="submit"
              className="btn primary btn-lg"
              disabled={
                loading ||
                (!answer.trim() && timerStarted && remainingSeconds > 0)
              }
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  {isLast ? "Generating report…" : "Evaluating…"}
                </span>
              ) : isLast ? (
                "Submit and view results"
              ) : (
                "Submit answer"
              )}
            </button>
          </form>
        </div>
      </div>

      <InterviewTimer
        totalSeconds={totalSeconds}
        perQuestionSeconds={perQuestionSeconds}
        difficulty={session.difficulty}
        role={session.role}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        remainingSeconds={shownSeconds}
        paused={timerPaused}
        waitingToStart={!timerStarted}
        expanded={timerExpanded}
        onToggleExpand={() => setTimerExpanded((e) => !e)}
      />
    </div>
  );
}
