// CodeQuest Companion side panel: a tutor chat that knows which LeetCode problem you are on.
// Security notes:
//  * All text is rendered with DOM nodes / textContent (never innerHTML): server, model and page text can't inject markup.
//  * The extension token lives in chrome.storage.local and is sent only to the configured CodeQuest server.
//  * The problem statement and your code are read from the page only when you message the tutor (or on Submit with
//    Auto-log on), are sent only to your CodeQuest server, and are never stored there. Chats live in session storage.
import { describeSync } from "./lib/submission.js";
import {
  MAX_HINT_LEVEL,
  MODE_LABELS,
  SUGGESTION_LABELS,
  historyForApi,
  renderRich,
  trimStored,
} from "./lib/chat.js";

const DEFAULT_API = "http://localhost:8000";
const STATEMENT_LIMIT = 8000;
const $ = (id) => document.getElementById(id);

const state = {
  apiBase: DEFAULT_API,
  token: null,
  autoLog: false,
  tabId: null,
  problem: { kind: "none" },
  chat: { slug: null, messages: [], hintLevel: 1 },
  sending: false,
  view: "chat",
};

// ------------------------------------------------------------------ storage

async function loadSettings() {
  const data = await chrome.storage.local.get(["apiBase", "token", "autoLog"]);
  state.apiBase = data.apiBase || DEFAULT_API;
  state.token = data.token || null;
  state.autoLog = data.autoLog === true;
}

async function saveSettings(patch) {
  Object.assign(state, patch);
  await chrome.storage.local.set(patch);
}

const chatKey = (slug) => `chat:${slug}`;

async function loadChat(slug) {
  const stored = (await chrome.storage.session.get(chatKey(slug)))[chatKey(slug)];
  return stored && Array.isArray(stored.messages)
    ? { slug, messages: stored.messages, hintLevel: stored.hintLevel || 1 }
    : { slug, messages: [], hintLevel: 1 };
}

