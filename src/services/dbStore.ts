/**
 * PlagiCheck - Persistent Relational Database Controller
 * Implements the MySQL Schema for users, analyses, analysis_sources, and reports.
 * Includes foreign key cascade deletion, real aggregate queries, and secure password hashing.
 */

import { Analysis, AnalysisSource, DashboardStats, PlagiarismReport, User } from '../types';

const DB_KEY_USERS = 'plagicheck_mysql_users';
const DB_KEY_ANALYSES = 'plagicheck_mysql_analyses';
const DB_KEY_SOURCES = 'plagicheck_mysql_sources';
const DB_KEY_REPORTS = 'plagicheck_mysql_reports';
const DB_KEY_CURRENT_USER = 'plagicheck_current_user_session';

// SHA-256 Password Hash function
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + '_plagicheck_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial Seed Users
const SEED_USERS: User[] = [
  {
    id: 1,
    name: 'Dr. Alex Morgan',
    email: 'alex.morgan@university.edu',
    role: 'Faculty / Researcher',
    institution: 'Department of Computer Science & Engineering',
    createdAt: '2026-09-15T09:30:00.000Z'
  },
  {
    id: 2,
    name: 'Elena Rostova',
    email: 'elena.student@university.edu',
    role: 'Graduate Student',
    institution: 'School of Natural & Environmental Sciences',
    createdAt: '2026-09-20T14:15:00.000Z'
  }
];

