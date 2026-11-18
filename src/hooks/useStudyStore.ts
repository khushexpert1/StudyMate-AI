import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_STUDENT_PROFILE, EMPTY_STATE, INITIAL_DEMO_STATE } from '../data/demoData';
import {
  ActivityCategory,
  DayOfWeek,
  DoubtChatThread,
  DoubtMessage,
  ExamNote,
  NoteAnalysis,
  QuizAttempt,
  QuizPack,
  StudentProfile,
  StudyNoteDoc,
  StudyStoreState,
  StudyTask,
  TopicStatus,
} from '../types/study';

const STORAGE_KEY = 'studymate_ai_workspace_v1';

function buildDefaultRealHours(targetHours = 3.0) {
  return (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as DayOfWeek[]).map((day) => ({
    day,
    hours: 0,
    targetHours,
  }));
}

function buildInitialDoubtThreads(demoMessages: DoubtMessage[]): DoubtChatThread[] {
  if (demoMessages.length === 0) return [];
  return [
    {
      id: 'thread-demo-1',
      title: 'Feature Scaling & Gradient Descent (DEMO DATA)',
      subject: demoMessages[0].subject,
      updatedAt: 'DEMO DATA',
      messages: demoMessages,
      isDemo: true,
    },
  ];
}

function loadInitialState(): StudyStoreState {
  if (typeof window === 'undefined') {
    return INITIAL_DEMO_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_DEMO_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<StudyStoreState>;

    // Upgrade older schema v1 storage cleanly: preserve all user-created (!isDemo) items
    // while refreshing demo data to the AI/ML Semester 1 defaults.
    if (parsed.schemaVersion !== 2) {
      const realActivities = (parsed.activities ?? []).filter((a) => !a.isDemo);
      const realNotes = (parsed.uploadedNotes ?? []).filter((n) => !n.isDemo);
      const realThreads = (parsed.doubtThreads ?? []).filter((t) => !t.isDemo);
      const realQuizzes = parsed.savedQuizzes ?? [];
      const realAttempts = (parsed.quizAttempts ?? []).filter((a) => !a.isDemo);
      const realTasks = (parsed.studyTasks ?? []).filter((t) => !t.isDemo);
      const realExamNotes = (parsed.examNotes ?? []).filter((n) => !n.isDemo);
      const realTopics = (parsed.topics ?? []).filter((t) => !t.isDemo);
      const hasDemo = parsed.hasDemoData ?? true;

      const base = hasDemo ? INITIAL_DEMO_STATE : EMPTY_STATE;
      return {
        ...base,
        schemaVersion: 2,
        hasDemoData: hasDemo,
        includeSampleData: parsed.includeSampleData ?? hasDemo,
        onboardingDismissed: parsed.onboardingDismissed ?? false,
        studentProfile: parsed.studentProfile ?? DEFAULT_STUDENT_PROFILE,
        realStudyHours: parsed.realStudyHours ?? buildDefaultRealHours(DEFAULT_STUDENT_PROFILE.dailyStudyHoursGoal),
        activities: [...realActivities, ...base.activities],
        uploadedNotes: [...realNotes, ...base.uploadedNotes],
        doubtThreads: [...realThreads, ...base.doubtThreads],
        activeDoubtThreadId: realThreads[0]?.id ?? base.activeDoubtThreadId,
        savedQuizzes: realQuizzes,
        quizAttempts: [...realAttempts, ...base.quizAttempts],
        studyTasks: [...realTasks, ...base.studyTasks],
        examNotes: [...realExamNotes, ...base.examNotes],
        topics: [...realTopics, ...base.topics],
      };
    }

    const doubtMessages = parsed.doubtMessages ?? INITIAL_DEMO_STATE.doubtMessages;
    const doubtThreads =
      parsed.doubtThreads && parsed.doubtThreads.length > 0
        ? parsed.doubtThreads
        : buildInitialDoubtThreads(doubtMessages);

    return {
      ...INITIAL_DEMO_STATE,
      ...parsed,
      schemaVersion: 2,
      includeSampleData: parsed.includeSampleData ?? true,
      onboardingDismissed: parsed.onboardingDismissed ?? false,
      studentProfile: {
        ...DEFAULT_STUDENT_PROFILE,
        ...(parsed.studentProfile ?? {}),
        subjects:
          parsed.studentProfile?.subjects && parsed.studentProfile.subjects.length > 0
            ? parsed.studentProfile.subjects
            : DEFAULT_STUDENT_PROFILE.subjects,
      },
      weeklyHours: parsed.weeklyHours ?? INITIAL_DEMO_STATE.weeklyHours,
      realStudyHours:
        parsed.realStudyHours ??
        buildDefaultRealHours(parsed.studentProfile?.dailyStudyHoursGoal ?? 3.0),
      activities: parsed.activities ?? INITIAL_DEMO_STATE.activities,
      uploadedNotes: parsed.uploadedNotes ?? INITIAL_DEMO_STATE.uploadedNotes,
      doubtMessages,
      doubtThreads,
      activeDoubtThreadId: parsed.activeDoubtThreadId ?? (doubtThreads[0]?.id ?? null),
      savedQuizzes: parsed.savedQuizzes ?? [],
      quizAttempts: parsed.quizAttempts ?? INITIAL_DEMO_STATE.quizAttempts,
      studyTasks: parsed.studyTasks ?? INITIAL_DEMO_STATE.studyTasks,
      examNotes: parsed.examNotes ?? INITIAL_DEMO_STATE.examNotes,
      topics: parsed.topics ?? INITIAL_DEMO_STATE.topics,
    };
  } catch {
    return INITIAL_DEMO_STATE;
  }
}

