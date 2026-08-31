import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword.error_send'));
    }
  };

  // STEP 2: Verify the 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { email, otp });
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
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', { email, newPassword });
      alert(res.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword.error_reset'));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
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
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none' }}>
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
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t('forgotPassword.new_password_placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('common.hide_password') : t('common.show_password')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: '0'
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>{t('common.password_hint')}</span>
          </div>
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none' }}>
            {t('forgotPassword.reset_password')}
          </button>
        </form>
      )}

      {/* Back to Login Link */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/login" style={{ color: '#0056b3', textDecoration: 'none', fontSize: '14px' }}>
          {t('forgotPassword.back_to_login')}
        </a>
      </div>
    </div>
  );
}

export default ForgotPassword;
