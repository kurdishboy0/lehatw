import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import { toLocalizedDigits } from '../localizeDigits';
import { GraduationCap, Camera, Pencil, School, BookOpen, Link2, FileText, Puzzle, Sparkles, Check, ArrowRight, Handshake, Mail, MessageSquare, Lock, ClipboardList } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';
import CvLink from '../components/CvLink';

const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Expert'];
// Mirrors server/utils/skillText.js's validation: letters (any language), numbers,
// spaces, and a small set of punctuation seen in real skill names.
const CUSTOM_SKILL_REGEX = /^[\p{L}\p{N}\s\-.&/+#()]+$/u;

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const sectionHeadingStyle = {
  margin: '0 0 16px 0', fontSize: '16px', color: '#1a202c',
  paddingBottom: '10px', borderBottom: '2px solid #ebf4ff'
};

const inputStyle = { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', width: '100%', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' };

function initials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

function MetaRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <InlineIcon icon={icon} size={18} tone="gold" style={{ marginTop: '2px' }} />
      <div>
        <div style={{ fontSize: '13px', color: '#718096', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: '15px', color: '#2d3748', fontWeight: '600', marginTop: '2px' }}>{value}</div>
      </div>
    </div>
  );
}

function localizedCategoryName(cat, lang) {
  if (lang === 'ar') return cat.name_ar;
  if (lang === 'ckb') return cat.name_ckb;
  return cat.name_en;
}

