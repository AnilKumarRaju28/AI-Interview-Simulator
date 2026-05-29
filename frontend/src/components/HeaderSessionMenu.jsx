import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconCopy } from "./icons";

function shortId(id) {
  if (!id || id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

export default function HeaderSessionMenu({ candidateName, sessionId, interviewId }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleCopy = async (label, value) => {
    try {
      await copyText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  if (!candidateName && !sessionId && !interviewId) return null;

  return (
    <div className="header-session-menu" ref={ref}>
      {candidateName && (
        <span className="session-badge candidate-badge">{candidateName}</span>
      )}
      {(sessionId || interviewId) && (
        <>
          <button
            type="button"
            className="details-trigger"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
          >
            Details
            <IconChevronDown size={14} />
          </button>
          {open && (
            <div className="details-dropdown" role="menu">
              {sessionId && (
                <div className="details-row">
                  <div>
                    <span className="details-label">Session</span>
                    <span className="details-value" title={sessionId}>
                      {sessionId}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy("session", sessionId)}
                    title="Copy session ID"
                  >
                    <IconCopy size={14} />
                    {copied === "session" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              {interviewId && (
                <div className="details-row">
                  <div>
                    <span className="details-label">Interview</span>
                    <span className="details-value" title={interviewId}>
                      {shortId(interviewId)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy("interview", interviewId)}
                    title="Copy interview ID"
                  >
                    <IconCopy size={14} />
                    {copied === "interview" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
