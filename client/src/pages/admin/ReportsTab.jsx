import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime } from '../../localizeDigits';
import { Dialog, ReasonDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, FilterPills, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, accountStatusTone } from './adminStyles';

const TARGET_ICON = { USER: '👤', MESSAGE: '💬', JOB: '💼' };

// What the reported thing looks like right now (it may have changed or been deleted).
function CurrentTarget({ report }) {
  const { t } = useTranslation();
  const target = report.target;
  if (!target) return <span style={{ color: '#9b2c2c' }}>{t('adminConsole.reports.target_gone')}</span>;

  if (report.targetType === 'USER') {
    const name = target.studentProfile?.fullName || target.hrProfile?.companyName || target.email;
    return (
      <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>{name}</strong>
        <span dir="ltr">({target.email})</span>
        <Badge tone="blue">{t(`adminConsole.role.${target.role}`)}</Badge>
        <Badge tone={accountStatusTone[target.accountStatus]}>{t(`adminConsole.account_status.${target.accountStatus}`)}</Badge>
      </span>
    );
  }
  if (report.targetType === 'MESSAGE') {
    return (
      <span>
        <span style={mutedStyle}>{t('adminConsole.reports.message_from', { email: target.sender?.email })} </span>
        <Badge tone={accountStatusTone[target.sender?.accountStatus] || 'gray'}>{t(`adminConsole.account_status.${target.sender?.accountStatus || 'ACTIVE'}`)}</Badge>
        <span dir="auto" style={{ display: 'block', marginTop: '4px', padding: '8px 10px', backgroundColor: '#f7fafc', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{target.content}</span>
      </span>
    );
  }
  const state = target.removedByAdmin ? 'removed' : target.isActive ? 'active' : 'inactive';
  return (
    <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <strong dir="auto">{target.title}</strong>
      <span style={mutedStyle}>{t('adminConsole.reports.job_by', { company: target.hrProfile?.companyName })}</span>
      <Badge tone={state === 'active' ? 'green' : state === 'removed' ? 'red' : 'gray'}>{t(`adminConsole.jobs.status.${state}`)}</Badge>
    </span>
  );
}

function ReportsTab({ notify, refreshCounts }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [status, setStatus] = useState('OPEN');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null); // { report, status }
  const [removingJob, setRemovingJob] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/reports', { params: { status }, headers: authHeader() });
      setReports(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [status, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the filter changes
    load();
  }, [load]);

  const closeReport = async (note) => {
    await axios.put(`/api/admin/reports/${closing.report.id}`, { status: closing.status, note }, { headers: authHeader() });
    notify(t(closing.status === 'RESOLVED' ? 'adminConsole.reports.resolved' : 'adminConsole.reports.dismissed'));
    setReports((list) => list.filter((r) => r.id !== closing.report.id));
    setClosing(null);
    refreshCounts();
  };

  const removeJob = async (reason) => {
    await axios.put(`/api/admin/jobs/${removingJob.targetId}/remove`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.jobs.removed'));
    setRemovingJob(null);
    load();
  };

  const deleteMessage = async () => {
    try {
      await axios.delete(`/api/admin/messages/${deletingMessage.targetId}`, { headers: authHeader() });
      notify(t('adminConsole.reports.message_deleted'));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    } finally {
      setDeletingMessage(null);
    }
  };

  return (
    <section>
      <div style={{ marginBottom: '16px' }}>
        <FilterPills
          label={t('adminConsole.tabs.reports')}
          value={status}
          onChange={setStatus}
          options={['OPEN', 'RESOLVED', 'DISMISSED'].map((s) => ({ value: s, label: t(`adminConsole.reports.filter.${s}`) }))}
        />
      </div>

      {loading && reports.length === 0 ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : reports.length === 0 ? (
        <EmptyState>{t('adminConsole.reports.no_reports')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: loading ? 0.6 : 1 }}>
          {reports.map((r) => {
            const target = r.target;
            return (
              <article key={r.id} data-report-id={r.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Badge tone="gray">{TARGET_ICON[r.targetType]} {t(`adminConsole.reports.target.${r.targetType}`)}</Badge>
                  <Badge tone="red">{t(`report.reasons.${r.reason}`)}</Badge>
                  <span style={mutedStyle}>
                    {t('adminConsole.reports.reported_by', { email: r.reporter?.email, date: formatDateTime(r.createdAt, lang) })}
                  </span>
                </div>

                {r.details && <p dir="auto" style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#2d3748' }}>{t('adminConsole.reports.details', { details: r.details })}</p>}

                <div style={{ marginTop: '10px', fontSize: '14px', color: '#2d3748', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: '#718096', textTransform: 'uppercase' }}>{t('adminConsole.reports.current')}</div>
                  <CurrentTarget report={r} />
                </div>

                {r.targetSnapshot && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#4a5568' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: '#718096', textTransform: 'uppercase' }}>{t('adminConsole.reports.snapshot')}</div>
                    <span dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{r.targetSnapshot}</span>
                  </div>
                )}

                {r.status !== 'OPEN' && (
                  <p style={{ ...mutedStyle, margin: '10px 0 0 0' }}>
                    {t('adminConsole.reports.closed_by', { email: r.resolvedBy?.email || '-', date: formatDateTime(r.resolvedAt, lang) })}
                    {r.resolutionNote && <><br />{t('adminConsole.reports.note', { note: r.resolutionNote })}</>}
                  </p>
                )}

                {r.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #edf2f7' }}>
                    {r.targetType === 'JOB' && target?.isActive && (
                      <>
                        <Link to={`/jobs/${target.id}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>{t('adminConsole.reports.view_job')}</Link>
                        <button type="button" onClick={() => setRemovingJob(r)} style={buttonStyle('danger')}>{t('adminConsole.jobs.remove')}</button>
                      </>
                    )}
                    {r.targetType === 'MESSAGE' && target && (
                      <button type="button" onClick={() => setDeletingMessage(r)} style={buttonStyle('danger')}>{t('adminConsole.reports.delete_message')}</button>
                    )}
                    {r.targetType === 'USER' && target?.studentProfile && (
                      <Link to={`/students/${target.studentProfile.id}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>{t('adminConsole.reports.view_profile')}</Link>
                    )}
                    <span style={{ flex: 1 }} />
                    <button type="button" onClick={() => setClosing({ report: r, status: 'DISMISSED' })} style={buttonStyle('secondary')}>{t('adminConsole.reports.dismiss')}</button>
                    <button type="button" onClick={() => setClosing({ report: r, status: 'RESOLVED' })} style={buttonStyle('success')}>{t('adminConsole.reports.resolve')}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {closing && (
        <ReasonDialog
          title={t(closing.status === 'RESOLVED' ? 'adminConsole.reports.resolve_title' : 'adminConsole.reports.dismiss_title')}
          hint={t('adminConsole.reports.close_hint')}
          confirmLabel={t(closing.status === 'RESOLVED' ? 'adminConsole.reports.resolve' : 'adminConsole.reports.dismiss')}
          variant={closing.status === 'RESOLVED' ? 'success' : 'primary'}
          onConfirm={closeReport}
          onClose={() => setClosing(null)}
        />
      )}
      {removingJob && (
        <ReasonDialog
          title={t('adminConsole.jobs.remove_title', { title: removingJob.target?.title })}
          hint={t('adminConsole.jobs.remove_hint')}
          minLength={5}
          confirmLabel={t('adminConsole.jobs.remove')}
          onConfirm={removeJob}
          onClose={() => setRemovingJob(null)}
        />
      )}
      {deletingMessage && (
        <Dialog title={t('adminConsole.reports.delete_message')} onClose={() => setDeletingMessage(null)}>
          <p style={{ margin: '0 0 16px 0', color: '#4a5568', fontSize: '14px' }}>{t('adminConsole.reports.delete_message_confirm')}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setDeletingMessage(null)} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
            <button type="button" onClick={deleteMessage} style={buttonStyle('danger')}>{t('adminConsole.reports.delete_message')}</button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

export default ReportsTab;
