-- ============================================================================
-- HireGenAI — Production-Grade PostgreSQL Schema
-- ============================================================================
-- Database: PostgreSQL 15+
-- Application: Next.js SaaS (Node.js backend)
-- 
-- Design Principles:
--   • Strong separation of concerns (auth, users, jobs, candidates, etc.)
--   • No god tables — each table has a single responsibility
--   • No speculative tables — every table justified by real UI/API usage
--   • Proper FK relationships with ON DELETE policies
--   • Indexes on all foreign keys and frequently queried columns
--   • UUID primary keys for distributed-safety
--   • timestamptz for all timestamps (timezone-aware)
--
-- Table Groups:
--   1. Enums & Types
--   2. Core: Companies & Users (auth, roles, sessions)
--   3. Homepage: Assessment / Questionnaire
--   4. Contact Form
--   5. Job Postings
--   6. Candidates & Applications (full pipeline)
--   7. Talent Pool
--   8. Messaging / Conversations
--   9. Delegation
--  10. Support Tickets
--  11. Billing & Subscriptions
--  12. Notification Preferences
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. ENUMS & CUSTOM TYPES
-- ============================================================================

-- Company size bands (used in signup and company profile)
-- Already referenced in lib/database.ts as company_size
CREATE TYPE company_size AS ENUM (
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees'
);

-- Principal type for multi-entity auth (users vs future service accounts)
CREATE TYPE principal_type AS ENUM ('user', 'service_account');

-- OTP purpose
CREATE TYPE otp_purpose AS ENUM ('login', 'signup', 'email_verification', 'password_reset');

-- Job posting status
CREATE TYPE job_status AS ENUM ('draft', 'open', 'closed', 'onhold', 'cancelled');

-- Job type
CREATE TYPE job_type AS ENUM ('Full-time', 'Part-time', 'Contract', 'Temporary');

-- Work mode
CREATE TYPE work_mode AS ENUM ('Remote', 'Hybrid', 'On-site');

-- Hiring priority
CREATE TYPE hiring_priority AS ENUM ('High', 'Medium', 'Low');

-- Application / pipeline stage
CREATE TYPE application_stage AS ENUM (
  'screening',
  'ai_interview',
  'hiring_manager',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
);

-- Offer status
CREATE TYPE offer_status AS ENUM (
  'not_sent',
  'sent',
  'under_review',
  'negotiating',
  'accepted',
  'declined'
);

-- Delegation status
CREATE TYPE delegation_status AS ENUM ('active', 'expired', 'revoked');

-- Support ticket status
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');

-- Support ticket priority
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'paused');

-- Contact message status
CREATE TYPE contact_message_status AS ENUM ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- Assessment submission status (for partial saves)
CREATE TYPE assessment_status AS ENUM ('partial', 'completed');

-- Talent pool candidate status
CREATE TYPE talent_pool_status AS ENUM ('active_interest', 'passive', 'not_interested', 'hired', 'archived');


-- ============================================================================
-- 2. CORE: COMPANIES & USERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2a. companies
-- WHY: Central entity for multi-tenant SaaS. Every user belongs to a company.
--      Created during signup (/signup → /api/signup/complete).
--      Stores company profile, legal info, OpenAI integration keys.
-- USED BY: signup, settings, dashboard, all company-scoped queries
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                        TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'active',     -- active, suspended, deleted
  verified                    BOOLEAN NOT NULL DEFAULT FALSE,
  description_md              TEXT,
  website_url                 TEXT,
  industry                    TEXT,
  size_band                   company_size,
  headquarters                TEXT,                               -- "city, state" derived from address
  phone_number                TEXT,
  primary_country             TEXT,                               -- ISO country code
  legal_company_name          TEXT,
  tax_id_ein                  TEXT,
  business_registration_number TEXT,
  openai_project_id           TEXT,
  openai_service_account_key  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_status ON companies (status);


-- ---------------------------------------------------------------------------
-- 2b. company_domains
-- WHY: Maps email domains to companies for automatic company detection
--      during login/signup. Referenced in lib/database.ts findOrCreateCompany.
-- ---------------------------------------------------------------------------
CREATE TABLE company_domains (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, domain)
);

CREATE INDEX idx_company_domains_domain ON company_domains (domain);
CREATE INDEX idx_company_domains_company_id ON company_domains (company_id);


-- ---------------------------------------------------------------------------
-- 2c. company_addresses
-- WHY: Stores company physical addresses collected during signup (step 2).
--      Supports multiple address types (primary, billing, etc.).
-- USED BY: signup, settings
-- ---------------------------------------------------------------------------
CREATE TABLE company_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  address_type    TEXT NOT NULL DEFAULT 'primary',    -- primary, billing, shipping
  street_address  TEXT NOT NULL,
  city            TEXT NOT NULL,
  state_province  TEXT NOT NULL,
  postal_code     TEXT NOT NULL,
  country         TEXT NOT NULL,                      -- ISO country code
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_addresses_company_id ON company_addresses (company_id);


