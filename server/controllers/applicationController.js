const prisma = require('../db');
const { isJobOpen } = require('../utils/jobDeadline');
const { notifyUser } = require('../utils/notify');
const { storageKey } = require('../middleware/upload');
const { uploadPrivate, signedUrlFor, isStoredPath, SIGNED_URL_TTL_SECONDS } = require('../utils/supabaseStorage');
const { canViewApplicationCv } = require('../utils/cvAccess');

// 1. Student applies to a job post
const applyToJob = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: "Only talent can apply to jobs." });
    }

    const { jobPostId, coverLetter } = req.body;

    const job = await prisma.jobPost.findUnique({
      where: { id: Number(jobPostId) },
      include: { hrProfile: { select: { userId: true, companyName: true } } }
    });
    if (!job || !job.isActive) {
      return res.status(404).json({ message: "Job post not found or no longer active." });
    }

    if (!isJobOpen(job)) {
      return res.status(400).json({ code: 'APPLICATIONS_CLOSED', message: 'Applications for this job are closed.' });
    }

    // A file uploaded with this application wins; otherwise fall back to the CV
    // already on file in the student's profile, if any.
    let cvUrl = null;
    if (req.file) {
      const key = storageKey('resumes', 'application', req.user.id, req.file.mimetype, req.file.originalname);
      try {
        cvUrl = await uploadPrivate(req.file.buffer, key, req.file.mimetype);
      } catch (uploadError) {
        if (uploadError.message === 'STORAGE_NOT_CONFIGURED') {
          return res.status(503).json({ message: "File storage isn't set up on this server yet." });
        }
        throw uploadError;
      }
    } else {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { resumeUrl: true } });
      cvUrl = profile?.resumeUrl || null;
    }

    if (job.requiresCv && !cvUrl) {
      return res.status(400).json({ message: "This job requires a CV. Upload one now or save one to your profile first." });
    }

    const application = await prisma.application.create({
      data: {
        jobPostId: job.id,
        studentId: req.user.id,
        coverLetter: coverLetter || null,
        cvUrl: cvUrl || null
      }
    });

    notifyUser(job.hrProfile.userId, {
      type: 'APPLICATION_RECEIVED',
      title: 'New application received',
      body: `A student applied to "${job.title}".`,
      link: `/hr-dashboard`
    });
    notifyUser(req.user.id, {
      type: 'APPLICATION_SUBMITTED',
      title: 'Application submitted',
      body: `Your application to "${job.title}" at ${job.hrProfile.companyName} was sent.`,
      link: `/student-dashboard`
    });

    res.status(201).json({ message: "Application submitted!", application: withCvFlag(application) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "You have already applied to this job." });
    }
    console.error("Apply To Job Error:", error);
    res.status(500).json({ message: "Server error submitting application." });
  }
};

// 2. Student views their own applications
// An application says whether a CV came with it, never where the file is.
function withCvFlag(application) {
  const { cvUrl, ...rest } = application;
  return { ...rest, hasCv: Boolean(cvUrl) };
}

const getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: "Access denied." });
    }

    const applications = await prisma.application.findMany({
      where: { studentId: req.user.id },
      include: {
        jobPost: {
          include: { hrProfile: { select: { companyName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(applications.map(withCvFlag));
  } catch (error) {
    console.error("Get My Applications Error:", error);
    res.status(500).json({ message: "Server error fetching applications." });
  }
};

// 3. HR views applicants for one of their own job posts
const getJobApplicants = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: "Access denied." });
    }

    const { jobId } = req.params;

    const job = await prisma.jobPost.findUnique({
      where: { id: Number(jobId) },
      include: { hrProfile: true }
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.hrProfile.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only view applicants for your own job posts." });
    }

    const applications = await prisma.application.findMany({
      where: { jobPostId: job.id },
      include: {
        student: {
          select: {
            email: true,
            // Not verified — just what the student entered at signup. Only
            // shown to the HR account whose job they actually applied to.
            phone: true,
            studentProfile: {
              select: { fullName: true, university: true, fieldOfStudy: true, linkedinUrl: true, githubUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ jobTitle: job.title, applications: applications.map(withCvFlag) });
  } catch (error) {
    console.error("Get Job Applicants Error:", error);
    res.status(500).json({ message: "Server error fetching applicants." });
  }
};

// The CV attached to one application: for the person who sent it, the
// company that received it, and admins.
const getApplicationCvLink = async (req, res) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        cvUrl: true,
        studentId: true,
        jobPost: { select: { hrProfile: { select: { userId: true } } } }
      }
    });
    if (!application || !application.cvUrl) {
      return res.status(404).json({ message: "No CV on this application." });
    }
    if (!(await canViewApplicationCv(req.user, application))) {
      return res.status(404).json({ message: "No CV on this application." });
    }

    if (!isStoredPath(application.cvUrl)) {
      return res.status(200).json({ url: application.cvUrl, legacy: true });
    }

    const url = await signedUrlFor(application.cvUrl);
    res.status(200).json({ url, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    if (error.message === 'STORAGE_NOT_CONFIGURED') {
      return res.status(503).json({ message: "File storage isn't set up on this server yet." });
    }
    console.error("Application CV Link Error:", error);
    res.status(500).json({ message: "Server error preparing the CV link." });
  }
};

module.exports = { applyToJob, getMyApplications, getJobApplicants, getApplicationCvLink };
