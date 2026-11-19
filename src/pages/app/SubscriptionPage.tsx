/**
 * SubscriptionPage Component - Academic Tier & Subscription Overview
 * Explicitly presents the Free & Open Source academic tier as Active.
 * No fake payment systems; future institutional plans marked "Planned / Coming Soon".
 */

import React from 'react';
import { Award, Check, Clock, ShieldCheck, Heart, Info, ArrowRight } from 'lucide-react';
import { PageRoute } from '../../types';

interface SubscriptionPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>Academic Tier & Licensing</span>
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Active plan status and upcoming institutional extensions
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          <span>100% Free Academic Open Source</span>
        </div>
      </div>

      {/* Current Active Plan Card */}
      <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 sm:p-8 shadow-xs relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Academic Community Edition
              </h3>
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                CURRENT ACTIVE PLAN
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Full access for students, researchers, and university educators
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-3xl font-extrabold text-slate-900">₹0</span>
            <span className="text-xs text-slate-700 block">Free & Open Source (INR)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Unlimited text similarity analyses</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Up to 10,000 words per single submission</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>TF-IDF vector space modeling & 3/4-gram shingle matching</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Live Wikipedia search API & open academic corpus lookup</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Color-coded sentence highlighting (Verbatim, Paraphrase, Original)</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Downloadable academic PDF originality certificates</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            No renewal fees · No usage throttles · Open Source
          </span>

          <button
            type="button"
            onClick={() => onNavigate('checker')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Run New Check</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Planned Future Institutional Tier */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-slate-800">
            Institutional Campus Tier (Planned Extension)
          </h3>
          <span className="text-xs font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
            Roadmap Item
          </span>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed mb-4">
          Future releases may introduce an institutional deployment model for campus IT departments.
          No payments are accepted or processed at this time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Canvas / Moodle LTI integration (Planned)</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Batch PDF / DOCX repository scanning (Planned)</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Departmental faculty gradebook synchronization (Planned)</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Custom institutional dissertation archive (Planned)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
