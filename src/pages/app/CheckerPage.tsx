/**
 * CheckerPage Component - The Primary Working Feature Page
 *
 * Implements:
 * - Large text editor with Paste Text tab
 * - Load Sample options (Climate, AI Ethics, Quantum, Software)
 * - Live Word and Character counter & input limit (10,000 words)
 * - Clear Text & Check Plagiarism actions
 * - Real-time Analysis Progress screen
 * - Disabled "Upload Document" section with clear "Coming Soon" badge (PDF, DOC, DOCX)
 * - Reference source details (Wikipedia + Academic Corpus)
 */

import React, { useState } from 'react';
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
  HelpCircle,
  Clock,
  Layers,
  Check,
  Globe
} from 'lucide-react';
import { AnalysisProgress } from '../../components/common/AnalysisProgress';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { analyzePlagiarism } from '../../services/nlpEngine';
import { CONNECTED_SEARCH_ENGINES } from '../../services/multiSearchEngine';
import { PageRoute } from '../../types';

interface CheckerPageProps {
  onNavigate: (page: PageRoute, analysisId?: number) => void;
}

const SAMPLE_TEXTS = [
  {
    id: 'sample-chatgpt-birds',
    name: 'ChatGPT Essay: Birds & Nature (AI Generated)',
    title: 'Essay: The Ecological Role of Birds in Nature',
    text: `Birds are fascinating animals that are found in almost every part of the world. They come in different sizes, shapes, colors, and species. Birds have feathers, wings, beaks, two legs, and lightweight bodies that help many of them fly. Some common birds include sparrows, pigeons, parrots, eagles, peacocks, crows, and owls. Birds live in forests, mountains, grasslands, wetlands, cities, and even deserts. They eat different types of food such as seeds, fruits, insects, fish, and small animals. Birds build nests in trees, buildings, or other safe places where they can lay their eggs and raise their young. They play an important role in nature by spreading seeds, controlling insects, and helping plants reproduce. Some birds are known for their beautiful songs, while others are famous for their strength, speed, or colorful feathers. Birds also migrate long distances to find food and suitable weather conditions. Protecting forests, reducing pollution, and providing clean water can help protect bird populations. Birds make nature more beautiful and are an important part of our environment.`
  },
  {
    id: 'sample-chatgpt-bikes',
    name: 'ChatGPT Essay: Bikes & Two-Wheelers (AI Generated)',
    title: 'Essay: The Role of Bikes in Modern Transportation',
    text: `Bikes are one of the most popular and convenient means of transportation, especially for daily travel. They are affordable, easy to ride, and require less fuel compared to cars. There are different types of bikes, including commuter bikes, sports bikes, cruiser bikes, adventure bikes, touring bikes, and electric bikes. Commuter bikes are mainly used for everyday travel because they provide good mileage and are easy to maintain. Sports bikes are designed for high performance, speed, and stylish appearance. Cruiser bikes offer comfortable riding and are suitable for long journeys. Modern bikes come with advanced features such as ABS, digital displays, LED lights, Bluetooth connectivity, riding modes, and traction control. Electric bikes are also becoming popular because they produce no direct emissions and have lower running costs. Companies such as Honda, Yamaha, Royal Enfield, Bajaj, TVS, KTM, Suzuki, and Hero manufacture bikes for different types of riders. A good bike should provide safety, comfort, reliability, performance, and good fuel efficiency. Overall, bikes are an important part of modern transportation and are widely used for commuting, travel, sports, and entertainment.`
  },
  {
    id: 'sample-chatgpt-cars',
    name: 'ChatGPT Essay: Cars & Modern Transportation (AI Generated)',
    title: 'Essay: The Role of Cars in Modern Transportation',
    text: `Cars are one of the most useful and popular means of transportation in the modern world. They help people travel comfortably and quickly from one place to another. There are many types of cars, including hatchbacks, sedans, SUVs, sports cars, electric cars, and luxury cars. Modern cars come with advanced features such as airbags, ABS, automatic braking, parking sensors, cameras, navigation systems, and connected technology. Electric cars are becoming more popular because they reduce fuel consumption and harmful emissions. Petrol and diesel cars are still widely used because of their availability and long driving range. Companies such as MG, Toyota, Hyundai, Tata Motors, Maruti Suzuki, BMW, Mercedes-Benz, and Audi produce cars for different needs and budgets. A good car should provide safety, comfort, performance, reliability, and reasonable maintenance costs. Cars have also become an important part of daily life for families, students, workers, and businesses. With the development of artificial intelligence and autonomous driving technology, future cars may become safer and more intelligent. Overall, cars continue to play an important role in transportation and are constantly improving with new technology.`
  },
  {
    id: 'sample-climate',
    name: 'Climate Change (Verbatim Wikipedia Excerpt)',
    title: 'Research Essay: Global Warming & Greenhouse Dynamics',
    text: `Climate change includes both global warming driven by human-induced emissions of greenhouse gases and the large-scale shifts in weather patterns. Though there have been previous periods of climatic change, since the mid-20th century humans have had an unprecedented impact on Earth's climate system and caused change on a global scale. The largest driver of warming is the emission of greenhouse gases, of which more than 90% are carbon dioxide and methane. Fossil fuel burning for energy consumption is the main source of these emissions, with additional contributions from agriculture, deforestation, and industrial processes.`
  },
  {
    id: 'sample-ai',
    name: 'AI Ethics & Accountability (Paraphrased Text)',
    title: 'Seminar Paper: Accountability in Machine Learning Systems',
    text: `In modern computational systems, the ethics of artificial intelligence has emerged as an essential domain of study. Key concerns in contemporary machine learning involve algorithmic bias, where training datasets reflect historical disparities and produce discriminatory outcomes in loan approvals, criminal justice risk assessments, and hiring algorithms. Transparency and explainability have become central requirements for trustworthy autonomous systems across industry.`
  },
  {
    id: 'sample-original',
    name: 'Novel Computer Architecture (100% Original Essay)',
    title: 'Theoretical Thesis: Asynchronous Microkernel IPC Verification',
    text: `We formalized a microkernel communication fabric that executes zero-copy memory transfers between isolated userland subsystems without context-switching penalties. By binding memory capability capabilities directly to hardware-assisted page descriptors, our architecture prevents unauthorized cross-boundary access during high-throughput network stream processing. Formal verification using automated theorem provers demonstrates zero thread interleaving deadlocks across all evaluated workloads.`
  }
];