-- ---------------------------------------------------------------------------
-- 2d. users
-- WHY: Core user table. Every authenticated person has a row here.
--      Created during signup or first login (findOrCreateUser in database.ts).
--      Stores profile info displayed in settings and across the app.
-- USED BY: login, signup, settings, dashboard, all user-scoped queries
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  job_title         TEXT,
  bio               TEXT,
  avatar_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'active',   -- active, invited, disabled
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_company_id ON users (company_id);
CREATE INDEX idx_users_status ON users (status);


-- ---------------------------------------------------------------------------
-- 2e. user_roles
-- WHY: RBAC — maps users to roles. Supports multiple roles per user.
--      Created during signup (admin role) and in settings (team management).
--      Roles: admin, recruiter, hiring_manager, viewer
-- USED BY: signup, settings (user management tab), delegation, middleware
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,                         -- admin, recruiter, hiring_manager, viewer
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role ON user_roles (role);


-- ---------------------------------------------------------------------------
-- 2f. email_identities
-- WHY: Links verified email addresses to principals (users or service accounts).
--      A user can have multiple verified emails. Created after OTP verification.
-- USED BY: signup, login (email lookup)
-- ---------------------------------------------------------------------------
CREATE TABLE email_identities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_type  principal_type NOT NULL,
  principal_id    UUID NOT NULL,                     -- references users.id (or future service_accounts.id)
  email           TEXT NOT NULL,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_email_identities_email ON email_identities (email);
CREATE INDEX idx_email_identities_principal ON email_identities (principal_type, principal_id);


-- ---------------------------------------------------------------------------
-- 2g. otp_challenges
-- WHY: Stores OTP codes for login and signup verification.
--      Tracks attempts, expiry, and consumption for security.
-- USED BY: /api/otp/send, /api/otp/send-login, /api/otp/verify-login,
--          /api/otp/verify, /api/signup/complete
-- ---------------------------------------------------------------------------
CREATE TABLE otp_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  principal_type  principal_type NOT NULL,
  principal_id    UUID,                              -- NULL for signup (user doesn't exist yet)
  purpose         otp_purpose NOT NULL,
  code_hash       TEXT NOT NULL,                     -- SHA-256 hash of the OTP code
  expires_at      TIMESTAMPTZ NOT NULL,
  max_tries       INT NOT NULL DEFAULT 5,
  tries_used      INT NOT NULL DEFAULT 0,
  consumed_at     TIMESTAMPTZ,                       -- set when OTP is successfully used
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_challenges_email_purpose ON otp_challenges (email, purpose);
CREATE INDEX idx_otp_challenges_expires_at ON otp_challenges (expires_at);


-- ---------------------------------------------------------------------------
-- 2h. sessions
-- WHY: Stores active user sessions with refresh tokens.
--      Created after successful login or signup.
-- USED BY: login, signup, auth middleware
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_type      principal_type NOT NULL,
  principal_id        UUID NOT NULL,                 -- references users.id
  refresh_token_hash  TEXT NOT NULL,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ
);

CREATE INDEX idx_sessions_principal ON sessions (principal_type, principal_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);


-- ============================================================================
-- 3. HOMEPAGE ASSESSMENT / QUESTIONNAIRE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3a. assessments
-- WHY: Stores assessment/questionnaire submissions from the homepage.
--      The RecruitmentQuestionnaire component submits to /api/assessments/submit.
--      Supports PARTIAL saves (anonymous users) and COMPLETED submissions.
--      Links to user_id when logged in, uses session_id for anonymous.
-- USED BY: homepage questionnaire, /questionnaire-results, dashboard analytics
-- ---------------------------------------------------------------------------
CREATE TABLE assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,  -- NULL for anonymous
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,      -- NULL for anonymous
  session_id      TEXT,                              -- browser session ID for anonymous tracking
  -- Contact info collected in questionnaire
  contact_name    TEXT,
  contact_email   TEXT,
  contact_company TEXT,
  contact_phone   TEXT,
  -- Assessment answers stored as JSON
  answers         JSONB,                             -- All assessment responses in JSON format
  -- Submission metadata
  status          assessment_status NOT NULL DEFAULT 'partial',
  score           NUMERIC(5,2),                      -- calculated overall score
  score_breakdown JSONB,                             -- { category: score } breakdown
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_user_id ON assessments (user_id);
CREATE INDEX idx_assessments_contact_email ON assessments (contact_email);
CREATE INDEX idx_assessments_session_id ON assessments (session_id);
CREATE INDEX idx_assessments_status ON assessments (status);




-- ============================================================================
-- 4. CONTACT FORM
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4a. contact_messages
-- WHY: Stores contact form submissions from /contact page.
--      Explicitly used in /api/contact/route.ts INSERT statement.
-- USED BY: /contact → /api/contact
-- ---------------------------------------------------------------------------
CREATE TABLE contact_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name           TEXT NOT NULL,
  work_email          TEXT NOT NULL,
  company_name        TEXT,
  phone_number        TEXT,
  subject             TEXT NOT NULL,
  message             TEXT NOT NULL,
  agreed_to_terms     BOOLEAN NOT NULL DEFAULT FALSE,
  status              contact_message_status NOT NULL DEFAULT 'new_lead',
  admin_notes         TEXT,
  interaction_summary TEXT,
  replied             BOOLEAN DEFAULT FALSE,
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_contact_messages_status ON contact_messages (status);
CREATE INDEX idx_contact_messages_work_email ON contact_messages (work_email);


