import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  FileText,
  Flame,
  HelpCircle,
  MessageSquare,
  TrendingUp,
  UserCog,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ActivityCategory,
  ActivityItem,
  ApiHealthStatus,
  NavSectionId,
  StudentProfile,
  StudyTask,
} from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';
import { DemoNoticeBanner } from '../DemoNoticeBanner';
import { OnboardingGuide } from '../OnboardingGuide';

export interface CombinedWeeklyPoint {
  day: string;
  realHours: number;
  targetHours: number;
  demoHours: number;
}

interface DashboardViewProps {
  apiHealth: ApiHealthStatus | null;
  studentProfile: StudentProfile;
  onboardingDismissed: boolean;
  onDismissOnboarding: () => void;
  onReopenOnboarding: () => void;
  hasDemoData: boolean;
  includeSampleData: boolean;
  onToggleSampleData: (include: boolean) => void;
  streakDays: number;
  // Strictly isolated real user metrics
  totalWeeklyHours: number;
  avgQuizScore: number;
  realQuizzesCount: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  // Clearly separated DEMO DATA baselines
  demoTotalWeeklyHours: number;
  demoAvgQuizScore: number;
  demoCompletedTopicsCount: number;
  demoTotalTopicsCount: number;
  demoCompletedTasksCount: number;
  demoTotalTasksCount: number;
  combinedWeeklyChart: CombinedWeeklyPoint[];
  activities: ActivityItem[];
  studyTasks: StudyTask[];
  hasAnyRealActivity: boolean;
  onToggleTask: (id: string) => void;
  onNavigate: (section: NavSectionId) => void;
  onResetDemoData: () => void;
}

