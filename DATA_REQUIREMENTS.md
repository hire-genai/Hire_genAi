# Comprehensive Data Requirements for ATS System

## Overview
This document outlines all data points that must be captured in Job Descriptions (JDs) and during the application processing lifecycle to support the dashboards for Recruiter, Manager, Director, Admin roles, as well as Talent Pool and Job Posting sections.

---

## 1. JOB DESCRIPTION (JD) DATA POINTS

### Basic Job Information
- **Job ID** (unique identifier)
- **Job Title**
- **Department**
- **Location** (office location or remote)
- **Job Type** (Full-time, Part-time, Contract, Temporary)
- **Work Mode** (Remote, Hybrid, On-site)
- **Salary Range** (min-max)
- **Currency**
- **Job Status** (Draft, Open, On Hold, Closed, Cancelled)
- **Date Posted**
- **Application Deadline**
- **Expected Start Date**

### Hiring Team & Ownership
- **Recruiter Assigned** (primary owner)
- **Hiring Manager** (name, email, department)
- **Interview Panel Members** (list of interviewers)
- **Approvers** (for offer stage)
- **Job Creator** (who created the JD)

### Job Details
- **Job Description** (full text)
- **Responsibilities** (bullet points)
- **Required Skills** (array of skills)
- **Preferred Skills** (array of skills)
- **Required Experience Level** (years)
- **Required Education** (degree, field)
- **Certifications Required** (if any)
- **Languages Required** (if any)
- **Industry Experience** (if specific industry needed)

### Capacity & Planning
- **Number of Openings** (headcount)
- **Hiring Priority** (High, Medium, Low)
- **Target Time to Fill** (days)
- **Planned Hiring Date**
- **Budget Allocated** (for recruitment costs)
- **Forecasted Headcount** (for director-level planning)

### Sourcing Strategy
- **Target Sources** (LinkedIn, GitHub, Referral, Job Boards, etc.)
- **Diversity Goals** (yes/no, percentage targets)
- **Candidate Persona** (ideal candidate profile)

### Compliance & Legal
- **EEO Classification** (for reporting)
- **FLSA Status** (Exempt/Non-exempt)
- **Visa Sponsorship Available** (yes/no)
- **Background Check Required** (yes/no)
- **Drug Test Required** (yes/no)

---

## 2. CANDIDATE/APPLICANT DATA POINTS

### Personal Information
- **Candidate ID** (unique identifier)
- **Full Name**
- **Email Address**
- **Phone Number**
- **Current Location** (city, state, country)
- **Willing to Relocate** (yes/no)
- **Work Authorization Status**
- **LinkedIn Profile URL**
- **GitHub/Portfolio URL**
- **Resume/CV** (file attachment)

### Professional Background
- **Current Position**
- **Current Company**
- **Total Years of Experience**
- **Relevant Experience** (years in specific domain)
- **Skills** (array of skills with proficiency levels)
- **Education** (degree, institution, graduation year)
- **Certifications**
- **Languages Spoken**
- **Salary Expectation** (current, expected)
- **Notice Period** (immediate, 2 weeks, 1 month, etc.)

### Application Tracking
- **Application Date**
- **Job Applied For** (Job ID)
- **Application Source** (LinkedIn, Referral, Direct Apply, Career Page, Job Board, etc.)
- **Referral Source** (if referred - name of employee)
- **Current Stage** (CV Screening, AI Interview, Hiring Manager, Offer Stage, Hired, Rejected)
- **Stage Entry Date** (when entered current stage)
- **Days in Current Stage** (calculated)
- **Previous Stages** (stage history with timestamps)
- **Application Status** (New, In Progress, On Hold, Rejected, Hired, Withdrawn)

### Communication & Engagement
- **Last Contact Date**
- **Last Contact Type** (Email, Phone, Interview, etc.)
- **Communication History** (array of interactions)
- **Response Time** (time taken to respond to recruiter outreach)
- **Email Open Rate** (for tracking engagement)
- **Emails Sent Count**
- **Calls Made Count**
- **Candidate Interest Level** (Active, Passive, Not Interested)

### Screening & Assessment
- **CV Screening Score** (pass/fail or numeric score)
- **CV Screening Date**
- **CV Screened By** (recruiter name)
- **AI Interview Score** (if applicable)
- **AI Interview Date**
- **AI Interview Feedback** (automated notes)
- **Technical Assessment Score** (if applicable)
- **Technical Assessment Date**
- **Skills Assessment Results** (per skill)

