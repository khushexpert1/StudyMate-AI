import React, { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Trash2,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { NavSectionId } from '../types/study';

export interface NavItemConfig {
  id: NavSectionId;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortDesc: 'Study overview & activity',
    icon: LayoutDashboard,
  },
  {
    id: 'student-profile',
    label: 'Student Profile',
    shortDesc: 'Branch, semester & subjects',
    icon: User,
  },
  {
    id: 'notes-analyzer',
    label: 'Smart Notes Analyzer',
    shortDesc: 'PDF upload & document review',
    icon: FileText,
  },
  {
    id: 'doubt-solver',
    label: 'AI Doubt Solver',
    shortDesc: 'Course Q&A chat workspace',
    icon: MessageSquare,
  },
  {
    id: 'quiz-generator',
    label: 'Quiz Generator',
    shortDesc: 'MCQs & instant evaluation',
    icon: CheckSquare,
  },
  {
    id: 'study-planner',
    label: 'AI Study Planner',
    shortDesc: 'Daily & weekly schedules',
    icon: CalendarDays,
  },
  {
    id: 'exam-notes',
    label: 'Exam Notes Generator',
    shortDesc: 'Short revision sheets',
    icon: BookOpen,
  },
  {
    id: 'progress-tracker',
    label: 'Progress Tracker',
    shortDesc: 'Quiz scores & topic mastery',
    icon: TrendingUp,
  },
];

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  hasDemoData: boolean;
  onResetDemoData: () => void;
  onClearAllData: () => void;
  completedTopicsCount: number;
  totalTopicsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  hasDemoData,
  onResetDemoData,
  onClearAllData,
  completedTopicsCount,
  totalTopicsCount,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleNavClick = (id: NavSectionId) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B1120] border-r border-slate-800/80 text-slate-200">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/80 shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg py-1"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold tracking-tight text-white whitespace-nowrap">
              StudyMate AI
            </div>
            <div className="text-xs text-slate-400 whitespace-nowrap">
              Personal Study Assistant
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Study workspace sections" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-xs font-medium text-slate-500">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                isActive
                  ? 'bg-violet-600/15 text-white border border-violet-500/35'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-violet-400' : 'text-slate-400'
                }`}
              />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Workspace Data & Progress Summary */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 shrink-0 bg-[#090E1B]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-violet-400" />
            <span>{hasDemoData ? 'DEMO DATA Active' : 'Local Storage'}</span>
          </span>
          <span className="font-mono tabular-nums text-slate-300">
            {completedTopicsCount}/{totalTopicsCount} topics
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-200"
            style={{
              width: `${
                totalTopicsCount > 0
                  ? Math.round((completedTopicsCount / totalTopicsCount) * 100)
                  : 0
              }%`,
            }}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onResetDemoData();
              setConfirmClear(false);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:text-white hover:border-violet-500/50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors whitespace-nowrap"
              title="Clear workspace data"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClearAllData();
                setConfirmClear(false);
              }}
              className="inline-flex items-center justify-center px-2.5 py-2 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors whitespace-nowrap"
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop + Panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
