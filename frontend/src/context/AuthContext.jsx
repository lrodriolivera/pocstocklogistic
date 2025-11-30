import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Remove trailing /api if present, then add it back to ensure consistency
  const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
  const API_BASE_URL = `${BASE_URL}/api`;

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el login');
      }

      const { user: userData, token: userToken } = data.data;

      setUser(userData);
      setToken(userToken);

      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando perfil');
      }

      const updatedUser = { ...user, ...data.data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando contraseña');
      }

      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error renovando token');
      }

      const newToken = data.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);

      return newToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      logout();
      throw error;
    }
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;

    const roleHierarchy = {
      'agente_comercial': 1,
      'supervisor': 2,
      'alta_gerencia': 3
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const canAccessUser = (targetUserId) => {
    if (!user) return false;

    if (user.role === 'alta_gerencia') return true;

    if (user.role === 'supervisor') {
      return user.managedAgents?.includes(targetUserId) || user.id === targetUserId;
    }

    return user.id === targetUserId;
  };

  const canAccessQuote = (quoteOwnerId) => {
    if (!user) return false;

    if (user.role === 'alta_gerencia') return true;

    if (user.role === 'supervisor') {
      return user.managedAgents?.includes(quoteOwnerId) || user.id === quoteOwnerId;
    }

    return user.id === quoteOwnerId;
  };

  const authFetch = async (url, options = {}) => {
    // Handle URL construction:
    // - If URL starts with /api/, prepend BASE_URL (since url already has /api)
    // - If URL starts with http, use as-is (absolute URL)
    // - Otherwise, prepend API_BASE_URL
    let fullUrl = url;
    if (url.startsWith('/api/')) {
      fullUrl = `${BASE_URL}${url}`;
    } else if (!url.startsWith('http')) {
      fullUrl = `${API_BASE_URL}${url}`;
    }

    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    };

    try {
      let response = await fetch(fullUrl, authOptions);

      if (response.status === 401) {
        await refreshToken();
        authOptions.headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(fullUrl, authOptions);
      }

      return response;
    } catch (error) {
      if (error.message.includes('token')) {
        logout();
      }
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    hasPermission,
    canAccessUser,
    canAccessQuote,
    authFetch,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'alta_gerencia',
    isSupervisor: user?.role === 'supervisor',
    isAgent: user?.role === 'agente_comercial'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};