const TOOL_SHORTCUTS: {
  id: NavSectionId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'student-profile',
    title: 'Student Profile & Subjects',
    subtitle: 'Edit AI/ML branch, semester, subjects & preferences',
    icon: UserCog,
  },
  {
    id: 'notes-analyzer',
    title: 'Smart Notes Analyzer',
    subtitle: 'Upload PDFs or test the sample PDF with Gemini AI',
    icon: FileText,
  },
  {
    id: 'doubt-solver',
    title: 'AI Doubt Solver',
    subtitle: 'Step-by-step tutoring & Semester 1 sample topics',
    icon: MessageSquare,
  },
  {
    id: 'quiz-generator',
    title: 'Quiz Generator',
    subtitle: '5, 10, or 15 MCQs from notes or syllabus topics',
    icon: CheckSquare,
  },
  {
    id: 'study-planner',
    title: 'AI Study Planner',
    subtitle: 'Edit sample schedule or generate custom timetables',
    icon: CalendarDays,
  },
  {
    id: 'exam-notes',
    title: 'Exam Notes Generator',
    subtitle: 'Simple, medium & detailed revision sheets',
    icon: BookOpen,
  },
  {
    id: 'progress-tracker',
    title: 'Progress Tracker',
    subtitle: 'Actual user analytics isolated from DEMO DATA',
    icon: TrendingUp,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  apiHealth,
  studentProfile,
  onboardingDismissed,
  onDismissOnboarding,
  onReopenOnboarding,
  hasDemoData,
  includeSampleData,
  onToggleSampleData,
  streakDays,
  totalWeeklyHours,
  avgQuizScore,
  realQuizzesCount,
  completedTopicsCount,
  totalTopicsCount,
  completedTasksCount,
  totalTasksCount,
  demoTotalWeeklyHours,
  demoAvgQuizScore,
  demoCompletedTopicsCount,
  demoTotalTopicsCount,
  demoCompletedTasksCount,
  demoTotalTasksCount,
  combinedWeeklyChart,
  activities,
  studyTasks,
  hasAnyRealActivity,
  onToggleTask,
  onNavigate,
  onResetDemoData,
}) => {
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityCategory>('all');

  const filteredActivities =
    activityFilter === 'all'
      ? activities
      : activities.filter((a) => a.category === activityFilter);

  const upcomingTasks = studyTasks.slice(0, 6);
  const weeklyGoalHours = Number((studentProfile.dailyStudyHoursGoal * 7).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Contextual Hero / Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-violet-400">
            {studentProfile.branch} · Semester {studentProfile.semester} ·{' '}
            {includeSampleData
              ? 'Actual Progress + DEMO DATA Preview'
              : 'Actual User Progress Only'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1 text-balance">
            Your academic progress at a glance
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Upload personal notes, test Semester {studentProfile.semester} sample topics, and track your real study progress separately from{' '}
            <span className="text-amber-300 font-medium">DEMO DATA</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onboardingDismissed && (
            <button
              type="button"
              onClick={onReopenOnboarding}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-700/80 bg-[#0F172A] text-slate-300 hover:text-white hover:border-violet-500/50 transition-colors whitespace-nowrap"
            >
              <HelpCircle className="h-3.5 w-3.5 text-violet-400" />
              <span>Setup Guide</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0F172A] border border-slate-800">
            <button
              type="button"
              onClick={() => onToggleSampleData(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                !includeSampleData
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Real Activity Only
            </button>
            <button
              type="button"
              onClick={() => onToggleSampleData(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                includeSampleData
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview DEMO DATA
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('study-planner')}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-700/80 bg-[#0F172A] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap"
          >
            Open Study Planner
          </button>
        </div>
      </div>

      {/* First-Time Student Onboarding Guide */}
      {!onboardingDismissed && (
        <OnboardingGuide
          profile={studentProfile}
          onNavigate={onNavigate}
          onDismiss={onDismissOnboarding}
        />
      )}

      {/* Student Profile Summary Bar */}
      <section
        aria-label="Active student profile summary"
        className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
            <span className="font-medium text-white text-sm">{studentProfile.studentName}</span>
            <span aria-hidden="true">·</span>
            <span className="text-violet-300 font-medium">
              Branch: {studentProfile.branch}
            </span>
            <span aria-hidden="true">·</span>
            <span>Semester {studentProfile.semester}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {studentProfile.dailyStudyHoursGoal}h/day goal ({studentProfile.preferredStudyTime})
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">
            Subjects ({studentProfile.subjects.length}): {studentProfile.subjects.join(' · ')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('student-profile')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <UserCog className="h-3.5 w-3.5 text-violet-400" />
          <span>Edit Profile &amp; Subjects</span>
        </button>
      </section>

      <AiStatusBanner apiHealth={apiHealth} />

      {!includeSampleData && !hasAnyRealActivity && (
        <DemoNoticeBanner
          title="Showing your actual saved progress only (currently empty)"
          description="Upload personal notes, complete a quiz, update a topic, or add a custom study block to record real metrics—or toggle Preview DEMO DATA above."
          actionLabel={hasDemoData ? 'Preview DEMO DATA' : 'Restore DEMO DATA'}
          onAction={() => (hasDemoData ? onToggleSampleData(true) : onResetDemoData())}
        />
      )}

      {/* 4-Column KPI Strip — Strictly Actual User Progress (Never mixed with DEMO DATA) */}
      <section aria-label="Actual user study statistics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Your Weekly Study Hours</span>
            <Clock className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-white tabular-nums">
              {totalWeeklyHours} hrs
            </span>
            <span className="text-xs text-slate-400 tabular-nums">/ {weeklyGoalHours}h goal</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Actual user sessions only
            {includeSampleData && hasDemoData ? (
              <span className="block text-amber-300/85 mt-0.5 tabular-nums">
                DEMO DATA reference: {demoTotalWeeklyHours} hrs (not mixed)
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Your Average Quiz Score</span>
            <CheckSquare className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-white tabular-nums">
              {avgQuizScore}%
            </span>
            <span className="text-xs text-emerald-400">
              {realQuizzesCount === 0
                ? 'No real attempts yet'
                : avgQuizScore >= 80
                ? 'Strong mastery'
                : 'Keep practicing'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {realQuizzesCount} real quiz attempt{realQuizzesCount === 1 ? '' : 's'}
            {includeSampleData && hasDemoData ? (
              <span className="block text-amber-300/85 mt-0.5 tabular-nums">
                DEMO DATA reference: {demoAvgQuizScore}% (not mixed)
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Your Topics Completed</span>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-white tabular-nums">
              {completedTopicsCount} / {totalTopicsCount}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              ({totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            User-updated syllabus topics
            {includeSampleData && hasDemoData ? (
              <span className="block text-amber-300/85 mt-0.5 tabular-nums">
                DEMO DATA sample topics: {demoCompletedTopicsCount}/{demoTotalTopicsCount}
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Your Study Sessions</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-white tabular-nums">
              {completedTasksCount} / {totalTasksCount}
            </span>
            <span className="text-xs text-slate-400">
              {hasAnyRealActivity ? 'saved blocks' : 'no custom blocks'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 tabular-nums">
            Custom / adopted study blocks
            {includeSampleData && hasDemoData ? (
              <span className="block text-amber-300/85 mt-0.5">
                DEMO DATA plan: {demoCompletedTasksCount}/{demoTotalTasksCount} ({streakDays}d sample streak)
              </span>
            ) : null}
          </p>
        </div>
      </section>

      {/* Recharts Weekly Study Hours Trend Chart + Upcoming Study Blocks Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 min-w-0 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Weekly Study Hours Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Your actual logged hours vs daily goal ({studentProfile.dailyStudyHoursGoal}h/day)
                {includeSampleData ? ' · DEMO DATA shown as separate dashed line' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-violet-500 inline-block" />
                Actual Hours
              </span>
              {includeSampleData && (
                <span className="flex items-center gap-1.5 text-amber-300/90">
                  <span className="h-2.5 w-2.5 rounded-xs bg-amber-400 inline-block" />
                  DEMO DATA
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-500 inline-block" />
                Target
              </span>
            </div>
          </div>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={combinedWeeklyChart}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="studyHoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="targetHours"
                  name="Daily Target (h)"
                  stroke="#64748B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="none"
                />
                {includeSampleData && (
                  <Area
                    type="monotone"
                    dataKey="demoHours"
                    name="DEMO DATA Baseline (h)"
                    stroke="#FBBF24"
                    strokeDasharray="5 3"
                    strokeWidth={1.75}
                    fill="none"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="realHours"
                  name="Actual User Hours (h)"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#studyHoursGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Upcoming Study Blocks (Interactive) */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/70">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Upcoming Study Blocks
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Custom blocks log your real hours · Edit sample plan in Study Planner
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('study-planner')}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap"
            >
              Edit / Manage
            </button>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-slate-300 font-medium">No personal study blocks scheduled</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Add a study block, generate an AI timetable, or adopt the Semester 1 sample plan in Study Planner.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('study-planner')}
                className="mt-4 px-3.5 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                Open AI Study Planner
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60 mt-2 flex-1">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="py-3 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={
                      task.completed
                        ? `Mark "${task.title}" incomplete`
                        : `Mark "${task.title}" complete`
                    }
                    className="mt-0.5 text-slate-400 hover:text-violet-400 transition-colors shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                      <span>{task.course}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {task.day} {task.startTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{task.durationMinutes} min</span>
                      {task.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300/90 font-medium">DEMO DATA</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent Study Activities + Quick Workspace Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Recent Activities
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live history of quizzes, PDF analyses, doubts, and completed topics
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'quiz', label: 'Quizzes' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'topic', label: 'Topics' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivityFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activityFilter === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-300">No activities recorded in this view yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Complete a quiz, upload lecture notes, or solve a doubt to see saved user activity here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60 mt-2">
              {filteredActivities.slice(0, 6).map((act) => (
                <li key={act.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{act.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span>{act.course}</span>
                      <span aria-hidden="true">·</span>
                      <span>{act.detail}</span>
                      <span aria-hidden="true">·</span>
                      <span className={act.isDemo ? 'text-amber-300/90 font-medium' : 'text-emerald-400'}>
                        {act.isDemo ? 'DEMO DATA' : 'Saved User Activity'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                    {act.timestamp}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="pb-4 border-b border-slate-800/70">
            <h3 className="font-display text-base font-semibold text-white">
              Study Modules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch any AI study assistant workspace
            </p>
          </div>

          <div className="divide-y divide-slate-800/60 mt-1">
            {TOOL_SHORTCUTS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onNavigate(tool.id)}
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-left group hover:bg-slate-800/30 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-violet-400 group-hover:border-violet-500/40 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 group-hover:text-white truncate">
                        {tool.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{tool.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
