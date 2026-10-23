const prisma = require('../db');
const { storageKey } = require('../middleware/upload');
const { uploadToStorage, uploadPrivate, signedUrlFor, deleteFromStorageUrl, deleteStoredFile, isStoredPath, SIGNED_URL_TTL_SECONDS } = require('../utils/supabaseStorage');
const { canViewTalentResume } = require('../utils/cvAccess');
const { publicTalentProfile } = require('../utils/talentPrivacy');

const createStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { fullName, university, fieldOfStudy, graduationYear, bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl } = req.body;

    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: userId } });
    if (existingProfile) {
      return res.status(400).json({ message: "You already have a profile!" });
    }

    const newProfile = await prisma.studentProfile.create({
      data: {
        userId, fullName, university, fieldOfStudy, graduationYear, bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl,
        ...(typeof req.body.showEmailToStudents === 'boolean' && { showEmailToStudents: req.body.showEmailToStudents })
      }
    });

    res.status(201).json({ message: "Profile created successfully!", profile: newProfile });
  } catch (error) {
    console.error("Profile Creation Error:", error);
    res.status(500).json({ message: "Server error creating profile." });
  }
};

// Get the student's profile (including nested skills & custom skills)
const getStudentProfile = async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        skills: {
          include: {
            skill: {
              include: { category: true }
            }
          }
        },
        customSkills: true
      }
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    res.status(200).json(withResumeFlag(profile));
  } catch (error) {
    console.error("Get Student Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile." });
  }
};
// NEW: Update the student's profile
const updateStudentProfile = async (req, res) => {
  try {
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingProfile) {
      return res.status(404).json({ message: "Profile not found. Create one first." });
    }

    // 1. Extract only the fields we want to update (ignores id and userId)
    const { 
      fullName, university, fieldOfStudy, graduationYear, 
      bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl,
      showEmailToStudents
    } = req.body;

    // 2. Safely update the database, ensuring graduationYear is an Integer!
    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: {
        fullName,
        university,
        fieldOfStudy,
        graduationYear: parseInt(graduationYear), // <-- THE MAGIC FIX
        bio,
        photoUrl,
        portfolioUrl,
        linkedinUrl,
        githubUrl,
        huggingFaceUrl,
        // Only a real boolean changes the privacy setting; anything else leaves it.
        ...(typeof showEmailToStudents === 'boolean' && { showEmailToStudents })
      }
    });

    res.status(200).json({ message: "Profile updated!", profile: updatedProfile });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error updating profile." });
  }
};
// Fetch all students with pagination (Public Route)
const getAllStudentsPaginated = async (req, res) => {
  try {
    // Get the page number from the URL (default to page 1)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 9; // Number of students per page
    const skip = (page - 1) * limit; // Calculate how many records to skip

    // 1. Count total students to calculate how many pages we have
    const where = { user: { accountStatus: 'ACTIVE' } };
    const totalStudents = await prisma.studentProfile.count({ where });

    // 2. Fetch the chunk of 9 students for the current page
    const students = await prisma.studentProfile.findMany({
      where,
      skip: skip,
      take: limit,
      include: {
        skills: {
          include: { skill: true }
        }
      },
      orderBy: { id: 'desc' } // Show the newest registered students first
    });

    // 3. Send the data and pagination details back to the frontend
    res.status(200).json({
      students: students.map(publicTalentProfile),
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: page,
      totalStudents
    });
  } catch (error) {
    console.error("Get All Students Error:", error);
    res.status(500).json({ message: "Server error fetching talent." });
  }
};

// A CV carries a home address and a phone number, so the link to it never
// goes out on an endpoint anyone can call. Companies reach it through the
// candidate and application screens, which require signing in, and the owner
// sees it on their own dashboard.
// Same idea for the owner's own view, except they are told a CV is on file so
// the dashboard can offer the button that fetches a link for it.
function withResumeFlag(profile) {
  const { resumeUrl, ...rest } = profile;
  return { ...rest, hasResume: Boolean(resumeUrl) };
}

// Fetch a single student's public profile by StudentProfile id (Public Route)
const getStudentById = async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: Number(req.params.id), user: { accountStatus: 'ACTIVE' } },
      include: {
        skills: { include: { skill: true } },
        customSkills: { where: { isApproved: true } },
        user: { select: { id: true, accountStatus: true } }
      }
    });

    if (!profile || (profile.user?.accountStatus && profile.user.accountStatus !== 'ACTIVE')) {
      return res.status(404).json({ message: "Talent profile not found." });
    }

    // Email is intentionally omitted — contact happens through the in-app messaging system.
    const { user, ...publicProfile } = profile;
    res.status(200).json({ ...publicTalentProfile(publicProfile), userId: user.id });
  } catch (error) {
    console.error("Get Student By Id Error:", error);
    res.status(500).json({ message: "Server error fetching talent profile." });
  }
};

