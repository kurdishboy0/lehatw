import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SEARCH_DEBOUNCE_MS = 400;

function Avatar({ photoUrl, fullName, size }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={fullName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: '#1B2A4A', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.6, fontWeight: 'bold', flexShrink: 0
    }}>
      {(fullName || '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') || '🎓'}
    </div>
  );
}

function StudentCard({ student, t }) {
  return (
    <div className="hover-lift" style={{
      border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px',
      backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <Avatar photoUrl={student.photoUrl} fullName={student.fullName} size={56} />
        <h3 style={{ margin: 0, color: '#1a202c', fontSize: '19px' }}>{student.fullName}</h3>
      </div>
      <p style={{ margin: '6px 0', color: '#4a5568', fontSize: '15px' }}><strong>🎓 {t('home.uni')}:</strong> {student.university}</p>
      <p style={{ margin: '6px 0', color: '#4a5568', fontSize: '15px' }}><strong>📚 {t('home.major')}:</strong> {student.fieldOfStudy}</p>
      <p style={{ margin: '6px 0', color: '#4a5568', fontSize: '15px' }}><strong>📅 {t('home.class_of')}:</strong> {student.graduationYear}</p>

      {student.skills && student.skills.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {student.skills.slice(0, 4).map(skillObj => (
            <span key={skillObj.id} style={{ backgroundColor: '#edf2f7', color: '#14213B', fontSize: '12px', padding: '5px 10px', borderRadius: '12px' }}>
              {skillObj.skill.name_en}
            </span>
          ))}
          {student.skills.length > 4 && (
            <span style={{ fontSize: '12px', color: '#718096', padding: '5px' }}>+{student.skills.length - 4} {t('home.more')}</span>
          )}
        </div>
      )}

      <Link to={`/students/${student.id}`} style={{ display: 'inline-block', marginTop: '18px', fontSize: '14px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>
        {t('skillMatch.view_profile')} →
      </Link>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="hover-lift" style={{
        border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px',
        backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#1a202c', fontSize: '17px' }}>{job.title}</h3>
        <div style={{ fontSize: '14px', color: '#718096' }}>{job.hrProfile?.companyName} · {job.hrProfile?.industry}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {job.location && <span style={{ fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>📍 {job.location}</span>}
          {job.employmentType && <span style={{ fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' }}>🕘 {job.employmentType}</span>}
        </div>
      </div>
    </Link>
  );
}

function Home() {
  const { t } = useTranslation();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recentJobs, setRecentJobs] = useState([]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = no active search
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Pagination State (only used for the default "recent students" view)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/student/all?page=${currentPage}`);
        setStudents(res.data.students);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        console.error(err);
        setError(t('home.error_load'));
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [currentPage]);

  useEffect(() => {
    axios.get('/api/jobs').then(res => setRecentJobs(res.data.slice(0, 4))).catch(console.error);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing derived results when the query is cleared
      setSearchResults(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const isSearching = query.trim().length > 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.6rem', color: '#2d3748', margin: '0 0 10px 0' }}>{t('home.title')} <span className="animate-float" style={{ filter: 'grayscale(100%)' }}>🚀</span></h1>
        <p style={{ color: '#718096', fontSize: '1.25rem', margin: 0 }}>{t('home.subtitle')}</p>
      </div>

      {/* UNIVERSAL SEARCH BAR */}
      <div className="animate-fade-up" style={{ maxWidth: '640px', margin: '0 auto 40px auto', position: 'relative', animationDelay: '0.12s' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.search_placeholder')}
          style={{
            width: '100%', padding: '16px 20px', fontSize: '16px', borderRadius: '30px',
            border: '2px solid #e2e8f0', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        />
        {isSearching && (
          <button
            onClick={() => setQuery('')}
            aria-label={t('home.clear_search')}
            style={{
              position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#a0aec0'
            }}
          >
            ×
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {isSearching ? (
        /* ---- SEARCH RESULTS ---- */
        <div>
          <h2 style={{ fontSize: '18px', color: '#1a202c' }}>{t('home.results_for', { query: query.trim() })}</h2>
          {searching ? (
            <p style={{ textAlign: 'center', color: '#718096' }}>{t('home.searching')}</p>
          ) : !searchResults || (searchResults.students.length === 0 && searchResults.jobs.length === 0) ? (
            <p style={{ textAlign: 'center', color: '#718096' }}>{t('home.no_results')}</p>
          ) : (
            <>
              {searchResults.jobs.length > 0 && (
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a202c' }}>💼 {t('home.jobs_heading')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
                    {searchResults.jobs.map(job => <JobCard key={job.id} job={job} />)}
                  </div>
                </div>
              )}
              {searchResults.students.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', color: '#1a202c' }}>🎓 {t('home.students_heading')}</h3>
                  <div className="card-grid-3col" style={{ marginTop: '12px' }}>
                    {searchResults.students.map(student => <StudentCard key={student.id} student={student} t={t} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ---- DEFAULT VIEW: RECENT JOBS + RECENT STUDENTS ---- */
        <>
          {recentJobs.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', color: '#1a202c', margin: 0 }}>💼 {t('home.recent_jobs_heading')}</h2>
                <Link to="/jobs" style={{ fontSize: '14px', color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>{t('home.view_all_jobs')}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {recentJobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: '20px', color: '#1a202c', marginBottom: '16px' }}>🎓 {t('home.recent_students_heading')}</h2>

          {loading ? (
            <h3 style={{ textAlign: 'center', color: '#4a5568' }}>{t('home.loading')}</h3>
          ) : students.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#718096' }}>{t('home.no_students')}</p>
          ) : (
            <>
              <div className="card-grid-3col">
                {students.map(student => <StudentCard key={student.id} student={student} t={t} />)}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    style={{
                      padding: '10px 20px', backgroundColor: currentPage === 1 ? '#cbd5e0' : '#1B2A4A',
                      color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {t('home.previous')}
                  </button>

                  <span style={{ fontWeight: 'bold', color: '#4a5568' }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '10px 20px', backgroundColor: currentPage === totalPages ? '#cbd5e0' : '#1B2A4A',
                      color: 'white', border: 'none', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {t('home.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
