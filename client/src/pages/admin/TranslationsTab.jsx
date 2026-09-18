import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { defaultResources } from '../../i18n';
import { applyTextOverride } from '../../translationOverrides';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';

const LANGS = ['en', 'ar', 'ckb'];
const PAGE_SIZE = 25;

// All editable text keys (strings only; list-shaped legal sections are skipped).
function flatten(node, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(node || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
  }
  return out;
}

const placeholders = (text) => [...new Set((text || '').match(/\{\{\s*[\w.]+\s*\}\}/g) || [])].sort();
const samePlaceholders = (a, b) => JSON.stringify(placeholders(a)) === JSON.stringify(placeholders(b));

const DEFAULTS = Object.fromEntries(LANGS.map((l) => [l, flatten(defaultResources[l]?.translation)]));
const ALL_KEYS = Object.keys(DEFAULTS.en);
const SECTIONS = [...new Set(ALL_KEYS.map((k) => k.split('.')[0]))].sort();

function TextRow({ textKey, overrides, onSaved, notify }) {
  const { t, i18n } = useTranslation();
  const current = (lang) => overrides[`${lang}:${textKey}`]?.value ?? DEFAULTS[lang][textKey] ?? '';
  const [draft, setDraft] = useState(() => Object.fromEntries(LANGS.map((l) => [l, current(l)])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changed = LANGS.filter((l) => draft[l] !== current(l));

  const save = async () => {
    setError('');
    for (const lang of changed) {
      if (!draft[lang].trim()) return setError(t('adminConsole.translations.empty'));
      // Placeholders like {{count}} must survive, or the page shows raw braces.
      const reference = DEFAULTS[lang][textKey] || DEFAULTS.en[textKey];
      if (!samePlaceholders(draft[lang], reference)) {
        return setError(t('adminConsole.translations.placeholder_mismatch', { list: placeholders(reference).join(' ') }));
      }
    }
    setBusy(true);
    try {
      for (const lang of changed) {
        const isOriginal = draft[lang] === DEFAULTS[lang][textKey];
        if (isOriginal && overrides[`${lang}:${textKey}`]) {
          await axios.post('/api/admin/translations/reset', { lang, key: textKey }, { headers: authHeader() });
          applyTextOverride(lang, textKey, null);
        } else if (!isOriginal) {
          await axios.put('/api/admin/translations', { lang, key: textKey, value: draft[lang] }, { headers: authHeader() });
          applyTextOverride(lang, textKey, draft[lang]);
        }
      }
      notify(t('adminConsole.translations.saved'));
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (lang) => {
    setError('');
    try {
      await axios.post('/api/admin/translations/reset', { lang, key: textKey }, { headers: authHeader() });
      applyTextOverride(lang, textKey, null);
      setDraft((d) => ({ ...d, [lang]: DEFAULTS[lang][textKey] ?? '' }));
      notify(t('adminConsole.translations.reset_done'));
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
    }
  };

  return (
    <div data-text-key={textKey} style={{ ...cardStyle, padding: '12px 14px' }}>
      <code dir="ltr" style={{ fontSize: '12px', color: '#718096' }}>{textKey}</code>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '8px' }}>
        {LANGS.map((lang) => {
          const override = overrides[`${lang}:${textKey}`];
          const original = DEFAULTS[lang][textKey] ?? '';
          return (
            <div key={lang}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5568' }}>{t(`adminConsole.translations.lang_${lang}`)}</span>
                {override && <Badge tone="yellow">{t('adminConsole.translations.edited')}</Badge>}
                {override && (
                  <button type="button" onClick={() => reset(lang)} style={{ ...buttonStyle('link'), fontSize: '12px', padding: 0 }}>
                    {t('adminConsole.translations.reset')}
                  </button>
                )}
              </div>
              <textarea
                aria-label={`${textKey} ${t(`adminConsole.translations.lang_${lang}`)}`}
                value={draft[lang]}
                onChange={(e) => setDraft({ ...draft, [lang]: e.target.value })}
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                rows={Math.min(6, Math.max(2, Math.ceil((draft[lang] || '').length / 45)))}
                style={{ ...inputStyle, width: '100%', fontSize: '13px', borderColor: draft[lang] !== current(lang) ? '#C99A2E' : '#cbd5e0' }}
              />
              {override && (
                <div style={{ ...mutedStyle, fontSize: '11px', marginTop: '2px' }}>
                  {/* Isolate the quoted text so its direction doesn't flip the label. */}
                  <div>{t('adminConsole.translations.original', { text: `\u2068${original}\u2069` })}</div>
                  <div>{t('adminConsole.translations.edited_by', { email: override.updatedBy?.email || '-', date: formatDateTime(override.updatedAt, i18n.language) })}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
      {changed.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button type="button" onClick={() => { setDraft(Object.fromEntries(LANGS.map((l) => [l, current(l)]))); setError(''); }} style={buttonStyle('secondary')}>
            {t('adminConsole.cancel')}
          </button>
          <button type="button" disabled={busy} onClick={save} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.translations.save')}</button>
        </div>
      )}
    </div>
  );
}

function TranslationsTab({ notify }) {
  const { t, i18n } = useTranslation();
  const num = (n) => toLocalizedDigits(String(n), i18n.language);
  const [overrides, setOverrides] = useState(null); // { "lang:key": row }
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [editedOnly, setEditedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/translations', { headers: authHeader() });
      setOverrides(Object.fromEntries(res.data.map((r) => [`${r.lang}:${r.key}`, r])));
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const keys = useMemo(() => {
    if (!overrides) return [];
    const q = query.trim().toLowerCase();
    return ALL_KEYS.filter((key) => {
      if (section && !key.startsWith(`${section}.`)) return false;
      if (editedOnly && !LANGS.some((l) => overrides[`${l}:${key}`])) return false;
      if (!q) return true;
      return key.toLowerCase().includes(q) || LANGS.some((l) =>
        (DEFAULTS[l][key] || '').toLowerCase().includes(q) || (overrides[`${l}:${key}`]?.value || '').toLowerCase().includes(q));
    });
  }, [overrides, query, section, editedOnly]);

  if (!overrides) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;

  const totalPages = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = keys.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = (fn) => (value) => { fn(value); setPage(1); };

  return (
    <section>
      <p style={{ margin: '0 0 14px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t('adminConsole.translations.intro')}</p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => resetPage(setQuery)(e.target.value)}
          placeholder={t('adminConsole.translations.search_placeholder')}
          aria-label={t('adminConsole.translations.search_placeholder')}
          style={{ ...inputStyle, flex: '1 1 260px' }}
        />
        <select value={section} onChange={(e) => resetPage(setSection)(e.target.value)} aria-label={t('adminConsole.translations.section_label')} style={inputStyle}>
          <option value="">{t('adminConsole.translations.section_all')}</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#2d3748' }}>
          <input type="checkbox" checked={editedOnly} onChange={(e) => resetPage(setEditedOnly)(e.target.checked)} />
          {t('adminConsole.translations.edited_only')}
        </label>
      </div>
      <p style={{ ...mutedStyle, margin: '0 0 10px 0' }}>{t('adminConsole.translations.results', { count: num(keys.length) })}</p>

      {visible.length === 0 ? (
        <EmptyState>{t('adminConsole.translations.no_results')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.map((key) => (
            <TextRow
              // Remount after a save so the draft picks up the stored text.
              key={`${key}|${LANGS.map((l) => overrides[`${l}:${key}`]?.updatedAt || '').join('|')}`}
              textKey={key}
              overrides={overrides}
              onSaved={load}
              notify={notify}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} style={{ ...buttonStyle('secondary'), opacity: currentPage <= 1 ? 0.5 : 1 }}>{t('adminConsole.jobs.prev')}</button>
          <span style={mutedStyle}>{t('adminConsole.jobs.page', { page: num(currentPage), total: num(totalPages) })}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} style={{ ...buttonStyle('secondary'), opacity: currentPage >= totalPages ? 0.5 : 1 }}>{t('adminConsole.jobs.next')}</button>
        </div>
      )}
    </section>
  );
}

export default TranslationsTab;
