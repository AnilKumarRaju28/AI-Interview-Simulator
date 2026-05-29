import { useEffect, useState } from "react";
import { fetchReport } from "../api";
import FinalReportPanel from "./FinalReportPanel";
import {
  downloadReportJson,
  getTop3Actions,
  printReport,
} from "../utils/reportExport";

function scoreTier(score) {
  if (score >= 7) return "good";
  if (score >= 5) return "mid";
  return "low";
}

function ScoreBadge({ score }) {
  const tier = scoreTier(score);
  return (
    <div className={`score-ring score-ring--${tier}`} role="img" aria-label={`Score ${score} out of 10`}>
      <svg viewBox="0 0 120 120" className="score-ring-svg">
        <circle className="score-ring-bg" cx="60" cy="60" r="52" />
        <circle
          className="score-ring-progress"
          cx="60"
          cy="60"
          r="52"
          style={{ strokeDashoffset: 326.7 - (score / 10) * 326.7 }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-value">{score.toFixed(1)}</span>
        <span className="score-label">/ 10</span>
      </div>
    </div>
  );
}

function Top3Actions({ items }) {
  if (!items.length) return null;
  return (
    <section className="card top-actions-card">
      <div className="section-header">
        <h2>Top 3 actions for you</h2>
        <p className="section-desc">Focus on these next to improve fastest</p>
      </div>
      <ol className="top-actions-list">
        {items.map((item, i) => (
          <li key={i}>
            <span className="top-actions-num">{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Report({ interviewId, onRestart }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReport(interviewId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <div className="page-enter">
        <div className="card loading-state loading-state--report">
          <div className="loading-pulse" />
          <span className="spinner large" />
          <p>Preparing your personalized feedback…</p>
          <p className="loading-sub">Analyzing answers and building your report</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter">
        <div className="card">
          <div className="error-banner" role="alert">
            {error}
          </div>
          <button className="btn secondary" onClick={onRestart}>
            Back to setup
          </button>
        </div>
      </div>
    );
  }

  const { final_report, per_question_feedback, role, difficulty, candidate_name } = report;
  const score = final_report.overall_score;
  const tier = scoreTier(score);
  const topActions = getTop3Actions(final_report);

  return (
    <div className="page-enter report-page">
      <div className={`card report-hero report-hero--${tier}`}>
        <ScoreBadge score={score} />
        <div className="report-hero-text">
          <p className="report-eyebrow">Interview complete</p>
          <h1>{candidate_name ? `Well done, ${candidate_name}!` : "Interview complete"}</h1>
          <p className="report-meta">
            <span className="tag tag--role">{role}</span>
            <span className="tag tag--difficulty">{difficulty}</span>
            <span className="report-meta-sep">·</span>
            {per_question_feedback.length} questions answered
          </p>
          <p className={`score-verdict score-verdict--${tier}`}>
            {tier === "good" && "Strong performance — keep building on this momentum."}
            {tier === "mid" && "Solid foundation — review weak areas below to level up."}
            {tier === "low" && "Good effort — focus on the improvement areas in your report."}
          </p>
        </div>
      </div>

      <Top3Actions items={topActions} />

      <section className="card feedback-section">
        <div className="section-header">
          <h2>Question breakdown</h2>
          <p className="section-desc">Expand each item to see your answer and detailed feedback</p>
        </div>
        <div className="feedback-list">
          {per_question_feedback.map((item) => {
            const qTier = scoreTier(item.evaluation.score);
            return (
              <details
                key={item.question_number}
                className={`feedback-item feedback-item--${qTier}`}
                open={per_question_feedback.length <= 3}
              >
                <summary>
                  <span className="q-num">Q{item.question_number}</span>
                  <span className={`q-score-badge q-score-badge--${qTier}`}>
                    {item.evaluation.score.toFixed(1)}
                  </span>
                  <span className="q-preview">
                    {item.question.length > 90
                      ? `${item.question.slice(0, 90)}…`
                      : item.question}
                  </span>
                  <span className="chevron" aria-hidden="true" />
                </summary>
                <div className="feedback-body">
                  <p className="q-full">{item.question}</p>
                  <blockquote className="your-answer">
                    <span className="answer-label">Your answer</span>
                    {item.answer}
                  </blockquote>
                  {item.evaluation.summary && (
                    <p className="eval-summary">{item.evaluation.summary}</p>
                  )}
                  {item.evaluation.strengths?.length > 0 && (
                    <div className="mini-tags mini-tags--good">
                      {item.evaluation.strengths.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  )}
                  {item.evaluation.weaknesses?.length > 0 && (
                    <div className="mini-tags mini-tags--bad">
                      {item.evaluation.weaknesses.map((w) => (
                        <span key={w}>{w}</span>
                      ))}
                    </div>
                  )}
                  {item.evaluation.missing_concepts?.length > 0 && (
                    <p className="missing">
                      <strong>Gaps:</strong> {item.evaluation.missing_concepts.join(" · ")}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <FinalReportPanel finalReport={final_report} role={role} difficulty={difficulty} />

      <div className="report-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => downloadReportJson(report)}
        >
          Download JSON
        </button>
        <button type="button" className="btn secondary" onClick={printReport}>
          Print report
        </button>
        <button type="button" className="btn primary btn-lg" onClick={onRestart}>
          Start another interview
        </button>
      </div>
    </div>
  );
}
