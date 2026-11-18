import React from 'react';
import { AlertTriangle, CheckCircle2, Info, KeyRound } from 'lucide-react';
import { ApiHealthStatus } from '../types/study';

interface AiStatusBannerProps {
  apiHealth: ApiHealthStatus | null;
  errorMessage?: string | null;
  successMessage?: string | null;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
  onOpenSetupGuide?: () => void;
}

export const AiStatusBanner: React.FC<AiStatusBannerProps> = ({
  apiHealth,
  errorMessage,
  successMessage,
  onDismissError,
  onDismissSuccess,
  onOpenSetupGuide,
}) => {
  return (
    <div className="space-y-3">
      {apiHealth && !apiHealth.geminiConfigured && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-amber-200">
                Gemini API Key Needed for Live AI Generation
              </p>
              <p className="text-xs text-amber-200/85 mt-0.5 leading-relaxed">
                Set <span className="font-mono">VITE_GEMINI_API_KEY</span> in your Netlify/Vite environment or paste your Gemini API key directly in the Setup Guide modal (saved in browser localStorage). PDF text extraction and local workspace features remain active.
              </p>
            </div>
          </div>
          {onOpenSetupGuide && (
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Open Setup Guide</span>
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm leading-relaxed">{errorMessage}</p>
          </div>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="text-xs text-rose-300 hover:text-white shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-100"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm leading-relaxed">{successMessage}</p>
          </div>
          {onDismissSuccess && (
            <button
              type="button"
              onClick={onDismissSuccess}
              className="text-xs text-emerald-300 hover:text-white shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface InlineInfoProps {
  title: string;
  description: string;
}

export const InlineInfoNotice: React.FC<InlineInfoProps> = ({ title, description }) => (
  <div className="flex items-start gap-3 rounded-xl border border-violet-500/25 bg-[#11162B] px-4 py-3 text-sm">
    <Info className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium text-slate-100 text-xs sm:text-sm">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
    </div>
  </div>
);
