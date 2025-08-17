import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle validation errors properly
        let errorMessage = 'Login failed';
        if (data.message) {
          if (Array.isArray(data.message)) {
            // Handle validation errors from backend
            errorMessage = data.message.map(err => err.message).join(', ');
          } else if (typeof data.message === 'object') {
            errorMessage = JSON.stringify(data.message);
          } else {
            errorMessage = data.message;
          }
        }
        throw new Error(errorMessage);
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (username, email, phone, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle validation errors properly
        let errorMessage = 'Registration failed';
        if (data.message) {
          if (Array.isArray(data.message)) {
            // Handle validation errors from backend
            errorMessage = data.message.map(err => err.message).join(', ');
          } else if (typeof data.message === 'object') {
            errorMessage = JSON.stringify(data.message);
          } else {
            errorMessage = data.message;
          }
        }
        throw new Error(errorMessage);
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      user: currentUser, // Alias for compatibility
      token, 
      login, 
      register, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};