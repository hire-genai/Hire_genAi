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
CREATE EXTENSION IF NOT EXISTS "citext";


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
CREATE TYPE otp_purpose AS ENUM ('login', 'signup', 'email_verification', 'password_reset', 'admin_login');

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

-- Candidate source type
CREATE TYPE candidate_source_type AS ENUM ('Direct', 'Agency', 'Employee Referral');

-- Ledger entry type for billing
CREATE TYPE ledger_entry_type AS ENUM ('CV_PARSE', 'JD_QUESTIONS', 'VIDEO_INTERVIEW', 'WALLET_TOPUP', 'AUTO_RECHARGE', 'REFUND');

-- Salary period
CREATE TYPE salary_period AS ENUM ('monthly', 'yearly');


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
  slug                        TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_status ON companies (status);
CREATE UNIQUE INDEX idx_companies_slug ON companies (slug);


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

  -- Interview settings
  auto_schedule_interview     BOOLEAN DEFAULT FALSE,
  interview_link_expiry_hours INT DEFAULT 48,
  
  -- Screening questions
  enable_screening_questions  BOOLEAN DEFAULT FALSE,
  screening_questions         JSONB DEFAULT '{"minExperience": null, "expectedSalary": null, "expectedSkills": [], "noticePeriodNegotiable": null}'::JSONB,
  
  -- Status
  status                      job_status NOT NULL DEFAULT 'draft',
  on_hold_reason              TEXT,                                -- Reason for on_hold: TRIAL_EXPIRED, MANUAL, etc.
  published_at                TIMESTAMPTZ,
  closed_at                   TIMESTAMPTZ,
  
  -- Agency/Client info
  client_company_name         TEXT,
  
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN job_postings.job_open_date IS 'Automatically set to current date when job is published';

CREATE INDEX idx_job_postings_company_id ON job_postings (company_id);
CREATE INDEX idx_job_postings_status ON job_postings (status);
CREATE INDEX idx_job_postings_recruiter_id ON job_postings (recruiter_id);
CREATE INDEX idx_job_postings_department ON job_postings (department);
CREATE INDEX idx_job_postings_created_at ON job_postings (created_at DESC);
CREATE INDEX idx_job_postings_on_hold_reason ON job_postings (on_hold_reason) WHERE on_hold_reason IS NOT NULL;


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
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name               TEXT NOT NULL,
  email                   TEXT NOT NULL,
  first_name              TEXT,
  last_name               TEXT,
  photo_url               TEXT,
  phone                   TEXT,
  location                TEXT,
  current_company         TEXT,
  current_title           TEXT,
  experience_years        TEXT,
  linkedin_url            TEXT,
  resume_url              TEXT,
  source                  TEXT,
  notes                   TEXT,
  source_type             candidate_source_type,
  sub_source              TEXT,
  agency_name             TEXT,
  referral_employee_name  TEXT,
  referral_employee_email TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  -- Additional candidate info
  expected_salary         NUMERIC(12,2),
  salary_currency         TEXT DEFAULT 'USD',
  salary_period           TEXT DEFAULT 'month',
  location                TEXT,
  linkedin_url            TEXT,
  portfolio_url           TEXT,
  available_start_date    DATE,
  willing_to_relocate     BOOLEAN DEFAULT FALSE,
  languages               JSONB,
  photo_url               TEXT,
  cover_letter            TEXT,
  source                  TEXT DEFAULT 'direct_application',
  confirmation_status     TEXT,
  
  -- AI/CV Analysis
  resume_text             TEXT,
  ai_cv_score             NUMERIC(5,2),
  is_qualified            BOOLEAN,
  qualification_explanations JSONB,

  -- General
  remarks                 TEXT,
  offer_currency          TEXT DEFAULT 'USD',
  quality_of_hire_rating  JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE applications IS 'Tracks candidate applications through the recruitment pipeline';
COMMENT ON COLUMN applications.quality_of_hire_rating IS 'Quality of Hire data in JSON format: {rating: 1-5, employmentStatus: "Still with the Firm"|"Left the Firm"}';

