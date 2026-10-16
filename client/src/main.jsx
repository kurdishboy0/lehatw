import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { installAccountBlockInterceptor } from './accountBlock';
import { loadTextOverrides } from './translationOverrides';
import { installApiResponseGuard } from './apiResponseGuard';
import { GOOGLE_CLIENT_ID } from './oauthConfig';

installApiResponseGuard();
installAccountBlockInterceptor();
loadTextOverrides();

import { GoogleOAuthProvider } from '@react-oauth/google';

const app = <AuthProvider><App /></AuthProvider>;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID
      ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider>
      : app}
  </StrictMode>,
)
