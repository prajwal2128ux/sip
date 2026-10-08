/**
 * PlagiCheck - Shared Types and Interfaces
 * Matches MySQL Schema and NLP Similarity Engine Output
 */

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  institution: string;
  createdAt: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type MatchType = 'VERBATIM' | 'PARAPHRASE' | 'ORIGINAL';

export interface TextMatchSpan {
  id: string;
  sentenceIndex: number;
  text: string;
  cleanText: string;
  startIndex: number;
  endIndex: number;
  similarityScore: number; // 0 to 100
  matchType: MatchType;
  matchedSourceIndex?: number;
  sourceName?: string;
  sourceUrl?: string;
  matchedSourceExcerpt?: string;
  isAiPattern?: boolean;
}

export interface AnalysisSource {
  id: number;
  analysisId: number;
  sourceName: string;
  sourceUrl: string;
  matchedText: string;
  matchPercentage: number;
  matchedPhrasesCount: number;
  searchEngine?: string; // 'Wikipedia Live API' | 'DuckDuckGo Search' | 'Crossref Academic DOI' | 'Open Library'
}

export interface Analysis {
  id: number;
  userId: number;
  title: string;
  submittedText: string;
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  similarityPercentage: number;
  originalityPercentage: number;
  aiProbabilityPercentage: number; // 0 to 100% AI/ChatGPT detection
  aiVerdict: string; // e.g. "High AI Probability (Likely ChatGPT Generated)"
  riskLevel: RiskLevel;
  processingTimeMs: number;
  createdAt: string;
  sources: AnalysisSource[];
  matches: TextMatchSpan[];
}

export interface PlagiarismReport {
  id: number;
  analysisId: number;
  reportCode: string;
  summaryText: string;
  reportData: {
    analysis: Analysis;
    sources: AnalysisSource[];
    matches: TextMatchSpan[];
    findingsSummary: string;
    methodology: string;
    verbatimCount: number;
    paraphraseCount: number;
    originalCount: number;
  };
  createdAt: string;
}

export interface DashboardStats {
  totalChecks: number;
  averageSimilarity: number;
  reportsGenerated: number;
  documentsChecked: number;
  recentChecks: Analysis[];
}

export interface NLPAnalysisResult {
  similarityPercentage: number;
  originalityPercentage: number;
  aiProbabilityPercentage: number;
  aiVerdict: string;
  riskLevel: RiskLevel;
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  processingTimeMs: number;
  sources: AnalysisSource[];
  matches: TextMatchSpan[];
  findingsSummary: string;
  methodology: string;
}

export type PageRoute =
  | 'home'
  | 'features'
  | 'pricing'
  | 'about'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'checker'
  | 'analysis-progress'
  | 'result'
  | 'detailed-report'
  | 'reports'
  | 'history'
  | 'profile'
  | 'subscription';
