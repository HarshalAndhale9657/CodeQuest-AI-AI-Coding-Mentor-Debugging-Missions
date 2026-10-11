# Cross-platform learner data, a LeetCode companion extension, and unified coding portfolios (state as of 2026-10-11)

How to read these notes:
- "Live test 2026-10-11" means the researcher called the endpoint directly from a client in India (Cloudflare edge `BOM`) on 2026-10-11 with `curl`. These are first-hand observations from one network on one day, not guarantees. LeetCode in particular changes its endpoints and UI often, so treat every LeetCode claim as perishable.
- "Code inspection 2026-10-11" means the researcher downloaded the extension's current source from GitHub `main` and grepped it.
- Each finding is tagged **OFFICIAL** (documented, supported API), **SEMI-OFFICIAL** (a third party that explicitly offers an API, e.g. AtCoder Problems), or **UNOFFICIAL** (internal, undocumented, or scraped), with a ToS-risk note where relevant.

---

## Q1. LeetCode's unofficial GraphQL endpoint: what works without login, what needs cookies, CORS, rate limits and Cloudflare, leetcode.cn, wrappers, and the ToS

### Takeaway
As of 2026-10-11, `https://leetcode.com/graphql` (**UNOFFICIAL**) still answers anonymous POSTs with no cookies or headers. Public profile stats, per-tag solved counts, languages, contest rating, the activity calendar, recent submissions (including non-Accepted verdicts) and full problem metadata (statement, hints, tags, example tests) all come back. Submission code and per-problem submission history need the user's `LEETCODE_SESSION`. The endpoint sends no CORS headers, so a website has to go through a server-side proxy; an extension can call it from the leetcode.com page context. Legally it sits in a grey zone. LeetCode's ToS forbids "crawling, scraping, or spidering" and reverse engineering, `robots.txt` disallows `/graphql` and `/problems/*/submit`, and LeetCode's contest rules ban external AI help during contests.

### Cited Findings

