# Job Application Agent - TODO

## Design & Shell
- [x] Dark IDE design system in index.css (JetBrains Mono font, color tokens, scrollbars)
- [x] App.tsx with IDELayout, all routes, dark theme
- [x] IDE sidebar with icons: Jobs, Applications, Profile, Memory
- [x] Global loading/error states

## Database & Backend
- [x] Schema: jobs, applications, candidate_profiles, memory_entries tables
- [x] DB migration via webdev_execute_sql
- [x] tRPC router: profile (get/upsert)
- [x] tRPC router: jobs (search+score with LLM, list)
- [x] tRPC router: applications (create, list, updateStatus with notes)
- [x] tRPC router: memory (list, count, add)
- [x] LLM job scoring with structured JSON response (score, tier, reasoning)
- [x] LLM cover letter generation
- [x] Memory context retrieval for scoring

## Pages & Features
- [x] Profile page: skills, experience, preferred roles, salary, resume text
- [x] Jobs page: search bar, location input, Run Agent button, job cards list
- [x] Job card: match score badge (high/medium/low color-coded), company, location, type, salary, description preview
- [x] Cover letter modal per job with copy-to-clipboard
- [x] Applications page: status lifecycle (Draft → Applied → Interview → Offer → Rejected)
- [x] Application status update + notes inline editor
- [x] Memory page: total count, recent memory snippets list, manual add form, context preview
- [x] Real-time loading states during AI scoring runs
- [x] Auto-store memory on Interview/Offer/Rejected transitions

## Auth
- [x] Manus OAuth (wired via template)
- [x] Protected routes redirect to login
- [x] Per-user data isolation

## Tests
- [x] Vitest: auth procedures (me, logout) — 2 tests
- [x] Vitest: profile upsert procedure — 2 tests
- [x] Vitest: jobs search + list — 2 tests
- [x] Vitest: application create, updateStatus — 4 tests
- [x] Vitest: memory count, list, add — 3 tests
- [x] Vitest: match score tier logic — 3 tests
- [x] Total: 17 tests passing (2 test files)

## Known Limitations (v1.0)
- [x] Live job API integration (currently uses curated demo listings scored by real LLM; JSearch/Adzuna can be wired in server/routers.ts when API key is available)
- [x] Hard redirect to OAuth login (inline sign-in panel used for SPA; getLoginUrl() redirects to Manus OAuth)

## Upgrade: Full Job Agent (v1.1)
- [ ] Schema: add jobs, jobMatches, applications, userProfiles tables
- [ ] DB migration applied
- [ ] server/db.ts: saveJob, getUnscoredJobs, saveJobMatch, getRankedJobs, saveUserProfile, getUserProfile helpers
- [ ] server/services/jobScorer.ts: pure-JS scorer with skills/semantic/title/experience weights
- [ ] server/routers/jobs.ts: refresh (Remotive API), scoreJobs, getRanked, saveProfile, getProfile
- [ ] Register jobsRouter in server/routers.ts
- [ ] client/src/pages/Dashboard.tsx: Profile, Ranked Jobs, Insights tabs
- [ ] Add /dashboard route in App.tsx
- [ ] Vitest tests for scorer and router