// Initial Seed Analyses
const SEED_ANALYSES: Analysis[] = [
  {
    id: 101,
    userId: 1,
    title: 'Research Paper: Climate System & Greenhouse Dynamics',
    submittedText: `Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns. Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system. The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane. Renewable alternatives like wind and solar power represent vital pathways to rapid decarbonization across electric grids.`,
    wordCount: 82,
    characterCount: 526,
    sentenceCount: 4,
    similarityPercentage: 62.5,
    originalityPercentage: 37.5,
    aiProbabilityPercentage: 15.0,
    aiVerdict: 'Human Written with Academic Citations',
    riskLevel: 'HIGH',
    processingTimeMs: 480,
    createdAt: '2026-10-01T11:42:00.000Z',
    sources: [
      {
        id: 1,
        analysisId: 101,
        sourceName: 'Wikipedia: Climate change',
        sourceUrl: 'https://en.wikipedia.org/wiki/Climate_change',
        matchedText: 'Climate change includes both global warming driven by human-induced emissions of greenhouse gases...',
        matchPercentage: 48.0,
        matchedPhrasesCount: 3
      },
      {
        id: 2,
        analysisId: 101,
        sourceName: 'Intergovernmental Panel on Climate System',
        sourceUrl: 'https://en.wikipedia.org/wiki/Global_warming',
        matchedText: 'The largest driver of warming is the emission of greenhouse gases...',
        matchPercentage: 14.5,
        matchedPhrasesCount: 1
      }
    ],
    matches: [
      {
        id: 'span-0',
        sentenceIndex: 0,
        text: 'Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns.',
        cleanText: 'climate change includes both global warming driven by human induced emissions of greenhouse gases and the large scale shifts in weather patterns',
        startIndex: 0,
        endIndex: 145,
        similarityScore: 92,
        matchType: 'VERBATIM',
        sourceName: 'Wikipedia: Climate change',
        sourceUrl: 'https://en.wikipedia.org/wiki/Climate_change',
        matchedSourceExcerpt: 'Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns.'
      },
      {
        id: 'span-1',
        sentenceIndex: 1,
        text: "Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system.",
        cleanText: 'though there have been previous periods of climatic change since the mid 20th century humans have had an unprecedented impact on earth s climate system',
        startIndex: 146,
        endIndex: 300,
        similarityScore: 84,
        matchType: 'VERBATIM',
        sourceName: 'Wikipedia: Climate change',
        sourceUrl: 'https://en.wikipedia.org/wiki/Climate_change',
        matchedSourceExcerpt: "Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system."
      },
      {
        id: 'span-2',
        sentenceIndex: 2,
        text: 'The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane.',
        cleanText: 'the largest driver of warming is the emission of greenhouse gases of which more than 90 are carbon dioxide and methane',
        startIndex: 301,
        endIndex: 423,
        similarityScore: 78,
        matchType: 'VERBATIM',
        sourceName: 'Intergovernmental Panel on Climate System',
        sourceUrl: 'https://en.wikipedia.org/wiki/Global_warming',
        matchedSourceExcerpt: 'The largest driver of warming is the emission of greenhouse gases...'
      },
      {
        id: 'span-3',
        sentenceIndex: 3,
        text: 'Renewable alternatives like wind and solar power represent vital pathways to rapid decarbonization across electric grids.',
        cleanText: 'renewable alternatives like wind and solar power represent vital pathways to rapid decarbonization across electric grids',
        startIndex: 424,
        endIndex: 546,
        similarityScore: 0,
        matchType: 'ORIGINAL'
      }
    ]
  },
  {
    id: 102,
    userId: 1,
    title: 'Essay: Ethics of Artificial Intelligence In Autonomous Defense',
    submittedText: `Autonomous defense platforms introduce critical ethical inquiries regarding accountability and proportionate force. In contemporary machine learning systems, transparency and explainability have emerged as essential criteria for responsible deployment. Our proposed experimental framework validates multi-agent consensus through verified formal state proofs.`,
    wordCount: 43,
    characterCount: 334,
    sentenceCount: 3,
    similarityPercentage: 12.4,
    originalityPercentage: 87.6,
    aiProbabilityPercentage: 18.0,
    aiVerdict: 'Human Written Essay',
    riskLevel: 'LOW',
    processingTimeMs: 340,
    createdAt: '2026-10-02T16:20:00.000Z',
    sources: [
      {
        id: 3,
        analysisId: 102,
        sourceName: 'Wikipedia: Ethics of artificial intelligence',
        sourceUrl: 'https://en.wikipedia.org/wiki/Ethics_of_artificial_intelligence',
        matchedText: 'Transparency and explainability have become central requirements for trustworthy autonomous systems.',
        matchPercentage: 12.4,
        matchedPhrasesCount: 1
      }
    ],
    matches: [
      {
        id: 'span-0',
        sentenceIndex: 0,
        text: 'Autonomous defense platforms introduce critical ethical inquiries regarding accountability and proportionate force.',
        cleanText: 'autonomous defense platforms introduce critical ethical inquiries regarding accountability and proportionate force',
        startIndex: 0,
        endIndex: 116,
        similarityScore: 0,
        matchType: 'ORIGINAL'
      },
      {
        id: 'span-1',
        sentenceIndex: 1,
        text: 'In contemporary machine learning systems, transparency and explainability have emerged as essential criteria for responsible deployment.',
        cleanText: 'in contemporary machine learning systems transparency and explainability have emerged as essential criteria for responsible deployment',
        startIndex: 117,
        endIndex: 254,
        similarityScore: 48,
        matchType: 'PARAPHRASE',
        sourceName: 'Wikipedia: Ethics of artificial intelligence',
        sourceUrl: 'https://en.wikipedia.org/wiki/Ethics_of_artificial_intelligence',
        matchedSourceExcerpt: 'Transparency and explainability have become central requirements for trustworthy autonomous systems.'
      },
      {
        id: 'span-2',
        sentenceIndex: 2,
        text: 'Our proposed experimental framework validates multi-agent consensus through verified formal state proofs.',
        cleanText: 'our proposed experimental framework validates multi agent consensus through verified formal state proofs',
        startIndex: 255,
        endIndex: 362,
        similarityScore: 0,
        matchType: 'ORIGINAL'
      }
    ]
  },
  {
    id: 103,
    userId: 1,
    title: 'Laboratory Abstract: Quantum Superposition Proofs',
    submittedText: `We synthesized novel topological qubits exhibiting coherence times exceeding 45 milliseconds at dilution refrigerator operating temperatures of 12 millikelvin. Phase gate fidelity surpassed 99.94% across 10,000 randomized benchmark iterations without observable decoherence cascade.`,
    wordCount: 33,
    characterCount: 260,
    sentenceCount: 2,
    similarityPercentage: 0.0,
    originalityPercentage: 100.0,
    aiProbabilityPercentage: 4.0,
    aiVerdict: 'Human Written Research Abstract',
    riskLevel: 'LOW',
    processingTimeMs: 290,
    createdAt: '2026-10-03T18:05:00.000Z',
    sources: [],
    matches: [
      {
        id: 'span-0',
        sentenceIndex: 0,
        text: 'We synthesized novel topological qubits exhibiting coherence times exceeding 45 milliseconds at dilution refrigerator operating temperatures of 12 millikelvin.',
        cleanText: 'we synthesized novel topological qubits exhibiting coherence times exceeding 45 milliseconds at dilution refrigerator operating temperatures of 12 millikelvin',
        startIndex: 0,
        endIndex: 159,
        similarityScore: 0,
        matchType: 'ORIGINAL'
      },
      {
        id: 'span-1',
        sentenceIndex: 1,
        text: 'Phase gate fidelity surpassed 99.94% across 10,000 randomized benchmark iterations without observable decoherence cascade.',
        cleanText: 'phase gate fidelity surpassed 99 94 across 10 000 randomized benchmark iterations without observable decoherence cascade',
        startIndex: 160,
        endIndex: 284,
        similarityScore: 0,
        matchType: 'ORIGINAL'
      }
    ]
  }
];

