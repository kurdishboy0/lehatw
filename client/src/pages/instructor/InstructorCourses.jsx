import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime, toLocalizedDigits } from '../../localizeDigits';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { STATUS_TONE, coursePrice } from '../../courseDisplay';
import CourseForm from './CourseForm';
import LessonsDialog from './LessonsDialog';
import { Check, MessageSquare, BookOpen, Plus } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const cardStyle = {
  border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px',
  backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const TONE_COLORS = {
  gray: ['#edf2f7', '#4a5568'], yellow: ['#fdf6e3', '#8a6d1d'],
  green: ['#e6f4ea', '#276749'], red: ['#fde8e8', '#9b2c2c']
};

function StatusBadge({ status, t }) {
  const [bg, color] = TONE_COLORS[STATUS_TONE[status]] || TONE_COLORS.gray;
  return (
    <span style={{ backgroundColor: bg, color, fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
      {t(`instructorCourses.status_${status}`)}
    </span>
  );
}

function StudentsDialog({ course, lang, onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const num = (n) => toLocalizedDigits(String(n), lang);

  useEffect(() => {
    axios.get(`/api/instructor/courses/${course.id}/students`, { headers: authHeader() })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, [course.id]);

  return (
    <Dialog title={t('instructorCourses.students_title', { title: course.title })} onClose={onClose} width={620}>
      {rows === null ? (
        <p style={{ color: '#718096' }}>{t('adminConsole.loading')}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: '#718096' }}>{t('instructorCourses.no_students')}</p>
      ) : (
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {rows.map((r) => (
            <div key={r.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #edf2f7' }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ color: '#1a202c' }} dir="auto">
                  {r.studentProfileId ? <Link to={`/students/${r.studentProfileId}`} style={{ color: '#1B2A4A' }}>{r.name}</Link> : r.name}
                </strong>
                <div style={{ fontSize: '13px', color: '#718096' }}>
                  <a href={`mailto:${r.email}`} dir="ltr" style={{ color: '#1B2A4A' }}>{r.email}</a>
                  {r.phone && <span dir="ltr"> · {r.phone}</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#a0aec0' }}>{t('instructorCourses.enrolled_on', { date: formatDateTime(r.enrolledAt, lang, { withTime: false }) })}</div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: r.completedAt ? '#276749' : '#4a5568' }}>
                  {r.completedAt ? <><InlineIcon icon={Check} size={13} /> {t('instructorCourses.finished')}</> : t('instructorCourses.progress', { done: num(r.completedLessons), total: num(r.lessonCount) })}
                </div>
                <Link to={`/messages/${r.userId}`} style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: 600 }}><InlineIcon icon={MessageSquare} size={13} /> {t('skillMatch.message')}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onClose} style={buttonStyle('primary')}>{t('adminConsole.users.close')}</button>
      </div>
    </Dialog>
  );
}

// The instructor's own courses: create, edit, add lessons, send for review,
// and see who enrolled.
function InstructorCourses({ approved, notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [courses, setCourses] = useState(null);
  const [editing, setEditing] = useState(null); // {} for new, or a course
  const [lessonsFor, setLessonsFor] = useState(null);
  const [studentsFor, setStudentsFor] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/instructor/courses', { headers: authHeader() });
      setCourses(res.data);
    } catch {
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const saveCourse = async (body) => {
    const res = editing.id
      ? await axios.put(`/api/instructor/courses/${editing.id}`, body, { headers: authHeader() })
      : await axios.post('/api/instructor/courses', body, { headers: authHeader() });
    setEditing(null);
    notify(res.data.sentForReview ? t('instructorCourses.sent_for_review') : t('instructorCourses.saved'));
    load();
  };

  const submitForReview = async (course) => {
    try {
      await axios.post(`/api/instructor/courses/${course.id}/submit`, {}, { headers: authHeader() });
      notify(t('instructorCourses.submitted'));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const remove = async () => {
    await axios.delete(`/api/instructor/courses/${deleting.id}`, { headers: authHeader() });
    setDeleting(null);
    notify(t('instructorCourses.deleted'));
    load();
  };

  if (!approved) {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', color: '#1a202c', marginTop: 0 }}><InlineIcon icon={BookOpen} size={18} tone="gold" /> {t('instructorCourses.heading')}</h2>
        <p style={{ color: '#718096', margin: 0 }}>{t('instructorCourses.needs_approval')}</p>
      </div>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '18px', color: '#1a202c', margin: 0 }}><InlineIcon icon={BookOpen} size={18} tone="gold" /> {t('instructorCourses.heading')}</h2>
        <button type="button" onClick={() => setEditing({})} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('instructorCourses.new')}</button>
      </div>

      {courses === null ? (
        <p style={{ color: '#718096' }}>{t('adminConsole.loading')}</p>
      ) : courses.length === 0 ? (
        <p style={{ color: '#718096' }}>{t('instructorCourses.none')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
          {courses.map((course) => (
            <div key={course.id} data-course-row={course.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <StatusBadge status={course.status} t={t} />
                    <span style={{ fontSize: '13px', color: '#718096' }}>{coursePrice(course, t, toLocalizedDigits, lang)}</span>
                  </div>
                  <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">
                    {course.status === 'APPROVED' ? <Link to={`/courses/${course.id}`} style={{ color: '#1a202c' }}>{course.title}</Link> : course.title}
                  </strong>
                  <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                    {t('adminConsole.courses.lessons', { count: num(course.lessonCount) })} · {t('adminConsole.courses.students', { count: num(course.studentCount) })}
                  </div>
                  <p style={{ fontSize: '13px', color: '#4a5568', margin: '6px 0 0 0' }}>
                    {course.status === 'DRAFT' ? t('instructorCourses.draft_hint')
                      : course.status === 'APPROVED' ? t('instructorCourses.approved_hint') : ''}
                  </p>
                  {course.status === 'REJECTED' && (
                    <div role="alert" style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#fde8e8', color: '#9b2c2c', fontSize: '13px' }}>
                      {course.rejectionReason && <div>{t('instructorCourses.rejected_reason', { reason: course.rejectionReason })}</div>}
                      <div style={{ color: '#4a5568' }}>{t('instructorCourses.rejected_hint')}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <button type="button" onClick={() => setLessonsFor(course)} style={buttonStyle('secondary')}>{t('instructorCourses.lessons')}</button>
                  <button type="button" onClick={() => setStudentsFor(course)} style={buttonStyle('secondary')}>{t('instructorCourses.students')}</button>
                  <button type="button" onClick={() => setEditing(course)} style={buttonStyle('secondary')}>{t('instructorCourses.edit')}</button>
                  {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
                    <button type="button" onClick={() => submitForReview(course)} style={buttonStyle('primary')}>{t('instructorCourses.submit')}</button>
                  )}
                  <button type="button" onClick={() => setDeleting(course)} style={buttonStyle('danger')}>{t('instructorCourses.delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CourseForm
          course={editing.id ? editing : null}
          titleText={editing.id ? t('instructorCourses.form_title_edit') : t('instructorCourses.form_title_new')}
          onSubmit={saveCourse}
          onClose={() => setEditing(null)}
        />
      )}
      {lessonsFor && <LessonsDialog course={lessonsFor} notify={notify} onChanged={load} onClose={() => setLessonsFor(null)} />}
      {studentsFor && <StudentsDialog course={studentsFor} lang={lang} onClose={() => setStudentsFor(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t('instructorCourses.delete')}
          message={t('instructorCourses.delete_confirm')}
          confirmLabel={t('instructorCourses.delete')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default InstructorCourses;
