/**
 * DetailedReportPage Component - Formal Academic Plagiarism Certification & Report
 *
 * Implements:
 * - PlagiCheck logo/name & official document styling
 * - Analysis date & Report ID
 * - Word & character counts
 * - Similarity percentage & Originality percentage
 * - Summary of findings
 * - Reference sources table with match percentages
 * - Matched content sentence-by-sentence analysis
 * - "Download Report" (PDF export via jsPDF) & Print
 */

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  User,
  School,
  ExternalLink,
  BookOpen,
  Cpu,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { generateAndDownloadPdf } from '../../services/pdfExport';
import { PageRoute, PlagiarismReport } from '../../types';

interface DetailedReportPageProps {
  analysisId?: number;
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

export const DetailedReportPage: React.FC<DetailedReportPageProps> = ({
  analysisId,
  onNavigate
}) => {
  const { user } = useAuth();
  const [report, setReport] = useState<PlagiarismReport | null>(null);

  useEffect(() => {
    if (analysisId) {
      const found = dbService.getReportByAnalysisId(analysisId);
      if (found) {
        setReport(found);
        return;
      }
    }
    // Fallback to most recent report
    const list = dbService.getReports(user?.id);
    if (list.length > 0) {
      setReport(list[0]);
    }
  }, [analysisId, user]);

  if (!report) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Report Not Found</h3>
        <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto">
          No generated report found for this analysis ID.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const analysis = report.reportData.analysis;
  const isHighRisk = analysis.similarityPercentage > 35;
  const isModerateRisk = analysis.similarityPercentage > 15 && analysis.similarityPercentage <= 35;

  const handleDownload = () => {
    generateAndDownloadPdf(report, user);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <button
          type="button"
          onClick={() => onNavigate('result', analysis.id)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Results</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Official Academic Certificate / Printable Sheet */}
      <div className="bg-white border border-slate-300 rounded-2xl p-8 sm:p-10 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Certificate Header Banner */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                  PLAGICHECK
                </span>
                <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                  Academic Report
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                Originality & Content Similarity Verification Certificate
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-mono font-bold text-slate-900">
              REPORT ID: {report.reportCode}
            </div>
            <div className="text-xs text-slate-700 mt-0.5">
              Generated: {new Date(report.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {/* Document & Author Metadata Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-8 text-xs">
          <div>
            <span className="text-slate-700 font-semibold block mb-0.5">DOCUMENT TITLE</span>
            <span className="font-bold text-slate-900 text-sm">{analysis.title || 'Untitled Document'}</span>
          </div>

          <div>
            <span className="text-slate-700 font-semibold block mb-0.5">AUTHOR / SUBMITTER</span>
            <span className="font-semibold text-slate-900">
              {user?.name || 'Dr. Alex Morgan'} · {user?.role || 'Faculty'}
            </span>
            <p className="text-[11px] text-slate-700">{user?.institution || 'Academic Institution'}</p>
          </div>

          <div>
            <span className="text-slate-700 font-semibold block mb-0.5">ANALYSIS PIPELINE</span>
            <span className="font-medium text-slate-800">
              {report.reportData.methodology || 'TF-IDF Vector Space & N-Gram Shingling'}
            </span>
          </div>

          <div>
            <span className="text-slate-700 font-semibold block mb-0.5">REFERENCE CORPUS</span>
            <span className="font-medium text-slate-800">
              Live Wikipedia API + Crossref Academic + DuckDuckGo + Open Library
            </span>
          </div>
        </div>

        {/* Key Metrics Scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Similarity Score
            </span>
            <span
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                isHighRisk
                  ? 'text-rose-600'
                  : isModerateRisk
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {analysis.similarityPercentage}%
            </span>
            <span className="text-[10px] text-slate-700 block mt-1">
              {analysis.riskLevel} Plagiarism Risk
            </span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-center">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Originality Score
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-emerald-700">
              {analysis.originalityPercentage}%
            </span>
            <span className="text-[10px] text-emerald-700 block mt-1">
              Verified Unique Text
            </span>
          </div>

          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 text-center">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              AI / ChatGPT Score
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-purple-700">
              {analysis.aiProbabilityPercentage ?? 0}%
            </span>
            <span className="text-[10px] text-purple-800 block mt-1 truncate">
              {analysis.similarityPercentage >= 40 && (analysis.aiProbabilityPercentage || 0) < 40
                ? 'Plagiarized Source'
                : analysis.aiVerdict
                ? analysis.aiVerdict.split(' ')[0] + ' ' + analysis.aiVerdict.split(' ')[1]
                : 'AI Assessed'}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Words Analyzed
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900">
              {analysis.wordCount}
            </span>
            <span className="text-[10px] text-slate-700 block mt-1">
              {analysis.characterCount} characters
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-center">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Sources Matched
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-blue-700">
              {analysis.sources.length}
            </span>
            <span className="text-[10px] text-slate-700 block mt-1">
              Indexed publications
            </span>
          </div>
        </div>

        {/* Executive Summary of Findings */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Summary of Findings</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
            {report.summaryText}
          </div>
        </div>

        {/* Identified Reference Sources Table */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Identified Reference Sources ({analysis.sources.length})
          </h3>

          {analysis.sources.length === 0 ? (
            <p className="text-xs text-slate-700 italic">
              No matching reference sources identified above minimum similarity threshold.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Search Engine</th>
                    <th className="py-2.5 px-3">Source Title</th>
                    <th className="py-2.5 px-3">Match %</th>
                    <th className="py-2.5 px-3">Phrases</th>
                    <th className="py-2.5 px-3">Reference URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.sources.map((src, i) => (
                    <tr key={src.id || i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                          {src.searchEngine || 'Wikipedia Live API'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{src.sourceName}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-600">{src.matchPercentage}%</td>
                      <td className="py-2.5 px-3 text-slate-600">{src.matchedPhrasesCount}</td>
                      <td className="py-2.5 px-3">
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span className="truncate max-w-[180px]">{src.sourceUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Matched Passages Detailed Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Matched Sentences Breakdown
          </h3>

          <div className="space-y-3">
            {analysis.matches
              .filter((m) => m.matchType !== 'ORIGINAL')
              .map((span, idx) => (
                <div
                  key={span.id || idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        span.matchType === 'VERBATIM'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {span.matchType} ({span.similarityScore}% Overlap)
                    </span>
                    {span.sourceName && (
                      <span className="text-slate-700 text-[11px]">
                        Matched Source: <strong className="text-slate-700">{span.sourceName}</strong>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 font-sans italic bg-white p-2.5 rounded border border-slate-200">
                    "{span.text}"
                  </p>
                  {span.matchedSourceExcerpt && (
                    <p className="text-slate-700 font-mono text-[11px] mt-1.5 pl-2 border-l-2 border-slate-300">
                      Ref passage: "{span.matchedSourceExcerpt}"
                    </p>
                  )}
                </div>
              ))}

            {analysis.matches.filter((m) => m.matchType !== 'ORIGINAL').length === 0 && (
              <p className="text-xs text-emerald-700 font-semibold p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                ✓ No matched or suspicious passages identified in the submitted text.
              </p>
            )}
          </div>
        </div>

        {/* Certificate Disclaimer Footer */}
        <div className="pt-6 border-t border-slate-200 text-center text-[11px] text-slate-700">
          <p>
            PlagiCheck Open Source Academic Plagiarism Detection System · Algorithms: TF-IDF Vector Space Analysis & N-Gram Shingling
          </p>
          <p className="mt-0.5">
            This report represents mathematical content similarity against available public reference databases and does not constitute a legal copyright determination.
          </p>
        </div>
      </div>
    </div>
  );
};
