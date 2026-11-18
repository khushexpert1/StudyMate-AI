import React from 'react';
import { HelpCircle, Menu, Plus, Sparkles } from 'lucide-react';
import { NavSectionId } from '../types/study';
import { NAV_ITEMS } from './Sidebar';

interface TopBarProps {
  activeSection: NavSectionId;
  hasDemoData: boolean;
  branch: string;
  semester: number;
  geminiConfigured?: boolean;
  onOpenMobileMenu: () => void;
  onOpenSetupGuide: () => void;
  onNavigate: (section: NavSectionId) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  hasDemoData,
  branch,
  semester,
  geminiConfigured = true,
  onOpenMobileMenu,
  onOpenSetupGuide,
  onNavigate,
}) => {
  const currentItem = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  const primaryAction =
    activeSection === 'dashboard'
      ? { label: 'Take Practice Quiz', target: 'quiz-generator' as NavSectionId, icon: Sparkles }
      : activeSection === 'study-planner'
      ? { label: 'View Progress', target: 'progress-tracker' as NavSectionId, icon: Plus }
      : { label: 'Back to Dashboard', target: 'dashboard' as NavSectionId, icon: Plus };

  const ActionIcon = primaryAction.icon;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#070B14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-[#0F172A] text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span className="hidden sm:inline">StudyMate AI</span>
            <span className="hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-slate-300 font-medium truncate">{currentItem.label}</span>
            <span aria-hidden="true">·</span>
            <span className="hidden md:inline text-slate-400">
              {branch} Sem {semester}
            </span>
            {hasDemoData && (
              <>
                <span className="hidden md:inline" aria-hidden="true">·</span>
                <span className="text-amber-300/90">DEMO DATA Available</span>
              </>
            )}
          </div>
          <h1 className="font-display text-base sm:text-lg font-semibold text-white truncate">
            {currentItem.label}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenSetupGuide}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            !geminiConfigured
              ? 'border-amber-500/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40'
              : 'border-slate-700/80 bg-[#0F172A] text-slate-200 hover:border-violet-500/50 hover:text-white'
          }`}
        >
          <HelpCircle className={`h-3.5 w-3.5 ${!geminiConfigured ? 'text-amber-300' : 'text-violet-400'}`} />
          <span>Setup Guide</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate(primaryAction.target)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          {activeSection === 'dashboard' && <ActionIcon className="h-4 w-4" />}
          <span>{primaryAction.label}</span>
        </button>
      </div>
    </header>
  );
};
