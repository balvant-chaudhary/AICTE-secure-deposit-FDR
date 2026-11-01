import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage and verify against /api/auth/me
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aicte_token');
      const storedUser = localStorage.getItem('aicte_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token against backend
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('aicte_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem('aicte_token');
          localStorage.removeItem('aicte_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data.data;

      localStorage.setItem('aicte_token', receivedToken);
      localStorage.setItem('aicte_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  const registerInstitution = async (formData) => {
    try {
      const res = await api.post('/auth/register-institution', formData);
      const { token: receivedToken, user: receivedUser } = res.data.data;

      localStorage.setItem('aicte_token', receivedToken);
      localStorage.setItem('aicte_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('aicte_token');
    localStorage.removeItem('aicte_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    registerInstitution,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
