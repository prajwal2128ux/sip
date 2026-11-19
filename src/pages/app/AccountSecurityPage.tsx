/**
 * AccountSecurityPage Component - Security settings and account recovery
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Mail,
  Lock,
  Key,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  LogOut,
  HelpCircle,
  Plus,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../../types';

interface AccountSecurityPageProps {
  onNavigate: (page: PageRoute) => void;
}

interface Session {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_used_at: string;
}

export const AccountSecurityPage: React.FC<AccountSecurityPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('plagicheck_token');
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  // Recovery Email section
  const [recoveryEmail, setRecoveryEmail] = useState<{ email: string; is_verified: boolean } | null>(null);
  const [showRecoveryEmailForm, setShowRecoveryEmailForm] = useState(false);
  const [newRecoveryEmail, setNewRecoveryEmail] = useState('');
  const [recoveryEmailStep, setRecoveryEmailStep] = useState<'input' | 'otp'>('input');
  const [recoveryEmailToken, setRecoveryEmailToken] = useState<string | null>(null);
  const [recoveryEmailOtp, setRecoveryEmailOtp] = useState('');
  const [recoveryEmailLoading, setRecoveryEmailLoading] = useState(false);
  const [recoveryEmailError, setRecoveryEmailError] = useState<string | null>(null);
  const [recoveryEmailSuccess, setRecoveryEmailSuccess] = useState<string | null>(null);

  // Recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [hasExistingCodes, setHasExistingCodes] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);

  // Recovery request
  const [showRecoveryRequestForm, setShowRecoveryRequestForm] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [recoveryRequestLoading, setRecoveryRequestLoading] = useState(false);
  const [recoveryRequestId, setRecoveryRequestId] = useState<string | null>(null);
  const [recoveryRequestError, setRecoveryRequestError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const res = await fetch('/api/v1/auth/sessions', { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load sessions.');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      setSessionsError(err instanceof Error ? err.message : 'Failed to load sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSessions();
    // Check if user has recovery codes already
    (async () => {
      try {
        const res = await fetch('/api/v1/auth/recovery-codes/status', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          setHasExistingCodes(data.has_codes || false);
        }
      } catch {
        // silent
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recovery email handlers
  const handleAddRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryEmailError(null);
    setRecoveryEmailSuccess(null);
    if (!newRecoveryEmail.trim()) return;
    try {
      setRecoveryEmailLoading(true);
      const res = await fetch('/api/v1/auth/recovery-email/add', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: newRecoveryEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add recovery email.');
      setRecoveryEmailToken(data.tempToken || null);
      setRecoveryEmailStep('otp');
      setRecoveryEmailSuccess(data.message || 'OTP sent to the recovery email address.');
    } catch (err: unknown) {
      setRecoveryEmailError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setRecoveryEmailLoading(false);
    }
  };

  const handleVerifyRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryEmailError(null);
    setRecoveryEmailSuccess(null);
    try {
      setRecoveryEmailLoading(true);
      const res = await fetch('/api/v1/auth/recovery-email/verify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ tempToken: recoveryEmailToken, otp: recoveryEmailOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setRecoveryEmail({ email: newRecoveryEmail, is_verified: true });
      setRecoveryEmailSuccess('Recovery email verified successfully!');
      setShowRecoveryEmailForm(false);
      setRecoveryEmailStep('input');
      setNewRecoveryEmail('');
      setRecoveryEmailOtp('');
    } catch (err: unknown) {
      setRecoveryEmailError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setRecoveryEmailLoading(false);
    }
  };

  // Recovery codes handlers
  const handleGenerateCodes = async () => {
    try {
      setCodesLoading(true);
      setCodesError(null);
      const res = await fetch('/api/v1/auth/recovery-codes/generate', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate recovery codes.');
      setRecoveryCodes(data.codes || []);
      setHasExistingCodes(true);
    } catch (err: unknown) {
      setCodesError(err instanceof Error ? err.message : 'Failed to generate codes.');
    } finally {
      setCodesLoading(false);
    }
  };

  const handleDownloadCodes = () => {
    if (!recoveryCodes) return;
    const content = `PlagiCheck Recovery Codes\nGenerated: ${new Date().toISOString()}\nUser: ${user?.email}\n\n${recoveryCodes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plagicheck-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Session handlers
  const handleSignOutAll = async () => {
    try {
      setSignOutAllLoading(true);
      setSessionsError(null);
      const res = await fetch('/api/v1/auth/sessions', {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign out all devices.');
      }
      setSessions([]);
    } catch (err: unknown) {
      setSessionsError(err instanceof Error ? err.message : 'Failed to sign out.');
    } finally {
      setSignOutAllLoading(false);
    }
  };

  // Recovery request handler
  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryRequestError(null);
    if (!recoveryReason.trim()) return;
    try {
      setRecoveryRequestLoading(true);
      const res = await fetch('/api/v1/auth/recovery/request', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: recoveryReason, account_email: user?.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request.');
      setRecoveryRequestId(data.request_id || data.requestId || 'SUBMITTED');
      setShowRecoveryRequestForm(false);
      setRecoveryReason('');
    } catch (err: unknown) {
      setRecoveryRequestError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setRecoveryRequestLoading(false);
    }
  };

  const cardClass = 'bg-white border border-slate-200 rounded-xl shadow-xs p-5';
  const labelClass = 'text-xs font-semibold text-slate-500 uppercase tracking-wider';
  const inputClass = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400';
  const btnPrimary = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5';
  const btnSecondary = 'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className={cardClass + ' flex items-center gap-3'}>
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Security</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage your account security settings and recovery options</p>
        </div>
      </div>

      {/* Section 1: Account & Email */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          Account & Email
        </h3>

        <div className="space-y-3">
          {/* Primary email */}
          <div>
            <p className={labelClass + ' mb-1'}>Primary Email</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
                {user?.email || '—'}
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                <Check className="w-3 h-3" /> Verified
              </span>
            </div>
          </div>

          {/* Recovery email */}
          <div>
            <p className={labelClass + ' mb-1'}>Recovery Email</p>
            {recoveryEmail ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
                  {recoveryEmail.email}
                </span>
                {recoveryEmail.is_verified ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    <AlertTriangle className="w-3 h-3" /> Unverified
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No recovery email set.</p>
            )}
          </div>

          {/* Error / success for recovery email */}
          {recoveryEmailError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{recoveryEmailError}</span>
            </div>
          )}
          {recoveryEmailSuccess && !showRecoveryEmailForm && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{recoveryEmailSuccess}</span>
            </div>
          )}

          {/* Add/Change recovery email */}
          {!showRecoveryEmailForm ? (
            <button
              type="button"
              onClick={() => { setShowRecoveryEmailForm(true); setRecoveryEmailStep('input'); setRecoveryEmailError(null); setRecoveryEmailSuccess(null); }}
              className={btnSecondary}
            >
              <Plus className="w-3.5 h-3.5" />
              {recoveryEmail ? 'Change Recovery Email' : 'Add Recovery Email'}
            </button>
          ) : (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              {recoveryEmailStep === 'input' ? (
                <form onSubmit={handleAddRecoveryEmail} className="space-y-3">
                  <div>
                    <label className={labelClass + ' mb-1 block'}>New Recovery Email</label>
                    <input
                      type="email"
                      value={newRecoveryEmail}
                      onChange={(e) => setNewRecoveryEmail(e.target.value)}
                      placeholder="Enter recovery email address"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={recoveryEmailLoading} className={btnPrimary}>
                      {recoveryEmailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      {recoveryEmailLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                    <button type="button" onClick={() => setShowRecoveryEmailForm(false)} className={btnSecondary}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyRecoveryEmail} className="space-y-3">
                  {recoveryEmailSuccess && (
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                      {recoveryEmailSuccess}
                    </div>
                  )}
                  {recoveryEmailError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {recoveryEmailError}
                    </div>
                  )}
                  <div>
                    <label className={labelClass + ' mb-1 block'}>6-Digit OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={recoveryEmailOtp}
                      onChange={(e) => setRecoveryEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      required
                      className={inputClass + ' text-center tracking-widest font-mono text-lg'}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={recoveryEmailLoading || recoveryEmailOtp.length !== 6} className={btnPrimary}>
                      {recoveryEmailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {recoveryEmailLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button type="button" onClick={() => setShowRecoveryEmailForm(false)} className={btnSecondary}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Password */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          Password
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Use the password reset flow to change your password securely via email verification.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('forgot-password')}
          className={btnPrimary}
        >
          <Lock className="w-3.5 h-3.5" />
          Change Password
        </button>
      </div>

      {/* Section 3: Recovery Codes */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600" />
          Recovery Codes
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          One-time backup codes for account access when your email is unavailable.
        </p>

        {codesError && (
          <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{codesError}</span>
          </div>
        )}

        {hasExistingCodes && !recoveryCodes && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You have previously generated 10 recovery codes. Regenerating will invalidate all existing codes.</span>
          </div>
        )}

        {recoveryCodes && (
          <div className="mb-4">
            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Save these codes now. They will <strong>not</strong> be shown again.</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-center tracking-wider">
                  {code}
                </div>
              ))}
            </div>
            <button type="button" onClick={handleDownloadCodes} className={btnSecondary}>
              <Download className="w-3.5 h-3.5" />
              Download Codes (.txt)
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerateCodes}
          disabled={codesLoading}
          className={btnPrimary}
        >
          {codesLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
          {codesLoading ? 'Generating...' : hasExistingCodes ? 'Regenerate Recovery Codes' : 'Generate Recovery Codes'}
        </button>
      </div>

      {/* Section 4: Active Sessions */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-600" />
          Active Sessions
        </h3>
        <p className="text-xs text-slate-500 mb-4">Devices currently signed in to your account.</p>

        {sessionsError && (
          <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{sessionsError}</span>
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 italic mb-4">No active sessions found.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <Monitor className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {session.user_agent ? session.user_agent.slice(0, 60) + (session.user_agent.length > 60 ? '…' : '') : 'Unknown device'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    IP: {session.ip_address} &middot; {session.last_used_at ? new Date(session.last_used_at).toLocaleString() : new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOutAll}
          disabled={signOutAllLoading || sessions.length === 0}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {signOutAllLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          {signOutAllLoading ? 'Signing Out...' : 'Sign Out All Devices'}
        </button>
      </div>

      {/* Section 5: Account Recovery Request */}
      <div className={cardClass}>
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Account Recovery Request
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Need admin assistance to recover your account? Submit a request below.
        </p>

        {recoveryRequestId && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Recovery request submitted! Your request ID is: <strong className="font-mono">{recoveryRequestId}</strong>. An admin will contact you within 2-3 business days.</span>
          </div>
        )}

        {recoveryRequestError && (
          <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{recoveryRequestError}</span>
          </div>
        )}

        {!showRecoveryRequestForm ? (
          <button
            type="button"
            onClick={() => setShowRecoveryRequestForm(true)}
            className={btnSecondary}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Need Admin Help?
          </button>
        ) : (
          <form onSubmit={handleRecoveryRequest} className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div>
              <label className={labelClass + ' mb-1 block'}>Reason for Recovery Request</label>
              <textarea
                value={recoveryReason}
                onChange={(e) => setRecoveryReason(e.target.value)}
                placeholder="Describe the issue with your account and why you need admin assistance..."
                required
                rows={4}
                className={inputClass + ' resize-none'}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={recoveryRequestLoading || !recoveryReason.trim()} className={btnPrimary}>
                {recoveryRequestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                {recoveryRequestLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowRecoveryRequestForm(false)} className={btnSecondary}>
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
