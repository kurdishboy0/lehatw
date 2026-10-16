import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { formatDateTime, toLocalizedDigits } from '../localizeDigits';
import { coursePrice } from '../courseDisplay';
import { Lock, Paperclip, ArrowLeft, Target, Languages, Monitor, MapPin, Timer, Users, CalendarDays, Check, MessageSquare } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const tagStyle = { fontSize: '12px', color: '#4a5568', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px' };
const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;

// One lesson: title and length always, the text once it is open to this
// viewer, and a tick box for students who enrolled.
function Lesson({ lesson, index, lang, enrolled, done, onToggle }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const num = (n) => toLocalizedDigits(String(n), lang);
  const readable = !lesson.locked;

  return (
    <li data-lesson-id={lesson.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #edf2f7', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {enrolled && (
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => onToggle(lesson.id, e.target.checked)}
            aria-label={done ? t('courseDetail.mark_not_done') : t('courseDetail.mark_done')}
            style={{ width: '18px', height: '18px', accentColor: '#276749' }}
          />
        )}
        <span style={{ color: '#a0aec0', fontVariantNumeric: 'tabular-nums' }}>{num(index + 1)}.</span>
        <button
          type="button"
          onClick={() => readable && setOpen((o) => !o)}
          aria-expanded={readable ? open : undefined}
          disabled={!readable}
          style={{
            flex: 1, textAlign: 'start', background: 'none', border: 'none', padding: 0,
            fontSize: '15px', fontWeight: 600, color: readable ? '#1a202c' : '#a0aec0', cursor: readable ? 'pointer' : 'default'
          }}
          dir="auto"
        >
          {lesson.title}
        </button>
        {lesson.isPreview && <span style={{ ...tagStyle, color: '#276749', backgroundColor: '#e6f4ea', border: 'none' }}>{t('courseDetail.preview')}</span>}
        {lesson.durationMinutes && <span style={{ fontSize: '13px', color: '#718096' }}>{num(lesson.durationMinutes)} min</span>}
        {lesson.locked && <span style={{ fontSize: '13px', color: '#a0aec0' }}><InlineIcon icon={Lock} size={13} /> {t('courseDetail.locked')}</span>}
      </div>

      {open && readable && (
        <div style={{ marginTop: '10px', paddingInlineStart: enrolled ? '38px' : '24px' }}>
          {lesson.content && <p style={{ margin: 0, color: '#2d3748', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }} dir="auto">{lesson.content}</p>}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
            {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontWeight: 600, fontSize: '14px' }}>▶ {t('courseDetail.watch')}</a>}
            {lesson.resourceUrl && <a href={lesson.resourceUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontWeight: 600, fontSize: '14px' }}><InlineIcon icon={Paperclip} /> {t('courseDetail.resources')}</a>}
          </div>
        </div>
      )}
    </li>
  );
}

