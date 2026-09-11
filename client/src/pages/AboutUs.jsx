import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function Section({ title, body }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '22px', color: '#1B2A4A', marginBottom: '10px' }}>{title}</h2>
      <p style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.8', margin: 0 }}>{body}</p>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="hover-lift" style={{
      backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
      padding: '28px 20px', textAlign: 'center', borderTop: '4px solid #1B2A4A'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1B2A4A', lineHeight: 1 }}>
        {value === null ? '—' : value.toLocaleString()}
      </div>
      <div style={{ fontSize: '14px', color: '#718096', marginTop: '8px', fontWeight: '600' }}>{label}</div>
    </div>
  );
}

function AboutUs() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/api/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: '820px', margin: '20px auto 60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.4rem', color: '#1a202c', margin: '0 0 12px 0' }}>{t('aboutUs.title')}</h1>
        <p style={{ fontSize: '1.15rem', color: '#718096', margin: 0 }}>{t('aboutUs.subtitle')}</p>
      </div>

      <div className="animate-fade-up card-grid-3col" style={{ marginBottom: '48px', animationDelay: '0.1s' }}>
        <StatCard icon="🎓" value={stats?.studentCount ?? null} label={t('aboutUs.stat_students')} />
        <StatCard icon="🏢" value={stats?.companyCount ?? null} label={t('aboutUs.stat_companies')} />
        <StatCard icon="💼" value={stats?.jobCount ?? null} label={t('aboutUs.stat_jobs')} />
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
