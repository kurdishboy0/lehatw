import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import { Dialog } from './Dialog';
import { buttonStyle } from './buttonStyle';

const REASONS = ['SPAM', 'SCAM', 'HARASSMENT', 'INAPPROPRIATE', 'FAKE_PROFILE', 'OTHER'];

// Lets a signed-in user flag a user, job post, or message for admin review.
// Hidden for guests and admins (admins act on content directly).
function ReportButton({ targetType, targetId, compact = false, style }) {
  const { t } = useTranslation();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, text }

  if (!user || user.role === 'ADMIN') return null;

  const close = () => {
    setOpen(false);
    setReason('');
    setDetails('');
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await axios.post('/api/reports', { targetType, targetId, reason, details }, { headers: authHeader() });
      setResult({ ok: true, text: res.data.alreadyReported ? t('report.already') : t('report.sent') });
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.message || t('report.error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t(`report.title_${targetType}`)}
        aria-label={t(`report.title_${targetType}`)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0',
          fontSize: compact ? '12px' : '13px', padding: compact ? '2px 4px' : '4px 6px', ...style
        }}
      >
        ⚑{compact ? '' : ` ${t('report.button')}`}
      </button>

      {open && (
        <Dialog title={t(`report.title_${targetType}`)} onClose={close}>
          {result?.ok ? (
            <>
              <p role="status" style={{ color: '#2f855a', fontSize: '15px', margin: '0 0 16px 0' }}>{result.text}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={close} style={buttonStyle('primary')}>{t('report.close')}</button>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>{t('report.reason_label')}</legend>
                {REASONS.map((r) => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '14px', color: '#2d3748', cursor: 'pointer' }}>
                    <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                    {t(`report.reasons.${r}`)}
                  </label>
                ))}
              </fieldset>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={t('report.details_placeholder')}
                style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', fontFamily: 'inherit' }}
              />
              {result && !result.ok && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{result.text}</p>}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button type="button" onClick={close} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
                <button type="submit" disabled={!reason || busy} style={{ ...buttonStyle('danger'), opacity: !reason || busy ? 0.5 : 1 }}>
                  {busy ? t('report.sending') : t('report.submit')}
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}

export default ReportButton;
