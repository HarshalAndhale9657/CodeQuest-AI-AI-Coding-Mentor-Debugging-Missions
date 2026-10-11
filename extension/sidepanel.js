// CodeQuest Companion side panel.
// Security notes:
//  * Everything shown is rendered with textContent (never innerHTML), so server or page text can't inject markup.
//  * The extension token lives in chrome.storage.local and is sent only to the configured CodeQuest server.
//  * Code is read from the LeetCode editor only when the learner presses a button, or automatically on
//    LeetCode "Submit" when the learner has switched Auto-log on (handled by the service worker).
import { describeSync } from "./lib/submission.js";

const DEFAULT_API = "http://localhost:8000";
const MAX_HINT_LEVEL = 3;
const $ = (id) => document.getElementById(id);

const state = { apiBase: DEFAULT_API, token: null, tabId: null, problem: null, hintLevel: {}, autoLog: false };

// ------------------------------------------------------------------ storage

async function loadSettings() {
  const data = await chrome.storage.local.get(["apiBase", "token", "hintLevel", "autoLog"]);
  state.apiBase = data.apiBase || DEFAULT_API;
  state.token = data.token || null;
  state.hintLevel = data.hintLevel || {};
  state.autoLog = data.autoLog === true;
}

async function saveSettings(patch) {
  Object.assign(state, patch);
  await chrome.storage.local.set(patch);
}

// ------------------------------------------------------------------ API

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(path, body, method = "POST") {
  let response;
  try {
    response = await fetch(`${state.apiBase}${path}`, {
      method,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
    });
  } catch {
    throw new ApiError(0, `Can't reach the CodeQuest server at ${state.apiBase}. Check Settings.`);
  }
  let data = {};
  try {
    data = await response.json();
  } catch {
    // non-JSON error body
  }
  if (!response.ok) {
    if (response.status === 401) {
      await saveSettings({ token: null });
      render();
    }
    const detail = typeof data.error === "string" ? data.error
      : Array.isArray(data.detail) ? "The request was not valid." : `Request failed (${response.status}).`;
    throw new ApiError(response.status, detail);
  }
  return data;
}

// ------------------------------------------------------------------ LeetCode page access (run in the page's MAIN world)

function pageReadEditor() {
  // LeetCode keeps several Monaco models alive (the solution editor plus plaintext/JSON test-case
  // inputs), so prefer the model of the visible code editor, then any non-data model.
  const NON_CODE = new Set(["plaintext", "json", "markdown"]);
  const api = window.monaco?.editor;
  if (!api) return null;
  const usable = (m) => m && !m.isDisposed() && m.getValue().trim().length > 0;
  const focused = (api.getEditors?.() ?? [])
    .map((e) => e.getModel())
    .filter((m) => usable(m) && !NON_CODE.has(m.getLanguageId()));
  const candidates = focused.length > 0
    ? focused
    : (api.getModels?.() ?? []).filter((m) => usable(m) && !NON_CODE.has(m.getLanguageId()));
  if (candidates.length === 0) return null;
  const model = candidates.sort((a, b) => b.getValueLength() - a.getValueLength())[0];
  return { code: model.getValue(), language: model.getLanguageId() };
}

async function pageFetchProblem(slug) {
  const query = "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty topicTags { slug } } }";
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ query, variables: { titleSlug: slug } }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const q = json?.data?.question;
  if (!q) return null;
  // Only metadata is returned: never the statement or LeetCode's own hints.
  return { title: q.title, difficulty: q.difficulty, tags: (q.topicTags || []).map((t) => t.slug) };
}

async function runInPage(func, args = []) {
  const [result] = await chrome.scripting.executeScript({ target: { tabId: state.tabId }, world: "MAIN", func, args });
  return result?.result ?? null;
}

function parseProblemUrl(url) {
  if (!url) return { kind: "none" };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "none" };
  }
  if (parsed.hostname !== "leetcode.com") return { kind: "none" };
  if (parsed.pathname.startsWith("/contest/")) return { kind: "contest" };
  const match = parsed.pathname.match(/^\/problems\/([a-z0-9-]+)/);
  return match ? { kind: "problem", slug: match[1] } : { kind: "none" };
}

// ------------------------------------------------------------------ rendering helpers

function setText(el, text, className = "") {
  el.textContent = text;
  el.className = `out ${className}`.trim();
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (label) button.textContent = label;
}

