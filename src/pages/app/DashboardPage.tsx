/**
 * DashboardPage Component - Academic SaaS Overview
 * Displays real database-driven statistics and recent checks table.
 */

import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  Database,
  Trash2,
  Eye,
  Plus
} from 'lucide-react';
import { ScoreCard } from '../../components/common/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { Analysis, DashboardStats, PageRoute } from '../../types';

interface DashboardPageProps {
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChecks, setRecentChecks] = useState<Analysis[]>([]);

  const loadData = () => {
    if (!user) return;
    const computedStats = dbService.getDashboardStats(user.id);
    const checks = dbService.getAnalyses(user.id);
    setStats(computedStats);
    setRecentChecks(checks.slice(0, 8));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this plagiarism check and its associated report?')) {
      dbService.deleteAnalysis(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Academic Plagiarism Dashboard
          </h2>
          <p className="text-xs text-slate-700 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> · {user?.role} ({user?.institution})
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('checker')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Plagiarism Check</span>
        </button>
      </div>

      {/* Real Database Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          label="Total Checks"
          value={stats?.totalChecks ?? 0}
          subtext="Executed database analyses"
          icon={FileSearch}
          variant="blue"
        />

        <ScoreCard
          label="Average Similarity"
          value={`${stats?.averageSimilarity ?? 0}%`}
          subtext="Mean content overlap score"
          icon={TrendingUp}
          variant={
            (stats?.averageSimilarity ?? 0) > 35
              ? 'rose'
              : (stats?.averageSimilarity ?? 0) > 15
              ? 'amber'
              : 'emerald'
          }
        />

        <ScoreCard
          label="Reports Generated"
          value={stats?.reportsGenerated ?? 0}
          subtext="Certified academic reports"
          icon={FileText}
          variant="neutral"
        />

        <ScoreCard
          label="Documents / Text Checked"
          value={stats?.documentsChecked ?? 0}
          subtext="Submitted academic texts"
          icon={Database}
          variant="neutral"
        />
      </div>

      {/* Reference Source Status Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-blue-950 block">
              Reference Content Database: Wikipedia & Open Academic Index
            </span>
            <p className="text-slate-700 text-[11px]">
              Submissions are compared against real Wikipedia articles and discipline-specific literature using TF-IDF and n-gram shingling.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('checker')}
          className="text-blue-700 hover:text-blue-900 font-semibold underline text-xs shrink-0 self-start sm:self-center"
        >
          Run similarity check →
        </button>
      </div>

      {/* Recent Plagiarism Checks Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Plagiarism Checks
            </h3>
            <p className="text-xs text-slate-700 mt-0.5">
              History of all submitted documents and their similarity percentages
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentChecks.length === 0 ? (
          <div className="p-12 text-center">
            <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No plagiarism checks recorded yet</p>
            <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto">
              Start your first text plagiarism check to view similarity scores, matched sources, and certificates.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              Analyze Text Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Text / Document</th>
                  <th scope="col" className="py-3 px-4">Date Analyzed</th>
                  <th scope="col" className="py-3 px-4">Word Count</th>
                  <th scope="col" className="py-3 px-4">Similarity %</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentChecks.map((item) => {
                  const isHigh = item.similarityPercentage > 35;
                  const isModerate = item.similarityPercentage > 15 && item.similarityPercentage <= 35;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-700 line-clamp-1 max-w-xs mt-0.5">
                          "{item.submittedText.slice(0, 65)}..."
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {item.wordCount} words
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold tabular-nums text-sm ${
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
                          {item.riskLevel === 'HIGH' && <AlertTriangle className="w-3 h-3" />}
                          {item.riskLevel === 'LOW' && <CheckCircle className="w-3 h-3" />}
                          {item.riskLevel === 'HIGH'
                            ? 'High Plagiarism'
                            : item.riskLevel === 'MODERATE'
                            ? 'Moderate Risk'
                            : 'Original / Low Risk'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => onNavigate('result', item.id)}
                          title="View Analysis Results"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline text-[11px] font-medium">Result</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('detailed-report', item.id)}
                          title="Open Full Report"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline text-[11px] font-medium">Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Delete Analysis"
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
