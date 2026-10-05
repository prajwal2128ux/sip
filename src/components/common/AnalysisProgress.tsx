/**
 * AnalysisProgress Component - Live Plagiarism Checking Progress
 */

import React from 'react';
import { CheckCircle2, Loader2, Sparkles, Database, FileText, Cpu, Search } from 'lucide-react';

interface AnalysisProgressProps {
  currentStep: number;
  stepMessage: string;
  progressPercent: number;
  onCancel?: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Text Preprocessing & Normalization',
    desc: 'Normalizing input text, removing punctuation noise, and segmenting sentences',
    icon: Cpu
  },
  {
    id: 2,
    title: 'Vocabulary & N-Gram Shingling',
    desc: 'Building 3-gram and 4-gram shingle sets for phrase-level sequence comparison',
    icon: Sparkles
  },
  {
    id: 3,
    title: 'Reference Content Search',
    desc: 'Querying Wikipedia API & academic corpus for relevant benchmark documents',
    icon: Search
  },
  {
    id: 4,
    title: 'TF-IDF Matrix & Cosine Similarity',
    desc: 'Computing term weights, inverse document frequencies, and vector cosine angle',
    icon: Database
  },
  {
    id: 5,
    title: 'Synthesizing Plagiarism Report',
    desc: 'Highlighting matched spans, ranking reference sources, and computing originality score',
    icon: FileText
  }
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  currentStep,
  stepMessage,
  progressPercent,
  onCancel
}) => {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Central Progress Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-4 ring-8 ring-blue-50/50">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Analyzing Document for Plagiarism
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Checking submitted text against open academic literature and Wikipedia reference databases.
          </p>

          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span className="truncate pr-2">{stepMessage}</span>
              <span className="tabular-nums text-blue-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step-by-step Execution Checklist */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Execution Pipeline
          </div>

          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id || progressPercent === 100;
            const isCurrent = currentStep === step.id && progressPercent < 100;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3.5 p-3 rounded-lg border transition-colors ${
                  isCurrent
                    ? 'border-blue-200 bg-blue-50/40'
                    : isCompleted
                    ? 'border-slate-100 bg-slate-50/50'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-mono">
                      {step.id}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? 'text-blue-900'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {step.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-medium text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <div className="mt-8 text-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              Cancel Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
