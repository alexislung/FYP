-- Update jobs data with more specific and detailed postings
-- Run in Supabase SQL Editor.
-- Note: This script replaces existing rows in `jobs`.
-- This version also clears `applications` first to avoid FK errors.

begin;

-- applications.job_id -> jobs.id, so clear child rows first
delete from public.applications;
delete from public.jobs;

insert into public.jobs (title, company, salary_range, category, location, requirements, created_at) values
(
  'Administrative Officer (Full-time)',
  'Harbour Education Group',
  'HK$18K - 22K',
  'Administration',
  'Central',
  'Employment Type: Full-time
Key Responsibilities:
- Handle daily office administration, procurement, and document filing
- Coordinate meetings, prepare minutes, and track action items
- Support HR onboarding paperwork and attendance records

Requirements:
- Diploma or above in Business Administration or related discipline
- 1-2 years of admin experience preferred
- Proficient in MS Office (Excel, Word, PowerPoint)
- Good written and spoken English and Chinese',
  now() - interval '1 day'
),
(
  'Marketing Assistant (Contract/Temp)',
  'Nova Retail Ltd',
  'HK$16K - 20K',
  'Marketing',
  'Kowloon Bay',
  'Employment Type: Contract/Temp (12 months)
Key Responsibilities:
- Support campaign execution across social, email, and in-store channels
- Coordinate creative assets with designers and agencies
- Prepare weekly campaign reports and competitor analysis

Requirements:
- Diploma or above in Marketing, Communications, or equivalent
- Familiar with Meta Ads, Google Analytics, and Canva
- Strong coordination and communication skills',
  now() - interval '3 days'
),
(
  'Customer Service Representative (Part-time)',
  'CityLink Services',
  'HK$80 - 110/hr',
  'Customer Service',
  'Mong Kok',
  'Employment Type: Part-time
Key Responsibilities:
- Answer customer enquiries by phone, WhatsApp, and email
- Process returns and service requests in CRM
- Escalate complex cases and follow up to closure

Requirements:
- Minimum 1 year of customer service experience
- Cantonese native; basic English and Mandarin preferred
- Available for weekend shifts',
  now() - interval '2 days'
),
(
  'Content Writer (Casual/Vacation)',
  'Pulse Media',
  'HK$120 - 180/hr',
  'Marketing',
  'Remote',
  'Employment Type: Casual/Vacation
Key Responsibilities:
- Write SEO blog posts and social captions for lifestyle clients
- Edit drafts according to tone guidelines and brand briefs
- Collaborate with designers for content calendar planning

Requirements:
- Portfolio of published articles or social content
- Strong English writing with basic SEO knowledge
- Able to deliver 3-5 pieces per week',
  now() - interval '5 days'
),
(
  'Teaching Assistant (Full-time)',
  'Bright Learning Centre',
  'HK$17K - 21K',
  'Education',
  'Sha Tin',
  'Employment Type: Full-time
Key Responsibilities:
- Assist lead teachers in classroom activities and lesson prep
- Support student progress tracking and parent communication
- Prepare teaching materials and handle classroom admin

Requirements:
- Associate Degree or above (Education preferred)
- Patient, organized, and good teamwork attitude
- Prior tutoring/TA experience is an advantage',
  now() - interval '4 days'
),
(
  'HR Intern (Part-time)',
  'Summit Holdings',
  'HK$65 - 80/hr',
  'Human Resources',
  'Admiralty',
  'Employment Type: Part-time Internship
Key Responsibilities:
- Support CV screening and interview scheduling
- Maintain candidate records in ATS
- Assist with employer branding events

Requirements:
- Current undergraduate in HR, Business, or related field
- Familiar with Excel and basic data handling
- Strong attention to detail and confidentiality',
  now() - interval '6 days'
),
(
  'Junior Data Analyst (Full-time)',
  'Insight Metrics Asia',
  'HK$24K - 30K',
  'IT',
  'Quarry Bay',
  'Employment Type: Full-time
Key Responsibilities:
- Build weekly dashboards for sales and operations KPIs
- Clean and transform raw data using SQL and Python
- Present findings to team leads with actionable insights

Requirements:
- Bachelor degree in Statistics, Data Science, or related
- Proficiency in SQL; basic Python (Pandas) preferred
- 0-2 years of relevant experience',
  now() - interval '8 days'
),
(
  'Sales Coordinator (Contract/Temp)',
  'EverRise Medical',
  'HK$20K - 24K',
  'Sales',
  'Kwun Tong',
  'Employment Type: Contract/Temp (6 months)
Key Responsibilities:
- Prepare quotations, invoices, and sales reports
- Coordinate order fulfilment with warehouse and logistics
- Follow up customer renewals and contract paperwork

Requirements:
- Diploma or above with 1 year coordination experience
- Organized, detail-minded, and good Excel skills
- Experience in healthcare/pharma is a plus',
  now() - interval '10 days'
),
(
  'UI/UX Designer (Full-time)',
  'BluePeak Digital',
  'HK$28K - 38K',
  'Design',
  'Cyberport',
  'Employment Type: Full-time
Key Responsibilities:
- Create wireframes, user flows, and high-fidelity prototypes
- Conduct usability testing and iterate based on findings
- Collaborate with product managers and front-end developers

Requirements:
- Portfolio demonstrating mobile and web products
- Proficiency in Figma and design systems
- Understanding of accessibility and user-centered design',
  now() - interval '12 days'
),
(
  'Project Engineer (Full-time)',
  'Metro Build Consultants',
  'HK$32K - 45K',
  'Engineering',
  'Tsim Sha Tsui',
  'Employment Type: Full-time
Key Responsibilities:
- Manage site progress, contractor coordination, and QA checks
- Prepare method statements and project documentation
- Ensure compliance with safety and regulatory standards

Requirements:
- Degree in Civil/Building Engineering
- 2+ years of site/project experience
- Holder of relevant safety card/certification',
  now() - interval '15 days'
),
(
  'Receptionist (Part-time)',
  'Oceanview Wellness',
  'HK$75 - 95/hr',
  'Administration',
  'Causeway Bay',
  'Employment Type: Part-time
Key Responsibilities:
- Handle front desk reception and appointment bookings
- Answer calls, greet clients, and manage walk-ins
- Support basic cashiering and daily closing checklist

Requirements:
- Pleasant customer-facing communication skills
- Basic computer skills and bilingual ability preferred
- Available for evening/weekend shifts',
  now() - interval '20 days'
),
(
  'Business Development Executive (Full-time)',
  'SkyBridge Logistics',
  'HK$26K - 40K + Commission',
  'Sales',
  'Kowloon Bay',
  'Employment Type: Full-time
Key Responsibilities:
- Build pipeline of SME clients for freight and warehousing solutions
- Conduct outbound calls, client visits, and proposal presentations
- Negotiate pricing and close new contracts

Requirements:
- 2+ years B2B sales experience
- Strong negotiation and presentation skills
- Experience in logistics/supply chain is preferred',
  now() - interval '7 days'
);

commit;