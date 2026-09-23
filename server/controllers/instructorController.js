const prisma = require('../db');
const { notifyAdmins } = require('../utils/notify');

const MAX = { fullName: 120, headline: 160, bio: 2000, expertise: 500, url: 300, phone: 30 };
const clean = (value, max) => {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// The signed-in instructor's own profile, including why they were rejected.
const getMyProfile = async (req, res) => {
  try {
    const profile = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Instructor profile not found.' });
    res.status(200).json(profile);
  } catch (error) {
    console.error('Get Instructor Profile Error:', error);
    res.status(500).json({ message: 'Server error loading your profile.' });
  }
};

// Editing a rejected profile sends it back for review, the same way a
// rejected company resubmits.
const updateMyProfile = async (req, res) => {
  try {
    const existing = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id } });
    if (!existing) return res.status(404).json({ message: 'Instructor profile not found.' });

    const fullName = clean(req.body.fullName, MAX.fullName);
    if (!fullName) return res.status(400).json({ message: 'Please enter your full name.' });
    const resubmitting = existing.status === 'REJECTED';

    const profile = await prisma.instructorProfile.update({
      where: { userId: req.user.id },
      data: {
        fullName,
        headline: clean(req.body.headline, MAX.headline),
        bio: clean(req.body.bio, MAX.bio),
        expertise: clean(req.body.expertise, MAX.expertise),
        website: clean(req.body.website, MAX.url),
        linkedinUrl: clean(req.body.linkedinUrl, MAX.url),
        phone: clean(req.body.phone, MAX.phone),
        ...(resubmitting && { status: 'PENDING', rejectionReason: null })
      }
    });

    if (resubmitting) {
      notifyAdmins({
        type: 'INSTRUCTOR_PENDING',
        title: 'Instructor resubmitted for review',
        body: `${profile.fullName} updated their details after being rejected.`,
        link: '/admin-dashboard?tab=approvals'
      });
    }
    res.status(200).json({ message: resubmitting ? 'Profile updated and sent for review again.' : 'Profile updated.', profile, resubmitted: resubmitting });
  } catch (error) {
    console.error('Update Instructor Profile Error:', error);
    res.status(500).json({ message: 'Server error saving your profile.' });
  }
};

module.exports = { getMyProfile, updateMyProfile };
