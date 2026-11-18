import {
  ApiHealthStatus,
  DayOfWeek,
  ExamImportantQuestion,
  NoteAnalysis,
  QuizQuestion,
} from '../types/study';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(`Server returned status ${res.status} without JSON payload.`, 'INVALID_RESPONSE', res.status);
  }

  if (!res.ok) {
    const errObj = payload as { error?: string; message?: string };
    throw new ApiError(
      errObj.message || `Request failed with status ${res.status}`,
      errObj.error || 'REQUEST_FAILED',
      res.status
    );
  }

  return payload as T;
}

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  const res = await fetch('/api/health');
  return parseJsonResponse<ApiHealthStatus>(res);
}

export interface ExtractedPdfResult {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  extractedText: string;
  charCount: number;
}

export async function extractNotesFile(file: File): Promise<ExtractedPdfResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/notes/extract', {
    method: 'POST',
    body: formData,
  });
  return parseJsonResponse<ExtractedPdfResult>(res);
}

export async function analyzeNotesWithAi(params: {
  fileName: string;
  course: string;
  text: string;
}): Promise<Omit<NoteAnalysis, 'analyzedAt'>> {
  const res = await fetch('/api/notes/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse<Omit<NoteAnalysis, 'analyzedAt'>>(res);
}

export async function askDoubtSolver(params: {
  subject: string;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ answer: string }> {
  const res = await fetch('/api/doubt-solver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse<{ answer: string }>(res);
}

export async function generateQuizWithAi(params: {
  course: string;
  topic?: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Exam-Level';
  questionCount: 5 | 10 | 15;
  sourceText?: string;
}): Promise<{ title: string; questions: QuizQuestion[] }> {
  const res = await fetch('/api/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse<{ title: string; questions: QuizQuestion[] }>(res);
}

export async function generateStudyPlanWithAi(params: {
  subjects: Array<{ course: string; topics: string; examDate: string }>;
  dailyHours: number;
  focusGoal?: string;
}): Promise<{
  strategyNote: string;
  tasks: Array<{
    day: DayOfWeek;
    course: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}> {
  const res = await fetch('/api/study-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse(res);
}

export async function generateExamNotesWithAi(params: {
  course: string;
  topic?: string;
  detailLevel: 'simple' | 'medium' | 'detailed';
  sourceText?: string;
}): Promise<{
  title: string;
  detailLevel: 'simple' | 'medium' | 'detailed';
  summary: string;
  detailedExplanation: string;
  keyPoints: string[];
  importantQuestions: ExamImportantQuestion[];
  commonPitfall: string;
}> {
  const res = await fetch('/api/exam-notes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse(res);
}
