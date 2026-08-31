export function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
