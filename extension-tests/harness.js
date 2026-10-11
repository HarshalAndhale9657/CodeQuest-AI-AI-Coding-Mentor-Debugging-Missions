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

const store = {};
window.chrome = {
  storage: {
    local: {
      async get(keys) {
        return Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]));
      },
      async set(patch) {
        Object.assign(store, structuredClone(patch));
      },
    },
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
