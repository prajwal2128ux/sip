/**
 * CheckerPage Component - The Primary Working Feature Page
 *
 * Implements:
 * - Direct document upload for PDF, DOC, DOCX, and TXT files with client-side text parsing
 * - Large text editor with Paste Text and Document Upload tabs
 * - Load Sample options (Climate, AI Ethics, Quantum, Software)
 * - Live Word and Character counter & input limit (10,000 words)
 * - Clear Text & Check Plagiarism actions
 * - Real-time Analysis Progress screen
 * - Live Connected Search Engines status
 * - Academic Integrity guidelines
 */

import React, { useState, useRef } from 'react';
import {
  FileSearch,
  Sparkles,
  Trash2,
  Upload,
  FileUp,
  Info,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Clock,
  Layers,
  Check,
  Globe,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  FileType,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { AnalysisProgress } from '../../components/common/AnalysisProgress';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { analyzePlagiarism } from '../../services/nlpEngine';
import { CONNECTED_SEARCH_ENGINES } from '../../services/multiSearchEngine';
import { parseDocument, ParsedDocument } from '../../services/documentParser';
import { PageRoute } from '../../types';

interface CheckerPageProps {
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

const SAMPLE_TEXTS = [
  {
    id: 'sample-humanized',
    name: 'Humanized Text (100% Human Authored / Natural Flow)',
    title: 'Essay: The Practical Realities of Cross-Device Screen Time Tracking',
    text: `Screen time tracking has become pretty tricky nowadays because people constantly bounce between their phones, laptops, and tablets. Most existing trackers don't synchronize events across platforms properly, so they end up double-counting active hours. To tackle this, we designed a distributed daemon that listens for active window changes over local Wi-Fi. In our real-world tests, background memory stayed under 32MB and battery impact was negligible. Frankly, the hardest part wasn't the protocol itself, but handling sudden OS sleep transitions.`
  },
  {
    id: 'sample-academic',
    name: 'Academic Dissertation (Multi-Device Analyzer / Thesis)',
    title: 'Dissertation: AI-Powered Screen Time Analyzer for Multi-Device Environments',
    text: `In this dissertation, we present an ambient multi-device screen time correlation engine designed to track user digital engagement across heterogeneous desktop and mobile endpoints. Experimental evaluations over 45 participants demonstrate an aggregate session attribution accuracy of 94.6% with a mean synchronization latency of 22ms. As noted by Smith et al. (2023), cross-device context switches significantly exacerbate cognitive fragmentation [3]. Our framework introduces lightweight telemetry logging with strict privacy preservation.`
  },
  {
    id: 'sample-chatgpt-cars',
    name: 'ChatGPT Essay: About Cars (High AI Copied %)',
    title: 'Essay: About Cars (ChatGPT Informational Output)',
    text: `About Cars 🚗\nCars are one of the most important inventions in modern transportation. They are motor vehicles designed to carry people and goods from one place to another. Cars make travelling faster, easier, and more comfortable. They are widely used for personal transportation, business, tourism, and emergency services.\n\nA car consists of several important components, such as the engine, transmission, wheels, brakes, steering system, battery, and suspension. The engine produces power, while the transmission transfers that power to the wheels. The braking system helps the driver control the vehicle and stop safely.\n\nThere are different types of cars, including hatchbacks, sedans, SUVs, sports cars, and luxury cars. Popular car brands include BMW, Mercedes-Benz, Audi, Toyota, Honda, Tata, Mahindra, and Hyundai. Sports cars are known for their high speed and performance, while luxury cars provide comfort and advanced technology.\n\nModern cars are becoming smarter with features like GPS navigation, automatic braking, parking sensors, airbags, touchscreen displays, and driver assistance systems. Electric cars are also gaining popularity because they reduce dependence on petrol and diesel and help lower emissions.\n\nCars have greatly improved human mobility and lifestyle. However, responsible driving, regular maintenance, and following traffic rules are essential for safety. The future of cars is moving towards electric vehicles, autonomous driving, and environmentally friendly transportation.`
  },
  {
    id: 'sample-chatgpt',
    name: 'Raw ChatGPT Essay (AI Generated Clichés)',
    title: 'Essay: The Transformative Power of Artificial Intelligence',
    text: `In today's fast-paced digital world, artificial intelligence plays a pivotal role in shaping modern human society. Delving into the rich tapestry of computational innovation, autonomous algorithms stand as a testament to human progress. Navigating the complexities of this evolving landscape, researchers must foster a culture of ethical stewardship. Harnessing the power of machine intelligence serves as a cornerstone for economic vitality, opening up a myriad of transformative possibilities. As we look to the future, it is clear that a multifaceted approach will remain paramount.`
  },
  {
    id: 'sample-climate',
    name: 'Wikipedia Article (Direct Plagiarism Match)',
    title: 'Research Excerpt: Global Warming & Greenhouse Dynamics',
    text: `Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns. Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system and caused change on a global scale. The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane. Fossil fuel burning for energy consumption is the main source of these emissions, with additional contributions from agriculture, deforestation, and industrial processes.`
  },
  {
    id: 'sample-original',
    name: 'Original Engineering Paper (High Originality)',
    title: 'Theoretical Thesis: Asynchronous Microkernel IPC Verification',
    text: `We formalized a microkernel communication fabric that executes zero-copy memory transfers between isolated userland subsystems without context-switching penalties. By binding memory capabilities directly to hardware-assisted page descriptors, our architecture prevents unauthorized cross-boundary access during high-throughput network stream processing. Formal verification using automated theorem provers demonstrates zero thread interleaving deadlocks across all evaluated workloads.`
  }
];

export const CheckerPage: React.FC<CheckerPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Editor State
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'samples'>('paste');
  const [error, setError] = useState<string | null>(null);

  // Document Upload State
  const [uploadedDoc, setUploadedDoc] = useState<ParsedDocument | null>(null);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  // Analysis Progress State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepMessage, setStepMessage] = useState('Initializing text analysis pipeline...');
  const [progressPercent, setProgressPercent] = useState(0);

  // Word and character count calculations
  const characterCount = text.length;
  const wordsArray = text.trim() ? text.trim().split(/\s+/) : [];
  const wordCount = wordsArray.length;
  const maxWords = 10000;
  const isOverLimit = wordCount > maxWords;

  // Handle file selection and parsing
  const handleFileUpload = async (file: File) => {
    setParseError(null);
    setError(null);

    const fileName = file.name;
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];

    if (!validExtensions.includes(extension)) {
      setParseError('Please upload a supported document format: PDF (.pdf), Microsoft Word (.docx, .doc), or Text (.txt).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setParseError('The selected file exceeds the 25MB file size limit. Please upload a smaller document.');
      return;
    }

    try {
      setIsParsingDoc(true);
      const parsed = await parseDocument(file);
      setIsParsingDoc(false);

      if (!parsed.text || parsed.text.trim().length === 0) {
        setParseError('Could not extract readable text from this document. If this is a scanned PDF with images only, please ensure it contains selectable text.');
        return;
      }

      setUploadedDoc(parsed);
      setText(parsed.text);

      // Auto-populate document title from clean file name if title is empty
      const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      setTitle((prev) => (prev.trim() ? prev : cleanTitle));
    } catch (err) {
      setIsParsingDoc(false);
      setParseError(err instanceof Error ? err.message : 'Failed to extract text from document.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleLoadSample = (sample: typeof SAMPLE_TEXTS[0]) => {
    setTitle(sample.title);
    setText(sample.text);
    setUploadedDoc(null);
    setActiveTab('paste');
    setError(null);
    setParseError(null);
  };

  const handleClear = () => {
    if (text.length > 50) {
      if (!window.confirm('Clear all entered text and uploaded document?')) return;
    }
    setText('');
    setTitle('');
    setUploadedDoc(null);
    setError(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mainFileInputRef.current) mainFileInputRef.current.value = '';
  };

  const handleRemoveUploadedDoc = () => {
    setUploadedDoc(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mainFileInputRef.current) mainFileInputRef.current.value = '';
  };

  const handleCheckPlagiarism = async () => {
    setError(null);

    if (!text.trim() || wordCount < 10) {
      setError('Please provide at least 10 words of text to perform an accurate plagiarism analysis.');
      return;
    }

    if (isOverLimit) {
      setError(`The entered text exceeds the maximum limit of ${maxWords.toLocaleString()} words.`);
      return;
    }

    try {
      setIsAnalyzing(true);
      setCurrentStep(1);
      setProgressPercent(10);

      // Run NLP analysis with real step callbacks
      const result = await analyzePlagiarism(text, (step, message, pct) => {
        setCurrentStep(step);
        setStepMessage(message);
        setProgressPercent(pct);
      });

      // Save to database
      const documentTitle = title.trim() || (uploadedDoc ? uploadedDoc.fileName : `Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      let savedAnalysisId: number | undefined;

      try {
        const saved = dbService.saveAnalysis({
          userId: user?.id || 1,
          title: documentTitle,
          submittedText: text,
          wordCount: result.wordCount,
          characterCount: result.characterCount,
          sentenceCount: result.sentenceCount,
          similarityPercentage: result.similarityPercentage,
          originalityPercentage: result.originalityPercentage,
          aiProbabilityPercentage: result.aiProbabilityPercentage,
          humanPercentage: result.humanPercentage,
          aiVerdict: result.aiVerdict,
          riskLevel: result.riskLevel,
          processingTimeMs: result.processingTimeMs,
          sources: result.sources,
          matches: result.matches
        });
        savedAnalysisId = saved.id;
      } catch (saveErr) {
        console.warn('[CheckerPage] DB save warning:', saveErr);
      }

      // Transition smoothly to result page
      setTimeout(() => {
        setIsAnalyzing(false);
        onNavigate('result', savedAnalysisId);
      }, 400);
    } catch (err: unknown) {
      setIsAnalyzing(false);
      setError(err instanceof Error ? err.message : 'An error occurred during analysis.');
    }
  };

  // If currently running analysis, show the analysis progress screen
  if (isAnalyzing) {
    return (
      <AnalysisProgress
        currentStep={currentStep}
        stepMessage={stepMessage}
        progressPercent={progressPercent}
        onCancel={() => setIsAnalyzing(false)}
      />
    );
  }

  // Get file badge color & label
  const getFileBadge = (type?: string) => {
    switch (type) {
      case 'pdf':
        return { label: 'PDF Document', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'docx':
      case 'doc':
        return { label: 'Word Document', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'txt':
        return { label: 'Text File', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
      default:
        return { label: 'Document', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />
      <input
        ref={mainFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Top Title Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-600" />
              <span>Plagiarism Checker</span>
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Upload PDF, DOC, DOCX documents or paste text to evaluate similarity against online Wikipedia and academic repositories.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                PDF / DOC
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'samples'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Text Input & Editor or Upload Hub (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* UPLOAD DOCUMENT TAB VIEW */}
          {activeTab === 'upload' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Upload Student Document</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Upload your academic term paper, essay, thesis draft, or journal manuscript. Text is extracted instantly in your browser with complete privacy.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => mainFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                    : isParsingDoc
                    ? 'border-blue-300 bg-blue-50/30 cursor-wait'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                {isParsingDoc ? (
                  <div className="py-4 space-y-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Extracting Document Text...
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Parsing pages, paragraphs, and structure from your document.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                      <FileUp className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Click to browse or drag & drop your document here
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Supported formats: <strong className="text-slate-800">PDF (.pdf)</strong>, <strong className="text-slate-800">Word (.docx, .doc)</strong>, and <strong className="text-slate-800">Text (.txt)</strong> up to 25MB
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <FileType className="w-3.5 h-3.5 text-rose-600" /> PDF (.pdf)
                      </span>
                      <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <FileType className="w-3.5 h-3.5 text-blue-600" /> Word (.docx)
                      </span>
                      <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <FileType className="w-3.5 h-3.5 text-indigo-600" /> Word Legacy (.doc)
                      </span>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-600" /> Plain Text (.txt)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Parse Error */}
              {parseError && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Document Extraction Notice:</span>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* If Document Is Uploaded, Show Overview Card & Quick Actions */}
              {uploadedDoc && (
                <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {uploadedDoc.fileName}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getFileBadge(uploadedDoc.fileType).bg}`}>
                            {getFileBadge(uploadedDoc.fileType).label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {uploadedDoc.fileSizeFormatted}
                          {uploadedDoc.pageCount ? ` • ${uploadedDoc.pageCount} page(s)` : ''} •{' '}
                          <span className="font-semibold text-emerald-800">
                            {uploadedDoc.wordCount.toLocaleString()} words extracted
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveUploadedDoc}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Document Title Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Research Paper Title"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  {/* Text Excerpt Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Extracted Document Preview
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('paste')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Open in Full Editor →
                      </button>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-h-40 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap">
                      {text.slice(0, 1000)}
                      {text.length > 1000 ? '...' : ''}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                    >
                      Want to modify text? <span className="text-blue-600 underline">Switch to Text Editor</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckPlagiarism}
                      disabled={!text.trim() || isOverLimit}
                      className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FileSearch className="w-4 h-4" />
                      <span>Check Plagiarism for {uploadedDoc.fileName}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN TEXT EDITOR VIEW (When Paste Tab is active) */}
          {activeTab === 'paste' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
              {/* If a document was parsed, show quick notification banner */}
              {uploadedDoc && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">
                      Document Loaded: <strong>{uploadedDoc.fileName}</strong> ({uploadedDoc.fileSizeFormatted}
                      {uploadedDoc.pageCount ? ` • ${uploadedDoc.pageCount} page(s)` : ''} • {uploadedDoc.wordCount.toLocaleString()} words)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Doc Info
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveUploadedDoc}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Detach
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Document Title Input */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Term Paper: Dynamics of Global Climate Change"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Submitted Text Content *
                  </label>
                  <span className="text-xs text-slate-700">
                    Min. 10 words recommended
                  </span>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={14}
                  placeholder="Type or paste your academic essay, research paper abstract, or literature review text here for originality analysis..."
                  className="w-full p-4 text-sm font-sans bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 leading-relaxed resize-y"
                />
              </div>

              {/* Editor Footer: Counters and Actions */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Counters */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <span>Words:</span>
                    <span className={`tabular-nums ${isOverLimit ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                      {wordCount.toLocaleString()}
                    </span>
                    <span className="text-slate-700">/ {maxWords.toLocaleString()}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-slate-700">
                    <span>Characters:</span>
                    <span className="tabular-nums text-slate-700">{characterCount.toLocaleString()}</span>
                  </div>
                  <div className="hidden md:flex items-center gap-1 text-slate-700">
                    <span>Est. Read:</span>
                    <span className="tabular-nums text-slate-700">
                      {Math.ceil(wordCount / 200)} min
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!text}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckPlagiarism}
                    disabled={!text.trim() || isOverLimit}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSearch className="w-4 h-4" />
                    <span>Check Plagiarism</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sample Selector Tab Drawer */}
          {activeTab === 'samples' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Quick Load Academic Samples</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Select a pre-compiled sample document to test plagiarism detection algorithms and citation matching.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
                >
                  Back to Editor
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_TEXTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="text-left p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-xs transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 group-hover:text-blue-700">
                        {sample.name}
                      </span>
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5">
                        Load <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    <span className="text-slate-700 text-[11px] line-clamp-2">
                      "{sample.text}"
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference Source Explanatory Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block mb-0.5">
                Reference Source Verification Pipeline
              </span>
              <p className="leading-relaxed text-slate-700">
                Uploaded documents and submitted texts are tokenized, parsed into shingles, and queried against live Wikipedia articles and an open academic literature index. The similarity algorithm uses TF-IDF vector cosine distance and 3/4-gram sequence overlap to identify matching passages.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Search Engines & Upload Document Component */}
        <div className="space-y-6">
          {/* UPLOAD DOCUMENT COMPONENT (Interactive & Functional) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Upload Document</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3" /> Enabled
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Upload PDF, Word DOC, or DOCX files for automatic text extraction and originality analysis:
            </p>

            {/* Interactive Dropzone / Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                  : isParsingDoc
                  ? 'border-blue-300 bg-blue-50/30 cursor-wait'
                  : uploadedDoc
                  ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/60'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/80 hover:bg-slate-50'
              }`}
            >
              {isParsingDoc ? (
                <div className="py-2 space-y-2">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-800">
                    Parsing document...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Extracting text from pages
                  </p>
                </div>
              ) : uploadedDoc ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] mx-auto">
                      {uploadedDoc.fileName}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      {uploadedDoc.wordCount.toLocaleString()} words loaded
                    </p>
                  </div>
                  <span className="inline-block text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    Click to choose another file
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="w-7 h-7 text-blue-600 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to browse or drop file here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PDF, DOCX, DOC, or TXT (Max 25MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Supported Formats Badges */}
              <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                  PDF
                </span>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  DOCX
                </span>
                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                  DOC
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  TXT
                </span>
              </div>
            </div>

            {/* Parse error feedback */}
            {parseError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Document loaded action */}
            {uploadedDoc && (
              <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 text-[11px] truncate">
                  {uploadedDoc.fileSizeFormatted} {uploadedDoc.pageCount ? `• ${uploadedDoc.pageCount}p` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveUploadedDoc}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* MULTI-SEARCH ENGINE & WIKIPEDIA LIVE CONNECTION CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Connected Search Engines</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                4 Active
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Every plagiarism check queries live Wikipedia articles and global academic search engines:
            </p>

            <div className="space-y-2">
              {CONNECTED_SEARCH_ENGINES.map((engine) => (
                <div
                  key={engine.id}
                  className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {engine.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {engine.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                    Connected
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Integrity & Guidelines Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Plagiarism Threshold Guide</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-xs bg-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">&lt; 15% Similarity (Low Risk):</span>
                  <p className="text-slate-700 text-[11px]">Typical coincidental phrasing, standard terminology, and properly cited quotes.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-xs bg-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">15% - 35% Similarity (Moderate):</span>
                  <p className="text-slate-700 text-[11px]">Noticeable paraphrasing or shared sentence structures requiring citation review.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-xs bg-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">&gt; 35% Similarity (High Risk):</span>
                  <p className="text-slate-700 text-[11px]">Substantial verbatim copying or uncited source adoption.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
