import axios from 'axios';
import { logout } from './auth';
import { formatDateTime } from './localizeDigits';

const BLOCK_CODES = ['ACCOUNT_BANNED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DELETED'];
const STORAGE_KEY = 'lehatw_account_block';

export function isAccountBlock(data) {
  return Boolean(data && BLOCK_CODES.includes(data.code));
}

// Localized explanation of a ban/suspension, including the admin's reason and
// the end date when there is one.
export function describeAccountBlock(block, t, lang) {
  if (!block) return '';
  const parts = [];
  if (block.code === 'ACCOUNT_DELETED') {
    parts.push(t('accountBlock.deleted'));
  } else if (block.code === 'ACCOUNT_BANNED') {
    parts.push(t('accountBlock.banned'));
  } else if (block.until) {
    parts.push(t('accountBlock.suspended_until', { until: formatDateTime(block.until, lang) }));
  } else {
    parts.push(t('accountBlock.suspended'));
  }
  if (block.reason) parts.push(t('accountBlock.reason', { reason: block.reason }));
  return parts.join(' ');
}

// Read and clear are separate on purpose: reading happens in a state
// initializer, which StrictMode runs twice, so it must not have side effects.
export function readStoredAccountBlock() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredAccountBlock() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

// If a signed-in user is banned, suspended, or deleted mid-session, the next
// API call comes back 403 (or 401 for a deleted account) with a block code. Sign them out and explain why on the login
// page, instead of leaving them in a half-broken session. Auth endpoints are
// skipped because the login page shows the block inline itself.
export function installAccountBlockInterceptor() {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const data = error.response?.data;
      const url = error.config?.url || '';
      if ([401, 403].includes(error.response?.status) && isAccountBlock(data) && !url.includes('/api/auth/')) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Storage unavailable: they'll still be signed out, just without the explanation.
        }
        logout();
        window.location.assign('/login');
      }
      return Promise.reject(error);
    }
  );
}
