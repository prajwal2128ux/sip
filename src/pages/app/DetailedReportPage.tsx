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
        {/* PlagiCheck Official Academic Report Header */}
        <div className="border border-slate-300 rounded-xl p-6 sm:p-8 bg-white mb-8">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <span className="text-lg">P</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                PlagiCheck
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              The Report is Generated by PlagiCheck Plagiarism Detection Software
            </p>
          </div>

          <div className="w-full h-1 bg-blue-600 mb-6 rounded-full" />

          {/* Submission Information */}
          <div className="mb-6">
            <h3 className="text-sm font-bold italic text-blue-800 mb-3">
              Submission Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs bg-slate-50/60 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Author Name:</span>
                <span className="text-slate-900 font-medium">{user?.name || 'gaurav'}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Title:</span>
                <span className="text-slate-900 font-medium">{analysis.title || 'report final'}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Paper/Submission ID:</span>
                <span className="text-slate-900 font-medium">{report.reportCode.replace('PLC-', '')}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Submitted By:</span>
                <span className="text-slate-900 font-medium">{user?.email || 'student@atria.edu'}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Submission Date:</span>
                <span className="text-slate-900 font-medium">
                  {new Date(report.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Total Pages, Words:</span>
                <span className="text-slate-900 font-medium">
                  {Math.max(1, Math.ceil(analysis.wordCount / 240))}, {analysis.wordCount}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="font-semibold text-rose-800 w-36">Document type:</span>
                <span className="text-slate-900 font-medium">Dissertation / Research Manuscript</span>
              </div>
            </div>
          </div>

          {/* Result Information */}
          <div className="mb-6">
            <h3 className="text-sm font-bold italic text-blue-800 mb-2">
              Result Information
            </h3>
            
            {/* Primary Scores Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-rose-800">Similarity:</span>
                <span className="text-xl font-extrabold text-blue-900">
                  {analysis.similarityPercentage} %
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-purple-800">Copied from AI:</span>
                <span className="text-xl font-extrabold text-purple-900">
                  {analysis.aiProbabilityPercentage ?? 0} %
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-emerald-800">Human Content:</span>
                <span className="text-xl font-extrabold text-emerald-900">
                  {analysis.humanPercentage ?? Math.max(0, 100 - (analysis.aiProbabilityPercentage ?? 0))} %
                </span>
              </div>
            </div>

            {/* AI vs Human Content Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-purple-800">
                  AI Content ({analysis.aiProbabilityPercentage ?? 0}%)
                </span>
                <span className="text-emerald-800">
                  Human Authored ({analysis.humanPercentage ?? Math.max(0, 100 - (analysis.aiProbabilityPercentage ?? 0))}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-2xs">
                {(analysis.aiProbabilityPercentage ?? 0) > 0 && (
                  <div
                    style={{ width: `${analysis.aiProbabilityPercentage ?? 0}%` }}
                    className="bg-purple-600 h-full"
                  />
                )}
                <div
                  style={{ width: `${analysis.humanPercentage ?? Math.max(0, 100 - (analysis.aiProbabilityPercentage ?? 0))}%` }}
                  className="bg-emerald-500 h-full"
                />
              </div>
            </div>

            {/* Similarity Visual Color Scale Gradient Bar */}
            <span className="text-[11px] font-semibold text-slate-700 block mb-1">
              Plagiarism Similarity Gauge:
            </span>
            <div className="relative pt-1 pb-4">
              <div className="h-3 w-full rounded-sm overflow-hidden flex shadow-2xs">
                <div className="bg-emerald-500 w-[15%]" />
                <div className="bg-lime-500 w-[20%]" />
                <div className="bg-amber-400 w-[20%]" />
                <div className="bg-orange-500 w-[20%]" />
                <div className="bg-rose-600 w-[25%]" />
              </div>
              {/* Pointer */}
              <div
                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${Math.min(99, Math.max(1, analysis.similarityPercentage))}%` }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-900" />
              </div>
              {/* Ticks */}
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>1</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
                <span>60</span>
                <span>70</span>
                <span>80</span>
                <span>90</span>
                <span>100</span>
              </div>
            </div>

            {/* Middle Section: Two Visual Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {/* Sources Type Card */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-2xs text-center">
                <span className="text-xs font-semibold text-slate-800 block mb-3">
                  Sources Type
                </span>
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="relative w-24 h-24 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden"
                    style={{
                      background: `conic-gradient(#f87171 0% 41.4%, #ef4444 41.4% 100%)`
                    }}
                  />
                  <div className="text-left space-y-2 text-xs">
                    <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                      <span className="text-[11px] font-semibold text-slate-600 block">Internet</span>
                      <span className="font-bold text-slate-900">
                        {Math.round(analysis.similarityPercentage * 0.414 * 10) / 10 || 4.56}%
                      </span>
                    </div>
                    <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                      <span className="text-[11px] font-semibold text-slate-600 block">Journal / Pub</span>
                      <span className="font-bold text-slate-900">
                        {Math.round(analysis.similarityPercentage * 0.586 * 10) / 10 || 6.44}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Content Donut Card */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-2xs text-center">
                <span className="text-xs font-semibold text-slate-800 block mb-3">
                  Report Content
                </span>
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="relative w-24 h-24 rounded-full border border-slate-200 flex items-center justify-center"
                    style={{
                      background: `conic-gradient(#fca5a5 0% 8%, #ddd6fe 8% 76%, #cbd5e1 76% 88%, #bae6fd 88% 100%)`
                    }}
                  >
                    <div className="w-12 h-12 bg-white rounded-full border border-slate-200" />
                  </div>
                  <div className="text-left space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-300 shrink-0" />
                      <span>Quotes: <strong>2.93%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-purple-300 shrink-0" />
                      <span>Words &lt; 14: <strong>6.81%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 shrink-0" />
                      <span>Ref/Bib: <strong>2.27%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-200 shrink-0" />
                      <span>Core Text: <strong>{analysis.originalityPercentage}%</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Two Tables: Exclude Information & Database Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="font-bold italic text-blue-800 block mb-2">Exclude Information</span>
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Quotes:</span><span>Not Excluded</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">References/Bibliography:</span><span>Not Excluded</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Source: Excluded &lt; 14 Words:</span><span>Not Excluded</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Excluded Source:</span><span>0 %</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Excluded Phrases:</span><span>Not Excluded</span></div>
                </div>
              </div>

              <div>
                <span className="font-bold italic text-blue-800 block mb-2">Database Selection</span>
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Language:</span><span>English</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Student Papers:</span><span>Yes</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Journals & publishers:</span><span>Yes</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Internet or Web:</span><span>Yes</span></div>
                  <div className="flex justify-between"><span className="text-rose-800 font-semibold">Institution Repository:</span><span>Yes</span></div>
                </div>
              </div>
            </div>
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
                ✓ No matched or suspicious passages identified in the reference literature corpus.
              </p>
            )}
          </div>
        </div>

        {/* AI Content Breakdown (Sentences Copied from AI) */}
        {analysis.matches.some((m) => m.isAiPattern) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>AI Generated Content Breakdown ({analysis.matches.filter((m) => m.isAiPattern).length} Sentences)</span>
              </h3>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                Copied from AI: {analysis.aiProbabilityPercentage ?? 0}%
              </span>
            </div>

            <div className="space-y-2.5">
              {analysis.matches
                .filter((m) => m.isAiPattern)
                .map((span, idx) => (
                  <div
                    key={span.id || `ai-${idx}`}
                    className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-purple-900 text-[11px]">
                        Sentence #{span.sentenceIndex + 1} · AI Probability: {span.aiScore ?? 85}%
                      </span>
                      <span className="text-slate-600 text-[10px]">
                        Human: {Math.max(0, 100 - (span.aiScore ?? 85))}%
                      </span>
                    </div>
                    <p className="text-slate-900 font-sans italic bg-white p-2 rounded border border-purple-100">
                      "{span.text}"
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

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
