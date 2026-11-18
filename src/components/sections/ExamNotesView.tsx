import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { COURSES, SUBJECT_SAMPLE_TOPICS } from '../../data/demoData';
import { ApiError, generateExamNotesWithAi } from '../../services/api';
import { ApiHealthStatus, ExamNote, StudyNoteDoc, TopicProgress } from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';

interface ExamNotesViewProps {
  apiHealth: ApiHealthStatus | null;
  subjects: string[];
  topics: TopicProgress[];
  uploadedNotes: StudyNoteDoc[];
  notes: ExamNote[];
  onAddNote: (note: Omit<ExamNote, 'id' | 'updatedAt' | 'bookmarked' | 'isDemo'>) => void;
  onToggleBookmark: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onOpenSetupGuide?: () => void;
}

function formatExamNoteMarkdown(note: ExamNote): string {
  const lines = [
    `# ${note.title}`,
    `**Subject:** ${note.course}${note.detailLevel ? ` | **Depth:** ${note.detailLevel}` : ''}`,
    '',
    `## Short Summary`,
    note.summary,
    '',
  ];
  if (note.detailedExplanation) {
    lines.push('## Detailed Explanation', note.detailedExplanation, '');
  }
  if (note.keyPoints.length > 0) {
    lines.push('## Revision Points', ...note.keyPoints.map((pt) => `- ${pt}`), '');
  }
  if (note.importantQuestions && note.importantQuestions.length > 0) {
    lines.push(
      '## Important Exam Questions',
      ...note.importantQuestions.flatMap((q, i) => [
        `${i + 1}. **${q.question}**`,
        `   - *Key Answer:* ${q.keyAnswer}`,
      ]),
      ''
    );
  }
  lines.push(`## Common Exam Pitfall`, note.commonPitfall);
  return lines.join('\n');
}

