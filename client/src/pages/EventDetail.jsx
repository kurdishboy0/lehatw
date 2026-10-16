import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { formatDateTime, toLocalizedDigits } from '../localizeDigits';
import { eventText } from '../eventText';
import EventTypeBadge from '../components/EventTypeBadge';
import { ArrowLeft, Globe, CalendarDays, MapPin, Landmark, Users, Check } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

function EventDetail() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const { id } = useParams();
  const user = getUser();

  const [event, setEvent] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/events/${id}`, { headers: authHeader() })
      .then((res) => setEvent(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  const setRegistration = async (join) => {
    setBusy(true);
    setError('');
    try {
      const config = { headers: authHeader() };
      if (join) await axios.post(`/api/events/${id}/register`, {}, config);
      else await axios.delete(`/api/events/${id}/register`, config);
      const res = await axios.get(`/api/events/${id}`, { headers: authHeader() });
      setEvent(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t('events.error_register'));
    } finally {
      setBusy(false);
    }
  };

  if (notFound) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('events.not_found')}</p>;
  if (!event) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('events.loading')}</p>;

  const finished = new Date(event.endsAt || event.startsAt) < new Date();
  const full = event.capacity !== null && event.spotsLeft === 0 && !event.registered;
  const description = eventText(event, 'description', lang);

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
      <Link to="/events" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}><InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('events.back')}</Link>

      <div style={{ ...cardStyle, marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
          <EventTypeBadge type={event.type} />
          {event.isOnline && <span style={{ fontSize: '13px', color: '#276749', fontWeight: 600 }}><InlineIcon icon={Globe} /> {t('events.online')}</span>}
          {finished && <span style={{ fontSize: '13px', color: '#9b2c2c', fontWeight: 600 }}>{t('events.finished')}</span>}
        </div>

        <h1 style={{ fontSize: '26px', color: '#1a202c', margin: '0 0 10px 0' }} dir="auto">{eventText(event, 'title', lang)}</h1>

        <div style={{ fontSize: '15px', color: '#4a5568', lineHeight: 1.9 }}>
          <div><InlineIcon icon={CalendarDays} tone="gold" /> {formatDateTime(event.startsAt, lang)}{event.endsAt ? ` - ${formatDateTime(event.endsAt, lang)}` : ''}</div>
          {event.location && <div dir="auto"><InlineIcon icon={MapPin} tone="gold" /> {event.location}</div>}
          {event.host && <div dir="auto"><InlineIcon icon={Landmark} tone="gold" /> {t('events.host', { host: event.host })}</div>}
          <div><InlineIcon icon={Users} tone="gold" /> {t('events.attendees', { count: num(event.registrationCount) })}
            {event.capacity !== null && <> · {event.spotsLeft === 0 ? t('events.full') : t('events.spots_left', { count: num(event.spotsLeft) })}</>}
          </div>
        </div>

        {description && <p style={{ marginTop: '18px', color: '#2d3748', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }} dir="auto">{description}</p>}

        {event.onlineUrl && (
          <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#e6f4ea' }}>
            <strong style={{ color: '#276749', fontSize: '14px' }}>{t('events.join_link')}</strong>
            <div><a href={event.onlineUrl} target="_blank" rel="noreferrer" dir="ltr" style={{ color: '#1B2A4A', wordBreak: 'break-all' }}>{event.onlineUrl}</a></div>
            <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>{t('events.join_hint')}</div>
          </div>
        )}

        {error && <p role="alert" style={{ color: '#c53030', fontSize: '14px', marginTop: '14px' }}>{error}</p>}

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {event.registrationUrl ? (
            <a href={event.registrationUrl} target="_blank" rel="noreferrer" style={{ padding: '12px 24px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
              {t('events.external_register')}
            </a>
          ) : finished ? null : !user ? (
            <p style={{ margin: 0, color: '#718096' }}>
              <Link to="/login" style={{ color: '#1B2A4A', fontWeight: 600 }}>{t('events.login_to_register')}</Link>
            </p>
          ) : event.registered ? (
            <>
              <span style={{ padding: '12px 20px', backgroundColor: '#e6f4ea', color: '#276749', borderRadius: '8px', fontWeight: 700 }}><InlineIcon icon={Check} /> {t('events.registered')}</span>
              <button type="button" disabled={busy} onClick={() => setRegistration(false)} style={{ padding: '12px 20px', background: 'none', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer', color: '#4a5568', fontWeight: 600 }}>
                {t('events.cancel_registration')}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || full}
              onClick={() => setRegistration(true)}
              style={{ padding: '12px 28px', backgroundColor: full ? '#a0aec0' : '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: full ? 'not-allowed' : 'pointer' }}
            >
              {full ? t('events.full') : t('events.register')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetail;
