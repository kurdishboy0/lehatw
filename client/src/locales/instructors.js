// Strings for instructor signup, the instructor dashboard, and admin review.

const en = {
  nav: { teach: "Teach" },

  adminConsole: {
    role: { INSTRUCTOR: "Instructor" },
    users: {
      create_instructor_name: "Full name",
      create_headline: "Headline (optional)",
      create_expertise: "What they teach (optional)",
      create_approve_instructor: "Approve this instructor right away"
    },
    approvals: {
      instructors_heading: "Instructor accounts",
      no_instructors: "No instructors in this list.",
      teaches: "Teaches: {{expertise}}",
      reject_instructor_title: "Reject {{name}}",
      reject_instructor_hint: "They see this reason and can fix their details and apply again.",
      instructor_approved: "{{name}} can now teach.",
      instructor_rejected: "{{name}} rejected. They were told why."
    },
    audit: {
      actions: {
        INSTRUCTOR_APPROVED: "Approved an instructor",
        INSTRUCTOR_REJECTED: "Rejected an instructor"
      }
    }
  },

  registerInstructor: {
    title: "Teach on Lehatw",
    subtitle: "Share what you know with students across Kurdistan. An admin reviews your details before your courses go live.",
    full_name: "Your full name",
    email: "Email address",
    password: "Password",
    headline: "Headline",
    headline_placeholder: "Senior data engineer, English teacher, ...",
    expertise: "What do you teach?",
    expertise_placeholder: "Python, data analysis, business English, ...",
    bio: "About you",
    bio_placeholder: "Your experience, qualifications, and how you teach.",
    website: "Website (optional)",
    linkedin: "LinkedIn (optional)",
    phone: "Phone (optional)",
    submit: "Apply to teach",
    success: "Thanks. We'll review your details and let you know.",
    have_account: "Already have an account?",
    login: "Log in",
    error_default: "Couldn't create your account. Please try again."
  },

  instructorDashboard: {
    heading: "Instructor dashboard",
    status_PENDING: "Waiting for review",
    status_APPROVED: "Approved",
    status_REJECTED: "Not approved",
    pending_note: "An admin is reviewing your details. You can already fill in your profile.",
    rejected_note: "Your application was not approved.",
    rejected_reason: "Reason: {{reason}}",
    rejected_hint: "Update your details and save them to apply again.",
    approved_note: "You can create courses.",
    profile_heading: "Your instructor profile",
    edit: "Edit profile",
    save: "Save",
    cancel: "Cancel",
    saved: "Profile saved.",
    resubmitted: "Thanks. Your details were sent for review again.",
    full_name: "Full name",
    headline: "Headline",
    expertise: "What you teach",
    bio: "About you",
    website: "Website",
    linkedin: "LinkedIn",
    phone: "Phone",
    loading: "Loading...",
    error_load: "Couldn't load your profile.",
    error_save: "Couldn't save your profile."
  }
};

const ar = {
  nav: { teach: "علّم معنا" },

  adminConsole: {
    role: { INSTRUCTOR: "مدرّب" },
    users: {
      create_instructor_name: "الاسم الكامل",
      create_headline: "المسمى المختصر (اختياري)",
      create_expertise: "ما الذي يدرّسه (اختياري)",
      create_approve_instructor: "الموافقة على هذا المدرّب فوراً"
    },
    approvals: {
      instructors_heading: "حسابات المدرّبين",
      no_instructors: "لا يوجد مدرّبون في هذه القائمة.",
      teaches: "يدرّس: {{expertise}}",
      reject_instructor_title: "رفض {{name}}",
      reject_instructor_hint: "سيرى هذا السبب ويمكنه تصحيح بياناته وإعادة التقديم.",
      instructor_approved: "أصبح بإمكان {{name}} التدريس.",
      instructor_rejected: "تم رفض {{name}} وإبلاغه بالسبب."
    },
    audit: {
      actions: {
        INSTRUCTOR_APPROVED: "الموافقة على مدرّب",
        INSTRUCTOR_REJECTED: "رفض مدرّب"
      }
    }
  },

  registerInstructor: {
    title: "علّم على لێهاتوو",
    subtitle: "شارك خبرتك مع الطلاب في كردستان. يراجع أحد المشرفين بياناتك قبل نشر دوراتك.",
    full_name: "اسمك الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    headline: "المسمى المختصر",
    headline_placeholder: "مهندس بيانات، مدرّس لغة إنجليزية، ...",
    expertise: "ماذا تدرّس؟",
    expertise_placeholder: "بايثون، تحليل البيانات، الإنجليزية للأعمال، ...",
    bio: "نبذة عنك",
    bio_placeholder: "خبرتك ومؤهلاتك وأسلوبك في التدريس.",
    website: "الموقع الإلكتروني (اختياري)",
    linkedin: "لينكدإن (اختياري)",
    phone: "الهاتف (اختياري)",
    submit: "التقديم للتدريس",
    success: "شكراً لك. سنراجع بياناتك ونعلمك بالنتيجة.",
    have_account: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",
    error_default: "تعذّر إنشاء حسابك. يرجى المحاولة مرة أخرى."
  },

  instructorDashboard: {
    heading: "لوحة المدرّب",
    status_PENDING: "قيد المراجعة",
    status_APPROVED: "تمت الموافقة",
    status_REJECTED: "لم تتم الموافقة",
    pending_note: "يراجع أحد المشرفين بياناتك. يمكنك إكمال ملفك الآن.",
    rejected_note: "لم تتم الموافقة على طلبك.",
    rejected_reason: "السبب: {{reason}}",
    rejected_hint: "حدّث بياناتك واحفظها لإعادة التقديم.",
    approved_note: "يمكنك الآن إنشاء الدورات.",
    profile_heading: "ملفك كمدرّب",
    edit: "تعديل الملف",
    save: "حفظ",
    cancel: "إلغاء",
    saved: "تم حفظ الملف.",
    resubmitted: "شكراً لك. أُعيد إرسال بياناتك للمراجعة.",
    full_name: "الاسم الكامل",
    headline: "المسمى المختصر",
    expertise: "ما تدرّسه",
    bio: "نبذة عنك",
    website: "الموقع الإلكتروني",
    linkedin: "لينكدإن",
    phone: "الهاتف",
    loading: "جارٍ التحميل...",
    error_load: "تعذّر تحميل ملفك.",
    error_save: "تعذّر حفظ ملفك."
  }
};

