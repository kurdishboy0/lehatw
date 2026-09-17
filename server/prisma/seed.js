const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const TEST_PASSWORD = 'Password123!';

async function main() {
  console.log("🧹 Clearing old categories and skills...");
  await prisma.skill.deleteMany();
  await prisma.category.deleteMany();

  console.log("🌱 Seeding skill categories...");

  await prisma.category.create({
    data: {
      name_en: "Web & Mobile Development",
      name_ar: "تطوير الويب والموبايل",
      name_ckb: "گەشەپێدانی وێب و مۆبایل",
      skills: {
        create: [
          { name_en: "React", name_ar: "رياكت", name_ckb: "React" },
          { name_en: "Node.js", name_ar: "نود.جي اس", name_ckb: "Node.js" },
          { name_en: "Express", name_ar: "إكسبريس", name_ckb: "Express" },
          { name_en: "ASP.NET C#", name_ar: "إيه إس بي دوت نت سي شارب", name_ckb: "ASP.NET C#" },
          { name_en: "Python", name_ar: "بايثون", name_ckb: "Python" },
          { name_en: "Flutter", name_ar: "فلاتر", name_ckb: "Flutter" },
          { name_en: "HTML5 & CSS", name_ar: "إتش تي إم إل 5 و سي إس إس", name_ckb: "HTML5 & CSS" }
        ]
      }
    }
  });

  await prisma.category.create({
    data: {
      name_en: "Artificial Intelligence",
      name_ar: "الذكاء الاصطناعي",
      name_ckb: "ژيری دەستکرد",
      skills: {
        create: [
          { name_en: "Deep Learning", name_ar: "التعلم العميق", name_ckb: "فێربوونی قووڵ" },
          { name_en: "Computer Vision", name_ar: "الرؤية الحاسوبية", name_ckb: "بینینی کۆمپیوتەر" },
          { name_en: "Feature Extraction", name_ar: "استخراج الميزات", name_ckb: "دەرهێنانی تایبەتمەندی" },
          { name_en: "Medical Image Segmentation", name_ar: "تجزئة الصور الطبية", name_ckb: "دابەشکردنی وێنەی پزیشکی" },
          { name_en: "Explainable AI", name_ar: "الذكاء الاصطناعي القابل للتفسير", name_ckb: "ژيری دەستکردی ڕوونكراوە" }
        ]
      }
    }
  });

  await prisma.category.create({
    data: {
      name_en: "Server Administration",
      name_ar: "إدارة الخوادم",
      name_ckb: "بەڕێوەبردنی سێرڤەر",
      skills: {
        create: [
          { name_en: "Windows Server", name_ar: "ويندوز سيرفر", name_ckb: "Windows Server" },
          { name_en: "Active Directory Domain Services", name_ar: "خدمات مجال أكتيف دايركتوري", name_ckb: "Active Directory Domain Services" },
          { name_en: "Group Policy Objects (GPO)", name_ar: "كائنات نهج المجموعة", name_ckb: "Group Policy Objects" },
          { name_en: "DHCP & DNS", name_ar: "دي إتش سي بي و دي إن إس", name_ckb: "DHCP & DNS" },
          { name_en: "Windows Deployment Services", name_ar: "خدمات نشر ويندوز", name_ckb: "Windows Deployment Services" }
        ]
      }
    }
  });

  await prisma.category.create({
    data: {
      name_en: "Database Management",
      name_ar: "إدارة قواعد البيانات",
      name_ckb: "بەڕێوەبردنی بنکەی دراوە",
      skills: {
        create: [
          { name_en: "PostgreSQL", name_ar: "بوستجري إس كيو إل", name_ckb: "PostgreSQL" },
          { name_en: "SQL", name_ar: "إس كيو إل", name_ckb: "SQL" },
          { name_en: "Prisma ORM", name_ar: "بريزما", name_ckb: "Prisma ORM" }
        ]
      }
    }
  });

  console.log("🌱 Seeding test accounts for all three roles...");
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  // The seeded admin is the super-admin, so a fresh database always has
  // someone able to create and manage other admin accounts.
  await prisma.user.upsert({
    where: { email: 'admin@lehatw.test' },
    update: { isSuperAdmin: true },
    create: {
      email: 'admin@lehatw.test',
      password: hashedPassword,
      role: 'ADMIN',
      isSuperAdmin: true
    }
  });

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@lehatw.test' },
    update: {},
    create: {
      email: 'hr@lehatw.test',
      password: hashedPassword,
      role: 'HR'
    }
  });

  await prisma.hRProfile.upsert({
    where: { userId: hrUser.id },
    update: {},
    create: {
      userId: hrUser.id,
      companyName: "Lehatw Test Co.",
      industry: "Technology",
      jobTitle: "Talent Acquisition Lead",
      crNumber: "TEST-0001",
      status: "APPROVED"
    }
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@lehatw.test' },
    update: {},
    create: {
      email: 'student@lehatw.test',
      password: hashedPassword,
      role: 'STUDENT'
    }
  });

  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      fullName: "Test Student",
      university: "University of Erbil",
      fieldOfStudy: "Computer Science",
      graduationYear: 2026
    }
  });

  console.log("✅ Seeding complete!");
  console.log(`   Test login password for all seeded accounts: ${TEST_PASSWORD}`);
  console.log("   admin@lehatw.test / hr@lehatw.test (APPROVED) / student@lehatw.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
