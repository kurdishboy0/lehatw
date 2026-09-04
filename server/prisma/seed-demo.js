// Generates realistic demo/test data: 10 fictional companies posting 30 job
// posts across a wide range of fields, plus 20 student profiles across
// different fields of study. Everything uses the @demo.lehatw.test email
// domain so it's trivially identifiable and removable later with
// `npm run seed:demo:cleanup` (see cleanup-demo.js).
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const COMPANIES = [
  {
    email: 'hr@peshraw-telecom.demo.lehatw.test',
    companyName: 'Peshraw Telecom',
    industry: 'Telecommunications',
    jobTitle: 'HR Manager',
    crNumber: 'CR-2015-11234',
    website: 'https://peshrawtelecom.example.com',
    phone: '0750 111 2233',
    address: '100m Street, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Network Engineer',
        description: 'Peshraw Telecom is looking for a Network Engineer to maintain and expand our regional mobile network infrastructure across Erbil and surrounding areas.',
        responsibilities: 'Monitor and maintain core and access network equipment\nTroubleshoot network outages and performance issues\nPlan capacity upgrades for growing subscriber base\nCoordinate with vendors on equipment installation',
        requirements: "Bachelor's degree in Electrical, Electronic, or Telecommunications Engineering\n2-4 years of experience in telecom network operations\nFamiliarity with power systems and control systems\nWillingness to travel to site locations when needed",
        benefits: 'Health insurance for employee and family\nAnnual performance bonus\nTransportation allowance\nOn-the-job technical training',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Electrical/Electronic Engineering or Telecommunications",
        requiresCv: true, skills: ['Telecommunications', 'Power Systems', 'Control Systems']
      },
      {
        title: 'Customer Support Representative',
        description: 'We are hiring Customer Support Representatives to handle subscriber inquiries, billing questions, and technical support requests at our Erbil call center.',
        responsibilities: 'Answer inbound calls and respond to customer inquiries\nResolve billing and service complaints\nLog tickets accurately in the CRM system\nEscalate technical issues to the network team when needed',
        requirements: "Bachelor's degree in any field\nStrong communication skills in Kurdish, Arabic, and English\nBasic computer literacy (MS Office)\nAbility to work in shifts",
        benefits: 'Health insurance\nMonthly attendance bonus\nCareer growth into team lead roles\nPaid training period',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-1 years of experience',
        education: "Bachelor's degree (any field)",
        requiresCv: true, skills: ['MS Office / Excel']
      },
      {
        title: 'Telecom Sales Executive',
        description: 'Join our commercial team to promote Peshraw Telecom postpaid and corporate packages to businesses and individual customers across the region.',
        responsibilities: 'Meet monthly sales targets for postpaid and corporate lines\nBuild relationships with corporate clients\nPrepare weekly sales reports\nRepresent the company at promotional events',
        requirements: '1-3 years of sales or business development experience\nStrong negotiation and interpersonal skills\nValid driving license\nExperience in telecom or FMCG sales is a plus',
        benefits: 'Base salary plus uncapped commission\nCompany vehicle for field visits\nHealth insurance\nQuarterly incentive trips',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Business or a related field",
        requiresCv: true, skills: ['Digital Marketing', 'Branding']
      }
    ]
  },
  {
    email: 'hr@zagros-networks.demo.lehatw.test',
    companyName: 'Zagros Networks',
    industry: 'Information Technology',
    jobTitle: 'Talent Acquisition Lead',
    crNumber: 'CR-2018-22876',
    website: 'https://zagrosnetworks.example.com',
    phone: '0770 222 3344',
    address: 'Empire Business Complex, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Backend Developer (Node.js)',
        description: 'Zagros Networks builds web and mobile platforms for clients across the region. We are looking for a Backend Developer to design and maintain our API services.',
        responsibilities: 'Design and build RESTful APIs using Node.js and Express\nWrite and optimize PostgreSQL queries\nCollaborate with frontend developers on API contracts\nWrite unit tests and participate in code reviews',
        requirements: "Bachelor's degree in Computer Science or Information Technology\n1-3 years of experience with Node.js and SQL databases\nUnderstanding of REST API design principles\nFamiliarity with Git-based workflows",
        benefits: 'Hybrid work schedule\nHealth insurance\nAnnual training budget\nModern office with flexible hours',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'Hybrid', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Computer Science or Information Technology",
        requiresCv: true, skills: ['Node.js', 'Express', 'PostgreSQL', 'RESTful APIs']
      },
      {
        title: 'IT Support Specialist',
        description: 'We need an IT Support Specialist to maintain internal systems, manage user accounts, and provide first-line technical support to our growing team.',
        responsibilities: 'Set up and maintain employee workstations\nManage Active Directory user accounts\nRespond to internal helpdesk tickets\nMaintain office network and printers',
        requirements: "Diploma or Bachelor's degree in IT\n0-1 years of experience (fresh graduates welcome)\nBasic knowledge of Windows Server and networking\nGood problem-solving attitude",
        benefits: 'Health insurance\nMentorship from senior IT staff\nCertification sponsorship after 1 year\nFriendly team environment',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-1 years of experience',
        education: "Diploma or Bachelor's degree in Information Technology",
        requiresCv: true, skills: ['Windows Server', 'Active Directory Domain Services', 'DHCP & DNS']
      },
      {
        title: 'QA Engineer',
        description: 'Zagros Networks is hiring a QA Engineer to test our web and mobile products before release and help improve our overall quality process.',
        responsibilities: 'Write and execute manual test cases\nReport and track bugs through resolution\nWork with developers to reproduce and verify fixes\nHelp build a regression test checklist',
        requirements: "Bachelor's degree in Computer Science or related field\n1-3 years of QA or software testing experience\nAttention to detail and clear bug-reporting skills\nBasic understanding of how APIs and databases work",
        benefits: 'Hybrid work schedule\nHealth insurance\nClear promotion path to QA Lead\nCollaborative team culture',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'Hybrid', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Computer Science or a related field",
        requiresCv: true, skills: ['RESTful APIs', 'SQL']
      }
    ]
  },
  {
    email: 'hr@hawler-talentbridge.demo.lehatw.test',
    companyName: 'Hawler Talent Bridge',
    industry: 'Recruitment & HR Consultancy',
    jobTitle: 'Recruitment Consultant',
    crNumber: 'CR-2020-33991',
    website: 'https://hawlertalentbridge.example.com',
    phone: '0751 333 4455',
    address: 'Gulan Street, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Graphic Designer',
        description: 'On behalf of a regional media client, Hawler Talent Bridge is hiring a Graphic Designer to produce visual content for social media and print campaigns.',
        responsibilities: 'Design social media graphics, banners, and short videos\nMaintain brand consistency across campaigns\nEdit photos and short video clips for publication\nCollaborate with the content team on campaign concepts',
        requirements: '1-2 years of graphic design or media production experience\nPortfolio of previous design or video work\nExperience with photo and video editing tools\nGood sense of visual storytelling',
        benefits: 'Competitive salary\nCreative and flexible work environment\nOpportunity to work across multiple client brands\nHealth insurance',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-2 years of experience',
        education: "Bachelor's degree in Media, Design, or a related field",
        requiresCv: true, skills: ['Video Editing', 'Photography', 'Social Media Management']
      },
      {
        title: 'Legal Assistant',
        description: 'A corporate client of Hawler Talent Bridge is seeking a Legal Assistant to support contract review and general legal administration.',
        responsibilities: 'Draft and review basic contracts and agreements\nMaintain legal document filing systems\nConduct legal research on request\nSupport senior legal counsel with case preparation',
        requirements: "Bachelor's degree in Law\n0-2 years of experience (recent graduates welcome)\nStrong written Arabic and English\nAttention to detail and confidentiality",
        benefits: 'Health insurance\nMentorship from senior legal counsel\nStructured career growth path\nPaid public holidays',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-2 years of experience',
        education: "Bachelor's degree in Law",
        requiresCv: true, skills: ['Legal Research', 'Legal Writing', 'Contract Drafting']
      },
      {
        title: 'Junior Architect',
        description: 'A construction and design client is looking for a Junior Architect to support residential and commercial project design through Hawler Talent Bridge.',
        responsibilities: 'Prepare architectural drawings and 3D models\nAssist senior architects during design development\nPrepare presentation materials for client meetings\nVisit project sites to track construction progress',
        requirements: "Bachelor's degree in Architecture\n0-2 years of experience\nProficiency in AutoCAD and a 3D modeling tool\nStrong visual presentation skills",
        benefits: 'Health insurance\nExposure to diverse residential and commercial projects\nSite visit allowance\nPortfolio-building opportunities',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-2 years of experience',
        education: "Bachelor's degree in Architecture",
        requiresCv: true, skills: ['AutoCAD', 'SketchUp', 'Revit']
      }
    ]
  },
  {
    email: 'hr@kurdistangate-bank.demo.lehatw.test',
    companyName: 'Kurdistan Gate Bank',
    industry: 'Banking & Financial Services',
    jobTitle: 'HR Business Partner',
    crNumber: 'CR-2009-44520',
    website: 'https://kurdistangatebank.example.com',
    phone: '0770 444 5566',
    address: 'Havalan Street, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Bank Teller',
        description: 'Kurdistan Gate Bank is hiring Bank Tellers for our Erbil main branch to handle daily customer transactions and account services.',
        responsibilities: 'Process deposits, withdrawals, and transfers\nOpen new customer accounts\nBalance the cash drawer daily\nProvide accurate information about bank products',
        requirements: "Bachelor's degree, preferably in Accounting, Finance, or Business\n0-2 years of experience\nStrong numeracy and cash-handling accuracy\nProfessional, customer-facing attitude",
        benefits: 'Health insurance\nEnd-of-year bonus\nInternal training program\nCareer path into banking operations',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-2 years of experience',
        education: "Bachelor's degree in Accounting, Finance, or Business",
        requiresCv: true, skills: ['Banking Operations', 'MS Office / Excel']
      },
      {
        title: 'Credit Analyst',
        description: 'We are looking for a Credit Analyst to assess loan applications and support the bank\'s credit risk decisions.',
        responsibilities: 'Analyze financial statements of loan applicants\nPrepare credit risk assessment reports\nMonitor existing loan portfolios for risk indicators\nCoordinate with relationship managers on documentation',
        requirements: "Bachelor's degree in Finance, Accounting, or Economics\n2-4 years of experience in credit or financial analysis\nStrong analytical and Excel skills\nUnderstanding of financial statements",
        benefits: 'Health insurance\nPerformance-based annual bonus\nProfessional certification support\nStructured career progression',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Finance, Accounting, or Economics",
        requiresCv: true, skills: ['Credit Analysis', 'Financial Analysis', 'Risk Management']
      },
      {
        title: 'Compliance Officer',
        description: 'Kurdistan Gate Bank seeks a Compliance Officer to ensure our operations meet local banking regulations and international standards.',
        responsibilities: 'Monitor transactions for regulatory compliance\nPrepare compliance reports for management and regulators\nConduct internal compliance training sessions\nStay current on Central Bank regulations',
        requirements: "Bachelor's degree in Law, Finance, or Business\n3-5 years of experience in banking compliance or audit\nKnowledge of anti-money laundering (AML) regulations\nStrong attention to detail",
        benefits: 'Health insurance\nCompetitive salary\nProfessional development budget\nStable long-term career path',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '3-5 years of experience',
        education: "Bachelor's degree in Law, Finance, or Business",
        requiresCv: true, skills: ['Risk Management', 'Auditing', 'Corporate Law']
      }
    ]
  },
  {
    email: 'hr@sarchinar-construction.demo.lehatw.test',
    companyName: 'Sarchinar Construction Group',
    industry: 'Construction & Civil Engineering',
    jobTitle: 'HR & Admin Manager',
    crNumber: 'CR-2012-55127',
    website: 'https://sarchinarconstruction.example.com',
    phone: '0771 555 6677',
    address: 'Salim Street, Sulaymaniyah, Kurdistan Region',
    jobs: [
      {
        title: 'Site Civil Engineer',
        description: 'Sarchinar Construction Group is looking for a Site Civil Engineer to oversee residential construction projects in Sulaymaniyah.',
        responsibilities: 'Supervise daily site construction activities\nEnsure work follows approved drawings and specifications\nCoordinate with subcontractors and site foremen\nMaintain daily site progress reports',
        requirements: "Bachelor's degree in Civil Engineering\n2-4 years of site engineering experience\nFamiliarity with AutoCAD Civil 3D\nAbility to work full-time on active construction sites",
        benefits: 'Health insurance\nSite allowance\nEnd-of-project bonus\nCareer growth into project management',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Civil Engineering",
        requiresCv: true, skills: ['AutoCAD Civil 3D', 'Construction Management', 'Surveying']
      },
      {
        title: 'Structural Engineer',
        description: 'We are hiring a Structural Engineer to design and review structural drawings for our residential and commercial building projects.',
        responsibilities: 'Perform structural analysis and design calculations\nReview and approve structural drawings\nCoordinate with architects on design integration\nEnsure designs meet local building codes',
        requirements: "Bachelor's degree in Civil Engineering (Structural focus)\n3-5 years of structural design experience\nProficiency in ETABS or SAP2000\nStrong understanding of reinforced concrete design",
        benefits: 'Health insurance\nCompetitive salary\nProfessional development support\nInvolvement in landmark regional projects',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '3-5 years of experience',
        education: "Bachelor's degree in Civil Engineering",
        requiresCv: true, skills: ['Structural Design (ETABS/SAP2000)', 'Reinforced Concrete Design', 'Structural Analysis']
      },
      {
        title: 'Quantity Surveyor',
        description: 'Sarchinar Construction Group needs a Quantity Surveyor to manage cost estimation and procurement across our active projects.',
        responsibilities: 'Prepare bills of quantities and cost estimates\nTrack project costs against budget\nReview supplier and subcontractor quotations\nSupport tender preparation and evaluation',
        requirements: "Bachelor's degree in Civil Engineering or Quantity Surveying\n2-4 years of cost estimation experience\nStrong Excel and cost-tracking skills\nAttention to detail",
        benefits: 'Health insurance\nSite and project allowances\nYear-end bonus\nStable long-term contracts',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Civil Engineering or Quantity Surveying",
        requiresCv: true, skills: ['Construction Management', 'MS Office / Excel']
      }
    ]
  },
  {
    email: 'hr@rangin-health.demo.lehatw.test',
    companyName: 'Rangin Health Group',
    industry: 'Healthcare',
    jobTitle: 'HR Officer',
    crNumber: 'CR-2011-66284',
    website: 'https://ranginhealth.example.com',
    phone: '0750 666 7788',
    address: 'Italian Village Road, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Staff Nurse',
        description: 'Rangin Health Group is hiring Staff Nurses for our general hospital ward in Erbil to provide direct patient care.',
        responsibilities: 'Monitor patient vital signs and conditions\nAdminister medications as prescribed\nMaintain accurate patient records\nSupport doctors during rounds and procedures',
        requirements: "Bachelor's degree in Nursing\n0-2 years of clinical experience\nValid nursing license\nAbility to work rotating shifts",
        benefits: 'Health insurance for employee and family\nShift allowances\nContinuing education support\nSupportive clinical environment',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '0-2 years of experience',
        education: "Bachelor's degree in Nursing",
        requiresCv: true, skills: ['Clinical Nursing', 'Vital Signs Monitoring', 'Medication Administration']
      },
      {
        title: 'Pharmacist',
        description: 'We are looking for a licensed Pharmacist to manage our outpatient pharmacy and support clinical staff on medication guidance.',
        responsibilities: 'Dispense prescribed medications accurately\nCounsel patients on proper medication use\nMonitor drug interactions and allergies\nManage pharmacy inventory and ordering',
        requirements: "Bachelor's degree in Pharmacy\nValid pharmacy license\n1-3 years of clinical or retail pharmacy experience\nStrong attention to detail",
        benefits: 'Health insurance\nContinuing education allowance\nCompetitive salary\nProfessional, supportive team',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Pharmacy",
        requiresCv: true, skills: ['Clinical Pharmacy', 'Dispensing & Compounding', 'Pharmacology']
      },
      {
        title: 'Medical Laboratory Technologist',
        description: 'Rangin Health Group is hiring a Medical Laboratory Technologist to perform diagnostic testing for our hospital laboratory.',
        responsibilities: 'Perform hematology, biochemistry, and microbiology tests\nMaintain laboratory equipment and quality controls\nRecord and report test results accurately\nFollow lab safety and infection control protocols',
        requirements: "Bachelor's degree in Medical Laboratory Technology\n1-3 years of laboratory experience\nFamiliarity with lab safety standards\nAbility to work under time pressure",
        benefits: 'Health insurance\nShift allowance\nOngoing lab equipment training\nCareer growth into senior technologist roles',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Medical Laboratory Technology",
        requiresCv: true, skills: ['Hematology', 'Biochemistry Testing', 'Lab Safety']
      }
    ]
  },
  {
    email: 'hr@newroz-energy.demo.lehatw.test',
    companyName: 'Newroz Energy',
    industry: 'Oil & Gas',
    jobTitle: 'HR & Recruitment Lead',
    crNumber: 'CR-2013-77341',
    website: 'https://newrozenergy.example.com',
    phone: '0751 777 8899',
    address: 'Industrial Zone, Duhok, Kurdistan Region',
    jobs: [
      {
        title: 'Petroleum Engineer',
        description: 'Newroz Energy is seeking a Petroleum Engineer to support reservoir evaluation and production planning at our Duhok operations.',
        responsibilities: 'Analyze reservoir performance data\nSupport well planning and production forecasts\nCollaborate with geologists on field development plans\nPrepare technical reports for management',
        requirements: "Bachelor's degree in Petroleum Engineering\n2-4 years of upstream oil & gas experience\nKnowledge of reservoir engineering principles\nWillingness to travel to field sites",
        benefits: 'Health insurance\nField allowance\nCompetitive salary package\nInternational training opportunities',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Petroleum Engineering",
        requiresCv: true, skills: ['Reservoir Engineering', 'Petroleum Geology', 'Drilling Operations']
      },
      {
        title: 'HSE Officer',
        description: 'We are hiring an HSE Officer to enforce health, safety, and environmental standards across our field operations.',
        responsibilities: 'Conduct daily safety inspections at field sites\nInvestigate incidents and near-misses\nDeliver safety induction training to staff and contractors\nMaintain HSE compliance documentation',
        requirements: "Bachelor's degree in Engineering or a related field\nHSE certification preferred\n2-4 years of HSE experience in an industrial setting\nStrong observational and reporting skills",
        benefits: 'Health insurance\nField allowance\nHSE certification sponsorship\nSafety performance bonus',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Engineering or a related field",
        requiresCv: true, skills: ['HSE (Health, Safety, Environment)']
      },
      {
        title: 'Field Operations Technician',
        description: 'Newroz Energy is looking for a Field Operations Technician to support daily wellsite operations and equipment maintenance.',
        responsibilities: 'Operate and monitor field production equipment\nPerform routine equipment maintenance checks\nRecord daily production and operational data\nFollow strict HSE procedures at all times',
        requirements: 'Diploma or Bachelor\'s degree in a technical field\n1-3 years of field operations experience\nWillingness to work in remote field locations\nBasic understanding of pipeline systems',
        benefits: 'Health insurance\nField and housing allowance\nRotational schedule\nOn-the-job technical training',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Diploma or Bachelor's degree in a technical field",
        requiresCv: true, skills: ['Pipeline Engineering', 'HSE (Health, Safety, Environment)']
      }
    ]
  },
  {
    email: 'hr@goldenerbil-retail.demo.lehatw.test',
    companyName: 'Golden Erbil Retail',
    industry: 'Retail & E-Commerce',
    jobTitle: 'HR Generalist',
    crNumber: 'CR-2016-88452',
    website: 'https://goldenerbilretail.example.com',
    phone: '0770 888 9900',
    address: 'Family Mall Area, Erbil, Kurdistan Region',
    jobs: [
      {
        title: 'Marketing Specialist',
        description: 'Golden Erbil Retail is looking for a Marketing Specialist to plan and execute campaigns across our stores and online channels.',
        responsibilities: 'Plan monthly marketing and promotional campaigns\nManage social media content calendar\nTrack campaign performance using analytics tools\nCoordinate with designers on marketing materials',
        requirements: "Bachelor's degree in Marketing or Business\n1-3 years of marketing experience\nFamiliarity with social media and analytics tools\nCreative, results-driven mindset",
        benefits: 'Health insurance\nEmployee store discount\nPerformance bonus\nCreative, fast-paced environment',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Marketing or Business",
        requiresCv: true, skills: ['Digital Marketing', 'Social Media Marketing', 'Google Analytics']
      },
      {
        title: 'Store Manager',
        description: 'We are hiring a Store Manager to oversee daily operations, staff, and sales performance at one of our flagship retail locations.',
        responsibilities: 'Manage daily store operations and staff schedules\nMonitor sales targets and inventory levels\nTrain and supervise sales staff\nHandle customer escalations professionally',
        requirements: "Bachelor's degree in Business or related field\n3-5 years of retail management experience\nStrong leadership and organizational skills\nAvailability to work weekends and holidays",
        benefits: 'Health insurance\nPerformance-based bonus\nEmployee discount\nClear path to regional management roles',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '3-5 years of experience',
        education: "Bachelor's degree in Business or a related field",
        requiresCv: true, skills: ['Leadership', 'Operations Management']
      },
      {
        title: 'E-Commerce Coordinator',
        description: 'Golden Erbil Retail is expanding online and needs an E-Commerce Coordinator to manage our online store listings and orders.',
        responsibilities: 'Upload and maintain product listings on the online store\nCoordinate order fulfillment with the warehouse team\nMonitor online customer reviews and inquiries\nSupport online promotional campaigns',
        requirements: "Bachelor's degree in Business, Marketing, or IT\n1-2 years of e-commerce or digital operations experience\nComfortable working with e-commerce platforms\nStrong organizational skills",
        benefits: 'Health insurance\nEmployee discount\nHybrid work flexibility\nGrowing e-commerce team',
        location: 'Erbil', employmentType: 'Full-Time', workMode: 'Hybrid', experienceLevel: '1-2 years of experience',
        education: "Bachelor's degree in Business, Marketing, or Information Technology",
        requiresCv: true, skills: ['E-Commerce Platforms', 'Digital Marketing']
      }
    ]
  },
  {
    email: 'hr@brightminds-academy.demo.lehatw.test',
    companyName: 'Bright Minds Academy',
    industry: 'Education',
    jobTitle: 'Principal',
    crNumber: 'CR-2010-99563',
    website: 'https://brightmindsacademy.example.com',
    phone: '0771 999 0011',
    address: 'Salim Street, Sulaymaniyah, Kurdistan Region',
    jobs: [
      {
        title: 'English Teacher',
        description: 'Bright Minds Academy is hiring an English Teacher for our middle and high school classes for the upcoming academic year.',
        responsibilities: 'Plan and deliver engaging English lessons\nAssess and track student progress\nPrepare students for standardized exams\nCommunicate regularly with parents on student performance',
        requirements: "Bachelor's degree in English, Education, or a related field\n1-3 years of teaching experience preferred\nStrong classroom management skills\nFluent written and spoken English",
        benefits: 'Health insurance\nSummer break with pay\nProfessional development workshops\nSupportive academic environment',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in English, Education, or a related field",
        requiresCv: true, skills: ['Lesson Planning', 'Classroom Management']
      },
      {
        title: 'School Administrator',
        description: 'We are looking for a School Administrator to manage daily school operations, admissions, and staff coordination.',
        responsibilities: 'Oversee daily school administrative operations\nManage student admissions and records\nCoordinate schedules between teachers and departments\nHandle parent communications and inquiries',
        requirements: "Bachelor's degree in Education, Business, or a related field\n2-4 years of administrative experience, preferably in education\nStrong organizational and communication skills\nProficiency in MS Office",
        benefits: 'Health insurance\nStable academic-year schedule\nProfessional, collaborative environment\nYear-end bonus',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '2-4 years of experience',
        education: "Bachelor's degree in Education, Business, or a related field",
        requiresCv: true, skills: ['MS Office / Excel']
      },
      {
        title: 'Curriculum Developer',
        description: 'Bright Minds Academy seeks a Curriculum Developer to design and update our K-12 curriculum materials across subjects.',
        responsibilities: 'Design curriculum frameworks aligned with learning outcomes\nDevelop lesson plans and assessment materials\nTrain teachers on new curriculum content\nReview and update materials based on teacher feedback',
        requirements: "Bachelor's degree in Education or Educational Psychology\n3-5 years of teaching or curriculum design experience\nStrong instructional design skills\nExperience with e-learning tools is a plus",
        benefits: 'Health insurance\nCreative, impact-driven role\nProfessional development opportunities\nCollaborative academic team',
        location: 'Sulaymaniyah', employmentType: 'Full-Time', workMode: 'Hybrid', experienceLevel: '3-5 years of experience',
        education: "Bachelor's degree in Education or Educational Psychology",
        requiresCv: true, skills: ['Curriculum Design', 'Instructional Design', 'E-Learning Tools']
      }
    ]
  },
  {
    email: 'hr@agrizagros.demo.lehatw.test',
    companyName: 'AgriZagros Co.',
    industry: 'Agriculture',
    jobTitle: 'HR Coordinator',
    crNumber: 'CR-2014-10674',
    website: 'https://agrizagros.example.com',
    phone: '0750 101 2020',
    address: 'Simele Road, Duhok, Kurdistan Region',
    jobs: [
      {
        title: 'Agricultural Engineer',
        description: 'AgriZagros Co. is hiring an Agricultural Engineer to improve crop yields and irrigation efficiency across our farms near Duhok.',
        responsibilities: 'Design and monitor irrigation system layouts\nAdvise on soil preparation and crop rotation\nMonitor crop health and recommend interventions\nPrepare seasonal production reports',
        requirements: "Bachelor's degree in Agricultural Engineering or Agricultural Sciences\n1-3 years of experience in farm operations\nKnowledge of modern irrigation systems\nWillingness to work on-site at farm locations",
        benefits: 'Health insurance\nField allowance\nHousing support for relocating staff\nSeasonal performance bonus',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Agricultural Engineering or Agricultural Sciences",
        requiresCv: true, skills: ['Irrigation Systems', 'Crop Production', 'Soil Science']
      },
      {
        title: 'Food Safety Officer',
        description: 'We are looking for a Food Safety Officer to oversee quality and safety standards at our produce packing facility.',
        responsibilities: 'Enforce food safety and hygiene standards on-site\nConduct regular facility safety inspections\nMaintain HACCP documentation\nTrain staff on food handling procedures',
        requirements: "Bachelor's degree in Food Science, Agriculture, or a related field\n1-3 years of food safety or quality assurance experience\nKnowledge of HACCP principles\nStrong attention to detail",
        benefits: 'Health insurance\nOn-site meals\nTransportation allowance\nCareer growth into quality management',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '1-3 years of experience',
        education: "Bachelor's degree in Food Science, Agriculture, or a related field",
        requiresCv: true, skills: ['Food Safety', 'HACCP']
      },
      {
        title: 'Farm Operations Manager',
        description: 'AgriZagros Co. needs a Farm Operations Manager to oversee daily farm activities, staff, and equipment across our production sites.',
        responsibilities: 'Plan and supervise daily farm operations\nManage farm labor scheduling and equipment use\nTrack production costs against budget\nCoordinate harvest and distribution logistics',
        requirements: "Bachelor's degree in Agricultural Sciences or Business\n3-5 years of farm or operations management experience\nStrong leadership and planning skills\nHands-on, on-site working style",
        benefits: 'Health insurance\nHousing allowance\nPerformance-based bonus\nLong-term career stability',
        location: 'Duhok', employmentType: 'Full-Time', workMode: 'On-Site', experienceLevel: '3-5 years of experience',
        education: "Bachelor's degree in Agricultural Sciences or Business",
        requiresCv: true, skills: ['Crop Production', 'Precision Agriculture']
      }
    ]
  }
];

