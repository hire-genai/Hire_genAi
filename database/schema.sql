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
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10000+'
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
CREATE TYPE contact_message_status AS ENUM ('new_lead', 'contacted', 'qualified', 'closed');

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
  slug                        TEXT UNIQUE,
  openai_project_id           TEXT,
  openai_service_account_key  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_status ON companies (status);
CREATE INDEX idx_companies_slug ON companies (slug);


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



-- ---------------------------------------------------------------------------
-- 3c. recruitment_assessments
-- WHY: Stores homepage recruitment questionnaire submissions as a single row.
--      The RecruitmentQuestionnaire component submits to /api/assessments/submit.
--      Stores contact info, all 10 answers as JSON, calculated efficiency score,
--      plus IP address and user agent for tracking.
-- USED BY: homepage questionnaire → /api/assessments/submit → /questionnaire-results
-- ---------------------------------------------------------------------------
CREATE TABLE recruitment_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  email             CITEXT NOT NULL,
  company           VARCHAR(255) NOT NULL,
  phone             VARCHAR(50),
  answers           JSONB DEFAULT '{}',
  efficiency_score  INTEGER,
  created_at        TIMESTAMPTZ(6) DEFAULT NOW(),
  ip_address        INET,
  user_agent        TEXT
);

CREATE INDEX idx_recruitment_assessments_email ON recruitment_assessments (email);
CREATE INDEX idx_recruitment_assessments_created_at ON recruitment_assessments (created_at);


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
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  work_email      TEXT NOT NULL,
  company_name    TEXT,
  phone_number    TEXT,
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  status          contact_message_status NOT NULL DEFAULT 'new_lead',
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_status ON contact_messages (status);
CREATE INDEX idx_contact_messages_work_email ON contact_messages (work_email);


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
  client_company_name         TEXT,
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

  -- Auto Interview Scheduling (48-hour link expiration)
  auto_schedule_interview     BOOLEAN DEFAULT FALSE,
  interview_link_expiry_hours INT DEFAULT 48,
  
  -- Screening Questions (JSONB for flexible storage)
  enable_screening_questions  BOOLEAN DEFAULT FALSE,
  screening_questions         JSONB DEFAULT '{"minExperience": null, "expectedSkills": [], "expectedSalary": null, "noticePeriodNegotiable": null}',

  -- Status
  status                      job_status NOT NULL DEFAULT 'open',
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


-- ---------------------------------------------------------------------------
-- 5b. job_interview_questions
-- WHY: Stores AI-generated interview questions for each job posting.
--      Selected evaluation criteria stored as JSONB array (max 5 criteria names).
--      Questions stored as JSONB array with criterion mapping, difficulty & marks.
--      Criteria options: Technical Skills, Problem Solving, Communication,
--        Experience, Culture Fit, Teamwork / Collaboration, Leadership,
--        Adaptability / Learning, Work Ethic / Reliability
--      Difficulty levels: High (15 marks), Medium (10 marks), Low (5 marks)
-- USED BY: JobPostingForm (Step 3), AI Interview, Candidate evaluation
-- ---------------------------------------------------------------------------
CREATE TABLE job_interview_questions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  selected_criteria   JSONB NOT NULL DEFAULT '[]',     -- e.g. ["Technical Skills", "Problem Solving", "Communication"]
  questions           JSONB NOT NULL DEFAULT '[]',     -- e.g. [{"id": 1, "question": "...", "criterion": "Technical Skills", "difficulty": "High", "marks": 15}, ...]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (job_id)
);

