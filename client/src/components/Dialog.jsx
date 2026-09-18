import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonStyle } from './buttonStyle';

// Centered modal with a dimmed backdrop. Escape or a backdrop click closes it.
export function Dialog({ title, onClose, children, width = 480 }) {
  const panelRef = useRef(null);
  // Callers pass inline handlers; keep the latest one without re-running the
  // effect (which would steal focus back to the first field on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('textarea, input, select, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.45)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: `${width}px`,
          maxHeight: '90vh', overflowY: 'auto', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          fontFamily: 'sans-serif'
        }}
      >
        <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', color: '#1a202c' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Asks for a reason before a moderation action. `minLength` > 0 makes the
// reason required. `onConfirm` may throw; its server message is shown inline.
export function ReasonDialog({ title, hint, minLength = 0, confirmLabel, variant = 'danger', onConfirm, onClose, children }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < minLength) {
      setError(t('adminConsole.reason_too_short', { count: minLength }));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {hint && <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{hint}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder={minLength > 0 ? t('adminConsole.reason_placeholder') : t('adminConsole.reason_optional_placeholder')}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', fontFamily: 'inherit' }}
        />
        {children}
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
          <button type="submit" disabled={busy} style={{ ...buttonStyle(variant), opacity: busy ? 0.6 : 1 }}>{confirmLabel}</button>
        </div>
      </form>
    </Dialog>
  );
}

// Yes/no confirmation for actions that need no extra input.
export function ConfirmDialog({ title, message, confirmLabel, variant = 'primary', onConfirm, onClose }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.response?.data?.message || t('adminConsole.error_action'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
      {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '0 0 8px 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
        <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('adminConsole.cancel')}</button>
        <button type="button" onClick={confirm} disabled={busy} style={{ ...buttonStyle(variant), opacity: busy ? 0.6 : 1 }}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}
