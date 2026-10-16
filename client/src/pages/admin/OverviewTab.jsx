import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { toLocalizedDigits } from '../../localizeDigits';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge } from './adminUi';
import { cardStyle, mutedStyle } from './adminStyles';
import { Check } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

// Chart roles (validated categorical slots 1-2 on the white card surface).
const SERIES = { students: '#2a78d6', companies: '#eb6834' };
const GRID = '#edf2f7';
const TEXT_PRIMARY = '#1a202c';
const TEXT_MUTED = '#718096';

const primaryLang = (lang) => (lang || 'en').split('-')[0];

function useNum(lang) {
  return (n) => toLocalizedDigits(Number(n).toLocaleString('en-US'), lang);
}

// "YYYY-MM-DD" (already an Iraq-time day) -> short axis label.
function shortDay(iso, lang) {
  const [, m, d] = iso.split('-').map(Number);
  if (primaryLang(lang) === 'en') {
    return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  return toLocalizedDigits(`${d}/${m}`, lang);
}

function niceScale(max) {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((f) => f * pow).find((s) => s >= rough);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v));
  return { top, ticks };
}

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <section style={{ ...cardStyle, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: TEXT_PRIMARY }}>{title}</h3>
          {subtitle && <p style={{ ...mutedStyle, margin: '4px 0 0 0' }}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub, children }) {
  return (
    <div style={{ ...cardStyle, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: '13px', color: TEXT_MUTED, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: TEXT_PRIMARY, marginTop: '4px' }}>{value}</div>
      {sub && <div style={{ ...mutedStyle, marginTop: '2px' }}>{sub}</div>}
      {children}
    </div>
  );
}

function WeekTile({ label, value, previous, lang }) {
  const { t } = useTranslation();
  const num = useNum(lang);
  const delta = value - previous;
  const deltaText = delta === 0
    ? t('adminConsole.overview.same_as_last_week')
    : t('adminConsole.overview.vs_last_week', { delta: `${delta > 0 ? '▲ +' : '▼ '}${num(delta)}` });
  return (
    <StatTile label={label} value={num(value)}>
      <div style={{ fontSize: '13px', marginTop: '4px', fontWeight: 600, color: delta > 0 ? '#276749' : delta < 0 ? '#9b2c2c' : TEXT_MUTED }}>
        {deltaText}
      </div>
    </StatTile>
  );
}

