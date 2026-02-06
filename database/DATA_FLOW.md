# HireGenAI — Database Schema: Data Flow & Justification

## Pages That DO NOT Need Database Tables

| Page | Reason |
|------|--------|
| `/about` | Static marketing content, no forms or user input |
| `/pricing` | Static pricing tiers, no persistence needed |
| `/terms` | Static legal text |
| `/privacy` | Static legal text |
| `/demo-en` | Static demo page |
| `/roi` | Static ROI calculator (client-side only) |
| `/questionnaire-results` | Reads from `assessments` + `assessment_answers` tables (created by homepage) and localStorage; no new table needed |
| `/dashboard` | Pure display page — reads KPIs from `applications`, `job_postings`, `candidates`; no new table needed |

---

## Pages That NEED Database Tables

### 1. Homepage (`/`) — Assessment Section
**Tables:** `assessments`, `assessment_answers`

**Flow:**
```
User fills questionnaire → RecruitmentQuestionnaire component
  → POST /api/assessments/submit
    → INSERT INTO assessments (contact info, status, score)
    → INSERT INTO assessment_answers (per-question answers)
```

- **Anonymous users:** `user_id = NULL`, tracked via `session_id` (browser fingerprint)
- **Logged-in users:** `user_id` and `company_id` populated
- **Partial submissions:** `status = 'partial'`, answers saved incrementally
- **Completed:** `status = 'completed'`, `score` and `score_breakdown` calculated

---

### 2. Contact (`/contact`)
**Tables:** `contact_messages`

**Flow:**
```
Contact form submission → POST /api/contact
  → INSERT INTO contact_messages (name, email, company, subject, message)
  → status = 'new_lead'
```

Already implemented in `/api/contact/route.ts`.

---

### 3. Signup (`/signup`)
**Tables:** `companies`, `company_domains`, `company_addresses`, `users`, `user_roles`, `email_identities`, `otp_challenges`, `sessions`

**Flow:**
```
Step 1-3: Collect company info → stored in form state
Step 4: Email + OTP verification
  → POST /api/otp/send (INSERT INTO otp_challenges)
  → POST /api/otp/verify-code (validate OTP)
Step 5: Submit all
  → POST /api/signup/complete
    → Verify OTP hash in otp_challenges
    → INSERT INTO companies (full profile)
    → INSERT INTO company_domains (email domain)
    → INSERT INTO company_addresses (if provided)
    → INSERT INTO users (admin user)
    → INSERT INTO user_roles (role = 'admin')
    → INSERT INTO email_identities (verified email)
    → INSERT INTO sessions (new session)
    → UPDATE otp_challenges SET consumed_at = NOW()
```

---

### 4. Login (`/login`)
**Tables:** `users`, `otp_challenges`, `sessions`, `email_identities`

**Flow:**
```
Enter email → POST /api/otp/send-login
  → Look up user in users table
  → INSERT INTO otp_challenges
Enter OTP → POST /api/otp/verify-login
  → Validate against otp_challenges
  → UPDATE otp_challenges SET consumed_at
  → INSERT INTO sessions
  → Return user + company data
```

---

### 5. Jobs (`/jobs`)
**Tables:** `job_postings`

**Flow:**
```
"Post New Job" button → JobPostingForm modal (4 steps)
  → POST /api/jobs
    → INSERT INTO job_postings (all fields from form steps 1-4)
    → status = 'draft' (Save as Draft) or 'open' (Publish)

Job listing page → GET /api/jobs?company_id=...
  → SELECT from job_postings WHERE company_id = ?
  → Filter by status tabs (open, closed, onhold, cancelled, draft)
```

---

### 6. Candidates (`/candidate`)
**Tables:** `candidates`, `candidate_skills`, `applications`, `application_stage_history`

**Flow:**
```
Candidate applies → INSERT INTO candidates + INSERT INTO applications
  → current_stage = 'screening'

Pipeline progression (via CandidateActionDialog):
  Screening → AI Interview → Hiring Manager → Offer → Hired/Rejected

Each stage transition:
  → UPDATE applications SET current_stage = ?, [stage-specific fields]
  → INSERT INTO application_stage_history (audit trail)

Stage-specific data captured:
  screening:       cv_score, screening_date, screening_remarks
  ai_interview:    interview_score, technical/behavioral/communication scores, feedback
  hiring_manager:  hm_status, hm_rating, hm_feedback, hm_interview_date
  offer:           offer_amount, offer_bonus, offer_equity, offer_status, negotiation_rounds
  hired:           hire_date, start_date, background_check, reference_check, onboarding
  rejected:        rejection_reason, rejection_stage, rejected_at
```

---

