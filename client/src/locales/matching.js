// Strings for job recommendations, company candidate search, "Peers like you",
// and the student email privacy setting. Merged into the main resources in i18n.js.

const en = {
  jobs: {
    tab_all: "All jobs",
    tab_recommended: "Recommended for me",
    recommended_intro: "Jobs ranked by how many of their required skills you have.",
    match_badge: "You match {{matched}}/{{total}}",
    apply: "Apply",
    applied: "Applied",
    invited: "Invited to apply",
    you_have: "You have:",
    missing: "Missing:",
    recommended_empty: "No jobs match your skills yet. Adding more skills to your profile helps.",
    recommended_no_skills: "Add skills to your profile to see jobs picked for you.",
    add_skills: "Add skills"
  },

  studentDashboard: {
    recommended_jobs_heading: "Recommended jobs",
    see_all_jobs: "See all recommended jobs",
    peers_heading: "Peers like you",
    see_all_peers: "See all peers",
    no_peers: "No matching talent yet. Adding skills helps us find people like you.",
    privacy_heading: "Privacy",
    show_email_label: "Show my email to other talent",
    show_email_hint: "When this is on, talent who see you under \"Peers like you\" can see your email. Companies can see it when you're a candidate for their job. Anyone can still message you in the app.",
    show_email_on: "Your email is visible to other talent.",
    show_email_off: "Your email is hidden from other talent."
  },

  skillMatch: {
    tab_all: "All talents",
    tab_peers: "Peers like you",
    peers_error: "Couldn't load your peers. Please try refreshing the page.",
    peers_heading: "Peers like you",
    peers_intro: "Talent with skills and a field of study like yours.",
    same_field: "Same field",
    message: "Message"
  },

  hrDashboard: {
    find_candidates: "Find candidates"
  },

  hrCandidates: {
    heading: "Candidates for \"{{title}}\"",
    back: "Back to dashboard",
    intro: "Talent ranked by how many of this job's skills they have.",
    job_skills: "Skills this job asks for:",
    threshold_label: "Minimum match: {{percent}}%",
    showing: "Showing {{shown}} of {{total}} candidates",
    none_above: "No candidates at this match level. Try lowering the minimum.",
    none: "No talent have any of this job's skills yet.",
    no_skills: "This job post has no skills listed, so we can't match candidates. Edit the post to add skills.",
    not_live: "This job isn't live, so you can't invite anyone to it right now.",
    match: "Matches {{matched}}/{{total}} skills",
    has: "Has:",
    missing: "Missing:",
    other_skills: "Other skills:",
    phone_unverified: "not verified",
    view_profile: "View profile",
    message: "Message",
    invite: "Invite to apply",
    invited: "Invited",
    applied: "Applied",
    invite_title: "Invite {{name}} to apply",
    invite_hint: "They get this message in their inbox and a notification that links to the job.",
    invite_default: "Hi {{name}}, your skills are a great fit for our \"{{title}}\" role at {{company}}. We'd love for you to apply!",
    send: "Send invitation",
    sent: "Invitation sent to {{name}}.",
    loading: "Loading candidates...",
    error_load: "Couldn't load candidates."
  }
};

