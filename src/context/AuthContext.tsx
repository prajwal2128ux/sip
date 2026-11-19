/**
 * PlagiCheck - Authentication Context
 * Manages login, registration, user session, and demo profiles
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbService } from '../services/dbStore';
import { LoginOtpChallenge, User, RegisterOtpChallenge, ForgotPasswordChallenge } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  requestLogin: (email: string, password: string) => Promise<LoginOtpChallenge | User>;
  verifyOtp: (tempToken: string, otp: string) => Promise<User>;
  resendOtp: (tempToken: string) => Promise<{ success: boolean; message: string; devOtp?: string }>;
  register: (name: string, email: string, password: string, role?: string, institution?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'role' | 'institution'>>) => void;
  loginAsDemoUser: (type: 'faculty' | 'student') => Promise<User>;
  forgotPassword: (email: string) => Promise<ForgotPasswordChallenge>;
  resetPasswordVerifyOtp: (tempToken: string, otp: string) => Promise<{ resetToken: string }>;
  resetPassword: (resetToken: string, newPassword: string, confirmPassword: string) => Promise<void>;
  registerInitiate: (name: string, email: string, password: string, role?: string, institution?: string) => Promise<RegisterOtpChallenge>;
  verifyRegistrationOtp: (tempToken: string, otp: string) => Promise<void>;
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

  const requestLogin = async (email: string, password: string): Promise<LoginOtpChallenge | User> => {
    const result = await dbService.requestLogin(email, password);
    if (!('requiresOtp' in result)) {
      setUser(result as User);
    }
    return result;
  };

  const verifyOtp = async (tempToken: string, otp: string): Promise<User> => {
    const verifiedUser = await dbService.verifyLoginOtp(tempToken, otp);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const resendOtp = async (tempToken: string) => {
    return dbService.resendLoginOtp(tempToken);
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

  const forgotPassword = async (email: string): Promise<ForgotPasswordChallenge> => {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initiate password reset.');
    return data;
  };

  const resetPasswordVerifyOtp = async (tempToken: string, otp: string): Promise<{ resetToken: string }> => {
    const res = await fetch('/api/v1/auth/reset-password/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid or expired code.');
    return data;
  };

  const resetPassword = async (resetToken: string, newPassword: string, confirmPassword: string): Promise<void> => {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed.');
  };

  const registerInitiate = async (
    name: string,
    email: string,
    password: string,
    role = 'Student',
    institution = 'Academic Institution'
  ): Promise<RegisterOtpChallenge> => {
    const res = await fetch('/api/v1/auth/register/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, institution })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    return data;
  };

  const verifyRegistrationOtp = async (tempToken: string, otp: string): Promise<void> => {
    const res = await fetch('/api/v1/auth/register/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        requestLogin,
        verifyOtp,
        resendOtp,
        register,
        logout,
        updateProfile,
        loginAsDemoUser,
        forgotPassword,
        resetPasswordVerifyOtp,
        resetPassword,
        registerInitiate,
        verifyRegistrationOtp
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
