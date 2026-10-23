import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, ChevronDown } from 'lucide-react';
import { getUserMenuItems } from '../userNavigation';
import InlineIcon from './InlineIcon';


function getFirstName(user) {
  const source = user.name || user.email.split('@')[0];
  return source.trim().split(/\s+/)[0];
}

function UserMenu({ user, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const items = getUserMenuItems(user, t);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={t('nav.me')}
        className={`header-tool${open ? ' is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="header-tool-avatar">
          {getFirstName(user).charAt(0).toUpperCase()}
        </span>
        <span className="header-tool-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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
