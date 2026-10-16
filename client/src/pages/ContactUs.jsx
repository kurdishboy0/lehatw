import { useTranslation } from 'react-i18next';
import abbasPhoto from '../assets/team/abbas-salihi.jpeg';
import ahmedPhoto from '../assets/team/ahmed-haji.jpeg';
import soranPhoto from '../assets/team/soran-noori.png';
import { toLocalizedDigits } from '../localizeDigits';
import { Phone, GraduationCap } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

// English shows the international format (+964, no leading 0). Arabic and
// Kurdish keep the local number, in Arabic-Indic digits and in two bracketed
// groups: the network prefix, then the subscriber number as one unbroken run,
// e.g. (٠٧٥٠) (٨٩٦٨٤٦٩). Splitting the second group would let the bidi
// algorithm reorder the pieces and read as a different number.
function formatPhoneDisplay(phone, lang) {
  const primary = (lang || '').split('-')[0];
  if (primary === 'en') return `+964 ${phone.replace(/^0/, '')}`;
  const [prefix, ...rest] = phone.split(' ');
  return toLocalizedDigits(`(${prefix}) (${rest.join('')})`, lang);
}

function phoneHref(phone) {
  return `tel:+964${phone.replace(/\s+/g, '').replace(/^0/, '')}`;
}

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m3 6.5 8.4 6.2a1 1 0 0 0 1.2 0L21 6.5" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0A66C2" width="15" height="15" style={{ verticalAlign: 'middle' }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const SUPERVISOR_EMAIL = 'abbas.salihi@su.edu.krd';
const SUPERVISOR_SCHOLAR_URL = 'https://scholar.google.com/citations?user=Q3XRBDMAAAAJ&hl=en';
const SUPERVISOR_LINKEDIN_URL = 'https://www.linkedin.com/in/abbas-salihi-7a1819119/';

const TEAM = [
  {
    photo: ahmedPhoto,
    name: 'Ahmed Haji',
    degreeKey: 'contactUs.team_ahmed_degree',
    email: 'ahmed.haji@knu.edu.iq',
    phone: '0750 896 8469',
    linkedinUrl: 'https://www.linkedin.com/in/ahmed-bradosty-190b7917a'
  },
  {
    photo: soranPhoto,
    name: 'Soran Bakhtyar Noori',
    degreeKey: 'contactUs.team_soran_degree',
    email: 'soran.noori@epu.edu.iq',
    phone: '0750 447 9072',
    linkedinUrl: 'https://www.linkedin.com/in/soran-rawandzy-560713400/'
  }
];

function PersonCard({ photo, name, details, email, phone, scholarUrl, linkedinUrl, emailLabel, phoneLabel, scholarLabel, linkedinLabel, accentGold }) {
  const { i18n } = useTranslation();
  return (
    <div style={{
      backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
      padding: '28px', textAlign: 'center', borderTop: accentGold ? '4px solid #C99A2E' : '4px solid #1B2A4A',
      boxShadow: '0 4px 12px rgba(27,42,74,0.06)'
    }}>
      <img
        src={photo}
        alt={name}
        style={{
          width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover',
          margin: '0 auto 16px auto', display: 'block', border: '3px solid #FCF6E3'
        }}
      />
      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1a202c' }}>{name}</h3>
      {(Array.isArray(details) ? details : [details]).filter(Boolean).map((line, i) => (
        <p key={i} style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>{line}</p>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '14px' }}>
        {email && (
          <a href={`mailto:${email}`} style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <EmailIcon /> {emailLabel}: {email}
          </a>
        )}
        {linkedinUrl && (
          <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LinkedInIcon /> {linkedinLabel}
          </a>
        )}
        {phone && (
          <a href={phoneHref(phone)} style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>
            <InlineIcon icon={Phone} tone="gold" /> {phoneLabel}: <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{formatPhoneDisplay(phone, i18n.language)}</span>
          </a>
        )}
        {scholarUrl && (
          <a href={scholarUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>
            <InlineIcon icon={GraduationCap} tone="gold" /> {scholarLabel}
          </a>
        )}
      </div>
    </div>
  );
}

function ContactUs() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto 60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <h1 style={{ fontSize: '2.2rem', color: '#1a202c', margin: '0 0 10px 0' }}>{t('contactUs.heading')}</h1>
        <p style={{ fontSize: '15px', color: '#718096', margin: '0 auto', maxWidth: '520px' }}>{t('contactUs.subtitle')}</p>
      </div>

      {/* SUPERVISOR */}
      <h2 style={{ fontSize: '14px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', textAlign: 'center' }}>
        {t('contactUs.supervisor_heading')}
      </h2>
      <div style={{ maxWidth: '320px', margin: '0 auto 48px auto' }}>
        <PersonCard
          photo={abbasPhoto}
          name={t('contactUs.supervisor_name')}
          details={[t('contactUs.supervisor_role'), t('contactUs.supervisor_specialization'), t('contactUs.supervisor_contact_note')]}
          email={SUPERVISOR_EMAIL}
          phone={null}
          scholarUrl={SUPERVISOR_SCHOLAR_URL}
          linkedinUrl={SUPERVISOR_LINKEDIN_URL}
          emailLabel={t('contactUs.email_label')}
          phoneLabel={t('contactUs.phone_label')}
          scholarLabel={t('contactUs.scholar_label')}
          linkedinLabel={t('contactUs.linkedin_label')}
          accentGold
        />
      </div>

      {/* DEVELOPMENT TEAM */}
      <h2 style={{ fontSize: '14px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', textAlign: 'center' }}>
        {t('contactUs.team_heading')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {TEAM.map((person) => (
          <PersonCard
            key={person.email}
            photo={person.photo}
            name={person.name}
            details={t(person.degreeKey)}
            email={person.email}
            phone={person.phone}
            linkedinUrl={person.linkedinUrl}
            emailLabel={t('contactUs.email_label')}
            phoneLabel={t('contactUs.phone_label')}
            linkedinLabel={t('contactUs.linkedin_label')}
          />
        ))}
      </div>
    </div>
  );
}

export default ContactUs;
