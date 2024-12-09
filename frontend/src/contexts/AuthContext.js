import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get token from various sources
const getStoredToken = () => {
  // Check localStorage first
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Check cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
  if (tokenCookie) {
    return tokenCookie.split('=')[1];
  }
  
  return null;
};

// Helper function to set token in both localStorage and cookies
const setStoredToken = (token) => {
  localStorage.setItem('token', token);
  // Set cookie with 7 days expiration
  document.cookie = `token=${token}; max-age=${7 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
};

// Helper function to clear all stored tokens
const clearStoredTokens = () => {
  localStorage.removeItem('token');
  document.cookie = 'token=; max-age=0; path=/';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getStoredToken();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await fetchUser();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        clearStoredTokens();
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      setUser(response.data.user);
      console.log('Auto-login successful:', response.data.user.name);
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 401) {
        console.log('Token expired, logging out...');
        logout();
      } else {
        console.error('Unexpected error during auto-login:', error);
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      setStoredToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/register', { name, email, password });
      const { token, user } = response.data;
      
      setStoredToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success(`Welcome, ${user.name}! Registration successful!`);
      navigate('/');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredTokens();
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to change password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 