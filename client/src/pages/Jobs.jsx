import { useState, useEffect, useMemo, useId } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { toLocalizedDigits } from '../localizeDigits';
import { Sparkles, Check, MapPin, Clock, Building2, Briefcase, Mail, Search } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';
import JobDeadline from '../components/JobDeadline';
import ResponsiveFilters from '../components/ResponsiveFilters';

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['On-Site', 'Remote', 'Hybrid'];

// Major cities and districts across the Kurdistan Region's three (plus Halabja)
// governorates. Kept in Latin script to match how HR posts already store
// `location` as free text.
const KURDISTAN_LOCATIONS = [
  'Erbil', 'Shaqlawa', 'Koya', 'Soran', 'Choman', 'Rawanduz', 'Mergasur', 'Khabat', 'Makhmur', 'Harir',
  'Sulaymaniyah', 'Chamchamal', 'Kalar', 'Kifri', 'Ranya', 'Pshdar', 'Dokan', 'Penjwin', 'Sharbazher',
  'Said Sadiq', 'Darbandikhan', 'Qaladze', 'Sharazoor',
  'Halabja',
  'Duhok', 'Zakho', 'Akre', 'Amedi', 'Semel', 'Bardarash', 'Sheikhan', 'Bamarni', 'Mangesh', 'Shekhan'
];

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const tagStyle = { fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' };

function timeAgo(dateStr, t) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return t('jobs.posted_today');
  if (days === 1) return t('jobs.posted_1_day');
  return t('jobs.posted_days', { count: days });
}

const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;

function localizedCategoryName(cat, lang) {
  if (lang === 'ar') return cat.name_ar;
  if (lang === 'ckb') return cat.name_ckb;
  return cat.name_en;
}

