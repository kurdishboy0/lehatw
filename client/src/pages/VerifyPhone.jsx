import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useAuth';

function VerifyPhone() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [channel, setChannel] = useState('email');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const autoSent = useRef(false);

  const sendCode = async (selectedChannel) => {
    setSending(true);
    setError('');
    setInfo('');
    try {
      const res = await axios.post('/api/auth/send-phone-otp', { email, channel: selectedChannel });
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
      sendCode('email');
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
      <div style={{ maxWidth: '440px', margin: '60px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>{t('verifyPhone.missing_email')}</p>
        <Link to="/register" style={{ color: '#1B2A4A', fontWeight: '600' }}>{t('verifyPhone.back_to_register')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2d3748' }}>{t('verifyPhone.title')}</h2>
      <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>{t('verifyPhone.subtitle')}</p>

      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center', fontSize: '14px' }}>{error}</p>}
      {info && !error && <p style={{ color: '#2f855a', textAlign: 'center', fontSize: '14px' }}>{info}</p>}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '18px 0' }}>
        <button
          type="button"
          onClick={() => { setChannel('email'); sendCode('email'); }}
          disabled={sending}
          style={{
            padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            border: channel === 'email' ? '2px solid #1B2A4A' : '1px solid #cbd5e0',
            backgroundColor: channel === 'email' ? '#FCF6E3' : '#ffffff', color: '#1B2A4A'
          }}
        >
          📧 {t('verifyPhone.via_email')}
        </button>
        <button
          type="button"
          onClick={() => { setChannel('sms'); sendCode('sms'); }}
          disabled={sending}
          style={{
            padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            border: channel === 'sms' ? '2px solid #1B2A4A' : '1px solid #cbd5e0',
            backgroundColor: channel === 'sms' ? '#FCF6E3' : '#ffffff', color: '#1B2A4A'
          }}
        >
          📱 {t('verifyPhone.via_sms')}
        </button>
      </div>

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
        <button type="button" onClick={() => sendCode(channel)} disabled={sending} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
          {t('verifyPhone.resend')}
        </button>
      </p>
    </div>
  );
}

export default VerifyPhone;
