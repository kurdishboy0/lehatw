import { useState } from 'react';
import { AuthContext } from './authContextObject';
import { getUser, setSession, logout as clearSession } from './auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());

  const login = (token, userData) => {
    setSession(token, userData);
    setUser(userData);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
