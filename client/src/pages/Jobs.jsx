import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Jobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/jobs');
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

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('jobs.loading')}</h3>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#1a202c', margin: '0 0 6px 0' }}>{t('jobs.heading')}</h2>
        <p style={{ color: '#718096', margin: 0 }}>{t('jobs.subtitle')}</p>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {jobs.length === 0 ? (
        <p style={{ color: '#718096', textAlign: 'center' }}>{t('jobs.no_jobs')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {jobs.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px',
                backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', color: '#1a202c' }}>{job.title}</h3>
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                      {job.hrProfile?.companyName} · {job.hrProfile?.industry}
                    </div>
                  </div>
                  <span style={{ padding: '6px 16px', backgroundColor: '#3182ce', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {t('jobs.view_details')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                  {job.location && <span style={{ fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>📍 {job.location}</span>}
                  {job.employmentType && <span style={{ fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>🕘 {job.employmentType}</span>}
                  {job.workMode && <span style={{ fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>🏢 {job.workMode}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Jobs;
