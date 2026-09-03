import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', backgroundColor: '#fff' }}>
        <option value="">{label}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Jobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employmentType, setEmploymentType] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

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

  const employmentTypes = useMemo(() => [...new Set(jobs.map((j) => j.employmentType).filter(Boolean))], [jobs]);
  const locations = useMemo(() => [...new Set(jobs.map((j) => j.location).filter(Boolean))], [jobs]);
  const workModes = useMemo(() => [...new Set(jobs.map((j) => j.workMode).filter(Boolean))], [jobs]);

  const filteredJobs = useMemo(() => {
    let result = jobs.filter((j) =>
      (!employmentType || j.employmentType === employmentType) &&
      (!location || j.location === location) &&
      (!workMode || j.workMode === workMode)
    );
    result = [...result].sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sortOrder === 'newest' ? diff : -diff;
    });
    return result;
  }, [jobs, employmentType, location, workMode, sortOrder]);

  const clearFilters = () => { setEmploymentType(''); setLocation(''); setWorkMode(''); };
  const hasFilters = employmentType || location || workMode;

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('jobs.loading')}</h3>;

  return (
    <div>
      {/* HERO BANNER */}
      <div className="animate-fade-up" style={{
        background: 'linear-gradient(135deg, #1B2A4A 0%, #14213B 100%)',
        borderBottom: '3px solid #C99A2E', padding: '48px 20px', textAlign: 'center'
      }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.2rem', margin: '0 0 10px 0' }}>{t('jobs.heading')}</h1>
        <p style={{ color: '#e6e9f0', fontSize: '1.05rem', margin: 0 }}>{t('jobs.subtitle')}</p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px 60px 20px', fontFamily: 'sans-serif' }}>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        {jobs.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center' }}>{t('jobs.no_jobs')}</p>
        ) : (
          <div className="sidebar-layout">
            {/* FILTER SIDEBAR */}
            <div style={{ ...cardStyle, position: 'sticky', top: '90px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a202c' }}>{t('jobs.filters')}</h3>
                {hasFilters && (
                  <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    {t('jobs.clear_filters')}
                  </button>
                )}
              </div>
              <FilterSelect label={t('jobs.filter_type')} value={employmentType} onChange={setEmploymentType} options={employmentTypes} />
              <FilterSelect label={t('jobs.filter_location')} value={location} onChange={setLocation} options={locations} />
              <FilterSelect label={t('jobs.filter_mode')} value={workMode} onChange={setWorkMode} options={workModes} />
            </div>

            {/* RESULTS */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#4a5568', fontWeight: '600' }}>{t('jobs.showing_count', { count: filteredJobs.length })}</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #cbd5e0', fontSize: '13px', fontWeight: '600', color: '#1B2A4A', backgroundColor: '#fff', cursor: 'pointer' }}>
                  <option value="newest">{t('jobs.sort_newest')}</option>
                  <option value="oldest">{t('jobs.sort_oldest')}</option>
                </select>
              </div>

              {filteredJobs.length === 0 ? (
                <p style={{ color: '#718096', textAlign: 'center', marginTop: '40px' }}>{t('jobs.no_jobs')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredJobs.map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="hover-lift" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>{timeAgo(job.createdAt, t)}</div>
                            <h3 style={{ margin: '0 0 4px 0', color: '#1a202c' }}>{job.title}</h3>
                            <div style={{ fontSize: '14px', color: '#718096' }}>
                              {job.hrProfile?.companyName} · {job.hrProfile?.industry}
                            </div>
                          </div>
                          <span style={{ padding: '9px 18px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            {t('jobs.view_details')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                          {job.location && <span style={tagStyle}>📍 {job.location}</span>}
                          {job.employmentType && <span style={tagStyle}>🕘 {job.employmentType}</span>}
                          {job.workMode && <span style={tagStyle}>🏢 {job.workMode}</span>}
                          {job.experienceLevel && <span style={tagStyle}>💼 {job.experienceLevel}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
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
