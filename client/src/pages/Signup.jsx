import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Building2, ArrowRight, Check } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

// One door into the two registration flows that already exist. The forms
// themselves are untouched: this page only asks which one you want.
const PATHS = [
  {
    to: '/register',
    icon: GraduationCap,
    titleKey: 'signup.talent_title',
    bodyKey: 'signup.talent_body',
    pointKeys: ['signup.talent_point_1', 'signup.talent_point_2', 'signup.talent_point_3'],
    ctaKey: 'signup.talent_cta'
  },
  {
    to: '/register-hr',
    icon: Building2,
    titleKey: 'signup.company_title',
    bodyKey: 'signup.company_body',
    pointKeys: ['signup.company_point_1', 'signup.company_point_2', 'signup.company_point_3'],
    ctaKey: 'signup.company_cta'
  }
];

function Signup() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: '980px', margin: '48px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '34px' }}>
        <h1 className="heading-serif" style={{ fontSize: '2.1rem', color: 'var(--color-navy-900)', margin: '0 0 10px 0' }}>
          {t('signup.heading')}
        </h1>
        <p style={{ color: 'var(--color-ink-500)', fontSize: '1.05rem', margin: 0 }}>{t('signup.subtitle')}</p>
      </div>

      <div className="grid-2col">
        {PATHS.map((path) => (
          <div
            key={path.to}
            className="hover-lift"
            data-signup-path={path.to}
            style={{
              display: 'flex', flexDirection: 'column', gap: '14px', padding: '30px 26px',
              backgroundColor: '#ffffff', border: '1px solid var(--color-ink-200)',
              borderTop: '4px solid var(--color-navy-900)', borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--color-gold-100)'
            }}>
              <InlineIcon icon={path.icon} size={26} tone="gold" strokeWidth={1.6} />
            </span>

            <h2 className="heading-serif" style={{ fontSize: '1.35rem', color: 'var(--color-navy-900)', margin: 0 }}>
              {t(path.titleKey)}
            </h2>
            <p style={{ color: 'var(--color-ink-700)', fontSize: '15px', lineHeight: 1.65, margin: 0 }}>
              {t(path.bodyKey)}
            </p>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {path.pointKeys.map((key) => (
                <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '14px', color: 'var(--color-ink-700)' }}>
                  <InlineIcon icon={Check} size={16} tone="gold" style={{ marginTop: '3px' }} />
                  {t(key)}
                </li>
              ))}
            </ul>

            <Link
              to={path.to}
              style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 22px', borderRadius: '24px', backgroundColor: 'var(--color-navy-900)',
                color: '#ffffff', fontSize: '15px', fontWeight: 700, textDecoration: 'none'
              }}
            >
              {t(path.ctaKey)}
              <InlineIcon icon={ArrowRight} size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: '26px', fontSize: '14px', color: 'var(--color-ink-500)' }}>
        {t('signup.instructor_prompt')}{' '}
        <Link to="/register-instructor" style={{ color: 'var(--color-navy-900)', fontWeight: 600 }}>
          {t('signup.instructor_link')}
        </Link>
      </p>

      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: 'var(--color-ink-500)' }}>
        {t('signup.have_account')}{' '}
        <Link to="/login" style={{ color: 'var(--color-navy-900)', fontWeight: 600 }}>
          {t('nav.login')}
        </Link>
      </p>
    </div>
  );
}

export default Signup;