CREATE INDEX idx_applications_company_id ON applications (company_id);
CREATE INDEX idx_applications_job_id ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_applications_current_stage ON applications (current_stage);
CREATE INDEX idx_applications_offer_status ON applications (offer_status);
CREATE INDEX idx_applications_offer_currency ON applications (offer_currency);
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


-- ---------------------------------------------------------------------------
-- 6e. interviews
-- WHY: Tracks AI interview details for each application
-- USED BY: /candidate, /api/interviews
-- ---------------------------------------------------------------------------
CREATE TABLE interviews (
  id                                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id                      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  interview_status                    TEXT DEFAULT 'Not Scheduled',
  interview_link                      TEXT,
  interview_sent_at                   TIMESTAMPTZ,
  interview_completed_at              TIMESTAMPTZ,
  interview_score                     NUMERIC(5,2),
  interview_evaluations               JSONB DEFAULT '{}'::JSONB,
  interview_recommendation            TEXT,
  interview_summary                   TEXT,
  interview_feedback                  TEXT,
  during_interview_screenshot         TEXT,
  during_interview_screenshot_captured_at TIMESTAMPTZ,
  post_interview_photo_url            TEXT,
  post_interview_photo_captured_at    TIMESTAMPTZ,
  verification_photo_url              TEXT,
  photo_verified                      BOOLEAN,
  photo_match_score                   NUMERIC(5,4),
  verified_at                         TIMESTAMPTZ,
  on_hold_reason                      TEXT,                                -- Reason for on_hold: TRIAL_EXPIRED, MANUAL, etc.
  original_status                     TEXT,                                -- Original status before on_hold (for restoration)
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_interviews_application_id ON interviews (application_id);
CREATE INDEX idx_interviews_completed_at ON interviews (interview_completed_at);
CREATE INDEX idx_interviews_on_hold_reason ON interviews (on_hold_reason) WHERE on_hold_reason IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 6f. screening_otps
-- WHY: OTP verification for screening submissions
-- USED BY: /api/screening
-- ---------------------------------------------------------------------------
CREATE TABLE screening_otps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  application_id  UUID NOT NULL,
  otp             TEXT NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (email, application_id)
);

CREATE INDEX idx_screening_otps_email ON screening_otps (email);
CREATE INDEX idx_screening_otps_expires_at ON screening_otps (expires_at);


-- ---------------------------------------------------------------------------
-- 6g. screening_submissions
-- WHY: Stores pre-screening form submissions before application creation
-- USED BY: /api/screening, job application flow
-- ---------------------------------------------------------------------------
CREATE TABLE screening_submissions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                      UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_name              TEXT NOT NULL,
  candidate_email             TEXT NOT NULL,
  experience_years            TEXT,
  expected_salary             NUMERIC(12,2),
  notice_period               TEXT,
  notice_period_negotiable    BOOLEAN,
  work_authorization          TEXT,
  selected_skills             TEXT[] DEFAULT '{}'::TEXT[],
  additional_info             TEXT,
  is_eligible                 BOOLEAN DEFAULT FALSE NOT NULL,
  reason                      TEXT,
  non_eligible_reasons        TEXT[] DEFAULT '{}'::TEXT[],
  matched_skills_count        INT DEFAULT 0,
  required_skills_count       INT DEFAULT 0,
  recruiter_min_experience    INT,
  recruiter_max_salary        NUMERIC(12,2),
  recruiter_expected_skills   TEXT[] DEFAULT '{}'::TEXT[],
  recruiter_work_authorization TEXT,
  submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screening_submissions_job_id ON screening_submissions (job_id);
CREATE INDEX idx_screening_submissions_email ON screening_submissions (candidate_email);
CREATE INDEX idx_screening_submissions_submitted_at ON screening_submissions (submitted_at);


-- ---------------------------------------------------------------------------
-- 6h. job_interview_questions
-- WHY: Stores AI-generated interview questions for each job
-- USED BY: /api/jobs/[id]/questions, interview flow
-- ---------------------------------------------------------------------------
CREATE TABLE job_interview_questions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  selected_criteria JSONB DEFAULT '[]'::JSONB NOT NULL,
  questions         JSONB DEFAULT '[]'::JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (job_id)
);

