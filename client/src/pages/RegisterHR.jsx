import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function RegisterHR() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailDomain = email.split('@')[1];
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

    if (freeDomains.includes(emailDomain)) {
      setError(t('registerHr.free_domain_error'));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(t('registerHr.password_error'));
      return;
    }

    try {
      await axios.post('/api/auth/register', {
        email: email,
        password: password,
        role: 'HR',
        companyName: companyName,
        website: website,
        phone: phone,
        address: address,
        taxId: taxId
      });

      navigate(`/verify-phone?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.response?.data?.message || t('registerHr.error_default'));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>{t('registerHr.title')}</h2>
      <p style={{ fontSize: '14px', color: '#666' }}>{t('registerHr.subtitle')}</p>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div className="field-wrap">
          <input type="text" placeholder={t('registerHr.company_name_placeholder')} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          <span className="required-asterisk">*</span>
        </div>
        <div className="field-wrap">
          <input type="url" placeholder={t('registerHr.website_placeholder')} value={website} onChange={(e) => setWebsite(e.target.value)} required style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          <span className="required-asterisk">*</span>
        </div>
        <div className="field-wrap">
          <input type="tel" placeholder={t('registerHr.phone_placeholder')} value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          <span className="required-asterisk">*</span>
        </div>
        <div className="field-wrap">
          <input type="text" placeholder={t('registerHr.address_placeholder')} value={address} onChange={(e) => setAddress(e.target.value)} required style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          <span className="required-asterisk">*</span>
        </div>
        <input type="text" placeholder={t('registerHr.tax_id_placeholder')} value={taxId} onChange={(e) => setTaxId(e.target.value)} style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />

        <hr style={{ border: '0.5px solid #eee', width: '100%' }} />

        <div className="field-wrap">
          <input type="email" placeholder={t('registerHr.email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          <span className="required-asterisk">*</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ position: 'relative', display: 'flex' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('registerHr.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', color: '#e53e3e', fontWeight: '700', fontSize: '15px', pointerEvents: 'none' }}>*</span>
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
                // Eye-Off Icon (Standard UI)
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                  <line x1="2" y1="2" x2="22" y2="22"></line>
                </svg>
              ) : (
                // Eye Icon (Standard UI)
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {t('common.password_hint')}
          </span>
        </div>

        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#1B2A4A', color: 'white', border: 'none' }}>
          {t('registerHr.submit')}
        </button>
      </form>
    </div>
  );
}

export default RegisterHR;
