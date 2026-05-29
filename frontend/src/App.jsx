import { useCallback, useEffect, useRef, useState } from "react";
import Setup from "./components/Setup";
import Interview from "./components/Interview";
import Report from "./components/Report";
import StepIndicator from "./components/StepIndicator";
import HeaderSessionMenu from "./components/HeaderSessionMenu";
import Toast from "./components/Toast";
import { clearInterviewDrafts } from "./utils/storage";

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState("");
  const interviewActiveRef = useRef(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const handleInterviewActive = useCallback((active) => {
    interviewActiveRef.current = active;
  }, []);

  useEffect(() => {
    if (screen !== "interview") return;

    const onBeforeUnload = (e) => {
      if (!interviewActiveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [screen]);

  const handleStart = (data) => {
    setSession(data);
    setScreen("interview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleComplete = (interviewId) => {
    clearInterviewDrafts(interviewId);
    setSession((prev) => ({ ...prev, interview_id: interviewId }));
    setScreen("report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    setSession(null);
    setScreen("setup");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className={`header ${screen === "interview" ? "header--wide" : ""}`}>
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">
              ◈
            </span>
            <span>AI Interview</span>
          </div>
          <StepIndicator current={screen} />
          <HeaderSessionMenu
            candidateName={session?.candidate_name}
            sessionId={session?.session_id}
            interviewId={session?.interview_id}
          />
        </div>
      </header>

      <main className={`main ${screen === "interview" ? "main--interview" : ""}`}>
        {screen === "setup" && <Setup onStart={handleStart} onError={showToast} />}
        {screen === "interview" && session && (
          <Interview
            session={session}
            onComplete={handleComplete}
            onInterviewActive={handleInterviewActive}
          />
        )}
        {screen === "report" && session && (
          <Report interviewId={session.interview_id} onRestart={handleRestart} />
        )}
      </main>

      <footer className="footer">
        <p>Powered by Groq · Traced with Langfuse</p>
      </footer>

      <Toast message={toast} />
    </div>
  );
}
