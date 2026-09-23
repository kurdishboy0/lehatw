import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', marginTop: '6px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#2d3748', display: 'block' };

// Public "Teach on Lehatw" application. The account is created right away,
// but an admin reviews it before the person's courses can go live.
function RegisterInstructor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', headline: '', expertise: '', bio: '', website: '', linkedinUrl: '', personalPhone: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await axios.post('/api/auth/register', { ...form, role: 'INSTRUCTOR' });
      alert(t('registerInstructor.success'));
      navigate(form.personalPhone ? `/verify-phone?email=${encodeURIComponent(form.email)}` : '/login');
    } catch (err) {
      setError(err.response?.data?.message || t('registerInstructor.error_default'));
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', color: '#1a202c', marginBottom: '6px' }}>🎓 {t('registerInstructor.title')}</h1>
      <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: 1.7, marginTop: 0 }}>{t('registerInstructor.subtitle')}</p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
        <label style={labelStyle}>
          {t('registerInstructor.full_name')}
          <input type="text" required dir="auto" value={form.fullName} onChange={set('fullName')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('registerInstructor.email')}
          <input type="email" required dir="ltr" value={form.email} onChange={set('email')} style={inputStyle} />
        </label>
        <div>
          <label style={labelStyle}>
            {t('registerInstructor.password')}
            <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} style={inputStyle} />
          </label>
          <p style={{ fontSize: '13px', color: '#718096', margin: '4px 0 0 0' }}>{t('common.password_hint')}</p>
        </div>
        <label style={labelStyle}>
          {t('registerInstructor.headline')}
          <input type="text" dir="auto" placeholder={t('registerInstructor.headline_placeholder')} value={form.headline} onChange={set('headline')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('registerInstructor.expertise')}
          <input type="text" dir="auto" placeholder={t('registerInstructor.expertise_placeholder')} value={form.expertise} onChange={set('expertise')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('registerInstructor.bio')}
          <textarea rows={4} dir="auto" placeholder={t('registerInstructor.bio_placeholder')} value={form.bio} onChange={set('bio')} style={inputStyle} />
        </label>
        <div className="grid-2col">
          <label style={labelStyle}>
            {t('registerInstructor.website')}
            <input type="url" dir="ltr" value={form.website} onChange={set('website')} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            {t('registerInstructor.linkedin')}
            <input type="url" dir="ltr" value={form.linkedinUrl} onChange={set('linkedinUrl')} style={inputStyle} />
          </label>
        </div>
        <label style={labelStyle}>
          {t('registerInstructor.phone')}
          <input type="tel" dir="ltr" value={form.personalPhone} onChange={set('personalPhone')} style={inputStyle} />
        </label>

        {error && <p role="alert" style={{ color: '#c53030', fontSize: '14px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          style={{ padding: '13px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {t('registerInstructor.submit')}
        </button>
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#718096', margin: 0 }}>
          {t('registerInstructor.have_account')} <Link to="/login" style={{ color: '#1B2A4A', fontWeight: 600 }}>{t('registerInstructor.login')}</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterInstructor;
