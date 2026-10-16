import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { toLocalizedDigits } from '../../localizeDigits';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';
import { Plus } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const LANGS = ['en', 'ar', 'ckb'];
const smallButton = (variant) => ({ ...buttonStyle(variant), padding: '4px 10px', fontSize: '13px' });

// Name in the viewer's language, falling back to English.
function localName(item, lang) {
  const primary = (lang || 'en').split('-')[0];
  return item[`name_${primary}`] || item.name_en;
}

// Create or edit an area, field of study, or skill: three names plus a parent.
function EntryDialog({ kind, entry, parentOptions, defaultParentId, onSaved, onClose }) {
  const { t } = useTranslation();
  const parentKey = kind === 'field' ? 'subjectAreaId' : kind === 'skill' ? 'categoryId' : null;
  const [form, setForm] = useState(() => ({
    name_en: entry?.name_en || '', name_ar: entry?.name_ar || '', name_ckb: entry?.name_ckb || '',
    ...(parentKey && { [parentKey]: entry ? (entry[parentKey] ?? '') : (defaultParentId ?? '') })
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const path = { area: 'areas', field: 'categories', skill: 'skills' }[kind];
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, ...(parentKey && { [parentKey]: form[parentKey] === '' ? null : Number(form[parentKey]) }) };
      if (entry) await axios.put(`/api/admin/catalog/${path}/${entry.id}`, body, { headers: authHeader() });
      else await axios.post(`/api/admin/catalog/${path}`, body, { headers: authHeader() });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={t(`adminConsole.catalog.${kind}_${entry ? 'edit' : 'new'}`)} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {LANGS.map((lang) => (
          <label key={lang} style={{ fontSize: '14px', color: '#2d3748', fontWeight: 600 }}>
            {t(`adminConsole.catalog.name_${lang}`)}
            <input
              value={form[`name_${lang}`]}
              onChange={(e) => setForm({ ...form, [`name_${lang}`]: e.target.value })}
              dir={lang === 'en' ? 'ltr' : 'rtl'}
              required
              maxLength={100}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 }}
            />
          </label>
        ))}
        {parentKey && (
          <label style={{ fontSize: '14px', color: '#2d3748', fontWeight: 600 }}>
            {t(`adminConsole.catalog.${kind === 'field' ? 'parent_area' : 'parent_field'}`)}
            <select
              value={form[parentKey]}
              onChange={(e) => setForm({ ...form, [parentKey]: e.target.value })}
              required={kind === 'skill'}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 }}
            >
              {kind === 'field' && <option value="">{t('adminConsole.catalog.none')}</option>}
              {kind === 'skill' && !form[parentKey] && <option value="" disabled>{t('adminConsole.catalog.parent_field')}</option>}
              {parentOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.catalog.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function MergeSkillDialog({ skill, allSkills, onMerged, onClose }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const others = allSkills.filter((s) => s.id !== skill.id);
    const list = q ? others.filter((s) => LANGS.some((l) => s[`name_${l}`].toLowerCase().includes(q))) : others;
    return list.slice(0, 40);
  }, [query, allSkills, skill.id]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`/api/admin/catalog/skills/${skill.id}/merge`, { intoId: selectedId }, { headers: authHeader() });
      onMerged(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={t('adminConsole.catalog.merge_title', { name: skill.name_en })} onClose={onClose} width={520}>
      <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t('adminConsole.catalog.merge_hint', { name: skill.name_en })}</p>
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('adminConsole.catalog.merge_search')} aria-label={t('adminConsole.catalog.merge_search')} style={{ ...inputStyle, width: '100%' }} />
      <div role="listbox" aria-label={t('adminConsole.catalog.merge_search')} style={{ marginTop: '8px', maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        {matches.map((s) => (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={s.id === selectedId}
            onClick={() => setSelectedId(s.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', gap: '10px', width: '100%', textAlign: 'start', padding: '9px 12px',
              border: 'none', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', fontSize: '14px',
              backgroundColor: s.id === selectedId ? '#FCF6E3' : 'white', fontWeight: s.id === selectedId ? 700 : 400
            }}
          >
            <span>{s.name_en}</span>
            <span style={mutedStyle}>{localName(s.field, i18n.language)}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
        <button type="button" onClick={submit} disabled={!selectedId || busy} style={{ ...buttonStyle('primary'), opacity: !selectedId || busy ? 0.5 : 1 }}>{t('adminConsole.catalog.merge_confirm')}</button>
      </div>
    </Dialog>
  );
}

function SkillRow({ skill, lang, onEdit, onMerge, onDelete }) {
  const { t } = useTranslation();
  const num = (n) => toLocalizedDigits(String(n), lang);
  return (
    <li data-skill-id={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '7px 0', borderTop: '1px solid #f1f1f1' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <strong style={{ fontSize: '14px', color: '#1a202c' }}>{skill.name_en}</strong>
        <span style={{ ...mutedStyle, marginInlineStart: '8px' }}>
          <span dir="rtl">{skill.name_ar}</span> · <span dir="rtl">{skill.name_ckb}</span>
        </span>
      </div>
      <span style={mutedStyle}>{t('adminConsole.catalog.usage', { students: num(skill._count.students), jobs: num(skill._count.jobPosts) })}</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="button" onClick={onEdit} style={smallButton('secondary')}>{t('adminConsole.catalog.edit')}</button>
        <button type="button" onClick={onMerge} style={smallButton('secondary')}>{t('adminConsole.catalog.merge')}</button>
        <button type="button" onClick={onDelete} style={smallButton('danger')}>{t('adminConsole.catalog.delete')}</button>
      </div>
    </li>
  );
}

function CatalogTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { kind, entry?, defaultParentId? }
  const [merging, setMerging] = useState(null);
  const [deleting, setDeleting] = useState(null); // { kind, entry, usage? }

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/catalog', { headers: authHeader() });
      setCatalog(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  // Areas plus a pseudo-area for fields of study that belong to none.
  const groups = useMemo(() => {
    if (!catalog) return [];
    const list = catalog.areas.map((a) => ({ area: a, fields: a.categories }));
    if (catalog.unassigned.length) list.push({ area: null, fields: catalog.unassigned });
    return list;
  }, [catalog]);

  const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);
  const allSkills = useMemo(() => allFields.flatMap((f) => f.skills.map((s) => ({ ...s, field: f }))), [allFields]);

  const q = query.trim().toLowerCase();
  const skillMatches = (s) => !q || LANGS.some((l) => s[`name_${l}`].toLowerCase().includes(q));

  const afterSave = (text) => {
    setEditing(null);
    notify(text);
    load();
  };

  const tryDelete = async (kind, entry, confirm = false) => {
    const path = { area: 'areas', field: 'categories', skill: 'skills' }[kind];
    try {
      await axios.delete(`/api/admin/catalog/${path}/${entry.id}${confirm ? '?confirm=true' : ''}`, { headers: authHeader() });
      setDeleting(null);
      notify(t('adminConsole.catalog.deleted'));
      load();
    } catch (err) {
      // A skill in use comes back with its usage so we can offer merge instead.
      if (err.response?.status === 409 && err.response.data.students !== undefined) {
        setDeleting({ kind, entry, usage: err.response.data });
        return;
      }
      throw err;
    }
  };

  if (!catalog) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;

  const fieldOptions = allFields.map((f) => ({ id: f.id, label: localName(f, lang) }));
  const areaOptions = catalog.areas.map((a) => ({ id: a.id, label: localName(a, lang) }));
  const anyVisible = groups.some((g) => g.fields.some((f) => f.skills.some(skillMatches)));

  return (
    <section>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('adminConsole.catalog.search_placeholder')}
          aria-label={t('adminConsole.catalog.search_placeholder')}
          style={{ ...inputStyle, flex: '1 1 260px' }}
        />
        <button type="button" onClick={() => setEditing({ kind: 'area' })} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.catalog.add_area')}</button>
      </div>

      {q && !anyVisible && <EmptyState>{t('adminConsole.catalog.no_results')}</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {groups.map(({ area, fields }) => {
          const visibleFields = q ? fields.filter((f) => f.skills.some(skillMatches)) : fields;
          if (q && visibleFields.length === 0) return null;
          const skillTotal = fields.reduce((n, f) => n + f.skills.length, 0);
          return (
            <details key={area ? area.id : 'unassigned'} open={Boolean(q)} data-area-id={area?.id} style={cardStyle}>
              <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', listStyle: 'revert' }}>
                <strong style={{ fontSize: '16px', color: '#1a202c' }}>{area ? localName(area, lang) : t('adminConsole.catalog.unassigned')}</strong>
                <span style={mutedStyle}>
                  {t('adminConsole.catalog.fields_count', { count: num(fields.length) })} · {t('adminConsole.catalog.skills_count', { count: num(skillTotal) })}
                </span>
              </summary>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 0' }}>
                {area && (
                  <>
                    <button type="button" onClick={() => setEditing({ kind: 'area', entry: area })} style={smallButton('secondary')}>{t('adminConsole.catalog.edit')}</button>
                    <button type="button" onClick={() => setDeleting({ kind: 'area', entry: area })} style={smallButton('danger')}>{t('adminConsole.catalog.delete')}</button>
                  </>
                )}
                <button type="button" onClick={() => setEditing({ kind: 'field', defaultParentId: area?.id ?? '' })} style={smallButton('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.catalog.add_field')}</button>
              </div>

              {visibleFields.map((field) => {
                const skills = field.skills.filter(skillMatches);
                return (
                  <details key={field.id} open={Boolean(q)} data-field-id={field.id} style={{ marginTop: '8px', padding: '10px 12px', backgroundColor: '#fafbfc', border: '1px solid #edf2f7', borderRadius: '8px' }}>
                    <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', listStyle: 'revert' }}>
                      <strong style={{ fontSize: '15px', color: '#2d3748' }}>{localName(field, lang)}</strong>
                      <span style={mutedStyle}>{t('adminConsole.catalog.skills_count', { count: num(field.skills.length) })}</span>
                    </summary>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                      <button type="button" onClick={() => setEditing({ kind: 'field', entry: field })} style={smallButton('secondary')}>{t('adminConsole.catalog.edit')}</button>
                      <button type="button" onClick={() => setDeleting({ kind: 'field', entry: field })} style={smallButton('danger')}>{t('adminConsole.catalog.delete')}</button>
                      <button type="button" onClick={() => setEditing({ kind: 'skill', defaultParentId: field.id })} style={smallButton('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.catalog.add_skill')}</button>
                    </div>
                    {skills.length === 0 ? (
                      <p style={{ ...mutedStyle, margin: 0 }}>{t('adminConsole.catalog.no_skills')}</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {skills.map((skill) => (
                          <SkillRow
                            key={skill.id}
                            skill={skill}
                            lang={lang}
                            onEdit={() => setEditing({ kind: 'skill', entry: skill })}
                            onMerge={() => setMerging(skill)}
                            onDelete={() => setDeleting({ kind: 'skill', entry: skill })}
                          />
                        ))}
                      </ul>
                    )}
                  </details>
                );
              })}
            </details>
          );
        })}
      </div>

      {editing && (
        <EntryDialog
          kind={editing.kind}
          entry={editing.entry}
          defaultParentId={editing.defaultParentId}
          parentOptions={editing.kind === 'field' ? areaOptions : fieldOptions}
          onSaved={() => afterSave(t('adminConsole.catalog.saved'))}
          onClose={() => setEditing(null)}
        />
      )}

      {merging && (
        <MergeSkillDialog
          skill={merging}
          allSkills={allSkills}
          onClose={() => setMerging(null)}
          onMerged={(result) => {
            setMerging(null);
            notify(t('adminConsole.catalog.merged', { students: num(result.movedStudents), jobs: num(result.movedJobs) }));
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          key={deleting.usage ? 'in-use' : 'plain'}
          title={t('adminConsole.catalog.delete_title', { name: localName(deleting.entry, lang) })}
          message={deleting.usage
            ? t('adminConsole.catalog.delete_in_use', { students: num(deleting.usage.students), jobs: num(deleting.usage.jobPosts) })
            : t('adminConsole.catalog.delete_confirm', { name: localName(deleting.entry, lang) })}
          confirmLabel={deleting.usage ? t('adminConsole.catalog.delete_anyway') : t('adminConsole.catalog.delete')}
          variant="danger"
          onConfirm={() => tryDelete(deleting.kind, deleting.entry, Boolean(deleting.usage))}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default CatalogTab;