function showError(el, err) {
  setText(el, err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
}

function render() {
  $("pair-view").hidden = !!state.token;
  $("main-view").hidden = !state.token;
  $("api-base").value = state.apiBase;
  $("auto-log").checked = state.autoLog;
}

// ------------------------------------------------------------------ Mistake Memory + submissions

const LABELS = {
  off_by_one: "Off-by-one",
  empty_input: "Unhandled empty input",
  print_vs_return: "Print instead of return",
  missing_return: "Missing return",
  infinite_loop: "Loop that never ends",
  base_case: "Missing base case",
  bad_initial_value: "Bad starting value",
  mutate_while_iterating: "Changing a list while looping",
  shadow_builtin: "Hidden built-in name",
  int_division: "Division mix-up",
};
const label = (key) => LABELS[key] ?? key.replaceAll("_", " ");

function listOf(items) {
  const ul = document.createElement("ul");
  ul.className = "memory-list";
  for (const text of items) {
    const li = document.createElement("li");
    li.textContent = text;
    ul.append(li);
  }
  return ul;
}

async function refreshMemory() {
  const out = $("memory-out");
  if (!state.token) return;
  try {
    const me = await api("/api/ext/me", null, "GET");
    out.replaceChildren();
    out.className = "";
    const intro = document.createElement("p");
    intro.className = "muted";
    intro.textContent = `${me.user.name} · ${me.solved} CodeQuest missions solved`;
    out.append(intro);
    if (me.recurring.length) {
      const head = document.createElement("p");
      head.className = "error";
      head.textContent = "Recurring mistakes to watch:";
      out.append(head, listOf(me.recurring.map(label)));
    } else {
      const ok = document.createElement("p");
      ok.className = "ok";
      ok.textContent = "No recurring mistakes right now.";
      out.append(ok);
    }
    if (me.beaten.length) out.append(listOf(me.beaten.map((k) => `Beaten: ${label(k)}`)));
    if (me.next_up.length) {
      const next = document.createElement("p");
      next.className = "muted";
      next.textContent = `Next CodeQuest mission: ${me.next_up[0].title}. ${me.next_up[0].reason}.`;
      out.append(next);
    }
  } catch (err) {
    out.className = "error";
    out.textContent = err instanceof ApiError ? err.message : "Couldn't load your Mistake Memory.";
  }
}

function renderLastSubmission(record) {
  const out = $("last-submission");
  const button = $("log-last-btn");
  out.replaceChildren();
  out.className = "out";
  button.hidden = true;
  if (!record) return;
  const badge = document.createElement("span");
  badge.className = `badge ${record.verdict === "accepted" ? "accepted" : "failed"}`;
  badge.textContent = record.statusMsg;
  const title = document.createElement("span");
  title.textContent = ` on ${record.slug}`;
  const detail = document.createElement("p");
  if (record.logged) {
    detail.className = "ok";
    detail.textContent = `Logged to CodeQuest. ${record.summary}`;
  } else if (record.error) {
    detail.className = "error";
    detail.textContent = record.error;
    button.hidden = false;
  } else {
    detail.className = "muted";
    detail.textContent = record.isPython
      ? "Detected. Not logged yet (Auto-log is off)."
      : "Detected. Only Python code can be analyzed; the verdict can still be logged.";
    button.hidden = false;
  }
  out.append(badge, title, detail);
}

async function onLogLast() {
  const button = $("log-last-btn");
  const { lastSubmission: record } = await chrome.storage.local.get("lastSubmission");
  if (!record) return;
  const { pendingCode } = await chrome.storage.session.get("pendingCode");
  const code = pendingCode?.submissionId === record.submissionId ? pendingCode.code : "";
  setBusy(button, true, "Logging…");
  try {
    const result = await api("/api/ext/sync", { slug: record.slug, tags: record.tags, verdict: record.verdict, code });
    await chrome.storage.local.set({ lastSubmission: { ...record, logged: true, summary: describeSync(result), error: "" } });
    await refreshMemory();
  } catch (err) {
    await chrome.storage.local.set({
      lastSubmission: { ...record, error: err instanceof ApiError ? err.message : "Logging failed." },
    });
  } finally {
    setBusy(button, false, "Log this submission");
  }
}

function renderProblem() {
  const ready = state.problem && state.problem.kind === "problem" && state.problem.meta;
  document.querySelectorAll("[data-needs-problem]").forEach((b) => (b.disabled = !ready));
  const status = $("problem-status");
  delete status.dataset.difficulty; // set below once LeetCode's difficulty is known; CSS colours it
  $("problem-title").textContent = "";
  $("problem-tags").replaceChildren();
  if (!state.problem || state.problem.kind === "none") {
    status.textContent = "Open a LeetCode problem to begin.";
    return;
  }
  if (state.problem.kind === "contest") {
    status.textContent = "Contest pages are off-limits: CodeQuest Companion is disabled during contests.";
    return;
  }
  if (!state.problem.meta) {
    status.textContent = "Reading the problem…";
    return;
  }
  status.textContent = state.problem.meta.difficulty || "";
  if (state.problem.meta.difficulty) status.dataset.difficulty = state.problem.meta.difficulty;
  $("problem-title").textContent = state.problem.meta.title;
  for (const tag of state.problem.meta.tags) {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;
    $("problem-tags").append(chip);
  }
  const level = state.hintLevel[state.problem.slug] || 0;
  $("hint-btn").textContent = level >= MAX_HINT_LEVEL ? "No more hints" : `Show hint ${level + 1}`;
  if (level >= MAX_HINT_LEVEL) $("hint-btn").disabled = true;
}

// ------------------------------------------------------------------ active tab tracking

async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tabId = tab?.id ?? null;
  const parsed = parseProblemUrl(tab?.url);
  if (parsed.kind === "problem" && state.problem?.slug === parsed.slug && state.problem.meta) {
    renderProblem();
    return;
  }
  state.problem = parsed;
  ["approach-out", "analyze-out", "sync-out"].forEach((id) => setText($(id), ""));
  $("hint-out").replaceChildren();
  renderProblem();
  if (parsed.kind !== "problem") return;
  try {
    const meta = await runInPage(pageFetchProblem, [parsed.slug]);
    if (state.problem?.slug !== parsed.slug) return; // user moved on meanwhile
    state.problem.meta = meta;
    if (!meta) $("problem-status").textContent = "Couldn't read this problem's details. Reload the LeetCode tab.";
  } catch {
    $("problem-status").textContent = "Couldn't access the LeetCode tab. Reload it and try again.";
  }
  renderProblem();
}

