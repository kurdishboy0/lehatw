const prisma = require('../db');
const { buildSkillVector, requiredSkillsCoverage } = require('../utils/similarity');

// 1. Create a Job Post with Required Skills
const createJobPost = async (req, res) => {
  try {
    const {
      title, description, responsibilities, requirements, benefits,
      location, employmentType, workMode, experienceLevel, education,
      requiresCv, skillIds
    } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: "Access denied. Only HR can post jobs." });
    }

    const hrProfile = await prisma.hRProfile.findUnique({
      where: { userId }
    });

    if (!hrProfile) {
      return res.status(404).json({ message: "HR Profile not found. Please complete profile setup." });
    }

    if (hrProfile.status !== 'APPROVED') {
      return res.status(403).json({ message: "Your company profile must be approved by an admin before you can post jobs." });
    }

    // Create job and link selected skills via JobPostSkill
    const newJob = await prisma.jobPost.create({
      data: {
        title,
        description,
        responsibilities,
        requirements,
        benefits,
        location,
        employmentType,
        workMode,
        experienceLevel,
        education,
        requiresCv: requiresCv ?? true,
        hrProfileId: hrProfile.id,
        skills: {
          create: (skillIds || []).map((id) => ({
            skill: { connect: { id: Number(id) } }
          }))
        }
      },
      include: {
        skills: { include: { skill: true } }
      }
    });

    res.status(201).json({ message: "Job posted successfully!", job: newJob });
  } catch (error) {
    console.error("Job Creation Error:", error);
    res.status(500).json({ message: "Server error creating job post." });
  }
};

// 2. Fetch All System Skills (for multi-select UI)
const getSkillsList = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name_en: 'asc' }
    });
    res.status(200).json(skills);
  } catch (error) {
    console.error("Fetch Skills Error:", error);
    res.status(500).json({ message: "Failed to load skills." });
  }
};

// 3. Matchmaking Engine: Recommend Students by Skill Overlap
const getMatchingStudents = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (req.user.role !== 'HR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Access denied." });
    }

    // Get job requirements
    const job = await prisma.jobPost.findUnique({
      where: { id: Number(jobId) },
      include: { skills: true, hrProfile: true }
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (req.user.role === 'HR' && job.hrProfile.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only view matches for your own job posts." });
    }

    const requiredSkillIds = job.skills.map((s) => s.skillId);

    // Fetch student profiles containing relevant skills
    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { email: true } },
        skills: { include: { skill: true } },
        customSkills: true
      }
    });

    // Score and rank candidates using proficiency-weighted coverage of the required skills
    const rankedStudents = students
      .map((student) => {
        const vector = buildSkillVector(student);
        const matchScore = requiredSkillIds.length > 0
          ? requiredSkillsCoverage(vector, requiredSkillIds)
          : 0;
        const matchedSkills = student.skills.filter((s) => requiredSkillIds.includes(s.skillId));

        return {
          id: student.id,
          fullName: student.fullName,
          university: student.university,
          fieldOfStudy: student.fieldOfStudy,
          email: student.user.email,
          linkedinUrl: student.linkedinUrl,
          githubUrl: student.githubUrl,
          matchScore,
          matchedSkills: matchedSkills.map((m) => m.skill.name_en),
          allSkills: student.skills.map((s) => s.skill.name_en)
        };
      })
      .filter((student) => student.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      jobTitle: job.title,
      totalRequiredSkills: requiredSkillIds.length,
      matches: rankedStudents
    });
  } catch (error) {
    console.error("Match Engine Error:", error);
    res.status(500).json({ message: "Error calculating student matches." });
  }
};

// 3b. Fetch a Single Active Job Post (Public job detail page)
const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await prisma.jobPost.findUnique({
      where: { id: Number(jobId) },
      include: {
        hrProfile: { select: { companyName: true, industry: true } },
        skills: { include: { skill: true } }
      }
    });

    if (!job || !job.isActive) {
      return res.status(404).json({ message: "Job post not found." });
    }

    res.status(200).json(job);
  } catch (error) {
    console.error("Fetch Job Error:", error);
    res.status(500).json({ message: "Server error fetching job post." });
  }
};

