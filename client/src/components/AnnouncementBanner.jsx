import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ANNOUNCEMENT_STYLES as STYLES } from './announcementStyles';
import InlineIcon from './InlineIcon';

const DISMISSED_KEY = 'lehatw_dismissed_announcements';
const REFRESH_MS = 5 * 60 * 1000;

function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || [];
  } catch {
    return [];
  }
}

// Site-wide notices posted from the admin console, in the visitor's language.
function AnnouncementBanner() {
  const { t, i18n } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let cancelled = false;
    const load = () => axios.get('/api/announcements/active')
      .then((res) => { if (!cancelled) setAnnouncements(res.data); })
      .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const dismiss = (id) => {
    const next = [...new Set([...dismissed, id])].slice(-50);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  const lang = (i18n.language || 'en').split('-')[0];
  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="announcement-banner" role="region" aria-label={t('announcementBanner.region')}>
      {visible.map((a) => {
        const style = STYLES[a.type] || STYLES.INFO;
        const message = a[`message_${lang}`] || a.message_en;
        return (
          <div
            key={a.id}
            data-announcement-id={a.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px',
              backgroundColor: style.bg, borderBottom: `1px solid ${style.border}`, color: style.color,
              fontSize: '14px', fontWeight: 600
            }}
          >
            <InlineIcon icon={style.icon} size={18} />
            <span style={{ flex: 1 }} dir="auto">{message}</span>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              aria-label={t('announcementBanner.dismiss')}
              title={t('announcementBanner.dismiss')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: style.color, fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default AnnouncementBanner;
