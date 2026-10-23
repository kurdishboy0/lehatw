import PasswordVisibilityButton from '../components/PasswordVisibilityButton';
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { GOOGLE_CLIENT_ID, LINKEDIN_CLIENT_ID } from '../oauthConfig';
import { startLinkedInSignIn } from '../linkedinAuth';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';
import { validEmail } from '../emailAddress';

function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  // --- STANDARD EMAIL/PASSWORD REGISTRATION ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validEmail(email)) { setError(t('qa.invalid_email')); return; }
    if (password !== confirmPassword) { setError(t('qa.passwords_mismatch')); return; }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(t('register.password_error'));
      return;
    }

    setBusy(true);
    try {
      await axios.post('/api/auth/register', {
        email: email.trim().toLowerCase(),
        password: password,
        role: 'STUDENT',
        personalPhone: phone
      });

      navigate(`/verify-phone?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      console.error("Registration Error:", err);
      setError(err.response?.data?.code === 'INVALID_EMAIL' ? t('qa.invalid_email') : err.response?.data?.message || t('register.error_default'));
    } finally { setBusy(false); }
  };

  // --- GOOGLE LOGIN/REGISTRATION LOGIC ---
  const handleGoogleSuccess = async (tokenResponse) => {
      try {
        const res = await axios.post('/api/auth/google', {
          token: tokenResponse.access_token,
        });

        login(res.data.token, res.data.user);
        alert(t('register.google_success'));

        if (res.data.user.role === 'STUDENT') navigate('/student-dashboard');
        else if (res.data.user.role === 'HR') navigate('/hr-dashboard');
        else navigate('/');
      } catch (err) {
        console.error("Google Authentication Error:", err);
        setError(t('register.error_google'));
      }
  };

  // --- LINKEDIN REDIRECT LOGIC ---
  const loginWithLinkedIn = () => {
    startLinkedInSignIn(LINKEDIN_CLIENT_ID);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2 style={{ textAlign: 'center', color: '#2d3748' }}>{t('register.title')}</h2>

      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div className="field-wrap">
          <input
            type="email"
            onInvalid={(e) => e.target.setCustomValidity(t('qa.invalid_email'))}
            onInput={(e) => e.target.setCustomValidity('')}
            aria-label={t('register.email_placeholder')}
            autoComplete="email"
            placeholder={t('register.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
          />
          <span className="required-asterisk">*</span>
        </div>

        <div className="field-wrap">
          <input
            type="tel"
            placeholder={t('register.phone_placeholder')}
            aria-label={t('register.phone_placeholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
          />
          <span className="required-asterisk">*</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('register.password_placeholder')}
              aria-label={t('register.password_placeholder')}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
            />
            <span className="required-asterisk" aria-hidden="true">*</span>
            <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword(value => !value)} />
          </div>
          <span style={{ fontSize: '12px', color: '#718096' }}>
            {t('common.password_hint')}
          </span>
        </div>

        <label style={{ fontSize: '14px', color: '#4a5568' }}>
          {t('qa.confirm_password')} <span style={{ color: '#e53e3e' }}>*</span>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required
            style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box', marginTop: '5px' }} />
        </label>
        <button type="submit" disabled={busy} style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', transition: 'background-color 0.2s' }}>
          {t('register.submit')}
        </button>
      </form>

      {/* --- SOCIAL LOGIN SECTION --- */}
      {(GOOGLE_CLIENT_ID || LINKEDIN_CLIENT_ID) && <>
      <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <span style={{ padding: '0 15px', color: '#a0aec0', fontSize: '14px', fontWeight: '500' }}>{t('register.or')}</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError(t('register.error_google_cancel'))}
          style={{
            width: '100%', padding: '10px', backgroundColor: '#ffffff', color: '#4a5568',
            border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            fontWeight: '600', fontSize: '15px', transition: 'background-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" style={{ width: '20px', height: '20px' }} />
          {t('register.google')}
        </GoogleSignInButton>

        {LINKEDIN_CLIENT_ID && <button
          type="button"
          onClick={() => loginWithLinkedIn()}
          style={{
            width: '100%', padding: '10px', backgroundColor: '#0a66c2', color: '#ffffff',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            fontWeight: '600', fontSize: '15px', transition: 'background-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="20" height="20">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          {t('register.linkedin')}
        </button>}
      </div>
      </>}
    </div>
  );
}

export default Register;
