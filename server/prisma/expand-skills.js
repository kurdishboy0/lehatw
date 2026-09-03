// Additive, idempotent: adds more skills to each existing field of study so the
// catalog covers a broader, more realistic set of common skills per field.
// Checks each skill individually (by name_en within its category) before
// creating it, so this is safe to re-run and never touches existing rows.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXPANSIONS = {
  'Web & Mobile Development': [
    { en: 'TypeScript', ar: 'TypeScript', ckb: 'TypeScript' },
    { en: 'Next.js', ar: 'Next.js', ckb: 'Next.js' },
    { en: 'Vue.js', ar: 'Vue.js', ckb: 'Vue.js' },
    { en: 'RESTful APIs', ar: 'واجهات RESTful', ckb: 'RESTful APIs' },
    { en: 'GraphQL', ar: 'GraphQL', ckb: 'GraphQL' }
  ],
  'Artificial Intelligence': [
    { en: 'Natural Language Processing', ar: 'معالجة اللغة الطبيعية', ckb: 'پرۆسێسکردنی زمانی سروشتی' },
    { en: 'TensorFlow', ar: 'TensorFlow', ckb: 'TensorFlow' },
    { en: 'PyTorch', ar: 'PyTorch', ckb: 'PyTorch' },
    { en: 'Neural Networks', ar: 'الشبكات العصبية', ckb: 'تۆڕی عەسبی' },
    { en: 'Reinforcement Learning', ar: 'التعلم المعزز', ckb: 'فێربوونی بەهێزکراو' },
    { en: 'Machine Learning', ar: 'تعلم الآلة', ckb: 'فێربوونی ئامێر' },
    { en: 'Deep Learning', ar: 'التعلم العميق', ckb: 'فێربوونی قووڵ' },
    { en: 'Supervised Learning', ar: 'التعلم الخاضع للإشراف', ckb: 'فێربوونی سەرپەرشتیکراو' },
    { en: 'Unsupervised Learning', ar: 'التعلم غير الخاضع للإشراف', ckb: 'فێربوونی بەبێ سەرپەرشتی' },
    { en: 'Computer Vision', ar: 'الرؤية الحاسوبية', ckb: 'بینینی کۆمپیوتەری' },
    { en: 'Scikit-learn', ar: 'Scikit-learn', ckb: 'Scikit-learn' },
    { en: 'Feature Engineering', ar: 'هندسة الخصائص', ckb: 'ئەندازیاری تایبەتمەندی' },
    { en: 'Model Deployment (MLOps)', ar: 'نشر النماذج (MLOps)', ckb: 'بڵاوکردنەوەی مۆدێل (MLOps)' },
    { en: 'Large Language Models (LLMs)', ar: 'نماذج اللغة الكبيرة', ckb: 'مۆدێلی گەورەی زمان (LLM)' },
    { en: 'Generative AI', ar: 'الذكاء الاصطناعي التوليدي', ckb: 'زیرەکی دەستکردی بەرهەمهێنەر' }
  ],
  'Server Administration': [
    { en: 'Linux Administration', ar: 'إدارة لينكس', ckb: 'کارگێڕی لینەکس' },
    { en: 'Virtualization (VMware)', ar: 'المحاكاة الافتراضية (VMware)', ckb: 'ڤیرچوواڵایزیشن (VMware)' },
    { en: 'Cloud Infrastructure (Azure/AWS)', ar: 'البنية السحابية (Azure/AWS)', ckb: 'ژێرخانی کلاود (Azure/AWS)' },
    { en: 'Backup & Disaster Recovery', ar: 'النسخ الاحتياطي والتعافي من الكوارث', ckb: 'باکئەپ و گەڕاندنەوەی داتا' },
    { en: 'PowerShell Scripting', ar: 'برمجة PowerShell', ckb: 'سکریپتنووسی PowerShell' }
  ],
  'Database Management': [
    { en: 'MySQL', ar: 'MySQL', ckb: 'MySQL' },
    { en: 'MongoDB', ar: 'MongoDB', ckb: 'MongoDB' },
    { en: 'Database Design', ar: 'تصميم قواعد البيانات', ckb: 'دیزاینی بنکەدراوە' },
    { en: 'Data Warehousing', ar: 'مستودعات البيانات', ckb: 'کۆگای داتا' },
    { en: 'Redis', ar: 'Redis', ckb: 'Redis' }
  ],
  'Cybersecurity': [
    { en: 'Security Operations (SOC)', ar: 'عمليات الأمن (SOC)', ckb: 'کارگێڕی ئاسایشی (SOC)' },
    { en: 'Risk Assessment', ar: 'تقييم المخاطر', ckb: 'هەڵسەنگاندنی مەترسی' },
    { en: 'Vulnerability Scanning', ar: 'فحص الثغرات الأمنية', ckb: 'پشکنینی کێماسی ئاسایشی' },
    { en: 'ISO 27001', ar: 'ISO 27001', ckb: 'ISO 27001' }
  ],
  'Data Science & Analytics': [
    { en: 'Python for Data Science', ar: 'بايثون لعلم البيانات', ckb: 'پایتۆن بۆ زانستی داتا' },
    { en: 'Machine Learning', ar: 'تعلم الآلة', ckb: 'فێربوونی ئامێر' },
    { en: 'Tableau', ar: 'Tableau', ckb: 'Tableau' },
    { en: 'ETL Pipelines', ar: 'خطوط ETL', ckb: 'هێڵی ETL' }
  ],
  'Civil Engineering': [
    { en: 'Structural Design (ETABS/SAP2000)', ar: 'التصميم الإنشائي (ETABS/SAP2000)', ckb: 'دیزاینی پێکهاتەیی (ETABS/SAP2000)' },
    { en: 'Highway Engineering', ar: 'هندسة الطرق', ckb: 'ئەندازیاری ڕێگا' },
    { en: 'Water Resources Engineering', ar: 'هندسة الموارد المائية', ckb: 'ئەندازیاری سەرچاوەی ئاو' },
    { en: 'Building Codes & Standards', ar: 'أكواد ومعايير البناء', ckb: 'یاسا و ستانداردەکانی بیناسازی' }
  ],
  'Electrical & Electronic Engineering': [
    { en: 'Renewable Energy Systems', ar: 'أنظمة الطاقة المتجددة', ckb: 'سیستەمی وزەی نوێبووەوە' },
    { en: 'Control Systems', ar: 'أنظمة التحكم', ckb: 'سیستەمی کۆنترۆڵ' },
    { en: 'Instrumentation & Measurement', ar: 'أجهزة القياس والتحكم', ckb: 'ئامرازسازی و پێوانە' },
    { en: 'Telecommunications', ar: 'الاتصالات', ckb: 'پەیوەندییە دوورەکانی' }
  ],
  'Mechanical Engineering': [
    { en: 'CNC Machining', ar: 'التشغيل باستخدام CNC', ckb: 'ئامادەکاری CNC' },
    { en: 'Manufacturing Processes', ar: 'عمليات التصنيع', ckb: 'پرۆسەکانی بەرهەمهێنان' },
    { en: 'Robotics', ar: 'الروبوتات', ckb: 'ڕۆبۆتیک' },
    { en: 'Quality Control', ar: 'مراقبة الجودة', ckb: 'کۆنترۆڵی کوالیتی' }
  ],
  'Petroleum & Mining Engineering': [
    { en: 'Reservoir Simulation', ar: 'محاكاة المكامن', ckb: 'شێوەکردنەوەی ڕیزێرڤوار' },
    { en: 'Production Optimization', ar: 'تحسين الإنتاج', ckb: 'باشترکردنی بەرهەمهێنان' },
    { en: 'Mine Planning', ar: 'تخطيط المناجم', ckb: 'پلانی کان' },
    { en: 'Petroleum Economics', ar: 'اقتصاديات النفط', ckb: 'ئابووری نەوت' }
  ],
  'Architecture': [
    { en: 'Interior Design', ar: 'التصميم الداخلي', ckb: 'دیزاینی ناوەوە' },
    { en: 'Sustainable Design', ar: 'التصميم المستدام', ckb: 'دیزاینی بەردەوام' },
    { en: 'Lumion / V-Ray Rendering', ar: 'العرض ثلاثي الأبعاد (Lumion/V-Ray)', ckb: 'ڕێندەری Lumion/V-Ray' },
    { en: 'Landscape Design', ar: 'تصميم المناظر الطبيعية', ckb: 'دیزاینی شێوەزار' }
  ],
  'Medicine': [
    { en: 'Surgery Assistance', ar: 'مساعدة جراحية', ckb: 'یارمەتیدانی نەشتەرگەری' },
    { en: 'Medical Research', ar: 'البحث الطبي', ckb: 'توێژینەوەی پزیشکی' },
    { en: 'Radiology', ar: 'الأشعة', ckb: 'ڕادیۆلۆجی' },
    { en: 'Public Health', ar: 'الصحة العامة', ckb: 'تەندروستی گشتی' }
  ],
  'Dentistry': [
    { en: 'Endodontics', ar: 'علاج قناة الجذر', ckb: 'ئێندۆدۆنتیک' },
    { en: 'Pediatric Dentistry', ar: 'طب أسنان الأطفال', ckb: 'پزیشکی ددانی منداڵان' },
    { en: 'Dental Implants', ar: 'زراعة الأسنان', ckb: 'چاندنی ددان' }
  ],
  'Pharmacy': [
    { en: 'Pharmacology', ar: 'علم الأدوية', ckb: 'فارماکۆلۆجی' },
    { en: 'Quality Control (Pharma)', ar: 'مراقبة الجودة الدوائية', ckb: 'کۆنترۆڵی کوالیتی دەرمانی' },
    { en: 'Regulatory Affairs', ar: 'الشؤون التنظيمية', ckb: 'کاروباری ڕێکخستنی یاسایی' }
  ],
  'Nursing & Midwifery': [
    { en: 'Patient Assessment', ar: 'تقييم المرضى', ckb: 'هەڵسەنگاندنی نەخۆش' },
    { en: 'Surgical Nursing', ar: 'التمريض الجراحي', ckb: 'پەرستاری نەشتەرگەری' },
    { en: 'Community Health', ar: 'صحة المجتمع', ckb: 'تەندروستی کۆمەڵگا' }
  ],
  'Medical Laboratory Technology': [
    { en: 'Molecular Diagnostics', ar: 'التشخيص الجزيئي', ckb: 'دۆزینەوەی مۆلیکیولی' },
    { en: 'Immunology', ar: 'علم المناعة', ckb: 'ئیمیونۆلۆجی' },
    { en: 'Parasitology', ar: 'علم الطفيليات', ckb: 'پاراسایتۆلۆجی' }
  ],
  'Biology': [
    { en: 'Zoology', ar: 'علم الحيوان', ckb: 'ئاژەڵناسی' },
    { en: 'Botany', ar: 'علم النبات', ckb: 'ڕووەکناسی' },
    { en: 'Cell Biology', ar: 'علم الخلية', ckb: 'زیندەزانی خانە' },
    { en: 'Lab Techniques', ar: 'تقنيات المختبر', ckb: 'تەکنیکەکانی تاقیگە' }
  ],
  'Chemistry': [
    { en: 'Materials Science', ar: 'علم المواد', ckb: 'زانستی ماددە' },
    { en: 'Petrochemistry', ar: 'الكيمياء البترولية', ckb: 'کیمیای نەوتی' },
    { en: 'Polymer Chemistry', ar: 'كيمياء البوليمرات', ckb: 'کیمیای پۆلیمەر' }
  ],
  'Physics': [
    { en: 'Nuclear Physics', ar: 'الفيزياء النووية', ckb: 'فیزیای ناوکەیی' },
    { en: 'Solid State Physics', ar: 'فيزياء الحالة الصلبة', ckb: 'فیزیای دۆخی ڕەق' },
    { en: 'Astrophysics', ar: 'الفيزياء الفلكية', ckb: 'ئەستێرەفیزیا' }
  ],
  'Mathematics & Statistics': [
    { en: 'Python (Data Analysis)', ar: 'بايثون (تحليل البيانات)', ckb: 'پایتۆن (شیکاری داتا)' },
    { en: 'Probability Theory', ar: 'نظرية الاحتمالات', ckb: 'تیۆری ئەگەری' },
    { en: 'Cryptography (Math)', ar: 'التشفير الرياضي', ckb: 'نهێنیکاری بیرکاری' }
  ],
  'Geology & Earth Sciences': [
    { en: 'Petrology', ar: 'علم الصخور', ckb: 'بەردناسی' },
    { en: 'Structural Geology', ar: 'الجيولوجيا البنيوية', ckb: 'جیۆلۆجیای پێکهاتەیی' },
    { en: 'Environmental Geology', ar: 'الجيولوجيا البيئية', ckb: 'جیۆلۆجیای ژینگەیی' }
  ],
  'Business Administration': [
    { en: 'Human Resources Management', ar: 'إدارة الموارد البشرية', ckb: 'بەڕێوەبردنی سەرچاوە مرۆییەکان' },
    { en: 'Supply Chain Management', ar: 'إدارة سلسلة التوريد', ckb: 'بەڕێوەبردنی زنجیرەی دابینکردن' },
    { en: 'Business Analysis', ar: 'تحليل الأعمال', ckb: 'شیکاری بازرگانی' },
    { en: 'MS Office / Excel', ar: 'MS Office / Excel', ckb: 'MS Office / Excel' }
  ],
  'Accounting & Finance': [
    { en: 'Taxation', ar: 'الضرائب', ckb: 'باج' },
    { en: 'Cost Accounting', ar: 'محاسبة التكاليف', ckb: 'ژمێریاری تێچوون' },
    { en: 'Excel Advanced', ar: 'إكسل المتقدم', ckb: 'ئێکسڵی پێشکەوتوو' }
  ],
  'Economics': [
    { en: 'Development Economics', ar: 'اقتصاديات التنمية', ckb: 'ئابووری گەشەپێدان' },
    { en: 'International Trade', ar: 'التجارة الدولية', ckb: 'بازرگانی نێودەوڵەتی' },
    { en: 'Stata / SPSS', ar: 'Stata / SPSS', ckb: 'Stata / SPSS' }
  ],
  'Banking & Finance': [
    { en: 'Islamic Finance', ar: 'التمويل الإسلامي', ckb: 'دارایی ئیسلامی' },
    { en: 'Financial Reporting', ar: 'التقارير المالية', ckb: 'ڕاپۆرتی دارایی' },
    { en: 'Credit Analysis', ar: 'تحليل الائتمان', ckb: 'شیکاری کرێدیت' }
  ],
  'Marketing & E-Commerce': [
    { en: 'Copywriting', ar: 'كتابة الإعلانات', ckb: 'نووسینی ڕیکلام' },
    { en: 'E-Commerce Platforms', ar: 'منصات التجارة الإلكترونية', ckb: 'پلاتفۆرمی بازرگانی ئەلیکترۆنی' },
    { en: 'Brand Management', ar: 'إدارة العلامة التجارية', ckb: 'بەڕێوەبردنی براند' }
  ],
  'Law': [
    { en: 'Corporate Law', ar: 'قانون الشركات', ckb: 'یاسای کۆمپانیا' },
    { en: 'Human Rights Law', ar: 'قانون حقوق الإنسان', ckb: 'یاسای مافی مرۆڤ' },
    { en: 'Legal Translation', ar: 'الترجمة القانونية', ckb: 'وەرگێڕانی یاسایی' }
  ],
  'Political Science & International Relations': [
    { en: 'Public Speaking', ar: 'الخطابة العامة', ckb: 'وتووێژی گشتی' },
    { en: 'Report Writing', ar: 'كتابة التقارير', ckb: 'نووسینی ڕاپۆرت' },
    { en: 'Negotiation', ar: 'التفاوض', ckb: 'دانووستاندن' }
  ],
  'Education & Teaching': [
    { en: 'Special Education', ar: 'التربية الخاصة', ckb: 'پەروەردەی تایبەت' },
    { en: 'Instructional Design', ar: 'التصميم التعليمي', ckb: 'دیزاینی فێرکردن' },
    { en: 'Student Assessment', ar: 'تقييم الطلاب', ckb: 'هەڵسەنگاندنی قوتابی' }
  ],
  'Psychology': [
    { en: 'Research Methods', ar: 'مناهج البحث', ckb: 'میتۆدی توێژینەوە' },
    { en: 'SPSS (Psychology)', ar: 'SPSS', ckb: 'SPSS' },
    { en: 'Family Counseling', ar: 'الإرشاد الأسري', ckb: 'ڕاوێژکاری خێزانی' }
  ],
  'Languages & Literature': [
    { en: 'Content Writing', ar: 'كتابة المحتوى', ckb: 'نووسینی ناوەڕۆک' },
    { en: 'Simultaneous Interpretation', ar: 'الترجمة الفورية المتزامنة', ckb: 'وەرگێڕانی هاوکات' },
    { en: 'Copyediting', ar: 'التدقيق اللغوي', ckb: 'وردبینی زمانەوانی' }
  ],
  'Media, Journalism & Communication': [
    { en: 'Broadcasting', ar: 'البث الإعلامي', ckb: 'بڵاوکردنەوەی میدیایی' },
    { en: 'Copywriting (Media)', ar: 'كتابة إعلامية', ckb: 'نووسینی میدیایی' },
    { en: 'Podcasting', ar: 'إنتاج البودكاست', ckb: 'بەرهەمهێنانی پۆدکاست' }
  ],
  'History & Archaeology': [
    { en: 'Report Writing (History)', ar: 'كتابة التقارير', ckb: 'نووسینی ڕاپۆرت' },
    { en: 'Artifact Conservation', ar: 'صيانة القطع الأثرية', ckb: 'پاراستنی دۆزراوەکان' }
  ],
  'Agricultural Sciences': [
    { en: 'Agricultural Economics', ar: 'الاقتصاد الزراعي', ckb: 'ئابووری کشتوکاڵی' },
    { en: 'Food Security Planning', ar: 'التخطيط للأمن الغذائي', ckb: 'پلاندانانی ئاسایشی خۆراک' },
    { en: 'Pest Management', ar: 'إدارة الآفات', ckb: 'بەڕێوەبردنی گیانلەبەرانی زیانبەخش' }
  ],
  'Veterinary Medicine': [
    { en: 'Herd Health Management', ar: 'إدارة صحة القطيع', ckb: 'بەڕێوەبردنی تەندروستی ئاژەڵ' },
    { en: 'Clinical Pathology (Vet)', ar: 'علم الأمراض السريري البيطري', ckb: 'پاسۆلۆجیای کلینیکی ڤێتەرنەری' },
    { en: 'Wildlife Medicine', ar: 'طب الحياة البرية', ckb: 'پزیشکی ژینگەی کێوی' }
  ],
  'Food Science & Technology': [
    { en: 'Sensory Evaluation', ar: 'التقييم الحسي', ckb: 'هەڵسەنگاندنی هەستەوەرانە' },
    { en: 'Packaging Technology', ar: 'تقنية التعبئة والتغليف', ckb: 'تەکنەلۆجیای پاکەجکردن' },
    { en: 'Product Development (Food)', ar: 'تطوير المنتجات الغذائية', ckb: 'گەشەپێدانی بەرهەمی خۆراک' }
  ]
};

async function main() {
  console.log("🌱 Broadening the skill catalog...");
  let added = 0;

  for (const [categoryName, skills] of Object.entries(EXPANSIONS)) {
    const category = await prisma.category.findFirst({ where: { name_en: categoryName } });
    if (!category) {
      console.log(`  ! Category not found, skipping: ${categoryName}`);
      continue;
    }

    for (const skill of skills) {
      const exists = await prisma.skill.findFirst({ where: { categoryId: category.id, name_en: skill.en } });
      if (exists) continue;
      await prisma.skill.create({
        data: { categoryId: category.id, name_en: skill.en, name_ar: skill.ar, name_ckb: skill.ckb }
      });
      added++;
    }
  }

  console.log(`✅ Added ${added} new skills across ${Object.keys(EXPANSIONS).length} fields of study.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
