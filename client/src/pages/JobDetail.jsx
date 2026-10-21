import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import ReportButton from '../components/ReportButton';
import { MapPin, Clock, Building2, Briefcase, GraduationCap, FileText, Target, CircleCheck, Gift, ArrowLeft } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';
import JobDeadline from '../components/JobDeadline';
import { applicationsClosed } from '../jobDeadline';
import CvLink from '../components/CvLink';

function bulletsFrom(text) {
  return (text || '').split('\n').map(line => line.trim()).filter(Boolean);
}

const metaRowStyle = { display: 'flex', gap: '10px', padding: '14px 0', borderBottom: '1px solid #edf2f7' };
const metaLabelStyle = { fontSize: '12px', color: '#718096', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' };
const metaValueStyle = { fontSize: '14px', color: '#2d3748', fontWeight: '600', marginTop: '2px' };

function MetaRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={metaRowStyle}>
      <InlineIcon icon={icon} size={18} tone="gold" />
      <div>
        <div style={metaLabelStyle}>{label}</div>
        <div style={metaValueStyle}>{value}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{ fontSize: '17px', color: '#1a202c', margin: '0 0 12px 0', paddingBottom: '10px', borderBottom: '2px solid #ebf4ff' }}>
        <InlineIcon icon={icon} size={18} tone="gold" /> {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ text }) {
  const items = bulletsFrom(text);
  if (items.length === 0) return null;
  return (
    <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#4a5568', fontSize: '14px', lineHeight: '1.9' }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function JobDetail() {
  const { t } = useTranslation();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [searchParams] = useSearchParams();
  // "Apply" on the jobs list links here with ?apply=1 to open the form directly.
  const [applying, setApplying] = useState(() => searchParams.get('apply') === '1' && getUser()?.role === 'STUDENT');
  const [coverLetter, setCoverLetter] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [useDifferentCv, setUseDifferentCv] = useState(false);
  const [applyStatus, setApplyStatus] = useState('');
  const [profileResumeUrl, setProfileResumeUrl] = useState(null);

  const user = getUser();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await axios.get(`/api/jobs/${jobId}`);
        setJob(res.data);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (user?.role !== 'STUDENT') return;
    axios.get('/api/student/profile', { headers: authHeader() })
      .then(res => setProfileResumeUrl(res.data.hasResume ? res.data.id : null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, `user` is stable for the page's lifetime
  }, []);

  const submitApplication = async () => {
    setApplyStatus('');
    if (applicationsClosed(job)) { setApplyStatus(t('qa.deadline_closed')); return; }
    try {
      const form = new FormData();
      form.append('jobPostId', job.id);
      form.append('coverLetter', coverLetter);
      if (cvFile) form.append('cv', cvFile);

      await axios.post('/api/applications', form, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setApplyStatus(t('jobDetail.application_submitted'));
      setApplying(false);
    } catch (err) {
      setApplyStatus(err.response?.data?.code === 'APPLICATIONS_CLOSED' ? t('qa.deadline_closed') : err.response?.data?.message || t('jobDetail.error_apply_default'));
    }
  };

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('jobDetail.loading')}</h3>;
  if (notFound || !job) return <p style={{ textAlign: 'center', color: '#718096' }}>{t('jobDetail.not_found')}</p>;

  const showFileInput = !profileResumeUrl || useDifferentCv;

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px' }}>
      <Link to="/jobs" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
        <InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('jobDetail.back')}
      </Link>

      <div style={{ marginTop: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#1a202c', margin: '0 0 8px 0' }}>{job.title}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '15px', color: '#718096' }}>{job.hrProfile?.companyName} · {job.hrProfile?.industry}</div>
          <ReportButton targetType="JOB" targetId={job.id} />
        </div>
      </div>

      <div className="sidebar-layout">
        {/* SIDEBAR META CARD */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <MetaRow icon={MapPin} label={t('jobDetail.meta_location')} value={job.location} />
          <MetaRow icon={Clock} label={t('jobDetail.meta_type')} value={job.employmentType} />
          <MetaRow icon={Building2} label={t('jobDetail.meta_mode')} value={job.workMode} />
          <MetaRow icon={Briefcase} label={t('jobDetail.meta_experience')} value={job.experienceLevel} />
          <MetaRow icon={GraduationCap} label={t('jobDetail.meta_education')} value={job.education} />

          {job.skills?.length > 0 && (
            <div style={{ paddingTop: '14px' }}>
              <div style={metaLabelStyle}>{t('jobDetail.section_skills')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {job.skills.map(s => (
                  <span key={s.skillId} style={{ backgroundColor: '#edf2f7', color: '#14213B', fontSize: '12px', padding: '4px 10px', borderRadius: '12px' }}>
                    {s.skill.name_en}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Section icon={FileText} title={t('jobDetail.section_summary')}>
            {job.description && <p style={{ color: '#4a5568', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>{job.description}</p>}
          </Section>

          <Section icon={Target} title={t('jobDetail.section_responsibilities')}>
            <BulletList text={job.responsibilities} />
          </Section>

          <Section icon={CircleCheck} title={t('jobDetail.section_requirements')}>
            <BulletList text={job.requirements} />
          </Section>

          <Section icon={Gift} title={t('jobDetail.section_benefits')}>
            <BulletList text={job.benefits} />
          </Section>

          {/* APPLY */}
          <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #edf2f7' }}>
            {applyStatus && (
              <p style={{ color: applyStatus === t('jobDetail.application_submitted') ? 'green' : 'red', fontWeight: 'bold' }}>{applyStatus}</p>
            )}

            <JobDeadline job={job} />
            {applicationsClosed(job, now) ? <p role="status">{t('qa.deadline_closed')}</p> : !user ? (
              <p style={{ color: '#718096', fontSize: '14px' }}>
                <Link to="/login" style={{ color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>{t('jobDetail.login_link')}</Link> {t('jobDetail.login_prompt')}
              </p>
            ) : user.role !== 'STUDENT' ? null : applying ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  placeholder={t('jobDetail.cover_letter_placeholder')}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows="3"
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                />

                {profileResumeUrl && !useDifferentCv ? (
                  <div style={{ fontSize: '13px', color: '#2d3748', backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '6px', padding: '10px 12px' }}>
                    <InlineIcon icon={FileText} /> {t('jobDetail.cv_using_profile')} <CvLink endpoint={`/api/student/${profileResumeUrl}/resume`} label={t('jobDetail.cv_view')} style={{ color: '#2f855a', fontWeight: '600' }} />
                    {' · '}
                    <button type="button" onClick={() => setUseDifferentCv(true)} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '13px' }}>
                      {t('jobDetail.cv_upload_different')}
                    </button>
                  </div>
                ) : null}

                {showFileInput && (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '13px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
                      {job.requiresCv ? t('jobDetail.cv_file_required') : t('jobDetail.cv_file_optional')}
                    </div>
                    {profileResumeUrl && (
                      <button type="button" onClick={() => { setUseDifferentCv(false); setCvFile(null); }} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '13px', marginTop: '4px' }}>
                        {t('jobDetail.cv_use_profile_instead')}
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={submitApplication} style={{ padding: '10px 20px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {t('jobDetail.submit_application')}
                  </button>
                  <button onClick={() => setApplying(false)} style={{ padding: '10px 20px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    {t('jobDetail.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setApplying(true)} style={{ padding: '12px 28px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                {t('jobDetail.apply_now')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobDetail;