// Upload/replace the student's profile photo. The file arrives in memory
// (req.file.buffer) and is forwarded to Supabase Storage for persistence.
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No photo file was uploaded." });
    }

    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!existingProfile) {
      return res.status(404).json({ message: "Please create your profile before uploading a photo." });
    }

    const key = storageKey('student-photos', 'user', req.user.id, req.file.mimetype, req.file.originalname);
    let photoUrl;
    try {
      photoUrl = await uploadToStorage(req.file.buffer, key, req.file.mimetype);
    } catch (uploadError) {
      if (uploadError.message === 'STORAGE_NOT_CONFIGURED') {
        return res.status(503).json({ message: "File storage isn't set up on this server yet." });
      }
      throw uploadError;
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: { photoUrl }
    });

    deleteFromStorageUrl(existingProfile.photoUrl).catch(() => {});

    res.status(200).json({ message: "Photo uploaded!", photoUrl: updatedProfile.photoUrl });
  } catch (error) {
    console.error("Upload Profile Photo Error:", error);
    res.status(500).json({ message: "Server error uploading photo." });
  }
};

// Upload/replace the student's optional profile resume/CV.
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No resume file was uploaded." });
    }

    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!existingProfile) {
      return res.status(404).json({ message: "Please create your profile before uploading a resume." });
    }

    const key = storageKey('resumes', 'resume', req.user.id, req.file.mimetype, req.file.originalname);
    let resumeUrl;
    try {
      resumeUrl = await uploadPrivate(req.file.buffer, key, req.file.mimetype);
    } catch (uploadError) {
      if (uploadError.message === 'STORAGE_NOT_CONFIGURED') {
        return res.status(503).json({ message: "File storage isn't set up on this server yet." });
      }
      throw uploadError;
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: { resumeUrl }
    });

    deleteStoredFile(existingProfile.resumeUrl).catch(() => {});

    res.status(200).json({ message: "Resume uploaded!", hasResume: Boolean(updatedProfile.resumeUrl) });
  } catch (error) {
    console.error("Upload Resume Error:", error);
    res.status(500).json({ message: "Server error uploading resume." });
  }
};

// Remove the optional profile resume/CV.
const removeResume = async (req, res) => {
  try {
    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!existingProfile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    deleteStoredFile(existingProfile.resumeUrl).catch(() => {});

    await prisma.studentProfile.update({ where: { userId: req.user.id }, data: { resumeUrl: null } });
    res.status(200).json({ message: "Resume removed." });
  } catch (error) {
    console.error("Remove Resume Error:", error);
    res.status(500).json({ message: "Server error removing resume." });
  }
};

// Hands back a link to someone's CV that works for a quarter of an hour,
// and only to a person allowed to read it. This is the only way a CV leaves
// the server: the file itself sits in a bucket with no public access.
const getResumeLink = async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: Number(req.params.id) },
      select: { resumeUrl: true, userId: true }
    });
    if (!profile || !profile.resumeUrl) {
      return res.status(404).json({ message: "No CV on file." });
    }

    if (!(await canViewTalentResume(req.user, profile.userId))) {
      // Deliberately the same answer as "no CV", so this can't be used to
      // find out who has one.
      return res.status(404).json({ message: "No CV on file." });
    }

    // Files uploaded before the private bucket existed are still full public
    // URLs; they are handed back as they are until the migration moves them.
    if (!isStoredPath(profile.resumeUrl)) {
      return res.status(200).json({ url: profile.resumeUrl, legacy: true });
    }

    const url = await signedUrlFor(profile.resumeUrl);
    res.status(200).json({ url, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    if (error.message === 'STORAGE_NOT_CONFIGURED') {
      return res.status(503).json({ message: "File storage isn't set up on this server yet." });
    }
    console.error("Resume Link Error:", error);
    res.status(500).json({ message: "Server error preparing the CV link." });
  }
};

module.exports = {
  createStudentProfile,
  getStudentProfile,
  getStudentById,
  updateStudentProfile,
  getAllStudentsPaginated,
  uploadProfilePhoto,
  uploadResume,
  removeResume,
  getResumeLink
};
