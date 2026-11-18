import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { COURSES, DEMO_QUIZ_PACKS, SUBJECT_SAMPLE_TOPICS } from '../../data/demoData';
import { ApiError, generateQuizWithAi } from '../../services/api';
import {
  ApiHealthStatus,
  QuizAttempt,
  QuizPack,
  StudyNoteDoc,
  TopicProgress,
} from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';

interface QuizGeneratorViewProps {
  apiHealth: ApiHealthStatus | null;
  subjects: string[];
  topics: TopicProgress[];
  uploadedNotes: StudyNoteDoc[];
  savedQuizzes: QuizPack[];
  onSaveGeneratedQuiz: (quiz: Omit<QuizPack, 'id' | 'isDemo' | 'createdAt'>) => QuizPack;
  onDeleteSavedQuiz: (id: string) => void;
  onRecordAttempt: (attempt: Omit<QuizAttempt, 'id' | 'completedAt' | 'isDemo'>) => void;
  onOpenSetupGuide?: () => void;
}

export const QuizGeneratorView: React.FC<QuizGeneratorViewProps> = ({
  apiHealth,
  subjects,
  topics,
  uploadedNotes,
  savedQuizzes,
  onSaveGeneratedQuiz,
  onDeleteSavedQuiz,
  onRecordAttempt,
  onOpenSetupGuide,
}) => {
  const activeSubjects = subjects.length > 0 ? subjects : [...COURSES];
  const notesWithText = uploadedNotes.filter(
    (n) => (n.extractedText || n.previewText || '').trim().length >= 40
  );

  const [sourceMode, setSourceMode] = useState<'topic' | 'notes'>('topic');
  const [selectedCourse, setSelectedCourse] = useState<string>(activeSubjects[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notesWithText[0]?.id ?? '');
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [difficulty, setDifficulty] = useState<'Foundational' | 'Intermediate' | 'Exam-Level'>(
    'Intermediate'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<QuizPack | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!activeSubjects.includes(selectedCourse)) {
      setSelectedCourse(activeSubjects[0]);
    }
  }, [activeSubjects, selectedCourse]);

  const sampleTopicsForCourse = useMemo(() => {
    const preset = SUBJECT_SAMPLE_TOPICS[selectedCourse] ?? [];
    const tracked = topics.filter((t) => t.course === selectedCourse).map((t) => t.title);
    return Array.from(new Set([...preset, ...tracked])).slice(0, 6);
  }, [selectedCourse, topics]);

  const startQuiz = (pack: QuizPack) => {
    setActiveQuiz(pack);
    setAnswers({});
    setSubmitted(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    const correctCount = activeQuiz.questions.reduce(
      (count, q) => (answers[q.id] === q.correctIndex ? count + 1 : count),
      0
    );
    const totalQuestions = activeQuiz.questions.length;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    setSubmitted(true);

    onRecordAttempt({
      quizTitle: activeQuiz.title.replace(/\s*\(DEMO DATA\)\s*/g, ''),
      course: activeQuiz.course,
      scorePercent,
      correctCount,
      totalQuestions,
    });
  };

  const handleGenerateAiQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const chosenNote = notesWithText.find((n) => n.id === selectedNoteId) ?? notesWithText[0];

    if (sourceMode === 'topic' && customTopic.trim().length < 2) {
      setErrorMsg('Please enter a topic or click one of the sample topics to generate a quiz.');
      return;
    }

    if (sourceMode === 'notes' && !chosenNote) {
      setErrorMsg('Please upload notes with readable text in Smart Notes Analyzer first.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateQuizWithAi({
        course: sourceMode === 'notes' && chosenNote ? chosenNote.course : selectedCourse,
        topic: sourceMode === 'topic' ? customTopic.trim() : chosenNote?.fileName,
        difficulty,
        questionCount,
        sourceText:
          sourceMode === 'notes' && chosenNote
            ? chosenNote.extractedText || chosenNote.previewText
            : undefined,
      });

      const savedPack = onSaveGeneratedQuiz({
        title: result.title,
        course: sourceMode === 'notes' && chosenNote ? chosenNote.course : selectedCourse,
        difficulty,
        estimatedMinutes: Math.max(4, Math.round(result.questions.length * 1.2)),
        sourceLabel: sourceMode === 'notes' && chosenNote ? chosenNote.fileName : 'Topic Prompt',
        questions: result.questions,
      });

      setSuccessMsg(
        `Generated ${savedPack.questions.length}-question quiz "${savedPack.title}".`
      );
      startQuiz(savedPack);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to generate quiz with Gemini AI.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const answeredCount = activeQuiz
    ? activeQuiz.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;

  const currentScore =
    activeQuiz && submitted
      ? activeQuiz.questions.reduce(
          (count, q) => (answers[q.id] === q.correctIndex ? count + 1 : count),
          0
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          Quiz Generator
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Generate 5, 10, or 15-question MCQ quizzes from uploaded notes or any subject topic, evaluate answers, and save your real scores.
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

      {!activeQuiz ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* AI Quiz Generator Form */}
          <section className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
            <h3 className="font-display text-base font-semibold text-white">
              Generate AI Quiz
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create custom 4-option MCQs with Gemini AI
            </p>

            <form onSubmit={handleGenerateAiQuiz} className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1.5">
                  Source Material
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#0B1120] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSourceMode('topic')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      sourceMode === 'topic'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Enter Topic
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('notes')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      sourceMode === 'notes'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Uploaded Notes ({notesWithText.length})
                  </button>
                </div>
              </div>

              {sourceMode === 'topic' ? (
                <>
                  <div>
                    <label htmlFor="quiz-course" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Subject
                    </label>
                    <select
                      id="quiz-course"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
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
                    <label htmlFor="quiz-topic" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Topic or Chapter Focus
                    </label>
                    <input
                      id="quiz-topic"
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g., Linear Regression & Gradient Descent"
                      className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {sampleTopicsForCourse.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-amber-300/90">
                        Quick-fill Sample Topics (DEMO DATA):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sampleTopicsForCourse.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setCustomTopic(topic)}
                            className="text-left text-[11px] text-slate-300 hover:text-white bg-[#0B1120] border border-slate-800 hover:border-violet-500/50 rounded-md px-2.5 py-1 transition-colors"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label htmlFor="quiz-note-source" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Uploaded Notes
                  </label>
                  {notesWithText.length === 0 ? (
                    <p className="text-xs text-amber-300 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3">
                      No notes available yet. Upload a PDF or text file in Smart Notes Analyzer first.
                    </p>
                  ) : (
                    <select
                      id="quiz-note-source"
                      value={selectedNoteId || notesWithText[0]?.id}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
                    >
                      {notesWithText.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.fileName} ({n.course}){n.isDemo ? ' [DEMO DATA]' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Questions
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B1120] border border-slate-800">
                    {([5, 10, 15] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                          questionCount === cnt
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="quiz-difficulty" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    id="quiz-difficulty"
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as 'Foundational' | 'Intermediate' | 'Exam-Level'
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="Foundational">Foundational</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Exam-Level">Exam-Level</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {isGenerating
                    ? `Generating ${questionCount} MCQs...`
                    : `Generate ${questionCount}-Question Quiz`}
                </span>
              </button>
            </form>
          </section>

          {/* Saved AI Quizzes + Sample Packs */}
          <div className="lg:col-span-7 space-y-6">
            {savedQuizzes.length > 0 && (
              <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
                <div className="pb-3 border-b border-slate-800/70">
                  <h3 className="font-display text-base font-semibold text-white">
                    Your Generated Quizzes ({savedQuizzes.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Saved locally in your browser for practice and retakes
                  </p>
                </div>
                <div className="divide-y divide-slate-800/60 mt-2">
                  {savedQuizzes.map((pack) => (
                    <div
                      key={pack.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{pack.course}</span>
                          <span aria-hidden="true">·</span>
                          <span>{pack.difficulty}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {pack.questions.length} MCQs
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400">AI Generated</span>
                        </div>
                        <h4 className="font-display text-base font-medium text-white mt-1 truncate">
                          {pack.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startQuiz(pack)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Take Quiz</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedQuiz(pack.id)}
                          aria-label={`Delete ${pack.title}`}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
              <div className="pb-4 border-b border-slate-800/70">
                <h3 className="font-display text-base font-semibold text-white">
                  Sample Quiz Packs (DEMO DATA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-loaded Semester 1 AI/ML sample quizzes across all 4 subjects with instant evaluation
                </p>
              </div>

              <div className="divide-y divide-slate-800/60 mt-2">
                {DEMO_QUIZ_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{pack.course}</span>
                        <span aria-hidden="true">·</span>
                        <span>{pack.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {pack.questions.length} MCQs
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300/90 font-medium">DEMO DATA</span>
                      </div>
                      <h4 className="font-display text-base font-medium text-white mt-1">
                        {pack.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => startQuiz(pack)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600 hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Start Quiz</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* Active Quiz Runner */
        <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{activeQuiz.course}</span>
                <span aria-hidden="true">·</span>
                <span>{activeQuiz.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span className={activeQuiz.isDemo ? 'text-amber-300/90 font-medium' : 'text-emerald-400'}>
                  {activeQuiz.isDemo ? 'DEMO DATA Quiz Pack' : 'AI Generated Quiz'}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mt-1">
                {activeQuiz.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                {answeredCount}/{activeQuiz.questions.length} answered
              </span>
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                Exit Quiz
              </button>
            </div>
          </div>

          {submitted && (
            <div className="rounded-xl border border-violet-500/35 bg-[#121933] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-violet-300">
                  Evaluation Complete · Real attempt saved to Progress Tracker
                </p>
                <p className="font-display text-xl font-semibold text-white mt-1 tabular-nums">
                  Score: {Math.round((currentScore / activeQuiz.questions.length) * 100)}% (
                  {currentScore} of {activeQuiz.questions.length} correct)
                </p>
              </div>
              <button
                type="button"
                onClick={() => startQuiz(activeQuiz)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake Quiz</span>
              </button>
            </div>
          )}

          <div className="space-y-6">
            {activeQuiz.questions.map((q, qIdx) => {
              const selectedIdx = answers[q.id];
              const isCorrect = selectedIdx === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className="pb-6 border-b border-slate-800/60 last:border-b-0 last:pb-0 space-y-3"
                >
                  <p className="text-sm font-medium text-white leading-relaxed">
                    <span className="font-mono text-violet-400 mr-2 tabular-nums">
                      {String(qIdx + 1).padStart(2, '0')}.
                    </span>
                    {q.prompt}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isPicked = selectedIdx === optIdx;
                      const isRightOption = q.correctIndex === optIdx;

                      let styleClass =
                        'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-600';
                      if (!submitted && isPicked) {
                        styleClass = 'border-violet-500 bg-violet-600/20 text-white';
                      } else if (submitted && isRightOption) {
                        styleClass =
                          'border-emerald-500/60 bg-emerald-950/30 text-emerald-200';
                      } else if (submitted && isPicked && !isRightOption) {
                        styleClass = 'border-rose-500/60 bg-rose-950/30 text-rose-200';
                      }

                      return (
                        <button
                          key={`${q.id}-${optIdx}`}
                          type="button"
                          disabled={submitted}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${styleClass}`}
                        >
                          <span>{opt}</span>
                          {submitted && isRightOption && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          )}
                          {submitted && isPicked && !isRightOption && (
                            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <p
                      className={`text-xs leading-relaxed pt-1 ${
                        isCorrect ? 'text-emerald-300/90' : 'text-slate-300'
                      }`}
                    >
                      <span className="font-semibold">Explanation:</span> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={answeredCount < activeQuiz.questions.length}
                onClick={handleSubmitQuiz}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit &amp; Evaluate Quiz
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
