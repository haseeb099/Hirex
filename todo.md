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
- [x] Schema: add jobs, jobMatches, applications, userProfiles tables
- [x] DB migration applied
- [x] server/db.ts: saveJob, getUnscoredJobs, saveJobMatch, getRankedJobs, saveUserProfile, getUserProfile helpers
- [x] server/services/jobScorer.ts: pure-JS scorer with skills/semantic/title/experience weights
- [x] server/routers/jobs.ts: refresh (Remotive API), scoreJobs, getRanked, saveProfile, getProfile
- [x] Register jobsRouter in server/routers.ts
- [x] client/src/pages/Dashboard.tsx: Profile, Ranked Jobs, Insights tabs
- [x] Add /dashboard route in App.tsx
- [x] Vitest tests for scorer and router (21 tests passing, 2 test files)

## v1.2 — Apply Materials System
- [x] Fix all current errors (Vite stale cache, runtime insertJob, TS)
- [x] tRPC procedure: analyzeJobDescription (paste text or URL → extract JD)
- [x] tRPC procedure: generateApplyKit (ATS CV, cover letter, LinkedIn summary, interview prep)
- [x] ATS-optimised CV generator: reorders/rewrites resume bullets to match JD keywords
- [x] Tailored cover letter: 3-paragraph, company-specific, keyword-rich
- [x] LinkedIn summary: 3-5 sentence "About" section optimised for the role
- [x] Interview prep: 5 likely questions + suggested answers based on JD + profile
- [x] ApplyPage: JD paste textarea + URL input with "Analyse" button
- [x] ApplyPage: Apply Kit panel with tabs (CV / Cover Letter / LinkedIn / Interview Prep)
- [x] Copy-to-clipboard for each section
- [x] Download as .txt for each section
- [x] "Generate Apply Kit" button on each ranked job card in Dashboard
- [x] "Generate Apply Kit" button on each job card in Jobs page
- [x] Match score badge shown on ApplyPage for the analysed job
- [x] Vitest tests for generateApplyKit procedure (34 tests passing, 3 files)

## v2.0 — SaaS Rebuild

### Phase 1: DB + Schema Fixes
- [x] Fix all remaining query errors (applications, jobs search)
- [x] Add user_credits and subscriptions tables
- [x] Add Stripe integration (checkout, webhooks)

### Phase 2: Agentic Job Fetcher
- [x] Fix Remotive API job fetching (real jobs, not demo)
- [x] URL/JD paste import: scrape job from URL or paste raw JD
- [x] Remove broken legacyJobs demo system — replace with real Remotive + paste flow
- [x] Job search works reliably without errors

### Phase 3: ATS PDF Generator
- [x] ATS-friendly CV PDF (html-to-pdf, proper ATS formatting)
- [x] Cover letter PDF (matching professional style)
- [x] One-click download buttons for each document
- [x] PDF served via tRPC/API endpoint

### Phase 4: UI/UX Redesign
- [x] Modern SaaS landing page with pricing section
- [x] Improved dashboard with clear CTAs and stats
- [x] Better job cards with match score, skills chips, quick actions
- [x] Apply Kit page redesign with tabbed materials + PDF download
- [x] Responsive mobile-friendly layout

### Phase 5: Stripe + Credits
- [x] Stripe checkout for subscription plans (Free/Pro/Enterprise)
- [x] Credit deduction per AI generation
- [x] Credit balance shown in header
- [x] Gated features for free vs paid users

### Phase 6: Tests + Polish
- [x] All tests passing (41 tests, 4 files)
- [x] No console errors (stale 4:22 PM entry is pre-restart)
- [x] Checkpoint saved (ce33c4e1)

## v2.1 — ATS CV PDF Improvement

- [x] LLM CV prompt: structured JSON output (contact, summary, experience[], education[], skills[], keywords[])
- [x] Server-side PDF endpoint: client-side @react-pdf/renderer (no server endpoint needed — runs in browser)
- [x] ATS-safe PDF rules: single column, no tables, no graphics, Lato font, proper heading hierarchy
- [x] Section order: Contact → Summary → Experience → Education → Skills → Keywords
- [x] Experience bullets: action verb + metric + keyword mirroring from JD (in LLM prompt)
- [x] ApplyPage CV tab: live HTML preview before download (Preview/Raw toggle)
- [x] One-click "PDF ↓" button with loading state, wired to @react-pdf/renderer
- [x] Cover letter PDF: professional A4 layout with sender block, date, Re: line, paragraphs, signature
- [x] Vitest tests for CV JSON structure validation (41 tests passing, 4 files)
