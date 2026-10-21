import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { Dialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { mutedStyle, inputStyle } from './adminStyles';
import { X } from 'lucide-react';
import { iraqToday } from '../../jobDeadline';
import InlineIcon from '../../components/InlineIcon';

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['On-Site', 'Remote', 'Hybrid'];

const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;

// Posts a job on behalf of an approved company, with the same fields the
// company's own form uses.
function CreateJobDialog({ onCreated, onClose, notify }) {
  const { t, i18n } = useTranslation();
  const [companies, setCompanies] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [form, setForm] = useState({
    hrProfileId: '', title: '', description: '', responsibilities: '', requirements: '', benefits: '',
    location: '', employmentType: '', workMode: '', experienceLevel: '', education: '', applicationDeadline: '', requiresCv: true, skillIds: []
  });
  const [busy, setBusy] = useState(false);
  const [today] = useState(iraqToday);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    axios.get('/api/admin/companies', { params: { status: 'APPROVED' }, headers: authHeader() })
      .then((res) => setCompanies(res.data))
      .catch(() => { setCompanies([]); notify(t('adminConsole.error_load'), 'error'); });
    axios.get('/api/jobs/skills').then((res) => setSkills(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once when the dialog opens
  }, []);

  const matches = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const list = q ? skills.filter((s) => ['en', 'ar', 'ckb'].some((l) => (s[`name_${l}`] || '').toLowerCase().includes(q))) : skills;
    return list.slice(0, 40);
  }, [skills, skillQuery]);

  const toggleSkill = (id) => setForm((f) => ({
    ...f, skillIds: f.skillIds.includes(id) ? f.skillIds.filter((x) => x !== id) : [...f.skillIds, id]
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await axios.post('/api/admin/jobs', form, { headers: authHeader() });
      const company = companies.find((c) => String(c.id) === String(form.hrProfileId));
      onCreated({ job: res.data.job, company: company?.companyName || '' });
    } catch (err) {
      setError(['INVALID_APPLICATION_DEADLINE', 'APPLICATION_DEADLINE_PAST'].includes(err.response?.data?.code) ? t('qa.deadline_invalid') : err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  const label = { fontSize: '14px', color: '#2d3748', fontWeight: 600 };
  const field = { ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 };
  const selected = skills.filter((s) => form.skillIds.includes(s.id));

  return (
    <Dialog title={t('adminConsole.jobs.create_title')} onClose={onClose} width={620}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={label}>
          {t('adminConsole.jobs.create_company')}
          <select value={form.hrProfileId} onChange={set('hrProfileId')} required style={field}>
            <option value="" disabled>{companies === null ? t('adminConsole.loading') : companies.length === 0 ? t('adminConsole.jobs.no_companies') : t('adminConsole.jobs.create_company')}</option>
            {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </label>
        <p style={{ ...mutedStyle, margin: '-6px 0 0 0', lineHeight: 1.6 }}>{t('adminConsole.jobs.create_company_hint')}</p>

        <label style={label}>
          {t('adminConsole.jobs.create_job_title')}
          <input type="text" required dir="auto" value={form.title} onChange={set('title')} style={field} />
        </label>
        <label style={label}>
          {t('adminConsole.jobs.create_description')}
          <textarea rows={3} dir="auto" value={form.description} onChange={set('description')} style={field} />
        </label>
        {['responsibilities', 'requirements', 'benefits'].map((key) => (
          <label key={key} style={label}>
            {t(`adminConsole.jobs.create_${key}`)} <span style={{ fontWeight: 400, color: '#a0aec0' }}>{t('adminConsole.jobs.create_lines_hint')}</span>
            <textarea rows={3} dir="auto" value={form[key]} onChange={set(key)} style={field} />
          </label>
        ))}

        <label style={label}>
          {t('qa.deadline_label')}
          <input type="date" min={today} value={form.applicationDeadline} onChange={set('applicationDeadline')} style={field} />
          <span style={{ ...mutedStyle, fontWeight: 400 }}>{t('qa.deadline_hint')}</span>
        </label>
        <div className="grid-2col">
          <label style={label}>
            {t('adminConsole.jobs.create_location')}
            <input type="text" dir="auto" value={form.location} onChange={set('location')} style={field} />
          </label>
          <label style={label}>
            {t('adminConsole.jobs.create_type')}
            <select value={form.employmentType} onChange={set('employmentType')} style={field}>
              <option value="">-</option>
              {EMPLOYMENT_TYPES.map((v) => <option key={v} value={v}>{t(`jobPost.employment_${v.toLowerCase().replace('-', '_')}`)}</option>)}
            </select>
          </label>
          <label style={label}>
            {t('adminConsole.jobs.create_mode')}
            <select value={form.workMode} onChange={set('workMode')} style={field}>
              <option value="">-</option>
              {WORK_MODES.map((v) => <option key={v} value={v}>{t(`jobPost.work_mode_${v.toLowerCase().replace('-', '')}`)}</option>)}
            </select>
          </label>
          <label style={label}>
            {t('adminConsole.jobs.create_experience')}
            <input type="text" dir="auto" value={form.experienceLevel} onChange={set('experienceLevel')} style={field} />
          </label>
          <label style={label}>
            {t('adminConsole.jobs.create_education')}
            <input type="text" dir="auto" value={form.education} onChange={set('education')} style={field} />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
          <input type="checkbox" checked={form.requiresCv} onChange={set('requiresCv')} />
          {t('adminConsole.jobs.create_requires_cv')}
        </label>

        <div>
          <div style={label}>{t('adminConsole.jobs.create_skills')}</div>
          <p style={{ ...mutedStyle, margin: '2px 0 6px 0' }}>{t('adminConsole.jobs.create_skills_hint')}</p>
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {selected.map((s) => (
                <button key={s.id} type="button" onClick={() => toggleSkill(s.id)} style={{ border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#1B2A4A', color: 'white', fontSize: '13px' }}>
                  {skillName(s, i18n.language)} <InlineIcon icon={X} size={13} />
                </button>
              ))}
            </div>
          )}
          <input
            type="search"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder={t('adminConsole.catalog.search_placeholder')}
            aria-label={t('adminConsole.jobs.create_skills')}
            style={{ ...inputStyle, width: '100%' }}
          />
          <div style={{ marginTop: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px' }}>
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
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.jobs.create_submit')}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default CreateJobDialog;
