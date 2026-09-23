import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { COURSE_LEVELS, COURSE_LANGUAGES, COURSE_DELIVERIES } from '../../courseDisplay';

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', marginTop: '4px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#2d3748', display: 'block' };
const hintStyle = { fontSize: '13px', color: '#718096', margin: '2px 0 0 0' };
const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// The course form, used by instructors for their own courses and by admins
// writing one for an instructor (who then also pick the instructor).
function CourseForm({ course, extraFields, onSubmit, onClose, titleText }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(() => ({
    title: course?.title || '', summary: course?.summary || '', description: course?.description || '',
    level: course?.level || 'ALL_LEVELS', language: course?.language || 'ENGLISH', delivery: course?.delivery || 'ONLINE',
    location: course?.location || '', priceIqd: course?.priceIqd ?? 0, durationHours: course?.durationHours ?? '',
    startsAt: toLocalInput(course?.startsAt), externalUrl: course?.externalUrl || '', coverImageUrl: course?.coverImageUrl || '',
    skillIds: course?.skills?.map((s) => s.id) || []
  }));
  const [skills, setSkills] = useState([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    axios.get('/api/jobs/skills').then((res) => setSkills(res.data)).catch(() => {});
  }, []);

  const matches = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const list = q ? skills.filter((s) => ['en', 'ar', 'ckb'].some((l) => (s[`name_${l}`] || '').toLowerCase().includes(q))) : skills;
    return list.slice(0, 40);
  }, [skills, skillQuery]);

  const toggleSkill = (id) => setForm((f) => ({ ...f, skillIds: f.skillIds.includes(id) ? f.skillIds.filter((x) => x !== id) : [...f.skillIds, id] }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit({ ...form, startsAt: form.startsAt ? new Date(`${form.startsAt}T09:00:00`).toISOString() : null });
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  const selected = skills.filter((s) => form.skillIds.includes(s.id));

  return (
    <Dialog title={titleText} onClose={onClose} width={640}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {extraFields}

        <label style={labelStyle}>
          {t('instructorCourses.title')}
          <input type="text" required dir="auto" value={form.title} onChange={set('title')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('instructorCourses.summary')}
          <input type="text" dir="auto" maxLength={300} value={form.summary} onChange={set('summary')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('instructorCourses.description')}
          <textarea rows={5} dir="auto" value={form.description} onChange={set('description')} style={inputStyle} />
        </label>

        <div className="grid-2col">
          <label style={labelStyle}>
            {t('instructorCourses.level')}
            <select value={form.level} onChange={set('level')} style={inputStyle}>
              {COURSE_LEVELS.map((v) => <option key={v} value={v}>{t(`courses.level_${v}`)}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            {t('instructorCourses.language')}
            <select value={form.language} onChange={set('language')} style={inputStyle}>
              {COURSE_LANGUAGES.map((v) => <option key={v} value={v}>{t(`courses.language_${v}`)}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            {t('instructorCourses.delivery')}
            <select value={form.delivery} onChange={set('delivery')} style={inputStyle}>
              {COURSE_DELIVERIES.map((v) => <option key={v} value={v}>{t(`courses.delivery_${v}`)}</option>)}
            </select>
          </label>
          {form.delivery !== 'ONLINE' && (
            <label style={labelStyle}>
              {t('instructorCourses.location')}
              <input type="text" dir="auto" value={form.location} onChange={set('location')} style={inputStyle} />
            </label>
          )}
        </div>

        <div className="grid-2col">
          <div>
            <label style={labelStyle}>
              {t('instructorCourses.price')}
              <input type="number" min="0" step="1000" value={form.priceIqd} onChange={set('priceIqd')} style={inputStyle} />
            </label>
            <p style={hintStyle}>{t('instructorCourses.price_hint')}</p>
          </div>
          <label style={labelStyle}>
            {t('instructorCourses.duration')}
            <input type="number" min="1" value={form.durationHours} onChange={set('durationHours')} style={inputStyle} />
          </label>
          <div>
            <label style={labelStyle}>
              {t('instructorCourses.starts')}
              <input type="date" value={form.startsAt} onChange={set('startsAt')} style={inputStyle} />
            </label>
            <p style={hintStyle}>{t('instructorCourses.starts_hint')}</p>
          </div>
          <label style={labelStyle}>
            {t('instructorCourses.external_url')}
            <input type="url" dir="ltr" value={form.externalUrl} onChange={set('externalUrl')} style={inputStyle} />
          </label>
        </div>

        <div>
          <div style={labelStyle}>{t('instructorCourses.skills')}</div>
          <p style={hintStyle}>{t('instructorCourses.skills_hint')}</p>
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
              {selected.map((s) => (
                <button key={s.id} type="button" onClick={() => toggleSkill(s.id)} style={{ border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#1B2A4A', color: 'white', fontSize: '13px' }}>
                  {skillName(s, i18n.language)} ✕
                </button>
              ))}
            </div>
          )}
          <input
            type="search"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder={t('adminConsole.catalog.search_placeholder')}
            aria-label={t('instructorCourses.skills')}
            style={inputStyle}
          />
          <div style={{ marginTop: '6px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px' }}>
            {matches.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSkill(s.id)}
                aria-pressed={form.skillIds.includes(s.id)}
                style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer',
                  border: `1px solid ${form.skillIds.includes(s.id) ? '#1B2A4A' : '#cbd5e0'}`,
                  backgroundColor: form.skillIds.includes(s.id) ? '#1B2A4A' : 'white',
                  color: form.skillIds.includes(s.id) ? 'white' : '#2d3748'
                }}
              >
                {skillName(s, i18n.language)}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('instructorCourses.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default CourseForm;