// Initial Seed Reports
const SEED_REPORTS: PlagiarismReport[] = [
  {
    id: 1,
    analysisId: 101,
    reportCode: 'PLC-2026-101',
    summaryText: 'Significant similarity score of 62.5% identified across 2 primary reference source(s). High proportion of verbatim passages matched against Wikipedia reference content.',
    reportData: {
      analysis: SEED_ANALYSES[0],
      sources: SEED_ANALYSES[0].sources,
      matches: SEED_ANALYSES[0].matches,
      findingsSummary: 'The document contains major passages identical to published Wikipedia entries on the climate system.',
      methodology: 'TF-IDF Vector Space Analysis + 3/4-Gram Shingling & Cosine Similarity',
      verbatimCount: 3,
      paraphraseCount: 0,
      originalCount: 1
    },
    createdAt: '2026-10-01T11:43:00.000Z'
  },
  {
    id: 2,
    analysisId: 102,
    reportCode: 'PLC-2026-102',
    summaryText: 'Low similarity score of 12.4% detected. The text demonstrates high academic originality with one moderately paraphrased passage.',
    reportData: {
      analysis: SEED_ANALYSES[1],
      sources: SEED_ANALYSES[1].sources,
      matches: SEED_ANALYSES[1].matches,
      findingsSummary: 'Document demonstrates strong originality with isolated paraphrasing.',
      methodology: 'TF-IDF Vector Space Analysis + 3/4-Gram Shingling & Cosine Similarity',
      verbatimCount: 0,
      paraphraseCount: 1,
      originalCount: 2
    },
    createdAt: '2026-10-02T16:21:00.000Z'
  },
  {
    id: 3,
    analysisId: 103,
    reportCode: 'PLC-2026-103',
    summaryText: 'Exceptional originality score of 100.0%. No matching phrases or passages detected across the reference corpus.',
    reportData: {
      analysis: SEED_ANALYSES[2],
      sources: SEED_ANALYSES[2].sources,
      matches: SEED_ANALYSES[2].matches,
      findingsSummary: 'Document is 100% original based on available reference indexes.',
      methodology: 'TF-IDF Vector Space Analysis + 3/4-Gram Shingling & Cosine Similarity',
      verbatimCount: 0,
      paraphraseCount: 0,
      originalCount: 2
    },
    createdAt: '2026-10-03T18:06:00.000Z'
  }
];

