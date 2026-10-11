// Runs in the LeetCode page's MAIN world at document_start, before page scripts capture `fetch`.
// It observes the judge's result endpoint and reports the FINAL verdict of a real submission.
// It never modifies requests or responses, and any failure is swallowed so the page is unaffected.
(() => {
  if (window.__codequestCompanionHook) return;
  window.__codequestCompanionHook = true;

  const SOURCE = "codequest-companion";
  // Real submissions have numeric ids; "Run" (interpret) checks use ids like "runcode_…".
  const CHECK_PATH = /^\/submissions\/detail\/(\d+)\/check\/?$/;
  const NON_CODE = new Set(["plaintext", "json", "markdown"]);
  const reported = new Set();
  const nativeFetch = window.fetch;

  function readEditor() {
    const api = window.monaco && window.monaco.editor;
    if (!api) return null;
    const usable = (m) => m && !m.isDisposed() && m.getValue().trim().length > 0 && !NON_CODE.has(m.getLanguageId());
    const fromEditors = (api.getEditors ? api.getEditors() : []).map((e) => e.getModel()).filter(usable);
    const candidates = fromEditors.length ? fromEditors : (api.getModels ? api.getModels() : []).filter(usable);
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.getValueLength() - a.getValueLength());
    return candidates[0].getValue();
  }

  async function fetchTags(slug) {
    try {
      const query = "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { topicTags { slug } } }";
      const res = await nativeFetch.call(window, "/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ query, variables: { titleSlug: slug } }),
      });
      const json = await res.json();
      return ((json && json.data && json.data.question && json.data.question.topicTags) || []).map((t) => t.slug);
    } catch {
      return [];
    }
  }

  async function inspect(response) {
    let url;
    try {
      url = new URL(response.url, location.origin);
    } catch {
      return;
    }
    const match = url.origin === location.origin && url.pathname.match(CHECK_PATH);
    if (!match) return;
    const submissionId = match[1];
    if (reported.has(submissionId)) return;
    const body = await response.clone().json();
    if (!body || body.state !== "SUCCESS" || typeof body.status_msg !== "string") return; // still judging
    reported.add(submissionId);
    const slugMatch = location.pathname.match(/^\/problems\/([a-z0-9-]+)/);
    if (!slugMatch) return;
    const lang = String(body.lang || body.pretty_lang || "");
    const isPython = lang.toLowerCase().startsWith("python");
    window.postMessage(
      {
        source: SOURCE,
        type: "submission",
        payload: {
          submissionId,
          slug: slugMatch[1],
          statusMsg: body.status_msg,
          lang,
          code: isPython ? readEditor() || "" : "",
          tags: await fetchTags(slugMatch[1]),
        },
      },
      location.origin,
    );
  }

  window.fetch = function codequestObservedFetch(...args) {
    const pending = nativeFetch.apply(this, args);
    pending.then((response) => inspect(response).catch(() => {})).catch(() => {});
    return pending;
  };
})();
