import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import { formatDateTime, toLocalizedDigits } from '../localizeDigits';
import { eventText } from '../eventText';
import EventTypeBadge from '../components/EventTypeBadge';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
function EventCard({ event, lang, t }) {
  const num = (n) => toLocalizedDigits(String(n), lang);
  return (
    <article data-event-id={event.id} className="hover-lift" style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
            <EventTypeBadge type={event.type} />
            {event.isOnline && <span style={{ fontSize: '12px', color: '#276749', fontWeight: 600 }}>🌐 {t('events.online')}</span>}
            {event.registered && <span style={{ fontSize: '12px', color: '#276749', fontWeight: 700 }}>✓ {t('events.registered')}</span>}
          </div>
          <h3 style={{ margin: '0 0 4px 0' }}>
            <Link to={`/events/${event.id}`} style={{ color: '#1a202c', textDecoration: 'none' }} dir="auto">{eventText(event, 'title', lang)}</Link>
          </h3>
          <div style={{ fontSize: '14px', color: '#718096', lineHeight: 1.7 }}>
            <div>📅 {formatDateTime(event.startsAt, lang)}</div>
            {event.location && <div dir="auto">📍 {event.location}</div>}
            {event.host && <div dir="auto">{t('events.host', { host: event.host })}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'end', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          {event.capacity !== null && (
            <span style={{ fontSize: '13px', fontWeight: 700, color: event.spotsLeft === 0 ? '#9b2c2c' : '#4a5568' }}>
              {event.spotsLeft === 0 ? t('events.full') : t('events.spots_left', { count: num(event.spotsLeft) })}
            </span>
          )}
          <Link to={`/events/${event.id}`} style={{ padding: '9px 18px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {t('events.details')}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Events() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('when') === 'past' ? 'past' : 'upcoming';
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get('/api/events', { params: tab === 'past' ? { past: 1 } : {}, headers: authHeader() });
      setEvents(res.data);
    } catch {
      setError(t('events.error_load'));
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [tab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the tab changes
    load();
  }, [load]);

  return (
    <div>
      <div className="animate-fade-up" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #14213B 100%)', borderBottom: '3px solid #C99A2E', padding: '48px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.2rem', margin: '0 0 10px 0' }}>📅 {t('events.heading')}</h1>
        <p style={{ color: '#e6e9f0', fontSize: '1.05rem', margin: 0 }}>{t('events.subtitle')}</p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px 60px 20px', fontFamily: 'sans-serif' }}>
        <div role="tablist" aria-label={t('events.heading')} style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '22px', flexWrap: 'wrap' }}>
          {['upcoming', 'past'].map((key) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSearchParams(key === 'past' ? { when: 'past' } : {})}
                style={{
                  padding: '10px 16px', background: 'none', border: 'none', marginBottom: '-2px', cursor: 'pointer',
                  borderBottom: `3px solid ${selected ? '#C99A2E' : 'transparent'}`,
                  fontSize: '15px', fontWeight: selected ? 700 : 600, color: selected ? '#1B2A4A' : '#718096'
                }}
              >
                {t(`events.tab_${key}`)}
              </button>
            );
          })}
        </div>

        {error && <p role="alert" style={{ color: '#c53030', textAlign: 'center' }}>{error}</p>}
        {events === null ? (
          <p style={{ color: '#718096', textAlign: 'center' }}>{t('events.loading')}</p>
        ) : events.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center', marginTop: '40px' }}>{t(tab === 'past' ? 'events.none_past' : 'events.none_upcoming')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events.map((event) => <EventCard key={event.id} event={event} lang={lang} t={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;
