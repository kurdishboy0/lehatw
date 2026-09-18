import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { Dialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, FilterPills, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle, accountStatusTone } from './adminStyles';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_REASON = 5;
const ROLE_TONE = { STUDENT: 'blue', HR: 'yellow', ADMIN: 'red' };

function canManage(target, me) {
  if (!target || !me) return false;
  return target.id !== me.id && (target.role !== 'ADMIN' || me.isSuperAdmin);
}

function SectionTitle({ children }) {
  return <h4 style={{ margin: '18px 0 8px 0', fontSize: '13px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</h4>;
}

// One inline action form (reason, confirm, etc.) shown in place of the details.
function ActionPanel({ title, children, onCancel, onSubmit, submitLabel, variant = 'primary', busy, error }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1a202c' }}>{title}</h4>
      {children}
      {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onCancel} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
        <button type="submit" disabled={busy} style={{ ...buttonStyle(variant), opacity: busy ? 0.6 : 1 }}>{submitLabel}</button>
      </div>
    </form>
  );
}

function UserDetailDialog({ userId, me, notify, onChanged, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState(null); // suspend | ban | reactivate | reset | role | temp
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  // Earliest allowed suspension end date: tomorrow.
  const [minUntil] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [newRole, setNewRole] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/admin/users/${userId}`, { headers: authHeader() });
      setUser(res.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || t('adminConsole.error_load'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open
    load();
  }, [load]);

  const openMode = (next) => {
    setMode(next);
    setReason('');
    setUntil('');
    setError('');
  };

  // Runs one account action, then refreshes the details and the list behind.
  const run = async (request, successText, after) => {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      if (successText) notify(successText);
      after?.(res);
      if (!after) setMode(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
    } finally {
      setBusy(false);
    }
  };

  const cfg = { headers: authHeader() };
  const submitStatus = (status) => {
    if (status !== 'ACTIVE' && reason.trim().length < MIN_REASON) {
      setError(t('adminConsole.reason_too_short', { count: MIN_REASON }));
      return;
    }
    const body = { status, reason: reason.trim(), ...(status === 'SUSPENDED' && until && { until: new Date(`${until}T23:59:00`).toISOString() }) };
    run(() => axios.put(`/api/admin/users/${userId}/status`, body, cfg), t('adminConsole.users.status_updated'));
  };

  const title = user ? (user.name ? `${user.name}` : user.email) : t('adminConsole.loading');
  const manageable = canManage(user, me);
  const roles = me?.isSuperAdmin ? ['STUDENT', 'HR', 'ADMIN'] : ['STUDENT', 'HR'];

  let body;
  if (loadError) {
    body = <p role="alert" style={{ color: '#c53030' }}>{loadError}</p>;
  } else if (!user) {
    body = <p style={mutedStyle}>{t('adminConsole.loading')}</p>;
  } else if (mode === 'suspend' || mode === 'ban') {
    body = (
      <ActionPanel
        title={t(`adminConsole.users.${mode}_title`, { email: user.email })}
        submitLabel={t(`adminConsole.users.${mode}`)}
        variant="danger"
        busy={busy}
        error={error}
        onCancel={() => setMode(null)}
        onSubmit={() => submitStatus(mode === 'ban' ? 'BANNED' : 'SUSPENDED')}
      >
        <p style={{ margin: '0 0 10px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t(`adminConsole.users.${mode}_hint`)}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('adminConsole.reason_placeholder')}
          aria-label={t('adminConsole.reason_placeholder')}
          style={{ ...inputStyle, width: '100%' }}
        />
        {mode === 'suspend' && (
          <label style={{ display: 'block', marginTop: '10px', fontSize: '14px', color: '#2d3748' }}>
            {t('adminConsole.users.suspend_until_label')}
            <input
              type="date"
              value={until}
              min={minUntil}
              onChange={(e) => setUntil(e.target.value)}
              style={{ ...inputStyle, display: 'block', marginTop: '6px' }}
            />
          </label>
        )}
      </ActionPanel>
    );
  } else if (mode === 'reactivate' || mode === 'reset') {
    body = (
      <ActionPanel
        title={t(`adminConsole.users.${mode === 'reset' ? 'reset_password' : 'reactivate'}`)}
        submitLabel={t('adminConsole.users.confirm')}
        variant={mode === 'reset' ? 'danger' : 'success'}
        busy={busy}
        error={error}
        onCancel={() => setMode(null)}
        onSubmit={() => (mode === 'reset'
          ? run(() => axios.post(`/api/admin/users/${userId}/reset-password`, {}, cfg), null, (res) => { setTempPassword(res.data.tempPassword); setCopied(false); setMode('temp'); })
          : submitStatus('ACTIVE'))}
      >
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>
          {t(`adminConsole.users.${mode === 'reset' ? 'reset_confirm' : 'reactivate_confirm'}`, { email: user.email })}
        </p>
      </ActionPanel>
    );
  } else if (mode === 'role') {
    body = (
      <ActionPanel
        title={t('adminConsole.users.change_role')}
        submitLabel={t('adminConsole.users.confirm')}
        busy={busy}
        error={error}
        onCancel={() => setMode(null)}
        onSubmit={() => run(() => axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, cfg), t('adminConsole.users.role_updated'))}
      >
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>
          {t('adminConsole.users.role_confirm', { email: user.email, from: t(`adminConsole.role.${user.role}`), to: t(`adminConsole.role.${newRole}`) })}
        </p>
      </ActionPanel>
    );
  } else if (mode === 'temp') {
    body = (
      <div>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1a202c' }}>{t('adminConsole.users.temp_password_title')}</h4>
        <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t('adminConsole.users.temp_password_hint')}</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <code dir="ltr" data-testid="temp-password" style={{ fontSize: '18px', padding: '8px 14px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', letterSpacing: '0.05em' }}>{tempPassword}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(tempPassword).then(() => setCopied(true)).catch(() => {})}
            style={buttonStyle('secondary')}
          >
            {copied ? t('adminConsole.users.copied') : t('adminConsole.users.copy')}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={() => { setTempPassword(''); setMode(null); }} style={buttonStyle('primary')}>{t('adminConsole.users.close')}</button>
        </div>
      </div>
    );
  } else {
    // Accounts created through Google/LinkedIn have no password of their own.
    const methods = user.loginMethods.length === 0
      ? [t('adminConsole.users.method_password')]
      : user.loginMethods.map((m) => t(`adminConsole.users.method_${m}`));
    body = (
      <div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge tone={ROLE_TONE[user.role]}>{t(`adminConsole.role.${user.role}`)}</Badge>
          {user.isSuperAdmin && <Badge tone="red">{t('adminConsole.users.super_admin')}</Badge>}
          <Badge tone={accountStatusTone[user.accountStatus]}>{t(`adminConsole.account_status.${user.accountStatus}`)}</Badge>
          <Badge tone={user.verified ? 'green' : 'yellow'}>{user.verified ? t('adminConsole.users.verified') : t('adminConsole.users.unverified')}</Badge>
        </div>
        <div style={{ ...mutedStyle, marginTop: '10px', lineHeight: 1.8 }}>
          <div>✉️ <span dir="ltr">{user.email}</span> · ID <span dir="ltr">{num(user.id)}</span></div>
          {user.phone && <div>📞 <span dir="ltr">{user.phone}</span></div>}
          <div>{t('adminConsole.users.joined', { date: formatDateTime(user.createdAt, lang, { withTime: false }) })}</div>
          <div>{t('adminConsole.users.login_methods', { methods: methods.join(', ') })}</div>
          <div>
            {t('adminConsole.users.stat_applications', { count: num(user.stats.applications) })}
            {' · '}{t('adminConsole.users.stat_jobs', { count: num(user.stats.jobPosts) })}
            {' · '}{t('adminConsole.users.stat_reports', { count: num(user.stats.reportsAgainst) })}
          </div>
        </div>

        {!manageable ? (
          <p style={{ marginTop: '16px', padding: '10px 12px', backgroundColor: '#f7fafc', borderRadius: '8px', fontSize: '14px', color: '#4a5568' }}>
            {user.id === me?.id ? t('adminConsole.users.cant_manage_self') : t('adminConsole.users.cant_manage_admin')}
          </p>
        ) : (
          <>
            <SectionTitle>{t('adminConsole.users.section_status')}</SectionTitle>
            {user.accountStatus !== 'ACTIVE' && (
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#9b2c2c' }}>
                {user.statusReason && t('adminConsole.users.status_reason', { reason: user.statusReason })}
                {user.suspendedUntil && <> · {t('adminConsole.users.suspended_until', { date: formatDateTime(user.suspendedUntil, lang) })}</>}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {user.accountStatus === 'ACTIVE' ? (
                <>
                  <button type="button" onClick={() => openMode('suspend')} style={buttonStyle('secondary')}>{t('adminConsole.users.suspend')}</button>
                  <button type="button" onClick={() => openMode('ban')} style={buttonStyle('danger')}>{t('adminConsole.users.ban')}</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => openMode('reactivate')} style={buttonStyle('success')}>{t('adminConsole.users.reactivate')}</button>
                  {user.accountStatus === 'SUSPENDED' && (
                    <button type="button" onClick={() => openMode('ban')} style={buttonStyle('danger')}>{t('adminConsole.users.ban')}</button>
                  )}
                </>
              )}
            </div>

            <SectionTitle>{t('adminConsole.users.section_access')}</SectionTitle>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!user.verified && (
                <>
                  <button type="button" disabled={busy} onClick={() => run(() => axios.post(`/api/admin/users/${userId}/resend-verification`, {}, cfg), t('adminConsole.users.verification_sent'))} style={buttonStyle('secondary')}>
                    {t('adminConsole.users.resend')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => run(() => axios.put(`/api/admin/users/${userId}/verify`, {}, cfg), t('adminConsole.users.verified_done'))} style={buttonStyle('success')}>
                    {t('adminConsole.users.verify')}
                  </button>
                </>
              )}
              <button type="button" onClick={() => openMode('reset')} style={buttonStyle('secondary')}>{t('adminConsole.users.reset_password')}</button>
            </div>
            {error && !mode && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}

            <SectionTitle>{t('adminConsole.users.section_role')}</SectionTitle>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                aria-label={t('adminConsole.users.change_role')}
                value={newRole || user.role}
                onChange={(e) => setNewRole(e.target.value)}
                style={inputStyle}
              >
                {roles.map((r) => <option key={r} value={r}>{t(`adminConsole.role.${r}`)}</option>)}
                {!roles.includes(user.role) && <option value={user.role}>{t(`adminConsole.role.${user.role}`)}</option>}
              </select>
              <button
                type="button"
                disabled={!newRole || newRole === user.role}
                onClick={() => { setError(''); setMode('role'); }}
                style={{ ...buttonStyle('primary'), opacity: !newRole || newRole === user.role ? 0.5 : 1 }}
              >
                {t('adminConsole.users.change_role')}
              </button>
            </div>
          </>
        )}

        <SectionTitle>{t('adminConsole.users.section_history')}</SectionTitle>
        {user.history.length === 0 ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t('adminConsole.users.no_history')}</p>
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: '18px', fontSize: '13px', color: '#4a5568', lineHeight: 1.8 }}>
            {user.history.map((h) => (
              <li key={h.id}>
                <span dir="auto">{h.summary}</span> <span style={{ color: '#a0aec0' }}>· {h.adminEmail} · {formatDateTime(h.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <Dialog title={title} onClose={onClose} width={620}>
      {body}
    </Dialog>
  );
}

function UsersTab({ notify, me }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const openUserId = Number(searchParams.get('user')) || null;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [verified, setVerified] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        ...(debouncedQuery && { q: debouncedQuery }),
        ...(role !== 'all' && { role }),
        ...(status !== 'all' && { status }),
        ...(verified !== 'all' && { verified })
      };
      const res = await axios.get('/api/admin/users', { params, headers: authHeader() });
      setData(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [page, debouncedQuery, role, status, verified, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    load();
  }, [load]);

  const setFilter = (setter) => (value) => { setter(value); setPage(1); };

  const openUser = (id) => setSearchParams((p) => { const next = new URLSearchParams(p); next.set('user', String(id)); return next; });
  const closeUser = () => setSearchParams((p) => { const next = new URLSearchParams(p); next.delete('user'); return next; });

  const all = t('adminConsole.users.all');

  return (
    <section>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('adminConsole.users.search_placeholder')}
        aria-label={t('adminConsole.users.search_placeholder')}
        style={{ ...inputStyle, width: '100%', marginBottom: '12px' }}
      />
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <FilterPills label={t('adminConsole.users.filter_role')} value={role} onChange={setFilter(setRole)}
          options={[{ value: 'all', label: all }, ...['STUDENT', 'HR', 'ADMIN'].map((r) => ({ value: r, label: t(`adminConsole.role.${r}`) }))]} />
        <FilterPills label={t('adminConsole.users.filter_status')} value={status} onChange={setFilter(setStatus)}
          options={[{ value: 'all', label: all }, ...['ACTIVE', 'SUSPENDED', 'BANNED'].map((s) => ({ value: s, label: t(`adminConsole.account_status.${s}`) }))]} />
        <FilterPills label={t('adminConsole.users.filter_verified')} value={verified} onChange={setFilter(setVerified)}
          options={[{ value: 'all', label: all }, { value: 'yes', label: t('adminConsole.users.verified') }, { value: 'no', label: t('adminConsole.users.unverified') }]} />
      </div>

      <p style={{ ...mutedStyle, margin: '0 0 10px 0' }}>{t('adminConsole.users.results', { count: num(data.total) })}</p>

      {loading && data.users.length === 0 ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : data.users.length === 0 ? (
        <EmptyState>{t('adminConsole.users.no_users')}</EmptyState>
      ) : (
        <div style={{ ...cardStyle, padding: 0, opacity: loading ? 0.6 : 1 }}>
          {data.users.map((u, i) => (
            <div
              key={u.id}
              data-user-id={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid #edf2f7'
              }}
            >
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="auto">
                  {u.name || u.email}{u.id === me?.id && <span style={{ ...mutedStyle, fontWeight: 400 }}> {t('adminConsole.users.you')}</span>}
                </div>
                <div style={{ ...mutedStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span dir="ltr">{u.email}</span> · {t('adminConsole.users.joined', { date: formatDateTime(u.createdAt, lang, { withTime: false }) })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge tone={ROLE_TONE[u.role]}>{t(`adminConsole.role.${u.role}`)}</Badge>
                {u.isSuperAdmin && <Badge tone="red">{t('adminConsole.users.super_admin')}</Badge>}
                {u.accountStatus !== 'ACTIVE' && <Badge tone={accountStatusTone[u.accountStatus]}>{t(`adminConsole.account_status.${u.accountStatus}`)}</Badge>}
                {!u.verified && <Badge tone="yellow">{t('adminConsole.users.unverified')}</Badge>}
              </div>
              <button type="button" onClick={() => openUser(u.id)} style={buttonStyle('secondary')}>{t('adminConsole.users.manage')}</button>
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...buttonStyle('secondary'), opacity: page <= 1 ? 0.5 : 1 }}>{t('adminConsole.jobs.prev')}</button>
          <span style={mutedStyle}>{t('adminConsole.jobs.page', { page: num(page), total: num(data.totalPages) })}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} style={{ ...buttonStyle('secondary'), opacity: page >= data.totalPages ? 0.5 : 1 }}>{t('adminConsole.jobs.next')}</button>
        </div>
      )}

      {openUserId && (
        <UserDetailDialog key={openUserId} userId={openUserId} me={me} notify={notify} onChanged={load} onClose={closeUser} />
      )}
    </section>
  );
}

export default UsersTab;
