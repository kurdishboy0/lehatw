const prisma = require('../../db');
const { parseApplicationDeadline, deadlineError } = require('../../utils/jobDeadline');
const { logAdminAction } = require('../../utils/audit');
const { notifyUser } = require('../../utils/notify');
const { createSetupLink, sendSetupEmail } = require('../../utils/accountSetup');

const MAX_NAME = 120;

const clean = (value, max = MAX_NAME) => String(value ?? '').trim().slice(0, max);
const ROLE_LABEL = { STUDENT: 'student', HR: 'company', INSTRUCTOR: 'instructor' };

// ============ Accounts created by an admin ============

// Creates a student or company account with no password, then emails a
// one-time link so the person chooses their own.
const createAccount = async (req, res) => {
  try {
    const role = ['STUDENT', 'HR', 'INSTRUCTOR'].includes(req.body.role) ? req.body.role : null;
    if (!role) return res.status(400).json({ message: 'Choose whether this is a talent, company, or instructor account.' });

    const email = clean(req.body.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const phone = clean(req.body.phone, 30) || null;

    const student = {
      fullName: clean(req.body.fullName),
      university: clean(req.body.university),
      fieldOfStudy: clean(req.body.fieldOfStudy),
      graduationYear: Number(req.body.graduationYear) || null
    };
    const company = {
      companyName: clean(req.body.companyName),
      industry: clean(req.body.industry),
      jobTitle: clean(req.body.jobTitle),
      crNumber: clean(req.body.crNumber, 60)
    };
    if (role === 'STUDENT' && (!student.fullName || !student.university || !student.fieldOfStudy)) {
      return res.status(400).json({ message: 'Please fill in the name, university, and field of study.' });
    }
    if (role === 'HR' && !company.companyName) {
      return res.status(400).json({ message: 'Please enter the company name.' });
    }
    const instructor = {
      fullName: clean(req.body.fullName),
      headline: clean(req.body.headline, 160),
      expertise: clean(req.body.expertise, 500)
    };
    if (role === 'INSTRUCTOR' && !instructor.fullName) {
      return res.status(400).json({ message: "Please enter the instructor's full name." });
    }
    // An admin creating the account vouches for it, so it starts approved
    // unless they say otherwise.
    const approveNow = req.body.approve !== false;

    const user = await prisma.user.create({
      data: {
        email,
        role,
        phone,
        // No password yet: the setup link is the only way in until they set one.
        phoneVerified: true,
        ...(role === 'STUDENT'
          ? { studentProfile: { create: student } }
          : role === 'INSTRUCTOR'
          ? {
            instructorProfile: {
              create: {
                ...instructor,
                phone,
                // An admin creating the account vouches for them, so they can
                // teach right away unless the admin says otherwise.
                status: approveNow ? 'APPROVED' : 'PENDING'
              }
            }
          }
          : {
            hrProfile: {
              create: {
                ...company,
                industry: company.industry || 'Pending',
                jobTitle: company.jobTitle || 'Pending',
                crNumber: company.crNumber || 'Pending',
                phone,
                status: approveNow ? 'APPROVED' : 'PENDING'
              }
            }
          })
      },
      select: { id: true, email: true, role: true }
    });

    const { url } = await createSetupLink(req, user.id);
    const displayName = role === 'STUDENT' ? student.fullName : role === 'INSTRUCTOR' ? instructor.fullName : company.companyName;
    sendSetupEmail({
      to: email,
      name: displayName,
      roleLabel: ROLE_LABEL[role],
      link: url,
      invitedBy: `A Lehatw admin (${req.user.email})`
    });

    await logAdminAction(req, {
      action: 'ACCOUNT_CREATED', targetType: 'USER', targetId: user.id,
      summary: `Created ${ROLE_LABEL[role]} account ${email}`,
      details: { role, name: displayName, approved: role === 'STUDENT' ? undefined : approveNow }
    });
    res.status(201).json({ message: 'Account created. The setup link was emailed.', user, setupUrl: url });
  } catch (error) {
    console.error('Create Account Error:', error);
    res.status(500).json({ message: 'Server error creating the account.' });
  }
};

// Sends a fresh set-password link, e.g. when the first email never arrived.
const resendSetupLink = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: { id: true, email: true, role: true, studentProfile: { select: { fullName: true } }, hrProfile: { select: { companyName: true } }, instructorProfile: { select: { fullName: true } } }
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'ADMIN') return res.status(400).json({ message: 'Admin accounts get their password another way.' });

    const { url } = await createSetupLink(req, user.id);
    sendSetupEmail({
      to: user.email,
      name: user.studentProfile?.fullName || user.hrProfile?.companyName || user.instructorProfile?.fullName || null,
      roleLabel: ROLE_LABEL[user.role] || 'account',
      link: url,
      invitedBy: `A Lehatw admin (${req.user.email})`
    });
    await logAdminAction(req, {
      action: 'SETUP_LINK_SENT', targetType: 'USER', targetId: user.id,
      summary: `Sent a new set-password link to ${user.email}`
    });
    res.status(200).json({ message: 'A new setup link was emailed.', setupUrl: url });
  } catch (error) {
    console.error('Resend Setup Link Error:', error);
    res.status(500).json({ message: 'Server error sending the link.' });
  }
};

