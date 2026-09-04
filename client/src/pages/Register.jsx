import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';

function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  // --- STANDARD EMAIL/PASSWORD REGISTRATION ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(t('register.password_error'));
      return;
    }

    try {
      await axios.post('/api/auth/register', {
        email: email,
        password: password,
        role: 'STUDENT',
        personalPhone: phone
      });

      navigate(`/verify-phone?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error("Registration Error:", err);
      setError(err.response?.data?.message || t('register.error_default'));
    }
  };

  // --- GOOGLE LOGIN/REGISTRATION LOGIC ---
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
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
    },
    onError: () => {
      setError(t('register.error_google_cancel'));
    }
  });

  // --- LINKEDIN REDIRECT LOGIC ---
  const loginWithLinkedIn = () => {
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    // We intentionally route them back to /login so the Login.jsx useEffect handles the account creation!
    const redirectUri = `${window.location.origin}/login`;
    const scope = 'openid profile email';
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2d3748' }}>{t('register.title')}</h2>

      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div className="field-wrap">
          <input
            type="email"
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
          />
          <span className="required-asterisk">*</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ position: 'relative', display: 'flex' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('register.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', insetInlineEnd: '40px', top: '12px', color: '#e53e3e', fontWeight: '700', fontSize: '15px', pointerEvents: 'none' }}>*</span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('common.hide_password') : t('common.show_password')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0'
              }}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                  <line x1="2" y1="2" x2="22" y2="22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          <span style={{ fontSize: '12px', color: '#718096' }}>
            {t('common.password_hint')}
          </span>
        </div>

        <button type="submit" style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', transition: 'background-color 0.2s' }}>
          {t('register.submit')}
        </button>
      </form>

      {/* --- SOCIAL LOGIN SECTION --- */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <span style={{ padding: '0 15px', color: '#a0aec0', fontSize: '14px', fontWeight: '500' }}>{t('register.or')}</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          style={{
            width: '100%', padding: '10px', backgroundColor: '#ffffff', color: '#4a5568',
            border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            fontWeight: '600', fontSize: '15px', transition: 'background-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" style={{ width: '20px', height: '20px' }} />
          {t('register.google')}
        </button>

        <button
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
        </button>
      </div>
    </div>
  );
}

export default Register;
