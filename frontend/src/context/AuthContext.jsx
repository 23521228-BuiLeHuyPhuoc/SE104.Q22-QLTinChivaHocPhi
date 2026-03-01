import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedStudent = localStorage.getItem('student');
    const savedPermissions = localStorage.getItem('permissions');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedStudent) {
        setStudent(JSON.parse(savedStudent));
      }
      if (savedPermissions) {
        setPermissions(JSON.parse(savedPermissions));
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await authService.login(username, password);
    if (response.success) {
      const { token, user, student, permissions: perms } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (student) {
        localStorage.setItem('student', JSON.stringify(student));
        setStudent(student);
      }
      if (perms) {
        localStorage.setItem('permissions', JSON.stringify(perms));
        setPermissions(perms);
      }
      setUser(user);
      return { success: true };
    }
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('student');
    localStorage.removeItem('permissions');
    setUser(null);
    setStudent(null);
    setPermissions([]);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user,
    student,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
