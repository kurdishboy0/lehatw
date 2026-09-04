import { useTranslation } from 'react-i18next';

function LegalPlaceholder({ titleKey, introKey, sectionsKey }) {
  const { t } = useTranslation();
  const sections = t(sectionsKey, { returnObjects: true });

  return (
    <div style={{ maxWidth: '780px', margin: '20px auto 60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', color: '#1a202c', margin: '0 0 8px 0' }}>{t(titleKey)}</h1>
        <p style={{ fontSize: '13px', color: '#a0aec0', margin: 0 }}>{t('legal.last_updated')}</p>
      </div>

      <p style={{ fontSize: '15px', color: '#4a5568', lineHeight: '1.8', marginBottom: '32px' }}>
        {t(introKey)}
      </p>

      {Array.isArray(sections) && sections.map((section, i) => (
        <div key={i} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', color: '#1B2A4A', marginBottom: '8px', borderBottom: '2px solid #FCF6E3', paddingBottom: '8px' }}>
            {i + 1}. {section.title}
          </h2>
          <p style={{ fontSize: '15px', color: '#4a5568', lineHeight: '1.8', margin: 0 }}>{section.body}</p>
        </div>
      ))}
    </div>
  );
}

export default LegalPlaceholder;
