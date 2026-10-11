// Stub of the chrome.* APIs the side panel uses. Scenario is chosen with ?scenario=python|java|contest.
const params = new URLSearchParams(location.search);
const scenario = params.get("scenario") || "python";

const PROBLEM = { title: "Two Sum", difficulty: "Easy", tags: ["array", "hash-table"] };
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
// Lets a test simulate the service worker recording a detected LeetCode submission.
window.__harness = { local: area("local", localStore), session: area("session", sessionStore), localStore };
window.chrome = {
  storage: {
    local: window.__harness.local,
    session: window.__harness.session,
    onChanged: { addListener: (fn) => changeListeners.push(fn) },
  },
  tabs: {
    async query() {
      return [{ id: 1, url: URLS[scenario] }];
    },
    onActivated: { addListener() {} },
    onUpdated: { addListener() {} },
  },
  scripting: {
    async executeScript({ func }) {
      if (func.name === "pageFetchProblem") return [{ result: PROBLEM }];
      if (func.name === "pageReadEditor") return [{ result: EDITORS[scenario] ?? null }];
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
