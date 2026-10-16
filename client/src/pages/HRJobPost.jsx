import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import { ClipboardList, MapPin, Clock, Building2, Briefcase, GraduationCap, FileText, Target, CircleCheck, Gift, Puzzle } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['On-Site', 'Remote', 'Hybrid'];

const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '24px',
  backgroundColor: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const sectionHeadingStyle = {
  margin: '0 0 16px 0',
  fontSize: '17px',
  color: '#1a202c',
  paddingBottom: '10px',
  borderBottom: '2px solid #ebf4ff'
};

const inputStyle = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' };

function HRJobPost() {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [workMode, setWorkMode] = useState('On-Site');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [education, setEducation] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [requiresCv, setRequiresCv] = useState(true);

  // Skills State
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);

  // System State
  const [message, setMessage] = useState('');
  const [postedJobId, setPostedJobId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await axios.get('/api/jobs/skills');
        setAvailableSkills(res.data);
      } catch (err) {
        console.error("Failed to fetch skills:", err);
      }
    };
    fetchSkills();
  }, []);

  const handleSkillToggle = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await axios.post('/api/jobs', {
        title,
        location,
        employmentType,
        workMode,
        experienceLevel,
        education,
        description,
        responsibilities,
        requirements,
        benefits,
        requiresCv,
        skillIds: selectedSkills
      }, { headers: authHeader() });

      setMessage(t('jobPost.success'));
      setPostedJobId(response.data.job.id);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || t('jobPost.error_default'));
    }
  };

  return (
    <div style={{ maxWidth: '760px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ color: '#1a202c', margin: '0 0 6px 0' }}>{t('jobPost.heading')}</h2>
        <p style={{ color: '#718096', margin: 0 }}>{t('jobPost.subtitle')}</p>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', backgroundColor: message === t('jobPost.success') ? '#c6f6d5' : '#fed7d7', color: message === t('jobPost.success') ? '#22543d' : '#822727', borderRadius: '8px' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* BASIC DETAILS */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={ClipboardList} size={18} tone="gold" /> {t('jobPost.section_basics')}</h3>
          <div className="grid-2col">
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{t('jobPost.title_label')} <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="text" placeholder={t('jobPost.title_placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}><InlineIcon icon={MapPin} size={14} tone="gold" /> {t('jobPost.location_label')}</label>
              <input type="text" placeholder={t('jobPost.location_placeholder')} value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}><InlineIcon icon={Clock} size={14} tone="gold" /> {t('jobPost.employment_type_label')}</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} style={inputStyle}>
                {EMPLOYMENT_TYPES.map(type => (
                  <option key={type} value={type}>{t(`jobPost.employment_${type.toLowerCase().replace('-', '_')}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}><InlineIcon icon={Building2} size={14} tone="gold" /> {t('jobPost.work_mode_label')}</label>
              <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} style={inputStyle}>
                {WORK_MODES.map(mode => (
                  <option key={mode} value={mode}>{t(`jobPost.work_mode_${mode.toLowerCase().replace('-', '')}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}><InlineIcon icon={Briefcase} size={14} tone="gold" /> {t('jobPost.experience_label')}</label>
              <input type="text" placeholder={t('jobPost.experience_placeholder')} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}><InlineIcon icon={GraduationCap} size={14} tone="gold" /> {t('jobPost.education_label')}</label>
              <input type="text" placeholder={t('jobPost.education_placeholder')} value={education} onChange={(e) => setEducation(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={FileText} size={18} tone="gold" /> {t('jobPost.section_summary')}</h3>
          <textarea placeholder={t('jobPost.summary_placeholder')} value={description} onChange={(e) => setDescription(e.target.value)} rows="4" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* RESPONSIBILITIES */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={Target} size={18} tone="gold" /> {t('jobPost.section_responsibilities')}</h3>
          <textarea placeholder={t('jobPost.responsibilities_placeholder')} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} rows="5" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* REQUIREMENTS */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={CircleCheck} size={18} tone="gold" /> {t('jobPost.section_requirements')}</h3>
          <textarea placeholder={t('jobPost.requirements_placeholder')} value={requirements} onChange={(e) => setRequirements(e.target.value)} rows="5" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* BENEFITS */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={Gift} size={18} tone="gold" /> {t('jobPost.section_benefits')} <span style={{ fontWeight: 'normal', color: '#a0aec0', fontSize: '13px' }}>{t('common.optional')}</span></h3>
          <textarea placeholder={t('jobPost.benefits_placeholder')} value={benefits} onChange={(e) => setBenefits(e.target.value)} rows="4" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* SKILLS */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}><InlineIcon icon={Puzzle} size={18} tone="gold" /> {t('jobPost.section_skills')}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {availableSkills.map(skill => (
              <label key={skill.id} style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px',
                backgroundColor: selectedSkills.includes(skill.id) ? '#FCF6E3' : '#f7fafc',
                border: selectedSkills.includes(skill.id) ? '1px solid #90cdf4' : '1px solid #e2e8f0',
                padding: '6px 12px', borderRadius: '20px', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.id)}
                  onChange={() => handleSkillToggle(skill.id)}
                />
                {skill.name_en}
              </label>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', marginTop: '20px' }}>
            <input
              type="checkbox"
              checked={requiresCv}
              onChange={(e) => setRequiresCv(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            {t('jobPost.requires_cv_label')}
          </label>
        </div>

        <button type="submit" disabled={!!postedJobId} style={{
          padding: '14px', backgroundColor: postedJobId ? '#a0aec0' : '#1B2A4A', color: 'white',
          border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px',
          cursor: postedJobId ? 'not-allowed' : 'pointer'
        }}>
          {postedJobId ? t('jobPost.published') : t('jobPost.publish')}
        </button>
      </form>

      {/* MATCHMAKING SECTION */}
      {postedJobId && (
        <div style={{ ...cardStyle, backgroundColor: '#f0fff4', border: '1px solid #9ae6b4' }}>
          <h3 style={{ marginTop: 0, color: '#22543d' }}>{t('jobPost.matching_heading')}</h3>
          <p style={{ fontSize: '14px', color: '#276749', marginBottom: '15px' }}>
            {t('jobPost.matching_desc')}
          </p>

          <button
            onClick={() => navigate(`/hr-dashboard/jobs/${postedJobId}/candidates`)}
            style={{ padding: '10px 20px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {t('jobPost.run_matching')}
          </button>

        </div>
      )}
    </div>
  );
}

export default HRJobPost;