const ar = {
  jobs: {
    tab_all: "كل الوظائف",
    tab_recommended: "مقترحة لي",
    recommended_intro: "وظائف مرتبة حسب عدد المهارات المطلوبة التي تملكها.",
    match_badge: "تطابق {{matched}}/{{total}}",
    apply: "تقديم",
    applied: "تم التقديم",
    invited: "دعيت للتقديم",
    you_have: "لديك:",
    missing: "ينقصك:",
    recommended_empty: "لا توجد وظائف تطابق مهاراتك بعد. إضافة مهارات أخرى إلى ملفك تساعد.",
    recommended_no_skills: "أضف مهارات إلى ملفك لترى الوظائف المختارة لك.",
    add_skills: "إضافة مهارات"
  },

  studentDashboard: {
    recommended_jobs_heading: "وظائف مقترحة",
    see_all_jobs: "عرض كل الوظائف المقترحة",
    peers_heading: "مواهب يشبهونك",
    see_all_peers: "عرض كل المواهب",
    no_peers: "لا يوجد مواهب مطابقون بعد. إضافة المهارات تساعدنا على إيجاد من يشبهونك.",
    privacy_heading: "الخصوصية",
    show_email_label: "إظهار بريدي الإلكتروني للمواهب الآخرين",
    show_email_hint: "عند التفعيل، يستطيع المواهب الذين يرونك في قسم \"مواهب يشبهونك\" رؤية بريدك الإلكتروني. تستطيع الشركات رؤيته عندما تكون مرشحاً لوظائفها. ويمكن للجميع مراسلتك داخل التطبيق دائماً.",
    show_email_on: "بريدك الإلكتروني ظاهر للمواهب الآخرين.",
    show_email_off: "بريدك الإلكتروني مخفي عن المواهب الآخرين."
  },

  skillMatch: {
    tab_all: "جميع المواهب",
    tab_peers: "مواهب يشبهونك",
    peers_error: "تعذّر تحميل المواهب التي تشبهك. يُرجى تحديث الصفحة للمحاولة مجدداً.",
    peers_heading: "مواهب يشبهونك",
    peers_intro: "مواهب لديهم مهارات وتخصص يشبهان مهاراتك وتخصصك.",
    same_field: "نفس التخصص",
    message: "مراسلة"
  },

  hrDashboard: {
    find_candidates: "البحث عن مرشحين"
  },

  hrCandidates: {
    heading: "المرشحون لوظيفة \"{{title}}\"",
    back: "العودة إلى لوحة التحكم",
    intro: "مواهب مرتبون حسب عدد مهارات هذه الوظيفة التي يملكونها.",
    job_skills: "المهارات التي تطلبها هذه الوظيفة:",
    threshold_label: "الحد الأدنى للتطابق: {{percent}}%",
    showing: "عرض {{shown}} من {{total}} مرشحين",
    none_above: "لا يوجد مرشحون بهذا المستوى من التطابق. جرّب خفض الحد الأدنى.",
    none: "لا يوجد مواهب يملكون أياً من مهارات هذه الوظيفة بعد.",
    no_skills: "لا تذكر هذه الوظيفة أي مهارات، لذا لا يمكننا مطابقة المرشحين. عدّل الإعلان لإضافة مهارات.",
    not_live: "هذه الوظيفة غير منشورة، لذا لا يمكنك دعوة أحد إليها الآن.",
    match: "يطابق {{matched}}/{{total}} من المهارات",
    has: "يملك:",
    missing: "ينقصه:",
    other_skills: "مهارات أخرى:",
    phone_unverified: "غير موثّق",
    view_profile: "عرض الملف",
    message: "مراسلة",
    invite: "دعوة للتقديم",
    invited: "تمت الدعوة",
    applied: "قدّم",
    invite_title: "دعوة {{name}} للتقديم",
    invite_hint: "ستصله هذه الرسالة في صندوق الرسائل مع إشعار يحتوي على رابط الوظيفة.",
    invite_default: "مرحباً {{name}}، مهاراتك مناسبة جداً لوظيفة \"{{title}}\" لدى {{company}}. يسعدنا أن تتقدم إليها!",
    send: "إرسال الدعوة",
    sent: "تم إرسال الدعوة إلى {{name}}.",
    loading: "جارٍ تحميل المرشحين...",
    error_load: "تعذّر تحميل المرشحين."
  }
};

