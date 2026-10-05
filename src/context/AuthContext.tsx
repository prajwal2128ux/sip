/**
 * PlagiCheck - Authentication Context
 * Manages login, registration, user session, and demo profiles
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbService } from '../services/dbStore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string, institution?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'role' | 'institution'>>) => void;
  loginAsDemoUser: (type: 'faculty' | 'student') => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load initial user session from dbService
    const current = dbService.getCurrentUser();
    setUser(current);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const loggedUser = await dbService.authenticate(email, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role = 'Student',
    institution = 'Academic Institution'
  ): Promise<User> => {
    const newUser = await dbService.registerUser(name, email, password, role, institution);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    dbService.setCurrentUser(null);
    setUser(null);
  };

  const updateProfile = (updates: Partial<Pick<User, 'name' | 'role' | 'institution'>>) => {
    if (!user) return;
    const updated = dbService.updateUserProfile(user.id, updates);
    setUser(updated);
  };

  const loginAsDemoUser = async (type: 'faculty' | 'student'): Promise<User> => {
    if (type === 'faculty') {
      return login('alex.morgan@university.edu', 'plagicheck123');
    } else {
      return login('elena.student@university.edu', 'plagicheck123');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        loginAsDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
