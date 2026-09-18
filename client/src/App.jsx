import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterHR from './pages/RegisterHR';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/StudentDashboard';
import HRDashboard from './pages/HRDashboard';
import HRJobPost from './pages/HRJobPost';
import AdminDashboard from './pages/AdminDashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import SkillMatch from './pages/SkillMatch';
import StudentProfileView from './pages/StudentProfileView';
import Messages from './pages/Messages';
import AboutUs from './pages/AboutUs';
import VerifyPhone from './pages/VerifyPhone';
import LegalPlaceholder from './pages/LegalPlaceholder';
import ContactUs from './pages/ContactUs';
import ProtectedRoute from './components/ProtectedRoute';
import AnnouncementBanner from './components/AnnouncementBanner';
import UserMenu from './components/UserMenu';
import MessageBell from './components/MessageBell';
import NotificationBell from './components/NotificationBell';
import { useAuth } from './useAuth';
import { isRtlLanguage } from './rtl';

import logo from './assets/Logo.jpeg';

// A LinkedIn-style nav item: an icon on top, a small label underneath, and a thin
// underline that fills in when this is the active route.
function NavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`nav-item${isActive ? ' active' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        textDecoration: 'none', color: isActive ? '#1B2A4A' : '#4a5568',
        padding: '6px 12px', fontSize: '11px', fontWeight: '600', minWidth: '56px'
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
      <span className="nav-item-label">{label}</span>
      <span
        className="nav-item-underline"
        style={{
          display: 'block', width: '100%', height: '2px', backgroundColor: '#1B2A4A',
          borderRadius: '2px', transform: isActive ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 0.15s ease'
        }}
      />
    </Link>
  );
}

function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '3px solid #C99A2E',
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      padding: '0 56px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      flexWrap: 'wrap',
      gap: '10px',
      minHeight: '64px'
    }}>

      {/* Logo + Name */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="Lehatw" style={{ height: '42px', width: 'auto', borderRadius: '8px' }} />
        <span style={{ fontWeight: '800', fontSize: '18px', color: '#1a202c', letterSpacing: '-0.02em' }}>{t('common.site_name')}</span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <NavItem to="/" icon="🏠" label={t('nav.home')} />
        <NavItem to="/jobs" icon="💼" label={t('nav.jobs')} />
        <NavItem to="/skill-match" icon="🧭" label={t('nav.skill_match')} />
        <NavItem to="/about" icon="ℹ️" label={t('nav.about')} />

        {user && (
          <>
            <MessageBell />
            <NotificationBell />
            <UserMenu user={user} onLogout={handleLogout} />
          </>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!user && (
          <>
            <Link to="/login" className="nav-item" style={{ textDecoration: 'none', color: '#4a5568', fontWeight: '600', fontSize: '14px', padding: '8px 14px' }}>
              {t('nav.login')}
            </Link>
            <Link to="/register" className="nav-item" style={{ textDecoration: 'none', color: '#1B2A4A', fontWeight: '700', fontSize: '14px', padding: '8px 14px' }}>
              {t('nav.student_signup')}
            </Link>
            <Link to="/register-hr" className="btn-hover" style={{
              textDecoration: 'none',
              backgroundColor: '#1B2A4A',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              {t('nav.company_signup')}
            </Link>
          </>
        )}

        <select
          onChange={(e) => changeLanguage(e.target.value)}
          value={i18n.language}
          style={{
            padding: '7px 10px',
            borderRadius: '20px',
            border: '1px solid #cbd5e0',
            backgroundColor: '#f7fafc',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            color: '#4a5568'
          }}
        >
          <option value="en">English</option>
          <option value="ckb">کوردی</option>
          <option value="ar">العربية</option>
        </select>
      </div>
    </header>
  );
}

function App() {
  const { t, i18n } = useTranslation();

  return (
    <BrowserRouter>
      <div dir={isRtlLanguage(i18n.language) ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F7F6F1' }}>

        <Header />
        <AnnouncementBanner />

        {/* --- MAIN CONTENT AREA --- */}
        <main style={{ flex: 1, padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-hr" element={<RegisterHR />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetail />} />
            <Route path="/skill-match" element={<SkillMatch />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/privacy-policy" element={<LegalPlaceholder titleKey="legal.privacy_title" introKey="legal.privacy_intro" sectionsKey="legal.privacy_sections" />} />
            <Route path="/terms-of-service" element={<LegalPlaceholder titleKey="legal.terms_title" introKey="legal.terms_intro" sectionsKey="legal.terms_sections" />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/students/:id" element={<StudentProfileView />} />
            <Route path="/messages" element={
              <ProtectedRoute><Messages /></ProtectedRoute>
            } />
            <Route path="/messages/:userId" element={
              <ProtectedRoute><Messages /></ProtectedRoute>
            } />
            <Route path="/student-dashboard" element={
              <ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/hr-dashboard" element={
              <ProtectedRoute allowedRoles={['HR']}><HRDashboard /></ProtectedRoute>
            } />
            <Route path="/hr-dashboard/post-job" element={
              <ProtectedRoute allowedRoles={['HR']}><HRJobPost /></ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
            } />
          </Routes>
        </main>

        {/* --- FOOTER --- */}
        <footer style={{ backgroundColor: '#14213B', color: '#e2e8f0', padding: '48px 32px 24px 32px', marginTop: '20px', borderTop: '3px solid #C99A2E' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px' }}>

            <div style={{ maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <img src={logo} alt="Lehatw" style={{ height: '46px', width: 'auto', borderRadius: '8px' }} />
                <span style={{ fontWeight: '800', fontSize: '18px', color: '#ffffff' }}>{t('common.site_name')}</span>
              </Link>
              <p style={{ fontSize: '14px', color: '#a0aec0', lineHeight: '1.7', margin: 0 }}>
                {t('footer.desc')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '60px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700' }}>{t('footer.platform')}</h4>
                <Link to="/" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.browse_talent')}</Link>
                <Link to="/jobs" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('nav.jobs')}</Link>
                <Link to="/skill-match" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('nav.skill_match')}</Link>
                <Link to="/register" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.for_students')}</Link>
                <Link to="/register-hr" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.for_companies')}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700' }}>{t('footer.legal_support')}</h4>
                <Link to="/privacy-policy" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.privacy_policy')}</Link>
                <Link to="/terms-of-service" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.terms_of_service')}</Link>
                <Link to="/contact-us" className="footer-link" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>{t('footer.contact_us')}</Link>
              </div>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: '40px', borderTop: '1px solid #2d3748', paddingTop: '20px', fontSize: '13px', color: '#718096' }}>
            {t('footer.copyright')}
          </div>
        </footer>

      </div>
    </BrowserRouter>
  );
}

export default App;
