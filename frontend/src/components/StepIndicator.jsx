const STEPS = [
  { id: "setup", label: "Setup" },
  { id: "interview", label: "Interview" },
  { id: "report", label: "Results" },
];

export default function StepIndicator({ current }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="step-indicator" aria-label="Interview progress">
      {STEPS.map((step, i) => {
        const status =
          i < currentIndex ? "done" : i === currentIndex ? "active" : "upcoming";
        return (
          <div key={step.id} className={`step-item step-item--${status}`}>
            <span className="step-dot" aria-hidden="true">
              {status === "done" ? "✓" : i + 1}
            </span>
            <span className="step-label">{step.label}</span>
            {i < STEPS.length - 1 && <span className="step-connector" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}