**What works anonymously (live test 2026-10-11, no cookies)**
- A single anonymous POST returned HTTP 200 with populated data for `matchedUser { profile{ranking} submitStatsGlobal{acSubmissionNum{difficulty count}} tagProblemCounts{advanced intermediate fundamental} languageProblemCount userCalendar{streak totalActiveDays} }`, `userContestRanking { rating attendedContestsCount globalRanking }` and `recentAcSubmissionList(limit)`. For user `lee215` it returned 686 accepted (126 Easy / 411 Medium / 149 Hard), contest rating 2204.316 over 27 contests, and per-language counts (e.g., Python 445, Java 237, C++ 151) — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- The response headers included `Server: cloudflare`, `cf-cache-status: DYNAMIC`, `x-frame-options: SAMEORIGIN`, and a `Set-Cookie: csrftoken=...; Max-Age=31449600; SameSite=Lax; Secure` (anonymous visitors are issued a csrftoken) — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- `tagProblemCounts` returns per-tag solved counts already grouped into three tiers: `fundamental`, `intermediate`, `advanced`. The advanced tier included Dynamic Programming, Backtracking, Union-Find, Trie, Segment Tree, Binary Indexed Tree, Monotonic Stack/Queue, Topological Sort, Rolling Hash, Suffix Array, Game Theory, Bitmask, Quickselect, Sweep Line, Data Stream and Divide and Conquer. Each entry has `tagName`, `tagSlug` and `problemsSolved` — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- The field name `skillStats` is **not valid** today. The server replied `Cannot query field "skillStats" on type "UserNode". Did you mean "submitStats"?`. Per-tag stats come from `tagProblemCounts` instead — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- The "profile calendar" data comes from `matchedUser { userCalendar(year: 2026) { activeYears streak totalActiveDays submissionCalendar } }`, and it works anonymously. `submissionCalendar` is a JSON string mapping unix-day to count, and `activeYears` listed 2014 and 2016–2026 for lee215 — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- `recentSubmissionList(username, limit: 20)` works anonymously and **includes non-Accepted verdicts**. The 20 rows came back as 17 "Accepted" and 3 "Compile Error", each with title, titleSlug, statusDisplay, lang and timestamp. No code is returned — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- `question(titleSlug: "two-sum")` works anonymously and returns `questionId`, `questionFrontendId`, `title`, `difficulty`, `isPaidOnly`, `topicTags{name slug}`, `hints` (3 hint strings for Two Sum), `exampleTestcases`, `sampleTestCase`, `codeSnippets` (per-language starter code), `similarQuestions` (a JSON string), `stats` (a JSON string, e.g. totalAccepted 23.8M / totalSubmission 41M) and `content` (HTML statement) — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- `questionTopicTags` returns the full LeetCode topic-tag vocabulary: **75 tags** on 2026-10-11 — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- A request with **no Referer, no Origin and no cookies** also returned HTTP 200, so no CSRF header was needed for these read queries — [live test, LeetCode GraphQL](https://leetcode.com/graphql)

**What needs login (live test 2026-10-11 and wrapper docs)**
- Anonymous `submissionDetails(submissionId)` returned `{"data":{"submissionDetails":null}}`, and anonymous `questionSubmissionList(questionSlug)` returned `submissions: null`. Reading submitted code or a user's per-problem history therefore needs the user's session cookie — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- The `leetcode-query` README lists the anonymous features as profile, recent submissions (max 20), contest records, problem list, problem detail and daily challenge. "All submissions of the authenticated user" and "submission details" need a `Credential` initialised with the session cookie — [JacobLinCool/LeetCode-Query](https://github.com/JacobLinCool/LeetCode-Query)

**CORS (live test 2026-10-11)**
- A CORS preflight (`OPTIONS` with `Origin: https://example.com`) returned **HTTP 405 with no `Access-Control-Allow-*` headers**. A browser page on our own domain therefore cannot call LeetCode GraphQL directly; it needs a server-side proxy, or an extension with access to the leetcode.com page — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- A Render-hosted proxy (alfa-leetcode-api) reached LeetCode fine on 2026-10-11: `/lee215/solved` returned HTTP 200 in about 1.05 s. So at least one cloud provider's IPs were not being blocked that day — [live test, alfa-leetcode-api hosted instance](https://alfa-leetcode-api.onrender.com/)

**Rate limiting and Cloudflare**
- 40 sequential anonymous requests (about 2 requests/s over 20 s) all returned HTTP 200, with no throttling observed at that rate. LeetCode publishes no rate limit — [live test, LeetCode GraphQL](https://leetcode.com/graphql)
- leetcode.com HTML pages are behind a Cloudflare challenge for non-browser clients. `curl https://leetcode.com/terms/` returned **HTTP 403 "Just a moment..."**, and WebFetch also got a 403 — [live test, leetcode.com/terms](https://leetcode.com/terms/)
- The wrapper ecosystem has its own limits. alfa-leetcode-api's hosted instance uses `express-rate-limit` with `windowMs: 60*60*1000, limit: 120` (120 requests/hour per client), and the live response headers confirmed `ratelimit-policy: 120;w=3600` — [alfa-leetcode-api src/app.ts](https://github.com/alfaarghya/alfa-leetcode-api/blob/main/src/app.ts); [live test](https://alfa-leetcode-api.onrender.com/)
- alfa-leetcode-api issues "API returns 429" (#92) and "API showing rate limit reached" (#57) were both closed on Apr 14, 2026 — [alfa-leetcode-api issues search](https://github.com/alfaarghya/alfa-leetcode-api/issues?q=is%3Aissue+403+OR+cloudflare+OR+%22rate+limit%22+OR+429)
- `leetcode-query` ships a client-side limiter: "Customable Rate Limiter. (Default: 20 req / 10 sec)" — [JacobLinCool/LeetCode-Query](https://github.com/JacobLinCool/LeetCode-Query)

**leetcode.cn differences**
- From the same client on 2026-10-11, both `https://leetcode.cn/graphql/` and `https://leetcode.cn/graphql/noj-go/` returned a **Cloudflare "Just a moment..." challenge page** instead of JSON. leetcode.cn is much harder to call server-side than leetcode.com — [live test, leetcode.cn GraphQL](https://leetcode.cn/graphql/)
- The schema differs too. LeetHub-3.0 sends a different submission query for CN (`submissionDetail(submissionId: ID!)`, singular) than for .com (`submissionDetails(submissionId: Int!)`), and reads `res.data.submissionDetail` vs `res.data.submissionDetails` — [LeetHub-3.0 src/js/leetcode.js, code inspection 2026-10-11](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/src/js/leetcode.js)
- `leetcode-query` exposes a separate `LeetCodeCN` class. Its README says that fetching all of a user's submissions without authentication is available only on the CN endpoint — [JacobLinCool/LeetCode-Query](https://github.com/JacobLinCool/LeetCode-Query)

**Community wrappers: maintenance status (2026-10-11)**
- **alfa-leetcode-api** (Express/TypeScript REST wrapper): 833 stars, 332 forks, last push 2026-08-02, not archived. Docker image `alfaarghya/alfa-leetcode-api:2.0.4`, hosted at `alfa-leetcode-api.onrender.com`. Endpoints include `/:username`, `/profile`, `/badges`, `/solved`, `/contest`, `/contest/history`, `/submission`, `/acSubmission`, `/calendar`, `/skill`, `/language`, `/progress`, `/daily`, `/select?titleSlug=`, `/problems`, `/tags`, `/officialSolution` and discussion routes — [GitHub API repo metadata](https://api.github.com/repos/alfaarghya/alfa-leetcode-api); [README](https://github.com/alfaarghya/alfa-leetcode-api)
- **leetcode-query** (npm, TypeScript): 130 stars, repo pushed 2026-10-10. The latest npm version is **2.0.1, published 2025-07-11**, with 1,902 downloads in the week 2026-10-03..09 — [GitHub API](https://api.github.com/repos/JacobLinCool/LeetCode-Query); [npm registry](https://registry.npmjs.org/leetcode-query); [npm downloads API](https://api.npmjs.org/downloads/point/last-week/leetcode-query)
- **leetcode-stats-api** (JeremyTsaii, Heroku): 382 stars, but the last push was 2024-03-13. Treat it as stale — [GitHub API](https://api.github.com/repos/JeremyTsaii/leetcode-stats-api)

**ToS, robots.txt and contest rules**
- The LeetCode Terms of Service ("Last modified: 04/05/2024", archived snapshot 2026-09-15) say: "Activities such as 'crawling,' 'scraping,' or 'spidering' any part of the Service, and attempting to decompile, reverse engineer, or discover the source code or underlying ideas of the Service, are strictly forbidden." — [LeetCode ToS, Wayback snapshot 2026-09-15](http://web.archive.org/web/20260915150045/https://leetcode.com/terms/)
- The same ToS says: "You agree that all Content is our sole and exclusive property, which includes all software, images, questions, solutions, or any material associated with the Service platform". User-submitted content is licensed to LeetCode "worldwide, non-exclusive, royalty-free, perpetual, and irrevocable". LeetCode "may deny you access ... or terminate your account with or without prior notice" for ToS violations — [LeetCode ToS snapshot](http://web.archive.org/web/20260915150045/https://leetcode.com/terms/)
- leetcode.com `robots.txt` (fetched 2026-10-11) disallows `/graphql`, `/api/`, `/submissions`, `/problems/*/submit`, `/problems/*/interpret_solution`, `/contest/*/problems`, `/accounts`, `/session`, `/progress` and others — [leetcode.com/robots.txt](https://leetcode.com/robots.txt)
- LeetCode's contest rules ("New Contest Rule (Updated in Sep 2024)") prohibit code-generation tools and external help during contests, and count entering problem statements, test cases or code into external assistance tools as a violation. A first violation brings a score reset and a 1-month contest and discussion ban; a second brings permanent deactivation. This is per the search-result summary; the page itself could not be fetched because of Cloudflare — [LeetCode Discuss: New Contest Rule](https://leetcode.com/discuss/general-discussion/951105/New-Contest-Rule-)
- A later LeetCode announcement says similar-code detection plus manual review is used, and that penalties apply without warning — [LeetCode Discuss: Maintaining Fairness in LeetCode Contests](https://leetcode.com/discuss/post/5232896/important-announcement-maintaining-fairn-mx94/). A third-party blog (Sept 2026) claims LeetCode added "Code Replay" in May 2025 to tell typed solutions from pasted ones. This is unconfirmed by LeetCode — [trycontrol.app](https://trycontrol.app/blog/does-leetcode-detect-cheating)

### Inferences
- For a portfolio, **server-side anonymous reads of a user's public stats** (solved by difficulty, tagProblemCounts, contest rating, calendar, recentSubmissionList verdict mix) are technically easy today. They are still "scraping" under LeetCode's ToS and against `robots.txt`. Risk is lowest when the call is low-volume, cached for 12–24 h, made only for handles a user has claimed, and never used to copy problem statements.
- `recentSubmissionList` is the only anonymous source of **failure signals** (Wrong Answer, TLE, Compile Error, and so on). It covers only the last ~20 submissions and has no code, so it can give a coarse "verdict mix" but cannot detect recurring mistakes.
- LeetCode problem `content` and `hints` are copyrighted Content under the ToS. CodeQuest should **link** to LeetCode problems and store only slug, tags and difficulty, never statements or hints, in its own DB.
- The extension must hard-disable all hint and feedback features on `leetcode.com/contest/*` pages, or it would be a contest-rule violation tool.
- Field-name drift (`skillStats` no longer exists) shows that any hard-coded query can break silently. Wrappers should validate responses and fail soft into "demo mode" cached data.

### Gaps
- LeetCode's actual server-side rate limit and Cloudflare thresholds (e.g., at what request rate a 429 or Cloudflare 1015 appears) are undocumented. Only a 2 req/s × 40 burst was tested, from one Indian IP, and Vercel, Railway and other cloud IPs were not tested.
- Whether `question.content` is null for `isPaidOnly` problems when called anonymously was not tested.
- LeetCode's contest-rule page text was read only via a search summary, because Cloudflare blocked direct fetching.
- No LeetCode statement was found on whether browser extensions that read the user's own page are allowed or banned. The ToS has no extension-specific clause.

---

## Q2. The LeetCode extension landscape: how LeetHub-family extensions detect verdicts and read code, existing AI-hint extensions, Chrome Web Store policy, MV3 service-worker limits, Edge/Firefox, and fragility

### Takeaway
Auto-capturing an Accepted submission plus its code is proven but fragile. The two maintained LeetHub forks (v2 with 70,000 users, 3.0 with 10,000 users) use different tricks. LeetHub-3.0 monkey-patches `window.fetch` in the page ("MAIN" world) to catch the `/problems/<slug>/submit/` response. LeetHub v2 watches the SPA URL change to `/submissions/<id>`. Both then confirm the verdict via a DOM `data-e2e-locator="submission-result"` element and fetch code via GraphQL `submissionDetails` using the user's own cookies. Neither reads Monaco. Reading the editor *before* submission needs a MAIN-world script calling `window.monaco.editor.getModels()`/`getEditors()`. AI-hint/mentor LeetCode extensions are numerous but tiny: the largest found has about 2,000 users, against 70,000 for sync tools. MV3 constraints that matter: no remote code, a 30 s idle service-worker kill, a 30 s fetch limit, and Limited Use data rules.

### Cited Findings

**Repos and store listings (2026-10-11)**
- **LeetHub (original, QasimWani)**: 4,358 stars, 1,492 forks, 416 open issues+PRs, last push 2026-06-22 — [GitHub API](https://api.github.com/repos/QasimWani/LeetHub). Its Chrome Web Store ID `aciombdipochlnkbpcbgdpjffcfdbggi` returned only a generic "Chrome Web Store" page with no listing data, so the listing appears unavailable (reason unknown) — [CWS URL, live check](https://chromewebstore.google.com/detail/aciombdipochlnkbpcbgdpjffcfdbggi)
- **LeetHub v2 (arunbhardwaj/LeetHub-2.0)**: CWS shows **70,000 users**, version 2.0.10, **updated October 8, 2026**, rated 3.2/5. The repo has 804 stars, 242 open issues+PRs, last push 2026-10-08 — [CWS listing](https://chromewebstore.google.com/detail/mhanfgfagplhgemhjfeolkkdidbakocm); [GitHub API](https://api.github.com/repos/arunbhardwaj/LeetHub-2.0)
- **LeetHub-3.0 (raphaelheinz)**: CWS shows **10,000 users**, updated March 2, 2026, rated 4.3/5. The manifest version is 0.0.16; the repo has 304 stars, 52 open issues+PRs, last push 2026-03-02 — [CWS listing](https://chromewebstore.google.com/detail/kdkgpjpenaeoodajljkflmlnkoihkmda); [manifest.json](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/manifest.json); [GitHub API](https://api.github.com/repos/raphaelheinz/LeetHub-3.0)
- The LeetHub-3.0 README calls itself a fork of LeetHub-2.0, which it says "is not compatible with Leetcode anymore since the latest updates". It tells users to wait about 4 seconds (until the spinner stops) after submitting, lists "known issues" with the "non-dynamic layout", warns that uploads can fail "if you update the text in the editor too fast", and offers a manual sync button as a fallback — [LeetHub-3.0 README](https://github.com/raphaelheinz/LeetHub-3.0). *Conflict:* LeetHub v2 shipped a new store version on Oct 8, 2026, so the "not compatible" claim in the 3.0 README looks stale — [LeetHub v2 CWS](https://chromewebstore.google.com/detail/mhanfgfagplhgemhjfeolkkdidbakocm)

**How they detect an accepted submission and get the code (code inspection 2026-10-11)**
- **LeetHub-3.0** registers `src/js/interceptor.js` as a content script with `"run_at": "document_start"` and `"world": "MAIN"` on `https://leetcode.com/*` and `https://leetcode.cn/*`. Its only permissions are `storage` and `unlimitedStorage`, plus an MV3 `service_worker` — [manifest.json](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/manifest.json)
- The interceptor replaces `window.fetch`. For any URL containing `/problems/` and `/submit/` it clones the response, reads `data.submission_id`, and dispatches `CustomEvent('leetHubSubmissionId')`. It also wraps `XMLHttpRequest` as a fallback, and catches GraphQL `ugcArticlePublishSolution` posts — [interceptor.js](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/src/js/interceptor.js)
- The isolated content script then POSTs GraphQL `submissionDetails(submissionId)` to `https://leetcode.com/graphql/`. It requests `code`, `statusCode`, `runtime`/`memory` with percentiles and distributions, `lang`, `question{title titleSlug content difficulty}`, `topicTags`, `notes` and `runtimeError`. Success is checked through the DOM (`[data-e2e-locator="submission-result"]`, and `resultState.innerText === 'Accepted'` for Explore problems). `getCode()` falls back to `document.getElementsByTagName('code')[0].innerText`, and the language comes from `button[id^="headlessui-listbox-button"]` — [leetcode.js](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/src/js/leetcode.js)
- **LeetHub v2** uses a `MutationObserver` to wait for the submit button. Its background service worker listens on `webNavigation.onHistoryStateUpdated` (filter `hostSuffix: 'leetcode.com', pathContains: 'submissions'`) and extracts the id with `/\/submissions\/(\d+)/`. It then checks the DOM `[data-e2e-locator="submission-result"]` and fetches code via GraphQL `submissionDetails` — [background.js](https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/scripts/background.js); [versions.js](https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/scripts/leetcode/versions.js); [leetcode.js](https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/scripts/leetcode/leetcode.js)
- Neither codebase contains the string `/check/` or any Monaco access (`monaco` and `getModels` were absent), per a grep of both repos on 2026-10-11 — [LeetHub-3.0 src](https://github.com/raphaelheinz/LeetHub-3.0/tree/main/src/js); [LeetHub-2.0 scripts](https://github.com/arunbhardwaj/LeetHub-2.0/tree/main/scripts)
- Both depend on volatile UI hooks. LeetHub-3.0 references a hashed CSS class `runcode-wrapper__8rXm`, Headless-UI generated ids, and `data-e2e-locator` attributes — [leetcode.js](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/src/js/leetcode.js)

**Reading code from the Monaco editor (pre-submission)**
- Monaco's public API (monaco-editor 0.52.2 typings) exposes `monaco.editor.getEditors(): readonly ICodeEditor[]`, `getModel(uri)` and `getModels(): ITextModel[]` — [editor.api.d.ts](https://unpkg.com/monaco-editor@0.52.2/esm/vs/editor/editor.api.d.ts)
- The "LeetCode Vim" extension notes that LeetCode loads Monaco and exposes it as `window.monaco`. Content scripts cannot reach that object from the isolated world, so the extension runs in the page's main world. Because the editor is re-created on navigation, it polls for editors instead of capturing them once — [leetcode-vim](https://zff.dev/CharlieBacon/leetcode-vim)
- A Greasy Fork userscript manipulates the live LeetCode editor via `monaco.editor.getEditors()[0]` — [leetcode enhanced code editor](https://greasyfork.org/ja/scripts/502740-leetcode-enhanced-code-editor/code)
- MDN on `world: "MAIN"`: scripts there have no access to content-script-only APIs, and "Due to the lack of isolation, the web page can detect and interfere with the executed code" — [MDN content_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts)

**Existing AI-hint/mentor LeetCode extensions (CWS user counts fetched 2026-10-11)**

| Extension | Users | Last updated | Approach (per listing/search) |
|---|---|---|---|
| LeetBuddy, "Your AI-Powered LeetCode Assistant" | **2,000** (4.5★) | Dec 12, 2025 | Chat aware of problem context and code space, plus a whiteboard. An audited side-panel version uses Gemini 2.5 Flash with a user-supplied API key stored locally — [CWS](https://chromewebstore.google.com/detail/nlemdecocfoaimdbfgpilfgdmcllhphn); [extensionauditor](https://extensionauditor.com/scan/leetbuddy-eoelobfmmfdopfgacemfebnhkchfaohg) |
| LeetCode Assistant | 191 (4.1★) | May 15, 2025 | Hints that unlock after about 10 minutes of trying (search snippet) — [CWS](https://chromewebstore.google.com/detail/hdfdcanbnkjlllpobpcjcmignfkdmchp) |
| LeetCode Whisper | 98 (4.8★) | Nov 20, 2024 | Step-by-step AI hints. Its privacy policy says problem data goes to the OpenAI API — [CWS](https://chromewebstore.google.com/detail/ejdmdgdlpbpgidgcgbmenlbolggniaia); [privacy policy](https://piyushgargdev.notion.site/Privacy-Policy-for-LeatCode-Whisper-10545a61dc0380d59a83c6708a1382e9) |
| LeetCopilot | 14 (4.2★) | Sep 29, 2026 | "Hints, thought evaluation, code debugging, progress tracking", with graded hint levels (10/20/30/40/100%) per listing snippet; free early beta — [CWS](https://chromewebstore.google.com/detail/hooichopomldchmmginfcjbnlbefbigh); [AlternativeTo](https://alternativeto.net/software/leetcopilot/about) |
| LeetWhisper, "AI Coding Mentor" | 7 (4.7★) | Aug 28, 2025 | Adaptive hints, bring-your-own OpenAI/Gemini key, open source — [CWS](https://chromewebstore.google.com/detail/eghonmghogmafopcibkjjlbdeghkibhd) |
| LeetFriend | 5 (4.2★) | Sep 2, 2025 | — [CWS](https://chromewebstore.google.com/detail/cochgijcneepbmhgloeaobnpempajmaj) |
| LeetCode Hints | 3 (4.7★) | Dec 23, 2025 | Capped at 3 hints (search snippet) — [CWS](https://chromewebstore.google.com/detail/pomnpmchkjeicenafnodjkiknbielmpi) |

- Others found: "LeetCode Buddy" (a different product), described as "Free (basic) / Pro from $5/month" and claiming to guide rather than give answers — [There's An AI For That](https://theresanaiforthat.com/ai/leetcode-buddy/). "LeetHint" uses OpenRouter with DeepSeek — [Peerlist](https://peerlist.io/harsh5harma/project/leethint)

**Chrome Web Store policy constraints**
- MV3 "Additional Requirements" (last updated 2024-04-03): the full functionality must be discernible from the submitted code. External resources "must not contain any logic", and remote `<script>`, `eval()` of fetched strings, and interpreters for remote commands are prohibited. **Allowed:** "syncing user account data with a remote server", remote config/feature flags, fetching non-logic resources, and server-side operations on data. Reviewers "may reject your submission or remove it from the store" if functionality can't be determined — [CWS MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Limited Use (last updated 2022-11-01): "Extensions may only collect, use, or transmit user data that is necessary for the extension's disclosed single purpose", and selling or transferring data to ad platforms or data brokers is prohibited. "Collection and use of web browsing activity is prohibited, except to the extent required for a user-facing feature" that is prominently described in the listing and UI. An affirmative Limited Use compliance statement must appear on the extension's website or privacy policy — [CWS Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- Network rules: "Content scripts initiate requests on behalf of the web origin that the content script has been injected into", and cross-origin requests stay cross-origin "even if the extension has host permissions". Service-worker and extension-page scripts can reach remote servers "as long as the extension requests host permissions". Do not let content scripts request arbitrary URLs. (The page reports "Last updated 2012-09-18", so it is old but still served.) — [Chrome: Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)

**MV3 service-worker lifetime**
- Chrome terminates an extension service worker "After 30 seconds of inactivity", when a single event or API call takes more than 5 minutes, or when a `fetch()` response takes more than 30 seconds. Events and extension API calls reset the idle timer (API calls since Chrome 110). WebSockets extend the lifetime (Chrome 116), the minimum alarm period is 30 s (Chrome 120), and global variables are lost, so state belongs in `chrome.storage` — [Chrome SW lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

**Edge/Firefox compatibility**
- `content_scripts[].world` (MAIN): Chrome 111, Edge mirrors Chrome, **Firefox 128**, Safari 18. `scripting.executeScript({world})`: Chrome 95, **Firefox 102**, Safari 15.4 — [MDN browser-compat-data: content_scripts](https://github.com/mdn/browser-compat-data/blob/main/webextensions/manifest/content_scripts.json); [BCD: scripting](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/scripting.json)
- LeetHub v2 ships a separate `manifest-firefox.json`. It uses MV3 with `"background": {"scripts": [...]}` (an event page, not `service_worker`), adds `webNavigation`, and sets `gecko.strict_min_version: "109.0"` — [manifest-firefox.json](https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/manifest-firefox.json)

### Inferences
- **Recommended capture strategy for a 24h build:** make capture *user-initiated*. An "Analyze my attempt" button runs a MAIN-world snippet, `monaco.editor.getModels()[0].getValue()`, and posts the result to the isolated content script via `window.postMessage`. The isolated script relays it to the service worker, which calls our backend under `host_permissions`. This avoids monkey-patching fetch and avoids the volatile verdict DOM, and it also works before submission (which is when hints are useful).
- Auto-capturing the verdict (Accepted/WA) is a **stretch**. The cheapest route is the LeetHub-3.0 pattern: intercept the `/submit/` response for `submission_id`, then call GraphQL `submissionDetails` from the content script (same-origin, so the user's cookies apply). This yields code, statusCode, runtime percentiles and topicTags in one call.
- Market signal: sync and "evidence" tools (LeetHub v2 at 70k, LeetHub-3.0 at 10k) far outdraw AI-hint tools (at most 2k, most under 200). A pure "AI hints on LeetCode" extension is crowded and low-traction. "Hints that never reveal + recurring-mistake profile + sync to a verified portfolio" is a more differentiated angle.
- To meet CWS rules, all analysis logic (rules, hint ladders) must live in the backend or the packaged code, and the extension should only exchange data. Any LLM call should go through our backend with a short timeout, never a long fetch inside the service worker, because of the 30 s fetch kill.
- Expect breakage across the 24h itself to be low but non-zero. Across weeks it is high: hashed class names, Headless-UI ids, the "dynamic vs non-dynamic layout" split, and GraphQL field drift (`skillStats` removed) have all broken extensions before.

### Gaps
- The `/submissions/detail/<id>/check/` polling endpoint named in the brief was **not verified** in 2026. Neither LeetHub codebase uses it, and no browser session was run to observe LeetCode's network traffic.
- Whether `window.monaco` is still globally exposed on leetcode.com as of Oct 2026 was not verified first-hand. The evidence is the LeetCode Vim notes and the Greasy Fork script, and their dates were not confirmed.
- Chrome Web Store review times, and any CWS policy on "academic dishonesty/cheating" tools, were not researched.
- Edge Add-ons store submission specifics were not researched. Edge's API support mirrors Chrome per BCD.
- The original LeetHub's CWS removal reason is unknown.

---

## Q3. Other platforms: Codeforces, CodeChef, AtCoder, HackerRank, GeeksforGeeks, GitHub (official vs unofficial, limits, auth, ToS risk)

### Takeaway
Only **Codeforces** and **GitHub** offer real official APIs. **AtCoder Problems** (kenkoooo) is a third-party site that explicitly publishes an API with politeness rules and IRT difficulty estimates. **CodeChef's** official API is effectively unavailable: api.codechef.com returns 405, and the developer portal was unreachable. CodeChef, HackerRank and GFG are reachable only through internal or undocumented endpoints or HTML scraping. Community proxies die often; for example, `codechef-api.vercel.app` was disabled on 2026-10-11, and StopStalk shut down in part because of crawling fragility. For a 24h build: **Codeforces + LeetCode (+ GitHub)** for the portfolio, everything else optional.

### Cited Findings

**Summary table (status checked 2026-10-11)**

| Platform | Access | Auth | Limits | Status / ToS risk |
|---|---|---|---|---|
| Codeforces | **OFFICIAL** REST `codeforces.com/api/{method}` | Anonymous for public data; apiKey+secret (SHA-512 `apiSig`) for private | "at most 1 time per two seconds" | Live and working. Low ToS risk |
| GitHub | **OFFICIAL** GraphQL `api.github.com/graphql` + REST | Token (PAT/GitHub App/OAuth) | Points-based; unauthenticated REST gets rate-limited quickly | Low risk |
| AtCoder Problems | **SEMI-OFFICIAL** (third-party API, explicitly offered) | None | "sleep for more than 1 second between accesses"; 500 submissions/page | Live and working. Low–moderate risk |
| CodeChef | Official API **unavailable**; internal endpoints + HTML | None for internal | Unknown; captchas reported historically | **UNOFFICIAL**; staff say internal API is for CodeChef.com only |
| HackerRank | **UNOFFICIAL** internal `/rest/...` JSON | None | Unknown | Live and working; ToS not checked |
| GeeksforGeeks | **UNOFFICIAL** scrapers/proxies | None | e.g., 10 req/min on one proxy | Fragile; ToS not checked |

**Codeforces (OFFICIAL)**
- Docs: "API may be requested at most 1 time per two seconds. If you send more requests, you will receive a response with "FAILED" status and "Call limit exceeded" comment." "All methods can be requested anonymously. This way only public data will be accessable via API." Private data needs `apiKey`, `time` (within 5 min of server time) and `apiSig` = 6 random characters + SHA-512 of `<rand>/<methodName>?<sorted params>#<secret>`. JSONP is supported — [Codeforces API help, fetched via curl 2026-10-11](https://codeforces.com/apiHelp)
- `user.info?handles=tourist` returned rating 3343, maxRating 4009, rank, country, organization and avatar — [live test](https://codeforces.com/api/user.info?handles=tourist)
- `user.status` returns, per submission, `problem{contestId,index,name,tags,points}`, `verdict` (e.g., "OK"), `passedTestCount`, `programmingLanguage`, `timeConsumedMillis` and `memoryConsumedBytes` — [live test](https://codeforces.com/api/user.status?handle=tourist&from=1&count=1)
- `problemset.problems` returned **11,442 problems, 11,152 with a `rating`**, and **38 distinct tags** — [live test](https://codeforces.com/api/problemset.problems)
- Six back-to-back `user.rating` calls all returned OK. The documented 1-per-2 s limit was not enforced in that small burst, but should be respected anyway — [live test](https://codeforces.com/api/user.rating?handle=tourist)
- The Codeforces AI rule (Sept 2024) restricts AI use in rated contests but allows AI for practice outside contests — [Codeforces blog 133941](https://codeforces.com/blog/entry/133941)

**AtCoder via AtCoder Problems (SEMI-OFFICIAL)**
- The API doc says: "Please don't hit API so often. Please sleep for more than 1 second between accesses." `v3/user/submissions?user=&from_second=` returns "up to 500 submissions after the specified time", and some older endpoints are listed under "Deprecated" — [AtCoderProblems doc/api.md](https://github.com/kenkoooo/AtCoderProblems/blob/master/doc/api.md)
- Live: `v3/user/ac_rank?user=tourist` → `{"count":1057,"rank":4471}`. `v3/user/submissions` returned rows with `problem_id`, `contest_id`, `language`, `point`, `length`, `result` ("AC") and `execution_time`. `resources/problem-models.json` gives per-problem IRT fields (`slope`, `intercept`, `variance`, `difficulty`, `discrimination`, `irt_loglikelihood`, `irt_users`, `is_experimental`) — [ac_rank](https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=tourist); [problem-models.json](https://kenkoooo.com/atcoder/resources/problem-models.json)
- The repo has 1,625 stars, last push 2026-07-15 — [GitHub API](https://api.github.com/repos/kenkoooo/AtCoderProblems)

**CodeChef (official API effectively unavailable; UNOFFICIAL access)**
- Live: `https://api.codechef.com/` returned **HTTP 405 "Not Allowed"**, and `https://developers.codechef.com/` failed to connect (no HTTP response) on 2026-10-11 — [live test, api.codechef.com](https://api.codechef.com/); [developers.codechef.com](https://developers.codechef.com/)
- A CodeChef staff forum reply distinguished the official API (access requested via api@codechef.com through developers.codechef.com) from "the internal API" that is "only made for use by CodeChef.com", saying CodeChef "is not responsible for its usage by any other third party". This thread is several years old — [CodeChef discuss](https://discusstest.codechef.com/t/is-the-codechef-api-still-available-for-development-of-apps/21621). A Codeforces commenter (~2021) claimed CodeChef "killed their API" and added captchas. This is anecdotal — [Codeforces blog 90896](https://codeforces.com/blog/entry/90896)
- Live: the internal `https://www.codechef.com/api/list/problems?page=0&limit=2` returned JSON (`count: 21607`) with fields `code`, `name`, `difficulty_rating`, `total_submissions`, `successful_submissions` and `contest_code`, but **no tags** in the fields returned. The public profile HTML contains "Total Problems Solved: 632" for gennady.korotkevich, so it is scrapeable — [internal list endpoint](https://www.codechef.com/api/list/problems?page=0&limit=1); [profile page](https://www.codechef.com/users/gennady.korotkevich)
- The community proxy `codechef-api.vercel.app` returned **HTTP 402 "DEPLOYMENT_DISABLED"** on 2026-10-11 — [live test](https://codechef-api.vercel.app/handle/gennady.korotkevich)

**HackerRank (UNOFFICIAL internal REST)**
- Live and anonymous on 2026-10-11, all HTTP 200: `/rest/hackers/{u}/badges` (`{"status":true,"models":[...]}`), `/rest/hackers/{u}/scores_elo` (per-track practice score/rank and contest medals), `/rest/contests/master/hackers/{u}/profile` (id, username, country, created_at, level…) and `/rest/hackers/{u}/recent_challenges?limit=` (models, cursor, last_page) — [scores_elo](https://www.hackerrank.com/rest/hackers/gayle/scores_elo); [profile](https://www.hackerrank.com/rest/contests/master/hackers/gayle/profile); [badges](https://www.hackerrank.com/rest/hackers/gayle/badges)

**GeeksforGeeks (UNOFFICIAL scrapers)**
- Community APIs scrape the GFG profile page: arnoob16/GeeksForGeeksAPI (Vercel; "built by scraping the profile page"), shaileshaanand/GeeksForGeeksAPI, geekforgeekapi.onrender.com ("maximum 10 requests per minute per IP", no auth), and the `use-gfg` React hook. Maintenance dates were not confirmed — [arnoob16/GeeksForGeeksAPI](https://github.com/arnoob16/GeeksForGeeksAPI); [geekforgeekapi docs](https://geekforgeekapi.onrender.com/docs); [use-gfg](https://www.npmjs.com/package/use-gfg)
- A test of GFG's `authapi.geeksforgeeks.org/api-get/user-profile-info/` with a guessed handle returned `{"message":"User not found!"}` (HTTP 400). This is inconclusive — [live test](https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=sandeepjainlinkedin&article_count=false&redirect=true)

**GitHub (OFFICIAL)**
- Endpoint `https://api.github.com/graphql`. You "can authenticate to the GraphQL API using a personal access token, GitHub App, or OAuth app", and every example carries an auth header — [GitHub docs: Forming calls with GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql)
- The public schema defines `ContributionsCollection.contributionCalendar: ContributionCalendar!`, with `totalContributions`, `weeks`, `months` and `colors`. This is the source for a GitHub heatmap — [GitHub public GraphQL schema](https://docs.github.com/public/fpt/schema.docs.graphql)
- Unauthenticated REST calls from the test IP hit "API rate limit exceeded for <ip>. (But here's the good news: Authenticated requests get a higher rate limit...)" after about 15 calls in one session — [live test, api.github.com](https://api.github.com/graphql)

### Inferences
- **Codeforces is the gold source for a mistake profile across platforms.** `user.status` gives every submission's verdict (WA, TLE, RE, …), `passedTestCount` and problem tags, officially and anonymously. CodeQuest can compute "verdict mix per concept" (e.g., TLE-heavy on `binary search`) without any scraping.
- The AtCoder Problems IRT `difficulty` makes a ready-made calibrated difficulty for AtCoder evidence. AtCoder has no tags, so it contributes only "volume × difficulty", not concepts.
- CodeChef, HackerRank and GFG should be "manual handle + optional unverified stats" at best in a 24h build. Each unofficial proxy is one deploy-disable or Cloudflare rule away from breaking during judging.
- Every external call needs caching plus a seeded "demo mode" snapshot, per the project convention.

### Gaps
- The ToS texts of CodeChef, HackerRank, GeeksforGeeks and AtCoder were not fetched. Their scraping clauses are unknown.
- GitHub GraphQL's exact unauthenticated behaviour could not be tested, because the shared IP was already REST-rate-limited.
- A working GFG handle/endpoint was not found in this session.
- Whether CodeChef still grants official API keys on request is unknown. The portal was unreachable and no 2025–2026 announcement was found.

---

## Q4. Unified coding-portfolio products (Codolio, CodeFolio, StopStalk, Code360, analyzers, LeetCard/readme cards): features, pricing, traction, and gaps

### Takeaway
The category is dominated by **counts, streaks, heatmaps, contest-rating graphs and topic tallies**. Codolio is the active Indian leader (3,000 extension users), StopStalk was sunset on 1 Aug 2025, and README cards like LeetCode-Stats-Card exist. No product found offers **verified concept mastery with linked evidence, a recurring-mistake profile, or evidence of effort** (attempts-before-AC, hint usage, fixed mistakes). That gap is CodeQuest's differentiation. StopStalk's own post-mortem names crawling fragility and skewed data as core reasons the model failed.

### Cited Findings
- **Codolio**: describes itself as "the ultimate coding portfolio tracker and tool ... to manage their coding achievements across multiple platforms" — [codolio.com meta description](https://codolio.com/). Features per its site: a profile tracker across LeetCode, CodeChef, Codeforces, GeeksforGeeks and InterviewBit (cumulative questions solved, cross-platform streaks, contest rating history, problem classification by topic, "strengths"), a question tracker/sheets, company-wise sheets, a GitHub tracker and an event/contest tracker — [Codolio site mirror](https://scriptagc.wasmer.app/https_codolio_com). LinkedIn lists it as Bangalore-based, founded 2024, 1 employee, ~1,981 followers (per search summary) — [LinkedIn](https://in.linkedin.com/company/codolio). Its Chrome extension (which adds questions from supported platforms to a workspace with custom tags) has **3,000 users**, v1.1.5, updated Sep 20, 2026, rated 4.7/5 — [CWS listing](https://chromewebstore.google.com/detail/hhldiohknhejgggdehdeepiggieflfjo). No pricing page was found.
- **StopStalk** (aggregator since 2015, IIIT Hyderabad origin): the site now shows "Final update from StopStalk": "we are sunsetting StopStalk. StopStalk will not be available for usage post 1st August 2025". The stated reasons, in priority order, include: competitive programming "has died down in favour of platforms like Leetcode"; "the data that we were providing was primarily built on crawling ... A platform can any day choose to block us"; ratings were "skewed because the crawling might not have happened for some candidates"; AWS bills were paid from personal savings; and it was stuck on the old Web2py framework — [stopstalk.com, fetched 2026-10-11](https://www.stopstalk.com/); corroborated by [Toph community post (Aug 2025)](https://community.toph.co/t/stopstalk-is-discontinued-what-now/6645). The repo has 316 stars, last push 2025-08-11 — [GitHub API](https://api.github.com/repos/StopStalk/stopstalk-deployment)
- **"CodeFolio"** search results point mainly to portfolio *website templates* (a free Astro theme and a paid Bootstrap template), not to a stats aggregator — [Astro theme: Codefolio](https://astro.build/themes/details/codefolio)
- **Coding Ninjas Code360**: no official feature unifying LeetCode/CodeChef/Codeforces stats in one Code360 profile was found. Only third-party trackers that include Coding Ninjas as a source (e.g., DSA Tracker) turned up — [DSA Tracker](https://huntscreens.com/products/dsa-tracker)
- **README/stat cards**: JacobLinCool's **LeetCode-Stats-Card** ("LeetCard", ~917 stars per search snippet) serves an image from `leetcard.jacoblin.cool/<user>` (HTTP 200 on 2026-10-11). It supports `site=cn` and one extension per card (`activity`, `contest` rating history, or a 52-week `heatmap`), runs on Cloudflare Workers, is self-hostable via Docker, and is MIT licensed — [LeetCode-Stats-Card](https://github.com/JacobLinCool/LeetCode-Stats-Card); [live check](https://leetcard.jacoblin.cool/lee215). **github-readme-stats** (GitHub only) has 79,824 stars, last push 2026-10-01 — [GitHub API](https://api.github.com/repos/anuraghazra/github-readme-stats)
- **Open-source and indie aggregators/analyzers**: CoderSTAT (LeetCode, Codeforces, CodeChef, GFG) — [GitHub](https://github.com/amanbind898/coderstat); CoderHub (unified dashboard for LeetCode, Codeforces, CodeChef, GFG) — [DEV](https://dev.to/prashantug21/i-built-coderhub-a-unified-dashboard-to-track-leetcode-codeforces-codechef-gfg-progress-2m18); weongo (LeetCode + Codeforces with "AI-driven weak-topic analysis", peer comparison, contest tracking) — [GitHub](https://github.com/chintn/weongo); Intelliguide (AI Codeforces profile analyzer with tag-based suggestions) — [Codeforces blog](https://codeforces.net/blog/punyajain); a free "Codeforces Profile Analyzer" (Mar 2025; acceptance rates, topic-wise categorization, recommendations) — [Codeforces topic](https://codeforces.com/topic/140967/en1); Competitive_Programming_Score_API — [GitHub](https://github.com/Cursed-Ninja/Competitive_Programming_Score_API); the `proxor` npm package (getCodeforcesData / getCodeChefData / getLeetcodeData) — [README](https://unpkg.com/proxor@1.1.0/README.md)

### Inferences
- **Gap to exploit:** every product above reports *outputs* (solved counts, streaks, ratings, tag tallies). None reports *process evidence*: how many attempts before passing, which mistake categories recur and whether they were fixed, how many hint levels were used, or concept mastery backed by hidden-test results. CodeQuest's core loop (sandboxed runs, per-test outcomes, mistake detection, hint ladder) produces exactly this evidence natively. The portfolio should lead with "Verified on CodeQuest" evidence and show external stats as secondary, "self-reported/unverified" context.
- StopStalk's post-mortem argues against building a portfolio *on* crawling. External imports should be a thin, cached, optional layer, with the official Codeforces API preferred.
- Recruiter-facing distrust of skewed or cheatable counts (StopStalk's "unfair ranking" remark, LeetCode's contest-cheating crackdown) makes "evidence of effort" a credible pitch line for judges.

### Gaps
- Codolio's pricing, total registered users and API/data-source method (official vs scraping) were not found.
- No traction figures were found for CoderSTAT, CoderHub, weongo or the Codeforces analyzers.
- The current star count of LeetCode-Stats-Card was not verified first-hand (GitHub API rate-limited; the figure comes from a search snippet).

---

## Q5. Normalizing tags across platforms (LeetCode topicTags, Codeforces tags, CodeChef tags) into one concept taxonomy; existing mappings

### Takeaway
No official or community-maintained LeetCode↔Codeforces↔CodeChef tag-mapping table was found. The closest existing resource is the **TACO dataset** (BAAI, Apache-2.0), which re-labels problems from Codeforces, CodeChef, LeetCode, AtCoder, GFG, HackerRank, Kattis and others with unified `tags` (algorithms) and `skill_types`. Vocabularies are small and live-queryable (75 LeetCode tags, 38 Codeforces tags), so a hand-built synonym map of about 40 rows onto CodeQuest's concept model is a 1–2 hour task. It must handle "false friends".

### Cited Findings
- **LeetCode** vocabulary: 75 tags from `questionTopicTags` on 2026-10-11, including array, hash-table, linked-list, math, two-pointers, string, binary-search, divide-and-conquer, dynamic-programming, backtracking, stack, heap(-priority-queue), greedy, bit-manipulation, tree, depth-first-search, breadth-first-search, union-find, graph, design, topological-sort, trie, binary-indexed-tree, segment-tree, binary-search-tree, recursion, memoization, queue, sliding-window, sorting, matrix, monotonic-stack, simulation, combinatorics, binary-tree, counting, prefix-sum, enumeration, number-theory, game-theory, shortest-path, bitmask, probability-and-statistics, minimum-spanning-tree, strongly-connected-component, database, shell and concurrency — [live test, LeetCode GraphQL](https://leetcode.com/graphql). LeetCode already buckets solved tags into `fundamental` / `intermediate` / `advanced` in `tagProblemCounts` — [live test](https://leetcode.com/graphql)
- **Codeforces** vocabulary: 38 tags, with frequencies over 11,442 problems: greedy 3585, math 3518, implementation 3066, dp 2542, constructive algorithms 2132, data structures 2060, brute force 2011, binary search 1304, sortings 1262, graphs 1233, dfs and similar 1083, trees 982, number theory 908, combinatorics 847, strings 825, bitmasks 719, two pointers 660, *special 560, geometry 431, dsu 419, divide and conquer 368, interactive 311, games 309, shortest paths 295, probabilities 269, hashing 239, flows 162, matrices 141, fft 117, graph matchings 106, string suffix structures 102, ternary search 71, meet-in-the-middle 52, 2-sat 42, expression parsing 41, chinese remainder theorem 26, schedules 16, communication 10 — [live test, problemset.problems](https://codeforces.com/api/problemset.problems)
- **CodeChef** tags are inconsistent. Users reported many variants for one topic ("bit", "bits", "bit-manipualtion", "bitwise"), and staff acknowledged that cleanup was hard — [CodeChef discuss: Regarding CodeChef Problem Tags](https://discuss.codechef.com/t/regarding-codechef-problem-tags/71373). The internal problem-list endpoint returned no tag field (see Q3) — [live test](https://www.codechef.com/api/list/problems?page=0&limit=1)
- **AtCoder** (via AtCoder Problems) exposes difficulty (IRT) but no topic tags in the endpoints examined — [problem-models.json](https://kenkoooo.com/atcoder/resources/problem-models.json)
- **TACO** (Topics in Algorithmic COde generation): 25,433 train + 1,000 test problems and up to 1.55M solutions, with "fine-grained labels such as task topics, algorithms, programming skills, and difficulty levels" — [arXiv 2312.14852](https://arxiv.org/pdf/2312.14852). The HF card fields are `tags` ("manually annotated algorithms needed to solve the problem") and `skill_types` ("mapped programming skill types"). Sources include Codeforces, CodeChef, LeetCode, AtCoder, GeeksforGeeks, HackerRank, Kattis, Aizu, CodeWars and HackerEarth. The card's problem count (26,443) differs from the paper's figure — [HF dataset card](https://huggingface.co/datasets/Siki-77/TACO); [GitHub FlagOpen/TACO](https://github.com/FlagOpen/TACO/)
- Related work predicts tags rather than mapping them: JetBrains Research tag prediction from statements and solutions — [JetBrains Research](https://lp.jetbrains.com/research/ml_methods/projects/tag-prediction). A Codeforces blog argues tags are too broad and clusters problems by reasoning similarity instead — [Codeforces blog 148037](https://codeforces.com/blog/entry/148037)

### Inferences
- **Proposed canonical concept map (researcher's inference, built from the two live vocabularies above):**

| Canonical concept | LeetCode slugs | Codeforces tags | Notes |
|---|---|---|---|
| Arrays & iteration | array, enumeration, simulation, matrix* | implementation, brute force | *LC `matrix` = 2D-grid traversal |
| Strings | string, string-matching | strings | |
| Hashing / lookup tables | hash-table, counting | (none: CF has no direct tag) | **False friend:** CF `hashing` = string/rolling hashing → map to LC rolling-hash/hash-function |
| Two pointers / sliding window | two-pointers, sliding-window | two pointers | |
| Prefix sums | prefix-sum | (data structures) | |
| Sorting | sorting, merge-sort, counting-sort, bucket-sort, radix-sort | sortings | |
| Binary search | binary-search | binary search, ternary search | |
| Stacks/queues (incl. monotonic) | stack, queue, monotonic-stack, monotonic-queue | data structures | CF `data structures` is a catch-all, so assign low confidence |
| Heaps / priority queues | heap-priority-queue | data structures | |
| Linked lists | linked-list, doubly-linked-list | none | LC-only |
| Recursion & backtracking | recursion, backtracking | brute force | |
| Dynamic programming | dynamic-programming, memoization | dp | |
| Greedy | greedy | greedy | |
| Bit manipulation | bit-manipulation, bitmask | bitmasks | |
| Math / number theory | math, number-theory, combinatorics, probability-and-statistics | math, number theory, combinatorics, probabilities, chinese remainder theorem | **False friend:** CF `matrices` = matrix exponentiation/linear algebra, not grid traversal |
| Trees | tree, binary-tree, binary-search-tree | trees | |
| Graph traversal | graph, depth-first-search, breadth-first-search, topological-sort | graphs, dfs and similar | |
| Shortest paths / MST / advanced graphs | shortest-path, minimum-spanning-tree, strongly-connected-component, biconnected-component, eulerian-circuit | shortest paths, flows, graph matchings, 2-sat | |
| Union-find | union-find | dsu | |
| Range structures | segment-tree, binary-indexed-tree | data structures | |
| Advanced strings | trie, rolling-hash, suffix-array, hash-function | string suffix structures, hashing | |
| Divide & conquer | divide-and-conquer, meet-in-the-middle | divide and conquer, meet-in-the-middle | |
| Game theory | game-theory, minimax-algorithm | games | |
| Geometry | geometry | geometry | |
| Interactive | interactive | interactive | |
| (Unmapped / excluded) | design, database, shell, concurrency, iterator, data-stream, brainteaser | constructive algorithms, *special, expression parsing, schedules, communication, fft | Keep as "other" so they don't pollute concept scores. Remaining LC tags (quickselect, ordered-set, ordered-map, sweep-line, randomized, reservoir-sampling, rejection-sampling) → nearest concept (sorting / range structures / math) or "other" |

- **Two-layer skill model for CodeQuest:** CodeQuest's own challenges are Python-concept level (loops, conditionals, strings, lists/dicts, functions, recursion, exceptions, …), while external tags are algorithmic. The concept model should have (1) **language concepts**, evidenced only by CodeQuest runs, and (2) **algorithmic topics**, evidenced by both CodeQuest and imports. They link via "prerequisite" edges (e.g., Recursion (language) → Backtracking/DP (algorithmic)).
- **Evidence weighting:** verified CodeQuest evidence (hidden tests passed, mistake fixed) should outweigh imported counts. A Codeforces AC carries its problem `rating` as difficulty, AtCoder its IRT `difficulty`, and LeetCode only Easy/Medium/Hard. Imported multi-tag problems should split credit across their tags, at reduced weight for the CF catch-all tags (`data structures`, `implementation`, `brute force`).
- TACO could later seed or validate the map automatically, by finding LeetCode/CF problems in TACO and reading their unified `tags`. For a 24h hackathon, though, a static JSON map is safer.

### Gaps
- TACO's exact unified tag list and skill-type list (count and names) were not retrieved, nor whether it preserves the original platform tags alongside them.
- CodeChef's current tag vocabulary could not be pulled from an endpoint. Tags may exist on problem pages but weren't examined.
- No academic or industry standard (e.g., ACM/IEEE curriculum mapping) for competitive-programming concept taxonomies was investigated.

---

## Q6. Feasibility verdict and minimal 24h-hackathon scope (extension + portfolio)

### Takeaway
**(a) Extension: feasible as a thin, user-triggered companion; risky as an automatic interceptor.** Reading the editor via a MAIN-world script plus the problem's tags via same-origin GraphQL, then calling our own backend's deterministic analyzers, is buildable in about 4–6 person-hours by someone who has built an MV3 extension. Auto-verdict capture and Chrome Web Store publication are not worth the risk in 24h. **(b) Portfolio: feasible and higher-value.** Make it a public page that leads with CodeQuest-verified concept evidence and adds cached LeetCode (unofficial) + Codeforces (official) imports mapped through a static tag map. Both must stay behind the core-MVP feature freeze and have seeded demo data.

### Cited Findings
- Proven building blocks: the MAIN-world content script plus `fetch` interception plus GraphQL `submissionDetails` pattern is in production in an extension with 10,000 users — [LeetHub-3.0 manifest](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/manifest.json); [interceptor.js](https://github.com/raphaelheinz/LeetHub-3.0/blob/main/src/js/interceptor.js); [CWS](https://chromewebstore.google.com/detail/kdkgpjpenaeoodajljkflmlnkoihkmda). The webNavigation-URL plus DOM-verdict pattern is in an extension with 70,000 users — [LeetHub v2 background.js](https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/scripts/background.js); [CWS](https://chromewebstore.google.com/detail/mhanfgfagplhgemhjfeolkkdidbakocm)
- Monaco exposes `getModels()`/`getEditors()` — [Monaco typings](https://unpkg.com/monaco-editor@0.52.2/esm/vs/editor/editor.api.d.ts). LeetCode exposes `window.monaco` to main-world scripts — [leetcode-vim](https://zff.dev/CharlieBacon/leetcode-vim)
- Public LeetCode stats (solved by difficulty, tagProblemCounts, contest rating, calendar, recent verdicts) and problem tags are anonymously readable today. Browsers can't call them cross-origin, so a server-side proxy is needed — [live tests, LeetCode GraphQL](https://leetcode.com/graphql)
- The Codeforces official API gives verdicts plus tags plus problem ratings anonymously at 1 call / 2 s — [Codeforces API help](https://codeforces.com/apiHelp)
- Legal and policy constraints: LeetCode ToS bans crawling/scraping/reverse engineering — [ToS snapshot](http://web.archive.org/web/20260915150045/https://leetcode.com/terms/); robots.txt disallows `/graphql` — [robots.txt](https://leetcode.com/robots.txt); contests ban external AI help — [LeetCode contest rule](https://leetcode.com/discuss/general-discussion/951105/New-Contest-Rule-); CWS forbids remote logic and limits data use to the disclosed single purpose — [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements); [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- MV3 service workers die after 30 s idle or on a 30 s fetch, so long LLM calls inside the service worker are unsafe — [Chrome SW lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- Aggregators built on crawling are fragile; StopStalk named this as a shutdown reason — [stopstalk.com final update](https://www.stopstalk.com/)

### Inferences
**Verdict.** Both extras are technically feasible. The **portfolio** is lower-risk and more on-brief, because "concept-level skill tracking with evidence" is part of E-02. The **extension** is a demo multiplier ("CodeQuest follows you onto LeetCode") with real fragility and ToS exposure, so it should be the last stretch item. Neither should start before the core loop is stable (run → per-test results → explanation → hint ladder → mistake tracking).

**Minimal 24h scope: Extension ("CodeQuest Companion", Chrome/Edge MV3, load-unpacked only)**
1. `manifest.json`: MV3, `host_permissions` for `https://leetcode.com/*` and our API origin, one MAIN-world content script (tiny: on request, return `monaco.editor.getModels()[0]?.getValue()` and the language), one isolated content script (UI panel plus messaging), and a service worker that only relays to our backend (no state in globals; `chrome.storage` for the auth token).
2. Problem context: from the URL slug, call GraphQL `question(titleSlug)` same-origin from the content script for `difficulty` and `topicTags` only. Never store `content` or `hints` server-side.
3. Panel with three buttons: **"Check my approach"** (the user types 1–3 sentences; the backend deterministically matches stated techniques against topicTags and the concept map, e.g. "you mention nested loops; this problem is tagged hash-table/two-pointers, so think about O(n) lookups"), **"Hint"** (our own concept-level hint ladder keyed by canonical concept, never LeetCode's hints or a solution), and **"Analyze my code"** (Python3 only: reuse CodeQuest's AST/static mistake detectors, e.g. off-by-one range bounds, mutating a list while iterating, missing base case, `==` vs `is`, unhandled empty input).
4. Sync: POST `{handle, slug, tags, lang, detected_mistakes[], hint_level_used, timestamp}` to the backend so it feeds the same recurring-mistake profile and portfolio evidence (marked "external, self-reported").
5. Guardrails: auto-disable on `leetcode.com/contest/*`. No code leaves the browser without a click. Show a one-line data notice (Limited Use readiness).
6. Stretch only: auto-verdict via DOM `[data-e2e-locator="submission-result"]` MutationObserver, or the LeetHub-3.0 `/submit/` intercept plus `submissionDetails`.
7. Demo safety: record a 30–60 s backup video of the extension working, in case LeetCode UI or Cloudflare changes break it live. Have a seeded backend response mode.

**Minimal 24h scope: Portfolio (`/u/<handle>`)**
1. Primary block: **"Verified on CodeQuest"**. A concept mastery grid (language and algorithmic layers), where each cell links to evidence: challenge, hidden-tests passed, attempts, hints used, mistakes fixed. Add a "Recurring mistakes, resolved" timeline. Nobody in the market shows this (Q4).
2. Import block (server-side, cached 24 h, demo snapshots seeded): **LeetCode** via one combined anonymous GraphQL query (submitStatsGlobal, tagProblemCounts, userContestRanking, userCalendar, recentSubmissionList for verdict mix), and **Codeforces** via `user.info` plus `user.status` (verdict-by-tag). Throttle CF to 1 call / 2 s, and LeetCode to a few calls per profile refresh.
3. Map imported tags through a static `concept_map.json` (Q5 table). Display imported evidence at lower weight with an "unverified" badge.
4. Out of scope for 24h: CodeChef, HackerRank, GFG (unofficial and fragile), leetcode.cn (Cloudflare-challenged), handle-ownership verification, and CWS publishing. AtCoder (via AtCoder Problems) and a GitHub contribution heatmap (needs a token) are cheap optional add-ons only if ahead of schedule.
5. Fallbacks: if a live fetch fails, render the cached or seeded snapshot with an "as of <date>" label. Never block page render on an external API.

**Pitch framing for judges:** "Other trackers count what you solved; CodeQuest shows how you learned: verified concepts, mistakes you stopped making, and hints you no longer need. It follows you to LeetCode without ever giving away the answer."

### Gaps
- No timing data exists for how long the team would need for the extension. The 4–6 person-hour estimate is an inference that assumes prior MV3 experience.
- Whether the hackathon's rules or judges care about third-party ToS compliance (LeetCode scraping) is unknown. Check `docs/pm/01_hackathon_brief.md` once the rules are published.
- Live behaviour of LeetCode from the team's actual deployment host (e.g., Vercel or Render free tier) should be smoke-tested on hack day. Only an Indian client IP and one Render-hosted proxy were observed working on 2026-10-11.