// 4. List Active Job Posts (Public browse page for students)
const getActiveJobs = async (req, res) => {
  try {
    const jobs = await prisma.jobPost.findMany({
      where: { isActive: true },
      include: {
        hrProfile: { select: { companyName: true, industry: true } },
        skills: { include: { skill: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Fetch Active Jobs Error:", error);
    res.status(500).json({ message: "Server error fetching job posts." });
  }
};

// 5. List the Logged-in HR's Own Job Posts
const getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: "Access denied." });
    }

    const hrProfile = await prisma.hRProfile.findUnique({ where: { userId: req.user.id } });
    if (!hrProfile) {
      return res.status(404).json({ message: "HR Profile not found." });
    }

    const jobs = await prisma.jobPost.findMany({
      where: { hrProfileId: hrProfile.id },
      include: {
        skills: { include: { skill: true } },
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Fetch My Jobs Error:", error);
    res.status(500).json({ message: "Server error fetching your job posts." });
  }
};

// Shared helper: load a job post and confirm the requesting HR user owns it
const loadOwnedJob = async (jobId, userId) => {
  const job = await prisma.jobPost.findUnique({
    where: { id: Number(jobId) },
    include: { hrProfile: true }
  });
  if (!job) return { error: 404, message: "Job not found." };
  if (job.hrProfile.userId !== userId) return { error: 403, message: "You can only manage your own job posts." };
  return { job };
};

// 6. Update a Job Post (owning HR only)
const updateJobPost = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: "Access denied." });
    }

    const { jobId } = req.params;
    const { error, message, job } = await loadOwnedJob(jobId, req.user.id);
    if (error) return res.status(error).json({ message });

    const {
      title, description, responsibilities, requirements, benefits,
      location, employmentType, workMode, experienceLevel, education,
      requiresCv, isActive, skillIds
    } = req.body;

    const updatedJob = await prisma.jobPost.update({
      where: { id: job.id },
      data: {
        title: title ?? job.title,
        description: description ?? job.description,
        responsibilities: responsibilities ?? job.responsibilities,
        requirements: requirements ?? job.requirements,
        benefits: benefits ?? job.benefits,
        location: location ?? job.location,
        employmentType: employmentType ?? job.employmentType,
        workMode: workMode ?? job.workMode,
        experienceLevel: experienceLevel ?? job.experienceLevel,
        education: education ?? job.education,
        requiresCv: requiresCv ?? job.requiresCv,
        isActive: isActive ?? job.isActive,
        ...(skillIds && {
          skills: {
            deleteMany: {},
            create: skillIds.map((id) => ({ skill: { connect: { id: Number(id) } } }))
          }
        })
      },
      include: { skills: { include: { skill: true } } }
    });

    res.status(200).json({ message: "Job post updated!", job: updatedJob });
  } catch (error) {
    console.error("Update Job Error:", error);
    res.status(500).json({ message: "Server error updating job post." });
  }
};

// 7. Delete a Job Post (owning HR only)
const deleteJobPost = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: "Access denied." });
    }

    const { jobId } = req.params;
    const { error, message, job } = await loadOwnedJob(jobId, req.user.id);
    if (error) return res.status(error).json({ message });

    await prisma.jobPost.delete({ where: { id: job.id } });

    res.status(200).json({ message: "Job post deleted." });
  } catch (error) {
    console.error("Delete Job Error:", error);
    res.status(500).json({ message: "Server error deleting job post." });
  }
};

module.exports = {
  createJobPost,
  getSkillsList,
  getMatchingStudents,
  getJobById,
  getActiveJobs,
  getMyJobs,
  updateJobPost,
  deleteJobPost
};