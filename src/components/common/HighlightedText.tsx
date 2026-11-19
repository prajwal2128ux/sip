/**
 * HighlightedText Component - Interactive Plagiarism Highlighting
 * Visualizes matched portions inside submitted text with clear visual semantics.
 * - Red/Rose: Verbatim / High similarity match
 * - Amber: Paraphrased / Moderate similarity match
 * - Green / Neutral: Original unique content
 */

import React, { useState } from 'react';
import { ExternalLink, Info, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TextMatchSpan } from '../../types';

interface HighlightedTextProps {
  matches: TextMatchSpan[];
  fullText: string;
  onSelectSource?: (sourceUrl?: string) => void;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  matches,
  onSelectSource
}) => {
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'matches' | 'high' | 'ai'>('all');

  const selectedSpan = matches.find((m) => m.id === activeSpanId);

  // Statistics
  const verbatimCount = matches.filter((m) => m.matchType === 'VERBATIM').length;
  const paraphraseCount = matches.filter((m) => m.matchType === 'PARAPHRASE').length;
  const originalCount = matches.filter((m) => m.matchType === 'ORIGINAL').length;
  const aiCount = matches.filter((m) => m.isAiPattern).length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      {/* Top Controls & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-4">
        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Sentences ({matches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('matches')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'matches'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Matches Only ({verbatimCount + paraphraseCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('high')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'high'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            High Risk ({verbatimCount})
          </button>
          {aiCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('ai')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'ai'
                  ? 'bg-purple-100 text-purple-900 font-bold shadow-xs'
                  : 'text-purple-700 hover:text-purple-900'
              }`}
            >
              Copied from AI ({aiCount})
            </button>
          )}
        </div>

        {/* Clean Semantic Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-200 border border-rose-400 inline-block" />
            <span className="text-slate-700 font-medium">Verbatim ({verbatimCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-200 border border-amber-400 inline-block" />
            <span className="text-slate-700 font-medium">Paraphrase ({paraphraseCount})</span>
          </div>
          {aiCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-purple-200 border border-purple-500 inline-block" />
              <span className="text-purple-800 font-semibold">AI Generated ({aiCount})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-400 inline-block" />
            <span className="text-slate-700 font-medium">Human / Original ({originalCount})</span>
          </div>
        </div>
      </div>

      {/* Main Text Content */}
      <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm md:text-base font-sans p-2">
        {matches.map((span) => {
          // Filter logic
          if (filter === 'matches' && span.matchType === 'ORIGINAL') return null;
          if (filter === 'high' && span.matchType !== 'VERBATIM') return null;
          if (filter === 'ai' && !span.isAiPattern) return null;

          const isSelected = activeSpanId === span.id;

          if (span.matchType === 'VERBATIM') {
            return (
              <mark
                key={span.id}
                onClick={() => setActiveSpanId(isSelected ? null : span.id)}
                className={`cursor-pointer rounded-xs px-1 py-0.5 transition-all inline ${
                  isSelected
                    ? 'bg-rose-300 text-rose-950 font-medium ring-2 ring-rose-500'
                    : 'bg-rose-100 hover:bg-rose-200 text-slate-900 border-b-2 border-rose-400'
                }`}
                title={`Verbatim match (${span.similarityScore}%). Click to inspect.`}
              >
                {span.text}{' '}
              </mark>
            );
          }

          if (span.matchType === 'PARAPHRASE') {
            return (
              <mark
                key={span.id}
                onClick={() => setActiveSpanId(isSelected ? null : span.id)}
                className={`cursor-pointer rounded-xs px-1 py-0.5 transition-all inline ${
                  isSelected
                    ? 'bg-amber-300 text-amber-950 font-medium ring-2 ring-amber-500'
                    : 'bg-amber-100 hover:bg-amber-200 text-slate-900 border-b-2 border-amber-400'
                }`}
                title={`Paraphrased match (${span.similarityScore}%). Click to inspect.`}
              >
                {span.text}{' '}
              </mark>
            );
          }

          // If flagged as AI pattern and in AI filter or general view
          if (span.isAiPattern && filter === 'ai') {
            return (
              <mark
                key={span.id}
                onClick={() => setActiveSpanId(isSelected ? null : span.id)}
                className={`cursor-pointer rounded-xs px-1 py-0.5 transition-all inline ${
                  isSelected
                    ? 'bg-purple-300 text-purple-950 font-medium ring-2 ring-purple-600'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-b-2 border-purple-500'
                }`}
                title={`AI / ChatGPT Pattern (${span.aiScore ?? 85}% AI). Click to inspect.`}
              >
                {span.text}{' '}
              </mark>
            );
          }

          if (span.isAiPattern && filter === 'all') {
            return (
              <span
                key={span.id}
                onClick={() => setActiveSpanId(isSelected ? null : span.id)}
                className={`cursor-pointer rounded-xs px-0.5 transition-all inline ${
                  isSelected
                    ? 'bg-purple-200 text-purple-950 font-medium ring-2 ring-purple-400'
                    : 'hover:bg-purple-50 decoration-purple-400 decoration-wavy underline decoration-1 text-slate-800'
                }`}
                title={`AI Pattern Detected (${span.aiScore ?? 85}% AI). Click to inspect.`}
              >
                {span.text}{' '}
              </span>
            );
          }

          return (
            <span key={span.id} className="text-slate-800 inline">
              {span.text}{' '}
            </span>
          );
        })}
      </div>

      {/* Interactive Detail Inspector Drawer for Selected Span */}
      {selectedSpan && (
        <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-300 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {selectedSpan.matchType === 'VERBATIM' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                  <AlertTriangle className="w-3 h-3" /> Verbatim Match ({selectedSpan.similarityScore}%)
                </span>
              ) : selectedSpan.matchType === 'PARAPHRASE' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  <Info className="w-3 h-3" /> Paraphrased Match ({selectedSpan.similarityScore}%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Original from Reference Sources
                </span>
              )}

              {selectedSpan.isAiPattern ? (
                <span className="flex items-center gap-1 text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                  Copied from AI: {selectedSpan.aiScore ?? 85}% (Human: {Math.max(0, 100 - (selectedSpan.aiScore ?? 85))}%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Human Authored: {Math.max(0, 100 - (selectedSpan.aiScore ?? 0))}%
                </span>
              )}

              <span className="text-xs text-slate-700">Sentence #{selectedSpan.sentenceIndex + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSpanId(null)}
              className="text-xs text-slate-700 hover:text-slate-800 font-medium"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Submitted Sentence:</span>
              <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-800 font-sans">
                "{selectedSpan.text}"
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">Attributed Reference Source:</span>
                {selectedSpan.sourceUrl && (
                  <a
                    href={selectedSpan.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                    onClick={() => onSelectSource?.(selectedSpan.sourceUrl)}
                  >
                    View Source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 font-mono">
                {selectedSpan.matchedSourceExcerpt ? `"${selectedSpan.matchedSourceExcerpt}"` : 'Source reference text'}
              </p>
              {selectedSpan.sourceName && (
                <p className="text-[11px] text-slate-700 mt-1 font-sans">
                  Origin: <span className="font-medium text-slate-700">{selectedSpan.sourceName}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