CREATE INDEX idx_job_interview_questions_job_id ON job_interview_questions (job_id);


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
  skills          TEXT,                              -- Skills as comma-separated string (matches UAT)
  application_id  UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, candidate_id)
);

CREATE INDEX idx_talent_pool_company_id ON talent_pool_entries (company_id);
CREATE INDEX idx_talent_pool_status ON talent_pool_entries (status);
CREATE INDEX idx_talent_pool_candidate_id ON talent_pool_entries (candidate_id);
CREATE INDEX idx_talent_pool_application_id ON talent_pool_entries (application_id);
CREATE INDEX idx_talent_pool_skills ON talent_pool_entries USING GIN (to_tsvector('english', skills));


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
  end_date        DATE NOT NULL,                     -- Made NOT NULL to match UAT
  status          TEXT NOT NULL DEFAULT 'active',    -- Changed from delegation_status to TEXT
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegations_company_id ON delegations (company_id);
CREATE INDEX idx_delegations_delegated_by ON delegations (delegated_by);
CREATE INDEX idx_delegations_delegated_to ON delegations (delegated_to);
CREATE INDEX idx_delegations_status ON delegations (status);
CREATE INDEX idx_delegations_access_control ON delegations (delegated_to, delegation_type, status, start_date, end_date);
CREATE INDEX idx_delegations_dates ON delegations (start_date, end_date);
CREATE INDEX idx_delegations_item_id ON delegations (item_id);
CREATE INDEX idx_delegations_type ON delegations (delegation_type);


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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX idx_support_tickets_created_at ON support_tickets (created_at);
CREATE INDEX idx_support_tickets_ticket_type ON support_tickets (ticket_type);
CREATE INDEX idx_support_tickets_admin_query ON support_tickets (status, priority, updated_at);


-- ---------------------------------------------------------------------------
-- 10b. ticket_comments
-- WHY: Stores comments/replies on support tickets.
--      Support page shows comment thread per ticket.
-- USED BY: /support (ticket detail view)
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_role TEXT,                                  -- 'user', 'support_agent'
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url   TEXT                                    -- Image attachment for comments (matches UAT)
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);
CREATE INDEX idx_ticket_comments_author_id ON ticket_comments (author_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments (created_at);


-- ============================================================================
-- 11. BILLING & SUBSCRIPTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- REMOVED: subscriptions table (not used in code)
-- All subscription data now stored in company_subscriptions table below


-- ---------------------------------------------------------------------------
-- 11c. payment_methods (SAVED PAYMENT METHODS)
-- WHY: Stores saved payment methods for a company (settings → payment tab).
--      Only stores tokenized references, never raw card numbers.
-- USED BY: /settings (payment section), future payment updates
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
  current_month_start     TIMESTAMPTZ,
  total_spent             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  
  -- Monthly spend cap (optional)
  monthly_spend_cap       NUMERIC(12,2),
  
  -- Auto-recharge settings
  auto_recharge_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recharge_amount    NUMERIC(12,2) DEFAULT 100.00,
  auto_recharge_threshold NUMERIC(12,2) DEFAULT 10.00,
  
  -- Trial tracking (7-day free trial)
  -- trial_ends_at is calculated as company.created_at + 7 days
  -- Trial only ends when: (1) trial_ends_at passes, OR (2) successful payment made
  trial_ends_at           TIMESTAMPTZ,
  
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
-- 11f. subscription_payments
-- WHY: Track subscription payments from various providers (Stripe, Razorpay, etc.)
-- USED BY: billing system, payment verification
-- ---------------------------------------------------------------------------
CREATE TABLE subscription_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     VARCHAR(255),                           -- Subscription reference
  provider            VARCHAR(50) NOT NULL,                   -- stripe, razorpay, paypal
  payment_id          VARCHAR(255) NOT NULL,                  -- Provider payment ID
  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(10),
  status              VARCHAR(50),                            -- success, failed, pending
  payment_time        TIMESTAMPTZ,
  raw_data            JSONB,                                  -- Full provider response
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT subscription_payments_payment_id_provider_key UNIQUE (payment_id, provider)
);

