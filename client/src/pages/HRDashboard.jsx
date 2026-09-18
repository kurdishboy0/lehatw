import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';


function HRDashboard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [searchParams] = useSearchParams();
  // Deep-link support from the user menu: ?edit=1 opens the edit form on load.
  const [isEditing, setIsEditing] = useState(() => searchParams.get('edit') === '1');

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    jobTitle: '',
    crNumber: ''
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [myJobs, setMyJobs] = useState([]);
  const [applicantsByJob, setApplicantsByJob] = useState({});
  const [openApplicantsFor, setOpenApplicantsFor] = useState(null);

  const navigate = useNavigate();
  const myJobsSectionRef = useRef(null);

  // 1. Fetch the HR profile when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get('/api/hr/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setProfile(res.data);
        setFormData(res.data);
      } catch (err) {
        if (err.response?.status !== 404) {
          setError(t('hrDashboard.error_load'));
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchMyJobs = async () => {
      try {
        const res = await axios.get('/api/jobs/mine', { headers: authHeader() });
        setMyJobs(res.data);
      } catch (err) {
        console.error("Failed to load job posts:", err);
      }
    };

    fetchProfile();
    fetchMyJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [navigate]);

  // Deep-link support from the user menu: ?section=jobs scrolls to the "My Job Posts" section.
  useEffect(() => {
    if (loading) return;
    if (searchParams.get('section') === 'jobs') {
      setTimeout(() => myJobsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [loading, searchParams]);

  const handleDeleteJob = async (jobId) => {
    try {
      await axios.delete(`/api/jobs/${jobId}`, { headers: authHeader() });
      setMyJobs(myJobs.filter(j => j.id !== jobId));
    } catch (err) {
      setError(err.response?.data?.message || t('hrDashboard.error_delete'));
    }
  };

  const toggleApplicants = async (jobId) => {
    if (openApplicantsFor === jobId) {
      setOpenApplicantsFor(null);
      return;
    }
    setOpenApplicantsFor(jobId);
    if (!applicantsByJob[jobId]) {
      try {
        const res = await axios.get(`/api/applications/job/${jobId}`, { headers: authHeader() });
        setApplicantsByJob({ ...applicantsByJob, [jobId]: res.data.applications });
      } catch (err) {
        console.error("Failed to load applicants:", err);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');

    try {
      if (profile) {
        // UPDATE (PUT)
        const res = await axios.put('/api/hr/profile', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data.profile);
        setMessage(res.data.resubmitted ? t('hrModeration.resubmitted') : t('hrDashboard.success_save'));
        setIsEditing(false);
      } else {
        // CREATE (POST)
        const res = await axios.post('/api/hr/profile', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data.profile);
        setMessage(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('hrDashboard.error_save'));
    }
  };

  if (loading) return <h3>{t('hrDashboard.loading')}</h3>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>{t('hrDashboard.heading')}</h2>

      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      {/* VIEW MODE */}
      {profile && !isEditing ? (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>

          {/* Display Account Status */}
          <div style={{
            display: 'inline-block',
            padding: '5px 10px',
            marginBottom: '15px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: profile.status === 'APPROVED' ? '#d4edda' : profile.status === 'REJECTED' ? '#fde8e8' : '#fff3cd',
            color: profile.status === 'APPROVED' ? '#155724' : profile.status === 'REJECTED' ? '#9b2c2c' : '#856404'
          }}>
            {t('hrDashboard.status_label')}: {t(`hrModeration.status.${profile.status || 'PENDING'}`)}
          </div>

          {profile.status === 'REJECTED' && (
            <div role="alert" style={{ marginBottom: '15px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fde8e8', color: '#9b2c2c', fontSize: '14px', lineHeight: 1.6 }}>
              <strong>{t('hrModeration.rejected_heading')}</strong>
              {profile.rejectionReason && <div>{t('hrModeration.rejected_reason', { reason: profile.rejectionReason })}</div>}
              <div style={{ marginTop: '4px', color: '#4a5568' }}>{t('hrModeration.rejected_hint')}</div>
            </div>
          )}

          <h3>{profile.companyName}</h3>
          <p><strong>{t('hrDashboard.industry_label')}:</strong> {profile.industry}</p>
          <p><strong>{t('hrDashboard.job_title_label')}:</strong> {profile.jobTitle}</p>
          <p><strong>{t('hrDashboard.cr_number_label')}:</strong> {profile.crNumber}</p>

          <div style={{ display: 'flex', gap: '15px', marginTop: '25px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#e2e8f0', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '6px', fontWeight: 'bold' }}
            >
              {profile.status === 'REJECTED' ? t('hrModeration.fix_details') : t('hrDashboard.edit_details')}
            </button>

            {/* NEW: Job Posting Button */}
            {profile.status === 'APPROVED' ? (
              <Link to="/hr-dashboard/post-job" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '10px 20px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {t('hrDashboard.create_job_post')}
                </button>
              </Link>
            ) : (
              <button disabled style={{ padding: '10px 20px', backgroundColor: '#a0aec0', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'not-allowed' }} title={t('hrDashboard.pending_approval_tooltip')}>
                {t('hrDashboard.create_job_post_pending')}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* FORM MODE */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p>{profile ? t('hrDashboard.welcome_update') : t('hrDashboard.welcome_create')}</p>

          <input type="text" name="companyName" placeholder={t('hrDashboard.company_name_placeholder')} value={formData.companyName} onChange={handleChange} required style={{ padding: '10px' }} />
          <input type="text" name="industry" placeholder={t('hrDashboard.industry_placeholder')} value={formData.industry} onChange={handleChange} required style={{ padding: '10px' }} />
          <input type="text" name="jobTitle" placeholder={t('hrDashboard.job_title_placeholder')} value={formData.jobTitle} onChange={handleChange} required style={{ padding: '10px' }} />
          <input type="text" name="crNumber" placeholder={t('hrDashboard.cr_number_placeholder')} value={formData.crNumber} onChange={handleChange} required style={{ padding: '10px' }} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', flex: 1 }}>
              {profile ? t('hrDashboard.save_changes') : t('hrDashboard.submit_for_approval')}
            </button>

            {profile && (
              <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>
                {t('hrDashboard.cancel')}
              </button>
            )}
          </div>
        </form>
      )}

      {/* MY JOB POSTS */}
      {profile && !isEditing && (
        <div style={{ marginTop: '30px' }}>
          <h3 ref={myJobsSectionRef}>{t('hrDashboard.my_jobs_heading')}</h3>
          {myJobs.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('hrDashboard.no_jobs')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myJobs.map(job => (
                <div key={job.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <strong>{job.title}</strong>
                      <div style={{ fontSize: '13px', color: '#718096' }}>
                        {job.removedByAdmin ? (
                          <span style={{ color: '#9b2c2c', fontWeight: 600 }}>{t('hrModeration.removed_label')}</span>
                        ) : job.isActive ? t('hrDashboard.active_label') : t('hrDashboard.inactive_label')} · {job._count?.applications || 0} {t('hrDashboard.applicants_count')}
                      </div>
                      {job.removedByAdmin && job.removedReason && (
                        <div style={{ fontSize: '13px', color: '#9b2c2c', marginTop: '2px' }}>{t('hrModeration.removed_reason', { reason: job.removedReason })}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {job.isActive && !job.removedByAdmin && (
                        <Link to={`/hr-dashboard/jobs/${job.id}/candidates`} style={{ padding: '8px 14px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }}>
                          🎯 {t('hrDashboard.find_candidates')}
                        </Link>
                      )}
                      <button onClick={() => toggleApplicants(job.id)} style={{ padding: '8px 14px', backgroundColor: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer' }}>
                        {openApplicantsFor === job.id ? t('hrDashboard.hide_applicants') : t('hrDashboard.view_applicants')}
                      </button>
                      <button onClick={() => handleDeleteJob(job.id)} style={{ padding: '8px 14px', backgroundColor: '#fed7d7', color: '#822727', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        {t('hrDashboard.delete')}
                      </button>
                    </div>
                  </div>

                  {openApplicantsFor === job.id && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                      {(applicantsByJob[job.id] || []).length === 0 ? (
                        <p style={{ color: '#718096', fontSize: '14px' }}>{t('hrDashboard.no_applicants')}</p>
                      ) : (
                        applicantsByJob[job.id].map(app => (
                          <div key={app.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f1f1' }}>
                            <strong>{app.student.studentProfile?.fullName || app.student.email}</strong>
                            <div style={{ fontSize: '13px', color: '#718096' }}>
                              {app.student.studentProfile?.university} · {app.student.studentProfile?.fieldOfStudy}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span>✉️ {app.student.email}</span>
                              {app.student.phone && (
                                <span title={t('hrDashboard.phone_unverified_hint')}>📞 {app.student.phone}</span>
                              )}
                            </div>
                            {app.coverLetter && <p style={{ fontSize: '13px', marginTop: '5px' }}>{app.coverLetter}</p>}
                            {app.cvUrl && <a href={app.cvUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px' }}>{t('hrDashboard.view_cv')}</a>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HRDashboard;
