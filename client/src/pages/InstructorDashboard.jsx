import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import InstructorCourses from './instructor/InstructorCourses';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const inputStyle = { width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', marginTop: '6px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#2d3748', display: 'block' };
const STATUS_TONE = { PENDING: ['#fdf6e3', '#8a6d1d'], APPROVED: ['#e6f4ea', '#276749'], REJECTED: ['#fde8e8', '#9b2c2c'] };

const FIELDS = ['fullName', 'headline', 'expertise', 'bio', 'website', 'linkedinUrl', 'phone'];

function InstructorDashboard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios.get('/api/instructor/profile', { headers: authHeader() })
      .then((res) => { setProfile(res.data); setForm(res.data); })
      .catch((err) => setError(err.response?.data?.message || t('instructorDashboard.error_load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await axios.put('/api/instructor/profile', form, { headers: authHeader() });
      setProfile(res.data.profile);
      setForm(res.data.profile);
      setEditing(false);
      setMessage(res.data.resubmitted ? t('instructorDashboard.resubmitted') : t('instructorDashboard.saved'));
    } catch (err) {
      setError(err.response?.data?.message || t('instructorDashboard.error_save'));
    } finally {
      setBusy(false);
    }
  };

  if (error && !profile) return <p role="alert" style={{ textAlign: 'center', color: '#c53030', marginTop: '40px' }}>{error}</p>;
  if (!profile) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('instructorDashboard.loading')}</p>;

  const [bg, color] = STATUS_TONE[profile.status];
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div style={{ maxWidth: '760px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', color: '#1a202c' }}>🎓 {t('instructorDashboard.heading')}</h1>

      {message && <p role="status" style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#e6f4ea', color: '#276749', fontWeight: 600 }}>{message}</p>}
      {error && <p role="alert" style={{ color: '#c53030' }}>{error}</p>}

      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '14px', backgroundColor: bg, color, fontWeight: 700, fontSize: '13px' }}>
          {t(`instructorDashboard.status_${profile.status}`)}
        </span>
        <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: 1.7, marginBottom: 0 }}>
          {profile.status === 'APPROVED' ? t('instructorDashboard.approved_note')
            : profile.status === 'PENDING' ? t('instructorDashboard.pending_note')
              : t('instructorDashboard.rejected_note')}
        </p>
        {profile.status === 'REJECTED' && (
          <div role="alert" style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fde8e8', color: '#9b2c2c', fontSize: '14px', lineHeight: 1.6 }}>
            {profile.rejectionReason && <div>{t('instructorDashboard.rejected_reason', { reason: profile.rejectionReason })}</div>}
            <div style={{ color: '#4a5568', marginTop: '4px' }}>{t('instructorDashboard.rejected_hint')}</div>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '18px', color: '#1a202c', margin: 0 }}>{t('instructorDashboard.profile_heading')}</h2>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} style={{ padding: '9px 18px', border: '1px solid #cbd5e0', backgroundColor: '#edf2f7', color: '#2d3748', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {t('instructorDashboard.edit')}
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {FIELDS.map((key) => (
              <label key={key} style={labelStyle}>
                {t(`instructorDashboard.${key === 'linkedinUrl' ? 'linkedin' : key}`)}
                {key === 'bio' ? (
                  <textarea rows={4} dir="auto" value={form[key] || ''} onChange={set(key)} style={inputStyle} />
                ) : (
                  <input type={key === 'phone' ? 'tel' : key === 'website' || key === 'linkedinUrl' ? 'url' : 'text'} required={key === 'fullName'} dir={key === 'website' || key === 'linkedinUrl' || key === 'phone' ? 'ltr' : 'auto'} value={form[key] || ''} onChange={set(key)} style={inputStyle} />
                )}
              </label>
            ))}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={busy} style={{ padding: '11px 22px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {t('instructorDashboard.save')}
              </button>
              <button type="button" onClick={() => { setForm(profile); setEditing(false); }} style={{ padding: '11px 22px', border: '1px solid #cbd5e0', backgroundColor: 'white', color: '#4a5568', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {t('instructorDashboard.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <dl style={{ margin: '14px 0 0 0', display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', fontSize: '15px' }}>
            {FIELDS.filter((key) => profile[key]).map((key) => (
              <div key={key} style={{ display: 'contents' }}>
                <dt style={{ color: '#718096', fontWeight: 600 }}>{t(`instructorDashboard.${key === 'linkedinUrl' ? 'linkedin' : key}`)}</dt>
                <dd style={{ margin: 0, color: '#2d3748', wordBreak: 'break-word' }} dir="auto">{profile[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <InstructorCourses approved={profile.status === 'APPROVED'} notify={(text) => setMessage(text)} />
    </div>
  );
}

export default InstructorDashboard;