const STUDENTS = [
  { name: 'Diyar Rashid', university: 'Erbil Polytechnic University', field: 'Computer Science', grad: 2025,
    bio: 'Aspiring full-stack developer passionate about building fast, practical web applications.',
    skills: [['React', 'Expert'], ['Node.js', 'Intermediate'], ['Python', 'Intermediate']] },
  { name: 'Shne Ali', university: 'Salahaddin University-Erbil', field: 'Software Engineering', grad: 2024,
    bio: 'Software engineering student focused on applying machine learning to real-world products.',
    skills: [['Machine Learning', 'Expert'], ['TensorFlow', 'Intermediate'], ['Deep Learning', 'Intermediate']] },
  { name: 'Karwan Hassan', university: 'Koya University', field: 'Artificial Intelligence', grad: 2026,
    bio: 'AI student exploring computer vision and neural network architectures.',
    skills: [['Neural Networks', 'Intermediate'], ['PyTorch', 'Intermediate'], ['Computer Vision', 'Beginner']] },
  { name: 'Runak Osman', university: 'University of Duhok', field: 'Civil Engineering', grad: 2024,
    bio: 'Civil engineering student interested in structural design and sustainable construction.',
    skills: [['AutoCAD Civil 3D', 'Expert'], ['Structural Analysis', 'Intermediate'], ['Surveying', 'Intermediate']] },
  { name: 'Aram Saleh', university: 'Sulaimani Polytechnic University', field: 'Electrical Engineering', grad: 2025,
    bio: 'Electrical engineering student with hands-on experience in embedded systems and automation.',
    skills: [['Circuit Design', 'Intermediate'], ['PLC Programming', 'Intermediate'], ['Power Systems', 'Beginner']] },
  { name: 'Halgurd Faraj', university: 'Charmo University', field: 'Mechanical Engineering', grad: 2023,
    bio: 'Mechanical engineering graduate with a focus on CAD design and manufacturing processes.',
    skills: [['SolidWorks', 'Expert'], ['AutoCAD Mechanical', 'Intermediate'], ['Thermodynamics', 'Intermediate']] },
  { name: 'Zhilwan Ahmad', university: 'University of Zakho', field: 'Petroleum Engineering', grad: 2026,
    bio: 'Petroleum engineering student interested in reservoir management and field operations.',
    skills: [['Reservoir Engineering', 'Intermediate'], ['Drilling Operations', 'Beginner'], ['HSE (Health, Safety, Environment)', 'Intermediate']] },
  { name: 'Sara Kamal', university: 'Ishik University', field: 'Architecture', grad: 2024,
    bio: 'Architecture student passionate about sustainable urban design and 3D visualization.',
    skills: [['AutoCAD', 'Expert'], ['Revit', 'Intermediate'], ['SketchUp', 'Intermediate']] },
  { name: 'Ronahi Mahmoud', university: 'Hawler Medical University', field: 'Medicine', grad: 2027,
    bio: 'Medical student dedicated to patient-centered care and clinical research.',
    skills: [['Anatomy & Physiology', 'Expert'], ['Clinical Diagnosis', 'Intermediate'], ['Patient Care', 'Intermediate']] },
  { name: 'Barham Qadir', university: 'University of Sulaimani', field: 'Pharmacy', grad: 2025,
    bio: 'Pharmacy student interested in clinical pharmacy and patient medication counseling.',
    skills: [['Pharmaceutical Chemistry', 'Intermediate'], ['Clinical Pharmacy', 'Intermediate'], ['Drug Formulation', 'Beginner']] },
  { name: 'Newroz Salih', university: 'Cihan University', field: 'Nursing', grad: 2024,
    bio: 'Nursing student committed to compassionate patient care and emergency response.',
    skills: [['Clinical Nursing', 'Expert'], ['Vital Signs Monitoring', 'Intermediate'], ['Infection Control', 'Intermediate']] },
  { name: 'Hemin Jalal', university: 'American University of Iraq, Sulaimani', field: 'Business Administration', grad: 2025,
    bio: 'Business student interested in strategy and entrepreneurship in emerging markets.',
    skills: [['Strategic Management', 'Intermediate'], ['Leadership', 'Intermediate'], ['Project Management', 'Beginner']] },
  { name: 'Avan Rostam', university: 'Nawroz University', field: 'Accounting & Finance', grad: 2023,
    bio: 'Finance graduate with practical experience in financial reporting and auditing.',
    skills: [['Financial Accounting', 'Expert'], ['Auditing', 'Intermediate'], ['Excel Advanced', 'Intermediate']] },
  { name: 'Dashty Karim', university: 'University of Halabja', field: 'Economics', grad: 2026,
    bio: 'Economics student interested in regional development and market analysis.',
    skills: [['Microeconomics', 'Intermediate'], ['Macroeconomics', 'Intermediate'], ['Econometrics', 'Beginner']] },
  { name: 'Lawin Ismail', university: 'Salahaddin University-Erbil', field: 'Law', grad: 2024,
    bio: 'Law student focused on civil law and contract negotiation.',
    skills: [['Legal Research', 'Expert'], ['Legal Writing', 'Intermediate'], ['Civil Law', 'Intermediate']] },
  { name: 'Gulan Aziz', university: 'Soran University', field: 'Education & Teaching', grad: 2025,
    bio: 'Education student passionate about curriculum design and classroom innovation.',
    skills: [['Curriculum Design', 'Intermediate'], ['Classroom Management', 'Intermediate'], ['Lesson Planning', 'Beginner']] },
  { name: 'Shvan Nuri', university: 'Tishk International University', field: 'Media, Journalism & Communication', grad: 2024,
    bio: 'Journalism student experienced in digital storytelling and video production.',
    skills: [['Journalism', 'Intermediate'], ['Video Editing', 'Intermediate'], ['Social Media Management', 'Beginner']] },
  { name: 'Nazdar Omar', university: 'University of Zakho', field: 'Biology', grad: 2026,
    bio: 'Biology student interested in molecular genetics and laboratory research.',
    skills: [['Molecular Biology', 'Intermediate'], ['Genetics', 'Beginner'], ['Lab Techniques', 'Intermediate']] },
  { name: 'Rebin Taha', university: 'Charmo University', field: 'Psychology', grad: 2025,
    bio: 'Psychology student interested in counseling and community mental health support.',
    skills: [['Counseling', 'Intermediate'], ['Clinical Assessment', 'Beginner'], ['Case Management', 'Intermediate']] },
  { name: 'Chiman Latif', university: 'University of Duhok', field: 'Agricultural Sciences', grad: 2024,
    bio: 'Agricultural sciences student focused on sustainable crop production and irrigation efficiency.',
    skills: [['Crop Production', 'Expert'], ['Soil Science', 'Intermediate'], ['Irrigation Systems', 'Intermediate']] }
];

