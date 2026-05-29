const SETUP_KEY = "ai-interview-setup-prefs";
const DRAFT_PREFIX = "ai-interview-draft-";

export function loadSetupPrefs() {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSetupPrefs(prefs) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode */
  }
}

export function draftStorageKey(interviewId, questionNumber) {
  return `${DRAFT_PREFIX}${interviewId}-q${questionNumber}`;
}

export function loadDraft(interviewId, questionNumber) {
  try {
    return localStorage.getItem(draftStorageKey(interviewId, questionNumber)) || "";
  } catch {
    return "";
  }
}

export function saveDraft(interviewId, questionNumber, text) {
  try {
    const key = draftStorageKey(interviewId, questionNumber);
    if (text.trim()) {
      localStorage.setItem(key, text);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function clearDraft(interviewId, questionNumber) {
  try {
    localStorage.removeItem(draftStorageKey(interviewId, questionNumber));
  } catch {
    /* ignore */
  }
}

export function clearInterviewDrafts(interviewId) {
  try {
    const suffix = `${DRAFT_PREFIX}${interviewId}-`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(suffix)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
