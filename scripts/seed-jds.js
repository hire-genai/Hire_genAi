/**
 * scripts/seed-jds.js
 *
 * Seeds 17 real job postings (all fields filled) under the E2E test company.
 * Safe to run multiple times — skips jobs that already exist by title.
 *
 * Run:
 *   node scripts/seed-jds.js
 *
 * Outputs JSON array of { title, jobId, applyUrl }
 */

require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = neon(DB_URL)
const BASE_URL    = process.env.BASE_URL ?? 'http://localhost:3000'
const COMPANY_SLUG = 'e2e-test-corp'

// ─── Job definitions — every field filled ────────────────────────────────────
const JOBS = [
  {
    title: 'Desktop Support Engineer',
    department: 'IT',
    location: 'New York, USA',
    job_type: 'Full-time',
    work_mode: 'On-site',
    salary_min: 45000, salary_max: 65000, currency: 'USD',
    description: 'Provide Tier-1/2 desktop support for 500+ end users. Troubleshoot hardware, OS, and application issues on Windows 10/11 and macOS. Maintain asset inventory and deploy software packages via SCCM/Intune.',
    responsibilities: ['Respond to helpdesk tickets within SLA', 'Image and deploy workstations', 'Manage Active Directory accounts', 'Support VPN and remote access tools', 'Document resolutions in ServiceNow'],
    required_skills: ['Windows 10/11', 'Active Directory', 'SCCM/Intune', 'ServiceNow', 'Hardware troubleshooting'],
    preferred_skills: ['macOS support', 'PowerShell scripting', 'ITIL Foundation'],
    experience_years: '2-4 years',
    required_education: "Bachelor's in IT or CompTIA A+ certified",
    certifications_required: 'CompTIA A+ or equivalent',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'John Baker', hiring_manager_email: 'john.baker@e2etestcorp.com',
    number_of_openings: 2, hiring_priority: 'High', target_time_to_fill_days: 30,
    budget_allocated: 130000, target_sources: ['LinkedIn', 'Indeed'],
  },
  {
    title: 'System Integration Engineer',
    department: 'Engineering',
    location: 'London, UK',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 60000, salary_max: 85000, currency: 'GBP',
    description: 'Design, develop and maintain integrations between enterprise systems (ERP, CRM, HRIS) using middleware platforms. Own the full integration lifecycle from requirements through to production support.',
    responsibilities: ['Build REST/SOAP integrations using MuleSoft or Dell Boomi', 'Write integration specs and technical design docs', 'Perform root-cause analysis on integration failures', 'Collaborate with business analysts and product owners', 'Participate in on-call rotation'],
    required_skills: ['MuleSoft', 'REST APIs', 'SOAP', 'XML/JSON', 'SQL'],
    preferred_skills: ['Dell Boomi', 'Kafka', 'Salesforce', 'SAP'],
    experience_years: '4-6 years',
    required_education: "Bachelor's in Computer Science or Engineering",
    certifications_required: 'MuleSoft Certified Developer',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Sarah Chen', hiring_manager_email: 'sarah.chen@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'Medium', target_time_to_fill_days: 45,
    budget_allocated: 85000, target_sources: ['LinkedIn', 'GitHub'],
  },
  {
    title: 'AWS Cloud Services Engineer',
    department: 'Engineering',
    location: 'Remote',
    job_type: 'Full-time',
    work_mode: 'Remote',
    salary_min: 100000, salary_max: 140000, currency: 'USD',
    description: 'Build and maintain scalable AWS infrastructure. Design cloud-native architectures using ECS, Lambda, RDS, and CloudFormation. Drive cloud cost optimisation and security best practices across the organisation.',
    responsibilities: ['Provision AWS infrastructure using Terraform and CloudFormation', 'Monitor and optimise cloud costs (target < $50k/month)', 'Implement IAM policies and security controls', 'Build CI/CD pipelines in GitHub Actions', 'Respond to production incidents and perform post-mortems'],
    required_skills: ['AWS (EC2, ECS, Lambda, RDS, S3)', 'Terraform', 'Docker', 'CI/CD', 'Python or Bash'],
    preferred_skills: ['Kubernetes', 'CloudFormation', 'DataDog', 'AWS Certified Solutions Architect'],
    experience_years: '4-7 years',
    required_education: "Bachelor's in Computer Science or related field",
    certifications_required: 'AWS Certified Solutions Architect – Associate or above',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Mike Torres', hiring_manager_email: 'mike.torres@e2etestcorp.com',
    number_of_openings: 2, hiring_priority: 'High', target_time_to_fill_days: 30,
    budget_allocated: 280000, target_sources: ['LinkedIn', 'GitHub', 'Wellfound'],
  },
  {
    title: 'DevOps Engineer – Azure',
    department: 'Engineering',
    location: 'Munich, Germany',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 75000, salary_max: 105000, currency: 'EUR',
    description: 'Own the Azure DevOps platform and CI/CD pipelines for 10+ engineering teams. Standardise deployment practices, implement infrastructure-as-code, and drive SRE culture across the engineering org.',
    responsibilities: ['Manage Azure DevOps pipelines and release gates', 'Write Bicep/ARM templates for infrastructure provisioning', 'Implement monitoring with Azure Monitor and App Insights', 'Onboard teams onto GitOps workflows', 'Ensure 99.9% uptime for production services'],
    required_skills: ['Azure DevOps', 'Azure (AKS, ACI, Azure Functions)', 'Bicep/ARM', 'Kubernetes', 'Git'],
    preferred_skills: ['Helm', 'Prometheus/Grafana', 'Terraform', 'Azure Security Center'],
    experience_years: '3-6 years',
    required_education: "Bachelor's in Computer Science or Engineering",
    certifications_required: 'Microsoft Azure DevOps Engineer Expert (AZ-400)',
    languages_required: 'English (Fluent), German (Preferred)',
    hiring_manager_name: 'Lukas Weber', hiring_manager_email: 'lukas.weber@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 40,
    budget_allocated: 105000, target_sources: ['LinkedIn', 'GitHub'],
  },
  {
    title: 'QlikView / Qlik Sense Developer',
    department: 'Business Intelligence',
    location: 'Chicago, USA',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 80000, salary_max: 110000, currency: 'USD',
    description: 'Develop and maintain enterprise BI dashboards in QlikView and Qlik Sense. Translate business requirements into performant data models and actionable visualisations for finance, sales, and operations.',
    responsibilities: ['Design and build QlikView/Qlik Sense apps and dashboards', 'Write QlikScript and set-analysis expressions', 'Optimise data models for large-volume datasets', 'Collaborate with data engineers on ETL pipelines', 'Deliver end-user training and documentation'],
    required_skills: ['QlikView', 'Qlik Sense', 'QlikScript', 'SQL', 'Data modelling'],
    preferred_skills: ['Qlik Cloud', 'NPrinting', 'Tableau', 'Power BI'],
    experience_years: '3-5 years',
    required_education: "Bachelor's in Computer Science, Statistics, or Business Analytics",
    certifications_required: 'Qlik Sense Business Analyst or Developer Certification',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Amanda Liu', hiring_manager_email: 'amanda.liu@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'Medium', target_time_to_fill_days: 45,
    budget_allocated: 110000, target_sources: ['LinkedIn', 'Indeed'],
  },
  {
    title: 'Change Manager',
    department: 'Operations',
    location: 'Singapore',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 90000, salary_max: 120000, currency: 'SGD',
    description: 'Lead organisational change management for large-scale digital transformation programmes. Define change strategy, stakeholder engagement plans, and communications to ensure successful adoption.',
    responsibilities: ['Develop change management plans using Prosci/ADKAR methodology', 'Conduct stakeholder impact assessments', 'Design and deliver change readiness surveys', 'Coach senior leaders on change leadership', 'Track adoption KPIs and adjust strategy accordingly'],
    required_skills: ['Change management (ADKAR/Prosci)', 'Stakeholder management', 'Communication planning', 'MS Office', 'Project management'],
    preferred_skills: ['SAP change management', 'Agile transformation', 'Training design', 'Workday'],
    experience_years: '6-10 years',
    required_education: "Bachelor's in Organisational Psychology, Business, or related field",
    certifications_required: 'Prosci Change Practitioner or CCMP',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Diana Patel', hiring_manager_email: 'diana.patel@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 50,
    budget_allocated: 120000, target_sources: ['LinkedIn', 'Glassdoor'],
  },
  {
    title: 'Workplace System Architect',
    department: 'Architecture',
    location: 'Austin, TX, USA',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 140000, salary_max: 180000, currency: 'USD',
    description: 'Define and govern the enterprise workplace technology architecture including endpoint management, collaboration tools (M365), and identity platforms. Partner with security, networking, and business teams to deliver a seamless employee experience.',
    responsibilities: ['Define 3-year workplace technology roadmap', 'Architect M365 / Intune / Azure AD solutions', 'Lead RFPs and vendor evaluations', 'Establish architecture standards and review board', 'Mentor junior architects and engineers'],
    required_skills: ['Microsoft 365', 'Azure Active Directory', 'Intune/SCCM', 'Enterprise Architecture', 'TOGAF or SABSA'],
    preferred_skills: ['ServiceNow', 'Zero Trust architecture', 'Endpoint detection and response (EDR)', 'Networking fundamentals'],
    experience_years: '10+ years',
    required_education: "Bachelor's or Master's in Computer Science or Systems Engineering",
    certifications_required: 'TOGAF 9 or Microsoft Certified: Enterprise Administrator Expert',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Robert King', hiring_manager_email: 'robert.king@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 60,
    budget_allocated: 180000, target_sources: ['LinkedIn', 'Referral'],
  },
  {
    title: 'Jira / Atlassian System Administrator',
    department: 'IT',
    location: 'Toronto, Canada',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 75000, salary_max: 95000, currency: 'CAD',
    description: 'Administer and optimise the company\'s Atlassian suite (Jira Software, Jira Service Management, Confluence). Manage permissions, custom workflows, automation rules, and integrations with third-party tools.',
    responsibilities: ['Manage Jira projects, boards, and workflows', 'Implement Jira Automation and ScriptRunner scripts', 'Onboard teams and deliver training', 'Maintain Confluence spaces and templates', 'Integrate Jira with GitHub, Slack, and CI/CD tools'],
    required_skills: ['Jira Software', 'Jira Service Management', 'Confluence', 'Jira Automation', 'SQL / JQL'],
    preferred_skills: ['ScriptRunner (Groovy)', 'Atlassian Cloud', 'REST API integration', 'Agile/Scrum'],
    experience_years: '3-5 years',
    required_education: "Bachelor's in IT or Computer Science",
    certifications_required: 'Atlassian Certified Professional (ACP) preferred',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Priya Nair', hiring_manager_email: 'priya.nair@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'Medium', target_time_to_fill_days: 35,
    budget_allocated: 95000, target_sources: ['LinkedIn', 'Indeed'],
  },
  {
    title: 'End User Computing (EUC) Specialist',
    department: 'IT',
    location: 'Dubai, UAE',
    job_type: 'Full-time',
    work_mode: 'On-site',
    salary_min: 120000, salary_max: 160000, currency: 'AED',
    description: 'Manage the end-user computing environment for 1,000+ employees across three offices. Own VDI platform (Citrix/VMware Horizon), device lifecycle, and software distribution to ensure a productive and secure user experience.',
    responsibilities: ['Administer Citrix Virtual Apps and Desktops / VMware Horizon', 'Manage golden images and application packaging (MSIX/App-V)', 'Optimise profile management with FSLogix', 'Drive Windows 11 migration project', 'Monitor performance with Control Up / Lakeside'],
    required_skills: ['Citrix Virtual Apps and Desktops', 'VMware Horizon', 'FSLogix', 'Intune', 'Windows imaging'],
    preferred_skills: ['Azure Virtual Desktop (AVD)', 'ControlUp', 'PowerShell automation', 'SCCM'],
    experience_years: '4-7 years',
    required_education: "Bachelor's in IT or equivalent experience",
    certifications_required: 'Citrix CCP-V or VMware VCP-DTM',
    languages_required: 'English (Fluent), Arabic (Preferred)',
    hiring_manager_name: 'Omar Khalil', hiring_manager_email: 'omar.khalil@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 40,
    budget_allocated: 160000, target_sources: ['LinkedIn', 'GulfTalent'],
  },
  {
    title: 'Senior Project Manager',
    department: 'PMO',
    location: 'Sydney, Australia',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 130000, salary_max: 160000, currency: 'AUD',
    description: 'Lead complex IT and digital transformation projects from initiation to closure. Manage project budgets up to $5M, cross-functional teams of 20+, and executive-level stakeholders. Drive delivery using hybrid Agile-Waterfall methodologies.',
    responsibilities: ['Own end-to-end project delivery across scope, schedule, and budget', 'Manage project risks, issues, and dependencies', 'Report project status to steering committees and C-suite', 'Lead sprint planning and retrospectives for agile workstreams', 'Coach and develop junior project managers'],
    required_skills: ['Project management (Agile/Waterfall)', 'MS Project / Jira', 'Budget management', 'Stakeholder communication', 'Risk management'],
    preferred_skills: ['ServiceNow PPM', 'SAFe Agile', 'Change management', 'Vendor management'],
    experience_years: '8-12 years',
    required_education: "Bachelor's in Business, IT, or Engineering",
    certifications_required: 'PMP or PRINCE2 Practitioner',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Claire Morrison', hiring_manager_email: 'claire.morrison@e2etestcorp.com',
    number_of_openings: 2, hiring_priority: 'High', target_time_to_fill_days: 45,
    budget_allocated: 320000, target_sources: ['LinkedIn', 'Seek'],
  },
  {
    title: 'Junior Project Manager',
    department: 'PMO',
    location: 'Bangalore, India',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 800000, salary_max: 1200000, currency: 'INR',
    description: 'Support senior PMs in delivering technology projects. Coordinate project activities, maintain project plans, track action items, and prepare status reports. Ideal for a motivated professional looking to grow into a full PM role.',
    responsibilities: ['Maintain project schedules and task trackers in Jira/MS Project', 'Prepare weekly status reports and meeting minutes', 'Coordinate between development teams and business stakeholders', 'Track project risks and escalate blockers', 'Support UAT planning and sign-off activities'],
    required_skills: ['Jira', 'MS Project or Smartsheet', 'Communication skills', 'Excel / Google Sheets', 'Agile basics'],
    preferred_skills: ['CAPM certification', 'Confluence', 'Power BI for reporting', 'Scrum understanding'],
    experience_years: '1-3 years',
    required_education: "Bachelor's in Business Administration, IT, or Engineering",
    certifications_required: 'CAPM or Scrum Fundamentals Certified (preferred)',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Vikram Sharma', hiring_manager_email: 'vikram.sharma@e2etestcorp.com',
    number_of_openings: 3, hiring_priority: 'Medium', target_time_to_fill_days: 30,
    budget_allocated: 3600000, target_sources: ['LinkedIn', 'Naukri', 'Campus Recruiting'],
  },
  {
    title: 'Technical Sourcer',
    department: 'Human Resources',
    location: 'Remote',
    job_type: 'Full-time',
    work_mode: 'Remote',
    salary_min: 55000, salary_max: 75000, currency: 'USD',
    description: 'Source and engage top technical talent (software engineers, data scientists, DevOps) through LinkedIn Recruiter, Boolean searches, and creative outreach strategies. Partner closely with engineering hiring managers to build pipelines for hard-to-fill roles.',
    responsibilities: ['Build passive candidate pipelines for 10+ technical requisitions simultaneously', 'Craft personalised outreach messages with 30%+ response rates', 'Screen candidates and schedule interviews', 'Maintain ATS (Greenhouse) hygiene and reporting', 'Partner with HireGenAI platform for AI-assisted screening'],
    required_skills: ['LinkedIn Recruiter', 'Boolean search', 'Greenhouse or Lever ATS', 'Candidate outreach', 'Technical role knowledge'],
    preferred_skills: ['GitHub sourcing', 'Sourcing automation tools', 'Data analysis in Excel/Sheets', 'Employer branding'],
    experience_years: '2-4 years',
    required_education: "Bachelor's in HR, Business, or equivalent",
    certifications_required: 'AIRS Certified Sourcing Professional (preferred)',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Jessica Park', hiring_manager_email: 'jessica.park@e2etestcorp.com',
    number_of_openings: 2, hiring_priority: 'Medium', target_time_to_fill_days: 25,
    budget_allocated: 150000, target_sources: ['LinkedIn', 'Indeed', 'Glassdoor'],
  },
  {
    title: 'Data & Business Analyst',
    department: 'Strategy & Analytics',
    location: 'Amsterdam, Netherlands',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 65000, salary_max: 90000, currency: 'EUR',
    description: 'Bridge the gap between business stakeholders and technical teams by translating requirements into data models, dashboards, and process improvements. Own end-to-end analytics for the commercial and operations function.',
    responsibilities: ['Gather and document business requirements', 'Build SQL queries and dbt models for reporting', 'Create Power BI and Looker dashboards', 'Conduct A/B test analysis and present findings', 'Improve data quality and governance standards'],
    required_skills: ['SQL', 'Power BI or Looker', 'Business requirements gathering', 'Excel / Google Sheets', 'Data modelling basics'],
    preferred_skills: ['dbt', 'Python (pandas)', 'Snowflake or BigQuery', 'Statistical analysis'],
    experience_years: '3-5 years',
    required_education: "Bachelor's in Business, Statistics, Economics, or Computer Science",
    certifications_required: 'Microsoft Power BI Data Analyst (PL-300) preferred',
    languages_required: 'English (Fluent), Dutch (Preferred)',
    hiring_manager_name: 'Eva de Boer', hiring_manager_email: 'eva.deboer@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'Medium', target_time_to_fill_days: 40,
    budget_allocated: 90000, target_sources: ['LinkedIn', 'Indeed'],
  },
  {
    title: 'Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    job_type: 'Full-time',
    work_mode: 'Remote',
    salary_min: 90000, salary_max: 130000, currency: 'USD',
    description: 'Build and scale product features across the full stack using React/Next.js and Node.js/PostgreSQL. Participate in the entire product lifecycle — from design to deployment — in a fast-moving startup environment.',
    responsibilities: ['Develop React/Next.js front-end features with TypeScript', 'Build RESTful and GraphQL APIs in Node.js', 'Write database migrations and queries in PostgreSQL', 'Participate in code reviews and architecture discussions', 'Deploy and monitor services on AWS'],
    required_skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL'],
    preferred_skills: ['GraphQL', 'Redis', 'AWS', 'Prisma', 'Playwright/Cypress'],
    experience_years: '3-6 years',
    required_education: "Bachelor's in Computer Science or equivalent experience",
    certifications_required: 'None required',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Alex Nguyen', hiring_manager_email: 'alex.nguyen@e2etestcorp.com',
    number_of_openings: 3, hiring_priority: 'High', target_time_to_fill_days: 30,
    budget_allocated: 390000, target_sources: ['LinkedIn', 'GitHub', 'Wellfound'],
  },
  {
    title: 'Azure Solutions Architect',
    department: 'Architecture',
    location: 'Zurich, Switzerland',
    job_type: 'Full-time',
    work_mode: 'Hybrid',
    salary_min: 150000, salary_max: 200000, currency: 'CHF',
    description: 'Lead the design and implementation of enterprise-scale Azure cloud architectures. Define landing zones, cloud governance frameworks, and migration strategies for on-premise workloads. Act as a trusted technical advisor to business and IT leadership.',
    responsibilities: ['Design Azure landing zones using Microsoft Cloud Adoption Framework', 'Lead cloud migration assessments and wave planning', 'Implement Azure Policy and Microsoft Defender for Cloud', 'Provide architectural guidance for AKS, Azure SQL, and Event Hub', 'Mentor cloud engineers and conduct design reviews'],
    required_skills: ['Azure (Expert level)', 'Azure Landing Zones', 'AKS', 'Azure Policy / Governance', 'Terraform'],
    preferred_skills: ['SAP on Azure', 'Azure Arc', 'FinOps', 'Multi-cloud (GCP/AWS)'],
    experience_years: '10-15 years',
    required_education: "Bachelor's or Master's in Computer Science or Engineering",
    certifications_required: 'Microsoft Certified: Azure Solutions Architect Expert (AZ-305)',
    languages_required: 'English (Fluent), German (Preferred)',
    hiring_manager_name: 'Thomas Müller', hiring_manager_email: 'thomas.muller@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 60,
    budget_allocated: 200000, target_sources: ['LinkedIn', 'Referral'],
  },
  {
    title: 'Data Scraping Engineer (Python / Beautiful Soup)',
    department: 'Data Engineering',
    location: 'Remote',
    job_type: 'Full-time',
    work_mode: 'Remote',
    salary_min: 70000, salary_max: 95000, currency: 'USD',
    description: 'Build, maintain, and scale web scraping and data extraction pipelines. Extract structured data from public web sources for market intelligence, competitor analysis, and AI training datasets. Handle anti-bot measures, proxy rotation, and large-scale data normalisation.',
    responsibilities: ['Write scrapers using Python (Beautiful Soup, Scrapy, Playwright)', 'Manage proxy pools and implement anti-detection strategies', 'Store and normalise data in PostgreSQL and S3', 'Schedule and monitor pipelines with Airflow', 'Ensure legal compliance for data collection activities'],
    required_skills: ['Python', 'Beautiful Soup / Scrapy', 'Playwright or Selenium', 'PostgreSQL', 'AWS S3'],
    preferred_skills: ['Airflow', 'Spark', 'Bright Data / Oxylabs proxy management', 'LLM-based data extraction'],
    experience_years: '2-5 years',
    required_education: "Bachelor's in Computer Science or Data Engineering",
    certifications_required: 'None required',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'Carlos Reyes', hiring_manager_email: 'carlos.reyes@e2etestcorp.com',
    number_of_openings: 2, hiring_priority: 'Medium', target_time_to_fill_days: 35,
    budget_allocated: 190000, target_sources: ['LinkedIn', 'GitHub', 'Indeed'],
  },
  {
    title: 'Senior Software Engineer (E2E Test)',
    department: 'Engineering',
    location: 'Remote',
    job_type: 'Full-time',
    work_mode: 'Remote',
    salary_min: 110000, salary_max: 150000, currency: 'USD',
    description: 'We are looking for a Senior Software Engineer to join our E2E test team. You will work on cutting-edge AI hiring tools.',
    responsibilities: ['Build scalable backend services in TypeScript/Node.js', 'Design data models and write SQL queries in PostgreSQL', 'Review code and mentor engineers', 'Collaborate with product and design on new features', 'Own reliability and on-call for assigned services'],
    required_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs'],
    preferred_skills: ['AWS', 'Docker', 'GraphQL', 'Playwright'],
    experience_years: '3-5 years',
    required_education: "Bachelor's in Computer Science",
    certifications_required: 'None required',
    languages_required: 'English (Fluent)',
    hiring_manager_name: 'E2E Admin', hiring_manager_email: 'recruiter@e2etestcorp.com',
    number_of_openings: 1, hiring_priority: 'High', target_time_to_fill_days: 30,
    budget_allocated: 150000, target_sources: ['LinkedIn', 'GitHub'],
  },
]

