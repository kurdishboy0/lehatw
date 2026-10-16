import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  House, Briefcase, Compass, BookOpen, CalendarDays, GraduationCap, Info, Mail,
  ChevronDown, Menu, X
} from 'lucide-react';
import { useAuth } from '../useAuth';
import InlineIcon from './InlineIcon';
import UserMenu from './UserMenu';
import MessageBell from './MessageBell';
import NotificationBell from './NotificationBell';
import logo from '../assets/Logo.jpeg';

const MOBILE_BREAKPOINT = 900;

const MAIN_LINKS = [
  { to: '/', icon: House, labelKey: 'nav.home' },
  { to: '/jobs', icon: Briefcase, labelKey: 'nav.jobs' },
  { to: '/skill-match', icon: Compass, labelKey: 'nav.skill_match' }
];

const EXPLORE_LINKS = [
  { to: '/courses', icon: BookOpen, labelKey: 'nav.courses' },
  { to: '/events', icon: CalendarDays, labelKey: 'nav.events' },
  { to: '/register-instructor', icon: GraduationCap, labelKey: 'nav.teach' },
  { to: '/about', icon: Info, labelKey: 'nav.about' },
  { to: '/contact-us', icon: Mail, labelKey: 'nav.contact' }
];

const isCurrent = (pathname, to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

// The Explore menu. It opens on hover for a mouse, on click or Enter for
// everyone else, and closes on Escape, on a click outside, or once focus
// leaves it.
function ExploreMenu({ pathname, onNavigate }) {
  const { t } = useTranslation();
  // Hovering opens the menu; clicking or pressing a key pins it open, so a
  // click on a menu already opened by the pointer doesn't close it again.
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const wrapRef = useRef(null);
  const itemsRef = useRef([]);
  const active = EXPLORE_LINKS.some((link) => isCurrent(pathname, link.to));

  const close = useCallback(() => { setPinned(false); setHovered(false); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (!wrapRef.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  const focusItem = (i) => {
    const items = itemsRef.current.filter(Boolean);
    if (!items.length) return;
    items[(i + items.length) % items.length].focus();
  };

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setPinned(true);
      setTimeout(() => focusItem(0), 0);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const onItemKeyDown = (e, i) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === 'Escape') {
      e.preventDefault();
      close();
      wrapRef.current?.querySelector('button')?.focus();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="nav-explore"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`nav-link nav-explore-trigger${active ? ' is-active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setPinned((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <InlineIcon icon={Compass} size={16} />
        {t('nav.explore')}
        <InlineIcon icon={ChevronDown} size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <div className="nav-dropdown" role="menu">
          {EXPLORE_LINKS.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              role="menuitem"
              ref={(el) => { itemsRef.current[i] = el; }}
              className={`nav-dropdown-item${isCurrent(pathname, link.to) ? ' is-active' : ''}`}
              onClick={() => { close(); onNavigate?.(); }}
              onKeyDown={(e) => onItemKeyDown(e, i)}
            >
              <InlineIcon icon={link.icon} size={17} tone="gold" />
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteHeader() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [overHero, setOverHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpenMobile, setExploreOpenMobile] = useState(false);

  // Transparent for as long as the hero is still behind the bar; solid navy
  // from the moment it has scrolled past. Pages with no hero start solid.
  const syncOverHero = useCallback(() => {
    const hero = document.querySelector('.hero');
    if (!hero) { setOverHero(false); return; }
    const headerHeight = window.innerWidth <= MOBILE_BREAKPOINT ? 56 : 64;
    setOverHero(hero.getBoundingClientRect().bottom > headerHeight);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncOverHero);
    };
    // The hero mounts a tick after the route changes.
    const settle = setTimeout(syncOverHero, 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [syncOverHero, location.pathname]);

  // A tap on any link inside the panel closes it.
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const languageSelect = (
    <select
      className="nav-language"
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      value={i18n.language}
      aria-label={t('nav.language')}
    >
      <option value="en">English</option>
      <option value="ckb">کوردی</option>
      <option value="ar">العربية</option>
    </select>
  );

  return (
    <header className={`site-header${overHero ? ' is-over-hero' : ' is-solid'}`}>
      <div className="site-header-inner">
        <Link to="/" className="site-brand">
          <img src={logo} alt="" />
          <span>{t('common.site_name')}</span>
        </Link>

        <nav className="site-nav" aria-label={t('nav.primary')}>
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${isCurrent(location.pathname, link.to) ? ' is-active' : ''}`}
            >
              <InlineIcon icon={link.icon} size={16} />
              {t(link.labelKey)}
            </Link>
          ))}
          <ExploreMenu pathname={location.pathname} />
        </nav>

        <div className="site-actions">
          {user ? (
            <>
              <MessageBell />
              <NotificationBell />
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">{t('nav.login')}</Link>
              <Link to="/signup" className="nav-cta">{t('nav.signup')}</Link>
            </>
          )}
          {languageSelect}
        </div>

        <button
          type="button"
          className="site-burger"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-menu"
          aria-label={t(menuOpen ? 'nav.close_menu' : 'nav.open_menu')}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <InlineIcon icon={menuOpen ? X : Menu} size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="site-mobile" id="site-mobile-menu">
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`site-mobile-link${isCurrent(location.pathname, link.to) ? ' is-active' : ''}`}
              onClick={closeMenu}
            >
              <InlineIcon icon={link.icon} size={18} tone="gold" />
              {t(link.labelKey)}
            </Link>
          ))}

          <button
            type="button"
            className="site-mobile-link site-mobile-toggle"
            aria-expanded={exploreOpenMobile}
            onClick={() => setExploreOpenMobile((v) => !v)}
          >
            <InlineIcon icon={Compass} size={18} tone="gold" />
            {t('nav.explore')}
            <InlineIcon
              icon={ChevronDown}
              size={16}
              style={{ marginInlineStart: 'auto', transform: exploreOpenMobile ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          {exploreOpenMobile && (
            <div className="site-mobile-sub">
              {EXPLORE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`site-mobile-link${isCurrent(location.pathname, link.to) ? ' is-active' : ''}`}
                  onClick={closeMenu}
                >
                  <InlineIcon icon={link.icon} size={17} tone="gold" />
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          )}

          <div className="site-mobile-foot">
            {user ? (
              <button type="button" className="nav-cta" onClick={handleLogout}>{t('userMenu.logout')}</button>
            ) : (
              <>
                <Link to="/login" className="site-mobile-link" onClick={closeMenu}>{t('nav.login')}</Link>
                <Link to="/signup" className="nav-cta" onClick={closeMenu}>{t('nav.signup')}</Link>
              </>
            )}
            {languageSelect}
          </div>
        </div>
      )}
    </header>
  );
}

export default SiteHeader;
