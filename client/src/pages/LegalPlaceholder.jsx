import { useTranslation } from 'react-i18next';

function LegalPlaceholder({ titleKey }) {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', color: '#1a202c', marginBottom: '16px' }}>{t(titleKey)}</h1>
      <p style={{ fontSize: '15px', color: '#718096' }}>{t('legal.placeholder')}</p>
    </div>
  );
}

export default LegalPlaceholder;
