/**
 * LoginPage Component - Academic Portal Login with 2-Factor Email OTP Verification
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LogIn,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../../types';

interface LoginPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { requestLogin, verifyOtp, resendOtp } = useAuth();

  // Authentication Steps: 'credentials' -> 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2FA OTP State
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Submit Credentials & Request Email OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both your academic email and password.');
      return;
    }

    try {
      setLoading(true);
      const result = await requestLogin(email, password);

      if ('requiresOtp' in result && result.requiresOtp) {
        setTempToken(result.tempToken);
        setMaskedEmail(result.maskedEmail);
        setDevOtp(null);
        setStep('otp');
        setCountdown(30);
        setInfoMsg('OTP sent successfully to your email.');
      } else {
        // Direct login success (if 2FA was bypassed)
        onNavigate('dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP Code
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
      setError('Authentication session expired. Please enter your credentials again.');
      setStep('credentials');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(tempToken, cleanOtp);
      onNavigate('dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || !tempToken) return;
    setError(null);
    setInfoMsg(null);

    try {
      setResending(true);
      const res = await resendOtp(tempToken);
      setCountdown(30);
      setDevOtp(null);
      setInfoMsg('OTP sent successfully to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Quick Demo Logins
  const handleDemoLogin = async (type: 'faculty' | 'student') => {
    setError(null);
    setInfoMsg(null);
    const demoEmail = type === 'faculty' ? 'alex.morgan@university.edu' : 'elena.student@university.edu';
    const demoPass = 'plagicheck123';

    setEmail(demoEmail);
    setPassword(demoPass);

    try {
      setLoading(true);
      const result = await requestLogin(demoEmail, demoPass);

      if ('requiresOtp' in result && result.requiresOtp) {
        setTempToken(result.tempToken);
        setMaskedEmail(result.maskedEmail);
        setDevOtp(null);
        setStep('otp');
        setCountdown(30);
        setInfoMsg('OTP sent successfully to your email.');
      } else {
        onNavigate('dashboard');
      }
    } catch {
      setError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="login" onNavigate={onNavigate} />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              step === 'otp' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {step === 'otp' ? <KeyRound className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {step === 'otp' ? 'Email OTP Verification' : 'Sign In to PlagiCheck'}
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              {step === 'otp'
                ? `Enter the 6-digit code sent to ${maskedEmail}`
                : 'Enter your academic credentials to access your dashboard'}
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Academic Email Address
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Verifying Credentials...' : 'Continue with Email OTP'}</span>
              </button>
            </form>
          )}

          {/* STEP 2: 2FA OTP VERIFICATION FORM */}
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
                <span>{loading ? 'Verifying Code...' : 'Verify & Sign In'}</span>
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
                  <span>Change email or password</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Logins for Testing */}
          {step === 'credentials' && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Quick Demo Accounts (Evaluation)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('faculty')}
                  className="p-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dr. Morgan (Faculty)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('student')}
                  className="p-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Elena (Student)</span>
                </button>
              </div>
            </div>
          )}

          {/* Register Prompt */}
          <div className="mt-6 text-center text-xs text-slate-700">
            Don't have an academic account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
