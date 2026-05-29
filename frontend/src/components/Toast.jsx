export default function Toast({ message, variant = "default" }) {
  if (!message) return null;
  const isWarning = variant === "warning";
  return (
    <div
      className={`toast ${isWarning ? "toast--warning" : ""}`}
      role={isWarning ? "alert" : "status"}
      aria-live={isWarning ? "assertive" : "polite"}
    >
      {message}
    </div>
  );
}
