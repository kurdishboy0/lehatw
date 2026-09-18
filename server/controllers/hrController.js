const prisma = require('../db');
const { notifyAdmins } = require('../utils/notify');

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

    // A rejected company that fixes its details goes back into the review queue
    // rather than staying rejected forever.
    const resubmitting = existingProfile.status === 'REJECTED';

    const updatedProfile = await prisma.hRProfile.update({
      where: { userId: req.user.id },
      data: {
        companyName,
        industry,
        jobTitle,
        crNumber,
        ...(resubmitting && { status: 'PENDING', rejectionReason: null })
      }
    });

    if (resubmitting) {
      notifyAdmins({
        type: 'HR_PENDING',
        title: 'Company resubmitted for approval',
        body: `${updatedProfile.companyName} updated their details after being rejected.`,
        link: '/admin-dashboard?tab=approvals'
      });
    }

    res.status(200).json({ message: resubmitting ? "Company profile updated and resubmitted for review." : "Company profile updated!", profile: updatedProfile, resubmitted: resubmitting });
  } catch (error) {
    console.error("Update HR Profile Error:", error);
    res.status(500).json({ message: "Server error updating HR profile." });
  }
};

// Export all three functions
module.exports = { createHRProfile, getHRProfile, updateHRProfile };