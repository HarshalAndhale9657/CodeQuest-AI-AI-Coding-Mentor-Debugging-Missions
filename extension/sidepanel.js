// CodeQuest Companion side panel.
// Security notes:
//  * Everything shown is rendered with textContent (never innerHTML), so server or page text can't inject markup.
//  * The extension token lives in chrome.storage.local and is sent only to the configured CodeQuest server.
//  * Code is read from the LeetCode editor only when the learner presses a button.

const DEFAULT_API = "http://localhost:8000";
const MAX_HINT_LEVEL = 3;
const $ = (id) => document.getElementById(id);

const state = { apiBase: DEFAULT_API, token: null, tabId: null, problem: null, hintLevel: {} };

// ------------------------------------------------------------------ storage

async function loadSettings() {
  const data = await chrome.storage.local.get(["apiBase", "token", "hintLevel"]);
  state.apiBase = data.apiBase || DEFAULT_API;
  state.token = data.token || null;
  state.hintLevel = data.hintLevel || {};
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

async function api(path, body) {
  let response;
  try {
    response = await fetch(`${state.apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
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
  const models = window.monaco?.editor?.getModels?.() ?? [];
  const candidates = models.filter((m) => !m.isDisposed() && m.getValue().trim().length > 0);
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
}

function renderProblem() {
  const ready = state.problem && state.problem.kind === "problem" && state.problem.meta;
  document.querySelectorAll("[data-needs-problem]").forEach((b) => (b.disabled = !ready));
  const status = $("problem-status");
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
    status.textContent = "The code has 6 letters or digits.";
    return;
  }
  try {
    const data = await api("/api/ext/pair", { code });
    await saveSettings({ token: data.token });
    status.textContent = "";
    render();
    await refreshActiveTab();
  } catch (err) {
    status.textContent = err instanceof ApiError ? err.message : "Pairing failed.";
  }
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
  chrome.tabs.onActivated.addListener(refreshActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === state.tabId && info.url) refreshActiveTab();
  });
  await refreshActiveTab();
}

init();
