/**
 * RegisterPage Component - New Academic Account Registration with Email OTP Verification
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Mail,
  User,
  School,
  AlertCircle,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Inbox,
  ArrowLeft
} from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../../types';

interface RegisterPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { registerInitiate, verifyRegistrationOtp } = useAuth();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  // Credentials State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP State
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      const result = await registerInitiate(name, email, password, role, institution || 'Academic Institution');
      if (result.requiresOtp) {
        setTempToken(result.tempToken);
        setMaskedEmail(result.maskedEmail);
        setDevOtp(null);
        setStep('otp');
        setCountdown(30);
        setInfoMsg('OTP sent successfully to your email.');
      } else {
        setInfoMsg('Account registered successfully! Redirecting to sign in...');
        setTimeout(() => onNavigate('login'), 1000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    if (!tempToken) {
      setError('Session expired. Please start registration again.');
      setStep('credentials');
      return;
    }

    try {
      setLoading(true);
      await verifyRegistrationOtp(tempToken, cleanOtp);
      setInfoMsg('Account created! Please sign in.');
      setTimeout(() => onNavigate('login'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !tempToken) return;
    setError(null);
    setInfoMsg(null);
    try {
      setResending(true);
      const res = await fetch('/api/v1/auth/register/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend code.');
      if (data.tempToken) setTempToken(data.tempToken);
      setDevOtp(null);
      setCountdown(30);
      setInfoMsg('OTP sent successfully to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="register" onNavigate={onNavigate} />

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              step === 'otp' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {step === 'otp' ? <KeyRound className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {step === 'otp' ? 'Verify Your Email' : 'Create PlagiCheck Account'}
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              {step === 'otp'
                ? `Enter the 6-digit code sent to ${maskedEmail}`
                : 'Join the open-source academic plagiarism detection platform'}
            </p>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: CREDENTIALS FORM */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Academic Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                  >
                    <option value="Student">Student</option>
                    <option value="Graduate Student">Graduate Student</option>
                    <option value="Faculty / Researcher">Faculty / Researcher</option>
                    <option value="Teaching Assistant">Teaching Assistant</option>
                    <option value="Independent Scholar">Independent Scholar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Institutional Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  University or Institution Name
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Enter your university or college name"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Sending Verification Code...' : 'Continue with Email Verification'}</span>
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION FORM */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                  6-Digit Verification Passcode
                </label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    autoFocus
                    required
                    className="w-full py-3 text-center text-2xl font-bold tracking-[0.4em] font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 placeholder:text-slate-300 placeholder:tracking-widest"
                  />
                </div>
                <p className="text-[11px] text-center text-slate-700 mt-1.5">
                  Check your inbox for an email from <strong>security@plagicheck.university.edu</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying Code...' : 'Verify & Create Account'}</span>
              </button>

              {/* Resend & Back Controls */}
              <div className="pt-2 flex flex-col items-center gap-2 text-xs">
                {countdown > 0 ? (
                  <span className="text-slate-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{resending ? 'Sending...' : 'Resend Verification Code'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-slate-700 hover:text-slate-800 flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to registration form</span>
                </button>
              </div>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center text-xs text-slate-700 pt-4 border-t border-slate-100">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
