// Stub of the chrome.* APIs the side panel uses, so the real panel (markup, CSS, JS) runs in a normal page.
//   ?scenario=python|java|contest   initial tab
//   ?autotest=1&code=<pairing code> run the automated panel test suite (panel-tests.js) after loading
const params = new URLSearchParams(location.search);
const scenario = params.get("scenario") || "python";

const PROBLEMS = {
  "two-sum": {
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["array", "hash-table"],
    statement:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up " +
      "to target. You may assume that each input would have exactly one solution, and you may not use the same element " +
      "twice.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n\nConstraints:\n2 <= nums.length <= 10^4",
  },
  "valid-parentheses": {
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["string", "stack"],
    statement: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
  },
};
const EDITORS = {
  python: {
    language: "python",
    code: [
      "class Solution:",
      "    def twoSum(self, nums: List[int], target: int) -> List[int]:",
      "        for i in range(len(nums) - 1):",
      "            for j in range(i + 1, len(nums)):",
      "                if nums[i] + nums[j] == target:",
      "                    return [i, j]",
    ].join("\n"),
  },
  java: { language: "java", code: "class Solution {\n}" },
};
const URLS = {
  python: "https://leetcode.com/problems/two-sum/description/",
  java: "https://leetcode.com/problems/two-sum/description/",
  contest: "https://leetcode.com/contest/weekly-contest-400/problems/two-sum/",
};

const changeListeners = [];
const tabListeners = [];
function area(name, store) {
  return {
    async get(keys) {
      const list = typeof keys === "string" ? [keys] : keys;
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]));
    },
    async set(patch) {
      const changes = {};
      for (const [k, v] of Object.entries(patch)) changes[k] = { oldValue: store[k], newValue: structuredClone(v) };
      Object.assign(store, structuredClone(patch));
      changeListeners.forEach((fn) => fn(changes, name));
    },
  };
}
const localStore = {};
const sessionStore = {};
if (params.get("api")) localStore.apiBase = params.get("api"); // e.g. an AI-off test server on another port
const page = { url: URLS[scenario], editor: EDITORS[scenario] ?? null, failNextFetch: false };

// Test controls: simulate the service worker, tab switches and editor changes.
window.__harness = {
  local: area("local", localStore),
  session: area("session", sessionStore),
  localStore,
  sessionStore,
  page,
  switchTab(url) {
    page.url = url;
    tabListeners.forEach((fn) => fn({ tabId: 1 }));
  },
};
window.chrome = {
  storage: {
    local: window.__harness.local,
    session: window.__harness.session,
    onChanged: { addListener: (fn) => changeListeners.push(fn) },
  },
  tabs: {
    async query() {
      return [{ id: 1, url: page.url }];
    },
    onActivated: { addListener: (fn) => tabListeners.push(fn) },
    onUpdated: { addListener() {} },
  },
  scripting: {
    async executeScript({ func, args }) {
      if (func.name === "pageFetchProblem") return [{ result: PROBLEMS[args[0]] ?? null }];
      if (func.name === "pageReadEditor") return [{ result: page.editor }];
      throw new Error(`unexpected page function ${func.name}`);
    },
  },
  permissions: {
    async request() {
      return true;
    },
  },
};

const html = await (await fetch("../extension/sidepanel.html")).text();
const doc = new DOMParser().parseFromString(html, "text/html");
doc.querySelectorAll("script").forEach((s) => s.remove());
document.body.replaceChildren(...doc.body.childNodes);
await import("../extension/sidepanel.js");
if (params.get("autotest")) await import("./panel-tests.js");