export const ExamNotesView: React.FC<ExamNotesViewProps> = ({
  apiHealth,
  subjects,
  topics,
  uploadedNotes,
  notes,
  onAddNote,
  onToggleBookmark,
  onDeleteNote,
  onOpenSetupGuide,
}) => {
  const activeSubjects = subjects.length > 0 ? subjects : [...COURSES];
  const notesWithText = uploadedNotes.filter(
    (n) => (n.extractedText || n.previewText || '').trim().length >= 40
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'bookmarked'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Exam Note Generator state
  const [aiCourse, setAiCourse] = useState<string>(activeSubjects[0]);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNoteId, setAiNoteId] = useState<string>('');
  const [detailLevel, setDetailLevel] = useState<'simple' | 'medium' | 'detailed'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual form state
  const [course, setCourse] = useState<string>(activeSubjects[0]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPointsRaw, setKeyPointsRaw] = useState('');
  const [commonPitfall, setCommonPitfall] = useState('');

  useEffect(() => {
    if (!activeSubjects.includes(aiCourse)) {
      setAiCourse(activeSubjects[0]);
    }
    if (!activeSubjects.includes(course)) {
      setCourse(activeSubjects[0]);
    }
  }, [activeSubjects, aiCourse, course]);

  const sampleTopicsForCourse = useMemo(() => {
    const preset = SUBJECT_SAMPLE_TOPICS[aiCourse] ?? [];
    const tracked = topics.filter((t) => t.course === aiCourse).map((t) => t.title);
    return Array.from(new Set([...preset, ...tracked])).slice(0, 6);
  }, [aiCourse, topics]);

  const filteredNotes = notes.filter((note) => {
    if (filterMode === 'bookmarked' && !note.bookmarked) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      note.title.toLowerCase().includes(q) ||
      note.course.toLowerCase().includes(q) ||
      note.summary.toLowerCase().includes(q)
    );
  });

  const handleGenerateAiNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const linkedDoc = notesWithText.find((n) => n.id === aiNoteId);
    if (!aiTopic.trim() && !linkedDoc) {
      setErrorMsg('Please enter a topic, click a sample topic, or select an uploaded notes document.');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateExamNotesWithAi({
        course: linkedDoc ? linkedDoc.course : aiCourse,
        topic: aiTopic.trim() || linkedDoc?.fileName,
        detailLevel,
        sourceText: linkedDoc ? linkedDoc.extractedText || linkedDoc.previewText : undefined,
      });

      onAddNote({
        title: generated.title,
        course: linkedDoc ? linkedDoc.course : aiCourse,
        detailLevel: generated.detailLevel,
        summary: generated.summary,
        detailedExplanation: generated.detailedExplanation,
        keyPoints: generated.keyPoints,
        importantQuestions: generated.importantQuestions,
        commonPitfall: generated.commonPitfall,
      });

      setAiTopic('');
      setSuccessMsg(`Generated ${detailLevel} exam revision sheet "${generated.title}".`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to generate exam notes with Gemini AI.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    const points = keyPointsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    onAddNote({
      title: title.trim(),
      course,
      detailLevel: 'medium',
      summary: summary.trim(),
      keyPoints: points.length > 0 ? points : ['Review core definition and worked examples.'],
      commonPitfall:
        commonPitfall.trim() || 'Double-check boundary conditions and units during exams.',
    });

    setTitle('');
    setSummary('');
    setKeyPointsRaw('');
    setCommonPitfall('');
    setShowCreateForm(false);
  };

  const handleCopyNote = async (note: ExamNote) => {
    try {
      await navigator.clipboard.writeText(formatExamNoteMarkdown(note));
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((curr) => (curr === note.id ? null : curr)), 2000);
    } catch {
      setErrorMsg('Clipboard access was denied by your browser.');
    }
  };

  const handleDownloadNote = (note: ExamNote) => {
    const content = formatExamNoteMarkdown(note);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = note.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    anchor.href = url;
    anchor.download = `${safeName || 'exam-notes'}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Exam Notes Generator
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Generate short notes, explanations (simple, medium, or detailed), important questions, and revision sheets with copy &amp; download support.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#0F172A] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{showCreateForm ? 'Close Manual Editor' : 'Write Manual Note'}</span>
        </button>
      </div>

      <AiStatusBanner
        apiHealth={apiHealth}
        errorMessage={errorMsg}
        successMessage={successMsg}
        onDismissError={() => setErrorMsg(null)}
        onDismissSuccess={() => setSuccessMsg(null)}
        onOpenSetupGuide={onOpenSetupGuide}
      />

      {/* AI Exam Notes Generator Form */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-white">
            Generate Revision Sheet with Gemini AI
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose explanation depth, click any sample topic below, or attach an uploaded PDF/notes file
          </p>
        </div>

        <form onSubmit={handleGenerateAiNote} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label htmlFor="ai-exam-course" className="block text-xs font-medium text-slate-300 mb-1">
              Subject
            </label>
            <select
              id="ai-exam-course"
              value={aiCourse}
              onChange={(e) => setAiCourse(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              {activeSubjects.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="ai-exam-topic" className="block text-xs font-medium text-slate-300 mb-1">
              Topic Focus
            </label>
            <input
              id="ai-exam-topic"
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g., Eigenvalues & Matrix Rank"
              className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="ai-exam-source" className="block text-xs font-medium text-slate-300 mb-1">
              Optional Uploaded Notes
            </label>
            <select
              id="ai-exam-source"
              value={aiNoteId}
              onChange={(e) => setAiNoteId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              <option value="">None (Topic only)</option>
              {notesWithText.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.fileName}{n.isDemo ? ' [DEMO DATA]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <span className="block text-xs font-medium text-slate-300 mb-1">
              Depth
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B1120] border border-slate-800">
              {(['simple', 'medium', 'detailed'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDetailLevel(lvl)}
                  className={`py-1 text-[11px] font-medium capitalize rounded-md transition-colors ${
                    detailLevel === lvl
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {sampleTopicsForCourse.length > 0 && (
            <div className="md:col-span-12 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-300/90 mr-1">
                DEMO DATA Topics ({aiCourse}):
              </span>
              {sampleTopicsForCourse.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setAiTopic(topic)}
                  className="text-[11px] text-slate-300 hover:text-white bg-[#0B1120] border border-slate-800 hover:border-violet-500/50 rounded-md px-2.5 py-1 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          <div className="md:col-span-12 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{isGenerating ? 'Generating Exam Notes...' : 'Generate Exam Notes'}</span>
            </button>
          </div>
        </form>
      </section>

      {showCreateForm && (
        <section className="rounded-xl border border-violet-500/35 bg-[#0F172A]/95 p-5 sm:p-6">
          <h3 className="font-display text-base font-semibold text-white mb-4">
            Create Short Exam Revision Note Manually
          </h3>
          <form onSubmit={handleCreateNote} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam-course" className="block text-xs font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                id="exam-course"
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
              <label htmlFor="exam-title" className="block text-xs font-medium text-slate-300 mb-1">
                Note Title
              </label>
              <input
                id="exam-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bayes Theorem & Conditional Probability"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="exam-summary" className="block text-xs font-medium text-slate-300 mb-1">
                Core Explanation
              </label>
              <textarea
                id="exam-summary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Concise conceptual summary..."
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="exam-points" className="block text-xs font-medium text-slate-300 mb-1">
                Revision Points (one per line)
              </label>
              <textarea
                id="exam-points"
                rows={3}
                value={keyPointsRaw}
                onChange={(e) => setKeyPointsRaw(e.target.value)}
                placeholder={"Formula or rule 1\nFormula or rule 2"}
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="exam-pitfall" className="block text-xs font-medium text-slate-300 mb-1">
                Common Exam Pitfall
              </label>
              <textarea
                id="exam-pitfall"
                rows={3}
                value={commonPitfall}
                onChange={(e) => setCommonPitfall(e.target.value)}
                placeholder="What mistake do students often make on this topic?"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                Save Revision Note
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search revision notes by title, subject, or keyword..."
            className="w-full rounded-lg border border-slate-800 bg-[#0F172A] pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0F172A] border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterMode === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Notes ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('bookmarked')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterMode === 'bookmarked'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bookmarked ({notes.filter((n) => n.bookmarked).length})
          </button>
        </div>
      </div>

      {/* Exam Notes Grid */}
      {filteredNotes.length === 0 ? (
        <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-10 text-center">
          <p className="text-sm font-medium text-slate-200">No exam notes match your filter</p>
          <p className="text-xs text-slate-400 mt-1">
            Generate exam notes with Gemini AI above or create one manually.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredNotes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{note.course}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{note.updatedAt}</span>
                      {note.detailLevel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize text-violet-300">{note.detailLevel} depth</span>
                        </>
                      )}
                      {note.isDemo ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300/90 font-medium">DEMO DATA</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400">Saved Note</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white mt-1">
                      {note.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note)}
                      aria-label={`Copy ${note.title}`}
                      title="Copy Markdown"
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {copiedId === note.id ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadNote(note)}
                      aria-label={`Download ${note.title}`}
                      title="Download .md"
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(note.id)}
                      aria-label={note.bookmarked ? 'Remove bookmark' : 'Bookmark note'}
                      className={`p-2 rounded-lg transition-colors ${
                        note.bookmarked
                          ? 'text-violet-400 bg-violet-600/15'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${note.bookmarked ? 'fill-violet-400' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      aria-label={`Delete ${note.title}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{note.summary}</p>

                {note.detailedExplanation && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <h4 className="text-xs font-medium text-slate-400 mb-1.5">
                      Explanation
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {note.detailedExplanation}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/60">
                  <h4 className="text-xs font-medium text-slate-400 mb-2">
                    Revision Points
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-4">
                    {note.keyPoints.map((pt, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                {note.importantQuestions && note.importantQuestions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    <h4 className="text-xs font-medium text-slate-400">
                      Important Exam Questions
                    </h4>
                    <ul className="space-y-2 text-xs">
                      {note.importantQuestions.map((iq, idx) => (
                        <li key={idx} className="rounded-lg bg-[#0B1120] border border-slate-800/80 p-3">
                          <p className="font-medium text-slate-100">{iq.question}</p>
                          <p className="text-slate-400 mt-1 leading-relaxed">{iq.keyAnswer}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/60 text-xs text-slate-400 leading-relaxed">
                <span className="font-medium text-amber-300/90">Common Pitfall: </span>
                {note.commonPitfall}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