function CourseDetail() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const { id } = useParams();
  const user = getUser();

  const [course, setCourse] = useState(null);
  const [done, setDone] = useState(() => new Set());
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/courses/${id}`, { headers: authHeader() });
      setCourse(res.data);
      setDone(new Set(res.data.completedLessonIds));
    } catch {
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const setEnrolment = async (join) => {
    setBusy(true);
    setError('');
    try {
      const config = { headers: authHeader() };
      if (join) await axios.post(`/api/courses/${id}/enroll`, {}, config);
      else await axios.delete(`/api/courses/${id}/enroll`, config);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('courseDetail.error_enrol'));
    } finally {
      setBusy(false);
    }
  };

  // Tick right away, then save; put the tick back if saving fails.
  const toggleLesson = async (lessonId, completed) => {
    setDone((current) => {
      const next = new Set(current);
      if (completed) next.add(lessonId); else next.delete(lessonId);
      return next;
    });
    setError('');
    try {
      await axios.put(`/api/courses/${id}/lessons/${lessonId}/progress`, { completed }, { headers: authHeader() });
    } catch (err) {
      setDone((current) => {
        const next = new Set(current);
        if (completed) next.delete(lessonId); else next.add(lessonId);
        return next;
      });
      setError(err.response?.data?.message || t('courseDetail.error_enrol'));
    }
  };

  if (notFound) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('courseDetail.not_found')}</p>;
  if (!course) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('courses.loading')}</p>;

  const isOwner = user && course.instructor.userId === user.id;
  const total = course.lessons.length;

  return (
    <div style={{ maxWidth: '860px', margin: '30px auto', padding: '0 20px' }}>
      <Link to="/courses" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}><InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('courseDetail.back')}</Link>

      {course.status !== 'APPROVED' && (
        <p role="status" style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fdf6e3', color: '#8a6d1d', fontSize: '14px' }}>
          {t('courseDetail.status_note', { status: t(`instructorCourses.status_${course.status}`) })}
        </p>
      )}

      <div style={{ ...cardStyle, marginTop: '16px' }}>
        <h1 style={{ fontSize: '26px', color: '#1a202c', margin: '0 0 6px 0' }} dir="auto">{course.title}</h1>
        <div style={{ fontSize: '15px', color: '#718096' }} dir="auto">{t('courses.by', { name: course.instructor.fullName })}</div>
        {course.summary && <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: 1.7 }} dir="auto">{course.summary}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          <span style={{ ...tagStyle, fontWeight: 700, color: course.priceIqd ? '#1a202c' : '#276749' }}>{coursePrice(course, t, toLocalizedDigits, lang)}</span>
          <span style={tagStyle}><InlineIcon icon={Target} tone="gold" size={13} /> {t(`courses.level_${course.level}`)}</span>
          <span style={tagStyle}><InlineIcon icon={Languages} tone="gold" size={13} /> {t(`courses.language_${course.language}`)}</span>
          <span style={tagStyle}><InlineIcon icon={Monitor} tone="gold" size={13} /> {t(`courses.delivery_${course.delivery}`)}</span>
          {course.location && <span style={tagStyle} dir="auto"><InlineIcon icon={MapPin} tone="gold" size={13} /> {course.location}</span>}
          {course.durationHours && <span style={tagStyle}><InlineIcon icon={Timer} tone="gold" size={13} /> {t('courses.hours', { count: num(course.durationHours) })}</span>}
          <span style={tagStyle}><InlineIcon icon={Users} tone="gold" size={13} /> {t('courses.students', { count: num(course.studentCount) })}</span>
          <span style={tagStyle}><InlineIcon icon={CalendarDays} tone="gold" size={13} /> {course.startsAt ? t('courses.starts', { date: formatDateTime(course.startsAt, lang, { withTime: false }) }) : t('courses.self_paced')}</span>
        </div>

        {course.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '14px', fontSize: '14px' }}>
            <strong style={{ color: '#4a5568' }}>{t('courses.teaches')}</strong>
            {course.skills.map((s) => (
              <span key={s.id} style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: '#FCF6E3', color: '#14213B' }}>{skillName(s, lang)}</span>
            ))}
          </div>
        )}

        {error && <p role="alert" style={{ color: '#c53030', fontSize: '14px', marginTop: '14px' }}>{error}</p>}

        <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isOwner ? (
            <span style={{ color: '#718096', fontSize: '14px' }}>{t('courseDetail.own_course')}</span>
          ) : !user ? (
            <Link to="/login" style={{ color: '#1B2A4A', fontWeight: 600 }}>{t('courseDetail.login_to_enrol')}</Link>
          ) : course.enrolled ? (
            <>
              <span style={{ padding: '12px 20px', backgroundColor: '#e6f4ea', color: '#276749', borderRadius: '8px', fontWeight: 700 }}><InlineIcon icon={Check} /> {t('courseDetail.enrolled')}</span>
              <button type="button" disabled={busy} onClick={() => setEnrolment(false)} style={{ padding: '12px 20px', background: 'none', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer', color: '#4a5568', fontWeight: 600 }}>
                {t('courseDetail.leave')}
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setEnrolment(true)} style={{ padding: '12px 28px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
              {t('courseDetail.enrol')}
            </button>
          )}
          {course.externalUrl && <a href={course.externalUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontWeight: 600, fontSize: '14px' }}>{t('courseDetail.external')}</a>}
        </div>
      </div>

      {course.description && (
        <div style={{ ...cardStyle, marginTop: '16px' }}>
          <h2 style={{ fontSize: '18px', color: '#1a202c', marginTop: 0 }}>{t('courseDetail.about')}</h2>
          <p style={{ color: '#2d3748', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }} dir="auto">{course.description}</p>
        </div>
      )}

      <div style={{ ...cardStyle, marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '18px', color: '#1a202c', margin: 0 }}>{t('courseDetail.lessons_heading')}</h2>
          {course.enrolled && total > 0 && (
            <span style={{ fontSize: '14px', fontWeight: 600, color: done.size === total ? '#276749' : '#4a5568' }}>
              {done.size === total ? <><InlineIcon icon={Check} /> {t('courseDetail.completed')}</> : t('courseDetail.progress', { done: num(done.size), total: num(total) })}
            </span>
          )}
        </div>

        {course.enrolled && total > 0 && (
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done.size}
            aria-label={t('courseDetail.progress', { done: done.size, total })}
            style={{ marginTop: '10px', height: '6px', borderRadius: '3px', backgroundColor: '#e6f4ea', overflow: 'hidden' }}
          >
            <div style={{ height: '100%', width: `${(done.size / total) * 100}%`, backgroundColor: '#276749' }} />
          </div>
        )}

        {total === 0 ? (
          <p style={{ color: '#a0aec0', margin: '12px 0 0 0' }}>{t('courseDetail.no_lessons')}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: '10px 0 0 0', padding: 0 }}>
            {course.lessons.map((lesson, index) => (
              <Lesson
                key={lesson.id}
                lesson={lesson}
                index={index}
                lang={lang}
                enrolled={course.enrolled}
                done={done.has(lesson.id)}
                onToggle={toggleLesson}
              />
            ))}
          </ul>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#1a202c', marginTop: 0 }}>{t('courseDetail.instructor_heading')}</h2>
        <strong style={{ color: '#1a202c' }} dir="auto">{course.instructor.fullName}</strong>
        {course.instructor.headline && <div style={{ color: '#718096', fontSize: '14px' }} dir="auto">{course.instructor.headline}</div>}
        {course.instructor.bio && <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: 1.7 }} dir="auto">{course.instructor.bio}</p>}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {course.instructor.website && <a href={course.instructor.website} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: 600 }}>Website</a>}
          {course.instructor.linkedinUrl && <a href={course.instructor.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: 600 }}>LinkedIn</a>}
          {user && !isOwner && <Link to={`/messages/${course.instructor.userId}`} style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: 600 }}><InlineIcon icon={MessageSquare} /> {t('skillMatch.message')}</Link>}
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
