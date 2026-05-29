import { mergeReportData } from "../utils/parseReport";
import { IconAlert, IconCheck, IconTrending } from "./icons";

const SECTION_ICONS = {
  strengths: IconCheck,
  weaknesses: IconAlert,
  improvements: IconTrending,
};

function ReportSection({ variant, title, items }) {
  if (!items?.length) return null;
  const Icon = SECTION_ICONS[variant];

  return (
    <div className={`report-section report-section--${variant}`}>
      <div className="report-section-header">
        <span className="report-section-icon">
          <Icon size={14} />
        </span>
        <h3>{title}</h3>
        <span className="report-section-count">{items.length}</span>
      </div>
      <ul className="report-section-list">
        {items.map((item, i) => (
          <li key={`${title}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function FinalReportPanel({ finalReport, role, difficulty }) {
  const data = mergeReportData(finalReport);

  return (
    <section className="card final-report-card">
      <div className="final-report-header final-report-header--compact">
        <div>
          <p className="final-report-eyebrow">Panel summary</p>
          <h2>{data.title}</h2>
          <p className="final-report-meta">
            {role} · {difficulty}
          </p>
        </div>
      </div>

      <div className="final-report-grid">
        <ReportSection variant="strengths" title="Strengths" items={data.strengths} />
        <ReportSection variant="weaknesses" title="Weaknesses" items={data.weaknesses} />
        <ReportSection variant="improvements" title="Improvement areas" items={data.improvements} />
      </div>

      {data.recommendation && (
        <div className="recommendation-box">
          <div className="recommendation-label">Hiring recommendation</div>
          <p>{data.recommendation}</p>
        </div>
      )}
    </section>
  );
}