const ckb = {
  nav: { teach: "وانە بڵێ" },

  adminConsole: {
    role: { INSTRUCTOR: "مامۆستا" },
    users: {
      create_instructor_name: "ناوی تەواو",
      create_headline: "ناونیشانی کورت (ئارەزوومەندانە)",
      create_expertise: "چی دەڵێتەوە (ئارەزوومەندانە)",
      create_approve_instructor: "دەستبەجێ ئەم مامۆستایە پەسەند بکە"
    },
    approvals: {
      instructors_heading: "هەژماری مامۆستایان",
      no_instructors: "هیچ مامۆستایەک لەم لیستەدا نییە.",
      teaches: "دەیڵێتەوە: {{expertise}}",
      reject_instructor_title: "ڕەتکردنەوەی {{name}}",
      reject_instructor_hint: "ئەم هۆکارە دەبینێت و دەتوانێت زانیارییەکانی ڕاست بکاتەوە و دووبارە داوا بکات.",
      instructor_approved: "ئێستا {{name}} دەتوانێت وانە بڵێتەوە.",
      instructor_rejected: "{{name}} ڕەتکرایەوە و هۆکارەکەی پێ ڕاگەیەندرا."
    },
    audit: {
      actions: {
        INSTRUCTOR_APPROVED: "پەسەندکردنی مامۆستا",
        INSTRUCTOR_REJECTED: "ڕەتکردنەوەی مامۆستا"
      }
    }
  },

  registerInstructor: {
    title: "لە لێهاتوو وانە بڵێوە",
    subtitle: "زانیارییەکانت لەگەڵ خوێندکارانی کوردستان هاوبەش بکە. بەڕێوەبەرێک زانیارییەکانت پێداچوونەوەی بۆ دەکات پێش ئەوەی خولەکانت بڵاوببنەوە.",
    full_name: "ناوی تەواوت",
    email: "ئیمەیڵ",
    password: "وشەی نهێنی",
    headline: "ناونیشانی کورت",
    headline_placeholder: "ئەندازیاری داتا، مامۆستای ئینگلیزی، ...",
    expertise: "چی دەڵێیتەوە؟",
    expertise_placeholder: "پایثۆن، شیکاری داتا، ئینگلیزی بازرگانی، ...",
    bio: "دەربارەی تۆ",
    bio_placeholder: "ئەزموون، بڕوانامەکانت، و شێوازی وانە وتنەوەت.",
    website: "ماڵپەڕ (ئارەزوومەندانە)",
    linkedin: "لینکدئین (ئارەزوومەندانە)",
    phone: "تەلەفۆن (ئارەزوومەندانە)",
    submit: "داواکاری بۆ وانە وتنەوە",
    success: "سوپاس. زانیارییەکانت پێداچوونەوەی بۆ دەکەین و ئاگادارت دەکەینەوە.",
    have_account: "پێشتر هەژمارت هەیە؟",
    login: "چوونەژوورەوە",
    error_default: "هەژمارەکەت دروست نەکرا. تکایە دووبارە هەوڵ بدەرەوە."
  },

  instructorDashboard: {
    heading: "داشبۆردی مامۆستا",
    status_PENDING: "چاوەڕوانی پێداچوونەوە",
    status_APPROVED: "پەسەندکراوە",
    status_REJECTED: "پەسەند نەکراوە",
    pending_note: "بەڕێوەبەرێک زانیارییەکانت پێداچوونەوەی بۆ دەکات. لە ئێستاوە دەتوانیت پرۆفایلەکەت پڕ بکەیتەوە.",
    rejected_note: "داواکارییەکەت پەسەند نەکرا.",
    rejected_reason: "هۆکار: {{reason}}",
    rejected_hint: "زانیارییەکانت نوێ بکەرەوە و پاشەکەوتیان بکە بۆ داواکردنەوە.",
    approved_note: "ئێستا دەتوانیت خول دروست بکەیت.",
    profile_heading: "پرۆفایلی مامۆستایەتیت",
    edit: "دەستکاریکردنی پرۆفایل",
    save: "پاشەکەوتکردن",
    cancel: "پاشگەزبوونەوە",
    saved: "پرۆفایل پاشەکەوت کرا.",
    resubmitted: "سوپاس. زانیارییەکانت دووبارە بۆ پێداچوونەوە نێردرانەوە.",
    full_name: "ناوی تەواو",
    headline: "ناونیشانی کورت",
    expertise: "ئەوەی دەیڵێیتەوە",
    bio: "دەربارەی تۆ",
    website: "ماڵپەڕ",
    linkedin: "لینکدئین",
    phone: "تەلەفۆن",
    loading: "بارکردن...",
    error_load: "پرۆفایلەکەت بار نەبوو.",
    error_save: "پرۆفایلەکەت پاشەکەوت نەکرا."
  }
};

export default { en, ar, ckb };
