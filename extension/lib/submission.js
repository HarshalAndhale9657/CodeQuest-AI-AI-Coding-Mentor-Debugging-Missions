// Pure helpers shared by the service worker and the test harness (no chrome.* usage here).

export const MESSAGE_SOURCE = "codequest-companion";

// LeetCode's check endpoint returns `status_msg`; map it onto the verdicts our API accepts.
const VERDICTS = {
  "Accepted": "accepted",
  "Wrong Answer": "wrong_answer",
  "Runtime Error": "runtime_error",
  "Time Limit Exceeded": "time_limit",
  "Memory Limit Exceeded": "runtime_error",
  "Output Limit Exceeded": "wrong_answer",
  "Compile Error": "other",
};

export function toVerdict(statusMsg) {
  return VERDICTS[statusMsg] ?? "other";
}

const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const TAG_RE = /^[a-z0-9-]{1,60}$/;
const ID_RE = /^\d{1,20}$/;

/**
 * Validate a submission message relayed from the page. Everything coming from the page is
 * untrusted (the page can post arbitrary messages), so only well-formed payloads pass.
 * @returns {null | {submissionId: string, slug: string, statusMsg: string, verdict: string,
 *                   lang: string, isPython: boolean, code: string, tags: string[]}}
 */
export function parseSubmission(data) {
  if (!data || typeof data !== "object" || data.source !== MESSAGE_SOURCE || data.type !== "submission") return null;
  const p = data.payload;
  if (!p || typeof p !== "object") return null;
  const submissionId = String(p.submissionId ?? "");
  const slug = String(p.slug ?? "");
  const statusMsg = String(p.statusMsg ?? "");
  const lang = String(p.lang ?? "").toLowerCase();
  if (!ID_RE.test(submissionId) || !SLUG_RE.test(slug) || statusMsg.length > 60) return null;
  const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string" && TAG_RE.test(t)).slice(0, 30) : [];
  const isPython = lang.startsWith("python");
  const code = isPython && typeof p.code === "string" ? p.code.slice(0, 64 * 1024) : "";
  return { submissionId, slug, statusMsg, verdict: toVerdict(statusMsg), lang, isPython, code, tags };
}

export function describeSync(result) {
  if (!result) return "";
  if (result.newly_recurring?.length) {
    return `Recurring mistake spotted: ${result.newly_recurring.join(", ").replaceAll("_", " ")}.`;
  }
  if (result.recorded_mistakes?.length) {
    return `Noted: ${result.recorded_mistakes.join(", ").replaceAll("_", " ")}.`;
  }
  return "No common mistakes found.";
}