export const CheckerPage: React.FC<CheckerPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Editor State
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'samples'>('paste');
  const [error, setError] = useState<string | null>(null);

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

  const handleLoadSample = (sample: typeof SAMPLE_TEXTS[0]) => {
    setTitle(sample.title);
    setText(sample.text);
    setActiveTab('paste');
    setError(null);
  };

  const handleClear = () => {
    if (text.length > 50) {
      if (!window.confirm('Clear all entered text?')) return;
    }
    setText('');
    setTitle('');
    setError(null);
  };

  const handleCheckPlagiarism = async () => {
    setError(null);

    if (!text.trim() || wordCount < 10) {
      setError('Please enter at least 10 words of text to perform an accurate plagiarism analysis.');
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
      const documentTitle = title.trim() || `Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
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
        aiVerdict: result.aiVerdict,
        riskLevel: result.riskLevel,
        processingTimeMs: result.processingTimeMs,
        sources: result.sources,
        matches: result.matches
      });

      // Transition smoothly to result page
      setTimeout(() => {
        setIsAnalyzing(false);
        onNavigate('result', saved.id);
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

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-600" />
              <span>Plagiarism Checker</span>
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Submit text to evaluate similarity against online Wikipedia and academic reference repositories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'paste'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'samples'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Load Sample Text
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Text Input & Editor (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
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

            {/* Sample Selector Tab Drawer */}
            {activeTab === 'samples' && (
              <div className="mb-4 p-4 rounded-lg bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Quick Load Academic Samples:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SAMPLE_TEXTS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="text-left p-2.5 rounded-md bg-white border border-blue-100 hover:border-blue-400 hover:shadow-xs transition-all text-xs"
                    >
                      <span className="font-semibold text-slate-900 block">{sample.name}</span>
                      <span className="text-slate-700 text-[11px] line-clamp-1 mt-0.5">"{sample.text}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

          {/* Reference Source Explanatory Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block mb-0.5">
                Reference Source Verification Pipeline
              </span>
              <p className="leading-relaxed text-slate-700">
                Your submitted text is preprocessed, split into word shingles, and queried against live Wikipedia articles and an open academic literature index. The similarity algorithm uses TF-IDF vector cosine distance and 3/4-gram sequence overlap to identify matching passages.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Search Engines & Upload Section */}
        <div className="space-y-6">
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

          {/* UPLOAD DOCUMENT - COMING SOON (As explicitly requested by user) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>Upload Document</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Coming Soon
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              Direct document upload for binary file formats is under active development.
            </p>

            {/* Disabled Dropzone */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/80 cursor-not-allowed select-none">
              <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                File upload disabled for prototype
              </p>
              <p className="text-[11px] text-slate-700 mt-1">
                Please paste your text directly into the main editor to perform plagiarism checks.
              </p>

              {/* Supported Future Formats Badges */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-[10px] font-medium bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                  PDF
                </span>
                <span className="text-[10px] font-medium bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                  DOC
                </span>
                <span className="text-[10px] font-medium bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                  DOCX
                </span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-700 bg-slate-100/70 p-2.5 rounded border border-slate-200">
              <span className="font-semibold text-slate-700">Notice:</span> Document extraction parsers for PDF/Word will be released in an upcoming version update.
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
