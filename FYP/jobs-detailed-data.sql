-- Generate 100 detailed jobs:
-- 10 categories × 10 jobs each
-- Categories are aligned to your Job Type list:
-- Technology & IT, Finance & Accounting, Marketing & Sales, Healthcare,
-- Education, Engineering, Design & Creative, Administration,
-- Human Resources, Other

begin;

-- applications.job_id references jobs.id
delete from public.applications;
delete from public.jobs;

with job_blueprints as (
  select * from (values
    (
      'Technology & IT',
      array[
        'Junior Software Engineer','Backend Developer','Frontend Developer','QA Engineer','Data Analyst',
        'IT Support Specialist','Cloud Engineer','Business Analyst','Product Support Engineer','DevOps Engineer'
      ],
      array[
        'NovaTech Systems','CodeBridge Labs','BrightStack Solutions','Pulse Digital Tech','Insight Data Hub',
        'Vertex IT Services','Cloudlane Asia','Metro Business Tech','Alpha Platform Co','OrbitOps Limited'
      ],
      array[
        'HK$18K - 24K','HK$22K - 30K','HK$20K - 28K','HK$19K - 26K','HK$24K - 32K',
        'HK$17K - 23K','HK$30K - 42K','HK$25K - 35K','HK$20K - 27K','HK$32K - 45K'
      ],
      array[
        'Cyberport','Science Park','Quarry Bay','Central','Kowloon Bay',
        'Tsuen Wan','Admiralty','Kwun Tong','Tsim Sha Tsui','Remote'
      ],
      array[
        'Full-time','Full-time','Full-time','Contract/Temp','Full-time',
        'Part-time','Full-time','Full-time','Contract/Temp','Full-time'
      ]
    ),
    (
      'Finance & Accounting',
      array[
        'Accounts Assistant','Finance Executive','AP Accountant','AR Officer','Senior Accountant',
        'Payroll Officer','Financial Analyst','Audit Assistant','Treasury Assistant','Tax Associate'
      ],
      array[
        'Harbour Finance Group','LedgerPoint Co','Prime Accounts Ltd','BlueWave Trading','Crown Capital',
        'Payroll Connect','NorthBridge Financial','AuditWorks HK','Ocean Treasury','TaxPath Advisors'
      ],
      array[
        'HK$16K - 21K','HK$20K - 28K','HK$19K - 25K','HK$18K - 24K','HK$28K - 38K',
        'HK$20K - 27K','HK$25K - 36K','HK$17K - 23K','HK$22K - 30K','HK$20K - 29K'
      ],
      array[
        'Central','Wan Chai','Causeway Bay','Kowloon Bay','Tsim Sha Tsui',
        'Quarry Bay','Admiralty','Mong Kok','Kwun Tong','Central'
      ],
      array[
        'Full-time','Full-time','Contract/Temp','Full-time','Full-time',
        'Full-time','Full-time','Part-time','Contract/Temp','Full-time'
      ]
    ),
    (
      'Marketing & Sales',
      array[
        'Marketing Assistant','Digital Marketing Executive','Social Media Specialist','SEO Content Writer','Sales Executive',
        'Business Development Officer','CRM Coordinator','Event Marketing Officer','E-commerce Specialist','Account Executive'
      ],
      array[
        'Nova Retail','MarketPulse HK','SocialBeam Agency','SearchLab Media','Skyline Commerce',
        'GrowthBridge Co','CRM Spark','Eventify Asia','ShopWave Digital','ClientFirst Solutions'
      ],
      array[
        'HK$16K - 21K','HK$20K - 29K','HK$18K - 25K','HK$17K - 24K','HK$20K - 35K',
        'HK$22K - 38K','HK$19K - 26K','HK$18K - 25K','HK$21K - 30K','HK$23K - 33K'
      ],
      array[
        'Kowloon Bay','Central','Remote','Tsuen Wan','Wan Chai',
        'Tsim Sha Tsui','Quarry Bay','Causeway Bay','Remote','Admiralty'
      ],
      array[
        'Full-time','Full-time','Contract/Temp','Casual/Vacation','Full-time',
        'Full-time','Full-time','Contract/Temp','Full-time','Full-time'
      ]
    ),
    (
      'Healthcare',
      array[
        'Clinic Assistant','Healthcare Support Worker','Nursing Assistant','Medical Receptionist','Pharmacy Assistant',
        'Patient Service Officer','Medical Secretary','Rehab Assistant','Lab Technician Assistant','Care Coordinator'
      ],
      array[
        'WellCare Clinic','Harbour Health','Prime Nursing Services','MedFront Desk','City Pharma',
        'PatientLink HK','MediSecretary Co','Recovery Plus','BioLab Assist','CareFlow Limited'
      ],
      array[
        'HK$15K - 20K','HK$16K - 22K','HK$17K - 24K','HK$15K - 21K','HK$16K - 23K',
        'HK$17K - 25K','HK$18K - 26K','HK$16K - 22K','HK$18K - 24K','HK$20K - 30K'
      ],
      array[
        'Causeway Bay','Mong Kok','Sha Tin','Central','Kowloon City',
        'Tuen Mun','Wan Chai','Tsuen Wan','Yuen Long','Admiralty'
      ],
      array[
        'Full-time','Part-time','Full-time','Full-time','Part-time',
        'Full-time','Full-time','Contract/Temp','Contract/Temp','Full-time'
      ]
    ),
    (
      'Education',
      array[
        'Teaching Assistant','English Tutor','STEM Tutor','Learning Support Assistant','Classroom Assistant',
        'Education Coordinator','Kindergarten Teacher','Exam Prep Tutor','Student Affairs Officer','Training Assistant'
      ],
      array[
        'Bright Learning Centre','EnglishPath Academy','Future STEM Lab','SupportEd HK','Classroom Plus',
        'EduBridge Services','Little Scholars KG','TopScore Prep','Campus Support Co','SkillTrain HK'
      ],
      array[
        'HK$17K - 22K','HK$18K - 26K','HK$22K - 32K','HK$16K - 21K','HK$15K - 20K',
        'HK$20K - 29K','HK$19K - 27K','HK$20K - 30K','HK$18K - 25K','HK$17K - 24K'
      ],
      array[
        'Sha Tin','Kowloon Tong','Tsuen Wan','Tin Shui Wai','Fanling',
        'Central','Sai Kung','Mong Kok','Tseung Kwan O','Wan Chai'
      ],
      array[
        'Full-time','Part-time','Part-time','Full-time','Contract/Temp',
        'Full-time','Full-time','Part-time','Full-time','Contract/Temp'
      ]
    ),
    (
      'Engineering',
      array[
        'Project Engineer','Site Engineer','Assistant Engineer','Maintenance Engineer','Quality Engineer',
        'Building Services Engineer','Mechanical Engineer','Electrical Engineer','Civil Engineering Assistant','Technical Officer'
      ],
      array[
        'Metro Build Consultants','SiteCore Engineering','Prime Infrastructure','MaintPro HK','QualityEdge Ltd',
        'BS Engineering Group','MechWorks Asia','Electra Systems','CivilPath HK','TechOps Construction'
      ],
      array[
        'HK$28K - 40K','HK$26K - 38K','HK$22K - 32K','HK$24K - 34K','HK$25K - 36K',
        'HK$30K - 45K','HK$30K - 44K','HK$30K - 44K','HK$20K - 30K','HK$22K - 31K'
      ],
      array[
        'Tsim Sha Tsui','Kwun Tong','Kowloon Bay','Tsuen Wan','Quarry Bay',
        'Central','Yuen Long','Sha Tin','Admiralty','Cheung Sha Wan'
      ],
      array[
        'Full-time','Full-time','Full-time','Contract/Temp','Full-time',
        'Full-time','Full-time','Full-time','Part-time','Contract/Temp'
      ]
    ),
    (
      'Design & Creative',
      array[
        'Graphic Designer','UI/UX Designer','Motion Designer','Video Editor','Content Designer',
        'Creative Designer','Brand Designer','Junior Illustrator','Visual Designer','Social Creative'
      ],
      array[
        'BluePeak Studio','UXFlow Digital','MotionHouse HK','CutFrame Media','ContentCraft',
        'Creative Harbor','BrandNest Co','SketchLine Studio','VisualOrbit','TrendWave Agency'
      ],
      array[
        'HK$20K - 30K','HK$24K - 36K','HK$22K - 32K','HK$18K - 28K','HK$19K - 29K',
        'HK$21K - 31K','HK$24K - 35K','HK$17K - 24K','HK$22K - 33K','HK$20K - 30K'
      ],
      array[
        'Cyberport','Central','Remote','Kowloon Bay','Quarry Bay',
        'Tsuen Wan','Wan Chai','Mong Kok','Remote','Causeway Bay'
      ],
      array[
        'Full-time','Full-time','Contract/Temp','Part-time','Full-time',
        'Full-time','Full-time','Part-time','Contract/Temp','Casual/Vacation'
      ]
    ),
    (
      'Administration',
      array[
        'Administrative Assistant','Office Administrator','Receptionist','Data Entry Clerk','Executive Assistant',
        'Operations Assistant','Office Coordinator','Document Controller','Secretary','General Clerk'
      ],
      array[
        'AdminWorks HK','OfficeCore Ltd','FrontDesk Co','DataFast Services','Exec Support Partners',
        'OpsBridge Limited','CoordiDesk HK','DocuControl Asia','Secretarial Hub','ClerkLink Ltd'
      ],
      array[
        'HK$15K - 20K','HK$18K - 24K','HK$14K - 19K','HK$15K - 20K','HK$22K - 32K',
        'HK$18K - 25K','HK$17K - 23K','HK$19K - 26K','HK$18K - 25K','HK$14K - 19K'
      ],
      array[
        'Central','Kowloon Bay','Causeway Bay','Mong Kok','Admiralty',
        'Kwun Tong','Quarry Bay','Tsim Sha Tsui','Wan Chai','Sha Tin'
      ],
      array[
        'Full-time','Full-time','Part-time','Part-time','Full-time',
        'Contract/Temp','Full-time','Contract/Temp','Full-time','Casual/Vacation'
      ]
    ),
    (
      'Human Resources',
      array[
        'HR Assistant','Recruitment Coordinator','Talent Acquisition Associate','HR Officer','Compensation Assistant',
        'Learning & Development Assistant','HR Intern','People Operations Specialist','Payroll & HR Coordinator','Employer Branding Assistant'
      ],
      array[
        'PeopleFirst HK','RecruitLink Asia','TalentBridge Co','HRConnect Ltd','PayComp Solutions',
        'LearnGrow HR','InternPeople','PeopleOps Studio','PayrollWise HK','BrandTalent Agency'
      ],
      array[
        'HK$17K - 22K','HK$20K - 28K','HK$22K - 30K','HK$22K - 32K','HK$19K - 26K',
        'HK$18K - 25K','HK$70 - 90/hr','HK$24K - 34K','HK$20K - 28K','HK$18K - 24K'
      ],
      array[
        'Admiralty','Central','Kowloon Bay','Quarry Bay','Wan Chai',
        'Tsuen Wan','Remote','Tsim Sha Tsui','Kwun Tong','Causeway Bay'
      ],
      array[
        'Full-time','Full-time','Full-time','Full-time','Contract/Temp',
        'Full-time','Part-time','Full-time','Contract/Temp','Part-time'
      ]
    ),
    (
      'Other',
      array[
        'Operations Executive','Community Officer','Event Support Staff','Customer Success Assistant','Procurement Assistant',
        'Logistics Coordinator','Retail Supervisor','Service Coordinator','Field Support Officer','General Operations Associate'
      ],
      array[
        'GeneralWorks Group','Community Link HK','Event Support Pro','SuccessPath Co','ProcureLine HK',
        'LogiFlow Asia','Retail Connect','ServiceBridge Ltd','FieldOps Limited','OpsUnity HK'
      ],
      array[
        'HK$18K - 26K','HK$17K - 24K','HK$80 - 120/hr','HK$19K - 27K','HK$18K - 25K',
        'HK$20K - 30K','HK$22K - 32K','HK$20K - 29K','HK$18K - 26K','HK$19K - 28K'
      ],
      array[
        'Central','Tsuen Wan','Tsim Sha Tsui','Kowloon Bay','Kwun Tong',
        'Yuen Long','Mong Kok','Causeway Bay','Sha Tin','Wan Chai'
      ],
      array[
        'Full-time','Full-time','Casual/Vacation','Full-time','Contract/Temp',
        'Full-time','Full-time','Part-time','Contract/Temp','Full-time'
      ]
    )
  ) as t(category, titles, companies, salaries, locations, employment_types)
),
expanded as (
  select
    b.category,
    b.titles[i] as role_title,
    b.companies[i] as company,
    b.salaries[i] as salary_range,
    b.locations[i] as location,
    b.employment_types[i] as employment_type,
    i as seq
  from job_blueprints b
  cross join generate_series(1,10) as i
)
insert into public.jobs (title, company, salary_range, category, location, requirements, created_at)
select
  role_title || ' (' || employment_type || ')',
  company,
  salary_range,
  category,
  location,
  'Employment Type: ' || employment_type || E'\n' ||
  E'Key Responsibilities:\n' ||
  case category
    when 'Technology & IT' then E'- Build and maintain internal/product systems\n- Troubleshoot incidents and support deployments\n- Collaborate with product and QA teams'
    when 'Finance & Accounting' then E'- Prepare monthly reports and reconciliations\n- Process AP/AR and support audits\n- Ensure compliance with internal controls'
    when 'Marketing & Sales' then E'- Execute campaigns and sales follow-ups\n- Maintain CRM records and lead pipeline\n- Prepare weekly performance reports'
    when 'Healthcare' then E'- Support patient care operations\n- Handle records and appointment workflows\n- Coordinate with clinicians and service teams'
    when 'Education' then E'- Support lesson/classroom activities\n- Track learner progress and attendance\n- Communicate with students/parents'
    when 'Engineering' then E'- Assist project/site execution and coordination\n- Prepare technical documents and reports\n- Ensure safety and quality compliance'
    when 'Design & Creative' then E'- Produce creative assets and visual deliverables\n- Iterate designs from stakeholder feedback\n- Maintain quality and brand consistency'
    when 'Administration' then E'- Handle office administration and documentation\n- Coordinate meetings and cross-team requests\n- Maintain records and process tracking'
    when 'Human Resources' then E'- Support recruitment and interview scheduling\n- Maintain HR records and onboarding tasks\n- Coordinate internal people operations'
    else E'- Support daily business operations\n- Coordinate with internal and external parties\n- Deliver tasks on time with quality'
  end || E'\n\n' ||
  E'Requirements:\n' ||
  case category
    when 'Technology & IT' then E'- Diploma or above in IT/computing or related discipline\n- Practical knowledge of systems, tools, or coding\n- Good problem-solving and teamwork skills'
    when 'Finance & Accounting' then E'- Diploma or above in Accounting/Finance or related discipline\n- Basic Excel and reporting skills\n- Detail-minded and responsible'
    when 'Marketing & Sales' then E'- Diploma or above in Marketing/Business or related discipline\n- Good communication and presentation ability\n- Familiarity with digital tools is a plus'
    when 'Healthcare' then E'- Relevant healthcare support/assistant experience preferred\n- Good communication and empathy\n- Willing to work shifts when required'
    when 'Education' then E'- Relevant education/tutoring experience preferred\n- Patient and organized working style\n- Good written and spoken communication'
    when 'Engineering' then E'- Relevant engineering qualification preferred\n- Knowledge of project/site workflow\n- Strong safety awareness and coordination skills'
    when 'Design & Creative' then E'- Portfolio or practical design experience\n- Proficiency in relevant design tools\n- Ability to manage deadlines and revisions'
    when 'Administration' then E'- Good PC skills (Word/Excel/Email)\n- Organized and detail-oriented\n- Good communication and follow-through'
    when 'Human Resources' then E'- Basic HR/recruitment process understanding\n- Organized and able to handle sensitive data\n- Good communication and stakeholder skills'
    else E'- Diploma or above preferred\n- Reliable communication and teamwork\n- Able to adapt in a fast-paced environment'
  end,
  now() - ((seq + (row_number() over (partition by category order by seq) - 1)) || ' days')::interval
from expanded
order by category, seq;

commit;