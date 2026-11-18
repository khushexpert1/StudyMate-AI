import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  CopyCheck,
  Edit3,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { COURSES, SUBJECT_SAMPLE_TOPICS } from '../../data/demoData';
import { ApiError, generateStudyPlanWithAi } from '../../services/api';
import { ApiHealthStatus, DayOfWeek, StudyTask } from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface SubjectPlanInput {
  course: string;
  topics: string;
  examDate: string;
}

interface StudyPlannerViewProps {
  apiHealth: ApiHealthStatus | null;
  subjects: string[];
  dailyGoal: number;
  tasks: StudyTask[];
  onAddTask: (task: Omit<StudyTask, 'id' | 'completed' | 'isDemo'>) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<StudyTask, 'id' | 'isDemo'>>) => void;
  onAdoptDemoPlan: () => void;
  onAddGeneratedSchedule: (
    tasks: Array<Omit<StudyTask, 'id' | 'completed' | 'isDemo'>>,
    replaceDemoOnly?: boolean
  ) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onOpenSetupGuide?: () => void;
}

export const StudyPlannerView: React.FC<StudyPlannerViewProps> = ({
  apiHealth,
  subjects: enrolledSubjects,
  dailyGoal,
  tasks,
  onAddTask,
  onUpdateTask,
  onAdoptDemoPlan,
  onAddGeneratedSchedule,
  onToggleTask,
  onDeleteTask,
  onOpenSetupGuide,
}) => {
  const activeSubjects = enrolledSubjects.length > 0 ? enrolledSubjects : [...COURSES];
  const [selectedDay, setSelectedDay] = useState<'All' | DayOfWeek>('All');

  // AI Timetable Generator inputs initialized from student profile subjects & daily goal
  const [plannerSubjects, setPlannerSubjects] = useState<SubjectPlanInput[]>(() =>
    activeSubjects.slice(0, 4).map((subj, idx) => ({
      course: subj,
      topics: (SUBJECT_SAMPLE_TOPICS[subj] ?? ['Core concepts & practice problems'])
        .slice(0, 2)
        .join(', '),
      examDate: idx === 0 ? '2026-12-02' : idx === 1 ? '2026-12-05' : '2026-12-08',
    }))
  );
  const [dailyHours, setDailyHours] = useState(dailyGoal || 3);
  const [focusGoal, setFocusGoal] = useState('Balanced exam prep with daily problem sets');
  const [replaceSample, setReplaceSample] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual study block inputs
  const [course, setCourse] = useState<string>(activeSubjects[0]);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Wed');
  const [startTime, setStartTime] = useState('16:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Inline edit state for existing (including DEMO DATA) tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    course: string;
    day: DayOfWeek;
    startTime: string;
    durationMinutes: number;
    priority: 'High' | 'Medium' | 'Low';
  } | null>(null);

  useEffect(() => {
    if (!activeSubjects.includes(course)) {
      setCourse(activeSubjects[0]);
    }
  }, [activeSubjects, course]);

  useEffect(() => {
    setDailyHours(dailyGoal || 3);
  }, [dailyGoal]);

  const filteredTasks =
    selectedDay === 'All' ? tasks : tasks.filter((t) => t.day === selectedDay);

  const realTasksInView = filteredTasks.filter((t) => !t.isDemo);
  const demoTasksExist = tasks.some((t) => Boolean(t.isDemo));
  const realPlannedMinutes = realTasksInView.reduce((sum, t) => sum + t.durationMinutes, 0);
  const realCompletedMinutes = realTasksInView
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  const handleUpdateSubject = (index: number, field: keyof SubjectPlanInput, value: string) => {
    setPlannerSubjects((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddSubjectRow = () => {
    const nextCourse = activeSubjects[plannerSubjects.length % activeSubjects.length];
    const hint = (SUBJECT_SAMPLE_TOPICS[nextCourse] ?? []).slice(0, 2).join(', ');
    setPlannerSubjects((prev) => [...prev, { course: nextCourse, topics: hint, examDate: '' }]);
  };

  const handleRemoveSubjectRow = (index: number) => {
    if (plannerSubjects.length <= 1) return;
    setPlannerSubjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleGenerateTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validSubjects = plannerSubjects.filter((s) => s.course.trim() && s.topics.trim());
    if (validSubjects.length === 0) {
      setErrorMsg('Please enter at least one subject and its topics to generate a study timetable.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateStudyPlanWithAi({
        subjects: validSubjects,
        dailyHours,
        focusGoal,
      });

      onAddGeneratedSchedule(result.tasks, replaceSample);
      setSuccessMsg(
        `Generated ${result.tasks.length} study sessions. ${result.strategyNote}`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to generate study timetable with Gemini AI.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTask({
      day,
      course,
      title: trimmed,
      startTime,
      durationMinutes,
      priority,
    });
    setTitle('');
    setSuccessMsg('Added custom study block to your saved user schedule.');
  };

  const beginEditTask = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      course: task.course,
      day: task.day,
      startTime: task.startTime,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
    });
  };

  const saveEditTask = (taskId: string) => {
    if (!editDraft || !editDraft.title.trim()) return;
    onUpdateTask(taskId, {
      ...editDraft,
      title: editDraft.title.trim(),
    });
    setEditingTaskId(null);
    setEditDraft(null);
    setSuccessMsg('Study block updated and saved to your user study plan.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          AI Study Planner
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Edit the pre-loaded <span className="text-amber-300">DEMO DATA</span> Semester 1 study plan, add custom blocks, or generate a fresh AI timetable around your exam dates.
        </p>
      </div>

      <AiStatusBanner
        apiHealth={apiHealth}
        errorMessage={errorMsg}
        successMessage={successMsg}
        onDismissError={() => setErrorMsg(null)}
        onDismissSuccess={() => setSuccessMsg(null)}
        onOpenSetupGuide={onOpenSetupGuide}
      />

      {demoTasksExist && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-3 text-xs sm:text-sm">
          <div>
            <p className="font-medium text-amber-200">
              DEMO DATA Sample Study Plan Included
            </p>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Blocks tagged <span className="text-amber-300 font-medium">DEMO DATA</span> do not add to your actual logged study hours. Click Edit on any block to customize it into your personal plan, or adopt all sample blocks now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onAdoptDemoPlan();
              setSuccessMsg('Adopted sample study plan blocks into your saved user schedule.');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <CopyCheck className="h-3.5 w-3.5" />
            <span>Adopt Sample Plan as Mine</span>
          </button>
        </div>
      )}

      {/* AI Timetable Generator Panel */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Generate Realistic Daily Study Timetable
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritizes nearer exam dates while respecting your daily study hour budget
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSubjectRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Subject</span>
          </button>
        </div>

        <form onSubmit={handleGenerateTimetable} className="mt-4 space-y-4">
          <div className="space-y-3">
            {plannerSubjects.map((sub, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-[#0B1120] border border-slate-800/80 rounded-lg p-3"
              >
                <div className="md:col-span-3">
                  <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={sub.course}
                    onChange={(e) => handleUpdateSubject(idx, 'course', e.target.value)}
                    placeholder="e.g., Data-Driven AI"
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-[11px] text-slate-400 mb-1">Topics to Cover</label>
                  <input
                    type="text"
                    value={sub.topics}
                    onChange={(e) => handleUpdateSubject(idx, 'topics', e.target.value)}
                    placeholder="e.g., Gradient Descent, Train/Test Splits"
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] text-slate-400 mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={sub.examDate}
                    onChange={(e) => handleUpdateSubject(idx, 'examDate', e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end pt-4">
                  <button
                    type="button"
                    disabled={plannerSubjects.length <= 1}
                    onClick={() => handleRemoveSubjectRow(idx)}
                    aria-label="Remove subject"
                    className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-3">
              <label htmlFor="ai-daily-hours" className="block text-xs font-medium text-slate-300 mb-1">
                Available Study Hours / Day
              </label>
              <input
                id="ai-daily-hours"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="ai-focus-goal" className="block text-xs font-medium text-slate-300 mb-1">
                Study Preference
              </label>
              <input
                id="ai-focus-goal"
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="e.g., Afternoon problem sets, evening revision"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceSample}
                  onChange={(e) => setReplaceSample(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0B1120] text-violet-600 focus:ring-violet-500"
                />
                <span>Replace DEMO DATA blocks</span>
              </label>

              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{isGenerating ? 'Generating...' : 'Generate Timetable'}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Manual Add Study Block Form */}
        <section className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-white">
            Add Manual Study Block
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Schedule a custom session directly under your real progress
          </p>

          <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
            <div>
              <label htmlFor="planner-course" className="block text-xs font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                id="planner-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
              >
                {activeSubjects.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="planner-title" className="block text-xs font-medium text-slate-300 mb-1">
                Session Task
              </label>
              <input
                id="planner-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Practice Python dictionary problems"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="planner-day" className="block text-xs font-medium text-slate-300 mb-1">
                  Day
                </label>
                <select
                  id="planner-day"
                  value={day}
                  onChange={(e) => setDay(e.target.value as DayOfWeek)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="planner-time" className="block text-xs font-medium text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  id="planner-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="planner-duration" className="block text-xs font-medium text-slate-300 mb-1">
                  Duration (min)
                </label>
                <select
                  id="planner-duration"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none font-mono"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>120 min</option>
                </select>
              </div>

              <div>
                <label htmlFor="planner-priority" className="block text-xs font-medium text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  id="planner-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add to Schedule</span>
            </button>
          </form>
        </section>

        {/* Daily Schedule List with Inline Editing */}
        <section className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Weekly Study Timetable
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                Real saved blocks: {realCompletedMinutes} / {realPlannedMinutes} min completed
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B1120] border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedDay('All')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedDay === 'All'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedDay === d
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-300 font-medium">
                No study sessions scheduled for {selectedDay === 'All' ? 'this week' : selectedDay}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Generate a weekly timetable with Gemini AI or add a manual study block.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60 mt-2">
              {filteredTasks.map((task) => {
                const isEditing = editingTaskId === task.id && editDraft !== null;
                if (isEditing && editDraft) {
                  return (
                    <li key={task.id} className="py-3.5">
                      <div className="rounded-lg border border-violet-500/40 bg-[#0B1120] p-3.5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] text-slate-400 mb-1">Task</label>
                            <input
                              type="text"
                              value={editDraft.title}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, title: e.target.value })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                            <select
                              value={editDraft.course}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, course: e.target.value })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
                            >
                              {Array.from(new Set([...activeSubjects, editDraft.course])).map(
                                (c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Day</label>
                            <select
                              value={editDraft.day}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, day: e.target.value as DayOfWeek })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
                            >
                              {DAYS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Time</label>
                            <input
                              type="time"
                              value={editDraft.startTime}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, startTime: e.target.value })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Minutes</label>
                            <input
                              type="number"
                              min={15}
                              max={240}
                              step={15}
                              value={editDraft.durationMinutes}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  durationMinutes: Number(e.target.value) || 45,
                                })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Priority</label>
                            <select
                              value={editDraft.priority}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  priority: e.target.value as 'High' | 'Medium' | 'Low',
                                })
                              }
                              className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(null);
                              setEditDraft(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-700 text-slate-300 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditTask(task.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Save Block</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={task.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
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

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                          <span>{task.course}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {task.day} at {task.startTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{task.durationMinutes} min</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'High'
                                ? 'text-rose-300'
                                : task.priority === 'Medium'
                                ? 'text-amber-300'
                                : 'text-slate-400'
                            }
                          >
                            {task.priority} Priority
                          </span>
                          {task.isDemo ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-300/90 font-medium">DEMO DATA</span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400">Saved Plan</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => beginEditTask(task)}
                        aria-label={`Edit "${task.title}"`}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete "${task.title}"`}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