-- ---------------------------------------------------------------------------
-- 4b. meeting_bookings
-- WHY: Stores meeting/demo booking requests from website.
-- USED BY: /demo, /api/meeting-bookings, /admin-hiregenai/customer-interaction
-- ---------------------------------------------------------------------------
CREATE TABLE meeting_bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name           TEXT NOT NULL,
  work_email          TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  phone_number        TEXT,
  meeting_date        DATE,
  meeting_time        TEXT,
  meeting_end_time    TEXT,
  duration_minutes    INT DEFAULT 30,
  timezone            TEXT DEFAULT 'India Standard Time',
  meeting_location    TEXT DEFAULT 'google-meet',
  meeting_link        TEXT,
  notes               TEXT,
  ip_address          TEXT,
  user_agent          TEXT,
  source              TEXT DEFAULT 'website',
  status              contact_message_status NOT NULL DEFAULT 'new_lead',
  admin_notes         TEXT,
  interaction_summary TEXT,
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_meeting_bookings_status ON meeting_bookings (status);
CREATE INDEX idx_meeting_bookings_meeting_date ON meeting_bookings (meeting_date);
CREATE INDEX idx_meeting_bookings_work_email ON meeting_bookings (work_email);
CREATE UNIQUE INDEX idx_meeting_bookings_unique_slot
  ON meeting_bookings (meeting_date, meeting_time)
  WHERE meeting_date IS NOT NULL
    AND meeting_time IS NOT NULL
    AND status NOT IN ('cancelled');


