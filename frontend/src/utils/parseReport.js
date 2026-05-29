/** Strip markdown bullet markers and leading +/- from report lines. */
export function normalizeBulletText(line) {
  return line
    .replace(/\*\*/g, "")
    .replace(/^(\s*[\*\-+]+\s*)+/, "")
    .trim();
}

const SECTION_LABEL_ONLY = /^(recommendation|strengths?|weaknesses?|improvements?|improvement areas?|overall score|final report)\s*:?\s*$/i;

export function isActionableBullet(text) {
  const t = normalizeBulletText(text);
  if (!t || t.length < 4) return false;
  if (SECTION_LABEL_ONLY.test(t)) return false;
  return true;
}

/**
 * Parse LLM final report markdown into structured sections.
 */
export function parseFinalReportText(text) {
  if (!text?.trim()) return null;

  const getSection = (names) => {
    for (const name of names) {
      const regex = new RegExp(
        `\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-Za-z]|$)`,
        "i"
      );
      const match = text.match(regex);
      if (match) return match[1].trim();
    }
    return "";
  };

  const parseBullets = (block) =>
    block
      .split("\n")
      .map((line) => normalizeBulletText(line))
      .filter(isActionableBullet);

  const titleMatch = text.match(/\*\*Final Report:\s*(.+?)\*\*/i);
  const scoreMatch = text.match(/\*\*Overall Score:\*\*\s*([\d.]+)/i);

  const recommendationBlock = getSection(["Recommendation"]);
  const recommendation = recommendationBlock
    .split("\n")
    .map((line) => normalizeBulletText(line))
    .filter((line) => line && !SECTION_LABEL_ONLY.test(line))
    .join(" ");

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    overallScore: scoreMatch ? parseFloat(scoreMatch[1]) : null,
    strengths: parseBullets(getSection(["Strengths"])),
    weaknesses: parseBullets(getSection(["Weaknesses"])),
    improvements: parseBullets(getSection(["Improvements", "Improvement Areas"])),
    recommendation: recommendation || recommendationBlock.replace(/\*\*/g, "").trim(),
  };
}

function mergeBulletList(parsedList, fallbackList) {
  const source = parsedList?.length > 0 ? parsedList : fallbackList;
  return (source || [])
    .map((item) => normalizeBulletText(String(item)))
    .filter(isActionableBullet);
}

export function mergeReportData(finalReport) {
  const parsed = parseFinalReportText(finalReport.raw_text);
  const rawRec = parsed?.recommendation || finalReport.recommendation || "";
  const recommendation = normalizeBulletText(
    String(rawRec).replace(/^recommendation:\s*/i, "")
  );

  return {
    title: parsed?.title || "Final Report",
    overallScore: finalReport.overall_score ?? parsed?.overallScore,
    strengths: mergeBulletList(parsed?.strengths, finalReport.strengths),
    weaknesses: mergeBulletList(parsed?.weaknesses, finalReport.weaknesses),
    improvements: mergeBulletList(parsed?.improvements, finalReport.improvements),
    recommendation,
  };
}
