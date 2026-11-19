/**
 * ForgotPasswordPage Component - 3-step password reset flow
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  Inbox
} from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../../types';

interface ForgotPasswordPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { forgotPassword, resetPasswordVerifyOtp, resetPassword } = useAuth();

  const [step, setStep] = useState<'email' | 'otp' | 'newpassword'>('email');

  // Step 1 state
  const [email, setEmail] = useState('');

  // Step 2 state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  // Step 3 state
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  // Step 1: Email submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      const result = await forgotPassword(email);
      setTempToken(result.tempToken);
      setMaskedEmail(result.maskedEmail);
      setDevOtp(null);
      setStep('otp');
      setCountdown(30);
    } catch {
      // Always show privacy-safe message regardless of error
    } finally {
      setLoading(false);
      setInfoMsg('OTP sent successfully to your email.');
      setStep('otp');
    }
  };

  // Step 2: OTP verify
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
      setError('Session expired. Please request a new reset code.');
      setStep('email');
      return;
    }

    try {
      setLoading(true);
      const result = await resetPasswordVerifyOtp(tempToken, cleanOtp);
      setResetToken(result.resetToken);
      setStep('newpassword');
      setInfoMsg('Code verified! Please set your new password.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError(null);
    setInfoMsg(null);
    try {
      setResending(true);
      const result = await forgotPassword(email);
      setTempToken(result.tempToken);
      setDevOtp(null);
      setCountdown(30);
      setInfoMsg('OTP sent successfully to your email.');
    } catch {
      setInfoMsg('OTP sent successfully to your email.');
    } finally {
      setResending(false);
    }
  };

  // Step 3: New password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Session expired. Please start again.');
      setStep('email');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(resetToken, newPassword, confirmPassword);
      setInfoMsg('Password reset successfully! Please sign in.');
      setTimeout(() => onNavigate('login'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = {
    email: 'Reset Your Password',
    otp: 'Email OTP Verification',
    newpassword: 'Set New Password'
  };

  const stepSubtitles = {
    email: 'Enter your registered email address',
    otp: `Enter the 6-digit code sent to ${maskedEmail}`,
    newpassword: 'Choose a strong new password for your account'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="login" onNavigate={onNavigate} />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
              step === 'otp' ? 'bg-indigo-50 text-indigo-600' :
              step === 'newpassword' ? 'bg-emerald-50 text-emerald-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              {step === 'otp' ? <KeyRound className="w-6 h-6" /> :
               step === 'newpassword' ? <Lock className="w-6 h-6" /> :
               <ShieldCheck className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {stepTitles[step]}
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              {stepSubtitles[step]}
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

          {/* STEP 1: EMAIL FORM */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>{loading ? 'Sending Reset Code...' : 'Send Reset Code'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 mx-auto cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP FORM */}
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
                <span>{loading ? 'Verifying Code...' : 'Verify Code'}</span>
              </button>

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
                    <span>{resending ? 'Sending...' : 'Resend Reset Code'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-slate-700 hover:text-slate-800 flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change email address</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD FORM */}
          {step === 'newpassword' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Resetting Password...' : 'Reset Password'}</span>
              </button>
            </form>
          )}

          {/* Back to login */}
          {step !== 'email' && (
            <div className="mt-6 text-center text-xs text-slate-700">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
