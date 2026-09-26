// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../services/api';

const AuthContext = createContext();

export const DEMO_PRESETS = {
  MUNICIPAL_OFFICER: {
    email: 'officer@tapchetna.gov.in',
    password: 'Pass123!',
    label: 'Dr. Anita Banerjee (KMC Ward 17 Officer)',
  },
  SYSTEM_ADMIN: {
    email: 'admin@tapchetna.gov.in',
    password: 'Admin123!',
    label: 'Root Administrator (Disaster Directorate)',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tapchetna_token') || '');
  const [loading, setLoading] = useState(true);

  // Initialize from real server session if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('tapchetna_token');
      if (storedToken) {
        try {
          const res = await getMe();
          if (res.data) {
            setUser(res.data);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err.message);
          localStorage.removeItem('tapchetna_token');
          localStorage.removeItem('tapchetna_user');
          setToken('');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginUser = async (email, password) => {
    try {
      const res = await apiLogin(email, password);
      const { token: receivedToken, user: userData } = res.data;
      localStorage.setItem('tapchetna_token', receivedToken);
      localStorage.setItem('tapchetna_user', JSON.stringify(userData));
      setToken(receivedToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      return { success: false, message: errorMsg };
    }
  };

  const registerUser = async (data) => {
    try {
      const res = await apiRegister(data);
      const { token: receivedToken, user: userData } = res.data;
      localStorage.setItem('tapchetna_token', receivedToken);
      localStorage.setItem('tapchetna_user', JSON.stringify(userData));
      setToken(receivedToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed.';
      return { success: false, message: errorMsg };
    }
  };

  const quickOfficerLogin = () => loginUser(DEMO_PRESETS.MUNICIPAL_OFFICER.email, DEMO_PRESETS.MUNICIPAL_OFFICER.password);
  const quickAdminLogin = () => loginUser(DEMO_PRESETS.SYSTEM_ADMIN.email, DEMO_PRESETS.SYSTEM_ADMIN.password);

  const logout = () => {
    localStorage.removeItem('tapchetna_token');
    localStorage.removeItem('tapchetna_user');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: loginUser,
        register: registerUser,
        quickOfficerLogin,
        quickAdminLogin,
        logout,
        isAuthenticated: !!user,
        role: user?.role || 'GUEST',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
