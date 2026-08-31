import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { authHeader } from '../auth';

const POLL_INTERVAL_MS = 20000;

function MessageBell() {
  const { t } = useTranslation();
  const location = useLocation();
  const isActive = location.pathname.startsWith('/messages');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/messages', { headers: authHeader() });
        if (!cancelled) {
          setUnread(res.data.reduce((sum, c) => sum + c.unreadCount, 0));
        }
      } catch {
        // Silent — the bell just won't update this cycle.
      }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <Link
      to="/messages"
      className={`nav-item${isActive ? ' active' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        textDecoration: 'none', color: isActive ? '#3182ce' : '#4a5568',
        padding: '6px 12px', fontSize: '11px', fontWeight: '600', minWidth: '56px'
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1, position: 'relative' }}>
        💬
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', insetInlineEnd: '-10px',
            backgroundColor: '#e53e3e', color: 'white', fontSize: '10px', fontWeight: 'bold',
            borderRadius: '10px', padding: '1px 5px', minWidth: '16px', textAlign: 'center'
          }}>
            {unread}
          </span>
        )}
      </span>
      <span>{t('nav.messaging')}</span>
    </Link>
  );
}

export default MessageBell;
