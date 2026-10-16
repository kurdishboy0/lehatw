import axios, { AxiosError } from 'axios';

// A static host's SPA fallback may return index.html with status 200 for /api.
// Treat that as a failed request before HTML can enter component state.
export function installApiResponseGuard() {
  return axios.interceptors.response.use((response) => {
    const pathname = new URL(response.config.url, 'https://lehatw.invalid').pathname;
    const isApi = pathname === '/api' || pathname.startsWith('/api/');
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    if (isApi && response.status !== 204 && (
      contentType.includes('text/html') || typeof response.data === 'string'
    )) {
      throw new AxiosError(
        'The API returned a web page instead of JSON. Check the backend connection.',
        'ERR_INVALID_API_RESPONSE', response.config, response.request, response
      );
    }
    return response;
  });
}
