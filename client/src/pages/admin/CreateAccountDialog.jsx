import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { Dialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { mutedStyle, inputStyle } from './adminStyles';

const EMPTY = {
  role: 'STUDENT', email: '', phone: '',
  fullName: '', university: '', fieldOfStudy: '', graduationYear: '', headline: '', expertise: '',
  companyName: '', industry: '', jobTitle: '', crNumber: '', approve: true
};

// Creates a student or company account. The person never gets a password by
// email: they choose one through a one-time link.
function CreateAccountDialog({ onCreated, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await axios.post('/api/admin/users', form, { headers: authHeader() });
      onCreated({ email: form.email.trim(), setupUrl: res.data.setupUrl });
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  const isStudent = form.role === 'STUDENT';
  const isInstructor = form.role === 'INSTRUCTOR';
  const label = { fontSize: '14px', color: '#2d3748', fontWeight: 600 };
  const field = { ...inputStyle, display: 'block', width: '100%', marginTop: '4px', fontWeight: 400 };

  return (
    <Dialog title={t('adminConsole.users.create_title')} onClose={onClose} width={540}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={label}>
          {t('adminConsole.users.create_role')}
          <select value={form.role} onChange={set('role')} style={field}>
            <option value="STUDENT">{t('adminConsole.role.STUDENT')}</option>
            <option value="HR">{t('adminConsole.role.HR')}</option>
            <option value="INSTRUCTOR">{t('adminConsole.role.INSTRUCTOR')}</option>
          </select>
        </label>
        <label style={label}>
          {t('adminConsole.users.create_email')}
          <input type="email" required dir="ltr" value={form.email} onChange={set('email')} style={field} />
        </label>

        {isInstructor ? (
          <>
            <label style={label}>
              {t('adminConsole.users.create_instructor_name')}
              <input type="text" required dir="auto" value={form.fullName} onChange={set('fullName')} style={field} />
            </label>
            <label style={label}>
              {t('adminConsole.users.create_headline')}
              <input type="text" dir="auto" value={form.headline} onChange={set('headline')} style={field} />
            </label>
            <label style={label}>
              {t('adminConsole.users.create_expertise')}
              <input type="text" dir="auto" value={form.expertise} onChange={set('expertise')} style={field} />
            </label>
            <label style={label}>
              {t('adminConsole.users.create_phone')}
              <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} style={field} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
              <input type="checkbox" checked={form.approve} onChange={set('approve')} />
              {t('adminConsole.users.create_approve_instructor')}
            </label>
          </>
        ) : isStudent ? (
          <>
            <label style={label}>
              {t('adminConsole.users.create_student_name')}
              <input type="text" required dir="auto" value={form.fullName} onChange={set('fullName')} style={field} />
            </label>
            <div className="grid-2col">
              <label style={label}>
                {t('adminConsole.users.create_university')}
                <input type="text" required dir="auto" value={form.university} onChange={set('university')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_field')}
                <input type="text" required dir="auto" value={form.fieldOfStudy} onChange={set('fieldOfStudy')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_grad_year')}
                <input type="number" min="1950" max="2100" value={form.graduationYear} onChange={set('graduationYear')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_phone')}
                <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} style={field} />
              </label>
            </div>
          </>
        ) : (
          <>
            <label style={label}>
              {t('adminConsole.users.create_company')}
              <input type="text" required dir="auto" value={form.companyName} onChange={set('companyName')} style={field} />
            </label>
            <div className="grid-2col">
              <label style={label}>
                {t('adminConsole.users.create_industry')}
                <input type="text" dir="auto" value={form.industry} onChange={set('industry')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_job_title')}
                <input type="text" dir="auto" value={form.jobTitle} onChange={set('jobTitle')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_cr')}
                <input type="text" dir="ltr" value={form.crNumber} onChange={set('crNumber')} style={field} />
              </label>
              <label style={label}>
                {t('adminConsole.users.create_phone')}
                <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} style={field} />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
              <input type="checkbox" checked={form.approve} onChange={set('approve')} />
              {t('adminConsole.users.create_approve')}
            </label>
          </>
        )}

        <p style={{ ...mutedStyle, margin: 0, lineHeight: 1.6 }}>{t('adminConsole.users.create_hint')}</p>
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary'), opacity: busy ? 0.6 : 1 }}>{t('adminConsole.users.create_submit')}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default CreateAccountDialog;