### Interview Process
- **Number of Interviews Scheduled**
- **Interview Dates** (array of scheduled interviews)
- **Interview Types** (Technical, Behavioral, Panel, Portfolio Review, etc.)
- **Interviewers** (names and feedback)
- **Interview Feedback Submitted** (yes/no per interview)
- **Interview Feedback Submission Date**
- **Interview Feedback Delay** (days late if not submitted on time)
- **Interview Scores** (per interviewer, per competency)
- **Interview Recommendations** (Hire, No Hire, Maybe)
- **Scheduling Time** (days from request to scheduled slot)

### Offer Management
- **Offer Extended Date**
- **Offer Amount** (base salary)
- **Offer Package Details** (bonus, equity, benefits)
- **Offer Expiry Date**
- **Offer Response Date**
- **Offer Accepted** (yes/no)
- **Offer Declined Reason** (if applicable)
- **Negotiation Rounds** (count)
- **Final Offer Amount** (after negotiation)

### Quality & Performance Indicators
- **Submittal Quality Flag** (did this candidate advance past screening?)
- **Interview-to-Offer Conversion** (yes/no)
- **Hire Quality Score** (if hired - performance rating after 90 days)
- **90-Day Retention** (yes/no)
- **6-Month Retention** (yes/no)
- **12-Month Retention** (yes/no)
- **Manager Performance Rating** (after hire, for Quality of Hire metric)

### Rejection & Dropout
- **Rejection Date**
- **Rejection Stage**
- **Rejection Reason** (Not Qualified, Better Candidate, Culture Fit, Budget, etc.)
- **Rejected By** (recruiter/interviewer name)
- **Candidate Withdrew** (yes/no)
- **Withdrawal Reason**
- **Added to Talent Pool** (yes/no after rejection)

### Diversity & Compliance
- **Gender** (optional, for diversity reporting)
- **Ethnicity** (optional, for diversity reporting)
- **Veteran Status** (optional)
- **Disability Status** (optional)
- **LGBTQ+ Identification** (optional)
- **Consent for Data Storage** (GDPR compliance)
- **EEO Data Collected** (yes/no)

### Onboarding (Post-Hire)
- **Hire Date**
- **Start Date**
- **Onboarding Tasks Assigned** (count)
- **Onboarding Tasks Completed** (count)
- **Onboarding Completion Status** (On Track, Behind, Complete)
- **Background Check Status** (Pending, Clear, Issues)
- **Background Check Completion Date**
- **Reference Check Status** (Pending, Complete)
- **Reference Check Completion Date**
- **Equipment Ordered** (yes/no)
- **Accounts Created** (yes/no)

---

## 3. RECRUITER DASHBOARD DATA REQUIREMENTS

### My Open Reqs KPI
- Count of jobs with `recruiter_assigned = current_user` AND `status = 'open'`
- **Required JD Data**: Job ID, Recruiter Assigned, Job Status

### Candidates in Pipeline KPI
- Count of candidates where `recruiter = current_user` AND `status IN ('Screening', 'Interview', 'Offer Stage')`
- **Required Candidate Data**: Candidate ID, Recruiter, Application Status, Current Stage

### Sourcing Activity KPI
- `(Total Responses / Total Outreach Attempts) * 100` for current week
- **Required Data**: Outreach attempts logged, Response tracking, Date of outreach/response

### Avg Response Time KPI
- Average time between candidate inquiry timestamp and recruiter response timestamp
- **Required Data**: Inquiry received timestamp, Response sent timestamp, Inquiry type

### Submittal Quality KPI
- `(Candidates Interviewed / Candidates Submitted) * 100`
- **Required Data**: Candidate submission to hiring manager, Interview scheduled flag

### Time in Stage (Avg) KPI
- Average days candidates spend in each pipeline stage
- **Required Data**: Stage entry date, Stage exit date (or current date)

---

## 4. MANAGER DASHBOARD DATA REQUIREMENTS

### Team Pipeline Health KPI
- Total candidates managed by team members, count of bottlenecks (candidates in stage > target days)
- **Required Data**: All team members' candidate data, Stage timings, Target time per stage

### Time to Fill (Avg) KPI
- Average days from `job_posted_date` to `offer_accepted_date` across team
- **Required Data**: Job Posted Date, Offer Accepted Date

### Offer Acceptance Rate KPI
- `(Offers Accepted / Total Offers Extended) * 100`
- **Required Data**: Offer Extended (yes/no), Offer Accepted (yes/no), Date range