// ============ Job posts created by an admin ============

// Posts a job on behalf of an approved company; it belongs to that company,
// which sees it and its applicants as if they had posted it themselves.
const createJobForCompany = async (req, res) => {
  try {
    const hrProfile = await prisma.hRProfile.findUnique({
      where: { id: Number(req.body.hrProfileId) },
      select: { id: true, companyName: true, status: true, userId: true }
    });
    if (!hrProfile) return res.status(400).json({ message: 'Choose the company this job belongs to.' });
    if (hrProfile.status !== 'APPROVED') return res.status(400).json({ message: 'That company is not approved yet.' });

    const title = clean(req.body.title, 200);
    if (!title) return res.status(400).json({ message: 'Please enter a job title.' });

    const skillIds = (Array.isArray(req.body.skillIds) ? req.body.skillIds : []).map(Number).filter(Number.isInteger);
    const job = await prisma.jobPost.create({
      data: {
        hrProfileId: hrProfile.id,
        title,
        description: clean(req.body.description, 5000) || null,
        responsibilities: clean(req.body.responsibilities, 5000) || null,
        requirements: clean(req.body.requirements, 5000) || null,
        benefits: clean(req.body.benefits, 5000) || null,
        location: clean(req.body.location, 120) || null,
        employmentType: clean(req.body.employmentType, 60) || null,
        workMode: clean(req.body.workMode, 60) || null,
        experienceLevel: clean(req.body.experienceLevel, 120) || null,
        education: clean(req.body.education, 200) || null,
        requiresCv: req.body.requiresCv !== false,
        applicationDeadline: parseApplicationDeadline(req.body.applicationDeadline),
        skills: { create: skillIds.map((id) => ({ skill: { connect: { id } } })) }
      },
      include: { skills: { include: { skill: true } } }
    });

    notifyUser(hrProfile.userId, {
      type: 'JOB_POSTED_BY_ADMIN',
      title: 'A job post was added for your company',
      body: `An admin posted "${job.title}" for ${hrProfile.companyName}. You can edit or hide it from your dashboard.`,
      link: '/hr-dashboard?section=jobs'
    });
    await logAdminAction(req, {
      action: 'JOB_CREATED', targetType: 'JOB', targetId: job.id,
      summary: `Posted job "${job.title}" for ${hrProfile.companyName}`,
      details: { company: hrProfile.companyName, skills: skillIds.length }
    });
    res.status(201).json({ message: 'Job posted.', job });
  } catch (error) {
    if (deadlineError(res, error)) return;
    console.error('Admin Create Job Error:', error);
    res.status(500).json({ message: 'Server error posting the job.' });
  }
};

module.exports = { createAccount, resendSetupLink, createJobForCompany };
