import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';

function AdminDashboard() {
  const { t } = useTranslation();
  const [pendingHR, setPendingHR] = useState([]);
  const [pendingSkills, setPendingSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [searchParams] = useSearchParams();
  const hrSectionRef = useRef(null);
  const skillsSectionRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const config = { headers: authHeader() };
        const [hrRes, skillsRes] = await Promise.all([
          axios.get('/api/admin/hr/pending', config),
          axios.get('/api/admin/skills/pending', config)
        ]);
        setPendingHR(hrRes.data);
        setPendingSkills(skillsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || t('adminDashboard.error_load'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, []);

  // Deep-link support from the user menu: ?section=hr / ?section=skills scrolls to that section.
  useEffect(() => {
    if (loading) return;
    const section = searchParams.get('section');
    const target = section === 'hr' ? hrSectionRef : section === 'skills' ? skillsSectionRef : null;
    if (target) {
      setTimeout(() => target.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [loading, searchParams]);

  const handleHRStatus = async (id, status) => {
    setMessage('');
    setError('');
    try {
      await axios.put(`/api/admin/hr/${id}`, { status }, { headers: authHeader() });
      setMessage(status === 'APPROVED' ? t('adminDashboard.company_approved') : t('adminDashboard.company_rejected'));
      setPendingHR(pendingHR.filter(p => p.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || t('adminDashboard.error_status'));
    }
  };

  const handleSkillReview = async (id, approve) => {
    setMessage('');
    setError('');
    try {
      await axios.put(`/api/admin/skills/${id}`, { approve }, { headers: authHeader() });
      setMessage(approve ? t('adminDashboard.skill_approved') : t('adminDashboard.skill_rejected'));
      setPendingSkills(pendingSkills.filter(s => s.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || t('adminDashboard.error_review'));
    }
  };

  if (loading) return <h3>{t('adminDashboard.loading')}</h3>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>{t('adminDashboard.heading')}</h2>

      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <section style={{ marginTop: '30px' }}>
        <h3 ref={hrSectionRef}>{t('adminDashboard.pending_companies_heading')}</h3>
        {pendingHR.length === 0 ? (
          <p style={{ color: '#718096' }}>{t('adminDashboard.no_pending_companies')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingHR.map(hr => (
              <div key={hr.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>{hr.companyName}</strong> — {hr.industry}
                  <div style={{ fontSize: '13px', color: '#718096' }}>{hr.user?.email} · CR: {hr.crNumber}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleHRStatus(hr.id, 'APPROVED')} style={{ padding: '8px 16px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('adminDashboard.approve')}</button>
                  <button onClick={() => handleHRStatus(hr.id, 'REJECTED')} style={{ padding: '8px 16px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('adminDashboard.reject')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '40px' }}>
        <h3 ref={skillsSectionRef}>{t('adminDashboard.pending_skills_heading')}</h3>
        {pendingSkills.length === 0 ? (
          <p style={{ color: '#718096' }}>{t('adminDashboard.no_pending_skills')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingSkills.map(skill => (
              <div key={skill.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>{skill.name}</strong>
                  <div style={{ fontSize: '13px', color: '#718096' }}>{t('adminDashboard.submitted_by')} {skill.studentProfile?.fullName}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleSkillReview(skill.id, true)} style={{ padding: '8px 16px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('adminDashboard.approve')}</button>
                  <button onClick={() => handleSkillReview(skill.id, false)} style={{ padding: '8px 16px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('adminDashboard.reject')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
