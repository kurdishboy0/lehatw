function publicTalentProfile(profile) {
  const { resumeUrl, user, ...publicProfile } = profile;
  if (Array.isArray(publicProfile.customSkills)) {
    publicProfile.customSkills = publicProfile.customSkills.filter(skill => skill.isApproved === true);
  }
  return publicProfile;
}

module.exports = { publicTalentProfile };