const ckb = {
  jobs: {
    tab_all: "هەموو کارەکان",
    tab_recommended: "پێشنیارکراو بۆ من",
    recommended_intro: "کارەکان ڕیزکراون بەپێی ئەوەی چەند لە تواناییە داواکراوەکانیان هەتە.",
    match_badge: "گونجانت {{matched}}/{{total}}",
    apply: "داواکاری",
    applied: "داواکاریت کردووە",
    invited: "بانگهێشت کراویت",
    you_have: "هەتە:",
    missing: "نیتە:",
    recommended_empty: "هێشتا هیچ کارێک لەگەڵ تواناییەکانت ناگونجێت. زیادکردنی توانایی زیاتر بۆ پرۆفایلەکەت یارمەتیدەرە.",
    recommended_no_skills: "توانایی بۆ پرۆفایلەکەت زیاد بکە بۆ بینینی ئەو کارانەی بۆت هەڵبژێردراون.",
    add_skills: "زیادکردنی توانایی"
  },

  studentDashboard: {
    recommended_jobs_heading: "کاری پێشنیارکراو",
    see_all_jobs: "بینینی هەموو کارە پێشنیارکراوەکان",
    peers_heading: "بەهرەمەندانی وەک تۆ",
    see_all_peers: "بینینی هەمووان",
    no_peers: "هێشتا هیچ بەهرەمەندێکی گونجاو نییە. زیادکردنی توانایی یارمەتیمان دەدات کەسانی وەک تۆ بدۆزینەوە.",
    privacy_heading: "تایبەتمەندی",
    show_email_label: "ئیمەیڵەکەم بۆ بەهرەمەندانی تر پیشان بدە",
    show_email_hint: "کاتێک ئەمە چالاکە، ئەو بەهرەمەندانەی لە بەشی \"بەهرەمەندانی وەک تۆ\" دەتبینن ئیمەیڵەکەت دەبینن. کۆمپانیاکان کاتێک کاندیدی کارەکانیان بیت دەیبینن. هەمووان هەمیشە دەتوانن لەناو ئەپەکەدا نامەت بۆ بنێرن.",
    show_email_on: "ئیمەیڵەکەت بۆ بەهرەمەندانی تر دیارە.",
    show_email_off: "ئیمەیڵەکەت لە بەهرەمەندانی تر شاراوەیە."
  },

  skillMatch: {
    tab_all: "هەموو بەهرەمەندان",
    tab_peers: "بەهرەمەندانی وەک تۆ",
    peers_error: "نەتوانرا بەهرەمەندانی وەک تۆ بار بکرێن. تکایە پەڕەکە نوێ بکەرەوە.",
    peers_heading: "بەهرەمەندانی وەک تۆ",
    peers_intro: "بەهرەمەندانێک کە توانایی و پسپۆڕییان وەک هی تۆیە.",
    same_field: "هەمان پسپۆڕی",
    message: "نامە"
  },

  hrDashboard: {
    find_candidates: "دۆزینەوەی کاندید"
  },

  hrCandidates: {
    heading: "کاندیدەکانی \"{{title}}\"",
    back: "گەڕانەوە بۆ داشبۆرد",
    intro: "بەهرەمەندان ڕیزکراون بەپێی ئەوەی چەند لە تواناییەکانی ئەم کارەیان هەیە.",
    job_skills: "ئەو تواناییانەی ئەم کارە داوایان دەکات:",
    threshold_label: "کەمترین گونجان: {{percent}}%",
    showing: "پیشاندانی {{shown}} لە {{total}} کاندید",
    none_above: "لەم ئاستەی گونجاندا هیچ کاندیدێک نییە. کەمترین ئاست دابەزێنە.",
    none: "هێشتا هیچ بەهرەمەندێک هیچ کام لە تواناییەکانی ئەم کارەی نییە.",
    no_skills: "ئەم ڕیکلامە هیچ توانایییەکی تێدا نییە، بۆیە ناتوانین کاندید بگونجێنین. ڕیکلامەکە دەستکاری بکە و توانایی زیاد بکە.",
    not_live: "ئەم کارە بڵاونەکراوەتەوە، بۆیە ئێستا ناتوانیت کەس بانگهێشت بکەیت.",
    match: "{{matched}}/{{total}} توانایی دەگونجێت",
    has: "هەیەتی:",
    missing: "نییەتی:",
    other_skills: "تواناییەکانی تر:",
    phone_unverified: "پشتڕاست نەکراوەتەوە",
    view_profile: "بینینی پرۆفایل",
    message: "نامە",
    invite: "بانگهێشت بۆ داواکاری",
    invited: "بانگهێشت کرا",
    applied: "داواکاری کردووە",
    invite_title: "بانگهێشتکردنی {{name}} بۆ داواکاری",
    invite_hint: "ئەم نامەیە لە سندوقی نامەکانیدا وەردەگرێت لەگەڵ ئاگادارکردنەوەیەک کە بەستەری کارەکەی تێدایە.",
    invite_default: "سڵاو {{name}}، تواناییەکانت زۆر گونجاون بۆ کاری \"{{title}}\" لە {{company}}. خۆشحاڵ دەبین داواکاری پێشکەش بکەیت!",
    send: "ناردنی بانگهێشت",
    sent: "بانگهێشتەکە بۆ {{name}} نێردرا.",
    loading: "بارکردنی کاندیدەکان...",
    error_load: "کاندیدەکان بار نەبوون."
  }
};

export default { en, ar, ckb };
