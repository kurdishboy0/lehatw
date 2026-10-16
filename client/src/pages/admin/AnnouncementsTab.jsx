import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime } from '../../localizeDigits';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { ANNOUNCEMENT_STYLES } from '../../components/announcementStyles';
import { Badge, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';
import { Plus } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const TYPES = ['INFO', 'WARNING', 'SUCCESS'];
const STATUS_TONE = { live: 'green', scheduled: 'blue', ended: 'gray', off: 'gray' };

// ISO timestamp <-> the local "YYYY-MM-DDTHH:mm" a datetime-local input uses.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

function statusOf(a, now) {
  if (!a.isActive) return 'off';
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return 'ended';
  if (a.startsAt && new Date(a.startsAt).getTime() > now) return 'scheduled';
  return 'live';
}

function BannerPreview({ type, message }) {
  const style = ANNOUNCEMENT_STYLES[type] || ANNOUNCEMENT_STYLES.INFO;
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.color, fontSize: '14px', fontWeight: 600 }}>
      <InlineIcon icon={style.icon} size={16} />
      <span dir="auto">{message}</span>
    </div>
  );
}

function AnnouncementDialog({ announcement, onSaved, onClose }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(() => ({
    message_en: announcement?.message_en || '',
    message_ar: announcement?.message_ar || '',
    message_ckb: announcement?.message_ckb || '',
    type: announcement?.type || 'INFO',
    isActive: announcement ? announcement.isActive : true,
    startsAt: toLocalInput(announcement?.startsAt),
    endsAt: toLocalInput(announcement?.endsAt)
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
      if (announcement) await axios.put(`/api/admin/announcements/${announcement.id}`, body, { headers: authHeader() });
      else await axios.post('/api/admin/announcements', body, { headers: authHeader() });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  const lang = (i18n.language || 'en').split('-')[0];
  const previewText = form[`message_${lang}`] || form.message_en;
  const label = { fontSize: '14px', color: '#2d3748', fontWeight: 600 };
  const field = { ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 };

  return (
    <Dialog title={announcement ? t('adminConsole.announcements.edit_title') : t('adminConsole.announcements.new')} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {['en', 'ar', 'ckb'].map((l) => (
          <label key={l} style={label}>
            {t(`adminConsole.announcements.message_${l}`)}
            <textarea value={form[`message_${l}`]} onChange={set(`message_${l}`)} rows={2} maxLength={300} required={l === 'en'} dir={l === 'en' ? 'ltr' : 'rtl'} style={field} />
          </label>
        ))}
        <p style={{ ...mutedStyle, margin: '-4px 0 0 0' }}>{t('adminConsole.announcements.fallback_hint')}</p>
        <div className="grid-2col">
          <label style={label}>
            {t('adminConsole.announcements.type')}
            <select value={form.type} onChange={set('type')} style={field}>
              {TYPES.map((type) => <option key={type} value={type}>{t(`adminConsole.announcements.type_${type}`)}</option>)}
            </select>
          </label>
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            {t('adminConsole.announcements.active')}
          </label>
          <label style={label}>
            {t('adminConsole.announcements.starts')}
            <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} style={field} />
          </label>
          <label style={label}>
            {t('adminConsole.announcements.ends')}
            <input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} style={field} />
          </label>
        </div>
        {form.message_en.trim() && (
          <div>
            <div style={{ ...label, marginBottom: '6px' }}>{t('adminConsole.announcements.preview')}</div>
            <BannerPreview type={form.type} message={previewText} />
          </div>
        )}
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.announcements.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function AnnouncementsTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [list, setList] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(null); // {} for new, or the announcement
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/announcements', { headers: authHeader() });
      setList(res.data);
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

  const toggle = async (a) => {
    try {
      await axios.put(`/api/admin/announcements/${a.id}`, { ...a, isActive: !a.isActive }, { headers: authHeader() });
      notify(t('adminConsole.announcements.saved'));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const remove = async () => {
    await axios.delete(`/api/admin/announcements/${deleting.id}`, { headers: authHeader() });
    setDeleting(null);
    notify(t('adminConsole.announcements.deleted'));
    load();
  };

  if (!list) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;
  const primary = (lang || 'en').split('-')[0];

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', flex: '1 1 300px' }}>{t('adminConsole.announcements.intro')}</p>
        <button type="button" onClick={() => setEditing({})} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.announcements.new')}</button>
      </div>

      {list.length === 0 ? (
        <EmptyState>{t('adminConsole.announcements.none')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map((a) => {
            const status = statusOf(a, now);
            return (
              <div key={a.id} data-announcement-row={a.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <Badge tone={STATUS_TONE[status]}>{t(`adminConsole.announcements.status_${status}`)}</Badge>
                  <span style={mutedStyle}>{t(`adminConsole.announcements.type_${a.type}`)}</span>
                  {a.startsAt && <span style={mutedStyle}>· {t('adminConsole.announcements.window_from', { date: formatDateTime(a.startsAt, lang) })}</span>}
                  {a.endsAt && <span style={mutedStyle}>· {t('adminConsole.announcements.window_until', { date: formatDateTime(a.endsAt, lang) })}</span>}
                </div>
                <BannerPreview type={a.type} message={a[`message_${primary}`] || a.message_en} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={mutedStyle}>{t('adminConsole.announcements.posted_by', { email: a.createdBy?.email || '-', date: formatDateTime(a.createdAt, lang) })}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => toggle(a)} style={buttonStyle('secondary')}>
                      {a.isActive ? t('adminConsole.announcements.turn_off') : t('adminConsole.announcements.turn_on')}
                    </button>
                    <button type="button" onClick={() => setEditing(a)} style={buttonStyle('secondary')}>{t('adminConsole.announcements.edit')}</button>
                    <button type="button" onClick={() => setDeleting(a)} style={buttonStyle('danger')}>{t('adminConsole.announcements.delete')}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <AnnouncementDialog
          announcement={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); notify(t('adminConsole.announcements.saved')); load(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('adminConsole.announcements.delete')}
          message={t('adminConsole.announcements.delete_confirm')}
          confirmLabel={t('adminConsole.announcements.delete')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default AnnouncementsTab;
