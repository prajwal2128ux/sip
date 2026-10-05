/**
 * SourceCard Component - Displays Reference Source Information
 */

import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { AnalysisSource } from '../../types';

interface SourceCardProps {
  source: AnalysisSource;
  index: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  index,
  onSelect,
  isSelected = false
}) => {
  const [expanded, setExpanded] = useState(false);

  // Match severity indicator
  const getBadgeStyle = (pct: number) => {
    if (pct >= 40) return 'text-rose-700 bg-rose-50 border-rose-200';
    if (pct >= 15) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-4 bg-white transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                {source.sourceName}
              </h4>
            </div>
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5 break-all"
            >
              <span>{source.sourceUrl.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getBadgeStyle(source.matchPercentage)}`}>
            {source.matchPercentage}% match
          </span>
          <span className="text-[11px] text-slate-700 mt-1">
            {source.matchedPhrasesCount} passage{source.matchedPhrasesCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Matched excerpt */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
          <span className="flex items-center gap-1 font-medium">
            <BookOpen className="w-3 h-3" /> Matched Reference Excerpt:
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-slate-700 hover:text-slate-800 flex items-center gap-0.5"
          >
            {expanded ? 'Collapse' : 'Expand'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <p className={`text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono leading-relaxed ${
          expanded ? '' : 'line-clamp-2'
        }`}>
          "{source.matchedText}"
        </p>
      </div>
    </div>
  );
};