// ------------------------------------------------------------------ actions

async function onPair(event) {
  event.preventDefault();
  const code = $("pair-code").value.trim().toUpperCase();
  const status = $("pair-status");
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    status.className = "error";
    status.textContent = "The code has 6 letters or digits.";
    return;
  }
  const button = $("pair-btn");
  setBusy(button, true, "Connecting…");
  status.className = "muted";
  status.textContent = `Connecting to ${state.apiBase}…`;
  let data;
  try {
    data = await api("/api/ext/pair", { code });
  } catch (err) {
    status.className = "error";
    status.textContent = err instanceof ApiError ? err.message : `Pairing failed: ${err?.message ?? err}`;
    return;
  } finally {
    setBusy(button, false, "Connect");
  }
  await saveSettings({ token: data.token });
  status.textContent = "";
  render();
  // Pairing succeeded; problems loading the tab or memory are reported by those views, not as a pairing failure.
  await Promise.allSettled([refreshActiveTab(), refreshMemory()]);
}

async function onApproach() {
  const out = $("approach-out");
  const button = $("approach-btn");
  setBusy(button, true, "Checking…");
  try {
    const data = await api("/api/ext/approach", { text: $("approach-text").value, tags: state.problem.meta.tags });
    out.replaceChildren();
    out.className = "out";
    const verdict = document.createElement("div");
    verdict.className = `verdict ${data.verdict}`;
    verdict.textContent = { on_track: "On track", partially: "Partly there", off_track: "Rethink the approach", unclear: "Tell me more" }[data.verdict] ?? data.verdict;
    const question = document.createElement("p");
    question.textContent = data.question;
    out.append(verdict, question);
  } catch (err) {
    showError(out, err);
  } finally {
    setBusy(button, false, "Check approach");
  }
}

async function onHint() {
  const slug = state.problem.slug;
  const level = (state.hintLevel[slug] || 0) + 1;
  if (level > MAX_HINT_LEVEL) return;
  const button = $("hint-btn");
  setBusy(button, true, "Thinking…");
  try {
    const data = await api("/api/ext/hint", { tags: state.problem.meta.tags, level });
    const item = document.createElement("li");
    item.textContent = data.text;
    $("hint-out").append(item);
    $("hint-out").className = "out hints";
    await saveSettings({ hintLevel: { ...state.hintLevel, [slug]: level } });
  } catch (err) {
    const item = document.createElement("li");
    item.className = "error";
    item.textContent = err instanceof ApiError ? err.message : "Could not load a hint.";
    $("hint-out").append(item);
  } finally {
    button.disabled = false;
    renderProblem();
  }
}

async function readEditor(out) {
  let editor;
  try {
    editor = await runInPage(pageReadEditor);
  } catch {
    editor = null;
  }
  if (!editor) {
    setText(out, "Couldn't read the code editor. Make sure the problem's code editor is visible.", "error");
    return null;
  }
  if (!String(editor.language).toLowerCase().startsWith("python")) {
    setText(out, "Code analysis supports Python for now. Switch the editor language to Python 3.", "error");
    return null;
  }
  return editor;
}