CREATE INDEX idx_job_interview_questions_job_id ON job_interview_questions (job_id);
CREATE INDEX idx_job_interview_questions_criteria ON job_interview_questions USING GIN (selected_criteria);


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
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  location        TEXT,
  current_company TEXT,
  current_title   TEXT,
  experience_years INT,
  linkedin_url    TEXT,
  resume_url      TEXT,                              -- S3/blob URL to uploaded CV
  photo_url       TEXT,                              -- Webcam captured photo URL
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
  screening_date          DATE,
  screening_remarks       TEXT,

  -- AI Interview
  interview_status        TEXT DEFAULT 'Not Scheduled',  -- Not Scheduled, Scheduled, Completed, Expired
  interview_link          TEXT,
  interview_sent_at       TIMESTAMPTZ,
  interview_completed_at  TIMESTAMPTZ,
  interview_score         NUMERIC(5,2),                -- Overall average score
  interview_evaluations   JSONB DEFAULT '{}',           -- {"Technical Skills": {"score": 85.5, "feedback": "Strong"}, "Communication": {"score": 92.0, "feedback": "Clear"}}
  interview_recommendation TEXT,                      -- Strongly Recommend, Recommend, On Hold, Reject
  interview_summary      TEXT,                        -- AI-generated overall summary

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

  -- Application form data
  expected_salary         NUMERIC(12,2),
  salary_currency         TEXT DEFAULT 'USD',
  salary_period           TEXT DEFAULT 'month',
  location                TEXT,
  linkedin_url            TEXT,
  portfolio_url           TEXT,
  available_start_date    DATE,
  willing_to_relocate     BOOLEAN DEFAULT FALSE,
  languages               JSONB,                      -- [{language, proficiency}]
  photo_url               TEXT,                        -- Webcam captured photo URL
  cover_letter            TEXT,
  source                  TEXT DEFAULT 'direct_application',
  confirmation_status     TEXT,                        -- agree / disagree

  -- CV Parsing & Evaluation
  resume_text             TEXT,                        -- Full extracted text from uploaded CV
  ai_cv_score             NUMERIC(5,2),                -- AI CV/qualification score (0-100)
  is_qualified            BOOLEAN,                     -- Whether candidate passed threshold
  qualification_explanations JSONB,                    -- Full evaluation breakdown JSON

  -- Interview Screenshots & Verification
  during_interview_screenshot           TEXT,                        -- Screenshot captured silently during interview (last question or closing)
  during_interview_screenshot_captured_at TIMESTAMPTZ,                -- Timestamp when during-interview screenshot was captured
  post_interview_photo_url              TEXT,                        -- Photo URL from post-verify page
  post_interview_photo_captured_at      TIMESTAMPTZ,                -- Timestamp when post-verify photo was captured

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
CREATE INDEX idx_applications_during_interview_screenshot ON applications (during_interview_screenshot) WHERE during_interview_screenshot IS NOT NULL;
CREATE INDEX idx_applications_post_interview_photo ON applications (post_interview_photo_url) WHERE post_interview_photo_url IS NOT NULL;
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
      'subscriptions'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;


-- job_interview_questions table
CREATE TABLE IF NOT EXISTS job_interview_questions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE UNIQUE,
  selected_criteria JSONB DEFAULT '[]',
  questions         JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- screening_submissions
-- WHY: Stores all candidate screening form data with explicit columns.
--      Validates candidate eligibility against recruiter-set criteria.
--      Acts as an eligibility gate before the main application form.
-- USED BY: /jobs/[companySlug]/[jobId]/screening, /api/screening/submit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screening_submissions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                  UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_name          TEXT NOT NULL,
  candidate_email         TEXT NOT NULL,
  experience_years        INT,
  expected_salary         NUMERIC(12,2),
  notice_period           TEXT,
  notice_period_negotiable BOOLEAN,
  work_authorization      TEXT,
  selected_skills         TEXT[] DEFAULT '{}',
  additional_info         TEXT,

  -- Eligibility evaluation
  is_eligible             BOOLEAN NOT NULL DEFAULT FALSE,
  reason                  TEXT,                           -- Single reason for eligibility status
  non_eligible_reasons    TEXT[] DEFAULT '{}',
  matched_skills_count    INT DEFAULT 0,
  required_skills_count   INT DEFAULT 0,

  -- Recruiter criteria snapshot (for audit)
  recruiter_min_experience  INT,
  recruiter_max_salary      NUMERIC(12,2),
  recruiter_expected_skills TEXT[] DEFAULT '{}',
  recruiter_work_authorization TEXT,

  submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_sub_job_id ON screening_submissions (job_id);
CREATE INDEX IF NOT EXISTS idx_screening_sub_email ON screening_submissions (candidate_email);
CREATE INDEX IF NOT EXISTS idx_screening_sub_eligible ON screening_submissions (is_eligible);

-- ---------------------------------------------------------------------------
-- 10. screening_otps
-- WHY: Persists OTP codes for interview identity verification.
--      Required because serverless API routes don't share in-memory state.
-- USED BY: /api/interview/verify/send-otp, /api/interview/verify/verify-otp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screening_otps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  application_id  UUID NOT NULL,
  otp             TEXT NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, application_id)
);

CREATE INDEX IF NOT EXISTS idx_screening_otps_email ON screening_otps (email);
CREATE INDEX IF NOT EXISTS idx_screening_otps_expires ON screening_otps (expires_at);


-- ---------------------------------------------------------------------------
-- ALTER TABLE: applications — add photo verification columns
-- WHY: Stores identity verification result from /interview/{id}/verify page.
--      verification_photo_url = captured webcam photo during verify step
--      photo_verified = BOOLEAN result of face comparison
--      photo_match_score = Euclidean distance (internal logs only)
--      verified_at = timestamp of successful verification
-- ---------------------------------------------------------------------------
ALTER TABLE applications ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS photo_verified BOOLEAN;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS photo_match_score NUMERIC(5,4);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;


-- ============================================================================
-- 13. AI USAGE TRACKING & BILLING
-- ============================================================================

-- Ledger entry types
CREATE TYPE ledger_entry_type AS ENUM (
  'CV_PARSE',
  'JD_QUESTIONS',
  'VIDEO_INTERVIEW',
  'WALLET_TOPUP',
  'AUTO_RECHARGE',
  'REFUND'
);

