import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { GraduationCap, Mail, MessageSquare, Compass, Handshake } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';
import useListFilters from '../useListFilters';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

function scoreColor(score) {
  if (score >= 66) return '#38a169';
  if (score >= 33) return '#d69e2e';
  return '#a0aec0';
}

function localizedName(item, lang) {
  if (lang === 'ar') return item.name_ar;
  if (lang === 'ckb') return item.name_ckb;
  return item.name_en;
}

function initials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

function Avatar({ photoUrl, fullName, size = 44 }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={fullName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: '#1B2A4A', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.6, fontWeight: 'bold', flexShrink: 0
    }}>
      {initials(fullName) || <InlineIcon icon={GraduationCap} size={22} />}
    </div>
  );
}

function StudentCard({ student, t, scoreLabel, showMessage = false }) {
  // Skill keywords always display in English, regardless of UI language.
  const skillNames = (student.skills || []).slice(0, 4).map(s => s.name_en);
  const customNames = (student.customSkills || student.sharedSkills || []).slice(0, 2);
  const score = student.matchScore ?? student.similarityScore;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Avatar photoUrl={student.photoUrl} fullName={student.fullName} />
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#1a202c', fontSize: '17px' }}>{student.fullName}</h3>
            <div style={{ fontSize: '13px', color: '#718096' }}>{student.university} · {student.fieldOfStudy}</div>
            {student.sameField && (
              <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: '#e8eef9', color: '#1B2A4A', padding: '2px 8px', borderRadius: '10px' }}>
                {t('skillMatch.same_field')}
              </span>
            )}
          </div>
        </div>
        {score != null && score > 0 && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: scoreColor(score) }}>{score}%</div>
            <div style={{ fontSize: '10px', color: '#a0aec0' }}>{scoreLabel}</div>
          </div>
        )}
      </div>

      {(skillNames.length > 0 || customNames.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {skillNames.map((name, i) => (
            <span key={`s-${i}`} style={{ fontSize: '11px', backgroundColor: '#FCF6E3', color: '#14213B', padding: '4px 10px', borderRadius: '12px' }}>{name}</span>
          ))}
          {customNames.map((name, i) => (
            <span key={`c-${i}`} style={{ fontSize: '11px', backgroundColor: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '12px' }}>{name}</span>
          ))}
        </div>
      )}

      {/* Only present when this peer chose to show their email to students. */}
      {student.email && (
        <a href={`mailto:${student.email}`} dir="ltr" style={{ display: 'block', marginTop: '10px', fontSize: '13px', color: '#1B2A4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <InlineIcon icon={Mail} size={13} /> {student.email}
        </a>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <Link to={`/students/${student.id}`} style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: '#1B2A4A', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
          {t('skillMatch.view_profile')}
        </Link>
        {showMessage && student.userId && (
          <Link to={`/messages/${student.userId}`} style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid #cbd5e0', color: '#1B2A4A', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
            <InlineIcon icon={MessageSquare} size={14} /> {t('skillMatch.message')}
          </Link>
        )}
      </div>

    </div>
  );
}

function SkillMatch() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const user = getUser();

  const [taxonomy, setTaxonomy] = useState([]);
  const { params, page, update } = useListFilters();
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

  useEffect(() => {
    axios.get('/api/skills/taxonomy').then(res => setTaxonomy(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      axios.get('/api/match/similar', { headers: authHeader() })
        .then(res => setRecommended(res.data.matches))
        .catch(() => setRecommended([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const selectedCategory = useMemo(() => selectedSubjectArea?.categories.find(c => String(c.id) === categoryId), [selectedSubjectArea, categoryId]);

  const handleSubjectAreaChange = (id) => {
    update({ subjectAreaId: id, categoryId: '', skillIds: '', fieldOfStudy: '', page: 1 });
  };

  const handleCategoryChange = (id) => {
    update({ categoryId: id, skillIds: '', fieldOfStudy: '', page: 1 });
  };

  const toggleSkillFilter = (skillId) => {
    const ids = selectedSkillIds.includes(skillId) ? selectedSkillIds.filter(id => id !== skillId) : [...selectedSkillIds, skillId];
    update({ skillIds: ids.join(','), page: 1 });
  };

  const clearFilters = () => {
    update({ subjectAreaId: '', categoryId: '', skillIds: '', q: '', fieldOfStudy: '', page: 1 });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', color: '#1a202c', margin: '0 0 8px 0' }}><InlineIcon icon={Compass} size={26} tone="gold" /> {t('skillMatch.heading')}</h1>
        <p style={{ color: '#718096', margin: 0 }}>{t('skillMatch.subtitle')}</p>
      </div>

      <div className="sidebar-layout">
        {/* FILTER SIDEBAR */}
        <div style={{ ...cardStyle, position: 'sticky', top: '90px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#1a202c' }}>{t('skillMatch.browse_heading')}</h3>

          <input
            type="text"
            placeholder={t('skillMatch.search_placeholder')}
            value={search}
            onChange={(e) => update({ q: e.target.value, page: 1 })}
            style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', boxSizing: 'border-box', marginBottom: '16px' }}
          />

          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{t('skillMatch.subject_area_label')}</label>
          <select value={subjectAreaId} onChange={(e) => handleSubjectAreaChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', marginBottom: '14px' }}>
            <option value="">{t('skillMatch.subject_area_all')}</option>
            {taxonomy.map(sa => <option key={sa.id} value={sa.id}>{localizedName(sa, lang)}</option>)}
          </select>

          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>{t('skillMatch.field_of_study_label')}</label>
          <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', marginBottom: '14px' }}>
              <option value="">{t('skillMatch.field_of_study_all')}</option>
              {(selectedSubjectArea?.categories || []).map(c => <option key={c.id} value={c.id}>{localizedName(c, lang)}</option>)}
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
        </div>

        {/* RESULTS */}
        <div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {loading ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.loading')}</p>
          ) : students.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.no_results')}</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
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
      {/* RECOMMENDED FOR YOU */}
      {recommended !== null && (
        <div style={{ marginTop: '36px' }}>
          <h2 style={{ fontSize: '19px', color: '#1a202c', margin: '0 0 4px 0' }}><InlineIcon icon={Handshake} size={20} tone="gold" /> {t('skillMatch.peers_heading')}</h2>
          <p style={{ color: '#718096', margin: '0 0 14px 0', fontSize: '14px' }}>{t('skillMatch.peers_intro')}</p>
          {recommended.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('skillMatch.recommended_empty')}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
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
