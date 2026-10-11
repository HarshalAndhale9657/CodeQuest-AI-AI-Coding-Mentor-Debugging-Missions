// Service worker (ES module). Opens the side panel, and turns detected LeetCode submissions into
// CodeQuest attempts. Submissions are always recorded locally so the panel can show them; the code
// is sent to the CodeQuest server automatically only when the learner turned "Auto-log" on.
import { parseSubmission, describeSync } from "./lib/submission.js";

const DEFAULT_API = "http://localhost:8000";
const SEEN_LIMIT = 50;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error("CodeQuest: could not set side panel behaviour", error);
  });
});

async function alreadySeen(submissionId) {
  const { seenSubmissions = [] } = await chrome.storage.session.get("seenSubmissions");
  if (seenSubmissions.includes(submissionId)) return true;
  await chrome.storage.session.set({ seenSubmissions: [...seenSubmissions, submissionId].slice(-SEEN_LIMIT) });
  return false;
}

async function syncToServer(submission) {
  const { apiBase = DEFAULT_API, token = null } = await chrome.storage.local.get(["apiBase", "token"]);
  if (!token) return { logged: false, error: "Connect the extension to CodeQuest to log attempts." };
  try {
    const response = await fetch(`${apiBase}/api/ext/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        slug: submission.slug,
        tags: submission.tags,
        verdict: submission.verdict,
        code: submission.code,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      await chrome.storage.local.set({ token: null });
      return { logged: false, error: "The extension was disconnected. Pair it again." };
    }
    if (!response.ok) return { logged: false, error: typeof data.error === "string" ? data.error : "Logging failed." };
    return { logged: true, summary: describeSync(data), result: data };
  } catch {
    return { logged: false, error: `Can't reach the CodeQuest server at ${apiBase}.` };
  }
}

async function handleSubmission(raw, sender) {
  const tabUrl = sender.tab?.url ?? "";
  if (!tabUrl.startsWith("https://leetcode.com/problems/")) return;
  const submission = parseSubmission(raw);
  if (!submission || (await alreadySeen(submission.submissionId))) return;

  const { autoLog = false } = await chrome.storage.local.get("autoLog");
  const record = {
    submissionId: submission.submissionId,
    slug: submission.slug,
    statusMsg: submission.statusMsg,
    verdict: submission.verdict,
    isPython: submission.isPython,
    tags: submission.tags,
    at: Date.now(),
    logged: false,
    summary: "",
    error: "",
  };
  if (autoLog) Object.assign(record, await syncToServer(submission));
  // The code itself is kept only in memory for this session, for a later manual "Log it".
  await chrome.storage.session.set({ pendingCode: { submissionId: submission.submissionId, code: submission.code } });
  await chrome.storage.local.set({ lastSubmission: record });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "cq-submission") {
    handleSubmission(message.data, sender).catch((error) => console.error("CodeQuest: submission handling failed", error));
  }
  return false;
});