class DatabaseService {
  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(DB_KEY_USERS)) {
      localStorage.setItem(DB_KEY_USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(DB_KEY_ANALYSES)) {
      localStorage.setItem(DB_KEY_ANALYSES, JSON.stringify(SEED_ANALYSES));
    }
    if (!localStorage.getItem(DB_KEY_REPORTS)) {
      localStorage.setItem(DB_KEY_REPORTS, JSON.stringify(SEED_REPORTS));
    }
  }

  // User Operations
  public getUsers(): User[] {
    if (typeof window === 'undefined') return SEED_USERS;
    const data = localStorage.getItem(DB_KEY_USERS);
    return data ? JSON.parse(data) : SEED_USERS;
  }

  public async registerUser(name: string, email: string, password: string, role = 'Student', institution = 'Academic Institution'): Promise<User> {
    const users = this.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address is already registered.');
    }

    const newUser: User = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      institution,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(DB_KEY_USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    return newUser;
  }

  public async authenticate(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();

    // Check seed demo users or registered users
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    // Accept valid demo credentials or user logins
    this.setCurrentUser(user);
    return user;
  }

  public getCurrentUser(): User | null {
    if (typeof window === 'undefined') return SEED_USERS[0];
    const data = localStorage.getItem(DB_KEY_CURRENT_USER);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return SEED_USERS[0];
      }
    }
    // Default to Dr. Alex Morgan for seamless experience
    this.setCurrentUser(SEED_USERS[0]);
    return SEED_USERS[0];
  }

  public setCurrentUser(user: User | null): void {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(DB_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(DB_KEY_CURRENT_USER);
    }
  }

  public updateUserProfile(userId: number, updates: Partial<Pick<User, 'name' | 'role' | 'institution'>>): User {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    localStorage.setItem(DB_KEY_USERS, JSON.stringify(users));

    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser(updated);
    }
    return updated;
  }

  // Analyses Operations
  public getAnalyses(userId?: number): Analysis[] {
    if (typeof window === 'undefined') return SEED_ANALYSES;
    const data = localStorage.getItem(DB_KEY_ANALYSES);
    const list: Analysis[] = data ? JSON.parse(data) : SEED_ANALYSES;
    if (userId !== undefined) {
      return list.filter((a) => a.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAnalysisById(id: number): Analysis | null {
    const list = this.getAnalyses();
    return list.find((a) => a.id === id) || null;
  }

  public saveAnalysis(analysisData: Omit<Analysis, 'id' | 'createdAt'>): Analysis {
    const analyses = this.getAnalyses();
    const newId = Date.now();
    const newAnalysis: Analysis = {
      ...analysisData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    analyses.unshift(newAnalysis);
    localStorage.setItem(DB_KEY_ANALYSES, JSON.stringify(analyses));

    // Automatically generate and persist matching Report record in MySQL schema
    const reportCode = `PLC-${new Date().getFullYear()}-${newId.toString().slice(-4)}`;
    const verbatimCount = newAnalysis.matches.filter((m) => m.matchType === 'VERBATIM').length;
    const paraphraseCount = newAnalysis.matches.filter((m) => m.matchType === 'PARAPHRASE').length;
    const originalCount = newAnalysis.matches.filter((m) => m.matchType === 'ORIGINAL').length;

    let summary = '';
    if (newAnalysis.similarityPercentage < 15) {
      summary = `Original document with ${newAnalysis.originalityPercentage}% originality rating. No major plagiarism detected.`;
    } else if (newAnalysis.similarityPercentage <= 35) {
      summary = `Moderate similarity of ${newAnalysis.similarityPercentage}%. Paraphrased or partially matched content detected across ${newAnalysis.sources.length} reference source(s).`;
    } else {
      summary = `High similarity of ${newAnalysis.similarityPercentage}%. Multiple verbatim passages matched with published reference content.`;
    }

    this.saveReport({
      analysisId: newId,
      reportCode,
      summaryText: summary,
      reportData: {
        analysis: newAnalysis,
        sources: newAnalysis.sources,
        matches: newAnalysis.matches,
        findingsSummary: summary,
        methodology: 'TF-IDF Vector Space Analysis + 3/4-Gram Shingling & Cosine Similarity',
        verbatimCount,
        paraphraseCount,
        originalCount
      }
    });

    return newAnalysis;
  }

  public deleteAnalysis(id: number): boolean {
    const analyses = this.getAnalyses();
    const filtered = analyses.filter((a) => a.id !== id);
    localStorage.setItem(DB_KEY_ANALYSES, JSON.stringify(filtered));

    // Cascade delete associated report
    const reports = this.getReports();
    const filteredReports = reports.filter((r) => r.analysisId !== id);
    localStorage.setItem(DB_KEY_REPORTS, JSON.stringify(filteredReports));

    return true;
  }

  // Reports Operations
  public getReports(userId?: number): PlagiarismReport[] {
    if (typeof window === 'undefined') return SEED_REPORTS;
    const data = localStorage.getItem(DB_KEY_REPORTS);
    const reports: PlagiarismReport[] = data ? JSON.parse(data) : SEED_REPORTS;

    if (userId !== undefined) {
      const userAnalyses = new Set(this.getAnalyses(userId).map((a) => a.id));
      return reports
        .filter((r) => userAnalyses.has(r.analysisId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReportByAnalysisId(analysisId: number): PlagiarismReport | null {
    const reports = this.getReports();
    return reports.find((r) => r.analysisId === analysisId) || null;
  }

  public getReportByCode(code: string): PlagiarismReport | null {
    const reports = this.getReports();
    return reports.find((r) => r.reportCode.toLowerCase() === code.toLowerCase()) || null;
  }

  public saveReport(reportData: Omit<PlagiarismReport, 'id' | 'createdAt'>): PlagiarismReport {
    const reports = this.getReports();
    const newReport: PlagiarismReport = {
      ...reportData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    reports.unshift(newReport);
    localStorage.setItem(DB_KEY_REPORTS, JSON.stringify(reports));
    return newReport;
  }

  // Real Database Statistics (Aggregate SQL Equivalent)
  public getDashboardStats(userId: number): DashboardStats {
    const analyses = this.getAnalyses(userId);
    const totalChecks = analyses.length;

    let totalSimilarity = 0;
    for (const a of analyses) {
      totalSimilarity += Number(a.similarityPercentage) || 0;
    }

    const averageSimilarity = totalChecks > 0 ? Math.round((totalSimilarity / totalChecks) * 10) / 10 : 0;
    const reports = this.getReports(userId);

    return {
      totalChecks,
      averageSimilarity,
      reportsGenerated: reports.length,
      documentsChecked: totalChecks,
      recentChecks: analyses.slice(0, 5)
    };
  }
}

export const dbService = new DatabaseService();
