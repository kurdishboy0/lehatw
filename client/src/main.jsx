import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { installAccountBlockInterceptor } from './accountBlock';
import { loadTextOverrides } from './translationOverrides';

installAccountBlockInterceptor();
loadTextOverrides();

// 1. Import the Google Provider
import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Wrap the App with the Provider and pass your Client ID from the .env file */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)