### Team Capacity Load KPI
- `(Active Reqs per Recruiter / Standard Capacity) * 100`
- **Required Data**: Active job count per recruiter, Standard capacity setting (e.g., 6 reqs)

### HM Satisfaction KPI
- Average hiring manager satisfaction survey scores
- **Required Data**: Hiring Manager feedback surveys (rating 1-5), Survey date, Hiring Manager name

### Source Quality (Team) KPI
- Effectiveness ranking by source based on interview rate and offer rate
- **Required Data**: Application Source, Stage outcomes, Conversion rates by source

---

## 5. DIRECTOR DASHBOARD DATA REQUIREMENTS

### Hiring Velocity KPI
- Count of hires per month vs hiring plan target
- **Required Data**: Hire Date, Hiring Plan Target (monthly/quarterly), Actual hires count

### Quality of Hire KPI
- Average performance rating + 6-month retention rate
- **Required Data**: Manager performance rating (post-hire), 6-month retention status, Hire cohort

### Forecast vs Actual KPI
- `(Actual Hires / Forecasted Headcount) * 100`
- **Required Data**: Forecasted headcount by department, Actual hires by department, Time period

### Cost Per Hire KPI
- `(Total Recruitment Costs / Number of Hires)`
- **Required Data**: Agency fees, Job board costs, Internal recruiting costs, Hire count, Time period

### Recruitment ROI KPI
- `(Quality Score * Retention Rate) / Cost Per Hire`
- **Required Data**: Quality of hire score, Retention rate, Total recruitment investment

### Diversity Pipeline KPI
- Percentage of underrepresented candidates in pipeline
- **Required Data**: Candidate diversity data (optional self-identification), Target diversity percentage

---

## 6. ADMIN DASHBOARD DATA REQUIREMENTS

### Scheduling Efficiency KPI
- Average days from interview request to scheduled interview
- **Required Data**: Interview request date, Interview scheduled date, Interview type

### Process Completion KPI
- `(Tasks Completed On-Time / Total Tasks) * 100`
- **Required Data**: Interview feedback submission date, Feedback due date, Reference check completion, Background check completion

### Data Integrity KPI
- Count of candidate/job records with missing required fields
- **Required Data**: Data validation rules, Missing field audit log

### Onboarding Tasks KPI
- Count of pre-start tasks pending for new hires starting within 14 days
- **Required Data**: New hire start date, Onboarding task list, Task completion status

### Interview Feedback KPI
- `(Feedback Submitted On-Time / Total Interviews) * 100`
- **Required Data**: Interview date, Feedback submission date, Feedback due date (typically 24 hours)

### Compliance Status KPI
- Status of regulatory documentation and audit trails
- **Required Data**: EEO reports status, GDPR compliance logs, Audit trail completeness, Last compliance review date

---

## 7. TALENT POOL DATA REQUIREMENTS

### Talent Pool Candidate Data
- **All Candidate Personal & Professional Data** (as listed in Section 2)
- **Talent Pool Status** (Active Interest, Passive)
- **Added to Pool Date**
- **Source of Talent Pool Addition** (Past Applicant, Referral, LinkedIn, Proactive Sourcing)
- **Skills** (for filtering and matching)
- **Position of Interest**
- **Last Contact Date**
- **Last Contact Type**
- **Communication History** (emails sent, JDs shared, newsletters sent)
- **Engagement Score** (based on email opens, responses)
- **Tags/Labels** (for categorization)

### Talent Pool Metrics
- Total candidates in pool
- Active Interest vs Passive split
- Source breakdown (Referral, LinkedIn, Past Application)
- Recently contacted (last 7 days)
- Average skills per candidate
- Unique positions represented

---

## 8. JOB POSTING SECTION DATA REQUIREMENTS

### Job Listing Display
- All JD data from Section 1
- **Applicant count by stage**:
  - CV Screened
  - AI Interview
  - Hiring Manager Round
  - Offer Stage
  - Hired
  - Rejected

### Job Metrics
- **Total Applicants**
- **Applications per Day** (velocity)
- **Time Since Posted**
- **Days Open** (calculated)
- **Source Distribution** (where applicants came from)
- **Conversion Rates by Stage**
- **Current Bottleneck Stage** (stage with longest avg time)

---

## 9. APPLICATION PROCESSING WORKFLOW DATA

### Stage Tracking (Required for ALL candidates)
Each stage transition must capture:
- **Stage Name** (CV Screening, AI Interview, Hiring Manager, Offer Stage, etc.)
- **Entry Date & Time**
- **Exit Date & Time**
- **Duration in Stage** (calculated)
- **Action Taken** (Moved Forward, Rejected, On Hold)
- **Action By** (user who performed action)
- **Stage Notes** (reason for rejection/advancement)

