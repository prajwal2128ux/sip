/**
 * FeaturesPage Component - Platform Capabilities and Roadmap
 * Clearly distinguishes between CURRENT WORKING FEATURES and COMING SOON / PLANNED FEATURES.
 */

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Search,
  FileText,
  FileCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PageRoute } from '../../types';

interface FeaturesPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="features" onNavigate={onNavigate} />

      {/* Header */}
      <section className="bg-white border-b border-slate-200 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            System Architecture & Features
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Plagiarism Detection Technology
          </h1>
          <p className="mt-3 text-base text-slate-700 max-w-2xl mx-auto leading-relaxed">
            PlagiCheck combines deterministic text normalization with mathematical vector space models
            and n-gram shingle comparison to produce transparent, explainable originality scores.
          </p>
        </div>
      </section>

      {/* Section 1: CURRENT WORKING FEATURES */}
      <section className="py-12 md:py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Current Working Features (Active in v1.0)
          </h2>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
            Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Text Preprocessing & Shingling
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Converts text to lowercase, eliminates punctuation noise, segments sentences, and generates 3-gram and 4-gram shingles for phrase sequence matching.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              TF-IDF & Cosine Similarity
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Constructs term frequency and inverse document frequency vector spaces, computing cosine angles between candidate texts and reference documents.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Wikipedia & Reference Index
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Performs real-time search queries across Wikipedia's open encyclopedia API combined with an indexed academic benchmark corpus across scientific disciplines.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Interactive Matched Highlighting
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Directly highlights matching portions within the submitted text with clear visual semantics: red for verbatim, amber for paraphrasing, and green for original text.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Downloadable Academic PDF Reports
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Generates formal academic reports with unique report identifiers, date timestamps, reference breakdown tables, and printable audit sheets.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Relational Database & Audit Log
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-3">
              Persists users, submissions, sources, and reports in a normalized MySQL relational architecture with foreign keys and cascade deletions.
            </p>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: FUTURE PLANNED FEATURES */}
      <section className="py-12 bg-white border-t border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Future Planned Features (Academic Roadmap)
            </h2>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-slate-700 max-w-2xl mb-8">
            These features are currently in active design and research. PlagiCheck transparently reports them as future extensions rather than currently active tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">PDF Document Upload</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Direct parsing of PDF research papers with header/footer stripping and column extraction.
              </p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">DOC & DOCX File Upload</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Microsoft Word document processing with formatting preservation and bibliography segregation.
              </p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">Grammar & Syntax Assistance</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Planned Feature
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Academic style and grammar suggestions similar to institutional proofreading software.
              </p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">AI-Generated Content Detection</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Planned Feature
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Perplexity and burstiness metrics to detect machine-generated essay sections.
              </p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">Text Summarization</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Planned Feature
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Extractive summarization of submitted papers and key matched reference texts.
              </p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">Dense Semantic Embeddings</h4>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Planned Feature
                </span>
              </div>
              <p className="text-xs text-slate-700">
                Integration of transformer vector embeddings to detect deep semantic rephrasing across languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-slate-50 text-center">
        <button
          type="button"
          onClick={() => onNavigate('checker')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
        >
          <span>Test Working Text Checker Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
