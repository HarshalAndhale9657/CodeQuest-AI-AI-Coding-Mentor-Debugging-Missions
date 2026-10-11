// End-to-end test of the automatic submission pipeline:
//   page hook (real file) -> shared validator (real file) -> service worker (real file) -> CodeQuest API.
// Open http://localhost:5600/problems/two-sum/?token=<extension token>&api=http://localhost:8000
import { parseSubmission } from "/ext/lib/submission.js";

const params = new URLSearchParams(location.search);
const TOKEN = params.get("token");
const API = params.get("api") || "http://localhost:8000";
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail: String(detail) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- a fake Monaco holding the learner's (buggy) Python solution
const CODE = "class Solution:\n    def total(self, nums):\n        s = 0\n        for i in range(len(nums) - 1):\n            s += nums[i]\n        return s\n";
const model = { isDisposed: () => false, getValue: () => CODE, getValueLength: () => CODE.length, getLanguageId: () => "python" };
const testcases = { isDisposed: () => false, getValue: () => "[1,2,3]\n6\n".repeat(20), getValueLength: () => 240, getLanguageId: () => "plaintext" };
window.monaco = { editor: { getEditors: () => [{ getModel: () => model }], getModels: () => [testcases, model] } };

const messages = [];
window.addEventListener("message", (e) => {
  if (e.source === window && e.data?.source === "codequest-companion") messages.push(e.data);
});

async function poll(id, times) {
  for (let i = 0; i < times; i += 1) await (await fetch(`/submissions/detail/${id}/check/`)).json();
}

async function hookTests() {
  check("hook installed", window.__codequestCompanionHook === true);
  await poll("runcode_42", 2); // "Run" results must be ignored
  await poll("777", 2); // PENDING, then Wrong Answer
  await poll("778", 2); // PENDING, then Accepted
  await poll("777", 1); // repeated poll after SUCCESS must not report twice
  await wait(500);
  const ids = messages.map((m) => m.payload.submissionId);
  check("only real submissions reported, once each", JSON.stringify(ids) === JSON.stringify(["777", "778"]), ids);
  const wa = messages.find((m) => m.payload.submissionId === "777");
  check("verdict captured", wa?.payload.statusMsg === "Wrong Answer", wa?.payload.statusMsg);
  check("solution editor read (not test cases)", wa?.payload.code === CODE);
  check("tags fetched", JSON.stringify(wa?.payload.tags) === '["array","hash-table"]', wa?.payload.tags);
  check("page still gets the response", (await (await fetch("/submissions/detail/999/check/")).json()).state === "PENDING");
  return { wa, ac: messages.find((m) => m.payload.submissionId === "778") };
}

function validatorTests(wa) {
  const parsed = parseSubmission(wa);
  check("validator accepts real message", parsed?.verdict === "wrong_answer" && parsed.isPython, JSON.stringify(parsed));
  check("validator rejects foreign source", parseSubmission({ ...wa, source: "evil" }) === null);
  check("validator rejects bad slug", parseSubmission({ ...wa, payload: { ...wa.payload, slug: "../x" } }) === null);
  check("validator rejects bad id", parseSubmission({ ...wa, payload: { ...wa.payload, submissionId: "runcode_1" } }) === null);
  const java = parseSubmission({ ...wa, payload: { ...wa.payload, lang: "java", code: "class X {}" } });
  check("non-python code is never sent", java?.code === "" && java.isPython === false);
}

async function backgroundTests(wa, ac) {
  const local = { apiBase: API, token: TOKEN, autoLog: true };
  const session = {};
  const listeners = {};
  const area = (store) => ({
    async get(keys) {
      const list = typeof keys === "string" ? [keys] : keys;
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]));
    },
    async set(patch) {
      Object.assign(store, structuredClone(patch));
    },
  });
  window.chrome = {
    storage: { local: area(local), session: area(session) },
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener: (fn) => (listeners.message = fn) },
    },
    sidePanel: { setPanelBehavior: async () => {} },
  };
  await import("/ext/background.js");
  const send = async (data, url = "https://leetcode.com/problems/two-sum/description/") => {
    listeners.message({ type: "cq-submission", data }, { tab: { url } });
    await wait(1500);
  };

  await send(wa);
  check("auto-log syncs to CodeQuest", local.lastSubmission?.logged === true, JSON.stringify(local.lastSubmission));
  check("mistake detected from the submission", /off by one/.test(local.lastSubmission?.summary ?? ""), local.lastSubmission?.summary);

  const firstAt = local.lastSubmission.at;
  await send(wa);
  check("duplicate submission ignored", local.lastSubmission.at === firstAt);

  await send({ ...wa, payload: { ...wa.payload, submissionId: "900" } }, "https://leetcode.com/contest/weekly-1/problems/two-sum/");
  check("contest pages ignored", local.lastSubmission.submissionId === "777");

  local.autoLog = false;
  await send(ac);
  check("auto-log off: detected but not sent", local.lastSubmission.submissionId === "778" && local.lastSubmission.logged === false,
    JSON.stringify(local.lastSubmission));
  check("code kept only in session storage", session.pendingCode?.submissionId === "778" && !("code" in local.lastSubmission));
}

try {
  const { wa, ac } = await hookTests();
  validatorTests(wa);
  if (TOKEN) await backgroundTests(wa, ac);
  else check("background tests need ?token=", false);
} catch (error) {
  check("unexpected exception", false, error?.stack ?? error);
}
window.__results = results;
const failed = results.filter((r) => !r.ok);
document.getElementById("out").textContent =
  `${results.length - failed.length}/${results.length} passed\n\n` +
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `  ->  ${r.detail}`}`).join("\n");
