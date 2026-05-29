import { useEffect, useRef, useState } from "react";
import { checkHealth, getRoles, startInterview } from "../api";
import { loadSetupPrefs, saveSetupPrefs } from "../utils/storage";
import { getTimerEstimate } from "../utils/timerConfig";

const DIFFICULTY_HINTS = {
  Easy: "Foundational concepts and straightforward scenarios",
  Medium: "Balanced depth — typical industry interview",
  Hard: "Advanced topics, system design, edge cases",
};

export default function Setup({ onStart, onError }) {
  const [roles, setRoles] = useState([]);
  const [difficulties, setDifficulties] = useState(["Easy", "Medium", "Hard"]);
  const [role, setRole] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [nQuestions, setNQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rolesLoading, setRolesLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);
  const prefsAppliedRef = useRef(false);
  const savedRoleRef = useRef(null);

  useEffect(() => {
    const prefs = loadSetupPrefs();
    if (prefs) {
      if (prefs.candidateName) setCandidateName(prefs.candidateName);
      if (prefs.difficulty) setDifficulty(prefs.difficulty);
      if (prefs.nQuestions) setNQuestions(prefs.nQuestions);
      if (prefs.customRole) setCustomRole(prefs.customRole);
      savedRoleRef.current = prefs.roleSelect ?? prefs.role ?? null;
    }
    prefsAppliedRef.current = true;
  }, []);

  useEffect(() => {
    if (!prefsAppliedRef.current) return;
    const t = setTimeout(() => {
      saveSetupPrefs({
        candidateName,
        role: role === "__custom__" ? customRole.trim() : role,
        roleSelect: role,
        difficulty,
        nQuestions,
        customRole,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [candidateName, role, customRole, difficulty, nQuestions]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => checkHealth().then((ok) => !cancelled && setApiOnline(ok));
    poll();
    const id = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    getRoles()
      .then((data) => {
        setRoles(data.roles || []);
        setDifficulties(data.difficulties || ["Easy", "Medium", "Hard"]);
        const list = data.roles || [];
        const saved = savedRoleRef.current;
        if (saved && list.includes(saved)) {
          setRole(saved);
        } else if (saved === "__custom__" || (saved && !list.includes(saved))) {
          setRole("__custom__");
          if (saved !== "__custom__") setCustomRole(saved);
        } else if (list.length) {
          setRole(list[0]);
        }
      })
      .catch(() =>
        setError("Could not connect to backend. Start the API from the backend folder.")
      )
      .finally(() => setRolesLoading(false));
  }, []);

  const timerEstimate = getTimerEstimate(difficulty, nQuestions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const finalRole = role === "__custom__" ? customRole.trim() : role;
    const name = candidateName.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!finalRole) {
      setError("Please select or enter a role.");
      return;
    }
    if (apiOnline === false) {
      setError("API is offline. Start the backend server and try again.");
      return;
    }
    setLoading(true);
    try {
      const data = await startInterview({
        candidate_name: name,
        role: finalRole,
        difficulty,
        n_questions: nQuestions,
      });
      onStart(data);
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="setup-hero">
        <div className="setup-hero-row">
          <div>
            <p className="setup-eyebrow">AI-powered practice</p>
            <h1>Prepare for your next interview</h1>
            <p className="subtitle">
              Adaptive technical questions, instant evaluation, and a detailed report — all in one
              session.
            </p>
          </div>
          <div
            className={`api-status ${apiOnline === true ? "api-status--online" : apiOnline === false ? "api-status--offline" : "api-status--checking"}`}
            role="status"
            aria-live="polite"
          >
            <span className="api-status-dot" aria-hidden="true" />
            <span className="api-status-text">
              {apiOnline === null && "Checking API…"}
              {apiOnline === true && "API connected"}
              {apiOnline === false && "API offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="card setup-card">
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="setup-form-grid">
            <div className="form-section">
              <h2 className="form-section-title">
                <span className="form-section-num">1</span> About you
              </h2>
              <label>
                Full name
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  autoComplete="name"
                  maxLength={100}
                  autoFocus
                />
              </label>

              <label>
                Target role
                {rolesLoading ? (
                  <div className="skeleton skeleton-input" />
                ) : (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={!roles.length}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__custom__">Other (custom role)</option>
                  </select>
                )}
              </label>

              {role === "__custom__" && (
                <label className="label-fade-in">
                  Custom role title
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g. Cloud Architect"
                  />
                </label>
              )}
            </div>

            <div className="form-section">
              <h2 className="form-section-title">
                <span className="form-section-num">2</span> Interview settings
              </h2>

              <div className="field-block">
                <span className="field-label">Difficulty</span>
                <div className="pill-group pill-group--full">
                  {difficulties.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`pill ${difficulty === d ? "active" : ""}`}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="field-hint">{DIFFICULTY_HINTS[difficulty]}</p>
              </div>

              <div className="field-block">
                <div className="field-label-row">
                  <span className="field-label">Number of questions</span>
                  <span className="field-value-badge">{nQuestions}</span>
                </div>
                <input
                  type="range"
                  className="range-input"
                  min={1}
                  max={20}
                  value={nQuestions}
                  onChange={(e) => setNQuestions(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
            </div>
          </div>

          <div className="timer-estimate-card" role="status">
            <div className="timer-estimate-header">
              <span className="timer-estimate-icon" aria-hidden="true">
                ⏱
              </span>
              <div>
                <p className="timer-estimate-title">Time limit for this interview</p>
                <p className="timer-estimate-total">
                  You have <strong>{timerEstimate.totalLabel}</strong> total (
                  {timerEstimate.totalWords})
                </p>
              </div>
            </div>
            <p className="timer-estimate-detail">
              {nQuestions} question{nQuestions === 1 ? "" : "s"} · {difficulty} difficulty · ~
              {timerEstimate.perQuestionLabel} suggested per question
            </p>
            <p className="timer-estimate-note">
              On the first question, click <strong>I&apos;m ready — start timer</strong> when you
              want the countdown to begin. Answers auto-save as you type. Submit before time runs
              out.
            </p>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn primary btn-lg"
            disabled={loading || rolesLoading || apiOnline === false}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Starting interview…
              </span>
            ) : (
              "Start interview"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
