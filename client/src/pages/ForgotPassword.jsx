import PasswordVisibilityButton from '../components/PasswordVisibilityButton';
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

function ForgotPassword() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // Controls which form to show (1, 2, or 3)

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  // STEP 1: Request the OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.code === 'EMAIL_DELIVERY_UNAVAILABLE' ? t('qa.mail_unavailable') : err.response?.data?.code === 'INVALID_EMAIL' ? t('qa.invalid_email') : err.response?.data?.message || t('forgotPassword.error_send'));
    }
  };

  // STEP 2: Verify the 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/auth/verify-otp', { email, otp });
      setMessage(res.data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword.error_verify'));
    }
  };

  // STEP 3: Save the new Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Enforce Strong Password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError(t('forgotPassword.password_error'));
      return;
    }

    try {
      // The code travels with the new password: the server checks it again at
      // the moment the password changes, not only in the step before.
      const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
      alert(res.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword.error_reset'));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>{t('forgotPassword.title')}</h2>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

      {/* --- FORM 1: Enter Email --- */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>{t('forgotPassword.step1_desc')}</p>
          <input
            type="email"
            placeholder={t('forgotPassword.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#1B2A4A', color: 'white', border: 'none' }}>
            {t('forgotPassword.send_code')}
          </button>
        </form>
      )}

      {/* --- FORM 2: Enter OTP --- */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>{t('forgotPassword.step2_desc', { email })}</p>
          <input
            type="text"
            placeholder={t('forgotPassword.otp_placeholder')}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            maxLength="6"
            style={{ padding: '10px', fontSize: '16px', letterSpacing: '2px', textAlign: 'center' }}
          />
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}>
            {t('forgotPassword.verify_code')}
          </button>
        </form>
      )}

      {/* --- FORM 3: Enter New Password --- */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>{t('forgotPassword.step3_desc')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('forgotPassword.new_password_placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
              />
              <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword(value => !value)} />
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>{t('common.password_hint')}</span>
          </div>
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#1B2A4A', color: 'white', border: 'none' }}>
            {t('forgotPassword.reset_password')}
          </button>
        </form>
      )}

      {/* Back to Login Link */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/login" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '14px' }}>
          <InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('forgotPassword.back_to_login')}
        </a>
      </div>
    </div>
  );
}

export default ForgotPassword;