async function saveChat(chat) {
  if (!chat.slug) return;
  chat.messages = trimStored(chat.messages);
  await chrome.storage.session.set({ [chatKey(chat.slug)]: { messages: chat.messages, hintLevel: chat.hintLevel } });
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
    throw new ApiError(0, `Can't reach the CodeQuest server at ${state.apiBase}. Check that it's running, or change it in Settings.`);
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

// ------------------------------------------------------------------ LeetCode page access (functions run in the page's MAIN world)

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

async function pageFetchProblem(slug, statementLimit) {
  const query = "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty content topicTags { slug } } }";
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
  let statement = "";
  if (typeof q.content === "string" && q.content) {
    // DOMParser never runs scripts; we only want the readable text (premium problems return no content).
    const doc = new DOMParser().parseFromString(q.content, "text/html");
    doc.querySelectorAll("sup").forEach((node) => node.prepend("^"));
    statement = (doc.body.innerText || doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, statementLimit);
  }
  return { title: q.title, difficulty: q.difficulty, tags: (q.topicTags || []).map((t) => t.slug), statement };
}

async function runInPage(func, args = []) {
  const [result] = await chrome.scripting.executeScript({ target: { tabId: state.tabId }, world: "MAIN", func, args });
  return result?.result ?? null;
}

async function readEditorSafely() {
  try {
    return await runInPage(pageReadEditor);
  } catch {
    return null;
  }
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

// ------------------------------------------------------------------ small UI helpers

function setText(node, text, className = "") {
  node.textContent = text;
  node.className = `out ${className}`.trim();
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  if (text) button.textContent = text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

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

// ------------------------------------------------------------------ top-level rendering

function render() {
  const paired = !!state.token;
  $("pair-view").hidden = paired;
  $("tabs").hidden = !paired;
  $("chat-view").hidden = !paired || state.view !== "chat";
  $("progress-view").hidden = !paired || state.view !== "progress";
  $("tab-chat").setAttribute("aria-selected", String(state.view === "chat"));
  $("tab-progress").setAttribute("aria-selected", String(state.view === "progress"));
  $("api-base").value = state.apiBase;
  $("auto-log").checked = state.autoLog;
}

function switchView(view) {
  state.view = view;
  render();
  if (view === "progress") refreshMemory();
  else $("chat-input").focus();
}

function renderProblem() {
  const p = state.problem;
  const ready = p.kind === "problem" && !!p.meta;
  document.querySelectorAll("[data-needs-problem]").forEach((b) => (b.disabled = !ready || state.sending));
  const title = $("problem-title");
  const status = $("problem-status");
  const difficulty = $("problem-difficulty");
  const tags = $("problem-tags");
  tags.replaceChildren();
  difficulty.hidden = true;
  if (p.kind === "contest") {
    title.textContent = "Contest in progress";
    status.textContent = "CodeQuest Companion is disabled during contests.";
    return;
  }
  if (p.kind !== "problem") {
    title.textContent = "No problem open";
    status.textContent = "Open a LeetCode problem and your tutor will follow along.";
    return;
  }
  if (!p.meta) {
    title.textContent = p.slug.replaceAll("-", " ");
    status.textContent = p.error || "Reading the problem…";
    return;
  }
  title.textContent = p.meta.title;
  if (p.meta.difficulty) {
    difficulty.textContent = p.meta.difficulty;
    difficulty.dataset.difficulty = p.meta.difficulty;
    difficulty.hidden = false;
  }
  status.textContent = p.meta.statement
    ? "Your tutor can see this problem and, if you allow it, your code."
    : "Your tutor can see this problem's title and topics (the statement isn't available).";
  const shown = p.meta.tags.slice(0, 4);
  for (const tag of shown) tags.append(el("span", "tag", tag));
  if (p.meta.tags.length > shown.length) tags.append(el("span", "tag more", `+${p.meta.tags.length - shown.length}`));
  updateHintChip();
}

// ------------------------------------------------------------------ chat rendering

function welcomeMessage(meta) {
  return {
    role: "assistant",
    source: "rules",
    content: `Hi! I'm your CodeQuest tutor for **${meta.title}**. I won't hand you the solution, but I'll help you get there: ask for a hint, describe your approach, or have me review your code.`,
    suggestions: ["hint", "approach", "explain"],
    ts: Date.now(),
  };
}

function renderMessages() {
  const box = $("messages");
  box.replaceChildren();
  const { messages } = state.chat;
  if (state.problem.kind !== "problem") {
    box.append(el("p", "empty", state.problem.kind === "contest"
      ? "Good luck in the contest! Your tutor will be back afterwards."
      : "Open any problem on leetcode.com and I'll follow along."));
    return;
  }
  messages.forEach((m, i) => box.append(renderMessage(m, i === messages.length - 1)));
  if (state.sending) {
    const typing = el("div", "msg assistant typing");
    typing.setAttribute("aria-label", "Tutor is typing");
    typing.append(el("span"), el("span"), el("span"));
    box.append(typing);
  }
  box.scrollTop = box.scrollHeight;
}

function renderMessage(m, isLast) {
  if (m.role === "event") {
    const card = el("div", `event ${m.verdict === "accepted" ? "accepted" : "failed"}`);
    card.append(el("span", `badge ${m.verdict === "accepted" ? "accepted" : "failed"}`, m.statusMsg));
    card.append(el("span", "event-text", m.content));
    if (isLast && m.verdict !== "accepted") card.append(suggestionRow(["review", "hint"]));
    return card;
  }
  if (m.role === "error") {
    const card = el("div", "msg error-msg", m.content);
    if (isLast && m.retry) {
      const retry = el("button", "chip", "Try again");
      retry.type = "button";
      retry.addEventListener("click", () => {
        state.chat.messages.pop();
        sendToTutor(m.retry.mode, m.retry.text, { retry: true });
      });
      card.append(retry);
    }
    return card;
  }
  const bubble = el("div", `msg ${m.role}`);
  if (m.role === "assistant") {
    const meta = el("div", "msg-meta");
    meta.append(el("span", `source ${m.source === "ai" ? "ai" : "rules"}`, m.source === "ai" ? "AI tutor" : "CodeQuest"));
    if (m.refused) meta.append(el("span", "source refused", "won't give answers"));
    bubble.append(meta);
    const body = el("div", "msg-body");
    body.append(renderRich(m.content));
    bubble.append(body);
    if (isLast && Array.isArray(m.suggestions) && m.suggestions.length) bubble.append(suggestionRow(m.suggestions));
  } else {
    bubble.textContent = m.content;
  }
  return bubble;
}

function suggestionRow(modes) {
  const row = el("div", "suggestions");
  for (const mode of modes) {
    if (!SUGGESTION_LABELS[mode]) continue;
    const usedUp = mode === "hint" && state.chat.hintLevel > MAX_HINT_LEVEL;
    const chip = el("button", "chip", usedUp ? "Hints used up" : SUGGESTION_LABELS[mode]);
    chip.type = "button";
    chip.disabled = state.sending || usedUp;
    chip.addEventListener("click", () => runMode(mode));
    row.append(chip);
  }
  return row;
}

function updateHintChip() {
  const next = state.chat.hintLevel;
  $("hint-count").textContent = next > MAX_HINT_LEVEL ? "used up" : `${next}/${MAX_HINT_LEVEL}`;
  const chip = document.querySelector('.chip[data-mode="hint"]');
  if (chip && next > MAX_HINT_LEVEL) chip.disabled = true;
}

// ------------------------------------------------------------------ talking to the tutor

function runMode(mode) {
  const input = $("chat-input");
  if (mode === "approach" && !input.value.trim()) {
    input.value = "My approach: ";
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    autoGrow();
    return;
  }
  if (mode === "approach") {
    const text = input.value.trim().replace(/^my approach:\s*/i, "");
    input.value = "";
    autoGrow();
    if (text) sendToTutor("approach", text);
    return;
  }
  sendToTutor(mode, "");
}

async function sendToTutor(mode, text, { retry = false } = {}) {
  const p = state.problem;
  if (!state.token || state.sending || p.kind !== "problem" || !p.meta) return; // never call the tutor unpaired
  if (mode === "hint" && state.chat.hintLevel > MAX_HINT_LEVEL) return;
  const chat = state.chat;
  const slug = p.slug;
  const hintLevel = Math.min(chat.hintLevel, MAX_HINT_LEVEL);
  const visible = mode === "approach"
    ? `My approach: ${text}`
    : text || (mode === "hint" ? `Give me hint ${hintLevel}` : MODE_LABELS[mode] || "Help");
  if (!retry) chat.messages.push({ role: "user", content: visible, mode, ts: Date.now() });
  const history = historyForApi(chat.messages.slice(0, -1));
  state.sending = true;
  renderProblem();
  renderMessages();
  await saveChat(chat);

  const editor = $("include-code").checked ? await readEditorSafely() : null;
  const body = {
    mode,
    message: text,
    slug,
    title: p.meta.title,
    difficulty: p.meta.difficulty || "",
    tags: p.meta.tags,
    statement: p.meta.statement || "",
    code: editor?.code ?? "",
    language: editor?.language ?? "",
    history,
    hint_level: hintLevel,
  };
  try {
    const reply = await api("/api/ext/chat", body);
    const target = state.chat.slug === slug ? state.chat : await loadChat(slug);
    target.messages.push({
      role: "assistant",
      content: reply.reply,
      source: reply.source,
      refused: reply.refused === true,
      suggestions: (reply.suggestions || []).filter((s) => SUGGESTION_LABELS[s]),
      ts: Date.now(),
    });
    if (mode === "hint" && !reply.refused) target.hintLevel = hintLevel + 1;
    await saveChat(target);
  } catch (err) {
    const target = state.chat.slug === slug ? state.chat : await loadChat(slug);
    target.messages.push({
      role: "error",
      content: err instanceof ApiError ? err.message : "Something went wrong talking to your tutor.",
      retry: err instanceof ApiError && err.status === 429 ? null : { mode, text },
      ts: Date.now(),
    });
    await saveChat(target);
  } finally {
    state.sending = false;
    if (state.chat.slug === slug) {
      renderProblem();
      renderMessages();
    }
  }
}

function autoGrow() {
  const input = $("chat-input");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
}

function onSubmitChat(event) {
  event.preventDefault();
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text || state.sending) return;
  input.value = "";
  autoGrow();
  // "My approach: ..." (pre-filled by the chip) is routed to the approach checker.
  if (/^my approach:/i.test(text)) {
    const plan = text.replace(/^my approach:\s*/i, "");
    if (plan) sendToTutor("approach", plan);
    return;
  }
  sendToTutor("chat", text);
}

async function onClearChat() {
  if (state.sending || state.problem.kind !== "problem" || !state.problem.meta) return;
  state.chat = { slug: state.problem.slug, messages: [welcomeMessage(state.problem.meta)], hintLevel: 1 };
  await saveChat(state.chat);
  renderProblem();
  renderMessages();
}

// ------------------------------------------------------------------ active tab tracking

async function openProblemChat() {
  const p = state.problem;
  if (p.kind !== "problem") {
    state.chat = { slug: null, messages: [], hintLevel: 1 };
    renderMessages();
    return;
  }
  const chat = await loadChat(p.slug);
  if (!chat.messages.length && p.meta) chat.messages.push(welcomeMessage(p.meta));
  state.chat = chat;
  if (chat.messages.length) await saveChat(chat);
  renderProblem();
  renderMessages();
}

async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tabId = tab?.id ?? null;
  const parsed = parseProblemUrl(tab?.url);
  if (parsed.kind === "problem" && state.problem.slug === parsed.slug && state.problem.meta) {
    renderProblem();
    return;
  }
  state.problem = parsed;
  renderProblem();
  await openProblemChat();
  if (parsed.kind !== "problem") return;
  try {
    const meta = await runInPage(pageFetchProblem, [parsed.slug, STATEMENT_LIMIT]);
    if (state.problem.slug !== parsed.slug) return; // the learner moved on meanwhile
    if (meta) state.problem.meta = meta;
    else state.problem.error = "Couldn't read this problem. Reload the LeetCode tab.";
  } catch {
    if (state.problem.slug === parsed.slug) state.problem.error = "Couldn't access the LeetCode tab. Reload it and try again.";
  }
  await openProblemChat();
}

// ------------------------------------------------------------------ progress: memory + submissions

function listOf(items) {
  const ul = el("ul", "memory-list");
  for (const text of items) ul.append(el("li", "", text));
  return ul;
}

async function refreshMemory() {
  const out = $("memory-out");
  if (!state.token) return;
  try {
    const me = await api("/api/ext/me", null, "GET");
    out.replaceChildren();
    out.className = "";
    out.append(el("p", "muted", `${me.user.name} · ${me.solved} CodeQuest missions solved`));
    if (me.recurring.length) {
      out.append(el("p", "error", "Recurring mistakes to watch:"), listOf(me.recurring.map(label)));
    } else {
      out.append(el("p", "ok", "No recurring mistakes right now."));
    }
    if (me.beaten.length) out.append(listOf(me.beaten.map((k) => `Beaten: ${label(k)}`)));
    if (me.next_up.length) out.append(el("p", "muted", `Next CodeQuest mission: ${me.next_up[0].title}. ${me.next_up[0].reason}.`));
    const ai = me.ai || { available: false, enabled: false };
    $("ai-status").textContent = ai.enabled
      ? "AI tutor: on (answers are checked for code before you see them)."
      : ai.available
        ? "AI tutor: off for your account (turn it on in CodeQuest settings). You still get rule-based help."
        : "AI tutor: not configured on this server. You still get rule-based help.";
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
  out.append(el("span", `badge ${record.verdict === "accepted" ? "accepted" : "failed"}`, record.statusMsg), el("span", "", ` on ${record.slug}`));
  let detail;
  if (record.logged) detail = el("p", "ok", `Logged to CodeQuest. ${record.summary}`);
  else if (record.error) {
    detail = el("p", "error", record.error);
    button.hidden = false;
  } else {
    detail = el("p", "muted", record.isPython
      ? "Detected. Not logged yet (Auto-log is off)."
      : "Detected. Only Python code can be analyzed; the verdict can still be logged.");
    button.hidden = false;
  }
  out.append(detail);
}

function eventText(record) {
  if (record.verdict === "accepted") return record.logged ? `Accepted! Logged to CodeQuest. ${record.summary}` : "Accepted! Nicely done.";
  if (record.logged) return `LeetCode said ${record.statusMsg}. ${record.summary} Want me to take a look?`;
  return `LeetCode said ${record.statusMsg}. Want me to review your code, or give you a hint?`;
}

async function announceSubmission(record) {
  if (!record || !record.slug) return;
  const chat = state.chat.slug === record.slug ? state.chat : await loadChat(record.slug);
  const existing = chat.messages.find((m) => m.role === "event" && m.submissionId === record.submissionId);
  if (existing) {
    existing.content = eventText(record); // same submission, now logged: update the card in place
  } else {
    chat.messages.push({
      role: "event",
      submissionId: record.submissionId,
      statusMsg: record.statusMsg,
      verdict: record.verdict,
      content: eventText(record),
      ts: Date.now(),
    });
  }
  await saveChat(chat);
  if (state.chat.slug === record.slug) renderMessages();
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
    await chrome.storage.local.set({ lastSubmission: { ...record, error: err instanceof ApiError ? err.message : "Logging failed." } });
  } finally {
    setBusy(button, false, "Log this submission");
  }
}

async function onManualSync() {
  const out = $("sync-out");
  const button = $("sync-btn");
  const p = state.problem;
  if (p.kind !== "problem" || !p.meta) return;
  const editor = await readEditorSafely();
  if (!editor) {
    setText(out, "Couldn't read the code editor. Make sure the problem's code editor is visible.", "error");
    return;
  }
  setBusy(button, true, "Logging…");
  try {
    const data = await api("/api/ext/sync", {
      slug: p.slug,
      tags: p.meta.tags,
      verdict: $("verdict").value,
      code: String(editor.language).toLowerCase().startsWith("python") ? editor.code : "",
    });
    setText(out, `Logged. ${describeSync(data)}`, data.newly_recurring?.length ? "error" : "ok");
    await refreshMemory();
  } catch (err) {
    setText(out, err instanceof ApiError ? err.message : "Logging failed.", "error");
  } finally {
    setBusy(button, false, "Log attempt");
  }
}

// ------------------------------------------------------------------ pairing + settings

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
  state.view = "chat";
  render();
  // Pairing succeeded; problems loading the tab or memory are reported by those views, not as a pairing failure.
  await Promise.allSettled([refreshActiveTab(), refreshMemory()]);
}

