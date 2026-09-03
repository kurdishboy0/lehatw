import { useTranslation } from 'react-i18next';

function Section({ title, body }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '22px', color: '#1B2A4A', marginBottom: '10px' }}>{title}</h2>
      <p style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.8', margin: 0 }}>{body}</p>
    </div>
  );
}

function AboutUs() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: '820px', margin: '20px auto 60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '2.4rem', color: '#1a202c', margin: '0 0 12px 0' }}>{t('aboutUs.title')}</h1>
        <p style={{ fontSize: '1.15rem', color: '#718096', margin: 0 }}>{t('aboutUs.subtitle')}</p>
      </div>

      <Section title={t('aboutUs.mission_title')} body={t('aboutUs.mission_body')} />
      <Section title={t('aboutUs.what_title')} body={t('aboutUs.what_body')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', borderTop: '3px solid #C99A2E' }}>
          <h3 style={{ fontSize: '17px', color: '#1B2A4A', margin: '0 0 10px 0' }}>🎓 {t('aboutUs.students_title')}</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.7', margin: 0 }}>{t('aboutUs.students_body')}</p>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', borderTop: '3px solid #C99A2E' }}>
          <h3 style={{ fontSize: '17px', color: '#1B2A4A', margin: '0 0 10px 0' }}>💼 {t('aboutUs.companies_title')}</h3>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.7', margin: 0 }}>{t('aboutUs.companies_body')}</p>
        </div>
      </div>

      <Section title={t('aboutUs.goal_title')} body={t('aboutUs.goal_body')} />
    </div>
  );
}

export default AboutUs;