async function onAnalyze() {
  const out = $("analyze-out");
  const button = $("analyze-btn");
  const editor = await readEditor(out);
  if (!editor) return;
  setBusy(button, true, "Analyzing…");
  try {
    const data = await api("/api/ext/analyze", { code: editor.code, language: "python" });
    out.replaceChildren();
    out.className = "out";
    if (data.syntax_error) {
      setText(out, `Python can't read line ${data.syntax_error.line}: ${data.syntax_error.message}.`, "error");
    } else if (data.findings.length === 0) {
      setText(out, "No common mistakes found. Now test it on edge cases: empty input, one element, the largest values.", "ok");
    } else {
      for (const f of data.findings) {
        const row = document.createElement("p");
        row.className = "finding";
        const where = document.createElement("b");
        where.textContent = `Line ${f.line}: `;
        row.append(where, document.createTextNode(f.message));
        out.append(row);
      }
    }
  } catch (err) {
    showError(out, err);
  } finally {
    setBusy(button, false, "Analyze my code");
  }
}

async function onSync() {
  const out = $("sync-out");
  const button = $("sync-btn");
  const editor = await readEditor(out);
  if (!editor) return;
  setBusy(button, true, "Logging…");
  try {
    const data = await api("/api/ext/sync", {
      slug: state.problem.slug,
      tags: state.problem.meta.tags,
      verdict: $("verdict").value,
      code: editor.code,
    });
    if (data.newly_recurring.length) {
      setText(out, `Logged. Recurring mistake spotted: ${data.newly_recurring.join(", ").replaceAll("_", " ")}. Open CodeQuest for a targeted mission.`, "error");
    } else if (data.recorded_mistakes.length) {
      setText(out, `Logged. Noted: ${data.recorded_mistakes.join(", ").replaceAll("_", " ")}.`);
    } else {
      setText(out, "Logged. Nice work!", "ok");
    }
    await refreshMemory();
  } catch (err) {
    showError(out, err);
  } finally {
    setBusy(button, false, "Log attempt");
  }
}

async function onSaveSettings() {
  const status = $("settings-status");
  let base = $("api-base").value.trim().replace(/\/+$/, "");
  let url;
  try {
    url = new URL(base);
  } catch {
    status.textContent = "Enter a full URL, e.g. https://codequest.example.com";
    return;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!local && url.protocol !== "https:") {
    status.textContent = "Use https for a deployed server.";
    return;
  }
  if (!local) {
    const granted = await chrome.permissions.request({ origins: [`${url.origin}/*`] });
    if (!granted) {
      status.textContent = "Permission to reach that server was not granted.";
      return;
    }
  }
  base = url.origin;
  await saveSettings({ apiBase: base, token: base === state.apiBase ? state.token : null });
  status.textContent = "Saved.";
  render();
}

// ------------------------------------------------------------------ wiring

async function init() {
  await loadSettings();
  render();
  $("settings-toggle").addEventListener("click", () => {
    const panel = $("settings");
    panel.hidden = !panel.hidden;
    $("settings-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  });
  $("save-settings").addEventListener("click", onSaveSettings);
  $("disconnect").addEventListener("click", async () => {
    await saveSettings({ token: null });
    render();
  });
  $("pair-form").addEventListener("submit", onPair);
  $("approach-btn").addEventListener("click", onApproach);
  $("hint-btn").addEventListener("click", onHint);
  $("analyze-btn").addEventListener("click", onAnalyze);
  $("sync-btn").addEventListener("click", onSync);
  $("log-last-btn").addEventListener("click", onLogLast);
  $("auto-log").addEventListener("change", (event) => saveSettings({ autoLog: event.target.checked }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.lastSubmission) {
      renderLastSubmission(changes.lastSubmission.newValue);
      if (changes.lastSubmission.newValue?.logged) refreshMemory();
    }
    if (changes.token && !changes.token.newValue && state.token) {
      state.token = null;
      render();
    }
  });
  const { lastSubmission } = await chrome.storage.local.get("lastSubmission");
  renderLastSubmission(lastSubmission);
  chrome.tabs.onActivated.addListener(refreshActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === state.tabId && info.url) refreshActiveTab();
  });
  await Promise.allSettled([refreshActiveTab(), refreshMemory()]);
}

function showPanelError(message) {
  const bar = $("panel-error");
  if (!bar) return;
  bar.textContent = `Something went wrong: ${message}. Reload the extension, and if it persists, report this message.`;
  bar.hidden = false;
}

window.addEventListener("error", (event) => showPanelError(event.message || "script error"));
window.addEventListener("unhandledrejection", (event) => showPanelError(event.reason?.message ?? String(event.reason)));

init().catch((error) => showPanelError(error?.message ?? String(error)));