async function onSaveSettings() {
  const status = $("settings-status");
  let url;
  try {
    url = new URL($("api-base").value.trim().replace(/\/+$/, ""));
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
  const base = url.origin;
  await saveSettings({ apiBase: base, token: base === state.apiBase ? state.token : null });
  status.textContent = "Saved.";
  render();
}

// ------------------------------------------------------------------ wiring

function showPanelError(message) {
  const bar = $("panel-error");
  bar.textContent = `Something went wrong: ${message}. Reload the extension, and if it persists, report this message.`;
  bar.hidden = false;
}

async function init() {
  await loadSettings();
  render();
  $("settings-toggle").addEventListener("click", () => {
    const panel = $("settings");
    panel.hidden = !panel.hidden;
    $("settings-toggle").setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) refreshMemory();
  });
  $("save-settings").addEventListener("click", onSaveSettings);
  $("disconnect").addEventListener("click", async () => {
    await saveSettings({ token: null });
    render();
  });
  $("pair-form").addEventListener("submit", onPair);
  $("pair-btn").disabled = false; // the handler is attached: safe to submit now
  $("tab-chat").addEventListener("click", () => switchView("chat"));
  $("tab-progress").addEventListener("click", () => switchView("progress"));
  $("chat-form").addEventListener("submit", onSubmitChat);
  $("chat-input").addEventListener("input", autoGrow);
  $("chat-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      $("chat-form").requestSubmit();
    }
  });
  document.querySelectorAll(".chip[data-mode]").forEach((chip) =>
    chip.addEventListener("click", () => runMode(chip.dataset.mode)));
  $("clear-chat").addEventListener("click", onClearChat);
  $("log-last-btn").addEventListener("click", onLogLast);
  $("sync-btn").addEventListener("click", onManualSync);
  $("auto-log").addEventListener("change", (event) => saveSettings({ autoLog: event.target.checked }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.lastSubmission) {
      const record = changes.lastSubmission.newValue;
      renderLastSubmission(record);
      announceSubmission(record);
      if (record?.logged) refreshMemory();
    }
    if (changes.token && !changes.token.newValue && state.token) {
      state.token = null;
      render();
    }
  });
  const { lastSubmission } = await chrome.storage.local.get("lastSubmission");
  renderLastSubmission(lastSubmission);
  chrome.tabs.onActivated.addListener(() => refreshActiveTab());
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (tabId === state.tabId && info.url) refreshActiveTab();
  });
  await Promise.allSettled([refreshActiveTab(), refreshMemory()]);
}

window.addEventListener("error", (event) => showPanelError(event.message || "script error"));
window.addEventListener("unhandledrejection", (event) => showPanelError(event.reason?.message ?? String(event.reason)));

init().catch((error) => showPanelError(error?.message ?? String(error)));
