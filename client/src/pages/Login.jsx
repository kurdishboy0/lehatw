import { useState, useEffect, useRef } from 'react'; 
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; 
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';
import { isAccountBlock, describeAccountBlock, readStoredAccountBlock, clearStoredAccountBlock } from '../accountBlock';

const LINKEDIN_STATE_KEY = 'lehatw_linkedin_state';

// Where LinkedIn sends the user back: this site's own login page, so it works
// on localhost and in production alike (each must be registered on the app).
const linkedinRedirectUri = () => `${window.location.origin}/login`;

function dashboardFor(role) {
  if (role === 'STUDENT') return '/student-dashboard';
  if (role === 'HR') return '/hr-dashboard';
  if (role === 'INSTRUCTOR') return '/instructor-dashboard';
  if (role === 'ADMIN') return '/admin-dashboard';
  return '/';
}

function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Set when a login attempt, or a mid-session request, was refused because the
  // account is banned/suspended. Kept apart from `error` so it re-translates.
  const [accountBlock, setAccountBlock] = useState(() => readStoredAccountBlock());

  const navigate = useNavigate();
  const { login } = useAuth();
  const hasFetched = useRef(false); // Tracks if the code was already sent

  useEffect(() => {
    clearStoredAccountBlock();
  }, []);

  const showLoginFailure = (err, fallback) => {
    const data = err.response?.data;
    if (isAccountBlock(data)) {
      setAccountBlock(data);
    } else {
      setError(fallback);
    }
  };

  // --- 1. LINKEDIN OAUTH EFFECT ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !hasFetched.current) {
      hasFetched.current = true; // Lock it so it only runs once

      // IMMEDIATELY clear the '?code=...' from the URL to stop double-firing
      window.history.replaceState({}, document.title, window.location.pathname);

      // The state must match what we sent, so a forged redirect can't log
      // someone into an account they didn't choose.
      const expectedState = sessionStorage.getItem(LINKEDIN_STATE_KEY);
      sessionStorage.removeItem(LINKEDIN_STATE_KEY);
      if (!expectedState || urlParams.get('state') !== expectedState) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time result of the OAuth redirect
        setError(t('login.error_linkedin'));
        return;
      }

      axios.post('/api/auth/linkedin', { code, redirectUri: linkedinRedirectUri() })
        .then(res => {
          login(res.data.token, res.data.user);
          alert(t('login.linkedin_success'));
          navigate(dashboardFor(res.data.user.role));
        })
        .catch(err => {
          console.error("LinkedIn Auth Error:", err);
          showLoginFailure(err, t('login.error_linkedin'));
        });
    }
  }, [navigate, login, t]);

  // --- STANDARD EMAIL/PASSWORD LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAccountBlock(null);

    try {
      const response = await axios.post('/api/auth/login', {
        email: email,
        password: password
      });

      login(response.data.token, response.data.user);
      alert(t('login.success'));
      navigate(dashboardFor(response.data.user.role));
    } catch (err) {
      if (err.response?.data?.code === 'PHONE_NOT_VERIFIED') {
        navigate(`/verify-phone?email=${encodeURIComponent(email)}`);
        return;
      }
      showLoginFailure(err, err.response?.data?.message || t('login.error_default'));
    }
  };

  // --- GOOGLE LOGIN LOGIC ---
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('/api/auth/google', {
          token: tokenResponse.access_token,
        });

        login(res.data.token, res.data.user);
        alert(t('login.google_success'));
        navigate(dashboardFor(res.data.user.role));
      } catch (err) {
        console.error("Google Login Error:", err);
        showLoginFailure(err, t('login.error_google'));
      }
    },
    onError: () => {
      setError(t('login.error_google_cancel'));
    }
  });

  // --- LINKEDIN REDIRECT LOGIC ---
  const loginWithLinkedIn = () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem(LINKEDIN_STATE_KEY, state);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
      redirect_uri: linkedinRedirectUri(),
      scope: 'openid profile email',
      state
    });
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2d3748' }}>{t('login.title')}</h2>

      {accountBlock && (
        <div role="alert" style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', color: '#9b2c2c', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', marginTop: '12px' }}>
          {describeAccountBlock(accountBlock, t, i18n.language)}
        </div>
      )}
      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="field-wrap">
          <input
            type="email"
            placeholder={t('login.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', boxSizing: 'border-box' }}
          />
          <span className="required-asterisk">*</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div className="field-wrap">
            <input
              type="password"
              placeholder={t('login.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box', width: '100%' }}
            />
            <span className="required-asterisk">*</span>
          </div>
          <Link to="/forgot-password" style={{ fontSize: '13px', color: '#1B2A4A', textDecoration: 'none', alignSelf: 'flex-end', fontWeight: '500' }}>
            {t('login.forgot_password')}
          </Link>
        </div>

        <button type="submit" style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', transition: 'background-color 0.2s' }}>
          {t('login.submit')}
        </button>
      </form>

      {/* --- SOCIAL LOGIN SECTION --- */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <span style={{ padding: '0 15px', color: '#a0aec0', fontSize: '14px', fontWeight: '500' }}>{t('login.or')}</span>
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
          {t('login.google')}
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
          {t('login.linkedin')}
        </button>
      </div>
    </div>
  );
}

export default Login;