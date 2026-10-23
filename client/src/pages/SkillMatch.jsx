import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { Compass, Handshake } from 'lucide-react';
import StudentCard from '../components/TalentCard';
import InlineIcon from '../components/InlineIcon';
import useListFilters from '../useListFilters';
import ResponsiveFilters from '../components/ResponsiveFilters';

function localizedName(item, lang) {
  return item['name_' + lang] || item.name_en;
}

function SkillMatch() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const user = getUser();
  const isStudent = user?.role === 'STUDENT';
  const tabButtons = useRef([]);

  const [taxonomy, setTaxonomy] = useState([]);
  const { params, page, update } = useListFilters();
  const tab = isStudent && params.get('tab') === 'peers' ? 'peers' : 'all';
  const selectTab = (next) => update({ tab: next === 'peers' ? 'peers' : '' });
  const handleTabKey = (event, index) => {
    const forward = i18n.dir(lang) === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = i18n.dir(lang) === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next;
    if (event.key === forward || event.key === backward) next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    selectTab(next === 1 ? 'peers' : 'all');
    tabButtons.current[next]?.focus();
  };
  const subjectAreaId = params.get('subjectAreaId') || '';
  const categoryId = params.get('categoryId') || '';
  const search = params.get('q') || '';
  const fieldOfStudy = params.get('fieldOfStudy') || '';
  const skillIdsText = params.get('skillIds') || '';
  const selectedSkillIds = useMemo(() => skillIdsText.split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0), [skillIdsText]);
  const setPage = (value) => update({ page: typeof value === 'function' ? value(page) : value });

  const [students, setStudents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recommended, setRecommended] = useState(null);
  const [peersError, setPeersError] = useState(false);

  useEffect(() => {
    axios.get('/api/skills/taxonomy').then(res => setTaxonomy(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isStudent) return;
    const controller = new AbortController();
    axios.get('/api/match/similar', { headers: authHeader(), signal: controller.signal })
      .then(res => setRecommended(res.data.matches))
      .catch((error) => {
        if (controller.signal.aborted) return;
        // A talent account without a profile has no peers to rank yet.
        if (error.response?.status === 404) setRecommended([]);
        else setPeersError(true);
      });
    return () => controller.abort();
  }, [isStudent]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchStudents = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        if (subjectAreaId) params.set('subjectAreaId', subjectAreaId);
        if (categoryId && categoryId !== 'other') params.set('categoryId', categoryId);
        if (categoryId === 'other' && fieldOfStudy.trim()) params.set('fieldOfStudy', fieldOfStudy.trim());
        if (selectedSkillIds.length > 0) params.set('skillIds', selectedSkillIds.join(','));
        if (search.trim()) params.set('q', search.trim());

        const res = await axios.get(`/api/match/search?${params.toString()}`, { signal: controller.signal });
        setStudents(res.data.students);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError(t('skillMatch.error_load'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    const timer = setTimeout(fetchStudents, 250);
    return () => { clearTimeout(timer); controller.abort(); };
    // `t` is intentionally excluded: the student data doesn't depend on the UI language,
    // so switching languages shouldn't trigger a refetch (and loading flash).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, subjectAreaId, categoryId, selectedSkillIds, search, fieldOfStudy]);

  const selectedSubjectArea = useMemo(() => taxonomy.find(sa => String(sa.id) === subjectAreaId), [taxonomy, subjectAreaId]);
  const allCategories = useMemo(() => taxonomy.flatMap(area => area.categories), [taxonomy]);
  const selectedCategory = useMemo(() => allCategories.find(c => String(c.id) === categoryId), [allCategories, categoryId]);

  const handleSubjectAreaChange = (id) => {
    update({ subjectAreaId: id, categoryId: '', skillIds: '', fieldOfStudy: '', page: 1 });
  };

  const handleCategoryChange = (id) => {
    const parent = taxonomy.find(area => area.categories.some(category => String(category.id) === id));
    update({ categoryId: id, ...(parent && { subjectAreaId: parent.id }), skillIds: '', fieldOfStudy: '', page: 1 });
  };

  const toggleSkillFilter = (skillId) => {
    const ids = selectedSkillIds.includes(skillId) ? selectedSkillIds.filter(id => id !== skillId) : [...selectedSkillIds, skillId];
    update({ skillIds: ids.join(','), page: 1 });
  };

  const clearFilters = () => {
    update({ subjectAreaId: '', categoryId: '', skillIds: '', q: '', fieldOfStudy: '', page: 1 });
  };

  return (
    <div className="skillmatch-page">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', color: '#1a202c', margin: '0 0 8px 0' }}><InlineIcon icon={Compass} size={26} tone="gold" /> {t('skillMatch.heading')}</h1>
        <p style={{ color: '#718096', margin: 0 }}>{t('skillMatch.subtitle')}</p>
      </div>

      {isStudent && (
        <div className="skillmatch-tabs" role="tablist" aria-label={t('skillMatch.heading')}>
          {['all', 'peers'].map((key, index) => (
            <button key={key} ref={element => { tabButtons.current[index] = element; }}
              type="button" role="tab" id={`talent-tab-${key}`} aria-controls={`talent-panel-${key}`}
              aria-selected={tab === key} tabIndex={tab === key ? 0 : -1}
              onClick={() => selectTab(key)} onKeyDown={event => handleTabKey(event, index)}>
              {key === 'peers' && <InlineIcon icon={Handshake} tone="gold" />}
              {t(`skillMatch.tab_${key}`)}
            </button>
          ))}
        </div>
      )}

      <div id="talent-panel-all" role={isStudent ? 'tabpanel' : undefined}
        aria-labelledby={isStudent ? 'talent-tab-all' : undefined} hidden={tab !== 'all'}>
      <div className="sidebar-layout">
        {/* FILTER SIDEBAR */}
        <ResponsiveFilters className="skillmatch-filters">
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#1a202c' }}>{t('skillMatch.browse_heading')}</h3>

          <input
            type="text"
            aria-label={t('skillMatch.search_placeholder')}
            placeholder={t('skillMatch.search_placeholder')}
            value={search}
            onChange={(e) => update({ q: e.target.value, page: 1 })}
            style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box', marginBottom: '16px' }}
          />

          <label htmlFor="skillmatch-area" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{t('skillMatch.subject_area_label')}</label>
          <select id="skillmatch-area" value={subjectAreaId} onChange={(e) => handleSubjectAreaChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', marginBottom: '14px' }}>
            <option value="">{t('skillMatch.subject_area_all')}</option>
            {taxonomy.map(sa => <option key={sa.id} value={sa.id}>{localizedName(sa, lang)}</option>)}
          </select>

          <label htmlFor="skillmatch-category" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{t('skillMatch.field_of_study_label')}</label>
          <select id="skillmatch-category" value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', marginBottom: '14px' }}>
              <option value="">{t('skillMatch.field_of_study_all')}</option>
              {(selectedSubjectArea?.categories || allCategories).map(c => <option key={c.id} value={c.id}>{localizedName(c, lang)}</option>)}
              <option value="other">{t('qa.other_field')}</option>
            </select>
          {categoryId === 'other' && <input type="text" value={fieldOfStudy} aria-label={t('qa.field_placeholder')} placeholder={t('qa.field_placeholder')}
            onChange={(e) => update({ fieldOfStudy: e.target.value, page: 1 })}
            style={{ width: '100%', padding: '9px', border: '1px solid #cbd5e0', borderRadius: '6px', marginBottom: '14px' }} />}

          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{t('skillMatch.skills_label')}</label>
          {selectedCategory ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {selectedCategory.skills.map(skill => (
                <label key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedSkillIds.includes(skill.id)} onChange={() => toggleSkillFilter(skill.id)} />
                  {skill.name_en}
                </label>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: 0 }}>{t('skillMatch.skills_prompt')}</p>
          )}

          {(subjectAreaId || categoryId || search || selectedSkillIds.length > 0) && (
            <button onClick={clearFilters} style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#4a5568' }}>
              {t('skillMatch.clear_filters')}
            </button>
          )}
        </ResponsiveFilters>

        {/* RESULTS */}
        <div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {loading ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.loading')}</p>
          ) : students.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.no_results')}</p>
          ) : (
            <>
              <div className="talent-results-grid">
                {students.map(s => (
                  <StudentCard key={s.id} student={s} t={t} scoreLabel={t('skillMatch.match_label')} />
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '30px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: page === 1 ? '#cbd5e0' : '#1B2A4A', color: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                    {t('home.previous')}
                  </button>
                  <span style={{ fontWeight: 'bold', color: '#4a5568' }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: page === totalPages ? '#cbd5e0' : '#1B2A4A', color: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
                    {t('home.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      {isStudent && (
        <div id="talent-panel-peers" role="tabpanel" aria-labelledby="talent-tab-peers" hidden={tab !== 'peers'}>
          <p style={{ color: '#718096', margin: '0 0 14px 0', fontSize: '14px' }}>{t('skillMatch.peers_intro')}</p>
          {peersError ? (
            <p role="alert" style={{ color: '#b91c1c' }}>{t('skillMatch.peers_error')}</p>
          ) : recommended === null ? (
            <p role="status" style={{ color: '#718096' }}>{t('skillMatch.loading')}</p>
          ) : recommended.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.recommended_empty')}</p>
          ) : (
            <div className="talent-results-grid">
              {recommended.map(s => (
                <StudentCard key={s.id} student={s} t={t} scoreLabel={t('skillMatch.similarity_label')} showMessage />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default SkillMatch;
