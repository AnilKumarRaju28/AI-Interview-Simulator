const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }
  return data;
}

export function getRoles() {
  return request("/api/roles");
}

export function startInterview(payload) {
  return request("/api/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitAnswer(interviewId, answer) {
  return request(`/api/interviews/${interviewId}/answers`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export function fetchReport(interviewId) {
  return request(`/api/interviews/${interviewId}/report`);
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