async function seed() {
  // Get company + user
  const companies = await sql`SELECT id FROM companies WHERE slug = ${'e2e-test-corp'} LIMIT 1`
  if (!companies.length) { console.error('Run seed-test-company.js first'); process.exit(1) }
  const companyId = companies[0].id

  const users = await sql`SELECT id FROM users WHERE email = ${'recruiter@e2etestcorp.com'} LIMIT 1`
  if (!users.length) { console.error('Run seed-test-company.js first'); process.exit(1) }
  const userId = users[0].id

  const results = []

  for (const job of JOBS) {
    // Check if already exists
    const existing = await sql`
      SELECT id FROM job_postings
      WHERE company_id = ${companyId}::uuid AND title = ${job.title} AND status = 'open'
      LIMIT 1
    `
    if (existing.length) {
      console.log(`[seed] Exists: "${job.title}" → ${existing[0].id}`)
      results.push({ title: job.title, jobId: existing[0].id, applyUrl: `${BASE_URL}/apply/${COMPANY_SLUG}/${existing[0].id}` })
      continue
    }

    const inserted = await sql`
      INSERT INTO job_postings (
        company_id, created_by, title, department, location,
        job_type, work_mode,
        salary_min, salary_max, currency,
        description,
        responsibilities, required_skills, preferred_skills,
        experience_years, required_education, certifications_required,
        languages_required,
        hiring_manager_name, hiring_manager_email,
        number_of_openings, hiring_priority, target_time_to_fill_days,
        budget_allocated, target_sources,
        status, published_at, job_open_date,
        auto_schedule_interview, diversity_goals,
        created_at, updated_at
      ) VALUES (
        ${companyId}::uuid,
        ${userId}::uuid,
        ${job.title},
        ${job.department},
        ${job.location},
        ${job.job_type},
        ${job.work_mode},
        ${job.salary_min}, ${job.salary_max}, ${job.currency},
        ${job.description},
        ${job.responsibilities}, ${job.required_skills}, ${job.preferred_skills},
        ${job.experience_years}, ${job.required_education}, ${job.certifications_required},
        ${job.languages_required},
        ${job.hiring_manager_name}, ${job.hiring_manager_email},
        ${job.number_of_openings}, ${job.hiring_priority}, ${job.target_time_to_fill_days},
        ${job.budget_allocated}, ${job.target_sources},
        'open', NOW(), CURRENT_DATE,
        false, false,
        NOW(), NOW()
      )
      RETURNING id
    `
    const jobId = inserted[0].id
    console.log(`[seed] Created: "${job.title}" → ${jobId}`)
    results.push({ title: job.title, jobId, applyUrl: `${BASE_URL}/apply/${COMPANY_SLUG}/${jobId}` })
  }

  console.log('\n[seed] All 17 jobs ready:')
  results.forEach(r => console.log(`  ${r.title}: ${r.applyUrl}`))

  // Write job IDs to a JSON file so spec can read them
  const fs = require('fs')
  const out = { companySlug: COMPANY_SLUG, jobs: results }
  fs.writeFileSync('tests/e2e/seeded-jobs.json', JSON.stringify(out, null, 2))
  console.log('\n[seed] Written → tests/e2e/seeded-jobs.json')
}

seed().catch(err => { console.error('[seed] Error:', err.message); process.exit(1) })
