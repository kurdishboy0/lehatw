import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DASHBOARD_PATH = {
  STUDENT: '/student-dashboard',
  HR: '/hr-dashboard',
  ADMIN: '/admin-dashboard'
};

function getFirstName(user) {
  const source = user.name || user.email.split('@')[0];
  return source.trim().split(/\s+/)[0];
}

function getMenuItems(user, t) {
  const dashboard = DASHBOARD_PATH[user.role] || '/';

  if (user.role === 'STUDENT') {
    return [
      { label: t('userMenu.dashboard'), to: dashboard, icon: '🏠' },
      { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: '✏️' },
      { label: t('userMenu.add_skills'), to: `${dashboard}?section=skills`, icon: '🧩' },
      { label: t('userMenu.my_applications'), to: `${dashboard}?section=applications`, icon: '📄' },
      { label: t('userMenu.messages'), to: '/messages', icon: '💬' }
    ];
  }

  if (user.role === 'HR') {
    return [
      { label: t('userMenu.dashboard'), to: dashboard, icon: '🏠' },
      { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: '✏️' },
      { label: t('userMenu.post_job'), to: '/hr-dashboard/post-job', icon: '➕' },
      { label: t('userMenu.my_job_posts'), to: `${dashboard}?section=jobs`, icon: '📋' },
      { label: t('userMenu.messages'), to: '/messages', icon: '💬' }
    ];
  }

  // ADMIN
  return [
    { label: t('userMenu.dashboard'), to: dashboard, icon: '🏠' },
    { label: t('userMenu.pending_companies'), to: `${dashboard}?section=hr`, icon: '🏢' },
    { label: t('userMenu.pending_skills'), to: `${dashboard}?section=skills`, icon: '🧩' },
    { label: t('userMenu.messages'), to: '/messages', icon: '💬' }
  ];
}

function UserMenu({ user, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = getMenuItems(user, t);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`nav-item${open ? ' active' : ''}`}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 12px', fontSize: '11px', fontWeight: '600',
          color: open ? '#1B2A4A' : '#4a5568', minWidth: '56px'
        }}
      >
        <span style={{
          width: '22px', height: '22px', borderRadius: '50%',
          backgroundColor: '#1B2A4A', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 'bold'
        }}>
          {getFirstName(user).charAt(0).toUpperCase()}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {t('nav.me')}
          <span style={{ fontSize: '8px' }}>{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          insetInlineEnd: 0,
          top: 'calc(100% + 8px)',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          minWidth: '220px',
          overflow: 'hidden',
          zIndex: 2000
        }}>
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', textDecoration: 'none', color: '#2d3748',
                fontSize: '14px', fontWeight: '500', borderBottom: '1px solid #f1f1f1'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600', color: '#e53e3e', textAlign: 'start'
            }}
          >
            <span>🚪</span>
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
