// Strings for the public "choose your password" page used by accounts an
// admin created. Merged into the main resources in i18n.js.

const en = {
  setPassword: {
    heading: "Choose your password",
    subtitle: "Set a password for {{email}} to start using Lehatw.",
    password: "New password",
    confirm: "Repeat password",
    mismatch: "The two passwords don't match.",
    submit: "Set password and log in",
    checking: "Checking your link...",
    invalid_title: "This link doesn't work",
    back_to_login: "Go to login",
    error_default: "Couldn't set your password. Please try again."
  }
};

const ar = {
  setPassword: {
    heading: "اختر كلمة المرور",
    subtitle: "عيّن كلمة مرور لحساب {{email}} لتبدأ استخدام لێهاتوو.",
    password: "كلمة المرور الجديدة",
    confirm: "أعد كتابة كلمة المرور",
    mismatch: "كلمتا المرور غير متطابقتين.",
    submit: "حفظ كلمة المرور وتسجيل الدخول",
    checking: "جارٍ التحقق من الرابط...",
    invalid_title: "هذا الرابط لا يعمل",
    back_to_login: "الذهاب إلى تسجيل الدخول",
    error_default: "تعذّر حفظ كلمة المرور. يرجى المحاولة مرة أخرى."
  }
};

const ckb = {
  setPassword: {
    heading: "وشەی نهێنی خۆت هەڵبژێرە",
    subtitle: "وشەیەکی نهێنی بۆ {{email}} دابنێ بۆ ئەوەی دەست بە بەکارهێنانی لێهاتوو بکەیت.",
    password: "وشەی نهێنی نوێ",
    confirm: "دووبارە وشەی نهێنی بنووسە",
    mismatch: "هەردوو وشە نهێنییەکە وەک یەک نین.",
    submit: "پاشەکەوتکردن و چوونەژوورەوە",
    checking: "بەستەرەکە پشکنین دەکرێت...",
    invalid_title: "ئەم بەستەرە کار ناکات",
    back_to_login: "چوون بۆ پەڕەی چوونەژوورەوە",
    error_default: "وشەی نهێنی پاشەکەوت نەکرا. تکایە دووبارە هەوڵ بدەرەوە."
  }
};

export default { en, ar, ckb };