// Stacked daily columns: students under companies, one hover/focus readout per day.
function SignupsChart({ days, lang }) {
  const { t } = useTranslation();
  const num = useNum(lang);
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const width = 900;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const { top, ticks } = niceScale(Math.max(...days.map((d) => d.students + d.companies)));
  const slot = plotW / days.length;
  const barW = Math.min(24, slot - 6);
  const y = (v) => pad.top + plotH - (v / top) * plotH;
  const GAP = 2;

  // Rounded 4px data-end on top, square at the baseline.
  const segment = (x, y0, y1, roundTop) => {
    const h = y0 - y1;
    if (h <= 0) return null;
    const r = roundTop ? Math.min(4, h, barW / 2) : 0;
    return `M${x},${y0} L${x},${y1 + r} Q${x},${y1} ${x + r},${y1} L${x + barW - r},${y1} Q${x + barW},${y1} ${x + barW},${y1 + r} L${x + barW},${y0} Z`;
  };

  const activeDay = active === null ? null : days[active];
  const activeX = active === null ? 0 : pad.left + slot * active + slot / 2;

  return (
    <SectionCard
      title={t('adminConsole.overview.signups_title')}
      subtitle={t('adminConsole.overview.signups_subtitle')}
      actions={
        <button type="button" onClick={() => setShowTable((s) => !s)} style={{ ...buttonStyle('secondary'), padding: '5px 12px', fontSize: '13px' }}>
          {showTable ? t('adminConsole.overview.hide_table') : t('adminConsole.overview.show_table')}
        </button>
      }
    >
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {['students', 'companies'].map((key) => (
          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: TEXT_PRIMARY }}>
            <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: SERIES[key] }} />
            {t(`adminConsole.overview.legend_${key}`)}
          </span>
        ))}
      </div>

      {/* Time runs left to right in every language, like a calendar strip. */}
      <div dir="ltr" style={{ position: 'relative' }} onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={t('adminConsole.overview.signups_title')} style={{ display: 'block', overflow: 'visible' }}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
              <text x={pad.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill={TEXT_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{num(v)}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = pad.left + slot * i + (slot - barW) / 2;
            const base = y(0);
            const sTop = y(d.students);
            const cTop = y(d.students + d.companies);
            const hasCompanies = d.companies > 0;
            return (
              <g key={d.date}>
                {i === active && <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="#f7fafc" />}
                {d.students > 0 && <path d={segment(x, base, sTop, !hasCompanies)} fill={SERIES.students} />}
                {hasCompanies && <path d={segment(x, sTop - (d.students > 0 ? GAP : 0), cTop, true)} fill={SERIES.companies} />}
                {(i % 7 === (days.length - 1) % 7) && (
                  <text x={pad.left + slot * i + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={TEXT_MUTED}>{shortDay(d.date, lang)}</text>
                )}
                {/* The whole day column is the hit target, not just the painted bar. */}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${shortDay(d.date, lang)}: ${t('adminConsole.overview.legend_students')} ${num(d.students)}, ${t('adminConsole.overview.legend_companies')} ${num(d.companies)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  style={{ outline: 'none', cursor: 'default' }}
                />
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="#cbd5e0" strokeWidth="1" />
        </svg>

        {activeDay && (
          <div
            role="status"
            style={{
              position: 'absolute', top: 0, left: `${(activeX / width) * 100}%`,
              transform: activeX > width * 0.7 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '13px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2
            }}
          >
            <div style={{ color: TEXT_MUTED, marginBottom: '4px' }}>{shortDay(activeDay.date, lang)}</div>
            {['students', 'companies'].map((key) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span aria-hidden="true" style={{ width: '12px', height: '2px', backgroundColor: SERIES[key] }} />
                <strong style={{ color: TEXT_PRIMARY }}>{num(activeDay[key])}</strong>
                <span style={{ color: TEXT_MUTED }}>{t(`adminConsole.overview.legend_${key}`)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTable && (
        <div style={{ overflowX: 'auto', marginTop: '12px', maxHeight: '280px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'start', color: TEXT_MUTED }}>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('adminConsole.overview.col_date')}</th>
                <th style={{ textAlign: 'end', padding: '6px 8px' }}>{t('adminConsole.overview.legend_students')}</th>
                <th style={{ textAlign: 'end', padding: '6px 8px' }}>{t('adminConsole.overview.legend_companies')}</th>
                <th style={{ textAlign: 'end', padding: '6px 8px' }}>{t('adminConsole.overview.total')}</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date} style={{ borderTop: `1px solid ${GRID}`, fontVariantNumeric: 'tabular-nums' }}>
                  <td style={{ padding: '5px 8px' }}>{shortDay(d.date, lang)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'end' }}>{num(d.students)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'end' }}>{num(d.companies)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'end', fontWeight: 600 }}>{num(d.students + d.companies)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// Ranked single-series bars: live job posts asking for each skill.
function SkillsDemand({ skills, lang }) {
  const { t } = useTranslation();
  const num = useNum(lang);
  const max = Math.max(1, ...skills.map((s) => s.jobs));
  const nameOf = (s) => s[`name_${primaryLang(lang)}`] || s.name_en;
  return (
    <SectionCard title={t('adminConsole.overview.skills_title')} subtitle={t('adminConsole.overview.skills_subtitle')}>
      {skills.length === 0 ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{t('adminConsole.overview.no_skills')}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th style={{ textAlign: 'start', padding: '4px 8px 8px 0', fontWeight: 600 }}>{t('adminConsole.overview.col_skill')}</th>
              <th style={{ textAlign: 'start', padding: '4px 8px 8px', fontWeight: 600, width: '45%' }}>{t('adminConsole.overview.col_jobs')}</th>
              <th style={{ textAlign: 'end', padding: '4px 0 8px 8px', fontWeight: 600 }}>{t('adminConsole.overview.col_students')}</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id} data-skill-id={s.id} style={{ borderTop: `1px solid ${GRID}` }}>
                <td style={{ padding: '7px 8px 7px 0', color: TEXT_PRIMARY, fontWeight: 600 }}>{nameOf(s)}</td>
                <td style={{ padding: '7px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      aria-hidden="true"
                      style={{
                        height: '14px', width: `${Math.max(4, (s.jobs / max) * 100)}%`, backgroundColor: SERIES.students,
                        borderStartEndRadius: '4px', borderEndEndRadius: '4px'
                      }}
                    />
                    <span style={{ color: TEXT_PRIMARY, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{num(s.jobs)}</span>
                  </div>
                </td>
                <td style={{ padding: '7px 0 7px 8px', textAlign: 'end', color: TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{num(s.students)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

function TopJobs({ jobs, lang }) {
  const { t } = useTranslation();
  const num = useNum(lang);
  return (
    <SectionCard title={t('adminConsole.overview.jobs_title')}>
      {jobs.length === 0 ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{t('adminConsole.overview.no_jobs')}</p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {jobs.map((j, i) => (
            <li key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: i ? `1px solid ${GRID}` : 'none' }}>
              <span style={{ ...mutedStyle, width: '18px', fontVariantNumeric: 'tabular-nums' }}>{num(i + 1)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div dir="auto" style={{ fontWeight: 600, color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                <div style={mutedStyle}>{j.company}{!j.live && <> · <Badge tone="gray">{t('adminConsole.overview.not_live')}</Badge></>}</div>
              </div>
              <strong style={{ color: TEXT_PRIMARY, fontSize: '16px' }}>{num(j.applications)}</strong>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function OverviewTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = useNum(lang);
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/analytics', { headers: authHeader() });
      setData(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  if (!data) return <p style={mutedStyle}>{t('adminConsole.loading')}</p>;

  const { totals, pending } = data;
  const rate = totals.verification.rate;
  const pendingItems = [
    { key: 'companies', count: pending.companies, tab: 'approvals' },
    { key: 'skills', count: pending.skills, tab: 'approvals' },
    { key: 'reports', count: pending.reports, tab: 'reports' }
  ];
  const anyPending = pendingItems.some((p) => p.count > 0);
  const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: '12px' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section aria-label={t('adminConsole.overview.pending_title')}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: TEXT_PRIMARY }}>{t('adminConsole.overview.pending_title')}</h3>
        {anyPending ? (
          <div style={grid(200)}>
            {pendingItems.map((p) => (
              <div key={p.key} data-pending={p.key} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderColor: p.count ? '#f6c9a8' : '#e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: TEXT_PRIMARY }}>{num(p.count)}</div>
                  <div style={mutedStyle}>{t(`adminConsole.overview.pending_${p.key}`)}</div>
                </div>
                {p.count > 0 && (
                  <button type="button" onClick={() => navigate(`/admin-dashboard?tab=${p.tab}`)} style={{ ...buttonStyle('secondary'), padding: '5px 12px', fontSize: '13px' }}>
                    {t('adminConsole.overview.open')}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ ...cardStyle, margin: 0, color: '#276749', fontWeight: 600 }}><InlineIcon icon={Check} /> {t('adminConsole.overview.all_clear')}</p>
        )}
      </section>

      <div style={grid(170)}>
        <StatTile label={t('adminConsole.overview.students')} value={num(totals.students)} />
        <StatTile label={t('adminConsole.overview.companies')} value={num(totals.companies)} sub={t('adminConsole.overview.companies_approved', { count: num(totals.companiesApproved) })} />
        <StatTile label={t('adminConsole.overview.jobs_live')} value={num(totals.jobsLive)} sub={t('adminConsole.overview.jobs_total', { count: num(totals.jobsTotal) })} />
        <StatTile label={t('adminConsole.overview.applications')} value={num(totals.applications)} />
        <StatTile
          label={t('adminConsole.overview.verification')}
          value={rate === null ? '-' : `${num(Math.round(rate * 100))}%`}
          sub={rate === null
            ? t('adminConsole.overview.verification_none')
            : t('adminConsole.overview.verification_detail', { verified: num(totals.verification.verified), needed: num(totals.verification.needed) })}
        >
          {rate !== null && (
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(rate * 100)}
              aria-label={t('adminConsole.overview.verification')}
              style={{ marginTop: '8px', height: '6px', borderRadius: '3px', backgroundColor: '#dbe8f8', overflow: 'hidden' }}
            >
              <div style={{ height: '100%', width: `${rate * 100}%`, backgroundColor: SERIES.students }} />
            </div>
          )}
        </StatTile>
      </div>

      <section aria-label={t('adminConsole.overview.week_heading')}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: TEXT_PRIMARY }}>{t('adminConsole.overview.week_heading')}</h3>
        <div style={grid(200)}>
          <WeekTile label={t('adminConsole.overview.new_students')} value={data.thisWeek.signups.students} previous={data.lastWeek.signups.students} lang={lang} />
          <WeekTile label={t('adminConsole.overview.new_companies')} value={data.thisWeek.signups.companies} previous={data.lastWeek.signups.companies} lang={lang} />
          <WeekTile label={t('adminConsole.overview.new_applications')} value={data.thisWeek.applications} previous={data.lastWeek.applications} lang={lang} />
        </div>
      </section>

      <SignupsChart days={data.signupsByDay} lang={lang} />

      <div style={grid(340)}>
        <SkillsDemand skills={data.inDemandSkills} lang={lang} />
        <TopJobs jobs={data.topJobs} lang={lang} />
      </div>
    </div>
  );
}

export default OverviewTab;
