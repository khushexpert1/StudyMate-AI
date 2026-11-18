import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { COURSES } from '../../data/demoData';
import { analyzeNotesWithAi, ApiError, extractNotesFile } from '../../services/api';
import { downloadSampleEducationalPdf } from '../../services/pdf';
import { ApiHealthStatus, NoteAnalysis, StudyNoteDoc } from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';

interface SmartNotesAnalyzerViewProps {
  apiHealth: ApiHealthStatus | null;
  subjects: string[];
  notes: StudyNoteDoc[];
  onAddNote: (doc: Omit<StudyNoteDoc, 'id' | 'uploadedAt' | 'isDemo'>) => StudyNoteDoc;
  onSaveAnalysis: (noteId: string, analysis: NoteAnalysis) => void;
  onRemoveNote: (id: string) => void;
  onOpenSetupGuide?: () => void;
}

export const SmartNotesAnalyzerView: React.FC<SmartNotesAnalyzerViewProps> = ({
  apiHealth,
  subjects,
  notes,
  onAddNote,
  onSaveAnalysis,
  onRemoveNote,
  onOpenSetupGuide,
}) => {
  const activeSubjects = subjects.length > 0 ? subjects : [...COURSES];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>(activeSubjects[0]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id ?? null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (!activeSubjects.includes(selectedCourse)) {
      setSelectedCourse(activeSubjects[0]);
    }
  }, [activeSubjects, selectedCourse]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? notes[0] ?? null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
    const isText =
      file.type.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md');

    if (!isPdf && !isText) {
      setErrorMsg('Unsupported file type. Please upload a PDF, TXT, or Markdown (.md) file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds the 15 MB upload limit. Please select a smaller document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await extractNotesFile(file);
      const preview =
        extracted.extractedText.slice(0, 600) +
        (extracted.extractedText.length > 600 ? '...' : '');

      const created = onAddNote({
        fileName: extracted.fileName,
        course: selectedCourse,
        fileSizeBytes: extracted.fileSizeBytes,
        pageCount: extracted.pageCount,
        mimeType: extracted.mimeType,
        previewText: preview,
        extractedText: extracted.extractedText,
        keyConcepts: [],
      });

      setSelectedNoteId(created.id);
      setSuccessMsg(
        `Extracted ${extracted.charCount.toLocaleString()} characters across ${extracted.pageCount} page(s) from "${extracted.fileName}".`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to upload and extract text from the selected file.');
      }
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedNote) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const sourceText = selectedNote.extractedText || selectedNote.previewText;
    if (!sourceText || sourceText.trim().length < 40) {
      setErrorMsg('This document does not have enough readable text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeNotesWithAi({
        fileName: selectedNote.fileName,
        course: selectedNote.course,
        text: sourceText,
      });

      onSaveAnalysis(selectedNote.id, {
        ...result,
        analyzedAt: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
      setOpenHints({});
      setSuccessMsg(`Gemini AI analysis completed for "${selectedNote.fileName}".`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to analyze notes with Gemini AI. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Smart Notes Analyzer
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload your personal lecture PDFs or notes to extract readable text and generate summaries, topics, definitions, and exam questions with Gemini AI.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadSampleEducationalPdf}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600/25 transition-colors whitespace-nowrap self-start sm:self-auto shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Sample PDF (DEMO DATA)</span>
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

      {/* Upload Dropzone */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Upload Personal Lecture PDF or Notes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Text-based PDF, TXT, or Markdown (.md) up to 15 MB · Want a quick test? Download the Semester 1 AI/ML sample PDF above and upload it here, or select the pre-loaded <span className="text-amber-300">DEMO DATA</span> sample document below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="notes-course-select" className="text-xs text-slate-400 shrink-0">
              Subject:
            </label>
            <select
              id="notes-course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              {activeSubjects.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={handleFileChange}
          disabled={isExtracting}
          className="hidden"
          id="pdf-note-upload"
        />

        <label
          htmlFor="pdf-note-upload"
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0B1120]/70 px-6 py-8 text-center transition-colors ${
            isExtracting
              ? 'opacity-60 cursor-wait'
              : 'hover:border-violet-500/60 hover:bg-violet-950/10 cursor-pointer'
          }`}
        >
          <div className="h-11 w-11 rounded-lg bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3">
            {isExtracting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <span className="text-sm font-medium text-white">
            {isExtracting ? 'Extracting readable text from document...' : 'Click to select a PDF or lecture notes file'}
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Server extracts text securely and saves your study document in localStorage
          </span>
        </label>
      </section>

      {/* Split Library + Analysis Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
            <h3 className="font-display text-sm font-semibold text-white">
              Document Library ({notes.length})
            </h3>
          </div>

          {notes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-300">No documents uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload a PDF above or download the Sample PDF to extract text and run AI analysis.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60 mt-2">
              {notes.map((doc) => {
                const isSelected = selectedNote?.id === doc.id;
                return (
                  <li key={doc.id} className="py-2">
                    <div
                      className={`flex items-start justify-between gap-2 rounded-lg p-2.5 transition-colors ${
                        isSelected
                          ? 'bg-violet-600/15 border border-violet-500/35'
                          : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNoteId(doc.id);
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                      >
                        <FileText className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {doc.course} · {doc.pageCount}p
                            {doc.analysis ? ' · Analyzed' : ''}
                            {doc.isDemo ? (
                              <span className="text-amber-300/90"> · DEMO DATA</span>
                            ) : (
                              <span className="text-emerald-400"> · Saved</span>
                            )}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveNote(doc.id)}
                        aria-label={`Remove ${doc.fileName}`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
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

        <section className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          {!selectedNote ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-300 font-medium">Select a document to analyze</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose a document from your library or upload a PDF above.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800/70">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span>{selectedNote.course}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedNote.pageCount} pages</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {(selectedNote.fileSizeBytes / 1024).toFixed(0)} KB
                    </span>
                    {selectedNote.isDemo ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300/90 font-medium">DEMO DATA</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400">Your Uploaded Notes</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mt-1 break-all">
                    {selectedNote.fileName}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>
                    {isAnalyzing
                      ? 'Analyzing with Gemini...'
                      : selectedNote.analysis
                      ? 'Re-analyze with AI'
                      : 'Analyze with Gemini AI'}
                  </span>
                </button>
              </div>

              {/* Extracted Readable Text Collapsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-400">
                    Extracted Text Preview
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowRawText((v) => !v)}
                    className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
                  >
                    <span>{showRawText ? 'Collapse full text' : 'Expand full text'}</span>
                    {showRawText ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div
                  className={`rounded-lg bg-[#0B1120] border border-slate-800/80 p-4 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap overflow-y-auto ${
                    showRawText ? 'max-h-80' : 'max-h-36'
                  }`}
                >
                  {showRawText
                    ? selectedNote.extractedText || selectedNote.previewText
                    : selectedNote.previewText}
                </div>
              </div>

              {/* Organized AI Analysis Sections */}
              {selectedNote.analysis ? (
                <div className="space-y-6 pt-2 border-t border-slate-800/70">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-display text-sm font-semibold text-white">
                        1. Executive Summary
                      </h4>
                      <span className="font-mono text-[11px] text-slate-400">
                        Analyzed at {selectedNote.analysis.analyzedAt}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed bg-[#0B1120] border border-slate-800/80 rounded-lg p-4">
                      {selectedNote.analysis.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-display text-sm font-semibold text-white mb-2">
                      2. Important Topics
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                      {selectedNote.analysis.importantTopics.map((topic, i) => (
                        <li
                          key={i}
                          className="rounded-lg bg-[#0B1120] border border-slate-800/80 px-3.5 py-2.5"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-display text-sm font-semibold text-white mb-2">
                      3. Key Definitions
                    </h4>
                    <dl className="divide-y divide-slate-800/70 rounded-lg bg-[#0B1120] border border-slate-800/80 px-4">
                      {selectedNote.analysis.keyDefinitions.map((def, i) => (
                        <div key={i} className="py-3">
                          <dt className="text-sm font-medium text-violet-300">{def.term}</dt>
                          <dd className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                            {def.definition}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-display text-sm font-semibold text-white mb-2">
                      4. Exam-Oriented Practice Questions
                    </h4>
                    <div className="space-y-2.5">
                      {selectedNote.analysis.examQuestions.map((item, idx) => {
                        const isOpen = Boolean(openHints[idx]);
                        return (
                          <div
                            key={idx}
                            className="rounded-lg bg-[#0B1120] border border-slate-800/80 p-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-slate-100 leading-snug">
                                <span className="font-mono text-violet-400 mr-2 tabular-nums">
                                  Q{idx + 1}.
                                </span>
                                {item.question}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenHints((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                }
                                className="text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap shrink-0"
                              >
                                {isOpen ? 'Hide Hint' : 'Show Hint'}
                              </button>
                            </div>
                            {isOpen && (
                              <p className="mt-2 pt-2 border-t border-slate-800/70 text-xs text-slate-300 leading-relaxed">
                                {item.answerHint}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800/80 bg-[#0B1120]/60 p-5 text-center">
                  <p className="text-sm text-slate-200 font-medium">
                    Ready for Gemini AI Analysis
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click &ldquo;Analyze with Gemini AI&rdquo; above to generate a summary, important topics, key definitions, and exam practice questions.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
