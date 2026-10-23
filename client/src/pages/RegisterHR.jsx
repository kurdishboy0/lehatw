import PasswordVisibilityButton from '../components/PasswordVisibilityButton';
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
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
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
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('registerHr.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
            />
            <span className="required-asterisk" aria-hidden="true">*</span>
            <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword(value => !value)} />
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
