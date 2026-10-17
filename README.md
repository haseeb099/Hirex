# Hirex: Job Application Agent

Hirex is a job search assistant for candidates. It searches for jobs, scores how well each one matches your profile with an LLM, generates tailored cover letters, and tracks your applications from draft to offer. It also keeps a memory of past outcomes, so future scoring and suggestions improve.

## Features

- **Profile:** store your skills, experience, preferred roles, salary expectations, and resume text.
- **Job search and scoring:** run the agent to search jobs and get an LLM match score (high, medium, or low) with reasoning for each one.
- **Cover letters:** generate a cover letter for any job and copy it with one click.
- **Application tracker:** move each application through Draft → Applied → Interview → Offer → Rejected, with inline notes.
- **Memory:** outcomes (Interview, Offer, Rejected) are saved automatically and used as context for future scoring. You can also add memories by hand.
- **Apply kit:** a per-application helper for preparing your application materials.
- **Billing:** Stripe checkout and webhook handling.
- **CV parsing:** extracts text from uploaded CVs.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI, React Hook Form, Zod
- **API:** tRPC (type-safe routes in `server/routers.ts` and `server/routers/`)
- **Database:** MySQL, with Drizzle ORM and migrations in `drizzle/`
- **Storage:** S3-compatible object storage via the AWS SDK
- **AI:** an LLM for job scoring and cover letters, called through the `BUILT_IN_FORGE_API_URL` endpoint
- **Payments:** Stripe
- **Testing:** Vitest

## Getting Started

### Prerequisites

- Node.js 18 or later
- pnpm (`npm install -g pnpm`)
- A MySQL database

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/haseeb099/Hirex.git
   cd Hirex
   pnpm install
   ```

2. Create your environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   `.env` is git-ignored. Do not commit it.

3. Apply the database migrations:

   ```bash
   pnpm db:push
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

   The app runs at `http://localhost:3000` (or the next free port).

### Scripts

```bash
pnpm dev        # development server with hot reload
pnpm build      # build the client and server
pnpm start      # run the production build
pnpm check      # TypeScript type check
pnpm test       # run tests with Vitest
pnpm format     # format with Prettier
```

## Project Structure

```
Hirex/
├── client/src/
│   ├── pages/            # Landing, Jobs, Applications, Profile, Memory, Dashboard, Pricing
│   ├── components/       # Shared UI and layout components
│   └── App.tsx           # Routes
├── server/
│   ├── routers.ts        # tRPC router (auth, profile, applications, memory, applyKit, billing)
│   ├── routers/jobs.ts   # Job search and import routes
│   ├── services/         # Job scoring
│   ├── db.ts             # Database access
│   ├── stripeWebhook.ts  # Stripe webhook handler
│   └── _core/            # Server bootstrap, auth, LLM, storage helpers
├── shared/               # Types and constants shared by client and server
├── drizzle/              # Database schema and migrations
└── todo.md               # Development checklist
```

## Environment Variables

See `.env.example` for the full list. The main ones are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string (required for `pnpm db:push`) |
| `JWT_SECRET` | Secret used to sign session cookies |
| `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID` | Login provider settings |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | LLM and platform API access |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing (optional) |
| `PORT` | Server port (defaults to 3000) |

## Testing

```bash
pnpm test
```

The test suite covers the job scorer, the apply kit, CV parsing, the job agent, and logout.

## Deployment

Build the app with `pnpm build` and start it with `pnpm start`. Set the environment variables above on your host, and make sure `DATABASE_URL` points at your production MySQL database before running `pnpm db:push`.

## License

Licensed under the [MIT License](LICENSE).

© 2026 Muhammad Haseeb Rafique

## Contact

Muhammad Haseeb Rafique
- **GitHub**: [haseeb099](https://github.com/haseeb099)
- **LinkedIn**: [haseeb-rafique-ab6532171](https://www.linkedin.com/in/haseeb-rafique-ab6532171/)
