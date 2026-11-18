import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COURSES } from '../../data/demoData';
import { QuizAttempt, StudyTask, TopicProgress, TopicStatus } from '../../types/study';
import { DemoNoticeBanner } from '../DemoNoticeBanner';

interface ProgressTrackerViewProps {
  subjects: string[];
  includeSampleData: boolean;
  onToggleSampleData: (include: boolean) => void;
  // Strictly isolated real user metrics
  totalWeeklyHours: number;
  avgQuizScore: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  realTopics: TopicProgress[];
  realQuizzes: QuizAttempt[];
  // Isolated DEMO DATA baselines
  demoTotalWeeklyHours: number;
  demoAvgQuizScore: number;
  demoCompletedTopicsCount: number;
  demoTotalTopicsCount: number;
  demoCompletedTasksCount: number;
  demoTotalTasksCount: number;
  demoQuizzes: QuizAttempt[];
  // Lists & mutations
  topics: TopicProgress[];
  quizAttempts: QuizAttempt[];
  studyTasks: StudyTask[];
  onUpdateTopicStatus: (id: string, status: TopicStatus) => void;
  onAddTopic: (course: string, title: string, estimatedMinutes: number) => void;
}

export const ProgressTrackerView: React.FC<ProgressTrackerViewProps> = ({
  subjects,
  includeSampleData,
  onToggleSampleData,
  totalWeeklyHours,
  avgQuizScore,
  completedTopicsCount,
  totalTopicsCount,
  completedTasksCount,
  totalTasksCount,
  realTopics,
  realQuizzes,
  demoTotalWeeklyHours,
  demoAvgQuizScore,
  demoCompletedTopicsCount,
  demoTotalTopicsCount,
  demoCompletedTasksCount,
  demoTotalTasksCount,
  demoQuizzes,
  topics,
  quizAttempts,
  onUpdateTopicStatus,
  onAddTopic,
}) => {
  const activeSubjects = useMemo(() => {
    const base = subjects.length > 0 ? subjects : [...COURSES];
    const extraCourses = topics.map((t) => t.course);
    return Array.from(new Set([...base, ...extraCourses]));
  }, [subjects, topics]);

  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [newCourse, setNewCourse] = useState<string>(activeSubjects[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(60);

  useEffect(() => {
    if (!activeSubjects.includes(newCourse)) {
      setNewCourse(activeSubjects[0]);
    }
  }, [activeSubjects, newCourse]);

  // Visible checklists/tables respect the Preview DEMO DATA toggle, while NEVER mixing averages
  const visibleTopics = useMemo(
    () => (includeSampleData ? topics : topics.filter((t) => !t.isDemo)),
    [topics, includeSampleData]
  );

  const visibleAttempts = useMemo(
    () => (includeSampleData ? quizAttempts : quizAttempts.filter((a) => !a.isDemo)),
    [quizAttempts, includeSampleData]
  );

  // Per-subject cards & charts compute Real User Progress and DEMO DATA strictly separately
  const courseSummaries = useMemo(() => {
    return activeSubjects.map((courseName) => {
      const realCourseTopics = realTopics.filter((t) => t.course === courseName);
      const realDone = realCourseTopics.filter((t) => t.status === 'completed').length;
      const realPct =
        realCourseTopics.length > 0
          ? Math.round((realDone / realCourseTopics.length) * 100)
          : 0;

      const realCourseQuizzes = realQuizzes.filter((a) => a.course === courseName);
      const realQuizAvg =
        realCourseQuizzes.length > 0
          ? Math.round(
              realCourseQuizzes.reduce((sum, q) => sum + q.scorePercent, 0) /
                realCourseQuizzes.length
            )
          : 0;

      const demoCourseTopics = topics.filter((t) => Boolean(t.isDemo) && t.course === courseName);
      const demoDone = demoCourseTopics.filter((t) => t.status === 'completed').length;
      const demoPct =
        demoCourseTopics.length > 0
          ? Math.round((demoDone / demoCourseTopics.length) * 100)
          : 0;

      const demoCourseQuizzes = demoQuizzes.filter((a) => a.course === courseName);
      const demoQuizAvg =
        demoCourseQuizzes.length > 0
          ? Math.round(
              demoCourseQuizzes.reduce((sum, q) => sum + q.scorePercent, 0) /
                demoCourseQuizzes.length
            )
          : 0;

      return {
        courseName,
        shortCode: courseName.length > 14 ? `${courseName.slice(0, 12)}…` : courseName,
        realTotalTopics: realCourseTopics.length,
        realCompletedTopics: realDone,
        realCompletionPct: realPct,
        realAvgScore: realQuizAvg,
        realQuizCount: realCourseQuizzes.length,
        demoTotalTopics: demoCourseTopics.length,
        demoCompletedTopics: demoDone,
        demoCompletionPct: demoPct,
        demoAvgScore: demoQuizAvg,
      };
    });
  }, [activeSubjects, realTopics, realQuizzes, topics, demoQuizzes]);

  // Quiz score trend plots ONLY real user quiz attempts unless no real attempts exist and Preview DEMO DATA is active
  const showingDemoTrend = realQuizzes.length === 0 && includeSampleData && demoQuizzes.length > 0;
  const scoreTrendData = useMemo(() => {
    const source = showingDemoTrend ? demoQuizzes : realQuizzes;
    return [...source]
      .reverse()
      .map((a, idx) => ({
        label: `#${idx + 1}`,
        title: a.quizTitle,
        score: a.scorePercent,
      }));
  }, [showingDemoTrend, demoQuizzes, realQuizzes]);

  const filteredTopics =
    courseFilter === 'All'
      ? visibleTopics
      : visibleTopics.filter((t) => t.course === courseFilter);

  const handleAddTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTopic(newCourse, newTitle.trim(), newMinutes);
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Progress Tracker
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track your real completed topics, quiz scores, and logged study hours. Sample{' '}
            <span className="text-amber-300 font-medium">DEMO DATA</span> is never mixed into your actual progress.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0F172A] border border-slate-800 self-start sm:self-auto shrink-0">
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
      </div>

      {/* Actual User Progress vs DEMO DATA Isolated Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-4">
          <p className="text-xs text-slate-400">Your Weekly Study Hours</p>
          <p className="font-mono text-2xl font-semibold text-white mt-1 tabular-nums">
            {totalWeeklyHours} hrs
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Actual logged sessions
            {includeSampleData && (
              <span className="block text-amber-300/85 tabular-nums">
                DEMO DATA: {demoTotalWeeklyHours} hrs (separate)
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-4">
          <p className="text-xs text-slate-400">Your Average Quiz Score</p>
          <p className="font-mono text-2xl font-semibold text-white mt-1 tabular-nums">
            {avgQuizScore}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {realQuizzes.length} real attempt{realQuizzes.length === 1 ? '' : 's'}
            {includeSampleData && (
              <span className="block text-amber-300/85 tabular-nums">
                DEMO DATA: {demoAvgQuizScore}% (separate)
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-4">
          <p className="text-xs text-slate-400">Your Completed Topics</p>
          <p className="font-mono text-2xl font-semibold text-white mt-1 tabular-nums">
            {completedTopicsCount} / {totalTopicsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            User-updated syllabus modules
            {includeSampleData && (
              <span className="block text-amber-300/85 tabular-nums">
                DEMO DATA: {demoCompletedTopicsCount}/{demoTotalTopicsCount} (separate)
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-4">
          <p className="text-xs text-slate-400">Your Completed Study Blocks</p>
          <p className="font-mono text-2xl font-semibold text-white mt-1 tabular-nums">
            {completedTasksCount} / {totalTasksCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Saved custom &amp; adopted blocks
            {includeSampleData && (
              <span className="block text-amber-300/85 tabular-nums">
                DEMO DATA: {demoCompletedTasksCount}/{demoTotalTasksCount} (separate)
              </span>
            )}
          </p>
        </div>
      </section>

      {!includeSampleData && realQuizzes.length === 0 && realTopics.length === 0 && (
        <DemoNoticeBanner
          title="Real activity filter active — no user-recorded topics or quizzes yet"
          description="Complete a quiz in Quiz Generator, add a syllabus topic below, or toggle Preview DEMO DATA to inspect the Semester 1 sample workspace."
          actionLabel="Preview DEMO DATA"
          onAction={() => onToggleSampleData(true)}
        />
      )}

      {/* Subject Mastery Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {courseSummaries.map((c) => (
          <div
            key={c.courseName}
            className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-white leading-snug">
                {c.courseName}
              </h3>
              <span className="font-mono text-xs font-semibold text-violet-300 tabular-nums shrink-0">
                {c.realCompletionPct}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-200"
                style={{ width: `${c.realCompletionPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>
                {c.realCompletedTopics}/{c.realTotalTopics} real topics
              </span>
              <span>
                {c.realQuizCount > 0 ? `Your avg: ${c.realAvgScore}%` : 'No real quiz'}
              </span>
            </div>

            {includeSampleData && c.demoTotalTopics > 0 && (
              <p className="text-[11px] text-amber-300/85 border-t border-slate-800/70 pt-2 font-mono tabular-nums">
                DEMO DATA: {c.demoCompletedTopics}/{c.demoTotalTopics} topics · {c.demoAvgScore}% sample avg
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Recharts Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 min-w-0 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="pb-4 border-b border-slate-800/70 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                {showingDemoTrend ? 'Quiz Score Trend (DEMO DATA Preview)' : 'Your Quiz Score Trend'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {showingDemoTrend
                  ? `${demoQuizzes.length} DEMO DATA sample attempts (kept separate from your real score)`
                  : `${realQuizzes.length} real attempt(s) · ${completedTasksCount} study block(s) completed`}
              </p>
            </div>
          </div>

          {scoreTrendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 text-center px-4">
              Complete a quiz in Quiz Generator to visualize your actual score trend here.
            </div>
          ) : (
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={scoreTrendData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1120',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name={showingDemoTrend ? 'DEMO DATA Score (%)' : 'Your Score (%)'}
                    stroke={showingDemoTrend ? '#FBBF24' : '#8B5CF6'}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: showingDemoTrend ? '#FCD34D' : '#A78BFA' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="lg:col-span-6 min-w-0 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="pb-4 border-b border-slate-800/70">
            <h3 className="font-display text-base font-semibold text-white">
              Actual Progress vs DEMO DATA by Subject
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your real topic completion % and real quiz average (amber = DEMO DATA reference)
            </p>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={courseSummaries} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="shortCode" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Bar dataKey="realCompletionPct" name="Your Topics Done (%)" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realAvgScore" name="Your Quiz Avg (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                {includeSampleData && (
                  <Bar dataKey="demoAvgScore" name="DEMO DATA Quiz (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Topic Mastery Checklist */}
        <section className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Subject Topic Checklist
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Updating a topic converts it into saved real user progress in localStorage
              </p>
            </div>

            <select
              aria-label="Filter topics by subject"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-1.5 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              <option value="All">All Subjects</option>
              {activeSubjects.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddTopicSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <select
              aria-label="New topic subject"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              className="sm:col-span-4 rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 py-2 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              {activeSubjects.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add syllabus topic..."
              className="sm:col-span-5 rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
            <input
              type="number"
              min={15}
              max={300}
              step={15}
              value={newMinutes}
              onChange={(e) => setNewMinutes(Number(e.target.value))}
              aria-label="Estimated study minutes"
              className="sm:col-span-1 rounded-lg border border-slate-800 bg-[#0B1120] px-2 py-2 text-xs text-slate-200 font-mono text-center focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          {filteredTopics.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-300">No topics found in this view</p>
              <p className="text-xs text-slate-400 mt-1">
                Add a syllabus topic above to begin tracking real progress.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {filteredTopics.map((topic) => (
                <li
                  key={topic.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {topic.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                      {topic.course} · {topic.estimatedMinutes} min
                      <span className={topic.isDemo ? ' text-amber-300/90 font-medium' : ' text-emerald-400'}>
                        {topic.isDemo ? ' · DEMO DATA' : ' · Saved User Progress'}
                      </span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#0B1120] border border-slate-800 self-start sm:self-center shrink-0">
                    {(
                      [
                        { id: 'not-started', label: 'Todo' },
                        { id: 'in-progress', label: 'Studying' },
                        { id: 'completed', label: 'Done' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateTopicStatus(topic.id, opt.id)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                          topic.status === opt.id
                            ? opt.id === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : opt.id === 'in-progress'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quiz Score History Table */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="pb-4 border-b border-slate-800/70">
            <h3 className="font-display text-base font-semibold text-white">
              Quiz Score History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real quiz attempts clearly separated from DEMO DATA records
            </p>
          </div>

          {visibleAttempts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-300">No real quiz attempts recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Complete a quiz in Quiz Generator to record your real score here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                    <th className="py-2.5 pr-3">Quiz</th>
                    <th className="py-2.5 px-2 text-right">Result</th>
                    <th className="py-2.5 pl-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {visibleAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-slate-100">{attempt.quizTitle}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {attempt.course} · {attempt.completedAt}
                          <span className={attempt.isDemo ? ' text-amber-300/90 font-medium' : ' text-emerald-400'}>
                            {attempt.isDemo ? ' · DEMO DATA' : ' · Real Attempt'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {attempt.correctCount}/{attempt.totalQuestions}
                      </td>
                      <td
                        className={`py-2.5 pl-2 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                          attempt.scorePercent >= 85
                            ? 'text-emerald-400'
                            : attempt.scorePercent >= 70
                            ? 'text-violet-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {attempt.scorePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
