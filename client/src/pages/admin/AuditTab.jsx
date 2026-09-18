import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { buttonStyle } from '../../components/buttonStyle';
import { EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';

const SEARCH_DEBOUNCE_MS = 350;

// Recorded detail values, flattened into readable "key: value" lines.
function DetailLines({ details }) {
  const lines = Object.entries(details || {}).map(([k, v]) => [k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)]);
  return (
    <dl dir="ltr" style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4a5568', display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '2px 10px' }}>
      {lines.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt style={{ fontWeight: 700 }}>{k}</dt>
          <dd style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function AuditTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [filters, setFilters] = useState({ action: '', admin: '', from: '', to: '' });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    try {
      const params = {
        page,
        ...(filters.action && { action: filters.action }),
        ...(filters.admin && { admin: filters.admin }),
        ...(debouncedQuery && { q: debouncedQuery }),
        // Date inputs are whole local days; "to" includes that day.
        ...(filters.from && { from: new Date(`${filters.from}T00:00:00`).toISOString() }),
        ...(filters.to && { to: new Date(new Date(`${filters.to}T00:00:00`).getTime() + 86400000).toISOString() })
      };
      const res = await axios.get('/api/admin/audit', { params, headers: authHeader() });
      setData(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [page, filters, debouncedQuery, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    load();
  }, [load]);

  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); };
  const clear = () => { setFilters({ action: '', admin: '', from: '', to: '' }); setQuery(''); setPage(1); };
  const actionLabel = (action) => t(`adminConsole.audit.actions.${action}`, { defaultValue: action });
  const anyFilter = query || Object.values(filters).some(Boolean);

  if (!data) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;

  const labelStyle = { fontSize: '12px', color: '#4a5568', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px' };

  return (
    <section>
      <p style={{ margin: '0 0 14px 0', color: '#4a5568', fontSize: '14px' }}>{t('adminConsole.audit.intro')}</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('adminConsole.audit.search')}
          aria-label={t('adminConsole.audit.search')}
          style={{ ...inputStyle, flex: '1 1 220px' }}
        />
        <label style={labelStyle}>
          {t('adminConsole.audit.filter_action')}
          <select value={filters.action} onChange={setFilter('action')} style={inputStyle}>
            <option value="">{t('adminConsole.audit.all')}</option>
            {data.filters.actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          {t('adminConsole.audit.filter_admin')}
          <select value={filters.admin} onChange={setFilter('admin')} style={inputStyle}>
            <option value="">{t('adminConsole.audit.all')}</option>
            {data.filters.admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          {t('adminConsole.audit.from')}
          <input type="date" value={filters.from} onChange={setFilter('from')} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          {t('adminConsole.audit.to')}
          <input type="date" value={filters.to} onChange={setFilter('to')} style={inputStyle} />
        </label>
        {anyFilter && <button type="button" onClick={clear} style={buttonStyle('secondary')}>{t('adminConsole.audit.clear')}</button>}
      </div>
      <p style={{ ...mutedStyle, margin: '0 0 10px 0' }}>{t('adminConsole.audit.results', { count: num(data.total) })}</p>

      {data.entries.length === 0 ? (
        <EmptyState>{t('adminConsole.audit.no_entries')}</EmptyState>
      ) : (
        <ol style={{ ...cardStyle, padding: 0, margin: 0, listStyle: 'none' }}>
          {data.entries.map((e, i) => (
            <li key={e.id} data-audit-id={e.id} style={{ padding: '12px 16px', borderTop: i ? '1px solid #edf2f7' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <strong style={{ color: '#1a202c', fontSize: '14px' }}>{actionLabel(e.action)}</strong>
                <span style={mutedStyle}>{formatDateTime(e.createdAt, lang)}</span>
              </div>
              <div dir="auto" style={{ fontSize: '13px', color: '#4a5568', marginTop: '2px', wordBreak: 'break-word' }}>{e.summary}</div>
              <div style={{ ...mutedStyle, marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>{t('adminConsole.audit.by', { email: e.adminEmail })}</span>
                {e.details && (
                  <button
                    type="button"
                    aria-expanded={Boolean(open[e.id])}
                    onClick={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))}
                    style={{ ...buttonStyle('link'), fontSize: '12px', padding: 0 }}
                  >
                    {open[e.id] ? t('adminConsole.audit.hide_details') : t('adminConsole.audit.show_details')}
                  </button>
                )}
              </div>
              {open[e.id] && <DetailLines details={e.details} />}
            </li>
          ))}
        </ol>
      )}

      {data.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...buttonStyle('secondary'), opacity: page <= 1 ? 0.5 : 1 }}>{t('adminConsole.jobs.prev')}</button>
          <span style={mutedStyle}>{t('adminConsole.jobs.page', { page: num(page), total: num(data.totalPages) })}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} style={{ ...buttonStyle('secondary'), opacity: page >= data.totalPages ? 0.5 : 1 }}>{t('adminConsole.jobs.next')}</button>
        </div>
      )}
    </section>
  );
}

export default AuditTab;