### Communication Logging
Every communication must log:
- **Date & Time**
- **Type** (Email, Call, SMS, Video Interview, In-Person)
- **Direction** (Outbound from recruiter, Inbound from candidate)
- **Subject/Topic**
- **Outcome** (Connected, No Response, Voicemail, Scheduled Interview)
- **Next Action Required** (Follow-up date)

### Document Management
- **Resume Version** (track if updated)
- **Cover Letter** (if provided)
- **Assessment Results** (files/scores)
- **Interview Notes** (per interviewer, per round)
- **Reference Check Documents**
- **Background Check Reports**
- **Offer Letters** (drafted, sent, signed versions)

---

## 10. CALCULATED/DERIVED METRICS

These should be computed in real-time or cached:

- **Days in Current Stage** = Today - Stage Entry Date
- **Total Time in Pipeline** = Today - Application Date (or Hire Date - Application Date if hired)
- **Interview-to-Hire Ratio** = Hires / Interviews Conducted
- **Source Effectiveness Score** = (Interview Rate * 0.5) + (Offer Rate * 0.5)
- **Bottleneck Identification** = Stages where Avg Time > Target Time
- **Capacity Utilization** = Active Reqs / Max Capacity per Recruiter
- **Pipeline Velocity** = Average days to move through all stages
- **Cost per Stage** = Total Costs / Number of Candidates at Each Stage

---

## 11. INTEGRATION REQUIREMENTS

### Email System Integration
- Track email opens, clicks (for engagement)
- Email delivery status
- Bounce tracking
- Template usage tracking

### Calendar Integration
- Interview scheduling
- Interviewer availability
- Automated reminders
- No-show tracking

### HRIS Integration (Post-Hire)
- Employee ID assignment
- Performance review data (for Quality of Hire)
- Retention status
- Termination data

### Background Check Service
- Status sync
- Result import
- Compliance documentation

---

## 12. DATA VALIDATION RULES

### Required Fields for Job Posting
- Job Title, Department, Location, Job Type, Salary Range, Recruiter Assigned, Hiring Manager, Required Skills, Job Description

### Required Fields for Candidate Application
- Name, Email, Phone, Resume, Applied Position, Application Date, Current Stage

### Required Fields for Stage Progression
- Cannot move to next stage without completing previous stage tasks
- Interview feedback required before moving past interview stage
- Offer details required before moving to offer stage
- Background check clear required before hire

---

## 13. REPORTING & ANALYTICS NEEDS

### Time-Based Aggregations
- Daily, Weekly, Monthly, Quarterly views for all metrics
- Year-over-year comparisons
- Trend analysis (improving/declining)

### Segmentation Needs
- By Department
- By Recruiter
- By Location
- By Job Type
- By Source
- By Hiring Manager
- By Candidate Demographics (for diversity reporting)

### Export Requirements
- CSV/Excel export for all dashboard views
- EEO compliance reports
- Audit trail reports
- Cost analysis reports
- Pipeline funnel reports

---

## 14. SUMMARY: CRITICAL DATA FIELDS

### MUST-HAVE for Core Functionality

**Job Description:**
- Job ID, Title, Department, Status, Recruiter, Hiring Manager, Date Posted, Required Skills, Salary Range

**Candidate:**
- Candidate ID, Name, Email, Phone, Resume, Applied Position, Application Date, Current Stage, Stage Entry Date, Application Source

**Stage Tracking:**
- Stage Name, Entry Date, Exit Date, Action By, Outcome

**Interview:**
- Interview Date, Interviewer, Feedback Submitted (Y/N), Feedback Date, Interview Type

**Offer:**
- Offer Date, Offer Amount, Accepted (Y/N), Response Date

**Hire:**
- Hire Date, Start Date, Performance Rating (90d, 6mo), Retention Status

**Communication:**
- Date, Type, Direction, Outcome

---

## Implementation Priority

### Phase 1 (MVP):
- Job basic info, Candidate basic info, Stage tracking, Application source

### Phase 2:
- Interview scheduling & feedback, Communication logging, Time calculations

### Phase 3:
- Offer management, Quality metrics, Advanced analytics

### Phase 4:
- Talent pool sophistication, Predictive analytics, AI-driven insights

---

This comprehensive data structure ensures all dashboard KPIs can be accurately calculated and provides a complete audit trail for compliance and process improvement.
