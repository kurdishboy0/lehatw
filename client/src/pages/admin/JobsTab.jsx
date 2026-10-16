import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { ReasonDialog } from '../../components/Dialog';
import CreateJobDialog from './CreateJobDialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, FilterPills, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';
import { Plus, Flag } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const SEARCH_DEBOUNCE_MS = 350;

function jobState(job) {
  if (job.removedByAdmin) return 'removed';
  return job.isActive ? 'active' : 'inactive';
}

const STATE_TONE = { active: 'green', inactive: 'gray', removed: 'red' };

function JobsTab({ notify, refreshCounts }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ jobs: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ...(debouncedQuery && { q: debouncedQuery }), ...(status !== 'all' && { status }) };
      const res = await axios.get('/api/admin/jobs', { params, headers: authHeader() });
      setData(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [page, debouncedQuery, status, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    load();
  }, [load]);

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const remove = async (reason) => {
    await axios.put(`/api/admin/jobs/${removing.id}/remove`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.jobs.removed'));
    setRemoving(null);
    load();
    refreshCounts();
  };

  const restore = async (job) => {
    try {
      await axios.put(`/api/admin/jobs/${job.id}/restore`, {}, { headers: authHeader() });
      notify(t('adminConsole.jobs.restored'));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const num = (n) => toLocalizedDigits(String(n), lang);

  return (
    <section>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('adminConsole.jobs.search_placeholder')}
          aria-label={t('adminConsole.jobs.search_placeholder')}
          style={{ ...inputStyle, flex: '1 1 260px' }}
        />
        <FilterPills
          label={t('adminConsole.tabs.jobs')}
          value={status}
          onChange={changeStatus}
          options={['all', 'active', 'inactive', 'removed'].map((s) => ({ value: s, label: t(`adminConsole.jobs.filter.${s}`) }))}
        />
        <button type="button" onClick={() => setCreating(true)} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.jobs.create')}</button>
      </div>

      {loading && data.jobs.length === 0 ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : data.jobs.length === 0 ? (
        <EmptyState>{t('adminConsole.jobs.no_jobs')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: loading ? 0.6 : 1 }}>
          {data.jobs.map((job) => {
            const state = jobState(job);
            return (
              <div key={job.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">{job.title}</strong>
                    <Badge tone={STATE_TONE[state]}>{t(`adminConsole.jobs.status.${state}`)}</Badge>
                    {job.openReportCount > 0 && <Badge tone="red"><InlineIcon icon={Flag} size={13} /> {t('adminConsole.jobs.open_reports', { count: num(job.openReportCount) })}</Badge>}
                  </div>
                  <div style={{ ...mutedStyle, marginTop: '4px', lineHeight: 1.7 }}>
                    <div>{job.hrProfile?.companyName} · <span dir="ltr">{job.hrProfile?.user?.email}</span></div>
                    <div>
                      {t('adminConsole.jobs.posted', { date: formatDateTime(job.createdAt, lang, { withTime: false }) })}
                      {' · '}
                      {t('adminConsole.jobs.applicants', { count: num(job._count?.applications || 0) })}
                    </div>
                  </div>
                  {job.description && (
                    <p dir="auto" style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#4a5568', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.description}
                    </p>
                  )}
                  {job.removedByAdmin && job.removedReason && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9b2c2c' }}>
                      {t('adminConsole.jobs.removed_reason', { reason: job.removedReason })}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {state === 'active' && (
                    <Link to={`/jobs/${job.id}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>
                      {t('adminConsole.jobs.view')}
                    </Link>
                  )}
                  {job.removedByAdmin ? (
                    <button type="button" onClick={() => restore(job)} style={buttonStyle('success')}>{t('adminConsole.jobs.restore')}</button>
                  ) : (
                    <button type="button" onClick={() => setRemoving(job)} style={buttonStyle('danger')}>{t('adminConsole.jobs.remove')}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...buttonStyle('secondary'), opacity: page <= 1 ? 0.5 : 1 }}>
            {t('adminConsole.jobs.prev')}
          </button>
          <span style={mutedStyle}>{t('adminConsole.jobs.page', { page: num(page), total: num(data.totalPages) })}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} style={{ ...buttonStyle('secondary'), opacity: page >= data.totalPages ? 0.5 : 1 }}>
            {t('adminConsole.jobs.next')}
          </button>
        </div>
      )}

      {creating && (
        <CreateJobDialog
          notify={notify}
          onClose={() => setCreating(false)}
          onCreated={({ company }) => {
            setCreating(false);
            notify(t('adminConsole.jobs.created', { company }));
            load();
          }}
        />
      )}

      {removing && (
        <ReasonDialog
          title={t('adminConsole.jobs.remove_title', { title: removing.title })}
          hint={t('adminConsole.jobs.remove_hint')}
          minLength={5}
          confirmLabel={t('adminConsole.jobs.remove')}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
}

export default JobsTab;