### 7. Talent Pool (`/talent-pool`)
**Tables:** `talent_pool_entries`, `talent_pool_interactions`, `candidates`, `candidate_skills`

**Flow:**
```
Add candidate to pool → INSERT INTO candidates (if new)
                       → INSERT INTO talent_pool_entries

Log interaction → INSERT INTO talent_pool_interactions
  → UPDATE talent_pool_entries SET last_contacted = NOW()

Move to active application → INSERT INTO applications (linking to a job)
```

---

### 8. Messages (`/messages`)
**Tables:** `conversations`, `messages`

**Flow:**
```
Start conversation with candidate
  → INSERT INTO conversations (company_id, candidate_id)

Send message
  → INSERT INTO messages (conversation_id, sender_type, content)
  → UPDATE conversations SET last_message_at = NOW()

Load conversation list
  → SELECT from conversations JOIN messages (latest per conversation)
```

---

### 9. Delegation (`/delegation`)
**Tables:** `delegations`, `delegation_audit_logs`

**Flow:**
```
Delegate a job/application → INSERT INTO delegations
  → INSERT INTO delegation_audit_logs (action = 'created')

Revoke delegation → UPDATE delegations SET status = 'revoked'
  → INSERT INTO delegation_audit_logs (action = 'revoked')

Auto-expire → Cron/trigger: UPDATE delegations SET status = 'expired'
              WHERE end_date < NOW() AND status = 'active'
```

---

### 10. Support (`/support`)
**Tables:** `support_tickets`, `ticket_comments`

**Flow:**
```
Submit ticket → INSERT INTO support_tickets
  → type: support | feedback | bug_report | feature_request

Add comment → INSERT INTO ticket_comments

Update status → UPDATE support_tickets SET status = ?
```

---

### 11. Settings (`/settings`)
**Tables:** `users`, `companies`, `company_addresses`, `user_roles`, `subscriptions`, `payment_methods`, `invoices`, `notification_preferences`

**Flow:**
```
Profile tab:
  → UPDATE users SET full_name, bio, avatar_url, ...

Company tab:
  → UPDATE companies SET name, industry, website_url, ...
  → UPDATE company_addresses SET ...

User Management tab:
  → INSERT INTO users (invite new team member)
  → INSERT/UPDATE user_roles (assign/change roles)

Payment tab:
  → SELECT from subscriptions, payment_methods, invoices
  → INSERT/UPDATE payment_methods
  → (Invoices created by payment provider webhooks)

Notifications tab:
  → INSERT/UPDATE notification_preferences
```

---

## Entity Relationship Summary

```
companies
  ├── company_domains        (1:N)
  ├── company_addresses      (1:N)
  ├── users                  (1:N)
  │     ├── user_roles       (1:N)
  │     ├── sessions         (1:N)
  │     └── notification_preferences (1:1)
  ├── email_identities       (via principal_id)
  ├── otp_challenges         (via principal_id)
  ├── job_postings           (1:N)
  ├── candidates             (1:N)
  │     └── candidate_skills (1:N)
  ├── applications           (1:N, links job + candidate)
  │     └── application_stage_history (1:N)
  ├── talent_pool_entries    (1:N, links candidate)
  │     └── talent_pool_interactions (1:N)
  ├── conversations          (1:N, links candidate)
  │     └── messages         (1:N)
  ├── delegations            (1:N)
  │     └── delegation_audit_logs (1:N)
  ├── support_tickets        (1:N)
  │     └── ticket_comments  (1:N)
  ├── subscriptions          (1:N)
  ├── payment_methods        (1:N)
  ├── invoices               (1:N)
  ├── assessments            (1:N)
  │     └── assessment_answers (1:N)
  └── contact_messages       (standalone, no FK to company)
```

---

## Table Count: 27 tables + 15 enum types

| Group | Tables | Count |
|-------|--------|-------|
| Core (Auth & Users) | companies, company_domains, company_addresses, users, user_roles, email_identities, otp_challenges, sessions | 8 |
| Assessment | assessments, assessment_answers | 2 |
| Contact | contact_messages | 1 |
| Jobs | job_postings | 1 |
| Candidates & Pipeline | candidates, candidate_skills, applications, application_stage_history | 4 |
| Talent Pool | talent_pool_entries, talent_pool_interactions | 2 |
| Messaging | conversations, messages | 2 |
| Delegation | delegations, delegation_audit_logs | 2 |
| Support | support_tickets, ticket_comments | 2 |
| Billing | subscriptions, payment_methods, invoices | 3 |
| Settings | notification_preferences | 1 |
| **Total** | | **28** |

Every table is justified by real usage in the application. No speculative tables exist.