// Levenshtein edit distance, used to suggest the nearest real skill when a
// student's typed custom skill looks like a typo of one already in the catalog.
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Finds the closest skill name to `input` among `allSkillNames`, if it's close
// enough to plausibly be a typo (small edit distance relative to word length).
function findNearestSkill(input, allSkillNames) {
  const target = input.trim().toLowerCase();
  if (target.length < 3) return null;

  let best = null;
  let bestDistance = Infinity;
  for (const name of allSkillNames) {
    const candidate = name.toLowerCase();
    if (candidate === target) return null; // exact match — no suggestion needed
    const distance = editDistance(target, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }

  const threshold = target.length <= 5 ? 1 : 2;
  return bestDistance <= threshold ? best : null;
}

function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [searchParams] = useSearchParams();
  // Deep-link support from the user menu: ?edit=1 or ?section=skills opens the edit form on load.
  const [isEditing, setIsEditing] = useState(() => {
    const section = searchParams.get('section');
    return searchParams.get('edit') === '1' || section === 'skills';
  });

  const [formData, setFormData] = useState({
    fullName: '',
    university: '',
    fieldOfStudy: '',
    graduationYear: '',
    bio: '',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    showEmailToStudents: false
  });

  // --- NEW SKILLS STATE ---
  const [categories, setCategories] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]); // Format: [{ skillId: 1, proficiency: 'Intermediate' }]
  const [customSkills, setCustomSkills] = useState([]);     // Format: ['MedSAM2', 'TensorFlow']
  const [customInput, setCustomInput] = useState('');
  const [expandedAreas, setExpandedAreas] = useState({});
  const [skillSearch, setSkillSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState(null);
  const [peers, setPeers] = useState(null);
  const [myCourses, setMyCourses] = useState(null);
  const [courseSuggestions, setCourseSuggestions] = useState(null);
  const [privacySaving, setPrivacySaving] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  // A brand-new student has no profile row yet, so the upload endpoints (which
  // require one) would reject the file. We hold onto it here and upload it
  // automatically right after the profile is created in handleSubmit.
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);

  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const resumeInputRef = useRef(null);
  const [pendingResumeFile, setPendingResumeFile] = useState(null);

  const navigate = useNavigate();
  const skillsSectionRef = useRef(null);
  const applicationsSectionRef = useRef(null);

  const proficiencyLabel = (level) => t(`studentDashboard.proficiency_${level.toLowerCase()}`);

  // Top job recommendations and peers for the dashboard. Loaded once the
  // profile exists, since both depend on the student's skills.
  useEffect(() => {
    if (!profile?.id) return;
    const config = { headers: authHeader() };
    Promise.all([axios.get('/api/jobs/matches/mine', config), axios.get('/api/jobs')])
      .then(([matchRes, jobsRes]) => {
        const { matches, appliedJobIds } = matchRes.data;
        setRecommendedJobs(jobsRes.data
          .filter((j) => matches[j.id]?.matched > 0)
          .map((j) => ({ ...j, match: matches[j.id], applied: appliedJobIds.includes(j.id) }))
          .sort((a, b) => (b.match.percent - a.match.percent) || (b.match.proficiency - a.match.proficiency))
          .slice(0, 3));
      })
      .catch(() => setRecommendedJobs([]));
    axios.get('/api/match/similar', config)
      .then((res) => setPeers(res.data.matches.slice(0, 3)))
      .catch(() => setPeers([]));
    axios.get('/api/courses/mine', config)
      .then((res) => setMyCourses(res.data))
      .catch(() => setMyCourses([]));
    axios.get('/api/courses/recommended', config)
      .then((res) => setCourseSuggestions(res.data.recommendations.slice(0, 3)))
      .catch(() => setCourseSuggestions([]));
  }, [profile?.id]);

  // Saves the email privacy switch straight away from the profile view.
  const togglePrivacy = async (checked) => {
    // Flip the switch right away; put it back if the save fails.
    const setFlag = (value) => {
      setProfile((prev) => ({ ...prev, showEmailToStudents: value }));
      setFormData((prev) => ({ ...prev, showEmailToStudents: value }));
    };
    setFlag(checked);
    setPrivacySaving(true);
    try {
      await axios.put('/api/student/profile', { ...formData, showEmailToStudents: checked }, { headers: authHeader() });
    } catch (err) {
      setFlag(!checked);
      setError(err.response?.data?.message || t('studentDashboard.error_save'));
    } finally {
      setPrivacySaving(false);
    }
  };

  // 1. Fetch Profile AND Skills when page loads
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      try {
        const appsRes = await axios.get('/api/applications/mine', config);
        setApplications(appsRes.data);
      } catch (err) {
        console.error("Failed to load applications:", err);
      }

      try {
        // A. Always fetch the master skill categories
        const skillsRes = await axios.get('/api/skills', config);
        setCategories(skillsRes.data);

        // B. Try to fetch the user's profile
        try {
          const profileRes = await axios.get('/api/student/profile', config);
          const profileData = profileRes.data;

          setProfile(profileData);
          setFormData({
            fullName: profileData.fullName || '',
            university: profileData.university || '',
            fieldOfStudy: profileData.fieldOfStudy || '',
            graduationYear: profileData.graduationYear || '',
            bio: profileData.bio || '',
            portfolioUrl: profileData.portfolioUrl || '',
            linkedinUrl: profileData.linkedinUrl || '',
            githubUrl: profileData.githubUrl || '',
            showEmailToStudents: Boolean(profileData.showEmailToStudents)
          });

          // Pre-load their saved standard skills
          if (profileData.skills) {
            setSelectedSkills(profileData.skills.map(s => ({
              skillId: s.skillId,
              proficiency: s.proficiency || 'Intermediate'
            })));

            // Auto-expand the subject areas the student already has skills in,
            // so returning to edit their profile doesn't hide their own selections.
            const areasToExpand = {};
            profileData.skills.forEach(s => {
              const subjectAreaId = s.skill?.category?.subjectAreaId;
              if (subjectAreaId) areasToExpand[subjectAreaId] = true;
            });
            setExpandedAreas(areasToExpand);
          }

          // Pre-load their saved custom skills
          if (profileData.customSkills) {
            setCustomSkills(profileData.customSkills.map(cs => cs.name));
          }
        } catch (profileErr) {
          // If 404, it just means they haven't created a profile yet. That's okay!
          if (profileErr.response?.status !== 404) {
            setError(t('studentDashboard.error_load_profile'));
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setError(t('studentDashboard.error_load'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [navigate]);

  // Deep-link support from the user menu: ?section=skills / ?section=applications scrolls to that section.
  useEffect(() => {
    if (loading) return;
    const section = searchParams.get('section');
    if (section === 'skills') {
      setTimeout(() => skillsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (section === 'applications') {
      setTimeout(() => applicationsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [loading, searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- PHOTO UPLOAD ---
  const uploadPhotoFile = async (file) => {
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await axios.post('/api/student/profile/photo', form, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setProfile((prev) => (prev ? { ...prev, photoUrl: res.data.photoUrl } : prev));
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview);
      setPendingPhotoFile(null);
      setPendingPhotoPreview(null);
    } catch (err) {
      setPhotoError(err.response?.data?.message || t('studentDashboard.error_upload_photo'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    // No profile row exists yet — hold the file and upload it once the
    // profile is created in handleSubmit, instead of letting the server 404.
    if (!profile) {
      setPhotoError('');
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview);
      setPendingPhotoFile(file);
      setPendingPhotoPreview(URL.createObjectURL(file));
      return;
    }

    await uploadPhotoFile(file);
  };

  // --- RESUME/CV UPLOAD (optional; auto-attaches to job applications) ---
  const uploadResumeFile = async (file) => {
    setResumeError('');
    setUploadingResume(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await axios.post('/api/student/profile/resume', form, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setProfile((prev) => (prev ? { ...prev, hasResume: res.data.hasResume } : prev));
      setPendingResumeFile(null);
    } catch (err) {
      setResumeError(err.response?.data?.message || t('studentDashboard.error_upload_resume'));
    } finally {
      setUploadingResume(false);
    }
  };

  const handleResumeSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!profile) {
      setResumeError('');
      setPendingResumeFile(file);
      return;
    }

    await uploadResumeFile(file);
  };

  const handleRemoveResume = async () => {
    setResumeError('');
    try {
      await axios.delete('/api/student/profile/resume', { headers: authHeader() });
      setProfile((prev) => (prev ? { ...prev, hasResume: false } : prev));
    } catch (err) {
      setResumeError(err.response?.data?.message || t('studentDashboard.error_remove_resume'));
    }
  };

  // --- NEW SKILL HANDLERS ---
  const toggleSkill = (skillId) => {
    const exists = selectedSkills.find(s => s.skillId === skillId);
    if (exists) {
      setSelectedSkills(selectedSkills.filter(s => s.skillId !== skillId)); // Uncheck
    } else {
      setSelectedSkills([...selectedSkills, { skillId, proficiency: 'Intermediate' }]); // Check
      // Keep the skill's subject area expanded so it stays visible after clearing a search.
      const ownerCategory = categories.find(cat => cat.skills.some(sk => sk.id === skillId));
      if (ownerCategory?.subjectArea) {
        setExpandedAreas(prev => ({ ...prev, [ownerCategory.subjectArea.id]: true }));
      }
    }
  };

  const updateProficiency = (skillId, level) => {
    setSelectedSkills(selectedSkills.map(s => (s.skillId === skillId ? { ...s, proficiency: level } : s)));
  };

  const toggleArea = (areaId) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  // Group the flat category list into { area, categories } buckets by Subject Area,
  // so the skill picker doesn't render 200+ checkboxes flat on one page.
  const groupedBySubjectArea = useMemo(() => {
    const map = new Map();
    categories.forEach(cat => {
      const area = cat.subjectArea || { id: 'other', name_en: 'Other', name_ar: 'أخرى', name_ckb: 'تر' };
      if (!map.has(area.id)) map.set(area.id, { area, categories: [] });
      map.get(area.id).categories.push(cat);
    });
    return Array.from(map.values());
  }, [categories]);

  const selectedCountInCategory = (cat) => cat.skills.filter(sk => selectedSkills.some(s => s.skillId === sk.id)).length;
  const selectedCountInArea = (areaCategories) => areaCategories.reduce((sum, cat) => sum + selectedCountInCategory(cat), 0);

  // Flat list of every catalog skill, used for exact-match folding and typo suggestions.
  const allSkills = useMemo(() => categories.flatMap(cat => cat.skills), [categories]);

  // If what they're typing looks like a typo of a real skill, suggest it instead
  // of letting them create a near-duplicate custom entry.
  const nearestSkillSuggestion = useMemo(() => {
    const name = findNearestSkill(customInput, allSkills.map(s => s.name_en));
    return name ? allSkills.find(s => s.name_en === name) : null;
  }, [customInput, allSkills]);

  // When searching, skip the accordion entirely and show only matching skills across all categories.
  const skillSearchResults = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    if (!query) return null;
    return categories
      .map(cat => ({ ...cat, skills: cat.skills.filter(sk => sk.name_en.toLowerCase().includes(query)) }))
      .filter(cat => cat.skills.length > 0);
  }, [categories, skillSearch]);

  // Mirrors the server-side character/length rules, so a bad entry is caught
  // immediately instead of round-tripping to the API first.
  const isValidSkillText = (name) => name.length >= 2 && name.length <= 50 && CUSTOM_SKILL_REGEX.test(name);

  const addSkillSelection = (skillId) => {
    if (selectedSkills.some(s => s.skillId === skillId)) return;
    setSelectedSkills(prev => [...prev, { skillId, proficiency: 'Intermediate' }]);
    const ownerCategory = categories.find(cat => cat.skills.some(sk => sk.id === skillId));
    if (ownerCategory?.subjectArea) {
      setExpandedAreas(prev => ({ ...prev, [ownerCategory.subjectArea.id]: true }));
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = customInput.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    if (!isValidSkillText(trimmed)) {
      setError(t('studentDashboard.error_invalid_skill_chars'));
      return;
    }
    setError('');

    // Exact case-insensitive match to a real skill: select it instead of creating
    // a near-duplicate custom tag (e.g. typing "python" when "Python" exists).
    const exactMatch = allSkills.find(s => s.name_en.toLowerCase() === trimmed.toLowerCase());
    if (exactMatch) {
      addSkillSelection(exactMatch.id);
      setCustomInput('');
      return;
    }

    if (!customSkills.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCustomSkills([...customSkills, trimmed]);
    }
    setCustomInput('');
  };

  const handleUseSuggestedSkill = () => {
    if (!nearestSkillSuggestion) return;
    addSkillSelection(nearestSkillSuggestion.id);
    setCustomInput('');
  };

  const handleRemoveCustomSkill = (skillName) => {
    setCustomSkills(customSkills.filter(name => name !== skillName));
  };

  // 3. Submit the form (Profile + Skills)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Step 1: Save the Profile Details
      if (profile) {
        // UPDATE (PUT)
        await axios.put('/api/student/profile', formData, config);
      } else {
        // CREATE (POST)
        const dataToSubmit = { ...formData, graduationYear: parseInt(formData.graduationYear) };
        await axios.post('/api/student/profile', dataToSubmit, config);
      }

      // Step 2: Save the Skills (Only works if they have a profile now)
      await axios.post(
        '/api/skills/save',
        { standardSkills: selectedSkills, customSkills },
        config
      );

      // Step 3: A photo/resume picked before the profile existed can only be
      // uploaded now that it does.
      if (pendingPhotoFile) await uploadPhotoFile(pendingPhotoFile);
      if (pendingResumeFile) await uploadResumeFile(pendingResumeFile);

      // Step 4: Refresh local data to show the updates
      const refreshedProfile = await axios.get('/api/student/profile', config);
      setProfile(refreshedProfile.data);

      setMessage(t('studentDashboard.success_save'));
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || t('studentDashboard.error_save'));
    }
  };

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('studentDashboard.loading')}</h3>;

  const avatar = (size) => (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {pendingPhotoPreview || profile?.photoUrl ? (
        <img
          src={pendingPhotoPreview || profile.photoUrl}
          alt={profile?.fullName || formData.fullName}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 0 0 1px #e2e8f0' }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%', backgroundColor: '#3182ce', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.6, fontWeight: 'bold',
          border: '3px solid white', boxShadow: '0 0 0 1px #e2e8f0'
        }}>
          {initials(formData.fullName) || <InlineIcon icon={GraduationCap} size={34} />}
        </div>
      )}
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        disabled={uploadingPhoto}
        title={t('studentDashboard.change_photo')}
        style={{
          position: 'absolute', bottom: 0, insetInlineEnd: 0, width: '30px', height: '30px', borderRadius: '50%',
          backgroundColor: '#2d3748', color: 'white', border: '2px solid white', cursor: uploadingPhoto ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
        }}
      >
        {uploadingPhoto ? '…' : <InlineIcon icon={Camera} size={15} />}
      </button>
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
    </div>
  );

  const renderCategoryBlock = (cat) => (
    <div key={cat.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', backgroundColor: '#f8fafc' }}>
      <h5 style={{ margin: '0 0 10px 0', color: '#334155' }}>{localizedCategoryName(cat, i18n.language)}</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cat.skills.map(skill => {
          const selected = selectedSkills.find(s => s.skillId === skill.id);
          return (
            <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: '180px' }}>
                <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleSkill(skill.id)} />
                <span>{skill.name_en}</span>
              </label>
              {selected && (
                <select value={selected.proficiency} onChange={(e) => updateProficiency(skill.id, e.target.value)} style={{ padding: '4px', borderRadius: '4px' }}>
                  {PROFICIENCY_LEVELS.map(level => (
                    <option key={level} value={level}>{proficiencyLabel(level)}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '760px', margin: '30px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ margin: 0 }}><InlineIcon icon={GraduationCap} size={22} tone="gold" /> {t('studentDashboard.heading')}</h2>

      {message && <p style={{ color: 'green', fontWeight: 'bold', margin: 0 }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold', margin: 0 }}>{error}</p>}
      {photoError && <p style={{ color: 'red', fontWeight: 'bold', margin: 0 }}>{photoError}</p>}

      {/* VIEW MODE */}
      {profile && !isEditing ? (
        <>
          {/* PROFILE HEADER */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {avatar(88)}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#1a202c' }}>{profile.fullName}</h1>
                <div style={{ color: '#718096', fontSize: '15px' }}>{profile.university} · {profile.fieldOfStudy}</div>
                {uploadingPhoto && <div style={{ fontSize: '13px', color: '#a0aec0', marginTop: '4px' }}>{t('studentDashboard.uploading_photo')}</div>}
              </div>
              <button onClick={() => setIsEditing(true)} style={{ padding: '9px 18px', cursor: 'pointer', backgroundColor: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', fontSize: '14px' }}>
                <InlineIcon icon={Pencil} size={14} /> {t('studentDashboard.edit_profile')}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '18px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #edf2f7' }}>
              <MetaRow icon={School} label={t('studentDashboard.university_label')} value={profile.university} />
              <MetaRow icon={BookOpen} label={t('studentDashboard.major_label')} value={profile.fieldOfStudy} />
              <MetaRow icon={GraduationCap} label={t('studentDashboard.class_of_label')} value={profile.graduationYear} />
            </div>

            {profile.bio && (
              <p style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #edf2f7', color: '#4a5568', fontSize: '15px', lineHeight: '1.7' }}>{profile.bio}</p>
            )}

            {(profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl || profile.hasResume) && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: '600', color: '#3182ce', textDecoration: 'none', backgroundColor: '#ebf8ff', padding: '6px 14px', borderRadius: '20px' }}><InlineIcon icon={Link2} size={14} /> LinkedIn</a>}
                {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: '600', color: '#3182ce', textDecoration: 'none', backgroundColor: '#ebf8ff', padding: '6px 14px', borderRadius: '20px' }}><InlineIcon icon={Link2} size={14} /> GitHub</a>}
                {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: '600', color: '#3182ce', textDecoration: 'none', backgroundColor: '#ebf8ff', padding: '6px 14px', borderRadius: '20px' }}><InlineIcon icon={Link2} size={14} /> Portfolio</a>}
                {profile.hasResume && (
                  <CvLink
                    endpoint={`/api/student/${profile.id}/resume`}
                    label={t('studentDashboard.view_resume')}
                    style={{ fontSize: '14px', fontWeight: '600', color: '#2f855a', textDecoration: 'none', backgroundColor: '#f0fff4', padding: '6px 14px', borderRadius: '20px' }}
                  />
                )}
              </div>
            )}
          </div>

          {/* SKILLS */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle} ref={skillsSectionRef}><InlineIcon icon={Puzzle} size={18} tone="gold" /> {t('studentDashboard.my_skills_heading')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((item) => (
                  <span key={item.id} style={{ backgroundColor: '#e7f3ff', color: '#0056b3', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', border: '1px solid #b8daff' }}>
                    <strong>{item.skill.name_en}</strong> <span style={{ fontSize: '12px', color: '#666' }}>({proficiencyLabel(item.proficiency)})</span>
                  </span>
                ))
              ) : (
                <p style={{ color: '#a0aec0', fontSize: '15px', width: '100%', margin: 0 }}>{t('studentDashboard.no_standard_skills')}</p>
              )}

              {profile.customSkills && profile.customSkills.map((cs) => (
                <span key={cs.id} style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', border: '1px solid #ffeeba' }}>
                  {cs.name} <em>{t('studentDashboard.custom_label')}</em>
                </span>
              ))}
            </div>
          </div>

          {/* APPLICATIONS */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle} ref={applicationsSectionRef}><InlineIcon icon={FileText} size={18} tone="gold" /> {t('studentDashboard.my_applications_heading')}</h3>
            {applications.length === 0 ? (
              <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>
                {t('studentDashboard.no_applications')} <Link to="/jobs" style={{ color: '#3182ce' }}>{t('studentDashboard.browse_jobs_link')}</Link>.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {applications.map(app => (
                  <div key={app.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#1a202c' }}>{app.jobPost.title}</strong>
                      <div style={{ fontSize: '14px', color: '#718096' }}>{app.jobPost.hrProfile?.companyName}</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#856404', backgroundColor: '#fff3cd', padding: '4px 10px', borderRadius: '12px' }}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECOMMENDED JOBS */}
          <div style={cardStyle} data-section="recommended-jobs">
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Sparkles} size={18} tone="gold" /> {t('studentDashboard.recommended_jobs_heading')}</h3>
            {recommendedJobs === null ? (
              <p style={{ color: '#a0aec0', margin: 0 }}>{t('common.loading')}</p>
            ) : recommendedJobs.length === 0 ? (
              <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>
                {(profile.skills || []).length === 0 ? t('jobs.recommended_no_skills') : t('jobs.recommended_empty')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendedJobs.map((job) => (
                  <div key={job.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/jobs/${job.id}`} style={{ color: '#1a202c', fontWeight: 700, textDecoration: 'none' }}>{job.title}</Link>
                      <div style={{ fontSize: '14px', color: '#718096' }}>{job.hrProfile?.companyName}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', backgroundColor: job.match.percent >= 50 ? '#e6f4ea' : '#fdf6e3', color: job.match.percent >= 50 ? '#276749' : '#8a6d1d' }}>
                        <InlineIcon icon={Check} size={13} /> {t('jobs.match_badge', { matched: toLocalizedDigits(String(job.match.matched), i18n.language), total: toLocalizedDigits(String(job.match.total), i18n.language) })}
                      </span>
                      {job.applied ? (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#276749' }}><InlineIcon icon={Check} size={13} /> {t('jobs.applied')}</span>
                      ) : (
                        <Link to={`/jobs/${job.id}?apply=1`} style={{ padding: '6px 14px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('jobs.apply')}</Link>
                      )}
                    </div>
                  </div>
                ))}
                <Link to="/jobs?tab=recommended" style={{ color: '#3182ce', fontSize: '14px', fontWeight: 600 }}>{t('studentDashboard.see_all_jobs')} <InlineIcon icon={ArrowRight} size={14} className="rtl:rotate-180" /></Link>
              </div>
            )}
          </div>

          {/* MY COURSES */}
          <div style={cardStyle} data-section="my-courses">
            <h3 style={sectionHeadingStyle}><InlineIcon icon={BookOpen} size={18} tone="gold" /> {t('studentDashboard.my_courses_heading')}</h3>
            {myCourses === null ? (
              <p style={{ color: '#a0aec0', margin: 0 }}>{t('common.loading')}</p>
            ) : myCourses.length === 0 ? (
              <div>
                <p style={{ color: '#a0aec0', fontSize: '15px', margin: '0 0 8px 0' }}>{t('studentDashboard.no_courses')}</p>
                <Link to="/courses" style={{ color: '#3182ce', fontSize: '14px', fontWeight: 600 }}>{t('studentDashboard.browse_courses')} <InlineIcon icon={ArrowRight} size={14} className="rtl:rotate-180" /></Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myCourses.map((course) => {
                  const total = course.lessonCount || 0;
                  const done = Math.min(course.completedLessons, total);
                  const percent = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={course.id} data-my-course={course.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <Link to={`/courses/${course.id}`} style={{ color: '#1a202c', fontWeight: 700, textDecoration: 'none' }} dir="auto">{course.title}</Link>
                          <div style={{ fontSize: '14px', color: '#718096' }} dir="auto">{t('courses.by', { name: course.instructor.fullName })}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {course.completedAt ? (
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#276749' }}><InlineIcon icon={Check} size={13} /> {t('studentDashboard.course_finished')}</span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#4a5568' }}>
                              {t('studentDashboard.course_progress', { done: toLocalizedDigits(String(done), i18n.language), total: toLocalizedDigits(String(total), i18n.language) })}
                            </span>
                          )}
                          <Link to={`/courses/${course.id}`} style={{ padding: '6px 14px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('studentDashboard.continue_course')}</Link>
                        </div>
                      </div>
                      {total > 0 && (
                        <div style={{ marginTop: '10px', height: '6px', borderRadius: '3px', backgroundColor: '#edf2f7', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: course.completedAt ? '#38a169' : '#C99A2E' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Link to="/courses" style={{ color: '#3182ce', fontSize: '14px', fontWeight: 600 }}>{t('studentDashboard.browse_courses')} <InlineIcon icon={ArrowRight} size={14} className="rtl:rotate-180" /></Link>
              </div>
            )}
          </div>

          {/* COURSES FOR THE SKILLS THEY ARE MISSING */}
          <div style={cardStyle} data-section="recommended-courses">
            <h3 style={sectionHeadingStyle}><InlineIcon icon={GraduationCap} size={18} tone="gold" /> {t('studentDashboard.recommended_courses_heading')}</h3>
            {courseSuggestions === null ? (
              <p style={{ color: '#a0aec0', margin: 0 }}>{t('common.loading')}</p>
            ) : courseSuggestions.length === 0 ? (
              <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>{t('studentDashboard.no_recommended_courses')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courseSuggestions.map((course) => (
                  <div key={course.id} data-suggested-course={course.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/courses/${course.id}`} style={{ color: '#1a202c', fontWeight: 700, textDecoration: 'none' }} dir="auto">{course.title}</Link>
                        <div style={{ fontSize: '14px', color: '#718096' }} dir="auto">{t('courses.by', { name: course.instructor.fullName })}</div>
                      </div>
                      <Link to={`/courses/${course.id}`} style={{ padding: '6px 14px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('courses.view')}</Link>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '8px', fontSize: '13px' }}>
                      <strong style={{ color: '#1B2A4A' }}><InlineIcon icon={Sparkles} tone="gold" /> {t('courses.recommended_gap')}</strong>
                      {course.reasonSkills.map((sk) => (
                        <span key={sk.id} style={{ padding: '2px 9px', borderRadius: '10px', backgroundColor: '#f0f6ff', border: '1px solid #cfe0f7', color: '#1B2A4A' }}>
                          {sk[`name_${(i18n.language || 'en').split('-')[0]}`] || sk.name_en}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <Link to="/courses?tab=recommended" style={{ color: '#3182ce', fontSize: '14px', fontWeight: 600 }}>{t('studentDashboard.see_all_recommended_courses')} <InlineIcon icon={ArrowRight} size={14} className="rtl:rotate-180" /></Link>
              </div>
            )}
          </div>

          {/* PEERS LIKE YOU */}
          <div style={cardStyle} data-section="peers">
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Handshake} size={18} tone="gold" /> {t('studentDashboard.peers_heading')}</h3>
            {peers === null ? (
              <p style={{ color: '#a0aec0', margin: 0 }}>{t('common.loading')}</p>
            ) : peers.length === 0 ? (
              <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>{t('studentDashboard.no_peers')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {peers.map((peer) => (
                  <div key={peer.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/students/${peer.id}`} style={{ color: '#1a202c', fontWeight: 700, textDecoration: 'none' }}>{peer.fullName}</Link>
                      <div style={{ fontSize: '13px', color: '#718096' }}>{peer.university} · {peer.fieldOfStudy}</div>
                      {peer.email && <a href={`mailto:${peer.email}`} dir="ltr" style={{ fontSize: '13px', color: '#1B2A4A' }}><InlineIcon icon={Mail} size={13} /> {peer.email}</a>}
                    </div>
                    <Link to={`/messages/${peer.userId}`} style={{ padding: '6px 14px', border: '1px solid #cbd5e0', color: '#1B2A4A', borderRadius: '16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      <InlineIcon icon={MessageSquare} size={13} /> {t('skillMatch.message')}
                    </Link>
                  </div>
                ))}
                <Link to="/skill-match" style={{ color: '#3182ce', fontSize: '14px', fontWeight: 600 }}>{t('studentDashboard.see_all_peers')} <InlineIcon icon={ArrowRight} size={14} className="rtl:rotate-180" /></Link>
              </div>
            )}
          </div>

          {/* PRIVACY */}
          <div style={cardStyle} data-section="privacy">
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Lock} size={18} tone="gold" /> {t('studentDashboard.privacy_heading')}</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#2d3748', cursor: 'pointer' }}>
              <input
                type="checkbox"
                role="switch"
                checked={Boolean(profile.showEmailToStudents)}
                disabled={privacySaving}
                onChange={(e) => togglePrivacy(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#1B2A4A' }}
              />
              {t('studentDashboard.show_email_label')}
            </label>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: profile.showEmailToStudents ? '#276749' : '#718096', fontWeight: 600 }}>
              {profile.showEmailToStudents ? t('studentDashboard.show_email_on') : t('studentDashboard.show_email_off')}
            </p>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#718096', lineHeight: 1.6 }}>{t('studentDashboard.show_email_hint')}</p>
          </div>
        </>
      ) : (
        /* FORM MODE */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ margin: 0, color: '#718096' }}>{profile ? t('studentDashboard.welcome_update') : t('studentDashboard.welcome_create')}</p>

          {/* PHOTO */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {avatar(80)}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>{t('studentDashboard.change_photo')}</div>
                <div style={{ fontSize: '13px', color: '#a0aec0', marginTop: '2px' }}>{t('studentDashboard.photo_hint')}</div>
                {pendingPhotoFile && <div style={{ fontSize: '13px', color: '#C99A2E', marginTop: '2px' }}>{t('studentDashboard.photo_pending')}</div>}
                {uploadingPhoto && <div style={{ fontSize: '13px', color: '#3182ce', marginTop: '2px' }}>{t('studentDashboard.uploading_photo')}</div>}
              </div>
            </div>
          </div>

          {/* RESUME / CV (optional; auto-attaches to job applications) */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={FileText} size={18} tone="gold" /> {t('studentDashboard.section_resume')} <span style={{ fontWeight: 'normal', color: '#a0aec0', fontSize: '14px' }}>{t('common.optional')}</span></h3>
            {resumeError && <p style={{ color: 'red', fontSize: '14px', marginTop: 0 }}>{resumeError}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={uploadingResume}
                style={{ padding: '10px 18px', backgroundColor: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: uploadingResume ? 'wait' : 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                {profile?.hasResume || pendingResumeFile ? t('studentDashboard.change_resume') : t('studentDashboard.upload_resume')}
              </button>
              {profile?.hasResume && (
                <>
                  <CvLink endpoint={`/api/student/${profile.id}/resume`} label={t('studentDashboard.view_resume')} style={{ fontSize: '14px', color: '#3182ce', fontWeight: '600' }} />
                  <button type="button" onClick={handleRemoveResume} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    {t('studentDashboard.remove_resume')}
                  </button>
                </>
              )}
              <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResumeSelect} style={{ display: 'none' }} />
            </div>
            <div style={{ fontSize: '13px', color: pendingResumeFile ? '#C99A2E' : '#a0aec0', marginTop: '10px' }}>
              {uploadingResume
                ? t('studentDashboard.uploading_resume')
                : pendingResumeFile
                  ? t('studentDashboard.resume_pending', { filename: pendingResumeFile.name })
                  : !profile?.hasResume ? t('studentDashboard.no_resume') : t('studentDashboard.resume_hint')}
            </div>
          </div>

          {/* BASIC INFO */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={ClipboardList} size={18} tone="gold" /> {t('studentDashboard.section_basic_info')}</h3>
            <div className="grid-2col">
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>{t('studentDashboard.full_name_placeholder')} <span style={{ color: '#e53e3e' }}>*</span></label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('studentDashboard.university_placeholder')} <span style={{ color: '#e53e3e' }}>*</span></label>
                <input type="text" name="university" value={formData.university} onChange={handleChange} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('studentDashboard.field_of_study_placeholder')} <span style={{ color: '#e53e3e' }}>*</span></label>
                <input type="text" name="fieldOfStudy" value={formData.fieldOfStudy} onChange={handleChange} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('studentDashboard.graduation_year_placeholder')} <span style={{ color: '#e53e3e' }}>*</span></label>
                <input type="number" name="graduationYear" value={formData.graduationYear} onChange={handleChange} required style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ABOUT */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={FileText} size={18} tone="gold" /> {t('studentDashboard.section_about')}</h3>
            <textarea name="bio" placeholder={t('studentDashboard.bio_placeholder')} value={formData.bio || ''} onChange={handleChange} rows="4" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* LINKS */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Link2} size={18} tone="gold" /> {t('studentDashboard.section_links')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="url" name="linkedinUrl" placeholder={t('studentDashboard.linkedin_placeholder')} value={formData.linkedinUrl || ''} onChange={handleChange} style={inputStyle} />
              <input type="url" name="githubUrl" placeholder={t('studentDashboard.github_placeholder')} value={formData.githubUrl || ''} onChange={handleChange} style={inputStyle} />
              <input type="url" name="portfolioUrl" placeholder={t('studentDashboard.portfolio_placeholder')} value={formData.portfolioUrl || ''} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* PRIVACY */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Lock} size={18} tone="gold" /> {t('studentDashboard.privacy_heading')}</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#2d3748', cursor: 'pointer' }}>
              <input
                type="checkbox"
                role="switch"
                checked={formData.showEmailToStudents}
                onChange={(e) => setFormData({ ...formData, showEmailToStudents: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#1B2A4A' }}
              />
              {t('studentDashboard.show_email_label')}
            </label>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#718096', lineHeight: 1.6 }}>{t('studentDashboard.show_email_hint')}</p>
          </div>

          {/* SKILLS SELECTION */}
          <div style={cardStyle} ref={skillsSectionRef}>
            <h3 style={sectionHeadingStyle}><InlineIcon icon={Puzzle} size={18} tone="gold" /> {t('studentDashboard.select_skills_heading')}</h3>

            <input
              type="text"
              placeholder={t('studentDashboard.skills_search_placeholder')}
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: '14px' }}
            />

            {skillSearchResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {skillSearchResults.length === 0 ? (
                  <p style={{ color: '#a0aec0', fontSize: '15px', margin: 0 }}>{t('studentDashboard.skills_search_empty')}</p>
                ) : (
                  skillSearchResults.map(renderCategoryBlock)
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groupedBySubjectArea.map(({ area, categories: areaCategories }) => {
                  const isOpen = Boolean(expandedAreas[area.id]);
                  const count = selectedCountInArea(areaCategories);
                  return (
                    <div key={area.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        style={{
                          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 16px', background: isOpen ? '#ebf8ff' : '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'start'
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#1a202c', fontSize: '15px' }}>{localizedCategoryName(area, i18n.language)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {count > 0 && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#22543d', backgroundColor: '#c6f6d5', padding: '2px 9px', borderRadius: '10px' }}>{count}</span>
                          )}
                          <span style={{ fontSize: '13px', color: '#a0aec0' }}>{isOpen ? '▲' : '▼'}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'white' }}>
                          {areaCategories.map(renderCategoryBlock)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CUSTOM SKILL ENTRY */}
            <h4 style={{ marginTop: '18px', marginBottom: '10px', fontSize: '15px', color: '#1a202c' }}>{t('studentDashboard.manual_skill_heading')}</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder={t('studentDashboard.manual_skill_placeholder')} value={customInput} onChange={(e) => setCustomInput(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={handleAddCustomSkill} style={{ padding: '10px 20px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{t('studentDashboard.add')}</button>
            </div>

            {nearestSkillSuggestion && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#718096' }}>
                {t('studentDashboard.did_you_mean')} <strong>{nearestSkillSuggestion.name_en}</strong>?{' '}
                <button type="button" onClick={handleUseSuggestedSkill} style={{ background: 'none', border: 'none', color: '#3182ce', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '14px' }}>
                  {t('studentDashboard.use_this_skill')}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              {customSkills.map(skillName => (
                <span key={skillName} style={{ backgroundColor: '#edf2f7', padding: '6px 12px', borderRadius: '16px', display: 'flex', gap: '6px', fontSize: '14px' }}>
                  {skillName}
                  <button type="button" onClick={() => handleRemoveCustomSkill(skillName)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '15px' }}>
              {profile ? t('studentDashboard.save_changes') : t('studentDashboard.create_profile')}
            </button>
            {profile && (
              <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '12px 20px', backgroundColor: '#edf2f7', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{t('studentDashboard.cancel')}</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default StudentDashboard;
