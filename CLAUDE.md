# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint
```

No test suite is configured. Utility scripts in the repo root:
- `node scripts/check_subscriptions.js` — subscription status checker
- `node scripts/test-trial.js` — trial expiry testing
- `node scripts/test-domain-config.js` — domain config validation

## Architecture Overview

**Multi-tenant SaaS hiring platform.** Companies sign up, post jobs, screen candidates via AI, run video interviews, and manage the full hiring pipeline. Billing is usage-based (wallet credits) with optional subscriptions.

### Tech Stack

- **Frontend/Backend:** Next.js 16 App Router (React 19, TypeScript strict mode)
- **Database:** PostgreSQL (Neon serverless) — raw SQL via `lib/database.ts` + Prisma client for type generation
- **AI:** OpenAI API (`@ai-sdk/openai`) for CV evaluation and question generation; Azure OpenAI Realtime API for video interviews
- **Payments:** Razorpay (primary), PayPal (secondary), Stripe (plumbed but not active)
- **Storage:** Vercel Blob for resumes/documents
- **UI:** shadcn/ui (Radix UI primitives) + Tailwind CSS v4

### Database Pattern

All database access goes through `lib/database.ts` using raw SQL (`neon` client). Prisma is used only for schema types, not query execution. The full schema is at `database/schema.sql` (2146 lines). Key table groups:

- `companies` / `company_domains` / `users` / `user_sessions` — multi-tenant auth
- `jobs` / `applications` / `candidates` / `candidate_evaluations` — hiring pipeline
- `talent_pool_candidates` — long-term candidate database
- `company_subscriptions` / `wallet_ledger` / `subscription_payments` — billing
- `conversations` / `messages` — recruiter↔candidate messaging
- `admin_sessions` — separate admin auth

### Authentication

Two independent auth systems:

1. **Company Users** — OTP-based email login. Sessions stored in `user_sessions` table. Session cookie validated on every request in `lib/database.ts`. Roles: `recruiter`, `hiring_manager`, `admin`, `director`.
2. **Admin/Support** — Email whitelist (`ADMIN_EMAILS`, `SUPPORT_EMAILS` env vars). SHA256 session tokens in `admin_sessions`. Cookie: `admin_session`. Validation in `lib/admin-auth.ts`.

Company identity is resolved from email domain via `company_domains` table. Global auth state lives in `contexts/auth-context.tsx`.

### Subdomain Routing (middleware.ts)

- `www.domain.com` → marketing pages (`/`, `/pricing`, `/about`, etc.)
- `app.domain.com` → application pages (`/login`, `/dashboard`, `/jobs`, etc.)
- `localhost:3000` → both routes combined (no subdomain enforcement in dev)
- Vercel preview deployments → both routes combined

`/dashboard` itself is a valid route, but nested routes like `/dashboard/jobs` are blocked — use `/jobs` directly.

### Billing & Credits

Usage-based wallet system tracked in `wallet_ledger`. Costs per operation are set via env vars:
- `COST_PER_CV_PARSING` (default ~$0.50)
- `COST_PER_10_QUESTIONS` (default ~$0.10)
- `COST_PER_VIDEO_MINUTE` (default ~$0.80)

`lib/auto-recharge.ts` handles automatic top-up. Trial period (9 days by default via `TRIAL_DAYS` env var) is enforced at the API layer, not middleware.

### AI Features

- **CV Evaluation** (`lib/cv-evaluator.ts`) — scores resumes against job requirements
- **Resume Parsing** (`lib/resume-parser.ts`) — extracts structured data from PDF/DOCX
- **Question Generation** — auto-generates interview questions per job (cost-tracked, stored in `job_questions`)
- **Video Interviews** — Azure OpenAI Realtime API + face-api.js facial recognition

### Vercel Serverless Quirks

Two known issues with fixes already in place:

1. **pdf-parse** — imports `lib/pdf-parse.js` directly (not the package index) to avoid an ENOENT crash caused by a debug block in the package
2. **Chromium (Puppeteer)** — `@sparticuz/chromium` binary is included in output file tracing for `/api/invoice/generate-pdf` via `next.config.mjs`; do not remove those `outputFileTracingIncludes` entries

`next.config.mjs` also marks `pdf-parse`, `mammoth`, `puppeteer-core`, and `@sparticuz/chromium` as `serverExternalPackages` — keep these if adding new heavy server-only libraries.

### Key Library Files

| File | Purpose |
|------|---------|
| `lib/database.ts` | All DB queries, user/company auth, session management |
| `lib/cv-evaluator.ts` | AI-powered CV scoring logic |
| `lib/resume-parser.ts` | PDF/DOCX text extraction and structuring |
| `lib/email-service.ts` | Nodemailer transports and email templates |
| `lib/auto-recharge.ts` | Subscription auto-renewal and wallet top-up |
| `lib/invoice-template.ts` | Invoice HTML template for PDF generation |
| `lib/admin-auth.ts` | Admin session validation |
| `lib/config.ts` | Pricing tiers and app-wide configuration |
| `lib/domain-config.ts` | Subdomain routing rules |

### Environment Variables

See `ENV_VARIABLES.md` for the full list. Critical groups:
- `DATABASE_URL` / `DIRECT_URL` — Neon pooled vs. direct connection
- `OPENAI_ADMIN_KEY` / `OPENAI_ORG_ID` — OpenAI
- `AZURE_OPENAI_API_KEY` + `NEXT_PUBLIC_AZURE_REALTIME_RTC_URL` — realtime interviews
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_*` — email (two SMTP configs: primary + contact/support)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob
- `ENCRYPTION_KEY` — base64 key for data encryption
- `ADMIN_EMAILS` / `SUPPORT_EMAILS` — comma-separated whitelists
