const prisma = require('../db');

const createHRProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { companyName, industry, jobTitle, crNumber } = req.body;

    // 1. Check if they already submitted an HR profile
    const existingProfile = await prisma.hRProfile.findUnique({
      where: { userId: userId }
    });

    if (existingProfile) {
      return res.status(400).json({ message: "You have already submitted an HR profile!" });
    }

    // 2. Create the HR Profile (Status defaults to PENDING automatically)
    const newProfile = await prisma.hRProfile.create({
      data: {
        userId,
        companyName,
        industry,
        jobTitle,
        crNumber
      }
    });

    res.status(201).json({ 
      message: "HR Profile submitted successfully! Waiting for Admin approval.", 
      profile: newProfile 
    });

  } catch (error) {
    console.error("HR Profile Creation Error:", error);
    res.status(500).json({ message: "Server error creating HR profile." });
  }
};

// NEW: Get the HR profile for the dashboard
const getHRProfile = async (req, res) => {
  try {
    const profile = await prisma.hRProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ message: "HR Profile not found." });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Get HR Profile Error:", error);
    res.status(500).json({ message: "Server error fetching HR profile." });
  }
};

// NEW: Update the HR profile
const updateHRProfile = async (req, res) => {
  try {
    const existingProfile = await prisma.hRProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingProfile) {
      return res.status(404).json({ message: "HR Profile not found." });
    }

    // Extract only the fields we want to allow updating
    const { companyName, industry, jobTitle, crNumber } = req.body;

    const updatedProfile = await prisma.hRProfile.update({
      where: { userId: req.user.id },
      data: {
        companyName,
        industry,
        jobTitle,
        crNumber
      }
    });

    res.status(200).json({ message: "Company profile updated!", profile: updatedProfile });
  } catch (error) {
    console.error("Update HR Profile Error:", error);
    res.status(500).json({ message: "Server error updating HR profile." });
  }
};

// Export all three functions
module.exports = { createHRProfile, getHRProfile, updateHRProfile };