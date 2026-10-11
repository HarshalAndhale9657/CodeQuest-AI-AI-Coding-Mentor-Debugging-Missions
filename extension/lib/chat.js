// Pure chat helpers shared by the side panel and the test harness. No chrome.* usage.

/** What each quick action sends as the learner's visible message. */
export const MODE_LABELS = {
  hint: "Give me a hint",
  approach: "Check my approach",
  review: "Review my code",
  explain: "Explain the problem",
  edge_cases: "What edge cases should I test?",
  complexity: "What's the complexity of my approach?",
  chat: "Ask",
};

/** Short labels for suggestion chips under a reply. */
export const SUGGESTION_LABELS = {
  hint: "Next hint",
  approach: "Check my approach",
  review: "Review my code",
  explain: "Explain the problem",
  edge_cases: "Edge cases",
  complexity: "Complexity",
};

export const MAX_STORED_MESSAGES = 60;
export const HISTORY_TURNS = 8;
export const MAX_HINT_LEVEL = 3;

/** The last turns the tutor needs for context: only learner/tutor text, never local event cards. */
export function historyForApi(messages) {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

export function trimStored(messages) {
  return messages.length > MAX_STORED_MESSAGES ? messages.slice(-MAX_STORED_MESSAGES) : messages;
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;

function appendInline(parent, text, doc) {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) parent.append(doc.createTextNode(text.slice(last, match.index)));
    const token = match[0];
    const el = doc.createElement(token.startsWith("`") ? "code" : "strong");
    el.textContent = token.startsWith("`") ? token.slice(1, -1) : token.slice(2, -2);
    parent.append(el);
    last = match.index + token.length;
  }
  if (last < text.length) parent.append(doc.createTextNode(text.slice(last)));
}

/**
 * Render tutor text as safe DOM: paragraphs, bullet/numbered lists, `code` and **bold**.
 * Built with DOM nodes only (never innerHTML), so model or server text cannot inject markup.
 */
export function renderRich(text, doc = document) {
  const fragment = doc.createDocumentFragment();
  const blocks = String(text).replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const bullet = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
    if (bullet || numbered) {
      const list = doc.createElement(numbered ? "ol" : "ul");
      for (const line of lines) {
        const li = doc.createElement("li");
        appendInline(li, line.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), doc);
        list.append(li);
      }
      fragment.append(list);
    } else {
      const p = doc.createElement("p");
      lines.forEach((line, i) => {
        if (i) p.append(doc.createElement("br"));
        appendInline(p, line, doc);
      });
      fragment.append(p);
    }
  }
  return fragment;
}
