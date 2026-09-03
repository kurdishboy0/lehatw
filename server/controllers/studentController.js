const fs = require('fs');
const path = require('path');
const prisma = require('../db');
const { PHOTOS_DIR, RESUMES_DIR } = require('../middleware/upload');

const createStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { fullName, university, fieldOfStudy, graduationYear, bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl } = req.body;

    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: userId } });
    if (existingProfile) {
      return res.status(400).json({ message: "You already have a profile!" });
    }

    const newProfile = await prisma.studentProfile.create({
      data: { userId, fullName, university, fieldOfStudy, graduationYear, bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl }
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

    res.status(200).json(profile);
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
      bio, photoUrl, portfolioUrl, linkedinUrl, githubUrl, huggingFaceUrl 
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
        huggingFaceUrl
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
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // Number of students per page
    const skip = (page - 1) * limit; // Calculate how many records to skip

    // 1. Count total students to calculate how many pages we have
    const totalStudents = await prisma.studentProfile.count();

    // 2. Fetch the chunk of 9 students for the current page
    const students = await prisma.studentProfile.findMany({
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
      students,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: page,
      totalStudents
    });
  } catch (error) {
    console.error("Get All Students Error:", error);
    res.status(500).json({ message: "Server error fetching students." });
  }
};

// Fetch a single student's public profile by StudentProfile id (Public Route)
const getStudentById = async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        skills: { include: { skill: true } },
        customSkills: true,
        user: { select: { id: true } }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    // Email is intentionally omitted — contact happens through the in-app messaging system.
    const { user, ...publicProfile } = profile;
    res.status(200).json({ ...publicProfile, userId: user.id });
  } catch (error) {
    console.error("Get Student By Id Error:", error);
    res.status(500).json({ message: "Server error fetching student profile." });
  }
};

// Upload/replace the student's profile photo. Expects multer to have already
// placed the file on disk (req.file) before this runs.
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No photo file was uploaded." });
    }

    const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!existingProfile) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Please create your profile before uploading a photo." });
    }

    const photoUrl = `/uploads/student-photos/${req.file.filename}`;

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: { photoUrl }
    });

    // Best-effort cleanup of the previous photo file, if any.
    if (existingProfile.photoUrl && existingProfile.photoUrl.includes('/uploads/student-photos/')) {
      const oldFilename = existingProfile.photoUrl.split('/uploads/student-photos/')[1];
      if (oldFilename) {
        fs.unlink(path.join(PHOTOS_DIR, oldFilename), () => {});
      }
    }

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
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Please create your profile before uploading a resume." });
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: { resumeUrl }
    });

    if (existingProfile.resumeUrl && existingProfile.resumeUrl.includes('/uploads/resumes/')) {
      const oldFilename = existingProfile.resumeUrl.split('/uploads/resumes/')[1];
      if (oldFilename) {
        fs.unlink(path.join(RESUMES_DIR, oldFilename), () => {});
      }
    }

    res.status(200).json({ message: "Resume uploaded!", resumeUrl: updatedProfile.resumeUrl });
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

    if (existingProfile.resumeUrl && existingProfile.resumeUrl.includes('/uploads/resumes/')) {
      const oldFilename = existingProfile.resumeUrl.split('/uploads/resumes/')[1];
      if (oldFilename) {
        fs.unlink(path.join(RESUMES_DIR, oldFilename), () => {});
      }
    }

    await prisma.studentProfile.update({ where: { userId: req.user.id }, data: { resumeUrl: null } });
    res.status(200).json({ message: "Resume removed." });
  } catch (error) {
    console.error("Remove Resume Error:", error);
    res.status(500).json({ message: "Server error removing resume." });
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
  removeResume
};