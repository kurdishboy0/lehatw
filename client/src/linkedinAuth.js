export const LINKEDIN_STATE_KEY = 'lehatw_linkedin_state';

export function linkedinAuthorizationUrl(clientId, origin, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${origin}/login`,
    scope: 'openid profile email',
    state
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

// Signup and login return to the same callback and must both store state.
export function startLinkedInSignIn(clientId) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(LINKEDIN_STATE_KEY, state);
  window.location.assign(linkedinAuthorizationUrl(clientId, window.location.origin, state));
}
