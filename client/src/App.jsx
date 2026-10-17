import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Register from './pages/Register';
import RegisterHR from './pages/RegisterHR';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/StudentDashboard';
import HRDashboard from './pages/HRDashboard';
import HRJobPost from './pages/HRJobPost';
import AdminDashboard from './pages/AdminDashboard';
import HRCandidates from './pages/HRCandidates';
import SetPassword from './pages/SetPassword';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import RegisterInstructor from './pages/RegisterInstructor';
import InstructorDashboard from './pages/InstructorDashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
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
import SiteHeader from './components/SiteHeader';
import AnnouncementBanner from './components/AnnouncementBanner';
import { isRtlLanguage } from './rtl';

import logo from './assets/Logo.jpeg';

function App() {
  const { t, i18n } = useTranslation();
  const rtl = isRtlLanguage(i18n.language);

  // The document itself carries the language and direction, for assistive
  // technology and for anything that reads them outside React.
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [i18n.language, rtl]);

  return (
    <BrowserRouter>
      <div className="app-shell" lang={i18n.language} dir={rtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F7F6F1' }}>

        <SiteHeader />
        <AnnouncementBanner />

        {/* --- MAIN CONTENT AREA --- */}
        <main style={{ flex: 1, padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-hr" element={<RegisterHR />} />
            <Route path="/register-instructor" element={<RegisterInstructor />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetail />} />
            <Route path="/skill-match" element={<SkillMatch />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
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
            <Route path="/instructor-dashboard" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorDashboard /></ProtectedRoute>
            } />
            <Route path="/hr-dashboard" element={
              <ProtectedRoute allowedRoles={['HR']}><HRDashboard /></ProtectedRoute>
            } />
            <Route path="/hr-dashboard/jobs/:jobId/candidates" element={
              <ProtectedRoute allowedRoles={['HR', 'ADMIN']}><HRCandidates /></ProtectedRoute>
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

          <div className="footer-bottom">
            <span dir={rtl ? 'rtl' : 'ltr'}>{t('footer.copyright')}</span>
            <a
              className="footer-credit"
              href="https://www.linkedin.com/in/ahmed-bradosty-190b7917a/"
              target="_blank"
              rel="noopener noreferrer"
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {t('footer.developed_by')}{' '}<bdi>AB</bdi>
            </a>
          </div>
        </footer>

      </div>
    </BrowserRouter>
  );
}

export default App;
