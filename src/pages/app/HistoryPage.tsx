/**
 * HistoryPage Component - Searchable History of Plagiarism Checks
 */

import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Eye,
  FileText,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { Analysis, PageRoute } from '../../types';

interface HistoryPageProps {
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = () => {
    if (!user) return;
    const list = dbService.getAnalyses(user.id);
    setAnalyses(list);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this analysis from your history? Associated reports will also be removed.')) {
      dbService.deleteAnalysis(id);
      loadHistory();
    }
  };

  const filtered = analyses.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.submittedText.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Analysis History</span>
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Audit trail of all plagiarism checks executed on your account
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

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by document title or text keywords..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No checks match your search</p>
            <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto">
              Try adjusting your query or perform a new plagiarism analysis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Words</th>
                  <th className="py-3 px-4">Similarity %</th>
                  <th className="py-3 px-4">Originality %</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isHigh = item.similarityPercentage > 35;
                  const isModerate = item.similarityPercentage > 15 && item.similarityPercentage <= 35;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-700 line-clamp-1 max-w-xs mt-0.5">
                          "{item.submittedText.slice(0, 50)}..."
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {item.wordCount}
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
                          {item.similarityPercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-emerald-600">
                        {item.originalityPercentage}%
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            isHigh
                              ? 'text-rose-700 bg-rose-50 border-rose-200'
                              : isModerate
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {item.riskLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('result', item.id)}
                          title="Open Result"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline text-[11px] font-medium">Result</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('detailed-report', item.id)}
                          title="Open Detailed Report"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline text-[11px] font-medium">Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Delete from History"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