CREATE INDEX idx_subscription_payments_subscription_id ON subscription_payments (subscription_id);
CREATE INDEX idx_subscription_payments_provider ON subscription_payments (provider);
CREATE INDEX idx_subscription_payments_status ON subscription_payments (status);
CREATE UNIQUE INDEX subscription_payments_payment_id_provider_key ON subscription_payments (payment_id, provider);
CREATE UNIQUE INDEX subscription_payments_pkey ON subscription_payments (id);


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


-- ---------------------------------------------------------------------------
-- 11i. usage_ledger
-- WHY: Comprehensive ledger for all billing transactions (usage + wallet operations)
-- USED BY: /api/billing/ledger, billing reports
-- ---------------------------------------------------------------------------
CREATE TABLE usage_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  entry_type      ledger_entry_type NOT NULL,
  description     TEXT,
  quantity        INT DEFAULT 1,
  unit_price      NUMERIC(10,4) DEFAULT 0,
  amount          NUMERIC(10,4) DEFAULT 0 NOT NULL,
  balance_before  NUMERIC(12,2),
  balance_after   NUMERIC(12,2),
  reference_id    UUID,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_ledger_company_id ON usage_ledger (company_id);
CREATE INDEX idx_usage_ledger_job_id ON usage_ledger (job_id);
CREATE INDEX idx_usage_ledger_entry_type ON usage_ledger (entry_type);
CREATE INDEX idx_usage_ledger_created_at ON usage_ledger (created_at DESC);


-- ---------------------------------------------------------------------------
-- 11j. agency_client_connections
-- WHY: Tracks agency-client relationships for recruitment agencies
-- USED BY: /api/agency, agency management
-- ---------------------------------------------------------------------------
CREATE TABLE agency_client_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('Agency', 'Client')),
  name            TEXT NOT NULL,
  contact_person  TEXT,
  email           TEXT,
  rate_type       TEXT CHECK (rate_type IN ('Fixed', '%')),
  rate            TEXT,
  role            TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agency_client_company_id ON agency_client_connections (company_id);
CREATE INDEX idx_agency_client_type ON agency_client_connections (connection_type);
CREATE INDEX idx_agency_client_status ON agency_client_connections (status);
CREATE UNIQUE INDEX agency_client_connections_pkey ON agency_client_connections (id);


-- ---------------------------------------------------------------------------
-- 11a. company_subscriptions (MAIN SUBSCRIPTION TABLE)
-- WHY: Tracks all subscription data for companies (Razorpay, Stripe, etc.)
--      This is the primary table for subscription management.
-- USED BY: All subscription APIs, webhooks, billing system
-- ---------------------------------------------------------------------------
CREATE TABLE company_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider          VARCHAR(50) NOT NULL,
  subscription_id   VARCHAR(255) NOT NULL,
  plan_id           VARCHAR(255),
  status            VARCHAR(50),
  subscriber_email  VARCHAR(255),
  start_time        TIMESTAMPTZ,
  next_billing_time TIMESTAMPTZ,
  subscription_link VARCHAR(500),
  raw_data          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (company_id, provider)
);

CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions (company_id);
CREATE INDEX idx_company_subscriptions_provider ON company_subscriptions (provider);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions (status);
CREATE INDEX idx_company_subscriptions_subscription_link ON company_subscriptions (subscription_link);


-- ---------------------------------------------------------------------------
-- 11b. subscription_payments (PAYMENT HISTORY)
-- WHY: Tracks individual payment transactions for subscriptions
--      Stores payment history, amounts, and provider responses.
-- USED BY: Webhooks, billing reports, payment verification
-- ---------------------------------------------------------------------------
CREATE TABLE subscription_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id VARCHAR(255),
  provider        VARCHAR(50),
  payment_id      VARCHAR(255),
  amount          NUMERIC(10,2),
  currency        VARCHAR(10),
  status          VARCHAR(50),
  payment_time    TIMESTAMPTZ,
  raw_data        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (payment_id, provider)
);

