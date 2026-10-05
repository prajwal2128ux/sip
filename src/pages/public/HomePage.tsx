/**
 * HomePage Component - Public Landing Page
 * Message: "Check Your Content. Improve Your Originality."
 * Workflow: 1. Paste Your Text -> 2. Analyze Similarity -> 3. View Your Report
 */

import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  FileText,
  Search,
  CheckCircle,
  Database,
  BarChart3,
  Lock,
  BookOpen,
  Code2
} from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PageRoute } from '../../types';

interface HomePageProps {
  onNavigate: (page: PageRoute) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="home" onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Academic Trust Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Free & Open Source Academic Project</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-slate-700">TF-IDF & N-Gram Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Check Your Content.<br />
            <span className="text-blue-600">Improve Your Originality.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            PlagiCheck is an accessible, open-source platform for academic plagiarism detection,
            text similarity analysis, and comprehensive originality reporting. Designed specifically for students,
            researchers, and academic institutions.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
              <span>Check Plagiarism</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('features')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors"
            >
              Explore Features
            </button>
          </div>

          {/* Institutional Reassurance Details */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Real Wikipedia Reference Search</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Sentence-Level Highlighted Visuals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Official PDF Report Export</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>100% Free Core Academic Version</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section: 1. Paste -> 2. Analyze -> 3. View Report */}
      <section className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Simple 3-Step Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              How PlagiCheck Works
            </h2>
            <p className="text-sm text-slate-700 mt-2">
              Transparent, explainable natural language processing from submitted text to final originality certificate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                1. Paste Your Text
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                Paste or type essays, literature reviews, or research papers directly into the text editor. Track real-time word and character counts.
              </p>
              <div className="text-xs text-slate-700 flex items-center gap-1.5 pt-3 border-t border-slate-100">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Text input up to 10,000 words</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                2. Analyze Similarity
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                Our algorithm normalizes text, creates 3-gram and 4-gram shingles, searches live Wikipedia articles, and computes TF-IDF vector cosine similarity.
              </p>
              <div className="text-xs text-slate-700 flex items-center gap-1.5 pt-3 border-t border-slate-100">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>TF-IDF + Cosine Vector Space</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                3. View Your Report
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                Inspect color-coded matched sentences (red for verbatim, amber for paraphrased), view attributed sources, and download official PDF reports.
              </p>
              <div className="text-xs text-slate-700 flex items-center gap-1.5 pt-3 border-t border-slate-100">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Downloadable academic PDF certification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Rigorous Academic Standards
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Built for Academic Honesty & Clarity
            </h2>
            <p className="text-sm text-slate-700 mt-2">
              Explainable text analytics without black-box guesswork or inflated statistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Code2 className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Deterministic NLP Pipeline
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Uses transparent tokenization, lowercase conversion, and punctuation stripping to ensure reproducible similarity evaluations.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Real Reference Sources
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Compares text against Wikipedia search results and curated academic benchmarks, showing exact matching URLs and excerpts.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Interactive Text Inspector
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Click any highlighted sentence to immediately inspect the source document, overlap score, and matched reference excerpt.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Persistent Analysis History
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Every completed check is stored in the relational database with full audit trail, word statistics, and generated report records.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Local Privacy & Control
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Your submitted text is analyzed strictly for similarity metrics. User data is password-hashed and securely managed.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Standard MySQL Schema
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Designed to institutional Software Engineering specifications with clean relational tables and foreign keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-12 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to check your text for plagiarism?
          </h3>
          <p className="mt-2 text-blue-100 text-sm max-w-xl mx-auto">
            Experience our text preprocessing, reference content search, and instant originality reports.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm"
            >
              Start Free Plagiarism Check
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors text-sm border border-blue-500"
            >
              Open Academic Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-300 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-white tracking-tight">PLAGICHECK</span>
              </div>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                An open-source academic plagiarism detection system developed for transparent originality analysis using TF-IDF vector space modeling and n-gram shingle comparison.
              </p>
            </div>

            <div>
              <h5 className="font-semibold text-white mb-2 uppercase tracking-wider text-[11px]">
                Platform
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><button type="button" onClick={() => onNavigate('home')} className="hover:text-white">Home</button></li>
                <li><button type="button" onClick={() => onNavigate('features')} className="hover:text-white">Features</button></li>
                <li><button type="button" onClick={() => onNavigate('pricing')} className="hover:text-white">Pricing & Plans</button></li>
                <li><button type="button" onClick={() => onNavigate('checker')} className="hover:text-white">Plagiarism Checker</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold text-white mb-2 uppercase tracking-wider text-[11px]">
                Project & Account
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><button type="button" onClick={() => onNavigate('about')} className="hover:text-white">About Project</button></li>
                <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-white">Academic Login</button></li>
                <li><button type="button" onClick={() => onNavigate('register')} className="hover:text-white">Register</button></li>
                <li><button type="button" onClick={() => onNavigate('dashboard')} className="hover:text-white">Dashboard</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
            <p>© 2026 PlagiCheck · Open Source Academic Software Project</p>
            <p>Database: MySQL Relational Schema · Corpus: Wikipedia + Academic Reference Index</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
