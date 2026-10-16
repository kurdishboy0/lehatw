import { useGoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '../oauthConfig';

function ConfiguredGoogleButton({ onSuccess, onError, ...props }) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const login = useGoogleLogin({ onSuccess, onError, onNonOAuthError: onError });
  return <button {...props} type="button" disabled={!scriptLoadedSuccessfully} onClick={() => login()} />;
}

export default function GoogleSignInButton(props) {
  // Keep the hook in a child component: calling it without a client ID makes
  // Google's SDK throw during its initialization effect and unmount the app.
  return GOOGLE_CLIENT_ID ? <ConfiguredGoogleButton {...props} /> : null;
}
