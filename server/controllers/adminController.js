const prisma = require('../db');

// 1. View all PENDING HR profiles
const getPendingHRProfiles = async (req, res) => {
  try {
    const pendingProfiles = await prisma.hRProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { email: true } } } // Pulls the user's email too!
    });
    res.status(200).json(pendingProfiles);
  } catch (error) {
    console.error("Fetch Pending HR Error:", error);
    res.status(500).json({ message: "Server error fetching profiles." });
  }
};

// 2. Approve (or Reject) an HR profile
const updateHRStatus = async (req, res) => {
  try {
    // The ID of the HR profile will be in the URL (e.g., /api/admin/hr/1)
    const { id } = req.params; 
    const { status } = req.body; // Expects "APPROVED" or "REJECTED"

    const updatedProfile = await prisma.hRProfile.update({
      where: { id: parseInt(id) },
      data: { status: status }
    });

    res.status(200).json({ 
      message: `HR Profile has been ${status}!`, 
      profile: updatedProfile 
    });
  } catch (error) {
    console.error("Update HR Status Error:", error);
    res.status(500).json({ message: "Server error updating status." });
  }
};

// 3. View all pending (unapproved) custom skills submitted by students
const getPendingCustomSkills = async (req, res) => {
  try {
    const pendingSkills = await prisma.customSkill.findMany({
      where: { isApproved: false },
      include: { studentProfile: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(pendingSkills);
  } catch (error) {
    console.error("Fetch Pending Custom Skills Error:", error);
    res.status(500).json({ message: "Server error fetching pending skills." });
  }
};

// 4. Approve or reject a custom skill. Approving marks it approved; rejecting removes it.
const reviewCustomSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // expects boolean

    if (approve) {
      const updated = await prisma.customSkill.update({
        where: { id: parseInt(id) },
        data: { isApproved: true }
      });
      return res.status(200).json({ message: "Custom skill approved!", skill: updated });
    }

    await prisma.customSkill.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ message: "Custom skill rejected and removed." });
  } catch (error) {
    console.error("Review Custom Skill Error:", error);
    res.status(500).json({ message: "Server error reviewing custom skill." });
  }
};

module.exports = { getPendingHRProfiles, updateHRStatus, getPendingCustomSkills, reviewCustomSkill };