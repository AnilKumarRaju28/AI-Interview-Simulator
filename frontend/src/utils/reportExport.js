import { isActionableBullet, mergeReportData, normalizeBulletText } from "./parseReport";

/** Up to 3 actionable items: improvements first, then weaknesses. */
export function getTop3Actions(finalReport) {
  const data = mergeReportData(finalReport);
  const seen = new Set();
  const items = [];

  for (const text of [...(data.improvements || []), ...(data.weaknesses || [])]) {
    const t = normalizeBulletText(text || "");
    if (!isActionableBullet(t) || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    items.push(t);
    if (items.length >= 3) break;
  }

  return items;
}

export function buildReportFilename(report) {
  const name = (report.candidate_name || "candidate").replace(/\s+/g, "-").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `interview-report-${name}-${date}.json`;
}

export function downloadReportJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildReportFilename(report);
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport() {
  window.print();
}
