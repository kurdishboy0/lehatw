import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { authHeader } from '../auth';
import { Bell } from 'lucide-react';
import InlineIcon from './InlineIcon';

const POLL_INTERVAL_MS = 20000;

function timeAgo(dateStr, t) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return t('notifications.just_now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hours_ago', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.days_ago', { count: days });
}

function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await axios.get('/api/notifications', { headers: authHeader() });
        if (!cancelled) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Silent — the bell just won't update this cycle.
      }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await axios.put('/api/notifications/all/read', {}, { headers: authHeader() });
    } catch {
      // Best-effort — next poll will reconcile.
    }
  };

  const handleClickNotification = async (n) => {
    setOpen(false);
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      axios.put(`/api/notifications/${n.id}/read`, {}, { headers: authHeader() }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`header-tool${open ? ' is-open' : ''}`}
        aria-label={t('notifications.title')}
        aria-expanded={open}
      >
        <span className="header-tool-icon">
          <InlineIcon icon={Bell} size={20} />
          {unreadCount > 0 && <span className="header-tool-badge">{unreadCount}</span>}
        </span>
        <span className="nav-item-label">{t('notifications.title')}</span>
      </button>

      {open && (
        <div className="header-notifications-panel" style={{
          position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 8px)', width: '340px', maxWidth: '90vw',
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 1100, overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: '14px', color: '#1a202c' }}>{t('notifications.title')}</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '24px 16px', textAlign: 'center', color: '#a0aec0', fontSize: '13px', margin: 0 }}>
                {t('notifications.empty')}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'start', padding: '12px 16px',
                    border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    backgroundColor: n.isRead ? '#ffffff' : '#FCF6E3'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {!n.isRead && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#C99A2E', marginTop: '5px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a202c' }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '2px' }}>{n.body}</div>}
                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>{timeAgo(n.createdAt, t)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
