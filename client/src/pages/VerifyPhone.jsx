import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';

// Account verification is email-only for now (SMS needs a paid provider and
// a business registration to set up properly — see the phone_unverified_hint
// copy shown to HR). The phone number itself is still collected and shown to
// recruiters as unverified contact info; re-add an SMS channel toggle here
// later if it turns out people actually want it.
function VerifyPhone() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const autoSent = useRef(false);

  const sendCode = async () => {
    setSending(true);
    setError('');
    setInfo('');
    try {
      const res = await axios.post('/api/auth/send-phone-otp', { email, channel: 'email' });
      setInfo(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || t('verifyPhone.error_send'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (email && !autoSent.current) {
      autoSent.current = true;
      sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once on mount for the email in the URL
  }, [email]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await axios.post('/api/auth/verify-phone-otp', { email, otp });
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      navigate(role === 'STUDENT' ? '/student-dashboard' : role === 'HR' ? '/hr-dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.message || t('verifyPhone.error_verify'));
    } finally {
      setVerifying(false);
    }
  };

  if (!email) {
    return (
      <div style={{ maxWidth: '440px', margin: '60px auto', textAlign: 'center' }}>
        <p>{t('verifyPhone.missing_email')}</p>
        <Link to="/register" style={{ color: '#1B2A4A', fontWeight: '600' }}>{t('verifyPhone.back_to_register')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto' }}>
      <h2 style={{ textAlign: 'center', color: '#2d3748' }}>{t('verifyPhone.title')}</h2>
      <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>{t('verifyPhone.subtitle')}</p>

      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center', fontSize: '14px' }}>{error}</p>}
      {info && !error && <p style={{ color: '#2f855a', textAlign: 'center', fontSize: '14px' }}>{info}</p>}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '18px' }}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('verifyPhone.code_placeholder')}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          style={{ padding: '14px', fontSize: '20px', letterSpacing: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e0' }}
        />
        <button
          type="submit"
          disabled={verifying || otp.length !== 6}
          style={{
            padding: '12px', fontSize: '16px', cursor: verifying ? 'default' : 'pointer',
            backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '6px',
            fontWeight: 'bold', opacity: otp.length !== 6 ? 0.6 : 1
          }}
        >
          {verifying ? t('verifyPhone.verifying') : t('verifyPhone.submit')}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#a0aec0', marginTop: '16px' }}>
        {t('verifyPhone.no_code')}{' '}
        <button type="button" onClick={sendCode} disabled={sending} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
          {t('verifyPhone.resend')}
        </button>
      </p>
    </div>
  );
}

export default VerifyPhone;
