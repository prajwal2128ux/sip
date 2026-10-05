/**
 * ReportsPage Component - Library of all generated Plagiarism Reports
 */

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Search,
  ExternalLink,
  Calendar,
  Eye,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { generateAndDownloadPdf } from '../../services/pdfExport';
import { PageRoute, PlagiarismReport } from '../../types';

interface ReportsPageProps {
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PlagiarismReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReports = () => {
    if (!user) return;
    const list = dbService.getReports(user.id);
    setReports(list);
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const filteredReports = reports.filter((r) => {
    const title = r.reportData.analysis.title.toLowerCase();
    const code = r.reportCode.toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q) || code.includes(q);
  });

  const handleDownload = (report: PlagiarismReport) => {
    generateAndDownloadPdf(report, user);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Reports Archive</span>
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Formal plagiarism and originality certificates generated for your submitted analyses
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('checker')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Check</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by document title or Report ID (e.g. PLC-2026)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No reports found</p>
            <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto">
              Run a plagiarism check to generate downloadable academic certificates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Date Generated</th>
                  <th className="py-3 px-4">Similarity %</th>
                  <th className="py-3 px-4">Originality %</th>
                  <th className="py-3 px-4">Sources</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const analysis = report.reportData.analysis;
                  const isHigh = analysis.similarityPercentage > 35;
                  const isModerate = analysis.similarityPercentage > 15 && analysis.similarityPercentage <= 35;

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {report.reportCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                          {analysis.title}
                        </div>
                        <div className="text-[11px] text-slate-700">
                          {analysis.wordCount} words
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold tabular-nums ${
                            isHigh
                              ? 'text-rose-600'
                              : isModerate
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {analysis.similarityPercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-emerald-600">
                        {analysis.originalityPercentage}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {report.reportData.sources.length} sources
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('detailed-report', analysis.id)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(report)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
