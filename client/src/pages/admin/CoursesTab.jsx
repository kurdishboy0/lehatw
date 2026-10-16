import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { toLocalizedDigits } from '../../localizeDigits';
import { ReasonDialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, FilterPills, EmptyState } from './adminUi';
import { cardStyle, mutedStyle, inputStyle } from './adminStyles';
import { STATUS_TONE, coursePrice } from '../../courseDisplay';
import CourseForm from '../instructor/CourseForm';
import { Plus } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const FILTERS = ['PENDING', 'APPROVED', 'DRAFT', 'REJECTED'];

function CoursesTab({ notify }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const [status, setStatus] = useState('PENDING');
  const [courses, setCourses] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [instructorId, setInstructorId] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/courses', { params: status === 'all' ? {} : { status }, headers: authHeader() });
      setCourses(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [status, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the filter changes
    load();
  }, [load]);

  useEffect(() => {
    axios.get('/api/admin/instructors', { params: { status: 'APPROVED' }, headers: authHeader() })
      .then((res) => setInstructors(res.data))
      .catch(() => {});
  }, []);

  const approve = async (course) => {
    try {
      await axios.put(`/api/admin/courses/${course.id}/approve`, {}, { headers: authHeader() });
      notify(t('adminConsole.courses.approved', { title: course.title }));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const reject = async (reason) => {
    await axios.put(`/api/admin/courses/${rejecting.id}/reject`, { reason }, { headers: authHeader() });
    notify(t('adminConsole.courses.rejected', { title: rejecting.title }));
    setRejecting(null);
    load();
  };

  const remove = async () => {
    await axios.delete(`/api/admin/courses/${deleting.id}`, { headers: authHeader() });
    notify(t('adminConsole.courses.deleted'));
    setDeleting(null);
    load();
  };

  const createForInstructor = async (body) => {
    const res = await axios.post('/api/admin/courses', { ...body, instructorProfileId: Number(instructorId) }, { headers: authHeader() });
    setCreating(false);
    notify(t('adminConsole.courses.created', { name: res.data.instructor.fullName }));
    setStatus('APPROVED');
    load();
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', flex: '1 1 280px' }}>{t('adminConsole.courses.intro')}</p>
        <button type="button" onClick={() => { setInstructorId(''); setCreating(true); }} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('adminConsole.courses.create')}</button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <FilterPills
          label={t('adminConsole.tabs.courses')}
          value={status}
          onChange={setStatus}
          options={[...FILTERS.map((s) => ({ value: s, label: t(`adminConsole.courses.filter.${s}`) })), { value: 'all', label: t('adminConsole.courses.all') }]}
        />
      </div>

      {courses === null ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : courses.length === 0 ? (
        <EmptyState>{t('adminConsole.courses.none')}</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {courses.map((course) => (
            <div key={course.id} data-course-row={course.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <Badge tone={STATUS_TONE[course.status]}>{t(`instructorCourses.status_${course.status}`)}</Badge>
                  <span style={mutedStyle}>{coursePrice(course, t, toLocalizedDigits, lang)}</span>
                  <span style={mutedStyle}>{t(`courses.level_${course.level}`)} · {t(`courses.language_${course.language}`)}</span>
                </div>
                <strong style={{ fontSize: '16px', color: '#1a202c' }} dir="auto">{course.title}</strong>
                <div style={{ ...mutedStyle, marginTop: '2px' }} dir="auto">{t('adminConsole.courses.by', { name: course.instructor.fullName })}</div>
                {course.summary && <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#4a5568' }} dir="auto">{course.summary}</p>}
                <div style={{ ...mutedStyle, marginTop: '4px' }}>
                  {t('adminConsole.courses.lessons', { count: num(course.lessonCount) })} · {t('adminConsole.courses.students', { count: num(course.studentCount) })}
                </div>
                {course.status === 'REJECTED' && course.rejectionReason && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9b2c2c' }}>{t('instructorCourses.rejected_reason', { reason: course.rejectionReason })}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Link to={`/courses/${course.id}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>{t('adminConsole.courses.view')}</Link>
                {course.status !== 'APPROVED' && (
                  <button type="button" onClick={() => approve(course)} style={buttonStyle('success')}>{t('adminConsole.courses.approve')}</button>
                )}
                {course.status !== 'REJECTED' && course.status !== 'DRAFT' && (
                  <button type="button" onClick={() => setRejecting(course)} style={buttonStyle('danger')}>{t('adminConsole.courses.reject')}</button>
                )}
                <button type="button" onClick={() => setDeleting(course)} style={buttonStyle('danger')}>{t('adminConsole.courses.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CourseForm
          titleText={t('adminConsole.courses.create_title')}
          onSubmit={createForInstructor}
          onClose={() => setCreating(false)}
          extraFields={(
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', display: 'block' }}>
              {t('adminConsole.courses.create_instructor')}
              <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required style={{ ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 }}>
                <option value="" disabled>{instructors.length === 0 ? t('adminConsole.courses.no_instructors') : t('adminConsole.courses.create_instructor')}</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
              </select>
              <span style={{ ...mutedStyle, display: 'block', marginTop: '2px', fontWeight: 400 }}>{t('adminConsole.courses.create_instructor_hint')}</span>
            </label>
          )}
        />
      )}

      {rejecting && (
        <ReasonDialog
          title={t('adminConsole.courses.reject_title', { title: rejecting.title })}
          hint={t('adminConsole.courses.reject_hint')}
          minLength={5}
          confirmLabel={t('adminConsole.courses.reject')}
          onConfirm={reject}
          onClose={() => setRejecting(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('adminConsole.courses.delete')}
          message={t('adminConsole.courses.delete_confirm')}
          confirmLabel={t('adminConsole.courses.delete')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default CoursesTab;
