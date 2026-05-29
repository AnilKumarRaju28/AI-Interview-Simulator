/** Seconds allowed per question by difficulty. */
export const SECONDS_PER_QUESTION = {
  Easy: 5 * 60,
  Medium: 8 * 60,
  Hard: 10 * 60,
};

export function getPerQuestionSeconds(difficulty) {
  return SECONDS_PER_QUESTION[difficulty] ?? SECONDS_PER_QUESTION.Medium;
}

export function getTotalInterviewSeconds(difficulty, nQuestions) {
  return getPerQuestionSeconds(difficulty) * Math.max(1, nQuestions);
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDurationWords(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec} second${sec === 1 ? "" : "s"}`;
  if (sec === 0) return `${m} minute${m === 1 ? "" : "s"}`;
  return `${m} min ${sec} sec`;
}

export function getTimerEstimate(difficulty, nQuestions) {
  const perQ = getPerQuestionSeconds(difficulty);
  const total = getTotalInterviewSeconds(difficulty, nQuestions);
  return {
    perQuestionSeconds: perQ,
    totalSeconds: total,
    perQuestionLabel: formatDuration(perQ),
    totalLabel: formatDuration(total),
    totalWords: formatDurationWords(total),
  };
}
