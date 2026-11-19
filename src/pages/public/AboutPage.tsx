/**
 * AboutPage Component - Project Background, Mission, and Technical Architecture
 */

import React from 'react';
import { ShieldCheck, BookOpen, Code, Database, Cpu, ArrowRight, Github } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PageRoute } from '../../types';

interface AboutPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicNavbar currentPage="about" onNavigate={onNavigate} />

      {/* Header */}
      <section className="bg-white border-b border-slate-200 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Capstone Engineering Project
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            About PlagiCheck
          </h1>
          <p className="mt-3 text-base text-slate-700 max-w-2xl mx-auto leading-relaxed">
            PlagiCheck is an open-source academic plagiarism detection website created as a Software Engineering
            project to provide transparent, explainable text originality checking.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Project Purpose */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Project Mission & Motivation</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            Commercial plagiarism checkers often operate as closed, proprietary "black boxes" with costly institutional licenses and opaque scoring rules. Students and researchers frequently cannot inspect which exact algorithms were used or why an originality flag was triggered.
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            PlagiCheck was created to demonstrate a deterministic, verifiable, and open-source plagiarism detection workflow. Every sentence is systematically evaluated, attributed to specific reference passages from Wikipedia and academic literature, and presented with transparent similarity math.
          </p>
        </section>

        {/* Explainable Algorithms Section */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Implemented Similarity Algorithms</h2>
          </div>

          <div className="space-y-6">
            <div className="border-l-3 border-blue-600 pl-4">
              <h3 className="text-base font-bold text-slate-900">
                1. Text Preprocessing & Sentence Segmentation
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mt-1">
                The input document is segmented into grammatical sentences with precise character offset tracking. The text is normalized into lowercase tokens while removing non-alphanumeric punctuation to prepare for mathematical vectorization.
              </p>
            </div>

            <div className="border-l-3 border-blue-600 pl-4">
              <h3 className="text-base font-bold text-slate-900">
                2. N-Gram Shingling & Jaccard Overlap
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mt-1">
                Sentences are decomposed into overlapping sequences of 3 words (3-grams) and 4 words (4-grams), termed shingles. Comparing shingle intersections via the Jaccard coefficient reliably flags both verbatim copied phrases and minor syntactic perturbations.
              </p>
            </div>

            <div className="border-l-3 border-blue-600 pl-4">
              <h3 className="text-base font-bold text-slate-900">
                3. TF-IDF & Cosine Similarity in Vector Space
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mt-1">
                Term Frequency (TF) and Inverse Document Frequency (IDF) weights are computed across the candidate corpus:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mt-2 font-mono text-xs text-slate-800">
                IDF(t, D) = ln(1 + (N / (1 + df(t))))<br />
                Cosine Similarity = (u · v) / (||u|| * ||v||)
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mt-2">
                This measures the geometric cosine of the angle between document vectors, determining thematic and stylistic overlap independent of document length.
              </p>
            </div>

            <div className="border-l-3 border-blue-600 pl-4">
              <h3 className="text-base font-bold text-slate-900">
                4. Reference Corpus: Live Wikipedia Search
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mt-1">
                The engine extracts primary subject keywords and queries Wikipedia's open MediaWiki search API in real-time, matching submitted paragraphs against authoritative online reference texts.
              </p>
            </div>
          </div>
        </section>

        {/* Database Architecture */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">MySQL Database Specification</h2>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed mb-4">
            The platform is structured upon standard relational database tables:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-900 block mb-1">`users` Table</span>
              <p className="text-slate-700">id, name, email, password_hash, role, institution, created_at</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-900 block mb-1">`analyses` Table</span>
              <p className="text-slate-700">id, user_id, submitted_text, word_count, similarity_percentage, originality_percentage, created_at</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-900 block mb-1">`analysis_sources` Table</span>
              <p className="text-slate-700">id, analysis_id, source_name, source_url, matched_text, match_percentage</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-900 block mb-1">`reports` Table</span>
              <p className="text-slate-700">id, analysis_id, report_code, report_data (JSON), summary_text, created_at</p>
            </div>
          </div>
        </section>

        {/* Project Call to Action */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => onNavigate('checker')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
          >
            <span>Launch Plagiarism Checker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
