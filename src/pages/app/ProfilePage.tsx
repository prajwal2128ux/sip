/**
 * ProfilePage Component - Academic Affiliation & Profile Settings
 */

import React, { useState } from 'react';
import { User, School, Mail, Shield, Check, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { PageRoute } from '../../types';

interface ProfilePageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, updateProfile, loginAsDemoUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Faculty / Researcher');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const stats = user ? dbService.getDashboardStats(user.id) : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      role,
      institution
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSwitchToDemo = async (type: 'faculty' | 'student') => {
    await loginAsDemoUser(type);
    const updated = dbService.getCurrentUser();
    if (updated) {
      setName(updated.name);
      setRole(updated.role);
      setInstitution(updated.institution);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Academic Profile & Affiliation</span>
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Manage your researcher credentials and institutional department details
          </p>
        </div>

        {/* Switch Persona */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchToDemo('faculty')}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Load Faculty Profile
          </button>
          <button
            type="button"
            onClick={() => handleSwitchToDemo('student')}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Load Student Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Overview Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl mx-auto mb-4 border-2 border-blue-200">
            {user?.name.charAt(0) || 'U'}
          </div>

          <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
          <p className="text-xs text-blue-600 font-semibold mt-0.5">{user?.role}</p>
          <p className="text-[11px] text-slate-700 mt-1">{user?.institution}</p>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-left text-xs">
            <div>
              <span className="text-slate-700 block text-[11px] uppercase">Email</span>
              <span className="font-medium text-slate-800 break-all">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-700 block text-[11px] uppercase">Account Created</span>
              <span className="font-medium text-slate-800">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
            <div>
              <span className="text-slate-700 block text-[11px] uppercase">Total Analyses</span>
              <span className="font-medium text-slate-800">{stats?.totalChecks || 0} checks executed</span>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Edit Affiliation Information
          </h3>

          {savedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile details updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Academic Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Academic Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              >
                <option value="Faculty / Researcher">Faculty / Researcher</option>
                <option value="Graduate Student">Graduate Student</option>
                <option value="Student">Student</option>
                <option value="Teaching Assistant">Teaching Assistant</option>
                <option value="Department Chair">Department Chair</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Institution or University Department
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Department of Computer Science & Engineering"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Academic Email (Read Only)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