-- ---------------------------------------------------------------------------
-- 4b2. integration_settings
-- WHY: Stores OAuth tokens and integration configuration (e.g. Google Calendar).
-- USED BY: /api/google/*, /admin-hiregenai/customer-interaction
-- ---------------------------------------------------------------------------
CREATE TABLE integration_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_name      TEXT NOT NULL UNIQUE,
  access_token          TEXT,
  refresh_token         TEXT,
  token_expiry          TIMESTAMPTZ,
  calendar_connected    BOOLEAN NOT NULL DEFAULT false,
  calendar_id           TEXT,
  extra_data            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

CREATE INDEX idx_integration_settings_name ON integration_settings (integration_name);


-- ---------------------------------------------------------------------------
-- 4c. email_templates
-- WHY: Stores reusable email templates for customer communication.
-- USED BY: /api/email-templates, /admin-hiregenai/customer-interaction
-- ---------------------------------------------------------------------------
CREATE TABLE email_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX idx_email_templates_category ON email_templates (category);


-- ============================================================================
-- 5. JOB POSTINGS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5a. job_postings
-- WHY: Core table for job management. Created via JobPostingForm component.
--      Jobs page shows listing with statuses, pipeline stages, and metrics.
--      Each job belongs to a company and is managed by a recruiter.
-- USED BY: /jobs, /candidate (applications reference jobs), /dashboard (KPIs),
--          /delegation (delegate job ownership)
-- ---------------------------------------------------------------------------
CREATE TABLE job_postings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by                  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Basic info (Step 1 of JobPostingForm)
  title                       TEXT NOT NULL,
  department                  TEXT,
  location                    TEXT,
  job_type                    job_type NOT NULL DEFAULT 'Full-time',
  work_mode                   work_mode NOT NULL DEFAULT 'Hybrid',
  salary_min                  NUMERIC(12,2),
  salary_max                  NUMERIC(12,2),
  currency                    TEXT DEFAULT 'USD',
  application_deadline        DATE,
  expected_start_date         DATE,

  -- Job details (Step 2)
  description                 TEXT,
  responsibilities            TEXT[],                -- array of responsibility strings
  required_skills             TEXT[],
  preferred_skills            TEXT[],
  experience_years            INT,
  required_education          TEXT,
  certifications_required     TEXT,
  languages_required          TEXT,

  -- Team & planning (Step 3)
  recruiter_id                UUID REFERENCES users(id) ON DELETE SET NULL,
  hiring_manager_name         TEXT,
  hiring_manager_email        TEXT,
  number_of_openings          INT NOT NULL DEFAULT 1,
  hiring_priority             hiring_priority DEFAULT 'Medium',
  target_time_to_fill_days    INT,
  budget_allocated            NUMERIC(12,2),
  target_sources              TEXT[],                -- e.g. ['LinkedIn', 'GitHub', 'Referral']
  diversity_goals             BOOLEAN DEFAULT FALSE,
  diversity_target_pct        NUMERIC(5,2),

  -- Metrics & tracking (Step 4)
  job_open_date               DATE,
  expected_hires_per_month    INT,
  target_offer_acceptance_pct NUMERIC(5,2),
  candidate_response_sla_hrs  INT,
  interview_schedule_sla_hrs  INT,
  cost_per_hire_budget        NUMERIC(12,2),
  agency_fee_pct              NUMERIC(5,2),
  job_board_costs             NUMERIC(12,2),

  -- Status
  status                      job_status NOT NULL DEFAULT 'draft',
  published_at                TIMESTAMPTZ,
  closed_at                   TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_postings_company_id ON job_postings (company_id);
CREATE INDEX idx_job_postings_status ON job_postings (status);
CREATE INDEX idx_job_postings_recruiter_id ON job_postings (recruiter_id);
CREATE INDEX idx_job_postings_department ON job_postings (department);
CREATE INDEX idx_job_postings_created_at ON job_postings (created_at DESC);


-- ============================================================================
-- 6. CANDIDATES & APPLICATIONS (Full Recruitment Pipeline)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6a. candidates
-- WHY: Stores candidate profile data. A candidate can apply to multiple jobs.
--      Displayed on /candidate page and linked from talent pool.
--      Separate from users — candidates are external applicants.
-- USED BY: /candidate, /talent-pool, /dashboard, /messages
-- ---------------------------------------------------------------------------
CREATE TABLE candidates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  location        TEXT,
  current_company TEXT,
  current_title   TEXT,
  experience_years INT,
  linkedin_url    TEXT,
  resume_url      TEXT,                              -- S3/blob URL to uploaded CV
  source          TEXT,                              -- LinkedIn, Referral, Job Board, etc.
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_company_id ON candidates (company_id);
CREATE INDEX idx_candidates_email ON candidates (email);


-- ---------------------------------------------------------------------------
-- 6b. candidate_skills
-- WHY: Normalized skills for candidates (many-to-many via this join table).
--      Skills are shown on talent pool and candidate detail views.
-- USED BY: /talent-pool, /candidate
-- ---------------------------------------------------------------------------
CREATE TABLE candidate_skills (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_name    TEXT NOT NULL,

  UNIQUE (candidate_id, skill_name)
);

CREATE INDEX idx_candidate_skills_candidate_id ON candidate_skills (candidate_id);
CREATE INDEX idx_candidate_skills_skill_name ON candidate_skills (skill_name);


-- ---------------------------------------------------------------------------
-- 6c. applications
-- WHY: Tracks a candidate's application to a specific job through the pipeline.
--      The candidate page shows applications in buckets (screening → interview
--      → hiring manager → offer → hired/rejected). Each bucket transition
--      is captured by updating current_stage.
-- USED BY: /candidate (pipeline view), /jobs (applicant counts), /dashboard (KPIs)
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                  UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_id            UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Pipeline tracking
  current_stage           application_stage NOT NULL DEFAULT 'screening',
  applied_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CV Screening
  cv_score                NUMERIC(5,2),
  screening_date          DATE,
  screening_remarks       TEXT,

  -- AI Interview
  interview_status        TEXT DEFAULT 'Not Scheduled',  -- Not Scheduled, Scheduled, Completed, Expired
  interview_link          TEXT,
  interview_sent_at       TIMESTAMPTZ,
  interview_completed_at  TIMESTAMPTZ,
  interview_score         NUMERIC(5,2),
  technical_score         NUMERIC(5,2),
  behavioral_score        NUMERIC(5,2),
  communication_score     NUMERIC(5,2),
  interview_recommendation TEXT,                      -- Strongly Recommend, Recommend, On Hold, Reject
  interview_feedback      TEXT,

  -- Hiring Manager Review
  hm_status               TEXT,                       -- Waiting for HM feedback, Under Review, Approved, Rejected, OnHold
  hm_rating               INT CHECK (hm_rating BETWEEN 1 AND 5),
  hm_feedback             TEXT,
  hm_interview_date       DATE,
  hm_feedback_date        DATE,

  -- Offer
  offer_status            offer_status DEFAULT 'not_sent',
  offer_amount            NUMERIC(12,2),
  offer_bonus             NUMERIC(12,2),
  offer_equity            TEXT,
  offer_extended_date     DATE,
  offer_expiry_date       DATE,
  negotiation_rounds      INT DEFAULT 0,
  decline_reason          TEXT,

  -- Hired / Onboarding
  hire_date               DATE,
  start_date              DATE,
  background_check_status TEXT DEFAULT 'pending',     -- pending, inProgress, clear, issues
  reference_check_status  TEXT DEFAULT 'pending',     -- pending, inProgress, complete
  onboarding_status       TEXT,                       -- Awaiting Onboarding, In Progress, On Track, Behind, Complete
  onboarding_checklist    JSONB,                      -- { equipmentOrdered: bool, accountsCreated: bool, ... }

  -- Rejection (if rejected at any stage)
  rejection_reason        TEXT,
  rejection_stage         application_stage,
  rejected_at             TIMESTAMPTZ,

  -- General
  remarks                 TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_company_id ON applications (company_id);
CREATE INDEX idx_applications_job_id ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_applications_current_stage ON applications (current_stage);
CREATE INDEX idx_applications_offer_status ON applications (offer_status);
CREATE UNIQUE INDEX idx_applications_job_candidate ON applications (job_id, candidate_id);


-- ---------------------------------------------------------------------------
-- 6d. application_stage_history
-- WHY: Audit trail for every stage transition in an application.
--      Enables time-to-stage analytics on the dashboard.
-- USED BY: /candidate (timeline view), /dashboard (time-to-fill metrics)
-- ---------------------------------------------------------------------------
CREATE TABLE application_stage_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage      application_stage,
  to_stage        application_stage NOT NULL,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_stage_history_application_id ON application_stage_history (application_id);
CREATE INDEX idx_app_stage_history_created_at ON application_stage_history (created_at);


-- ============================================================================
-- 7. TALENT POOL
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7a. talent_pool_entries
-- WHY: Manages the talent pool — proactive candidate sourcing separate from
--      active job applications. Talent pool page shows candidates with status,
--      skills, and contact history. Links to candidates table.
-- USED BY: /talent-pool
-- ---------------------------------------------------------------------------
CREATE TABLE talent_pool_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status          talent_pool_status NOT NULL DEFAULT 'passive',
  added_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  source          TEXT,                              -- LinkedIn, Event, Referral, etc.
  notes           TEXT,
  last_contacted  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, candidate_id)
);

CREATE INDEX idx_talent_pool_company_id ON talent_pool_entries (company_id);
CREATE INDEX idx_talent_pool_status ON talent_pool_entries (status);
CREATE INDEX idx_talent_pool_candidate_id ON talent_pool_entries (candidate_id);


-- ---------------------------------------------------------------------------
-- 7b. talent_pool_interactions
-- WHY: Tracks contact history with talent pool candidates.
--      The talent pool page shows interaction timeline per candidate.
-- USED BY: /talent-pool (contact history section)
-- ---------------------------------------------------------------------------
CREATE TABLE talent_pool_interactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_pool_id    UUID NOT NULL REFERENCES talent_pool_entries(id) ON DELETE CASCADE,
  interaction_type  TEXT NOT NULL,                    -- email, call, meeting, linkedin_message
  summary           TEXT,
  contacted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  contacted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tp_interactions_pool_id ON talent_pool_interactions (talent_pool_id);


-- ============================================================================
-- 8. MESSAGING / CONVERSATIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8a. conversations
-- WHY: Represents a messaging thread between a recruiter and a candidate.
--      Messages page shows conversation list with last message preview.
-- USED BY: /messages
-- ---------------------------------------------------------------------------
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  subject         TEXT,
  last_message_at TIMESTAMPTZ,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_company_id ON conversations (company_id);
CREATE INDEX idx_conversations_candidate_id ON conversations (candidate_id);
CREATE INDEX idx_conversations_last_message_at ON conversations (last_message_at DESC);


-- ---------------------------------------------------------------------------
-- 8b. messages
-- WHY: Individual messages within a conversation.
--      Messages page shows full message thread with sender, content, timestamp.
-- USED BY: /messages
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL,                     -- 'user' or 'candidate'
  sender_id       UUID NOT NULL,                     -- users.id or candidates.id
  content         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_created_at ON messages (created_at);


-- ============================================================================
-- 9. DELEGATION
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 9a. delegations
-- WHY: Tracks delegation of job postings or applications from one user to
--      another. The delegation page shows active/expired delegations with
--      type, item, dates, and reason.
-- USED BY: /delegation
-- ---------------------------------------------------------------------------
CREATE TABLE delegations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delegation_type TEXT NOT NULL,                     -- 'job' or 'application'
  item_id         UUID NOT NULL,                     -- references job_postings.id or applications.id
  item_name       TEXT NOT NULL,                     -- denormalized for display
  delegated_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delegated_to    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason          TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE,
  status          delegation_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegations_company_id ON delegations (company_id);
CREATE INDEX idx_delegations_delegated_by ON delegations (delegated_by);
CREATE INDEX idx_delegations_delegated_to ON delegations (delegated_to);
CREATE INDEX idx_delegations_status ON delegations (status);


-- ---------------------------------------------------------------------------
-- 9b. delegation_audit_logs
-- WHY: Audit trail for delegation actions (created, revoked, expired, etc.).
--      Delegation page shows audit log timeline.
-- USED BY: /delegation (audit log tab)
-- ---------------------------------------------------------------------------
CREATE TABLE delegation_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,                     -- created, modified, revoked, expired, completed
  performed_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deleg_audit_delegation_id ON delegation_audit_logs (delegation_id);
CREATE INDEX idx_deleg_audit_created_at ON delegation_audit_logs (created_at);


-- ============================================================================
-- 10. SUPPORT TICKETS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10a. support_tickets
-- WHY: Stores support tickets and feedback submitted from /support page.
--      Users can submit bugs, feature requests, and general support tickets.
-- USED BY: /support
-- ---------------------------------------------------------------------------
CREATE TABLE support_tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ticket_type     TEXT NOT NULL,                     -- support, feedback, bug_report, feature_request
  category        TEXT,                              -- Account, Billing, Technical, AI Interview, etc.
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  status          ticket_status NOT NULL DEFAULT 'open',
  screenshot_url  TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_company_id ON support_tickets (company_id);
CREATE INDEX idx_support_tickets_created_by ON support_tickets (created_by);
CREATE INDEX idx_support_tickets_status ON support_tickets (status);
CREATE INDEX idx_support_tickets_priority ON support_tickets (priority);


-- ---------------------------------------------------------------------------
-- 10b. ticket_comments
-- WHY: Stores comments/replies on support tickets.
--      Support page shows comment thread per ticket.
-- USED BY: /support (ticket detail view)
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_role TEXT,                                  -- 'user', 'support_agent'
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);


-- ============================================================================
-- 11. BILLING & SUBSCRIPTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 11a. subscriptions
-- WHY: Tracks company subscription plans shown in settings (Payment tab).
--      Every company has at most one active subscription.
-- USED BY: /settings (payment section), middleware (feature gating)
-- ---------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name       TEXT NOT NULL,                     -- Free, Professional, Enterprise
  status          subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at       TIMESTAMPTZ,
  external_id     TEXT,                              -- Stripe subscription ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_company_id ON subscriptions (company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);


-- ---------------------------------------------------------------------------
-- 11b. payment_methods
-- WHY: Stores saved payment methods for a company (settings → payment tab).
--      Only stores tokenized references, never raw card numbers.
-- USED BY: /settings (payment section)
-- ---------------------------------------------------------------------------
CREATE TABLE payment_methods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  method_type     TEXT NOT NULL,                     -- card, bank_account
  last_four       TEXT,
  brand           TEXT,                              -- Visa, Mastercard, etc.
  exp_month       INT,
  exp_year        INT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  external_id     TEXT,                              -- Stripe payment method ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_company_id ON payment_methods (company_id);


-- ---------------------------------------------------------------------------
-- 11c. invoices
-- WHY: Stores billing history shown in settings (payment tab).
--      The settings page shows a table of past invoices with amounts and dates.
-- USED BY: /settings (billing history section)
-- ---------------------------------------------------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'paid',      -- draft, open, paid, void, uncollectible
  description     TEXT,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  external_id     TEXT,                              -- Stripe invoice ID
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_company_id ON invoices (company_id);
CREATE INDEX idx_invoices_subscription_id ON invoices (subscription_id);


-- ---------------------------------------------------------------------------
-- 11d. company_billing
-- WHY: Main billing/wallet table for each company. Tracks wallet balance,
--      spending, and auto-recharge settings for Razorpay/PayPal integration.
-- USED BY: /api/billing/*, PaymentCheckout component
-- ---------------------------------------------------------------------------
CREATE TABLE company_billing (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Wallet balance (prepaid credits)
  wallet_balance          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  
  -- Spending tracking
  current_month_spent     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_spent             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  
  -- Monthly spend cap (optional)
  monthly_spend_cap       NUMERIC(12,2),
  
  -- Auto-recharge settings
  auto_recharge_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recharge_amount    NUMERIC(12,2) DEFAULT 100.00,
  auto_recharge_threshold NUMERIC(12,2) DEFAULT 10.00,
  
  -- Billing status
  status                  TEXT NOT NULL DEFAULT 'trial',  -- trial, active, past_due, suspended
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (company_id)
);

CREATE INDEX idx_company_billing_company_id ON company_billing (company_id);
CREATE INDEX idx_company_billing_status ON company_billing (status);


-- ---------------------------------------------------------------------------
-- 11e. payment_transactions
-- WHY: All payment records (Razorpay/PayPal) for audit trail and verification.
--      Links to company_billing for wallet updates.
-- USED BY: /api/payment/verify, billing reports
-- ---------------------------------------------------------------------------
CREATE TABLE payment_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Payment provider info
  provider                TEXT NOT NULL,                  -- 'razorpay' or 'paypal'
  provider_order_id       TEXT,                           -- Razorpay order_id or PayPal order_id
  provider_payment_id     TEXT,                           -- Razorpay payment_id or PayPal capture_id
  provider_signature      TEXT,                           -- For verification
  
  -- Amount details
  amount                  NUMERIC(12,2) NOT NULL,         -- Amount in base currency (INR/USD)
  currency                TEXT NOT NULL DEFAULT 'INR',
  amount_in_paise         INTEGER,                        -- For Razorpay (amount * 100)
  
  -- Status
  status                  TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  
  -- Metadata
  description             TEXT,
  notes                   JSONB,
  
  -- Timestamps
  initiated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  failed_at               TIMESTAMPTZ,
  failure_reason          TEXT,
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_company_id ON payment_transactions (company_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions (provider);
CREATE INDEX idx_payment_transactions_status ON payment_transactions (status);
CREATE INDEX idx_payment_transactions_provider_payment_id ON payment_transactions (provider_payment_id);


-- ---------------------------------------------------------------------------
-- 11f. cv_parsing_usage
-- WHY: Track CV parsing usage for billing. Each CV parse is charged.
-- USED BY: /api/billing/usage, billing calculations
-- ---------------------------------------------------------------------------
CREATE TABLE cv_parsing_usage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                  UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  application_id          UUID REFERENCES applications(id) ON DELETE SET NULL,
  
  -- Usage details
  candidate_name          TEXT,
  cv_file_name            TEXT,
  cv_file_size            INTEGER,
  
  -- Cost
  cost                    NUMERIC(10,4) NOT NULL,         -- Cost charged for this parsing
  
  -- Timestamps
  parsed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cv_parsing_usage_company_id ON cv_parsing_usage (company_id);
CREATE INDEX idx_cv_parsing_usage_job_id ON cv_parsing_usage (job_id);
CREATE INDEX idx_cv_parsing_usage_parsed_at ON cv_parsing_usage (parsed_at);


-- ---------------------------------------------------------------------------
-- 11g. question_generation_usage
-- WHY: Track AI question generation usage for billing.
-- USED BY: /api/billing/usage, billing calculations
-- ---------------------------------------------------------------------------
CREATE TABLE question_generation_usage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                  UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  
  -- Usage details
  question_count          INTEGER NOT NULL,               -- Number of questions generated
  token_count             INTEGER,                        -- Tokens used (for cost calculation)
  
  -- Cost
  cost                    NUMERIC(10,4) NOT NULL,         -- Cost charged
  
  -- Timestamps
  generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_generation_usage_company_id ON question_generation_usage (company_id);
CREATE INDEX idx_question_generation_usage_job_id ON question_generation_usage (job_id);
CREATE INDEX idx_question_generation_usage_generated_at ON question_generation_usage (generated_at);


-- ---------------------------------------------------------------------------
-- 11h. video_interview_usage
-- WHY: Track video interview usage for billing. Charged per minute.
-- USED BY: /api/billing/usage, billing calculations
-- ---------------------------------------------------------------------------
CREATE TABLE video_interview_usage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                  UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  application_id          UUID REFERENCES applications(id) ON DELETE SET NULL,
  
  -- Usage details
  candidate_name          TEXT,
  duration_seconds        INTEGER NOT NULL,               -- Interview duration in seconds
  duration_minutes        NUMERIC(10,2),                  -- Duration in minutes (for display)
  
  -- Cost
  cost                    NUMERIC(10,4) NOT NULL,         -- Cost charged
  
  -- Timestamps
  interview_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_interview_usage_company_id ON video_interview_usage (company_id);
CREATE INDEX idx_video_interview_usage_job_id ON video_interview_usage (job_id);
CREATE INDEX idx_video_interview_usage_interview_date ON video_interview_usage (interview_date);


-- ============================================================================
-- 12. NOTIFICATION PREFERENCES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 12a. notification_preferences
-- WHY: Stores per-user notification settings from settings page.
--      Settings page shows toggles for email, push, and in-app notifications.
-- USED BY: /settings (notifications tab)
-- ---------------------------------------------------------------------------
CREATE TABLE notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_new_candidate BOOLEAN NOT NULL DEFAULT TRUE,
  email_interview_complete BOOLEAN NOT NULL DEFAULT TRUE,
  email_offer_update  BOOLEAN NOT NULL DEFAULT TRUE,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

CREATE INDEX idx_notification_prefs_user_id ON notification_preferences (user_id);


-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Auto-updates the updated_at column on every row modification.

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies',
      'users',
      'assessments',
      'job_postings',
      'applications',
      'candidates',
      'talent_pool_entries',
      'support_tickets',
      'subscriptions',
      'contact_messages',
      'meeting_bookings',
      'email_templates',
      'company_billing',
      'payment_transactions'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- BILLING HELPER FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function to initialize billing for a company (call on company creation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION initialize_company_billing(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  billing_id UUID;
BEGIN
  INSERT INTO company_billing (company_id, wallet_balance, status)
  VALUES (p_company_id, 0.00, 'trial')
  ON CONFLICT (company_id) DO NOTHING
  RETURNING id INTO billing_id;
  
  RETURN billing_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to add credits to wallet (after successful payment)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_wallet_credits(
  p_company_id UUID,
  p_amount NUMERIC,
  p_payment_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  -- Update wallet balance
  UPDATE company_billing
  SET 
    wallet_balance = wallet_balance + p_amount,
    status = CASE WHEN status = 'trial' OR status = 'past_due' THEN 'active' ELSE status END,
    updated_at = NOW()
  WHERE company_id = p_company_id
  RETURNING wallet_balance INTO new_balance;
  
  -- If no billing record exists, create one
  IF new_balance IS NULL THEN
    INSERT INTO company_billing (company_id, wallet_balance, status)
    VALUES (p_company_id, p_amount, 'active')
    RETURNING wallet_balance INTO new_balance;
  END IF;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to deduct from wallet (for usage charges)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_wallet_credits(
  p_company_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, message TEXT) AS $$
DECLARE
  current_balance NUMERIC;
  updated_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO current_balance
  FROM company_billing
  WHERE company_id = p_company_id;
  
  -- Check if sufficient balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, COALESCE(current_balance, 0.00), 'Insufficient wallet balance'::TEXT;
    RETURN;
  END IF;
  
  -- Deduct amount
  UPDATE company_billing
  SET 
    wallet_balance = wallet_balance - p_amount,
    current_month_spent = current_month_spent + p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE company_id = p_company_id
  RETURNING wallet_balance INTO updated_balance;
  
  RETURN QUERY SELECT TRUE, updated_balance, 'Success'::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 13. ADMIN SESSIONS & SETTINGS (from migrations)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 13a. admin_sessions
-- WHY: Tracks authenticated sessions for owner/admin access to HireGenAI admin panel
-- USED BY: /admin-hiregenai/* pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR(255) NOT NULL,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_owner_email ON admin_sessions(owner_email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);


-- ---------------------------------------------------------------------------
-- 13b. admin_settings
-- WHY: Key-value store for admin configurations (profit margin, feature toggles, etc.)
-- USED BY: /admin-hiregenai/settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_settings (key, value, description)
VALUES ('profit_margin', '20', 'Profit margin percentage applied to AI costs')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES ('anomaly_detection', 'true', 'Enable anomaly detection alerts')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value, description)
VALUES ('realtime_alerts', 'true', 'Enable real-time alert notifications')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 13c. admin_alerts
-- WHY: Tracks system alerts for admin dashboard (usage spikes, payment failures, etc.)
-- USED BY: /admin-hiregenai/anomalies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,     -- 'usage_spike', 'payment_failure', 'system_error', 'low_balance'
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'high', 'medium', 'low'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'resolved', 'dismissed'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts (status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON admin_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_company_id ON admin_alerts (company_id);


-- ============================================================================
-- 14. DELEGATIONS & ACCESS CONTROL (from migrations)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 14a. delegations
-- WHY: Tracks delegation of jobs/applications to other users for access control
-- USED BY: /delegation, /jobs, /candidate
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delegations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delegation_type TEXT NOT NULL,                     -- 'job' or 'application'
  item_id         UUID NOT NULL,                     -- references job_postings.id or applications.id
  item_name       TEXT NOT NULL,                     -- denormalized for display
  delegated_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delegated_to    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason          TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',    -- active, expired, revoked
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_company_id ON delegations (company_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegated_by ON delegations (delegated_by);
CREATE INDEX IF NOT EXISTS idx_delegations_delegated_to ON delegations (delegated_to);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations (status);
CREATE INDEX IF NOT EXISTS idx_delegations_item_id ON delegations (item_id);
CREATE INDEX IF NOT EXISTS idx_delegations_type ON delegations (delegation_type);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_delegations_access_control 
  ON delegations (delegated_to, delegation_type, status, start_date, end_date);


-- ---------------------------------------------------------------------------
-- 14b. delegation_audit_logs
-- WHY: Audit trail for delegation changes (created, revoked, expired)
-- USED BY: /admin-hiregenai/audit-logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delegation_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id   UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,                     -- created, revoked, expired
  performed_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleg_audit_delegation_id ON delegation_audit_logs (delegation_id);
CREATE INDEX IF NOT EXISTS idx_deleg_audit_created_at ON delegation_audit_logs (created_at);


-- ============================================================================
-- 15. TALENT POOL UPDATES (from migrations)
-- ============================================================================

-- Add missing columns to talent_pool_entries if they don't exist
ALTER TABLE talent_pool_entries ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE talent_pool_entries ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_talent_pool_added_by ON talent_pool_entries (added_by);
CREATE INDEX IF NOT EXISTS idx_talent_pool_application_id ON talent_pool_entries (application_id);


-- ============================================================================
-- 16. ASSESSMENT UPDATES (from migrations)
-- ============================================================================

-- Add missing columns to assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update answers column default
UPDATE assessments SET answers = '{}' WHERE answers IS NULL;
ALTER TABLE assessments ALTER COLUMN answers SET DEFAULT '{}';

-- Create GIN index for JSON queries
CREATE INDEX IF NOT EXISTS idx_assessments_answers ON assessments USING GIN (answers);


-- ============================================================================
-- 17. CONTACT MESSAGES UPDATES (from migrations)
-- ============================================================================

-- Add missing columns to contact_messages
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS interaction_summary TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create triggers for contact_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contact_messages') THEN
    CREATE TRIGGER set_updated_at_contact_messages 
      BEFORE UPDATE ON contact_messages 
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END;
$$;


-- ============================================================================
-- 18. MEETING BOOKINGS UPDATES (from migrations)
-- ============================================================================

-- Add missing columns to meeting_bookings if they don't exist
ALTER TABLE meeting_bookings ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create trigger for meeting_bookings if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_meeting_bookings') THEN
    CREATE TRIGGER set_updated_at_meeting_bookings 
      BEFORE UPDATE ON meeting_bookings 
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END;
$$;


-- ============================================================================
-- 19. EMAIL TEMPLATES UPDATES (from migrations)
-- ============================================================================

-- Create trigger for email_templates if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_email_templates') THEN
    CREATE TRIGGER set_updated_at_email_templates 
      BEFORE UPDATE ON email_templates 
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END;
$$;


-- ============================================================================
-- 20. JOB POSTINGS UPDATES (from migrations)
-- ============================================================================

-- Add index for created_by (from delegation_access_control migration)
CREATE INDEX IF NOT EXISTS idx_job_postings_created_by ON job_postings (created_by);


-- ============================================================================
-- 21. AUTO-EXPIRE DELEGATIONS (from migrations)
-- ============================================================================

-- Auto-expire delegations whose end_date has passed
UPDATE delegations 
SET status = 'expired' 
WHERE status = 'active' 
  AND end_date < CURRENT_DATE;


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
