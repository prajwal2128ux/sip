/**
 * Header Component - Application Top Navigation Bar
 */

import React from 'react';
import { Menu, Database, Plus, Cpu } from 'lucide-react';
import { PageRoute } from '../../types';
import { getApiStatus } from '../../config/apiConfig';

interface HeaderProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<PageRoute, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'Academic Plagiarism Detection' },
  features: { title: 'Features', subtitle: 'Platform Capabilities & Algorithms' },
  pricing: { title: 'Pricing & Plans', subtitle: 'Academic Community Access' },
  about: { title: 'About PlagiCheck', subtitle: 'Project Information & Mission' },
  login: { title: 'Sign In', subtitle: 'Access Academic Portal' },
  register: { title: 'Create Account', subtitle: 'Register for PlagiCheck' },
  dashboard: { title: 'Dashboard', subtitle: 'Overview of recent plagiarism checks and statistics' },
  checker: { title: 'Plagiarism Checker', subtitle: 'Analyze text against open academic literature and Wikipedia' },
  'analysis-progress': { title: 'Analysis in Progress', subtitle: 'Running text similarity pipeline' },
  result: { title: 'Plagiarism Analysis Results', subtitle: 'Sentence-by-sentence similarity and reference sources' },
  'detailed-report': { title: 'Detailed Plagiarism Report', subtitle: 'Comprehensive academic originality certification' },
  reports: { title: 'Reports Archive', subtitle: 'View and download generated originality certificates' },
  history: { title: 'Analysis History', subtitle: 'Log of all completed plagiarism checks' },
  profile: { title: 'Academic Profile', subtitle: 'User settings, affiliation, and activity summary' },
  subscription: { title: 'Subscription & Tier', subtitle: 'Active academic plan and upcoming institutional features' }
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onToggleMobileMenu
}) => {
  const info = PAGE_TITLES[currentPage] || { title: 'PlagiCheck', subtitle: 'Academic Edition' };
  const apiStatus = getApiStatus();

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-sans">
              {info.title}
            </h1>
            <p className="text-xs text-slate-700 hidden sm:block">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Reference Corpus Indicator & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                apiStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-500">API:</span>
            <span className="font-semibold text-slate-700">
              {apiStatus.isConnected ? apiStatus.provider : 'Built-in Engine'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-700">Corpus:</span>
            <span className="font-semibold text-slate-700">Active</span>
          </div>

          {currentPage !== 'checker' && (
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Check</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
