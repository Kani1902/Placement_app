import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      console.log('=== AuthContext Loading ===');
      console.log('Token exists:', !!token);
      console.log('Token value:', token);
      
      if (token) {
        try {
          // Set the authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          console.log('Authorization header set:', axios.defaults.headers.common['Authorization']);
          
          console.log('Making request to /api/auth/profile');
          const response = await axios.get('http://localhost:5000/api/auth/profile');
          console.log('Profile response:', response.data);
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth error:', error.response?.data || error.message);
          // Clear invalid token
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } else {
        // Make sure no auth header is set if no token
        delete axios.defaults.headers.common['Authorization'];
      }
      
      console.log('Setting loading to false');
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};