function FilterSelect({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', backgroundColor: '#fff' }}>
        <option value="">{label}</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function Jobs() {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Students get a second tab with jobs ranked by how many required skills they have.
  const isStudent = getUser()?.role === 'STUDENT';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = isStudent && searchParams.get('tab') === 'recommended' ? 'recommended' : 'all';
  const [matchInfo, setMatchInfo] = useState(null);

  useEffect(() => {
    if (!isStudent) return;
    axios.get('/api/jobs/matches/mine', { headers: authHeader() })
      .then((res) => setMatchInfo(res.data))
      .catch(() => setMatchInfo({ hasSkills: false, matches: {}, appliedJobIds: [], invitedJobIds: [] }));
  }, [isStudent]);

  const selectTab = (next) => setSearchParams(next === 'recommended' ? { tab: 'recommended' } : {});

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get('/api/jobs');
        setJobs(res.data);
      } catch (err) {
        console.error(err);
        setError(t('jobs.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, []);

  useEffect(() => {
    axios.get('/api/skills/taxonomy')
      .then((res) => {
        const flatCategories = res.data.flatMap((area) => area.categories);
        setCategories(flatCategories);
      })
      .catch(console.error);
  }, []);

  const employmentTypeOptions = useMemo(() => EMPLOYMENT_TYPES.map((val) => ({
    value: val, label: t(`jobPost.employment_${val.toLowerCase().replace('-', '_')}`)
  })), [t]);
  const workModeOptions = useMemo(() => WORK_MODES.map((val) => ({
    value: val, label: t(`jobPost.work_mode_${val.toLowerCase().replace('-', '')}`)
  })), [t]);
  const locationOptions = useMemo(() => KURDISTAN_LOCATIONS.map((val) => ({ value: val, label: val })), []);
  const categoryOptions = useMemo(() => categories
    .map((cat) => ({ value: String(cat.id), label: localizedCategoryName(cat, i18n.language) }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  [categories, i18n.language]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = jobs.filter((j) => {
      if (employmentType && j.employmentType !== employmentType) return false;
      if (location && j.location !== location) return false;
      if (workMode && j.workMode !== workMode) return false;
      if (fieldOfStudy && !j.skills?.some((s) => String(s.skill.categoryId) === fieldOfStudy)) return false;
      if (q) {
        const haystack = [
          j.title,
          j.description,
          j.hrProfile?.companyName,
          ...(j.skills || []).map((s) => s.skill.name_en)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const byDate = (a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sortOrder === 'newest' ? diff : -diff;
    };
    if (tab === 'recommended') {
      const m = matchInfo?.matches || {};
      // Best coverage first, then proficiency in the matched skills, then date.
      return result
        .filter((j) => m[j.id]?.matched > 0)
        .sort((a, b) => (m[b.id].percent - m[a.id].percent) || (m[b.id].proficiency - m[a.id].proficiency) || byDate(a, b));
    }
    return [...result].sort(byDate);
  }, [jobs, query, employmentType, location, workMode, fieldOfStudy, sortOrder, tab, matchInfo]);

  const clearFilters = () => { setQuery(''); setEmploymentType(''); setLocation(''); setWorkMode(''); setFieldOfStudy(''); };
  const hasFilters = query || employmentType || location || workMode || fieldOfStudy;

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('jobs.loading')}</h3>;

  return (
    <div>
      {/* HERO BANNER */}
      <div className="animate-fade-up" style={{
        background: 'linear-gradient(135deg, #1B2A4A 0%, #14213B 100%)',
        borderBottom: '3px solid #C99A2E', padding: '48px 20px', textAlign: 'center'
      }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.2rem', margin: '0 0 10px 0' }}>{t('jobs.heading')}</h1>
        <p style={{ color: '#e6e9f0', fontSize: '1.05rem', margin: '0 0 24px 0' }}>{t('jobs.subtitle')}</p>
        {/* Filtering happens as you type; the button is here for the Enter key
            and for anyone who expects one. */}
        <form className="banner-search" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('jobs.search_placeholder')}
            aria-label={t('jobs.search_placeholder')}
          />
          <button type="submit">
            <InlineIcon icon={Search} size={17} />
            {t('hero.search_button')}
          </button>
        </form>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px 60px 20px' }}>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        {isStudent && jobs.length > 0 && (
          <div role="tablist" aria-label={t('jobs.heading')} style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '22px', flexWrap: 'wrap' }}>
            {['all', 'recommended'].map((key) => {
              const selected = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectTab(key)}
                  style={{
                    padding: '10px 16px', background: 'none', border: 'none', marginBottom: '-2px', cursor: 'pointer',
                    borderBottom: `3px solid ${selected ? '#C99A2E' : 'transparent'}`,
                    fontSize: '15px', fontWeight: selected ? 700 : 600, color: selected ? '#1B2A4A' : '#718096'
                  }}
                >
                  {key === 'recommended' && <InlineIcon icon={Sparkles} tone="gold" />} {t(`jobs.tab_${key}`)}
                </button>
              );
            })}
          </div>
        )}

        {jobs.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center' }}>{t('jobs.no_jobs')}</p>
        ) : (
          <div className="sidebar-layout">
            {/* FILTER SIDEBAR */}
            <ResponsiveFilters className="jobs-filters">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a202c' }}>{t('jobs.filters')}</h3>
                {hasFilters && (
                  <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    {t('jobs.clear_filters')}
                  </button>
                )}
              </div>
              <FilterSelect label={t('jobs.filter_field')} value={fieldOfStudy} onChange={setFieldOfStudy} options={categoryOptions} />
              <FilterSelect label={t('jobs.filter_type')} value={employmentType} onChange={setEmploymentType} options={employmentTypeOptions} />
              <FilterSelect label={t('jobs.filter_location')} value={location} onChange={setLocation} options={locationOptions} />
              <FilterSelect label={t('jobs.filter_mode')} value={workMode} onChange={setWorkMode} options={workModeOptions} />
            </ResponsiveFilters>

            {/* RESULTS */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#4a5568', fontWeight: '600' }}>{t('jobs.showing_count', { count: filteredJobs.length })}</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #cbd5e0', fontSize: '13px', fontWeight: '600', color: '#1B2A4A', backgroundColor: '#fff', cursor: 'pointer' }}>
                  <option value="newest">{t('jobs.sort_newest')}</option>
                  <option value="oldest">{t('jobs.sort_oldest')}</option>
                </select>
              </div>

              {tab === 'recommended' && (
                <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#4a5568' }}>{t('jobs.recommended_intro')}</p>
              )}

              {tab === 'recommended' && matchInfo === null ? (
                <p style={{ color: '#718096', textAlign: 'center', marginTop: '40px' }}>{t('jobs.loading')}</p>
              ) : tab === 'recommended' && !matchInfo.hasSkills ? (
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <p style={{ color: '#4a5568', margin: '0 0 12px 0' }}>{t('jobs.recommended_no_skills')}</p>
                  <Link to="/student-dashboard?section=skills" style={{ padding: '9px 18px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                    {t('jobs.add_skills')}
                  </Link>
                </div>
              ) : filteredJobs.length === 0 ? (
                <p style={{ color: '#718096', textAlign: 'center', marginTop: '40px' }}>
                  {tab === 'recommended' && !hasFilters ? t('jobs.recommended_empty') : t('jobs.no_jobs')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredJobs.map((job) => {
                    const match = matchInfo?.matches?.[job.id];
                    const applied = matchInfo?.appliedJobIds.includes(job.id);
                    const invited = matchInfo?.invitedJobIds.includes(job.id);
                    const skillById = Object.fromEntries((job.skills || []).map((js) => [js.skill.id, js.skill]));
                    const num = (n) => toLocalizedDigits(String(n), i18n.language);
                    return (
                      <article key={job.id} data-job-id={job.id} className="hover-lift" style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>{timeAgo(job.createdAt, t)}</div>
                            <h3 style={{ margin: '0 0 4px 0' }}>
                              <Link to={`/jobs/${job.id}`} style={{ color: '#1a202c', textDecoration: 'none' }}>{job.title}</Link>
                            </h3>
                            <div style={{ fontSize: '14px', color: '#718096' }}>
                              {job.hrProfile?.companyName} · {job.hrProfile?.industry}
                            </div>
                          </div>
                          {match?.matched > 0 && (
                            <span
                              data-match
                              style={{
                                padding: '5px 12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
                                backgroundColor: match.percent >= 50 ? '#e6f4ea' : '#fdf6e3', color: match.percent >= 50 ? '#276749' : '#8a6d1d'
                              }}
                            >
                              <InlineIcon icon={Check} size={13} /> {t('jobs.match_badge', { matched: num(match.matched), total: num(match.total) })}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                          <JobDeadline job={job} />
                          {job.location && <span style={tagStyle}><InlineIcon icon={MapPin} tone="gold" size={13} /> {job.location}</span>}
                          {job.employmentType && <span style={tagStyle}><InlineIcon icon={Clock} tone="gold" size={13} /> {job.employmentType}</span>}
                          {job.workMode && <span style={tagStyle}><InlineIcon icon={Building2} tone="gold" size={13} /> {job.workMode}</span>}
                          {job.experienceLevel && <span style={tagStyle}><InlineIcon icon={Briefcase} tone="gold" size={13} /> {job.experienceLevel}</span>}
                        </div>

                        {tab === 'recommended' && match && (
                          <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              <strong style={{ color: '#276749' }}>{t('jobs.you_have')}</strong>
                              {match.matchedSkillIds.map((id) => skillById[id] && (
                                <span key={id} style={{ padding: '2px 9px', borderRadius: '10px', backgroundColor: '#e6f4ea', color: '#276749' }}><InlineIcon icon={Check} size={12} /> {skillName(skillById[id], i18n.language)}</span>
                              ))}
                            </div>
                            {match.missingSkillIds.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                <strong style={{ color: '#718096' }}>{t('jobs.missing')}</strong>
                                {match.missingSkillIds.map((id) => skillById[id] && (
                                  <span key={id} style={{ padding: '2px 9px', borderRadius: '10px', backgroundColor: '#edf2f7', color: '#4a5568' }}>{skillName(skillById[id], i18n.language)}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
                          {invited && !applied && <span style={{ fontSize: '13px', fontWeight: 600, color: '#8a6d1d' }}><InlineIcon icon={Mail} size={13} /> {t('jobs.invited')}</span>}
                          <Link to={`/jobs/${job.id}`} style={{ padding: '9px 18px', border: '1px solid #cbd5e0', color: '#1B2A4A', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                            {t('jobs.view_details')}
                          </Link>
                          {isStudent && (applied ? (
                            <span style={{ padding: '9px 18px', backgroundColor: '#e6f4ea', color: '#276749', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}><InlineIcon icon={Check} size={13} /> {t('jobs.applied')}</span>
                          ) : (
                            <Link to={`/jobs/${job.id}?apply=1`} style={{ padding: '9px 18px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                              {t('jobs.apply')}
                            </Link>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Jobs;
