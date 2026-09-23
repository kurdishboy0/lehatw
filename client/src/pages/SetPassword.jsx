import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';

const DASHBOARD_PATH = { STUDENT: '/student-dashboard', HR: '/hr-dashboard', INSTRUCTOR: '/instructor-dashboard', ADMIN: '/admin-dashboard' };

const cardStyle = {
  maxWidth: '440px', margin: '60px auto', padding: '30px', backgroundColor: 'white',
  border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontFamily: 'sans-serif'
};
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', marginTop: '6px' };

// Where an admin-created account lands from its welcome email: check the link,
// choose a password, and get signed straight in.
function SetPassword() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [account, setAccount] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time result of a missing token
      setLinkError(t('setPassword.invalid_title'));
      return;
    }
    axios.get(`/api/auth/setup/${token}`)
      .then((res) => setAccount(res.data))
      .catch((err) => setLinkError(err.response?.data?.message || t('setPassword.invalid_title')));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError(t('setPassword.mismatch'));
    setBusy(true);
    try {
      const res = await axios.post('/api/auth/setup', { token, password });
      login(res.data.token, res.data.user);
      navigate(DASHBOARD_PATH[res.data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || t('setPassword.error_default'));
      setBusy(false);
    }
  };

  if (linkError) {
    return (
      <div style={cardStyle}>
        <h1 style={{ fontSize: '22px', color: '#1a202c', marginTop: 0 }}>{t('setPassword.invalid_title')}</h1>
        <p role="alert" style={{ color: '#c53030', fontSize: '15px' }}>{linkError}</p>
        <Link to="/login" style={{ color: '#1B2A4A', fontWeight: 600 }}>{t('setPassword.back_to_login')}</Link>
      </div>
    );
  }

  if (!account) return <p style={{ textAlign: 'center', marginTop: '60px', color: '#718096' }}>{t('setPassword.checking')}</p>;

  return (
    <div style={cardStyle}>
      <h1 style={{ fontSize: '22px', color: '#1a202c', margin: '0 0 6px 0' }}>🔑 {t('setPassword.heading')}</h1>
      <p style={{ color: '#4a5568', fontSize: '15px', marginTop: 0 }} dir="auto">{t('setPassword.subtitle', { email: account.email })}</p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>
          {t('setPassword.password')}
          <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" style={inputStyle} />
        </label>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>
          {t('setPassword.confirm')}
          <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4a5568' }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          {show ? t('common.hide_password') : t('common.show_password')}
        </label>
        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>{t('common.password_hint')}</p>
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '14px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          style={{ padding: '13px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {t('setPassword.submit')}
        </button>
      </form>
    </div>
  );
}

export default SetPassword;