export function useStudyStore() {
  const [state, setState] = useState<StudyStoreState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  const appendActivity = (
    prev: StudyStoreState,
    title: string,
    course: string,
    category: ActivityCategory,
    detail: string
  ) => {
    const newItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      course,
      category,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      detail,
      isDemo: false,
    };
    return [newItem, ...prev.activities].slice(0, 40);
  };

  const resetToDemoData = () => {
    setState((prev) => ({
      ...INITIAL_DEMO_STATE,
      studentProfile: prev.studentProfile ?? DEFAULT_STUDENT_PROFILE,
      onboardingDismissed: false,
    }));
  };

  const clearAllData = () => {
    setState((prev) => ({
      ...EMPTY_STATE,
      studentProfile: prev.studentProfile ?? DEFAULT_STUDENT_PROFILE,
      onboardingDismissed: prev.onboardingDismissed,
    }));
  };

  const setIncludeSampleData = (include: boolean) => {
    setState((prev) => ({
      ...prev,
      includeSampleData: include,
    }));
  };

  const dismissOnboarding = () => {
    setState((prev) => ({
      ...prev,
      onboardingDismissed: true,
    }));
  };

  const reopenOnboarding = () => {
    setState((prev) => ({
      ...prev,
      onboardingDismissed: false,
    }));
  };

  // Student Profile actions
  const updateStudentProfile = (updates: Partial<StudentProfile>) => {
    setState((prev) => {
      const nextProfile: StudentProfile = {
        ...prev.studentProfile,
        ...updates,
      };
      const nextTarget = Math.max(0.5, Number(nextProfile.dailyStudyHoursGoal) || 3);
      return {
        ...prev,
        studentProfile: nextProfile,
        realStudyHours: prev.realStudyHours.map((d) => ({
          ...d,
          targetHours: nextTarget,
        })),
        activities: appendActivity(
          prev,
          `Updated Student Profile (${nextProfile.branch} · Sem ${nextProfile.semester})`,
          nextProfile.subjects[0] || 'Profile',
          'topic',
          `${nextProfile.subjects.length} subjects · ${nextTarget}h/day goal`
        ),
      };
    });
  };

  const addSubject = (subjectName: string): boolean => {
    const trimmed = subjectName.trim();
    if (!trimmed) return false;
    let added = false;
    setState((prev) => {
      const exists = prev.studentProfile.subjects.some(
        (s) => s.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return prev;
      added = true;
      return {
        ...prev,
        studentProfile: {
          ...prev.studentProfile,
          subjects: [...prev.studentProfile.subjects, trimmed],
        },
        activities: appendActivity(
          prev,
          `Added Subject: ${trimmed}`,
          trimmed,
          'topic',
          `${prev.studentProfile.branch} · Semester ${prev.studentProfile.semester}`
        ),
      };
    });
    return added;
  };

  const removeSubject = (subjectName: string) => {
    setState((prev) => {
      if (prev.studentProfile.subjects.length <= 1) return prev;
      return {
        ...prev,
        studentProfile: {
          ...prev.studentProfile,
          subjects: prev.studentProfile.subjects.filter((s) => s !== subjectName),
        },
      };
    });
  };

  const renameSubject = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setState((prev) => {
      const duplicate = prev.studentProfile.subjects.some(
        (s) => s !== oldName && s.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) return prev;

      return {
        ...prev,
        studentProfile: {
          ...prev.studentProfile,
          subjects: prev.studentProfile.subjects.map((s) => (s === oldName ? trimmed : s)),
        },
        topics: prev.topics.map((t) =>
          t.course === oldName && !t.isDemo ? { ...t, course: trimmed } : t
        ),
        studyTasks: prev.studyTasks.map((t) =>
          t.course === oldName && !t.isDemo ? { ...t, course: trimmed } : t
        ),
        uploadedNotes: prev.uploadedNotes.map((n) =>
          n.course === oldName && !n.isDemo ? { ...n, course: trimmed } : n
        ),
        examNotes: prev.examNotes.map((n) =>
          n.course === oldName && !n.isDemo ? { ...n, course: trimmed } : n
        ),
      };
    });
  };

  // Notes Analyzer actions
  const addUploadedNote = (doc: Omit<StudyNoteDoc, 'id' | 'uploadedAt' | 'isDemo'>) => {
    const newDoc: StudyNoteDoc = {
      ...doc,
      id: `note-${Date.now()}`,
      uploadedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      uploadedNotes: [newDoc, ...prev.uploadedNotes],
      activities: appendActivity(
        prev,
        `Uploaded Notes: ${doc.fileName}`,
        doc.course,
        'notes',
        `${doc.pageCount} page(s) · Text extracted`
      ),
    }));
    return newDoc;
  };

  const saveNoteAnalysis = (noteId: string, analysis: NoteAnalysis) => {
    setState((prev) => {
      const target = prev.uploadedNotes.find((n) => n.id === noteId);
      const updatedNotes = prev.uploadedNotes.map((n) =>
        n.id === noteId
          ? {
              ...n,
              analysis,
              keyConcepts: analysis.importantTopics,
            }
          : n
      );
      return {
        ...prev,
        uploadedNotes: updatedNotes,
        activities: target
          ? appendActivity(
              prev,
              `Analyzed Notes with AI: ${target.fileName}`,
              target.course,
              'notes',
              `${analysis.importantTopics.length} topics · ${analysis.examQuestions.length} exam questions`
            )
          : prev.activities,
      };
    });
  };

  const removeUploadedNote = (id: string) => {
    setState((prev) => ({
      ...prev,
      uploadedNotes: prev.uploadedNotes.filter((n) => n.id !== id),
    }));
  };

  // Doubt Solver multi-thread actions
  const createDoubtThread = (subject: string, firstPrompt?: string) => {
    const threadId = `thread-${Date.now()}`;
    const newThread: DoubtChatThread = {
      id: threadId,
      title: firstPrompt
        ? `${firstPrompt.slice(0, 40)}${firstPrompt.length > 40 ? '...' : ''}`
        : `New Chat · ${subject}`,
      subject,
      updatedAt: 'Just now',
      messages: [],
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      doubtThreads: [newThread, ...prev.doubtThreads],
      activeDoubtThreadId: threadId,
    }));
    return threadId;
  };

  const selectDoubtThread = (threadId: string) => {
    setState((prev) => ({
      ...prev,
      activeDoubtThreadId: threadId,
    }));
  };

  const appendDoubtExchange = (
    threadId: string | null,
    subject: string,
    question: string,
    reply: { role: 'assistant' | 'system-notice'; content: string }
  ) => {
    const now = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const userMsg: DoubtMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      subject,
      content: question,
      timestamp: now,
      isDemo: false,
    };
    const replyMsg: DoubtMessage = {
      id: `msg-${Date.now()}-a`,
      role: reply.role,
      subject,
      content: reply.content,
      timestamp: now,
      isDemo: false,
    };

    setState((prev) => {
      const targetId = threadId || prev.activeDoubtThreadId;
      const existing = prev.doubtThreads.find((t) => t.id === targetId);
      let nextThreads: DoubtChatThread[];
      let finalThreadId = targetId;

      if (existing) {
        nextThreads = prev.doubtThreads.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                subject,
                title:
                  t.messages.length === 0 || t.title.startsWith('New Chat')
                    ? `${question.slice(0, 42)}${question.length > 42 ? '...' : ''}`
                    : t.title,
                updatedAt: now,
                isDemo: false,
                messages: [...t.messages, userMsg, replyMsg],
              }
            : t
        );
      } else {
        finalThreadId = `thread-${Date.now()}`;
        nextThreads = [
          {
            id: finalThreadId,
            title: `${question.slice(0, 42)}${question.length > 42 ? '...' : ''}`,
            subject,
            updatedAt: now,
            isDemo: false,
            messages: [userMsg, replyMsg],
          },
          ...prev.doubtThreads,
        ];
      }

      return {
        ...prev,
        doubtThreads: nextThreads,
        activeDoubtThreadId: finalThreadId,
        activities:
          reply.role === 'assistant'
            ? appendActivity(
                prev,
                `Solved Doubt: ${question.slice(0, 48)}${question.length > 48 ? '...' : ''}`,
                subject,
                'doubt',
                'Step-by-step AI explanation'
              )
            : prev.activities,
      };
    });
  };

  const clearDoubtMessages = () => {
    setState((prev) => ({
      ...prev,
      doubtMessages: [],
      doubtThreads: [],
      activeDoubtThreadId: null,
    }));
  };

  // Quiz Generator actions
  const saveGeneratedQuiz = (quiz: Omit<QuizPack, 'id' | 'isDemo' | 'createdAt'>) => {
    const newPack: QuizPack = {
      ...quiz,
      id: `quiz-ai-${Date.now()}`,
      isDemo: false,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    setState((prev) => ({
      ...prev,
      savedQuizzes: [newPack, ...prev.savedQuizzes],
      activities: appendActivity(
        prev,
        `Generated AI Quiz: ${quiz.title}`,
        quiz.course,
        'quiz',
        `${quiz.questions.length} MCQs · ${quiz.difficulty}`
      ),
    }));
    return newPack;
  };

  const deleteSavedQuiz = (id: string) => {
    setState((prev) => ({
      ...prev,
      savedQuizzes: prev.savedQuizzes.filter((q) => q.id !== id),
    }));
  };

  const recordQuizAttempt = (attempt: Omit<QuizAttempt, 'id' | 'completedAt' | 'isDemo'>) => {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `attempt-${Date.now()}`,
      completedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      quizAttempts: [newAttempt, ...prev.quizAttempts],
      activities: appendActivity(
        prev,
        `Completed Quiz: ${attempt.quizTitle}`,
        attempt.course,
        'quiz',
        `Scored ${attempt.scorePercent}% (${attempt.correctCount}/${attempt.totalQuestions} correct)`
      ),
    }));
  };

  // Study Planner actions
  const addStudyTask = (task: Omit<StudyTask, 'id' | 'completed' | 'isDemo'>) => {
    const newTask: StudyTask = {
      ...task,
      id: `task-${Date.now()}`,
      completed: false,
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      studyTasks: [...prev.studyTasks, newTask],
      activities: appendActivity(
        prev,
        `Scheduled Study Block: ${task.title}`,
        task.course,
        'planner',
        `${task.day} at ${task.startTime} · ${task.durationMinutes} min`
      ),
    }));
  };

  const updateStudyTask = (
    id: string,
    updates: Partial<Omit<StudyTask, 'id' | 'isDemo'>>
  ) => {
    setState((prev) => {
      const target = prev.studyTasks.find((t) => t.id === id);
      if (!target) return prev;
      const updatedTask: StudyTask = {
        ...target,
        ...updates,
        // Editing a sample task turns it into the student's customized saved plan item
        isDemo: false,
      };
      const nextTasks = prev.studyTasks.map((t) => (t.id === id ? updatedTask : t));
      return {
        ...prev,
        studyTasks: nextTasks,
        activities: appendActivity(
          prev,
          `Edited Study Block: ${updatedTask.title}`,
          updatedTask.course,
          'planner',
          `${updatedTask.day} at ${updatedTask.startTime} · ${updatedTask.durationMinutes} min`
        ),
      };
    });
  };

  const adoptDemoPlanAsUserPlan = () => {
    setState((prev) => {
      const demoTasks = prev.studyTasks.filter((t) => t.isDemo);
      if (demoTasks.length === 0) return prev;
      const nextTasks = prev.studyTasks.map((t) =>
        t.isDemo ? { ...t, isDemo: false, completed: false } : t
      );
      return {
        ...prev,
        studyTasks: nextTasks,
        activities: appendActivity(
          prev,
          `Adopted Sample Study Plan (${demoTasks.length} blocks)`,
          prev.studentProfile.subjects[0] || 'Study Planner',
          'planner',
          'Now tracked under your saved user plan'
        ),
      };
    });
  };

  const addGeneratedSchedule = (
    tasks: Array<Omit<StudyTask, 'id' | 'completed' | 'isDemo'>>,
    replaceDemoOnly = true
  ) => {
    const created: StudyTask[] = tasks.map((t, idx) => ({
      ...t,
      id: `task-ai-${Date.now()}-${idx}`,
      completed: false,
      isDemo: false,
    }));

    setState((prev) => {
      const keptTasks = replaceDemoOnly
        ? prev.studyTasks.filter((t) => !t.isDemo)
        : prev.studyTasks;
      return {
        ...prev,
        studyTasks: [...created, ...keptTasks],
        activities: appendActivity(
          prev,
          `Generated AI Weekly Timetable (${created.length} blocks)`,
          created[0]?.course || 'Study Plan',
          'planner',
          'Saved to Study Planner'
        ),
      };
    });
  };

  const toggleStudyTask = (id: string) => {
    setState((prev) => {
      const target = prev.studyTasks.find((t) => t.id === id);
      if (!target) return prev;
      const nextCompleted = !target.completed;
      const nextTasks = prev.studyTasks.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted } : t
      );
      const deltaHours = Number((target.durationMinutes / 60).toFixed(2));

      // CRITICAL: Never mix DEMO DATA study hours into real user study hours
      const nextWeeklyHours = target.isDemo
        ? prev.weeklyHours.map((d) =>
            d.day === target.day
              ? {
                  ...d,
                  hours: Math.max(
                    0,
                    Number((d.hours + (nextCompleted ? deltaHours : -deltaHours)).toFixed(1))
                  ),
                }
              : d
          )
        : prev.weeklyHours;

      const nextRealHours = !target.isDemo
        ? prev.realStudyHours.map((d) =>
            d.day === target.day
              ? {
                  ...d,
                  hours: Math.max(
                    0,
                    Number((d.hours + (nextCompleted ? deltaHours : -deltaHours)).toFixed(1))
                  ),
                }
              : d
          )
        : prev.realStudyHours;

      return {
        ...prev,
        studyTasks: nextTasks,
        weeklyHours: nextWeeklyHours,
        realStudyHours: nextRealHours,
        activities:
          nextCompleted && !target.isDemo
            ? appendActivity(
                prev,
                `Completed Study Session: ${target.title}`,
                target.course,
                'planner',
                `${target.durationMinutes} min logged`
              )
            : prev.activities,
      };
    });
  };

  const deleteStudyTask = (id: string) => {
    setState((prev) => {
      const target = prev.studyTasks.find((t) => t.id === id);
      if (!target) return prev;
      const deltaHours = target.completed ? Number((target.durationMinutes / 60).toFixed(2)) : 0;
      const nextRealHours =
        !target.isDemo && deltaHours > 0
          ? prev.realStudyHours.map((d) =>
              d.day === target.day
                ? { ...d, hours: Math.max(0, Number((d.hours - deltaHours).toFixed(1))) }
                : d
            )
          : prev.realStudyHours;

      return {
        ...prev,
        studyTasks: prev.studyTasks.filter((t) => t.id !== id),
        realStudyHours: nextRealHours,
      };
    });
  };

  // Exam Notes actions
  const addExamNote = (note: Omit<ExamNote, 'id' | 'updatedAt' | 'bookmarked' | 'isDemo'>) => {
    const newNote: ExamNote = {
      ...note,
      id: `exam-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      bookmarked: false,
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      examNotes: [newNote, ...prev.examNotes],
      activities: appendActivity(
        prev,
        `Saved Exam Note: ${note.title}`,
        note.course,
        'notes',
        `${note.detailLevel ? note.detailLevel.toUpperCase() + ' · ' : ''}${note.keyPoints.length} key points`
      ),
    }));
  };

  const toggleExamNoteBookmark = (id: string) => {
    setState((prev) => ({
      ...prev,
      examNotes: prev.examNotes.map((n) =>
        n.id === id ? { ...n, bookmarked: !n.bookmarked } : n
      ),
    }));
  };

  const deleteExamNote = (id: string) => {
    setState((prev) => ({
      ...prev,
      examNotes: prev.examNotes.filter((n) => n.id !== id),
    }));
  };

  // Progress Tracker topic actions
  const updateTopicStatus = (id: string, status: TopicStatus) => {
    setState((prev) => {
      const target = prev.topics.find((t) => t.id === id);
      const nextTopics = prev.topics.map((t) =>
        t.id === id ? { ...t, status, isDemo: false } : t
      );
      const label =
        status === 'completed'
          ? 'Completed'
          : status === 'in-progress'
          ? 'In Progress'
          : 'Not Started';
      return {
        ...prev,
        topics: nextTopics,
        activities: target
          ? appendActivity(
              prev,
              `Topic Marked ${label}: ${target.title}`,
              target.course,
              'topic',
              `${target.estimatedMinutes} min module`
            )
          : prev.activities,
      };
    });
  };

  const addTopic = (course: string, title: string, estimatedMinutes: number) => {
    const courseCode = course.slice(0, 6).toUpperCase();
    const newTopic = {
      id: `topic-${Date.now()}`,
      course,
      courseCode,
      title,
      status: 'not-started' as TopicStatus,
      estimatedMinutes,
      isDemo: false,
    };
    setState((prev) => ({
      ...prev,
      topics: [...prev.topics, newTopic],
      activities: appendActivity(
        prev,
        `Added Study Topic: ${title}`,
        course,
        'topic',
        `${estimatedMinutes} min target`
      ),
    }));
  };

  // Strictly isolated Real User Progress vs DEMO DATA stats
  const stats = useMemo(() => {
    const realActivities = state.activities.filter((a) => !a.isDemo);
    const realQuizzes = state.quizAttempts.filter((a) => !a.isDemo);
    const realTopics = state.topics.filter((t) => !t.isDemo);
    const realTasks = state.studyTasks.filter((t) => !t.isDemo);

    const demoActivities = state.activities.filter((a) => Boolean(a.isDemo));
    const demoQuizzes = state.quizAttempts.filter((a) => Boolean(a.isDemo));
    const demoTopics = state.topics.filter((t) => Boolean(t.isDemo));
    const demoTasks = state.studyTasks.filter((t) => Boolean(t.isDemo));

    const realTotalWeeklyHours = Number(
      state.realStudyHours.reduce((sum, d) => sum + d.hours, 0).toFixed(1)
    );
    const demoTotalWeeklyHours = Number(
      state.weeklyHours.reduce((sum, d) => sum + d.hours, 0).toFixed(1)
    );

    const realAvgQuizScore =
      realQuizzes.length > 0
        ? Math.round(
            realQuizzes.reduce((sum, a) => sum + a.scorePercent, 0) / realQuizzes.length
          )
        : 0;

    const demoAvgQuizScore =
      demoQuizzes.length > 0
        ? Math.round(
            demoQuizzes.reduce((sum, a) => sum + a.scorePercent, 0) / demoQuizzes.length
          )
        : 0;

    const realCompletedTopicsCount = realTopics.filter((t) => t.status === 'completed').length;
    const realCompletedTasksCount = realTasks.filter((t) => t.completed).length;

    const demoCompletedTopicsCount = demoTopics.filter((t) => t.status === 'completed').length;
    const demoCompletedTasksCount = demoTasks.filter((t) => t.completed).length;

    // Combined chart rows keeping Real and Demo columns strictly separate
    const combinedWeeklyChart = state.realStudyHours.map((realDay, idx) => ({
      day: realDay.day,
      realHours: realDay.hours,
      targetHours: realDay.targetHours,
      demoHours: state.weeklyHours[idx]?.hours ?? 0,
    }));

    const showSample = state.includeSampleData;
    const visibleActivities = showSample ? state.activities : realActivities;
    const visibleTasks = showSample ? state.studyTasks : realTasks;

    return {
      // Actual user progress only (never contaminated with demo scores or demo hours)
      totalWeeklyHours: realTotalWeeklyHours,
      avgQuizScore: realAvgQuizScore,
      completedTopicsCount: realCompletedTopicsCount,
      totalTopicsCount: realTopics.length,
      completedTasksCount: realCompletedTasksCount,
      totalTasksCount: realTasks.length,
      realQuizzesCount: realQuizzes.length,
      realActivitiesCount: realActivities.length,
      realStudyHours: state.realStudyHours,
      realQuizzes,
      realTopics,
      realTasks,

      // Clearly isolated DEMO DATA baseline
      demoTotalWeeklyHours,
      demoAvgQuizScore,
      demoCompletedTopicsCount,
      demoTotalTopicsCount: demoTopics.length,
      demoCompletedTasksCount,
      demoTotalTasksCount: demoTasks.length,
      demoWeeklyHours: state.weeklyHours,
      demoQuizzes,
      demoTopics,
      demoTasks,
      demoActivities,

      combinedWeeklyChart,
      visibleActivities,
      visibleTasks,
      hasAnyRealActivity:
        realActivities.length > 0 ||
        realQuizzes.length > 0 ||
        realTopics.length > 0 ||
        realTasks.length > 0 ||
        realTotalWeeklyHours > 0,
    };
  }, [state]);

  return {
    state,
    stats,
    resetToDemoData,
    clearAllData,
    setIncludeSampleData,
    dismissOnboarding,
    reopenOnboarding,
    updateStudentProfile,
    addSubject,
    removeSubject,
    renameSubject,
    addUploadedNote,
    saveNoteAnalysis,
    removeUploadedNote,
    createDoubtThread,
    selectDoubtThread,
    appendDoubtExchange,
    clearDoubtMessages,
    saveGeneratedQuiz,
    deleteSavedQuiz,
    recordQuizAttempt,
    addStudyTask,
    updateStudyTask,
    adoptDemoPlanAsUserPlan,
    addGeneratedSchedule,
    toggleStudyTask,
    deleteStudyTask,
    addExamNote,
    toggleExamNoteBookmark,
    deleteExamNote,
    updateTopicStatus,
    addTopic,
  };
}
