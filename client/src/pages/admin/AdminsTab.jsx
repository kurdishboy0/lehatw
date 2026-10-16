import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../../auth';
import { formatDateTime } from '../../localizeDigits';
import { Dialog, ConfirmDialog } from '../../components/Dialog';
import { buttonStyle } from '../../components/buttonStyle';
import { Badge, SectionHeading } from './adminUi';
import { cardStyle, mutedStyle, inputStyle, accountStatusTone } from './adminStyles';
import { Plus, ShieldCheck } from 'lucide-react';
import InlineIcon from '../../components/InlineIcon';

function AdminsTab({ notify, me }) {
  const { t, i18n } = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [makeSuper, setMakeSuper] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [created, setCreated] = useState(null); // { email, tempPassword }
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/admins', { headers: authHeader() });
      setAdmins(res.data);
    } catch {
      notify(t('adminConsole.error_load'), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const res = await axios.post('/api/admin/admins', { email: email.trim(), isSuperAdmin: makeSuper }, { headers: authHeader() });
      if (res.data.created) {
        setCreated({ email: res.data.user.email, tempPassword: res.data.tempPassword });
        notify(t('adminConsole.admins.created', { email: res.data.user.email }));
      } else {
        notify(t('adminConsole.admins.added', { email: res.data.user.email }));
      }
      setEmail('');
      setMakeSuper(false);
      load();
    } catch (err) {
      setAddError(err.response?.data?.message || t('adminConsole.error_action'));
    } finally {
      setAdding(false);
    }
  };

  const toggleSuper = async (admin) => {
    try {
      await axios.put(`/api/admin/admins/${admin.id}/super`, { isSuperAdmin: !admin.isSuperAdmin }, { headers: authHeader() });
      notify(t('adminConsole.admins.updated'));
      load();
    } catch (err) {
      notify(err.response?.data?.message || t('adminConsole.error_action'), 'error');
    }
  };

  const remove = async () => {
    await axios.delete(`/api/admin/admins/${removing.id}`, { headers: authHeader() });
    notify(t('adminConsole.admins.removed'));
    setRemoving(null);
    load();
  };

  return (
    <section>
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#1a202c' }}><InlineIcon icon={Plus} /> {t('adminConsole.admins.add_heading')}</h3>
        <p style={{ ...mutedStyle, margin: '0 0 12px 0', lineHeight: 1.6 }}>{t('adminConsole.admins.add_hint')}</p>
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('adminConsole.admins.email_placeholder')}
            aria-label={t('adminConsole.admins.email_placeholder')}
            style={{ ...inputStyle, maxWidth: '420px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
            <input type="checkbox" checked={makeSuper} onChange={(e) => setMakeSuper(e.target.checked)} />
            {t('adminConsole.admins.make_super')}
          </label>
          {addError && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: 0 }}>{addError}</p>}
          <div>
            <button type="submit" disabled={adding} style={{ ...buttonStyle('primary'), opacity: adding ? 0.6 : 1 }}>{t('adminConsole.admins.add')}</button>
          </div>
        </form>
      </div>

      <SectionHeading><InlineIcon icon={ShieldCheck} tone="gold" /> {t('adminConsole.admins.heading')}</SectionHeading>
      <p style={{ ...mutedStyle, margin: '-6px 0 12px 0' }}>{t('adminConsole.admins.super_explainer')}</p>

      {loading ? (
        <p style={mutedStyle}>{t('adminConsole.loading')}</p>
      ) : (
        <div style={{ ...cardStyle, padding: 0 }}>
          {admins.map((a, i) => {
            const isMe = a.id === me?.id;
            return (
              <div key={a.id} data-admin-email={a.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid #edf2f7' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1a202c' }}>
                    <span dir="ltr">{a.email}</span>
                    {isMe && <span style={{ ...mutedStyle, fontWeight: 400 }}> {t('adminConsole.users.you')}</span>}
                  </div>
                  <div style={mutedStyle}>{t('adminConsole.users.joined', { date: formatDateTime(a.createdAt, i18n.language, { withTime: false }) })}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {a.isSuperAdmin && <Badge tone="red">{t('adminConsole.users.super_admin')}</Badge>}
                  {a.accountStatus !== 'ACTIVE' && <Badge tone={accountStatusTone[a.accountStatus]}>{t(`adminConsole.account_status.${a.accountStatus}`)}</Badge>}
                </div>
                {!isMe && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => toggleSuper(a)} style={buttonStyle('secondary')}>
                      {a.isSuperAdmin ? t('adminConsole.admins.revoke_super') : t('adminConsole.admins.make_super_btn')}
                    </button>
                    <button type="button" onClick={() => setRemoving(a)} style={buttonStyle('danger')}>{t('adminConsole.admins.remove')}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {created && (
        <Dialog title={t('adminConsole.users.temp_password_title')} onClose={() => setCreated(null)}>
          <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>
            <span dir="ltr">{created.email}</span>
            <br />
            {t('adminConsole.users.temp_password_hint')}
          </p>
          <code dir="ltr" data-testid="temp-password" style={{ display: 'inline-block', fontSize: '18px', padding: '8px 14px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {created.tempPassword}
          </code>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => navigator.clipboard?.writeText(created.tempPassword).catch(() => {})} style={buttonStyle('secondary')}>{t('adminConsole.users.copy')}</button>
            <button type="button" onClick={() => setCreated(null)} style={buttonStyle('primary')}>{t('adminConsole.users.close')}</button>
          </div>
        </Dialog>
      )}

      {removing && (
        <ConfirmDialog
          title={t('adminConsole.admins.remove')}
          message={t('adminConsole.admins.remove_confirm', { email: removing.email })}
          confirmLabel={t('adminConsole.admins.remove')}
          variant="danger"
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
}

export default AdminsTab;
