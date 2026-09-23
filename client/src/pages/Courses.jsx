import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader, getUser } from '../auth';
import { formatDateTime, toLocalizedDigits } from '../localizeDigits';
import { COURSE_LEVELS, COURSE_LANGUAGES, COURSE_DELIVERIES, coursePrice } from '../courseDisplay';

const SEARCH_DEBOUNCE_MS = 350;
const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const tagStyle = { fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' };
const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', backgroundColor: '#fff' }}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CourseCard({ course, lang, t }) {
  const num = (n) => toLocalizedDigits(String(n), lang);
  const reason = course.reasonSkills || [];
  return (
    <article data-course-id={course.id} className="hover-lift" style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px 0' }}>
            <Link to={`/courses/${course.id}`} style={{ color: '#1a202c', textDecoration: 'none' }} dir="auto">{course.title}</Link>
          </h3>
          <div style={{ fontSize: '14px', color: '#718096' }} dir="auto">{t('courses.by', { name: course.instructor.fullName })}</div>
          {course.summary && <p style={{ margin: '8px 0 0 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }} dir="auto">{course.summary}</p>}
        </div>
        <div style={{ textAlign: 'end', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <strong style={{ fontSize: '16px', color: course.priceIqd ? '#1a202c' : '#276749' }}>{coursePrice(course, t, toLocalizedDigits, lang)}</strong>
          {course.enrolled && <span style={{ fontSize: '12px', fontWeight: 700, color: '#276749' }}>✓ {t('courses.enrolled')}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
        <span style={tagStyle}>🎯 {t(`courses.level_${course.level}`)}</span>
        <span style={tagStyle}>🗣️ {t(`courses.language_${course.language}`)}</span>
        <span style={tagStyle}>💻 {t(`courses.delivery_${course.delivery}`)}</span>
        <span style={tagStyle}>📚 {t('courses.lessons', { count: num(course.lessonCount) })}</span>
        {course.durationHours && <span style={tagStyle}>⏱️ {t('courses.hours', { count: num(course.durationHours) })}</span>}
        <span style={tagStyle}>👥 {t('courses.students', { count: num(course.studentCount) })}</span>
      </div>

      {course.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '12px', fontSize: '13px' }}>
          <strong style={{ color: '#4a5568' }}>{t('courses.teaches')}</strong>
          {course.skills.map((s) => (
            <span key={s.id} style={{ padding: '2px 9px', borderRadius: '10px', backgroundColor: '#FCF6E3', color: '#14213B' }}>{skillName(s, lang)}</span>
          ))}
        </div>
      )}

      {reason.length > 0 && (
        <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#f0f6ff', border: '1px solid #cfe0f7', fontSize: '13px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <strong style={{ color: '#1B2A4A' }}>✨ {t('courses.recommended_gap')}</strong>
            {reason.map((sk) => (
              <span key={sk.id} style={{ padding: '2px 9px', borderRadius: '10px', backgroundColor: 'white', border: '1px solid #cfe0f7', color: '#1B2A4A' }}>{skillName(sk, lang)}</span>
            ))}
          </div>
          {course.jobCount > 0 && (
            <div style={{ color: '#4a5568', marginTop: '6px' }}>
              💼 {t('courses.recommended_jobs', { count: num(course.jobCount) })}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
        <span style={{ fontSize: '13px', color: '#718096' }}>
          {course.startsAt ? t('courses.starts', { date: formatDateTime(course.startsAt, lang, { withTime: false }) }) : t('courses.self_paced')}
        </span>
        <Link to={`/courses/${course.id}`} style={{ padding: '9px 18px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          {t('courses.view')}
        </Link>
      </div>
    </article>
  );
}

function Courses() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [delivery, setDelivery] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  const isStudent = getUser()?.role === 'STUDENT';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = isStudent && searchParams.get('tab') === 'recommended' ? 'recommended' : 'all';
  const selectTab = (next) => setSearchParams(next === 'recommended' ? { tab: 'recommended' } : {});
  const [recommended, setRecommended] = useState(null);

  useEffect(() => {
    if (!isStudent || tab !== 'recommended' || recommended) return;
    axios.get('/api/courses/recommended', { headers: authHeader() })
      .then((res) => setRecommended(res.data))
      .catch(() => setRecommended({ hasSkills: false, recommendations: [] }));
  }, [isStudent, tab, recommended]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { ...(debounced && { q: debounced }), ...(level && { level }), ...(language && { language }), ...(delivery && { delivery }), ...(freeOnly && { free: 1 }) };
      const res = await axios.get('/api/courses', { params, headers: authHeader() });
      setCourses(res.data);
    } catch {
      setError(t('courses.error_load'));
      setCourses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [debounced, level, language, delivery, freeOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    load();
  }, [load]);

  const hasFilters = query || level || language || delivery || freeOnly;
  const clear = () => { setQuery(''); setLevel(''); setLanguage(''); setDelivery(''); setFreeOnly(false); };

  return (
    <div>
      <div className="animate-fade-up" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #14213B 100%)', borderBottom: '3px solid #C99A2E', padding: '48px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.2rem', margin: '0 0 10px 0' }}>📚 {t('courses.heading')}</h1>
        <p style={{ color: '#e6e9f0', fontSize: '1.05rem', margin: '0 0 24px 0' }}>{t('courses.subtitle')}</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('courses.search_placeholder')}
          aria-label={t('courses.search_placeholder')}
          style={{ width: '100%', maxWidth: '560px', padding: '14px 20px', fontSize: '15px', borderRadius: '30px', border: 'none', boxSizing: 'border-box', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
        />
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px 60px 20px', fontFamily: 'sans-serif' }}>
        {error && <p role="alert" style={{ color: '#c53030', textAlign: 'center' }}>{error}</p>}

        {isStudent && (
          <div role="tablist" aria-label={t('courses.heading')} style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '22px', flexWrap: 'wrap' }}>
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
                  {key === 'recommended' ? '✨ ' : ''}{t(`courses.tab_${key}`)}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'recommended' ? (
          <div>
            <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#4a5568' }}>{t('courses.recommended_intro')}</p>
            {recommended && !recommended.hasSkills && (
              <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#8a6d1d', backgroundColor: '#fdf6e3', border: '1px solid #f0e2b6', borderRadius: '10px', padding: '10px 12px' }}>
                {t('courses.recommended_no_skills')}
              </p>
            )}
            {recommended === null ? (
              <p style={{ color: '#718096', textAlign: 'center' }}>{t('courses.loading')}</p>
            ) : recommended.recommendations.length === 0 ? (
              <p style={{ color: '#718096', textAlign: 'center', marginTop: '30px' }}>{t('courses.recommended_empty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
                {recommended.recommendations.map((course) => <CourseCard key={course.id} course={course} lang={lang} t={t} />)}
              </div>
            )}
          </div>
        ) : (
        <div className="sidebar-layout">
          <div style={{ ...cardStyle, position: 'sticky', top: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#1a202c' }}>{t('courses.filters')}</h2>
              {hasFilters && (
                <button type="button" onClick={clear} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {t('courses.clear_filters')}
                </button>
              )}
            </div>
            <FilterSelect label={t('courses.level')} allLabel={t('courses.all')} value={level} onChange={setLevel} options={COURSE_LEVELS.map((v) => ({ value: v, label: t(`courses.level_${v}`) }))} />
            <FilterSelect label={t('courses.language')} allLabel={t('courses.all')} value={language} onChange={setLanguage} options={COURSE_LANGUAGES.map((v) => ({ value: v, label: t(`courses.language_${v}`) }))} />
            <FilterSelect label={t('courses.delivery')} allLabel={t('courses.all')} value={delivery} onChange={setDelivery} options={COURSE_DELIVERIES.map((v) => ({ value: v, label: t(`courses.delivery_${v}`) }))} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
              {t('courses.free_only')}
            </label>
          </div>

          <div>
            {courses === null ? (
              <p style={{ color: '#718096', textAlign: 'center' }}>{t('courses.loading')}</p>
            ) : courses.length === 0 ? (
              <p style={{ color: '#718096', textAlign: 'center', marginTop: '40px' }}>{t('courses.none')}</p>
            ) : (
              <>
                <p style={{ fontSize: '14px', color: '#4a5568', fontWeight: 600, marginTop: 0 }}>
                  {t('courses.showing', { count: toLocalizedDigits(String(courses.length), lang) })}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {courses.map((course) => <CourseCard key={course.id} course={course} lang={lang} t={t} />)}
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default Courses;
