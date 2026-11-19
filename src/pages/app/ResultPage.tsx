/**
 * ResultPage Component - Plagiarism Analysis Result
 *
 * Implements:
 * - Similarity Score, Originality Score, Words Analyzed, Sources Found, Processing Time
 * - Submitted Text with Matched Portions (Red/orange = matched, Green = original, Neutral = normal)
 * - Reference Sources (Title, URL, Match %, Matched text/excerpt)
 * - Buttons: "Check Another Text", "View Detailed Report", "Download Report"
 */

import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  Download,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Printer
} from 'lucide-react';
import { HighlightedText } from '../../components/common/HighlightedText';
import { ScoreCard } from '../../components/common/ScoreCard';
import { SourceCard } from '../../components/common/SourceCard';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { generateAndDownloadPdf } from '../../services/pdfExport';
import { Analysis, PageRoute } from '../../types';

interface ResultPageProps {
  analysisId?: number;
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ analysisId, onNavigate }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (analysisId) {
      const found = dbService.getAnalysisById(analysisId);
      if (found) {
        setAnalysis(found);
        return;
      }
    }
    // Fallback to most recent analysis
    const list = dbService.getAnalyses(user?.id);
    if (list.length > 0) {
      setAnalysis(list[0]);
    }
  }, [analysisId, user]);

  if (!analysis) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Analysis Record Not Found</h3>
        <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto">
          Please run a new check or select an analysis from your history.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('checker')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          Go to Checker
        </button>
      </div>
    );
  }

  const isHighRisk = analysis.similarityPercentage > 35;
  const isModerateRisk = analysis.similarityPercentage > 15 && analysis.similarityPercentage <= 35;

  const handleDownloadPdf = () => {
    const report = dbService.getReportByAnalysisId(analysis.id);
    if (report) {
      generateAndDownloadPdf(report, user);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Analysis #{analysis.id}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-700">
                {new Date(analysis.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {analysis.title || 'Plagiarism Analysis Results'}
            </h2>
          </div>

          {/* Three Required Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Check Another Text</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('detailed-report', analysis.id)}
              className="px-3.5 py-2 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Detailed Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Core Required Metrics */}
      {/* Core Required Metrics & Dual AI vs Human Scores */}
      {(() => {
        const aiScore = analysis.aiProbabilityPercentage ?? 0;
        const humanScore = analysis.humanPercentage ?? Math.max(0, 100 - aiScore);
        const aiFlaggedCount = analysis.matches.filter((m) => m.isAiPattern).length;
        const humanSentencesCount = Math.max(0, analysis.sentenceCount - aiFlaggedCount);

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <ScoreCard
                label="Similarity Score"
                value={`${analysis.similarityPercentage}%`}
                subtext={isHighRisk ? 'High Match Risk' : isModerateRisk ? 'Moderate Match' : 'Low Overlap'}
                variant={isHighRisk ? 'rose' : isModerateRisk ? 'amber' : 'emerald'}
              />

              <ScoreCard
                label="Copied from AI"
                value={`${aiScore}%`}
                subtext={aiScore >= 70 ? 'Likely ChatGPT / LLM' : aiScore >= 35 ? 'Mixed AI & Human' : 'Low / No AI'}
                variant={aiScore >= 70 ? 'rose' : aiScore >= 35 ? 'amber' : 'neutral'}
              />

              <ScoreCard
                label="Human Content"
                value={`${humanScore}%`}
                subtext={`${humanSentencesCount} of ${analysis.sentenceCount} sentences`}
                variant="emerald"
              />

              <ScoreCard
                label="Originality"
                value={`${analysis.originalityPercentage}%`}
                subtext="Unique to corpus"
                variant="blue"
              />

              <ScoreCard
                label="Words Analyzed"
                value={analysis.wordCount.toLocaleString()}
                subtext={`${analysis.characterCount.toLocaleString()} chars`}
                variant="neutral"
              />

              <ScoreCard
                label="Sources Found"
                value={analysis.sources.length}
                subtext="Corpus references"
                variant="neutral"
              />
            </div>

            {/* AI vs Human Content Detection Visual Meter */}
            <div
              className={`rounded-xl p-5 border shadow-2xs ${
                aiScore >= 70
                  ? 'bg-purple-50/80 border-purple-200'
                  : aiScore >= 40
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-emerald-50/80 border-emerald-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      aiScore >= 70
                        ? 'bg-purple-600 text-white'
                        : aiScore >= 40
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        AI Content vs. Human Authorship Analysis
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          aiScore >= 70
                            ? 'bg-purple-200 text-purple-900'
                            : aiScore >= 40
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {analysis.aiVerdict || (aiScore >= 70 ? 'High AI Generation' : 'Human Written')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {aiScore >= 70
                        ? `The document exhibits distinct ChatGPT generation patterns (${aiScore}% AI copied, ${humanScore}% human authored) with uniform sentence burstiness and formulaic discourse structures.`
                        : aiScore >= 40
                        ? `Mixed writing signals detected: ${aiScore}% AI generation patterns and ${humanScore}% human authored style.`
                        : `Natural human writing characteristics verified: ${humanScore}% human authored with organic cadence and varied sentence length.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-3.5 py-2 rounded-lg bg-white/90 border border-slate-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">
                      Copied from AI
                    </span>
                    <span className="text-lg font-extrabold text-purple-900">
                      {aiScore}%
                    </span>
                  </div>
                  <div className="px-3.5 py-2 rounded-lg bg-white/90 border border-slate-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                      Human Content
                    </span>
                    <span className="text-lg font-extrabold text-emerald-900">
                      {humanScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dual Color Split Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                  {aiScore > 0 && (
                    <div
                      style={{ width: `${aiScore}%` }}
                      className="bg-purple-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                      title={`Copied from AI: ${aiScore}%`}
                    >
                      {aiScore >= 12 ? `${aiScore}% AI` : ''}
                    </div>
                  )}
                  {humanScore > 0 && (
                    <div
                      style={{ width: `${humanScore}%` }}
                      className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                      title={`Human Content: ${humanScore}%`}
                    >
                      {humanScore >= 12 ? `${humanScore}% Human` : ''}
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[11px] font-medium text-slate-600 px-0.5">
                  <span className="text-purple-700 font-semibold">
                    ● Copied from AI: {aiScore}% ({aiFlaggedCount} sentences)
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    ● Human Authored: {humanScore}% ({humanSentencesCount} sentences)
                  </span>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Main Analysis Display: Text with Matched Portions & Reference Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Submitted Text with Matched Portions (8 of 12) */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Submitted Text with Matched Portions
              </h3>
              <span className="text-xs text-slate-700">
                Click any highlighted passage to inspect source attribution
              </span>
            </div>

            <HighlightedText
              matches={analysis.matches}
              fullText={analysis.submittedText}
              onSelectSource={(url) => setSelectedSourceUrl(url || null)}
            />
          </div>
        </div>

        {/* Right Column: Reference Sources (4 of 12) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Reference Sources ({analysis.sources.length})
              </h3>
              <span className="text-[11px] text-slate-700">Wikipedia & Corpus</span>
            </div>

            {analysis.sources.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">No Matched Sources Found</p>
                <p className="text-[11px] text-slate-700 mt-1">
                  The document has passed with 100% originality based on available reference indexes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysis.sources.map((source, idx) => (
                  <SourceCard
                    key={source.id || idx}
                    source={source}
                    index={idx}
                    isSelected={selectedSourceUrl === source.sourceUrl}
                    onSelect={() => setSelectedSourceUrl(source.sourceUrl)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Algorithm & Methodology Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-1">
              Methodology & Scoring Math
            </span>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Similarity is determined through 3-gram & 4-gram shingle comparison alongside TF-IDF cosine distance. Red indicators designate verbatim or near-verbatim overlap (&gt;65%), while amber designates paraphrased sentence structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
