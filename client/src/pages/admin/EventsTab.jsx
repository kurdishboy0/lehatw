import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import EventTypeBadge from '../../components/EventTypeBadge';
import { eventText } from '../../eventText';
import { Badge, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';

const TYPES = ['ACADEMIC', 'COMPANY', 'CAREER_FAIR', 'WORKSHOP', 'OTHER'];
const STATUS_TONE = { draft: 'gray', upcoming: 'green', past: 'gray' };

// ISO timestamp <-> the local "YYYY-MM-DDTHH:mm" a datetime-local input uses.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

const statusOf = (event, now) => (!event.isPublished ? 'draft' : new Date(event.endsAt || event.startsAt) < now ? 'past' : 'upcoming');

function EventDialog({ event, onSaved, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    title_en: event?.title_en || '', title_ar: event?.title_ar || '', title_ckb: event?.title_ckb || '',
    description_en: event?.description_en || '', description_ar: event?.description_ar || '', description_ckb: event?.description_ckb || '',
    type: event?.type || 'ACADEMIC', host: event?.host || '', location: event?.location || '',
    isOnline: Boolean(event?.isOnline), onlineUrl: event?.onlineUrl || '',
    startsAt: toLocalInput(event?.startsAt), endsAt: toLocalInput(event?.endsAt),
    capacity: event?.capacity ?? '', registrationUrl: event?.registrationUrl || '',
    isPublished: event ? event.isPublished : true
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
      if (event) await axios.put(`/api/admin/events/${event.id}`, body, { headers: authHeader() });
      else await axios.post('/api/admin/events', body, { headers: authHeader() });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  const label = { fontSize: '14px', color: '#2d3748', fontWeight: 600 };
  const field = { ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 };

  return (
    <Dialog title={event ? t('adminConsole.events.edit_title') : t('adminConsole.events.new')} onClose={onClose} width={600}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {['en', 'ar', 'ckb'].map((l) => (
          <label key={l} style={label}>
            {t(`adminConsole.events.title_${l}`)}
            <input type="text" required={l === 'en'} dir={l === 'en' ? 'ltr' : 'rtl'} value={form[`title_${l}`]} onChange={set(`title_${l}`)} style={field} />
          </label>
        ))}
        {['en', 'ar', 'ckb'].map((l) => (
          <label key={l} style={label}>
            {t(`adminConsole.events.description_${l}`)}
            <textarea rows={l === 'en' ? 3 : 2} dir={l === 'en' ? 'ltr' : 'rtl'} value={form[`description_${l}`]} onChange={set(`description_${l}`)} style={field} />
          </label>
        ))}
        <p style={{ ...mutedStyle, margin: '-6px 0 0 0' }}>{t('adminConsole.events.fallback_hint')}</p>

        <div className="grid-2col">
          <label style={label}>
            {t('adminConsole.events.type')}
            <select value={form.type} onChange={set('type')} style={field}>
              {TYPES.map((type) => <option key={type} value={type}>{t(`events.type_${type}`)}</option>)}
            </select>
          </label>
          <label style={label}>
            {t('adminConsole.events.host')}
            <input type="text" dir="auto" value={form.host} onChange={set('host')} style={field} />
          </label>
          <label style={label}>
            {t('adminConsole.events.starts')}
            <input type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} style={field} />
          </label>
          <label style={label}>
            {t('adminConsole.events.ends')}
            <input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} style={field} />
          </label>
        </div>

        <label style={label}>
          {t('adminConsole.events.location')}
          <input type="text" dir="auto" value={form.location} onChange={set('location')} style={field} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
          <input type="checkbox" checked={form.isOnline} onChange={set('isOnline')} />
          {t('adminConsole.events.online')}
        </label>
        {form.isOnline && (
          <label style={label}>
            {t('adminConsole.events.online_url')}
            <input type="url" dir="ltr" value={form.onlineUrl} onChange={set('onlineUrl')} style={field} />
            <span style={{ ...mutedStyle, display: 'block', marginTop: '2px' }}>{t('adminConsole.events.online_url_hint')}</span>
          </label>
        )}

        <div className="grid-2col">
          <label style={label}>
            {t('adminConsole.events.capacity')}
            <input type="number" min="1" value={form.capacity} onChange={set('capacity')} style={field} />
            <span style={{ ...mutedStyle, display: 'block', marginTop: '2px' }}>{t('adminConsole.events.capacity_hint')}</span>
          </label>
          <label style={label}>
            {t('adminConsole.events.registration_url')}
            <input type="url" dir="ltr" value={form.registrationUrl} onChange={set('registrationUrl')} style={field} />
            <span style={{ ...mutedStyle, display: 'block', marginTop: '2px' }}>{t('adminConsole.events.registration_url_hint')}</span>
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
          <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} />
          {t('adminConsole.events.published')}
        </label>

        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.events.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function AttendeesDialog({ event, lang, onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`/api/admin/events/${event.id}/registrations`, { headers: authHeader() })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, [event.id]);

  return (
    <Dialog title={t('adminConsole.events.attendees_title', { title: eventText(event, 'title', lang) })} onClose={onClose} width={620}>
      {rows === null ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : rows.length === 0 ? (
        <p style={mutedStyle}>{t('adminConsole.events.no_attendees')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(rows.map((r) => r.email).join(', ')).then(() => setCopied(true)).catch(() => {})}
              style={buttonStyle('secondary')}
            >
              {copied ? t('adminConsole.events.copied') : t('adminConsole.events.copy_emails')}
            </button>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #edf2f7' }}>
                    <td style={{ padding: '7px 8px 7px 0' }}>
                      <div style={{ fontWeight: 600, color: '#1a202c' }} dir="auto">
                        {r.studentProfileId ? <Link to={`/students/${r.studentProfileId}`} style={{ color: '#1B2A4A' }}>{r.name || r.email}</Link> : (r.name || r.email)}
                      </div>
                      <div style={mutedStyle} dir="auto">{[r.university, r.fieldOfStudy].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      <div dir="ltr"><a href={`mailto:${r.email}`} style={{ color: '#1B2A4A' }}>{r.email}</a></div>
                      {r.phone && <div dir="ltr" style={mutedStyle}>{r.phone}</div>}
                    </td>
                    <td style={{ padding: '7px 0', textAlign: 'end', ...mutedStyle }}>{formatDateTime(r.registeredAt, lang, { withTime: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onClose} style={buttonStyle('primary')}>{t('adminConsole.users.close')}</button>
      </div>
    </Dialog>
  );
}

function EventsTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [events, setEvents] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(null); // {} for new, or the event
  const [deleting, setDeleting] = useState(null);
  const [attendees, setAttendees] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/events', { headers: authHeader() });
      setEvents(res.data);
      setNow(Date.now());
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const remove = async () => {
    await axios.delete(`/api/admin/events/${deleting.id}`, { headers: authHeader() });
    setDeleting(null);
    notify(t('adminConsole.events.deleted'));
    load();
  };

  if (!events) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', flex: '1 1 300px' }}>{t('adminConsole.events.intro')}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/events" target="_blank" rel="noreferrer" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>{t('adminConsole.events.view_page')}</Link>
          <button type="button" onClick={() => setEditing({})} style={buttonStyle('primary')}>➕ {t('adminConsole.events.new')}</button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState>{t('adminConsole.events.none')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((event) => {
            const status = statusOf(event, now);
            return (
              <div key={event.id} data-event-row={event.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <EventTypeBadge type={event.type} />
                    <Badge tone={STATUS_TONE[status]}>{t(`adminConsole.events.status_${status}`)}</Badge>
                    {event.isOnline && <span style={{ fontSize: '12px', color: '#276749', fontWeight: 600 }}>🌐 {t('events.online')}</span>}
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">{eventText(event, 'title', lang)}</strong>
                  <div style={{ ...mutedStyle, marginTop: '2px', lineHeight: 1.7 }}>
                    <div>📅 {formatDateTime(event.startsAt, lang)}</div>
                    {event.location && <div dir="auto">📍 {event.location}</div>}
                    <div>
                      {t('adminConsole.events.registrations', { count: num(event.registrationCount) })}
                      {event.capacity !== null && ` / ${num(event.capacity)}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {!event.registrationUrl && (
                    <button type="button" onClick={() => setAttendees(event)} style={buttonStyle('secondary')}>{t('adminConsole.events.attendees')}</button>
                  )}
                  <button type="button" onClick={() => setEditing(event)} style={buttonStyle('secondary')}>{t('adminConsole.events.edit')}</button>
                  <button type="button" onClick={() => setDeleting(event)} style={buttonStyle('danger')}>{t('adminConsole.events.delete')}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EventDialog
          event={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); notify(t('adminConsole.events.saved')); load(); }}
        />
      )}
      {attendees && <AttendeesDialog event={attendees} lang={lang} onClose={() => setAttendees(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t('adminConsole.events.delete')}
          message={t('adminConsole.events.delete_confirm')}
          confirmLabel={t('adminConsole.events.delete')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default EventsTab;
