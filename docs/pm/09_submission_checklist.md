# 09 · Submission Checklist

> Target: **everything submitted at T+22:30** (90-min buffer). Upload forms break, videos take time to process, and Wi-Fi dies at the worst moment.

## Product
- [ ] Production URL works on a **fresh device / incognito** (not just a teammate's laptop)
- [ ] Demo account / seed data in place; credentials noted for judges if login is required
- [ ] Demo mode works with external APIs down (cached/seeded responses)
- [ ] No console errors on the main flow; loading and error states look intentional
- [ ] Mobile view is acceptable (judges often open links on phones)

## Repository
- [ ] Repo visibility as required (public?), with the correct name
- [ ] `README.md` filled from [../templates/SUBMISSION_README_TEMPLATE.md](../templates/SUBMISSION_README_TEMPLATE.md): problem, solution, features, architecture diagram, stack, setup, screenshots/GIF, demo links, team
- [ ] `.env.example` complete; **no secrets in the code or git history** (`git log -p | grep -i "key\|secret\|token"` sanity check)
- [ ] Setup steps verified from a clean clone
- [ ] License added if open source is required
- [ ] Commit history is steady and timestamped within the event window
- [ ] Remove dead code, TODO spam, and huge files (datasets → link or Git LFS)

## Media
- [ ] **Demo video** (2–3 min unless specified): hook → problem → live walkthrough → tech → impact. Uploaded **unlisted** to YouTube/Drive, with the link tested in incognito
- [ ] Pitch deck exported to **PDF** (fonts embedded), plus a share link
- [ ] Screenshots / GIF for the README and the form
- [ ] Architecture diagram (PNG/SVG)

## Form / platform
- [ ] All required fields filled (project name, tagline, track, description, tech, links, team members)
- [ ] Sponsor tracks/prizes opted into where we use their tech
- [ ] Confirmation screenshot or email saved

## Pitch readiness
- [ ] 3 timed rehearsals done; under the time limit with 15% to spare
- [ ] Q&A prep reviewed (see [../research/judging-and-winning-patterns.md](../research/judging-and-winning-patterns.md))
- [ ] Demo laptop charged, notifications off, tabs pre-opened, zoom at 125%+, hotspot ready
- [ ] Backup video downloaded **locally** on the demo laptop
