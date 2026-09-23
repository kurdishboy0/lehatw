import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { Dialog, ReasonDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, FilterPills, SectionHeading, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle, accountStatusTone } from './adminStyles';

const MIN_REASON = 5;

function CompaniesSection({ notify, refreshCounts }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('PENDING');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/companies', { params: { status }, headers: authHeader() });
      setCompanies(res.data);
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

  const approve = async (company) => {
    try {
      await axios.put(`/api/admin/companies/${company.id}/approve`, {}, { headers: authHeader() });
      notify(t('adminConsole.approvals.company_approved', { name: company.companyName }));
      setCompanies((list) => list.filter((c) => c.id !== company.id));
      refreshCounts();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const reject = async (reason) => {
    await axios.put(`/api/admin/companies/${rejecting.id}/reject`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.approvals.company_rejected', { name: rejecting.companyName }));
    setCompanies((list) => list.filter((c) => c.id !== rejecting.id));
    setRejecting(null);
    refreshCounts();
  };

  return (
    <section style={{ marginBottom: '36px' }}>
      <SectionHeading
        actions={
          <FilterPills
            label={t('adminConsole.approvals.companies_heading')}
            value={status}
            onChange={setStatus}
            options={['PENDING', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: t(`adminConsole.approvals.filter.${s}`) }))}
          />
        }
      >
        🏢 {t('adminConsole.approvals.companies_heading')}
      </SectionHeading>

      {loading ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : companies.length === 0 ? (
        <EmptyState>{t('adminConsole.approvals.no_companies')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {companies.map((c) => (
            <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '16px', color: '#1a202c' }}>{c.companyName}</strong>
                  {c.user.accountStatus !== 'ACTIVE' && (
                    <Badge tone={accountStatusTone[c.user.accountStatus]}>{t(`adminConsole.account_status.${c.user.accountStatus}`)}</Badge>
                  )}
                </div>
                <div style={{ ...mutedStyle, marginTop: '4px', lineHeight: 1.7 }}>
                  <div>✉️ <span dir="ltr">{c.user.email}</span></div>
                  {c.user.phone && <div>📞 <span dir="ltr">{c.user.phone}</span> · {t('adminConsole.approvals.phone')}</div>}
                  <div>{t('adminConsole.approvals.industry')}: {c.industry || '-'} · {t('adminConsole.approvals.job_title')}: {c.jobTitle || '-'}</div>
                  <div>{t('adminConsole.approvals.cr_number')}: <span dir="ltr">{c.crNumber || '-'}</span></div>
                  <div>{t('adminConsole.approvals.registered', { date: formatDateTime(c.user.createdAt, i18n.language, { withTime: false }) })}</div>
                </div>
                {c.status === 'REJECTED' && c.rejectionReason && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9b2c2c' }}>
                    {t('adminConsole.approvals.previous_reason', { reason: c.rejectionReason })}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                {c.status !== 'APPROVED' && (
                  <button type="button" onClick={() => approve(c)} style={buttonStyle('success')}>{t('adminConsole.approvals.approve')}</button>
                )}
                {c.status !== 'REJECTED' && (
                  <button type="button" onClick={() => setRejecting(c)} style={buttonStyle('danger')}>{t('adminConsole.approvals.reject')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <ReasonDialog
          title={t('adminConsole.approvals.reject_company_title', { name: rejecting.companyName })}
          hint={t('adminConsole.approvals.reject_company_hint')}
          minLength={MIN_REASON}
          confirmLabel={t('adminConsole.approvals.reject')}
          onConfirm={reject}
          onClose={() => setRejecting(null)}
        />
      )}
    </section>
  );
}

function MergeDialog({ skill, preselectedId, catalog, onMerged, onClose }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(preselectedId || null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const others = skill.sameNameCount - 1;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? catalog.filter((s) => s.name_en.toLowerCase().includes(q)) : catalog;
    // Keep the chosen skill visible even when the search would hide it.
    const chosen = catalog.find((s) => s.id === selectedId);
    const limited = list.slice(0, 30);
    return chosen && !limited.includes(chosen) ? [chosen, ...limited] : limited;
  }, [query, catalog, selectedId]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.put(`/api/admin/custom-skills/${skill.id}/merge`,
        { skillId: selectedId, applyToAll: others > 0 && applyToAll },
        { headers: authHeader() });
      onMerged(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={t('adminConsole.approvals.merge_title', { name: skill.name })} onClose={onClose} width={520}>
      <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t('adminConsole.approvals.merge_hint')}</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('adminConsole.approvals.merge_search_placeholder')}
        style={{ ...inputStyle, width: '100%' }}
      />
      <div role="listbox" aria-label={t('adminConsole.approvals.merge_search_placeholder')} style={{ marginTop: '8px', maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        {matches.length === 0 ? (
          <p style={{ ...mutedStyle, padding: '12px', margin: 0 }}>{t('adminConsole.approvals.merge_no_results')}</p>
        ) : matches.map((s) => (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={s.id === selectedId}
            onClick={() => setSelectedId(s.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'start', padding: '9px 12px', border: 'none',
              borderBottom: '1px solid #f1f1f1', cursor: 'pointer', fontSize: '14px',
              backgroundColor: s.id === selectedId ? '#FCF6E3' : 'white', fontWeight: s.id === selectedId ? 700 : 400
            }}
          >
            {s.name_en}
          </button>
        ))}
      </div>
      {others > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '14px', color: '#2d3748' }}>
          <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
          {t('adminConsole.approvals.merge_apply_all', { count: toLocalizedDigits(String(others), i18n.language) })}
        </label>
      )}
      {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
        <button type="button" onClick={submit} disabled={!selectedId || busy} style={{ ...buttonStyle('primary'), opacity: !selectedId || busy ? 0.5 : 1 }}>
          {t('adminConsole.approvals.merge_confirm')}
        </button>
      </div>
    </Dialog>
  );
}

function SkillsSection({ notify, refreshCounts }) {
  const { t, i18n } = useTranslation();
  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null); // { skill, preselectedId }
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/custom-skills', { headers: authHeader() });
      setSkills(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
    axios.get('/api/jobs/skills').then((res) => setCatalog(res.data)).catch(() => {});
  }, [load]);

  const approve = async (skill) => {
    try {
      await axios.put(`/api/admin/custom-skills/${skill.id}/approve`, {}, { headers: authHeader() });
      notify(t('adminConsole.approvals.skill_approved', { name: skill.name }));
      setSkills((list) => list.filter((s) => s.id !== skill.id));
      refreshCounts();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const reject = async (reason) => {
    await axios.put(`/api/admin/custom-skills/${rejecting.id}/reject`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.approvals.skill_rejected', { name: rejecting.name }));
    setSkills((list) => list.filter((s) => s.id !== rejecting.id));
    setRejecting(null);
    refreshCounts();
  };

  const onMerged = (result) => {
    setMerging(null);
    notify(t('adminConsole.approvals.merged', {
      count: toLocalizedDigits(String(result.mergedCount), i18n.language),
      students: toLocalizedDigits(String(result.studentsUpdated), i18n.language)
    }));
    load(); // other entries with the same name may be gone too
    refreshCounts();
  };

  return (
    <section>
      <SectionHeading>🧩 {t('adminConsole.approvals.skills_heading')}</SectionHeading>

      {loading ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : skills.length === 0 ? (
        <EmptyState>{t('adminConsole.approvals.no_skills')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {skills.map((s) => (
            <div key={s.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">{s.name}</strong>
                <div style={{ ...mutedStyle, marginTop: '4px' }}>
                  {t('adminConsole.approvals.submitted_by', { name: s.studentProfile?.fullName })}
                  {s.sameNameCount > 1 && (
                    <> · <Badge tone="blue">{t('adminConsole.approvals.same_name_count', { count: toLocalizedDigits(String(s.sameNameCount), i18n.language) })}</Badge></>
                  )}
                </div>
                {s.suggestions?.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#4a5568', fontWeight: 600 }}>{t('adminConsole.approvals.looks_like')}</span>
                    {s.suggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => setMerging({ skill: s, preselectedId: sug.id })}
                        title={t('adminConsole.approvals.merge_into', { name: sug.name_en })}
                        style={{
                          fontSize: '13px', padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                          border: `1px solid ${sug.exactMatch ? '#C99A2E' : '#cbd5e0'}`,
                          backgroundColor: sug.exactMatch ? '#FCF6E3' : 'white', color: '#1B2A4A', fontWeight: 600
                        }}
                      >
                        ⤵ {sug.name_en}{sug.exactMatch ? ` (${t('adminConsole.approvals.exact_match')})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setMerging({ skill: s, preselectedId: null })} style={buttonStyle('secondary')}>
                  {t('adminConsole.approvals.merge_other')}
                </button>
                <button type="button" onClick={() => approve(s)} style={buttonStyle('success')}>{t('adminConsole.approvals.approve')}</button>
                <button type="button" onClick={() => setRejecting(s)} style={buttonStyle('danger')}>{t('adminConsole.approvals.reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {merging && (
        <MergeDialog
          skill={merging.skill}
          preselectedId={merging.preselectedId}
          catalog={catalog}
          onMerged={onMerged}
          onClose={() => setMerging(null)}
        />
      )}
      {rejecting && (
        <ReasonDialog
          title={t('adminConsole.approvals.reject_skill_title', { name: rejecting.name })}
          hint={t('adminConsole.approvals.reject_skill_hint')}
          confirmLabel={t('adminConsole.approvals.reject')}
          onConfirm={reject}
          onClose={() => setRejecting(null)}
        />
      )}
    </section>
  );
}

function InstructorsSection({ notify, refreshCounts }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('PENDING');
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/instructors', { params: { status }, headers: authHeader() });
      setInstructors(res.data);
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

  const approve = async (instructor) => {
    try {
      await axios.put(`/api/admin/instructors/${instructor.id}/approve`, {}, { headers: authHeader() });
      notify(t('adminConsole.approvals.instructor_approved', { name: instructor.fullName }));
      setInstructors((list) => list.filter((i) => i.id !== instructor.id));
      refreshCounts();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const reject = async (reason) => {
    await axios.put(`/api/admin/instructors/${rejecting.id}/reject`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.approvals.instructor_rejected', { name: rejecting.fullName }));
    setInstructors((list) => list.filter((i) => i.id !== rejecting.id));
    setRejecting(null);
    refreshCounts();
  };

  return (
    <section style={{ marginBottom: '36px' }}>
      <SectionHeading
        actions={
          <FilterPills
            label={t('adminConsole.approvals.instructors_heading')}
            value={status}
            onChange={setStatus}
            options={['PENDING', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: t(`adminConsole.approvals.filter.${s}`) }))}
          />
        }
      >
        🎓 {t('adminConsole.approvals.instructors_heading')}
      </SectionHeading>

      {loading ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : instructors.length === 0 ? (
        <EmptyState>{t('adminConsole.approvals.no_instructors')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {instructors.map((i) => (
            <div key={i.id} data-instructor-id={i.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">{i.fullName}</strong>
                  {i.user.accountStatus !== 'ACTIVE' && (
                    <Badge tone={accountStatusTone[i.user.accountStatus]}>{t(`adminConsole.account_status.${i.user.accountStatus}`)}</Badge>
                  )}
                </div>
                <div style={{ ...mutedStyle, marginTop: '4px', lineHeight: 1.7 }}>
                  {i.headline && <div dir="auto">{i.headline}</div>}
                  <div>✉️ <span dir="ltr">{i.user.email}</span></div>
                  {i.phone && <div>📞 <span dir="ltr">{i.phone}</span></div>}
                  {i.expertise && <div dir="auto">{t('adminConsole.approvals.teaches', { expertise: i.expertise })}</div>}
                  <div>{t('adminConsole.approvals.registered', { date: formatDateTime(i.user.createdAt, i18n.language, { withTime: false }) })}</div>
                </div>
                {i.bio && <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#4a5568', lineHeight: 1.6 }} dir="auto">{i.bio}</p>}
                {i.status === 'REJECTED' && i.rejectionReason && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9b2c2c' }}>
                    {t('adminConsole.approvals.previous_reason', { reason: i.rejectionReason })}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                {i.status !== 'APPROVED' && (
                  <button type="button" onClick={() => approve(i)} style={buttonStyle('success')}>{t('adminConsole.approvals.approve')}</button>
                )}
                {i.status !== 'REJECTED' && (
                  <button type="button" onClick={() => setRejecting(i)} style={buttonStyle('danger')}>{t('adminConsole.approvals.reject')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <ReasonDialog
          title={t('adminConsole.approvals.reject_instructor_title', { name: rejecting.fullName })}
          hint={t('adminConsole.approvals.reject_instructor_hint')}
          minLength={MIN_REASON}
          confirmLabel={t('adminConsole.approvals.reject')}
          onConfirm={reject}
          onClose={() => setRejecting(null)}
        />
      )}
    </section>
  );
}

function ApprovalsTab({ notify, refreshCounts }) {
  return (
    <>
      <CompaniesSection notify={notify} refreshCounts={refreshCounts} />
      <InstructorsSection notify={notify} refreshCounts={refreshCounts} />
      <SkillsSection notify={notify} refreshCounts={refreshCounts} />
    </>
  );
}

export default ApprovalsTab;