-- ---------------------------------------------------------------------------
-- 13a. cv_parsing_usage
-- WHY: Tracks per-company CV parsing costs. Cost fetched from .env.
-- USED BY: /api/resumes/parse, /api/applications/evaluate-cv
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cv_parsing_usage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  candidate_id          UUID REFERENCES candidates(id) ON DELETE SET NULL,
  file_id               UUID,
  file_size_kb          INT DEFAULT 0,
  parse_successful      BOOLEAN DEFAULT TRUE,
  unit_price            NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost                  NUMERIC(10,4) NOT NULL DEFAULT 0,
  success_rate          NUMERIC(5,2),
  openai_base_cost      NUMERIC(10,4),
  pricing_source        TEXT DEFAULT 'env-config',
  tokens_used           INT,
  profit_margin_percent NUMERIC(5,2) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_parsing_usage_company_id ON cv_parsing_usage (company_id);
CREATE INDEX IF NOT EXISTS idx_cv_parsing_usage_job_id ON cv_parsing_usage (job_id);
CREATE INDEX IF NOT EXISTS idx_cv_parsing_usage_created_at ON cv_parsing_usage (created_at DESC);

-- ---------------------------------------------------------------------------
-- 13b. question_generation_usage
-- WHY: Tracks per-company AI question generation costs.
--      Tiered pricing: 1-4 free, 5-10/11-15/16+ charged.
--      Supports draft jobs (questions generated before job is saved).
-- USED BY: /api/questions/generate, /api/jobs (reconcile on save)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_generation_usage (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id              UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  draft_job_id        TEXT,
  prompt_tokens       INT DEFAULT 0,
  completion_tokens   INT DEFAULT 0,
  total_tokens        INT DEFAULT 0,
  question_count      INT NOT NULL DEFAULT 0,
  cost                NUMERIC(10,4) NOT NULL DEFAULT 0,
  model_used          TEXT DEFAULT 'gpt-4o',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_gen_usage_company_id ON question_generation_usage (company_id);
CREATE INDEX IF NOT EXISTS idx_question_gen_usage_job_id ON question_generation_usage (job_id);
CREATE INDEX IF NOT EXISTS idx_question_gen_usage_draft ON question_generation_usage (draft_job_id);
CREATE INDEX IF NOT EXISTS idx_question_gen_usage_created_at ON question_generation_usage (created_at DESC);

-- ---------------------------------------------------------------------------
-- 13c. video_interview_usage
-- WHY: Tracks per-company video interview costs based on duration.
--      Cost fetched from .env (COST_PER_VIDEO_MINUTE).
-- USED BY: /api/interview/complete
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_interview_usage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  interview_id          UUID,                          -- References application.id
  candidate_id          UUID REFERENCES candidates(id) ON DELETE SET NULL,
  duration_minutes      INT NOT NULL DEFAULT 0,
  video_quality         TEXT DEFAULT 'HD',
  minute_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost                  NUMERIC(10,4) NOT NULL DEFAULT 0,
  completed_questions   INT DEFAULT 0,
  total_questions       INT DEFAULT 0,
  openai_base_cost      NUMERIC(10,4),
  pricing_source        TEXT DEFAULT 'env-config',
  tokens_used           INT,
  profit_margin_percent NUMERIC(5,2) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_interview_usage_company_id ON video_interview_usage (company_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_job_id ON video_interview_usage (job_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_interview_id ON video_interview_usage (interview_id);
CREATE INDEX IF NOT EXISTS idx_video_interview_usage_created_at ON video_interview_usage (created_at DESC);

-- ---------------------------------------------------------------------------
-- 13d. company_billing
-- WHY: Wallet-based billing per company. Tracks balance, spending, auto-recharge.
-- USED BY: Wallet deduction in cv_parsing_usage & question_generation_usage flows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_billing (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  wallet_balance          NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_month_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent             NUMERIC(12,2) NOT NULL DEFAULT 0,
  auto_recharge_enabled   BOOLEAN DEFAULT FALSE,
  auto_recharge_amount    NUMERIC(12,2) DEFAULT 0,
  auto_recharge_threshold NUMERIC(12,2) DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_billing_company_id ON company_billing (company_id);

-- ---------------------------------------------------------------------------
-- 13d. usage_ledger
-- WHY: Audit trail for all billing transactions (charges, top-ups, refunds).
-- USED BY: Settings (billing history), internal audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  entry_type      ledger_entry_type NOT NULL,
  description     TEXT,
  quantity        INT DEFAULT 1,
  unit_price      NUMERIC(10,4) DEFAULT 0,
  amount          NUMERIC(10,4) NOT NULL DEFAULT 0,
  balance_before  NUMERIC(12,2),
  balance_after   NUMERIC(12,2),
  reference_id    UUID,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_company_id ON usage_ledger (company_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_entry_type ON usage_ledger (entry_type);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_created_at ON usage_ledger (created_at DESC);


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
