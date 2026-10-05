/**
 * PricingPage Component - Open Source Academic Access & Plans
 * Emphasizes: "Free & Open Source Academic Project"
 * Clearly explains free community access and planned institutional features. No fake payment systems.
 */

import React from 'react';
import { ShieldCheck, Check, Clock, ArrowRight, BookOpen, School, Heart } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PageRoute } from '../../types';

interface PricingPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="pricing" onNavigate={onNavigate} />

      {/* Header */}
      <section className="bg-white border-b border-slate-200 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
            <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>Free & Open Source Academic Project</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Academic Community Plans & Licensing
          </h1>
          <p className="mt-3 text-base text-slate-700 max-w-2xl mx-auto leading-relaxed">
            PlagiCheck was built to make academic integrity tooling open, transparent, and accessible
            to students and researchers worldwide without paywalls or restrictive commercial licenses.
          </p>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="py-12 md:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Community Free Tier */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 shadow-sm flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-8 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Current Active Version
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  Academic Community Edition
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Free Forever
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed mb-6">
                Complete access to the text plagiarism checking pipeline for students, educators, and independent academic researchers.
              </p>

              <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-100">
                <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                <span className="text-xs text-slate-700">/ forever (Free & Open Source in INR)</span>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Included Features:
                </span>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Unlimited text plagiarism checks (up to 10,000 words per check)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>TF-IDF vector space modeling & 3/4-gram shingle similarity</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Real Wikipedia & Academic Reference Corpus search</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Interactive sentence highlighting (Verbatim, Paraphrase, Original)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Exportable, printable academic PDF certificates</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Persistent analysis history & personal dashboard</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Use Free Text Checker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Institutional Tier (Planned / Coming Soon) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  Institutional / Campus Edition
                </h3>
                <span className="text-xs font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed mb-6">
                Planned institutional tier for universities and departments requiring LMS integration and bulk document batching.
              </p>

              <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-200">
                <span className="text-3xl font-bold text-slate-700">Planned Feature</span>
                <span className="text-xs text-slate-700">· Roadmap preview</span>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Future Roadmap Capabilities:
                </span>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Direct PDF, DOC, and DOCX batch uploads (Coming Soon)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Campus LMS LTI Integration (Canvas, Moodle, Blackboard)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Private departmental thesis & dissertation repositories</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Role-based faculty grading & class roster assignment</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <Clock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>Centralized university administrative audit logs</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="w-full py-3 px-4 bg-slate-200 text-slate-500 font-medium text-sm rounded-lg cursor-not-allowed text-center"
            >
              Planned Extension (No Payment Required)
            </button>
          </div>
        </div>

        {/* Open Source Transparency Notice */}
        <div className="mt-12 p-6 rounded-xl bg-blue-50/60 border border-blue-200 text-center max-w-3xl mx-auto">
          <BookOpen className="w-6 h-6 text-blue-700 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-blue-900 mb-1">
            Academic Integrity Guarantee
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed max-w-xl mx-auto">
            PlagiCheck does not monetize or resell student essays. Your submitted texts are analyzed solely for similarity verification against public reference documents.
          </p>
        </div>
      </section>
    </div>
  );
};