CREATE INDEX idx_subscription_payments_subscription_id ON subscription_payments (subscription_id);
CREATE INDEX idx_subscription_payments_provider ON subscription_payments (provider);
CREATE INDEX idx_subscription_payments_status ON subscription_payments (status);


-- ---------------------------------------------------------------------------
-- 11m. webhook_logs
-- WHY: Logs all incoming webhooks for debugging and audit
-- USED BY: /api/webhooks/*, debugging
-- ---------------------------------------------------------------------------
CREATE TABLE webhook_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider    VARCHAR(50),
  event_type  VARCHAR(100),
  event_id    VARCHAR(255),
  raw_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_provider ON webhook_logs (provider);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs (event_type);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs (created_at DESC);


-- ---------------------------------------------------------------------------
-- 11n. contact_leads
-- WHY: Enhanced contact form with detailed company information
-- USED BY: /contact, /api/contact-leads
-- ---------------------------------------------------------------------------
CREATE TABLE contact_leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name    VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255) NOT NULL,
  mobile          VARCHAR(50) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  company_size    VARCHAR(50) NOT NULL,
  industry        VARCHAR(100) NOT NULL,
  tools           TEXT[],
  pain_points     TEXT,
  budget          VARCHAR(100),
  timeline        VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_leads_email ON contact_leads (email);
CREATE INDEX idx_contact_leads_company_name ON contact_leads (company_name);
CREATE INDEX idx_contact_leads_created_at ON contact_leads (created_at DESC);


-- ---------------------------------------------------------------------------
-- 11o. monthly_hiring_targets
-- WHY: Stores monthly hiring capacity targets for companies
-- USED BY: /api/settings, dashboard analytics
-- ---------------------------------------------------------------------------
CREATE TABLE monthly_hiring_targets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hiring_per_month        INT,
  team_capacity_per_month INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (company_id)
);

CREATE INDEX idx_monthly_hiring_targets_company_id ON monthly_hiring_targets (company_id);


-- ---------------------------------------------------------------------------
-- 11p. performance_settings
-- WHY: Stores company-level performance targets and KPI settings
-- USED BY: /api/settings, dashboard KPIs
-- ---------------------------------------------------------------------------
CREATE TABLE performance_settings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_offer_acceptance_rate NUMERIC(5,2),
  interview_schedule_sla      INT,
  cost_per_hire_budget        NUMERIC(12,2),
  job_board_costs             NUMERIC(12,2),
  hiring_per_month            INT DEFAULT 7,
  cost_currency               TEXT DEFAULT 'USD',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (company_id)
);

CREATE INDEX idx_performance_settings_company_id ON performance_settings (company_id);
CREATE UNIQUE INDEX performance_settings_company_id_key ON performance_settings (company_id);
CREATE UNIQUE INDEX performance_settings_pkey ON performance_settings (id);


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
      'payment_transactions',
      'interviews',
      'job_interview_questions',
      'agency_client_connections',
      'company_subscriptions',
      'contact_leads',
      'monthly_hiring_targets',
      'performance_settings'
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
-- APPLICATION TRIGGERS FOR TALENT POOL MANAGEMENT
-- ============================================================================

-- Trigger to add rejected candidates to talent pool
CREATE TRIGGER trigger_add_rejected_to_talent_pool
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION add_rejected_candidate_to_talent_pool();

-- Trigger to update talent pool status based on application changes
CREATE TRIGGER trigger_update_talent_pool_from_application
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_pool_from_application();


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


-- ---------------------------------------------------------------------------
-- Function to update candidate screening updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_candidate_screening_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to update company OpenAI project ID
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_company_openai_project_id(
  company_id UUID,
  project_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE companies 
  SET openai_project_id = project_id,
      updated_at = NOW()
  WHERE id = company_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to update job usage summary (aggregates usage across tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_job_usage_summary(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
  v_company_id uuid;
  v_cv_count int;
  v_cv_cost decimal(10,2);
  v_question_count int;
  v_token_count int;
  v_question_cost decimal(10,2);
  v_interview_count int;
  v_interview_minutes decimal(10,2);
  v_interview_cost decimal(10,2);
  v_total_cost decimal(10,2);
BEGIN
  -- Get company_id for this job
  SELECT company_id INTO v_company_id FROM job_postings WHERE id = p_job_id;
  
  -- Calculate CV parsing stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(cost), 0)
  INTO 
    v_cv_count,
    v_cv_cost
  FROM cv_parsing_usage
  WHERE job_id = p_job_id;
  
  -- Calculate question generation stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(token_count), 0),
    COALESCE(SUM(cost), 0)
  INTO 
    v_question_count,
    v_token_count,
    v_question_cost
  FROM question_generation_usage
  WHERE job_id = p_job_id;
  
  -- Calculate video interview stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(duration_minutes), 0),
    COALESCE(SUM(cost), 0)
  INTO 
    v_interview_count,
    v_interview_minutes,
    v_interview_cost
  FROM video_interview_usage
  WHERE job_id = p_job_id;
  
  -- Calculate total cost
  v_total_cost := v_cv_cost + v_question_cost + v_interview_cost;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to update meeting bookings updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_meeting_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to update question generation usage updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_question_generation_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to reset monthly spend at start of new month
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_monthly_spend()
RETURNS VOID AS $$
BEGIN
  UPDATE company_billing
  SET 
    current_month_spent = 0,
    current_month_start = date_trunc('month', now())
  WHERE 
    current_month_start IS NULL 
    OR current_month_start < date_trunc('month', now());
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to add rejected candidates to talent pool
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_rejected_candidate_to_talent_pool()
RETURNS TRIGGER AS $$
BEGIN
  -- When application is rejected, add candidate to talent pool if not already there
  IF TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage 
     AND NEW.current_stage = 'rejected' THEN
      
    INSERT INTO talent_pool_entries (
      company_id,
      candidate_id,
      status,
      source,
      notes,
      last_contacted,
      created_at,
      updated_at
    ) VALUES (
      NEW.company_id,
      NEW.candidate_id,
      'not_interested',
      'rejected_candidate',
      'Automatically added from rejected application',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (company_id, candidate_id) 
    DO UPDATE SET
      status = 'not_interested',
      last_contacted = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function to update talent pool status based on application changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_talent_pool_from_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Update talent pool status when application changes
  IF TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    -- If application is rejected, update talent pool to 'not_interested'
    IF NEW.current_stage = 'rejected' THEN
      UPDATE talent_pool_entries tpe
      SET status = 'not_interested',
          last_contacted = NOW(),
          updated_at = NOW()
      WHERE tpe.candidate_id = NEW.candidate_id 
        AND tpe.company_id = NEW.company_id;
    
    -- If application is hired, update talent pool to 'hired'
    ELSIF NEW.current_stage = 'hired' THEN
      UPDATE talent_pool_entries tpe
      SET status = 'hired',
          last_contacted = NOW(),
          updated_at = NOW()
      WHERE tpe.candidate_id = NEW.candidate_id 
        AND tpe.company_id = NEW.company_id;
    
    -- If application moves to interview, update talent pool to 'active_interest'
    ELSIF NEW.current_stage IN ('ai_interview', 'hiring_manager', 'offer') THEN
      UPDATE talent_pool_entries tpe
      SET status = 'active_interest',
          last_contacted = NOW(),
          updated_at = NOW()
      WHERE tpe.candidate_id = NEW.candidate_id 
        AND tpe.company_id = NEW.company_id
        AND tpe.status != 'hired';
    END IF;
  END IF;
  
  RETURN NEW;
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

COMMENT ON TABLE admin_sessions IS 'Stores authenticated sessions for owner/admin access to HireGenAI admin panel';

CREATE INDEX IF NOT EXISTS idx_admin_sessions_owner_email ON admin_sessions(owner_email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);


-- ---------------------------------------------------------------------------
-- 13b. admin_settings
-- WHY: Key-value store for admin configurations (profit margin, feature toggles, etc.)
-- USED BY: /admin-hiregenai/settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
