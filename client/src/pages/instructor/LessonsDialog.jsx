import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { ArrowUp, ArrowDown, Plus } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', marginTop: '4px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#2d3748', display: 'block' };
const smallButton = (variant) => ({ ...buttonStyle(variant), padding: '4px 10px', fontSize: '13px' });

const EMPTY = { title: '', content: '', videoUrl: '', resourceUrl: '', durationMinutes: '', isPreview: false };

// Add, edit, reorder and delete the lessons of one course.
function LessonsDialog({ course, notify, onClose, onChanged }) {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState(null);
  const [editing, setEditing] = useState(null); // EMPTY for new, or a lesson
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const base = `/api/instructor/courses/${course.id}/lessons`;
  const load = useCallback(async () => {
    try {
      const res = await axios.get(base, { headers: authHeader() });
      setLessons(res.data);
    } catch {
      setLessons([]);
    }
  }, [base]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...editing, durationMinutes: editing.durationMinutes === '' ? null : Number(editing.durationMinutes) };
      if (editing.id) await axios.put(`${base}/${editing.id}`, body, { headers: authHeader() });
      else await axios.post(base, body, { headers: authHeader() });
      setEditing(null);
      notify(t('instructorCourses.lesson_saved'));
      await load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await axios.delete(`${base}/${deleting.id}`, { headers: authHeader() });
    setDeleting(null);
    notify(t('instructorCourses.lesson_deleted'));
    await load();
    onChanged();
  };

  // Moving a lesson saves the whole new order, so positions stay tidy.
  const move = async (index, delta) => {
    const next = [...lessons];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLessons(next);
    await axios.put(`/api/instructor/courses/${course.id}/lesson-order`, { lessonIds: next.map((l) => l.id) }, { headers: authHeader() });
    await load();
  };

  return (
    <Dialog title={t('instructorCourses.lessons_title', { title: course.title })} onClose={onClose} width={640}>
      {editing ? (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={labelStyle}>
            {t('instructorCourses.lesson_title')}
            <input type="text" required dir="auto" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            {t('instructorCourses.lesson_content')}
            <textarea rows={8} dir="auto" value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} style={inputStyle} />
          </label>
          <div className="grid-2col">
            <label style={labelStyle}>
              {t('instructorCourses.lesson_video')}
              <input type="url" dir="ltr" value={editing.videoUrl || ''} onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              {t('instructorCourses.lesson_resource')}
              <input type="url" dir="ltr" value={editing.resourceUrl || ''} onChange={(e) => setEditing({ ...editing, resourceUrl: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              {t('instructorCourses.lesson_minutes')}
              <input type="number" min="1" value={editing.durationMinutes ?? ''} onChange={(e) => setEditing({ ...editing, durationMinutes: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
            <input type="checkbox" checked={editing.isPreview} onChange={(e) => setEditing({ ...editing, isPreview: e.target.checked })} />
            {t('instructorCourses.lesson_preview')}
          </label>
          {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditing(null)} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
            <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('instructorCourses.lesson_save')}</button>
          </div>
        </form>
      ) : (
        <>
          {lessons === null ? (
            <p style={{ color: '#718096' }}>{t('adminConsole.loading')}</p>
          ) : lessons.length === 0 ? (
            <p style={{ color: '#718096' }}>{t('instructorCourses.lesson_none')}</p>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {lessons.map((lesson, index) => (
                <li key={lesson.id} data-lesson-row={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 0', borderTop: index ? '1px solid #edf2f7' : 'none' }}>
                  <span style={{ color: '#a0aec0', minWidth: '18px' }}>{index + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: '#1a202c' }} dir="auto">{lesson.title}</strong>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      {lesson.durationMinutes ? `${lesson.durationMinutes} min` : ''}
                      {lesson.isPreview ? ` · ${t('courseDetail.preview')}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('instructorCourses.move_up')} style={{ ...smallButton('secondary'), opacity: index === 0 ? 0.4 : 1 }}><InlineIcon icon={ArrowUp} size={14} /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === lessons.length - 1} aria-label={t('instructorCourses.move_down')} style={{ ...smallButton('secondary'), opacity: index === lessons.length - 1 ? 0.4 : 1 }}><InlineIcon icon={ArrowDown} size={14} /></button>
                    <button type="button" onClick={() => setEditing(lesson)} style={smallButton('secondary')}>{t('instructorCourses.edit')}</button>
                    <button type="button" onClick={() => setDeleting(lesson)} style={smallButton('danger')}>{t('instructorCourses.delete')}</button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setEditing({ ...EMPTY })} style={buttonStyle('primary')}><InlineIcon icon={Plus} /> {t('instructorCourses.lesson_new')}</button>
            <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.users.close')}</button>
          </div>
        </>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('instructorCourses.delete')}
          message={t('instructorCourses.lesson_delete_confirm')}
          confirmLabel={t('instructorCourses.delete')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </Dialog>
  );
}

export default LessonsDialog;
