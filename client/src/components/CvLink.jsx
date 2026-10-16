import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { authHeader } from '../auth';
import InlineIcon from './InlineIcon';

// Opens a CV. There is no stored link to put in an href: the file lives in a
// bucket with no public access, so the address is asked for at the moment it
// is needed and stops working a quarter of an hour later. The server decides
// whether this person may have it.
function CvLink({ endpoint, label, style, iconSize = 14 }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = async () => {
    setBusy(true);
    setError('');
    // Opened before the request so the browser treats it as part of the
    // click, rather than as a pop-up it should block.
    const tab = window.open('', '_blank');
    try {
      const res = await axios.get(endpoint, { headers: authHeader() });
      if (tab) tab.location.href = res.data.url;
      else window.location.href = res.data.url;
    } catch (err) {
      if (tab) tab.close();
      setError(err.response?.data?.message || t('cv.error_open'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', padding: 0, cursor: busy ? 'wait' : 'pointer',
          font: 'inherit', color: 'inherit', textDecoration: 'underline', ...style
        }}
      >
        <InlineIcon icon={FileText} size={iconSize} />
        {busy ? t('cv.opening') : label}
      </button>
      {error && <span role="alert" style={{ marginInlineStart: '8px', fontSize: '12px', color: '#c53030' }}>{error}</span>}
    </>
  );
}

export default CvLink;
