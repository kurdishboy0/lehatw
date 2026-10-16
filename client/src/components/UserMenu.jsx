import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { House, Pencil, Puzzle, FileText, MessageSquare, Plus, ClipboardList, CircleCheck, Flag, Briefcase, LogOut, ChevronDown } from 'lucide-react';
import InlineIcon from './InlineIcon';

const DASHBOARD_PATH = {
  STUDENT: '/student-dashboard',
  HR: '/hr-dashboard',
  INSTRUCTOR: '/instructor-dashboard',
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
      { label: t('userMenu.dashboard'), to: dashboard, icon: House },
      { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: Pencil },
      { label: t('userMenu.add_skills'), to: `${dashboard}?section=skills`, icon: Puzzle },
      { label: t('userMenu.my_applications'), to: `${dashboard}?section=applications`, icon: FileText },
      { label: t('userMenu.messages'), to: '/messages', icon: MessageSquare }
    ];
  }

  if (user.role === 'HR') {
    return [
      { label: t('userMenu.dashboard'), to: dashboard, icon: House },
      { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: Pencil },
      { label: t('userMenu.post_job'), to: '/hr-dashboard/post-job', icon: Plus },
      { label: t('userMenu.my_job_posts'), to: `${dashboard}?section=jobs`, icon: ClipboardList },
      { label: t('userMenu.messages'), to: '/messages', icon: MessageSquare }
    ];
  }

  // ADMIN
  return [
    { label: t('userMenu.dashboard'), to: dashboard, icon: House },
    { label: t('userMenu.admin_approvals'), to: `${dashboard}?tab=approvals`, icon: CircleCheck },
    { label: t('userMenu.admin_reports'), to: `${dashboard}?tab=reports`, icon: Flag },
    { label: t('userMenu.admin_jobs'), to: `${dashboard}?tab=jobs`, icon: Briefcase },
    { label: t('userMenu.messages'), to: '/messages', icon: MessageSquare }
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
        className={`header-tool${open ? ' is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="header-tool-avatar">
          {getFirstName(user).charAt(0).toUpperCase()}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {t('nav.me')}
          <InlineIcon icon={ChevronDown} size={12} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
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
              <InlineIcon icon={item.icon} tone="muted" />
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
            <InlineIcon icon={LogOut} />
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
