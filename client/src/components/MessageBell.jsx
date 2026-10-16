import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { authHeader } from '../auth';
import { MessageSquare } from 'lucide-react';
import InlineIcon from './InlineIcon';

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
        const res = await axios.get('/api/messages', { headers: authHeader() });
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
      className={`header-tool${isActive ? ' is-active' : ''}`}
    >
      <span className="header-tool-icon">
        <InlineIcon icon={MessageSquare} size={20} />
        {unread > 0 && <span className="header-tool-badge">{unread}</span>}
      </span>
      <span className="nav-item-label">{t('nav.messaging')}</span>
    </Link>
  );
}

export default MessageBell;
