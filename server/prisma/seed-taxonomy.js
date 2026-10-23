// Additive, idempotent seed: introduces a "Subject Area" layer above the existing
// skill Categories (mirroring how Kurdistan Region university faculties are organized),
// links the four categories seeded by seed.js into it, and adds a much broader set of
// fields of study and skills. Never deletes existing Category/Skill rows, so it is safe
// to run against a database where students have already selected real skills.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Categories already created by prisma/seed.js — we link these to a Subject Area
// instead of recreating them.
const EXISTING_CATEGORY_NAMES = [
  'Web & Mobile Development',
  'Artificial Intelligence',
  'Server Administration',
  'Database Management'
];

const TAXONOMY = [
  {
    subjectArea: { en: 'Computer Science & IT', ar: 'علوم الحاسوب وتقنية المعلومات', ckb: 'زانستی کۆمپیوتەر و تەکنەلۆجیای زانیاری' },
    linkExisting: EXISTING_CATEGORY_NAMES,
    newCategories: [
      require('./computer-science-data'),
      {
        en: 'Cybersecurity', ar: 'الأمن السيبراني', ckb: 'ئاسایشی سایبەری',
        skills: [
          { en: 'Network Security', ar: 'أمن الشبكات', ckb: 'ئاسایشی تۆڕ' },
          { en: 'Penetration Testing', ar: 'اختبار الاختراق', ckb: 'تاقیکردنەوەی هێرشکردن' },
          { en: 'Ethical Hacking', ar: 'الاختراق الأخلاقي', ckb: 'هاکینگی ئەخلاقی' },
          { en: 'Cryptography', ar: 'التشفير', ckb: 'نهێنیکاری (کریپتۆگرافی)' },
          { en: 'Incident Response', ar: 'الاستجابة للحوادث', ckb: 'وەڵامدانەوەی ڕووداو' },
          { en: 'Firewall Configuration', ar: 'إعداد جدار الحماية', ckb: 'ڕێکخستنی فایەروۆڵ' }
        ]
      },
      {
        en: 'Data Science & Analytics', ar: 'علم البيانات والتحليلات', ckb: 'زانستی داتا و شیکاری',
        skills: [
          { en: 'Data Analysis', ar: 'تحليل البيانات', ckb: 'شیکردنەوەی داتا' },
          { en: 'Statistics', ar: 'الإحصاء', ckb: 'ئامار' },
          { en: 'R Programming', ar: 'برمجة R', ckb: 'بەرنامەنووسی R' },
          { en: 'Power BI', ar: 'Power BI', ckb: 'Power BI' },
          { en: 'Big Data (Hadoop/Spark)', ar: 'البيانات الضخمة (Hadoop/Spark)', ckb: 'داتای گەورە (Hadoop/Spark)' },
          { en: 'Data Visualization', ar: 'تصور البيانات', ckb: 'بینراوکردنی داتا' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Engineering & Technology', ar: 'الهندسة والتكنولوجيا', ckb: 'ئەندازیاری و تەکنەلۆجیا' },
    newCategories: [
      {
        en: 'Civil Engineering', ar: 'الهندسة المدنية', ckb: 'ئەندازیاری شارستانی',
        skills: [
          { en: 'Structural Analysis', ar: 'التحليل الإنشائي', ckb: 'شیکردنەوەی پێکهاتەیی' },
          { en: 'AutoCAD Civil 3D', ar: 'أوتوكاد سيفيل 3D', ckb: 'ئۆتۆکادی سیڤیل 3D' },
          { en: 'Surveying', ar: 'المساحة', ckb: 'پێوانەی زەوی' },
          { en: 'Construction Management', ar: 'إدارة الإنشاءات', ckb: 'بەڕێوەبردنی بیناسازی' },
          { en: 'Geotechnical Engineering', ar: 'الهندسة الجيوتقنية', ckb: 'ئەندازیاری جیوتەکنیکی' },
          { en: 'Reinforced Concrete Design', ar: 'تصميم الخرسانة المسلحة', ckb: 'دیزاینی بیتۆنی بەهێزکراو' }
        ]
      },
      {
        en: 'Electrical & Electronic Engineering', ar: 'الهندسة الكهربائية والإلكترونية', ckb: 'ئەندازیاری کارەبایی و ئەلیکترۆنیک',
        skills: [
          { en: 'Circuit Design', ar: 'تصميم الدوائر', ckb: 'دیزاینی سووڕی کارەبایی' },
          { en: 'PLC Programming', ar: 'برمجة PLC', ckb: 'بەرنامەنووسی PLC' },
          { en: 'Power Systems', ar: 'أنظمة الطاقة', ckb: 'سیستەمی وزە' },
          { en: 'Embedded Systems', ar: 'الأنظمة المدمجة', ckb: 'سیستەمی نوقمکراو (Embedded)' },
          { en: 'PCB Design', ar: 'تصميم لوحات PCB', ckb: 'دیزاینی PCB' },
          { en: 'MATLAB / Simulink', ar: 'MATLAB / Simulink', ckb: 'MATLAB / Simulink' }
        ]
      },
      {
        en: 'Mechanical Engineering', ar: 'الهندسة الميكانيكية', ckb: 'ئەندازیاری میکانیک',
        skills: [
          { en: 'SolidWorks', ar: 'SolidWorks', ckb: 'SolidWorks' },
          { en: 'AutoCAD Mechanical', ar: 'أوتوكاد ميكانيكي', ckb: 'ئۆتۆکادی میکانیکی' },
          { en: 'Thermodynamics', ar: 'الديناميكا الحرارية', ckb: 'گەرمایی دینامیک' },
          { en: 'HVAC Design', ar: 'تصميم أنظمة التكييف (HVAC)', ckb: 'دیزاینی HVAC' },
          { en: 'Finite Element Analysis (FEA)', ar: 'تحليل العناصر المحددة (FEA)', ckb: 'شیکاری FEA' },
          { en: 'Fluid Mechanics', ar: 'ميكانيكا الموائع', ckb: 'میکانیکی شله' }
        ]
      },
      {
        en: 'Petroleum & Mining Engineering', ar: 'هندسة النفط والتعدين', ckb: 'ئەندازیاری نەوت و کان',
        skills: [
          { en: 'Reservoir Engineering', ar: 'هندسة المكامن', ckb: 'ئەندازیاری ڕیزێرڤوار' },
          { en: 'Drilling Operations', ar: 'عمليات الحفر', ckb: 'کارەکانی بیرکێشان' },
          { en: 'Petroleum Geology', ar: 'جيولوجيا النفط', ckb: 'جیۆلۆجیای نەوت' },
          { en: 'Well Logging', ar: 'تسجيل الآبار', ckb: 'تۆمارکردنی بیرەکان (Well Logging)' },
          { en: 'Pipeline Engineering', ar: 'هندسة خطوط الأنابيب', ckb: 'ئەندازیاری هێڵی بۆری' },
          { en: 'HSE (Health, Safety, Environment)', ar: 'الصحة والسلامة والبيئة (HSE)', ckb: 'تەندروستی، ئاسایشی و ژینگە (HSE)' }
        ]
      },
      {
        en: 'Architecture', ar: 'العمارة', ckb: 'ئەندازیاری تەلارسازی',
        skills: [
          { en: 'AutoCAD', ar: 'أوتوكاد', ckb: 'ئۆتۆکاد' },
          { en: 'Revit', ar: 'Revit', ckb: 'Revit' },
          { en: '3ds Max', ar: '3ds Max', ckb: '3ds Max' },
          { en: 'SketchUp', ar: 'SketchUp', ckb: 'SketchUp' },
          { en: 'Building Information Modeling (BIM)', ar: 'نمذجة معلومات البناء (BIM)', ckb: 'مۆدێلکردنی زانیاری بیناسازی (BIM)' },
          { en: 'Urban Planning', ar: 'التخطيط الحضري', ckb: 'پلانی شارستانی' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Health & Medical Sciences', ar: 'العلوم الصحية والطبية', ckb: 'زانستە تەندروستی و پزیشکییەکان' },
    newCategories: [
      {
        en: 'Medicine', ar: 'الطب', ckb: 'پزیشکی',
        skills: [
          { en: 'Clinical Diagnosis', ar: 'التشخيص السريري', ckb: 'دۆزینەوەی کلینیکی' },
          { en: 'Patient Care', ar: 'رعاية المرضى', ckb: 'چاودێری نەخۆش' },
          { en: 'Emergency Medicine', ar: 'طب الطوارئ', ckb: 'پزیشکی کارەساتی' },
          { en: 'Internal Medicine', ar: 'الطب الباطني', ckb: 'پزیشکی ناوەکی' },
          { en: 'Anatomy & Physiology', ar: 'التشريح ووظائف الأعضاء', ckb: 'ئەناتۆمی و فیزیۆلۆجی' },
          { en: 'Pharmacology', ar: 'علم الأدوية', ckb: 'فارماکۆلۆجی' }
        ]
      },
      {
        en: 'Dentistry', ar: 'طب الأسنان', ckb: 'پزیشکی ددان',
        skills: [
          { en: 'Oral Surgery', ar: 'جراحة الفم', ckb: 'نەشتەرگەری دەم' },
          { en: 'Orthodontics', ar: 'تقويم الأسنان', ckb: 'ڕێکخستنی ددان (ئۆرسۆدۆنتیک)' },
          { en: 'Dental Radiography', ar: 'التصوير الشعاعي للأسنان', ckb: 'وێنەگرتنی ئیشوعاعی ددان' },
          { en: 'Periodontology', ar: 'أمراض اللثة', ckb: 'نەخۆشی عەلکە' },
          { en: 'Prosthodontics', ar: 'التعويضات السنية', ckb: 'پرۆستۆدۆنتیک' },
          { en: 'Preventive Dentistry', ar: 'طب الأسنان الوقائي', ckb: 'پزیشکی پاراستنی ددان' }
        ]
      },
      {
        en: 'Pharmacy', ar: 'الصيدلة', ckb: 'فارمەسی',
        skills: [
          { en: 'Pharmaceutical Chemistry', ar: 'الكيمياء الصيدلانية', ckb: 'کیمیای فارماسیۆتیک' },
          { en: 'Clinical Pharmacy', ar: 'الصيدلة السريرية', ckb: 'فارمەسی کلینیکی' },
          { en: 'Drug Formulation', ar: 'تركيب الأدوية', ckb: 'فۆرمولەکردنی دەرمان' },
          { en: 'Pharmacovigilance', ar: 'اليقظة الدوائية', ckb: 'چاودێری دەرمان (Pharmacovigilance)' },
          { en: 'Dispensing & Compounding', ar: 'صرف وتحضير الأدوية', ckb: 'دابەشکردن و ئامادەکردنی دەرمان' },
          { en: 'Pharmacy Management', ar: 'إدارة الصيدلية', ckb: 'بەڕێوەبردنی فارمەسی' }
        ]
      },
      {
        en: 'Nursing & Midwifery', ar: 'التمريض والقبالة', ckb: 'پەرستاری و مامان',
        skills: [
          { en: 'Clinical Nursing', ar: 'التمريض السريري', ckb: 'پەرستاری کلینیکی' },
          { en: 'Emergency Response', ar: 'الاستجابة للطوارئ', ckb: 'وەڵامدانەوەی کارەسات' },
          { en: 'Maternal & Child Health', ar: 'صحة الأم والطفل', ckb: 'تەندروستی دایک و منداڵ' },
          { en: 'Infection Control', ar: 'مكافحة العدوى', ckb: 'کۆنترۆڵی تووشبوون' },
          { en: 'Medication Administration', ar: 'إعطاء الأدوية', ckb: 'دانی دەرمان' },
          { en: 'Vital Signs Monitoring', ar: 'مراقبة العلامات الحيوية', ckb: 'چاودێری نیشانە بایۆلۆجییەکان' }
        ]
      },
      {
        en: 'Medical Laboratory Technology', ar: 'تقنيات المختبرات الطبية', ckb: 'تەکنەلۆجیای تاقیگەی پزیشکی',
        skills: [
          { en: 'Hematology', ar: 'أمراض الدم', ckb: 'هیماتۆلۆجی (خوێن)' },
          { en: 'Microbiology', ar: 'الأحياء الدقيقة', ckb: 'مایکرۆبیۆلۆجی' },
          { en: 'Biochemistry Testing', ar: 'فحوصات الكيمياء الحيوية', ckb: 'تاقیکردنەوەی بایۆکیمیا' },
          { en: 'Histopathology', ar: 'علم الأنسجة المرضي', ckb: 'هیستۆپاسۆلۆجی' },
          { en: 'Blood Banking', ar: 'بنوك الدم', ckb: 'بانکی خوێن' },
          { en: 'Lab Safety', ar: 'السلامة المخبرية', ckb: 'ئاسایشی تاقیگە' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Natural & Applied Sciences', ar: 'العلوم الطبيعية والتطبيقية', ckb: 'زانستە سروشتی و جێبەجێکراوەکان' },
    newCategories: [
      {
        en: 'Biology', ar: 'الأحياء', ckb: 'زیندەزانی',
        skills: [
          { en: 'Molecular Biology', ar: 'الأحياء الجزيئية', ckb: 'زیندەزانی مۆلیکیولی' },
          { en: 'Genetics', ar: 'علم الوراثة', ckb: 'جینەتیک' },
          { en: 'Microbiology', ar: 'الأحياء الدقيقة', ckb: 'مایکرۆبیۆلۆجی' },
          { en: 'Ecology', ar: 'علم البيئة', ckb: 'ئیکۆلۆجی' },
          { en: 'Biotechnology', ar: 'التقنية الحيوية', ckb: 'بایۆتەکنەلۆجی' },
          { en: 'Bioinformatics', ar: 'المعلوماتية الحيوية', ckb: 'بایۆئینفۆرماتیک' }
        ]
      },
      {
        en: 'Chemistry', ar: 'الكيمياء', ckb: 'کیمیا',
        skills: [
          { en: 'Analytical Chemistry', ar: 'الكيمياء التحليلية', ckb: 'کیمیای شیکارییانە' },
          { en: 'Organic Chemistry', ar: 'الكيمياء العضوية', ckb: 'کیمیای ئۆرگانیک' },
          { en: 'Inorganic Chemistry', ar: 'الكيمياء غير العضوية', ckb: 'کیمیای نائۆرگانیک' },
          { en: 'Spectroscopy', ar: 'التحليل الطيفي', ckb: 'سپیکترۆسکۆپی' },
          { en: 'Chromatography (HPLC/GC)', ar: 'الكروماتوغرافيا (HPLC/GC)', ckb: 'کرۆماتۆگرافی (HPLC/GC)' },
          { en: 'Chemical Safety', ar: 'السلامة الكيميائية', ckb: 'ئاسایشی کیمیایی' }
        ]
      },
      {
        en: 'Physics', ar: 'الفيزياء', ckb: 'فیزیا',
        skills: [
          { en: 'Applied Physics', ar: 'الفيزياء التطبيقية', ckb: 'فیزیای جێبەجێکراو' },
          { en: 'Quantum Mechanics', ar: 'ميكانيكا الكم', ckb: 'میکانیکی کوانتەم' },
          { en: 'Renewable Energy', ar: 'الطاقة المتجددة', ckb: 'وزەی نوێبووەوە' },
          { en: 'Instrumentation', ar: 'أجهزة القياس', ckb: 'ئامێرسازی پێوانە' },
          { en: 'Electronics', ar: 'الإلكترونيات', ckb: 'ئەلیکترۆنیک' },
          { en: 'Research Methodology', ar: 'منهجية البحث', ckb: 'میتۆدۆلۆجیای توێژینەوە' }
        ]
      },
      {
        en: 'Mathematics & Statistics', ar: 'الرياضيات والإحصاء', ckb: 'بیرکاری و ئامار',
        skills: [
          { en: 'Statistical Analysis', ar: 'التحليل الإحصائي', ckb: 'شیکاری ئاماری' },
          { en: 'SPSS', ar: 'SPSS', ckb: 'SPSS' },
          { en: 'Mathematical Modeling', ar: 'النمذجة الرياضية', ckb: 'مۆدێلسازی بیرکاری' },
          { en: 'Numerical Methods', ar: 'الطرق العددية', ckb: 'شێوازە ژمارەییەکان' },
          { en: 'Operations Research', ar: 'بحوث العمليات', ckb: 'توێژینەوەی کردارەکان' },
          { en: 'Actuarial Methods', ar: 'الأساليب الاكتوارية', ckb: 'شێوازی ئاکچواری' }
        ]
      },
      {
        en: 'Geology & Earth Sciences', ar: 'الجيولوجيا وعلوم الأرض', ckb: 'جیۆلۆجیا و زانستەکانی زەوی',
        skills: [
          { en: 'Geological Mapping', ar: 'رسم الخرائط الجيولوجية', ckb: 'نەخشەکێشانی جیۆلۆجی' },
          { en: 'GIS (Geographic Information Systems)', ar: 'نظم المعلومات الجغرافية (GIS)', ckb: 'سیستەمی زانیاری جوگرافی (GIS)' },
          { en: 'Remote Sensing', ar: 'الاستشعار عن بعد', ckb: 'هەستپێکردنی دوورەوە' },
          { en: 'Hydrogeology', ar: 'جيولوجيا المياه الجوفية', ckb: 'هایدرۆجیۆلۆجی' },
          { en: 'Mineral Exploration', ar: 'استكشاف المعادن', ckb: 'گەڕان بەدوای کانزاکاندا' },
          { en: 'Seismic Interpretation', ar: 'التفسير الزلزالي', ckb: 'لێکدانەوەی بومەلەرزە' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Business, Economics & Management', ar: 'الأعمال والاقتصاد والإدارة', ckb: 'بازرگانی، ئابووری و بەڕێوەبردن' },
    newCategories: [
      {
        en: 'Business Administration', ar: 'إدارة الأعمال', ckb: 'بەڕێوەبردنی بازرگانی',
        skills: [
          { en: 'Strategic Management', ar: 'الإدارة الاستراتيجية', ckb: 'بەڕێوەبردنی ستراتیژی' },
          { en: 'Project Management', ar: 'إدارة المشاريع', ckb: 'بەڕێوەبردنی پڕۆژە' },
          { en: 'Leadership', ar: 'القيادة', ckb: 'ڕابەرایەتی' },
          { en: 'Marketing Strategy', ar: 'استراتيجية التسويق', ckb: 'ستراتیژی بازاڕگەری' },
          { en: 'Operations Management', ar: 'إدارة العمليات', ckb: 'بەڕێوەبردنی کردارەکان' },
          { en: 'Entrepreneurship', ar: 'ريادة الأعمال', ckb: 'کارئافرینی' }
        ]
      },
      {
        en: 'Accounting & Finance', ar: 'المحاسبة والمالية', ckb: 'ژمێریاری و دارایی',
        skills: [
          { en: 'Financial Accounting', ar: 'المحاسبة المالية', ckb: 'ژمێریاری دارایی' },
          { en: 'QuickBooks', ar: 'QuickBooks', ckb: 'QuickBooks' },
          { en: 'Auditing', ar: 'التدقيق', ckb: 'وردبینی (ئۆدیت)' },
          { en: 'Financial Analysis', ar: 'التحليل المالي', ckb: 'شیکاری دارایی' },
          { en: 'Budgeting & Forecasting', ar: 'الميزانية والتنبؤ', ckb: 'بودجەبەندی و پێشبینیکردن' },
          { en: 'IFRS Standards', ar: 'معايير IFRS', ckb: 'ستانداردی IFRS' }
        ]
      },
      {
        en: 'Economics', ar: 'الاقتصاد', ckb: 'ئابووری',
        skills: [
          { en: 'Microeconomics', ar: 'الاقتصاد الجزئي', ckb: 'ئابووری وردەکاری' },
          { en: 'Macroeconomics', ar: 'الاقتصاد الكلي', ckb: 'ئابووری گشتی' },
          { en: 'Econometrics', ar: 'قياس الاقتصاد', ckb: 'ئیکۆنۆمەتریکس' },
          { en: 'Economic Policy Analysis', ar: 'تحليل السياسات الاقتصادية', ckb: 'شیکاری سیاسەتی ئابووری' },
          { en: 'Market Research', ar: 'أبحاث السوق', ckb: 'توێژینەوەی بازاڕ' },
          { en: 'Forecasting', ar: 'التنبؤ', ckb: 'پێشبینیکردن' }
        ]
      },
      {
        en: 'Banking & Finance', ar: 'المصارف والتمويل', ckb: 'بانکداری و دارایی',
        skills: [
          { en: 'Financial Modeling', ar: 'النمذجة المالية', ckb: 'مۆدێلسازی دارایی' },
          { en: 'Risk Management', ar: 'إدارة المخاطر', ckb: 'بەڕێوەبردنی مەترسی' },
          { en: 'Investment Analysis', ar: 'تحليل الاستثمار', ckb: 'شیکاری وەبەرهێنان' },
          { en: 'Credit Analysis', ar: 'تحليل الائتمان', ckb: 'شیکاری کرێدیت' },
          { en: 'Banking Operations', ar: 'العمليات المصرفية', ckb: 'کارگێڕی بانکی' },
          { en: 'Portfolio Management', ar: 'إدارة المحافظ الاستثمارية', ckb: 'بەڕێوەبردنی پۆرتفۆلیۆ' }
        ]
      },
      {
        en: 'Marketing & E-Commerce', ar: 'التسويق والتجارة الإلكترونية', ckb: 'بازاڕگەری و بازرگانی ئەلیکترۆنی',
        skills: [
          { en: 'Digital Marketing', ar: 'التسويق الرقمي', ckb: 'بازاڕگەری دیجیتاڵ' },
          { en: 'SEO', ar: 'تحسين محركات البحث (SEO)', ckb: 'SEO' },
          { en: 'Social Media Marketing', ar: 'التسويق عبر وسائل التواصل', ckb: 'بازاڕگەری سۆشیال میدیا' },
          { en: 'Content Marketing', ar: 'تسويق المحتوى', ckb: 'بازاڕگەری ناوەڕۆک' },
          { en: 'Google Analytics', ar: 'Google Analytics', ckb: 'Google Analytics' },
          { en: 'Branding', ar: 'العلامة التجارية', ckb: 'براندینگ' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Law & Political Science', ar: 'القانون والعلوم السياسية', ckb: 'یاسا و زانستی سیاسی' },
    newCategories: [
      {
        en: 'Law', ar: 'القانون', ckb: 'یاسا',
        skills: [
          { en: 'Legal Research', ar: 'البحث القانوني', ckb: 'توێژینەوەی یاسایی' },
          { en: 'Legal Writing', ar: 'الكتابة القانونية', ckb: 'نووسینی یاسایی' },
          { en: 'Contract Drafting', ar: 'صياغة العقود', ckb: 'نووسینی گرێبەست' },
          { en: 'Civil Law', ar: 'القانون المدني', ckb: 'یاسای مەدەنی' },
          { en: 'Criminal Law', ar: 'القانون الجنائي', ckb: 'یاسای تاوانبار' },
          { en: 'Litigation', ar: 'التقاضي', ckb: 'دادگاییکردن' }
        ]
      },
      {
        en: 'Political Science & International Relations', ar: 'العلوم السياسية والعلاقات الدولية', ckb: 'زانستی سیاسی و پەیوەندییە نێودەوڵەتییەکان',
        skills: [
          { en: 'Policy Analysis', ar: 'تحليل السياسات', ckb: 'شیکاری سیاسەت' },
          { en: 'Diplomacy', ar: 'الدبلوماسية', ckb: 'دیپلۆماسی' },
          { en: 'Political Research', ar: 'البحث السياسي', ckb: 'توێژینەوەی سیاسی' },
          { en: 'Public Administration', ar: 'الإدارة العامة', ckb: 'کارگێڕی گشتی' },
          { en: 'Conflict Resolution', ar: 'حل النزاعات', ckb: 'چارەسەرکردنی ململانێ' },
          { en: 'International Law', ar: 'القانون الدولي', ckb: 'یاسای نێودەوڵەتی' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Education, Humanities & Social Sciences', ar: 'التربية والإنسانيات والعلوم الاجتماعية', ckb: 'پەروەردە، مرۆڤایەتی و زانستە کۆمەڵایەتییەکان' },
    newCategories: [
      {
        en: 'Education & Teaching', ar: 'التربية والتعليم', ckb: 'پەروەردە و مامۆستایەتی',
        skills: [
          { en: 'Curriculum Design', ar: 'تصميم المناهج', ckb: 'دیزاینی پەرتووکی خوێندن' },
          { en: 'Classroom Management', ar: 'إدارة الصف', ckb: 'بەڕێوەبردنی پۆل' },
          { en: 'Lesson Planning', ar: 'تخطيط الدروس', ckb: 'پلانی وانە' },
          { en: 'Educational Psychology', ar: 'علم النفس التربوي', ckb: 'دەروونناسی پەروەردەیی' },
          { en: 'E-Learning Tools', ar: 'أدوات التعلم الإلكتروني', ckb: 'ئامرازەکانی فێربوونی ئەلیکترۆنی' },
          { en: 'Student Assessment', ar: 'تقييم الطلاب', ckb: 'هەڵسەنگاندنی قوتابی' }
        ]
      },
      {
        en: 'Psychology', ar: 'علم النفس', ckb: 'دەروونناسی',
        skills: [
          { en: 'Clinical Assessment', ar: 'التقييم الإكلينيكي', ckb: 'هەڵسەنگاندنی کلینیکی' },
          { en: 'Counseling', ar: 'الإرشاد النفسي', ckb: 'ڕاوێژکاری دەروونی' },
          { en: 'Psychological Testing', ar: 'الاختبارات النفسية', ckb: 'تاقیکردنەوەی دەروونی' },
          { en: 'Cognitive Behavioral Therapy (CBT)', ar: 'العلاج المعرفي السلوكي (CBT)', ckb: 'چارەسەری مەعریفی ڕەفتاری (CBT)' },
          { en: 'Case Management', ar: 'إدارة الحالات', ckb: 'بەڕێوەبردنی کەیس' },
          { en: 'Child Psychology', ar: 'علم نفس الطفل', ckb: 'دەروونناسی منداڵان' }
        ]
      },
      {
        en: 'Languages & Literature', ar: 'اللغات والآداب', ckb: 'زمان و ئەدەبیات',
        skills: [
          { en: 'Translation', ar: 'الترجمة', ckb: 'وەرگێڕان' },
          { en: 'Academic Writing', ar: 'الكتابة الأكاديمية', ckb: 'نووسینی ئەکادیمی' },
          { en: 'Literary Analysis', ar: 'التحليل الأدبي', ckb: 'شیکاری ئەدەبی' },
          { en: 'Editing & Proofreading', ar: 'التحرير والتدقيق اللغوي', ckb: 'دەستکاریکردن و وردبینی نووسین' },
          { en: 'Interpretation', ar: 'الترجمة الفورية', ckb: 'وەرگێڕانی زارەکی' },
          { en: 'Linguistics', ar: 'اللسانيات', ckb: 'زمانەوانی' }
        ]
      },
      {
        en: 'Media, Journalism & Communication', ar: 'الإعلام والصحافة والاتصال', ckb: 'میدیا، ڕۆژنامەگەری و پەیوەندیکردن',
        skills: [
          { en: 'Journalism', ar: 'الصحافة', ckb: 'ڕۆژنامەگەری' },
          { en: 'Content Writing', ar: 'كتابة المحتوى', ckb: 'نووسینی ناوەڕۆک' },
          { en: 'Video Editing', ar: 'تحرير الفيديو', ckb: 'دەستکاریکردنی ڤیدیۆ' },
          { en: 'Social Media Management', ar: 'إدارة وسائل التواصل الاجتماعي', ckb: 'بەڕێوەبردنی سۆشیال میدیا' },
          { en: 'Public Relations', ar: 'العلاقات العامة', ckb: 'پەیوەندییە گشتییەکان' },
          { en: 'Photography', ar: 'التصوير الفوتوغرافي', ckb: 'وێنەگرتن' }
        ]
      },
      {
        en: 'History & Archaeology', ar: 'التاريخ والآثار', ckb: 'مێژوو و شوێنەوارناسی',
        skills: [
          { en: 'Historical Research', ar: 'البحث التاريخي', ckb: 'توێژینەوەی مێژوویی' },
          { en: 'Archival Research', ar: 'البحث في الأرشيف', ckb: 'توێژینەوەی ئەرشیف' },
          { en: 'Archaeological Fieldwork', ar: 'العمل الميداني الأثري', ckb: 'کاری بوارییی شوێنەوارناسی' },
          { en: 'Artifact Analysis', ar: 'تحليل القطع الأثرية', ckb: 'شیکاری دۆزراوەکان' },
          { en: 'Museum Studies', ar: 'دراسات المتاحف', ckb: 'خوێندنی مۆزەخانە' },
          { en: 'Cultural Heritage Preservation', ar: 'الحفاظ على التراث الثقافي', ckb: 'پاراستنی میراتی کەلتووری' }
        ]
      }
    ]
  },
  {
    subjectArea: { en: 'Agriculture & Veterinary Sciences', ar: 'الزراعة والعلوم البيطرية', ckb: 'کشتوکاڵ و زانستە ڤێتەرنەرییەکان' },
    newCategories: [
      {
        en: 'Agricultural Sciences', ar: 'العلوم الزراعية', ckb: 'زانستە کشتوکاڵییەکان',
        skills: [
          { en: 'Crop Production', ar: 'إنتاج المحاصيل', ckb: 'بەرهەمهێنانی ڕووەک' },
          { en: 'Soil Science', ar: 'علم التربة', ckb: 'زانستی خاک' },
          { en: 'Irrigation Systems', ar: 'أنظمة الري', ckb: 'سیستەمی ئاودێری' },
          { en: 'Plant Protection', ar: 'وقاية النبات', ckb: 'پاراستنی ڕووەک' },
          { en: 'Precision Agriculture', ar: 'الزراعة الدقيقة', ckb: 'کشتوکاڵی وردبینانە' },
          { en: 'Greenhouse Management', ar: 'إدارة البيوت المحمية', ckb: 'بەڕێوەبردنی گڵخانە' }
        ]
      },
      {
        en: 'Veterinary Medicine', ar: 'الطب البيطري', ckb: 'پزیشکی ڤێتەرنەری',
        skills: [
          { en: 'Animal Health Diagnosis', ar: 'تشخيص صحة الحيوان', ckb: 'دۆزینەوەی تەندروستی ئاژەڵ' },
          { en: 'Veterinary Surgery', ar: 'الجراحة البيطرية', ckb: 'نەشتەرگەری ڤێتەرنەری' },
          { en: 'Animal Nutrition', ar: 'تغذية الحيوان', ckb: 'خۆراکی ئاژەڵ' },
          { en: 'Livestock Management', ar: 'إدارة الثروة الحيوانية', ckb: 'بەڕێوەبردنی ئاژەڵداری' },
          { en: 'Vaccination Programs', ar: 'برامج التطعيم', ckb: 'پرۆگرامی ڤاکسیناسیۆن' },
          { en: 'Clinical Pathology', ar: 'علم الأمراض السريري', ckb: 'پاسۆلۆجیای کلینیکی' }
        ]
      },
      {
        en: 'Food Science & Technology', ar: 'علوم وتقنية الأغذية', ckb: 'زانست و تەکنەلۆجیای خۆراک',
        skills: [
          { en: 'Food Safety', ar: 'سلامة الأغذية', ckb: 'ئاسایشی خۆراک' },
          { en: 'Food Processing', ar: 'تصنيع الأغذية', ckb: 'پرۆسێسکردنی خۆراک' },
          { en: 'HACCP', ar: 'نظام HACCP', ckb: 'HACCP' },
          { en: 'Food Microbiology', ar: 'أحياء الأغذية الدقيقة', ckb: 'مایکرۆبیۆلۆجیای خۆراک' },
          { en: 'Nutrition Analysis', ar: 'تحليل التغذية', ckb: 'شیکاری خۆراک' },
          { en: 'Product Development', ar: 'تطوير المنتجات', ckb: 'گەشەپێدانی بەرهەم' }
        ]
      }
    ]
  }
];

async function main() {
  console.log("🌱 Layering in the academic Subject Area / Field of Study taxonomy...");

  for (const group of TAXONOMY) {
    let subjectArea = await prisma.subjectArea.findFirst({ where: { name_en: group.subjectArea.en } });
    if (!subjectArea) {
      subjectArea = await prisma.subjectArea.create({
        data: {
          name_en: group.subjectArea.en,
          name_ar: group.subjectArea.ar,
          name_ckb: group.subjectArea.ckb
        }
      });
      console.log(`  + Created Subject Area: ${group.subjectArea.en}`);
    }

    // Link pre-existing categories (from seed.js) into this Subject Area, non-destructively.
    for (const categoryName of group.linkExisting || []) {
      const existing = await prisma.category.findFirst({ where: { name_en: categoryName } });
      if (existing && existing.subjectAreaId !== subjectArea.id) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { subjectAreaId: subjectArea.id }
        });
        console.log(`  ~ Linked existing category "${categoryName}" to ${group.subjectArea.en}`);
      }
    }

    // Add new fields of study + skills, skipping any that already exist.
    for (const cat of group.newCategories || []) {
      const already = await prisma.category.findFirst({ where: { name_en: cat.en } });
      if (already) {
        console.log(`  = Skipping "${cat.en}" (already exists)`);
        continue;
      }
      await prisma.category.create({
        data: {
          name_en: cat.en,
          name_ar: cat.ar,
          name_ckb: cat.ckb,
          subjectAreaId: subjectArea.id,
          skills: {
            create: cat.skills.map(s => ({ name_en: s.en, name_ar: s.ar, name_ckb: s.ckb }))
          }
        }
      });
      console.log(`  + Created category "${cat.en}" with ${cat.skills.length} skills`);
    }
  }

  console.log("✅ Taxonomy layered in successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
