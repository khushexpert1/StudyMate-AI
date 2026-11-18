import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  UploadCloud,
  UserCog,
  X,
} from 'lucide-react';
import {
  clearStoredGeminiApiKey,
  GEMINI_KEY_CHANGED_EVENT,
  getActiveGeminiKeyInfo,
  getEnvGeminiApiKey,
  getStoredGeminiApiKey,
  saveStoredGeminiApiKey,
} from '../services/api';
import { downloadSampleEducationalPdf } from '../services/pdf';
import { NavSectionId, StudentProfile } from '../types/study';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onNavigate: (section: NavSectionId) => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  profile,
  onNavigate,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState(() => getActiveGeminiKeyInfo());
  const [hasStoredFallback, setHasStoredFallback] = useState(() => Boolean(getStoredGeminiApiKey()));

  const syncKeyState = () => {
    setKeyStatus(getActiveGeminiKeyInfo());
    const stored = getStoredGeminiApiKey();
    setHasStoredFallback(Boolean(stored));
    setApiKeyInput(stored);
  };

  useEffect(() => {
    if (isOpen) {
      syncKeyState();
      setSavedNotice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyChanged = () => syncKeyState();
    window.addEventListener(GEMINI_KEY_CHANGED_EVENT, onKeyChanged);
    return () => window.removeEventListener(GEMINI_KEY_CHANGED_EVENT, onKeyChanged);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const envConfigured = Boolean(getEnvGeminiApiKey());

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      clearStoredGeminiApiKey();
      setSavedNotice('Cleared saved browser Gemini API key.');
      return;
    }
    saveStoredGeminiApiKey(trimmed);
    setSavedNotice(
      envConfigured
        ? 'Fallback key saved in localStorage (VITE_GEMINI_API_KEY remains primary while set).'
        : 'Gemini API key saved to browser localStorage. AI features are now active.'
    );
  };

  const handleClearKey = () => {
    clearStoredGeminiApiKey();
    setApiKeyInput('');
    setSavedNotice('Removed saved Gemini API key from localStorage.');
  };

  const navigateAndClose = (section: NavSectionId) => {
    onNavigate(section);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-violet-500/35 bg-[#0D1326] p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <p className="text-xs font-medium text-violet-300">
              Setup Guide · {profile.branch} · Semester {profile.semester}
            </p>
            <h2
              id="setup-guide-modal-title"
              className="font-display text-xl sm:text-2xl font-semibold text-white mt-1"
            >
              StudyMate AI Setup &amp; Gemini API Configuration
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Pure frontend workspace ready for static hosting (Netlify). Upload personal notes, customize subjects, or configure a browser Gemini API key below.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Setup Guide"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gemini API Key Browser Fallback Section */}
        <section
          aria-label="Gemini API key configuration"
          className="rounded-xl border border-slate-800 bg-[#080D1A] p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-violet-400 shrink-0" />
              <h3 className="font-display text-sm sm:text-base font-semibold text-white">
                Gemini API Key (Browser Fallback)
              </h3>
            </div>
            <span
              className={`text-xs font-medium ${
                keyStatus.source === 'env'
                  ? 'text-emerald-400'
                  : keyStatus.source === 'localStorage'
                  ? 'text-violet-300'
                  : 'text-amber-300'
              }`}
            >
              {keyStatus.source === 'env'
                ? 'Active via VITE_GEMINI_API_KEY'
                : keyStatus.source === 'localStorage'
                ? 'Active via localStorage fallback'
                : 'Key needed for AI features'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            StudyMate AI reads <span className="font-mono text-slate-200">import.meta.env.VITE_GEMINI_API_KEY</span> first. If not set in your build environment, paste your Gemini API key below to save it in browser <span className="font-mono text-slate-200">localStorage</span> as a fallback.
          </p>

          <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setSavedNotice(null);
                }}
                placeholder="Paste your Gemini API key (e.g., AIza...)"
                aria-label="Gemini API Key"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-[#0F172A] pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
              >
                <Check className="h-4 w-4" />
                <span>Save Key</span>
              </button>

              {hasStoredFallback && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  aria-label="Clear saved API key"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-700 bg-[#0F172A] text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </form>

          {savedNotice && (
            <p className="text-xs text-emerald-300 font-medium" role="status">
              {savedNotice}
            </p>
          )}
        </section>

        {/* 3 Onboarding Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-lg border border-slate-800/90 bg-[#080D1A] p-4 space-y-1.5">
            <p className="text-xs font-mono text-violet-400">01. Upload Personal Notes</p>
            <p className="text-sm font-medium text-white">Client-Side PDF &amp; Text Reader</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload any text-based PDF, .txt, or .md file (up to 15 MB) in Smart Notes Analyzer to extract text directly in your browser—or download our sample educational PDF to test it first.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/90 bg-[#080D1A] p-4 space-y-1.5">
            <p className="text-xs font-mono text-violet-400">02. Customize Subjects &amp; Plan</p>
            <p className="text-sm font-medium text-white">Student Profile &amp; Schedule</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pre-loaded with {profile.subjects.join(', ')}. Edit your branch, semester, subjects, or customize the sample study plan anytime.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/90 bg-[#080D1A] p-4 space-y-1.5">
            <p className="text-xs font-mono text-violet-400">03. Real Progress Isolation</p>
            <p className="text-sm font-medium text-white">Keep DEMO DATA Separate</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sample topics help you test Quiz Generator, Doubt Solver, and Exam Notes immediately. Demo scores and demo hours are never mixed into your real progress.
            </p>
          </div>
        </div>

        {/* Quick Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigateAndClose('notes-analyzer')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload Notes</span>
            </button>

            <button
              type="button"
              onClick={downloadSampleEducationalPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600/25 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Sample PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigateAndClose('student-profile')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#080D1A] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap"
            >
              <UserCog className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => navigateAndClose('quiz-generator')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-[#080D1A] text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Try Sample Topics</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