function toEmailSlug(name) {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).join('.');
}

async function main() {
  const allSkills = await prisma.skill.findMany({ select: { id: true, name_en: true } });
  const skillIdByName = new Map(allSkills.map((s) => [s.name_en, s.id]));

  const existing = await prisma.user.findFirst({ where: { email: { contains: '.demo.lehatw.test' } } });
  if (existing) {
    console.log('Demo data already exists (found ' + existing.email + '). Run `npm run seed:demo:cleanup` first if you want to regenerate it.');
    return;
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  let jobCount = 0;

  for (const company of COMPANIES) {
    const user = await prisma.user.create({
      data: { email: company.email, password: hashedPassword, role: 'HR' }
    });
    const hrProfile = await prisma.hRProfile.create({
      data: {
        userId: user.id,
        companyName: company.companyName,
        industry: company.industry,
        jobTitle: company.jobTitle,
        crNumber: company.crNumber,
        website: company.website,
        phone: company.phone,
        address: company.address,
        status: 'APPROVED'
      }
    });

    for (const job of company.jobs) {
      const skillIds = job.skills.map((name) => skillIdByName.get(name)).filter(Boolean);
      await prisma.jobPost.create({
        data: {
          hrProfileId: hrProfile.id,
          title: job.title,
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          benefits: job.benefits,
          location: job.location,
          employmentType: job.employmentType,
          workMode: job.workMode,
          experienceLevel: job.experienceLevel,
          education: job.education,
          requiresCv: job.requiresCv,
          isActive: true,
          skills: { create: skillIds.map((skillId) => ({ skillId })) }
        }
      });
      jobCount++;
    }
    console.log('Created ' + company.companyName + ' with ' + company.jobs.length + ' job posts.');
  }

  for (const student of STUDENTS) {
    const email = toEmailSlug(student.name) + '@demo.lehatw.test';
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: 'STUDENT' }
    });
    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: student.name,
        university: student.university,
        fieldOfStudy: student.field,
        graduationYear: student.grad,
        bio: student.bio
      }
    });

    const skillRows = student.skills
      .map(([name, proficiency]) => ({ skillId: skillIdByName.get(name), proficiency }))
      .filter((s) => s.skillId);

    await prisma.studentSkill.createMany({
      data: skillRows.map((s) => ({ studentProfileId: profile.id, skillId: s.skillId, proficiency: s.proficiency }))
    });
  }

  console.log('Created ' + STUDENTS.length + ' demo student profiles.');
  console.log('Done: ' + COMPANIES.length + ' companies, ' + jobCount + ' job posts, ' + STUDENTS.length + ' students.');
  console.log('All demo accounts use the password: ' + DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
