import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  ApiHealthStatus,
  DayOfWeek,
  ExamImportantQuestion,
  NoteAnalysis,
  QuizQuestion,
} from '../types/study';
import {
  ExtractedPdfResult,
  extractNotesFileClient,
  truncateSourceText,
} from './pdf';

export const FREE_TIER_GEMINI_MODEL = 'gemini-4-hydrogen';
export const GEMINI_API_KEY_STORAGE_KEY = 'studymate_gemini_api_key';
export const GEMINI_KEY_CHANGED_EVENT = 'studymate-gemini-key-changed';

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

export function getEnvGeminiApiKey(): string {
  const raw = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function saveStoredGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = apiKey.trim();
  try {
    if (trimmed) {
      window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(GEMINI_KEY_CHANGED_EVENT));
  } catch {
    // Ignore storage errors gracefully
  }
}

export function clearStoredGeminiApiKey(): void {
  saveStoredGeminiApiKey('');
}

export function getActiveGeminiKeyInfo(): {
  apiKey: string;
  source: 'env' | 'localStorage' | 'none';
} {
  const envKey = getEnvGeminiApiKey();
  if (envKey) {
    return { apiKey: envKey, source: 'env' };
  }
  const storedKey = getStoredGeminiApiKey();
  if (storedKey) {
    return { apiKey: storedKey, source: 'localStorage' };
  }
  return { apiKey: '', source: 'none' };
}

function getGeminiClient(): GoogleGenAI {
  const { apiKey } = getActiveGeminiKeyInfo();
  if (!apiKey) {
    throw new ApiError(
      'Gemini API key is missing. Open Setup Guide to paste your Gemini API key into browser storage, or set VITE_GEMINI_API_KEY in your Netlify environment variables.',
      'GEMINI_NOT_CONFIGURED',
      503
    );
  }
  return new GoogleGenAI({ apiKey });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : '';
      const isTransient =
        status === 429 ||
        status === 503 ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('fetch');

      if (!isTransient || attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

function mapGeminiError(err: unknown, contextLabel: string): ApiError {
  if (err instanceof ApiError) return err;

  const message = err instanceof Error ? err.message : 'Unexpected Gemini API error.';
  const status = (err as { status?: number })?.status;

  console.error(`[StudyMate AI] Gemini failure (${contextLabel}):`, err);

  if (
    status === 401 ||
    status === 403 ||
    status === 400 ||
    message.includes('API_KEY_INVALID') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('API key not valid')
  ) {
    return new ApiError(
      'The Gemini API key was rejected (invalid or lacks permission). Check VITE_GEMINI_API_KEY or paste a valid key in Setup Guide.',
      'GEMINI_AUTH_ERROR',
      401
    );
  }

  if (status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return new ApiError(
      'Gemini API rate limit reached on the current quota. Please wait a moment and try again.',
      'GEMINI_RATE_LIMIT',
      429
    );
  }

  return new ApiError(
    `AI request failed during ${contextLabel}: ${message}`,
    'GEMINI_REQUEST_FAILED',
    status && status >= 400 ? status : 502
  );
}

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  const { apiKey, source } = getActiveGeminiKeyInfo();
  const configured = Boolean(apiKey);
  return {
    status: 'ok',
    service: 'StudyMate AI (Pure Frontend)',
    geminiConfigured: configured,
    aiFeaturesEnabled: configured,
    model: FREE_TIER_GEMINI_MODEL,
    keySource: source,
  };
}

export type { ExtractedPdfResult };

export async function extractNotesFile(file: File): Promise<ExtractedPdfResult> {
  return extractNotesFileClient(file);
}

export async function analyzeNotesWithAi(params: {
  fileName: string;
  course: string;
  text: string;
}): Promise<Omit<NoteAnalysis, 'analyzedAt'>> {
  const { fileName, course, text } = params;
  if (!text || text.trim().length < 40) {
    throw new ApiError(
      'Please provide readable notes text (at least 40 characters) to analyze.',
      'INSUFFICIENT_CONTENT',
      400
    );
  }

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: FREE_TIER_GEMINI_MODEL,
        contents: `Analyze these college lecture notes for "${course || 'General Course'}" (File: ${fileName || 'Notes'}):\n\n${truncateSourceText(text, 22000)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an expert university study assistant. Extract accurate, high-yield academic takeaways strictly grounded in the provided notes. Keep definitions crisp and exam questions genuinely helpful for college students.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A clear 3-5 sentence executive summary of the lecture notes.',
              },
              importantTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '5 to 8 core topics covered in the notes.',
              },
              keyDefinitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ['term', 'definition'],
                },
                description: '4 to 8 essential terms and clear definitions.',
              },
              examQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answerHint: { type: Type.STRING },
                  },
                  required: ['question', 'answerHint'],
                },
                description: '4 to 6 exam-oriented practice questions with concise answer hints.',
              },
            },
            required: ['summary', 'importantTopics', 'keyDefinitions', 'examQuestions'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<NoteAnalysis, 'analyzedAt'>;
    return parsed;
  } catch (err) {
    throw mapGeminiError(err, 'notes analysis');
  }
}

export async function askDoubtSolver(params: {
  subject: string;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ answer: string }> {
  const { subject, question, history } = params;
  if (!question || question.trim().length < 2) {
    throw new ApiError('Please enter a study question.', 'EMPTY_QUESTION', 400);
  }

  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const transcript = recentHistory
    .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
    .join('\n\n');

  const prompt = transcript
    ? `Course Context: ${subject || 'General College Studies'}\n\nConversation so far:\n${transcript}\n\nStudent's New Question:\n${question.trim()}`
    : `Course Context: ${subject || 'General College Studies'}\n\nStudent Question:\n${question.trim()}`;

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: FREE_TIER_GEMINI_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyMate AI, a patient, accurate university tutor. Answer clearly using structured plain-text/Markdown sections:\n1. Quick Answer\n2. Step-by-Step Explanation\n3. Concrete Example\n4. Key Takeaway / Common Mistake to Avoid\nKeep explanations intuitive and academically rigorous for college students.',
        },
      })
    );

    const answer = (response.text ?? '').trim();
    if (!answer) {
      throw new Error('Model returned an empty response.');
    }
    return { answer };
  } catch (err) {
    throw mapGeminiError(err, 'doubt solver');
  }
}

export async function generateQuizWithAi(params: {
  course: string;
  topic?: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Exam-Level';
  questionCount: 5 | 10 | 15;
  sourceText?: string;
}): Promise<{ title: string; questions: QuizQuestion[] }> {
  const { course, topic, difficulty, questionCount, sourceText } = params;
  const count = [5, 10, 15].includes(Number(questionCount)) ? Number(questionCount) : 5;
  const hasTopic = Boolean(topic && topic.trim().length >= 2);
  const hasSource = Boolean(sourceText && sourceText.trim().length >= 40);

  if (!hasTopic && !hasSource) {
    throw new ApiError(
      'Provide either a topic name or select uploaded notes to generate a quiz.',
      'MISSING_QUIZ_INPUT',
      400
    );
  }

  const promptParts = [
    `Create a ${count}-question multiple-choice quiz for college students.`,
    `Course: ${course || 'General Studies'}`,
    `Difficulty: ${difficulty || 'Intermediate'}`,
  ];
  if (hasTopic) promptParts.push(`Topic Focus: ${topic!.trim()}`);
  if (hasSource) promptParts.push(`Base questions on these notes:\n${truncateSourceText(sourceText!, 18000)}`);

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: FREE_TIER_GEMINI_MODEL,
        contents: promptParts.join('\n\n'),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Generate unambiguous university-level multiple choice questions with exactly 4 distinct options per question, a 0-based correctIndex (0, 1, 2, or 3), and a concise explanation of why the correct option is right.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['prompt', 'options', 'correctIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      title?: string;
      questions?: Array<{
        prompt: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
    };

    const sanitizedQuestions = (parsed.questions || [])
      .filter((q) => q.prompt && Array.isArray(q.options) && q.options.length >= 4)
      .slice(0, count)
      .map((q, idx) => ({
        id: `ai-q-${Date.now()}-${idx}`,
        prompt: q.prompt,
        options: q.options.slice(0, 4),
        correctIndex:
          Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
            ? q.correctIndex
            : 0,
        explanation: q.explanation || 'Review the core concept from your course notes.',
      }));

    if (sanitizedQuestions.length === 0) {
      throw new Error('Generated quiz did not contain valid multiple-choice questions.');
    }

    return {
      title: parsed.title || (hasTopic ? topic!.trim() : 'Generated Study Quiz'),
      questions: sanitizedQuestions,
    };
  } catch (err) {
    throw mapGeminiError(err, 'quiz generation');
  }
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
  const { subjects, dailyHours, focusGoal } = params;
  const validSubjects = Array.isArray(subjects)
    ? subjects.filter((s) => s.course?.trim() && s.topics?.trim())
    : [];

  if (validSubjects.length === 0) {
    throw new ApiError(
      'Please enter at least one subject and its topics.',
      'MISSING_PLANNER_INPUT',
      400
    );
  }

  const hoursPerDay = Math.min(10, Math.max(1, Number(dailyHours) || 3));
  const subjectLines = validSubjects
    .map(
      (s, i) =>
        `${i + 1}. Course: ${s.course.trim()} | Topics: ${s.topics.trim()} | Exam Date: ${s.examDate || 'Upcoming'}`
    )
    .join('\n');

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: FREE_TIER_GEMINI_MODEL,
        contents: `Build a realistic 7-day (Mon through Sun) college study timetable.\nAvailable daily study hours: ${hoursPerDay} hrs/day.\nAdditional goal: ${focusGoal || 'Balanced exam preparation with active recall'}.\n\nSubjects:\n${subjectLines}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an academic coach. Create a balanced, realistic weekly timetable with 10 to 16 study blocks spread across Mon-Sun. Prioritize nearer exam dates with High priority, use 24h startTime like "09:00" or "14:30", keep durations 30-90 minutes, and never exceed the student\'s daily study hours on any single day.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategyNote: {
                type: Type.STRING,
                description:
                  'A brief 2-sentence overview of how the timetable prioritizes exams and spaced repetition.',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: {
                      type: Type.STRING,
                      description: 'One of: Mon, Tue, Wed, Thu, Fri, Sat, Sun',
                    },
                    course: { type: Type.STRING },
                    title: { type: Type.STRING },
                    startTime: { type: Type.STRING, description: 'HH:MM in 24-hour format' },
                    durationMinutes: { type: Type.INTEGER },
                    priority: { type: Type.STRING, description: 'High, Medium, or Low' },
                  },
                  required: ['day', 'course', 'title', 'startTime', 'durationMinutes', 'priority'],
                },
              },
            },
            required: ['strategyNote', 'tasks'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      strategyNote?: string;
      tasks?: Array<{
        day: string;
        course: string;
        title: string;
        startTime: string;
        durationMinutes: number;
        priority: string;
      }>;
    };

    const validDays = new Set<DayOfWeek>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const validPriorities = new Set<'High' | 'Medium' | 'Low'>(['High', 'Medium', 'Low']);

    const tasks = (parsed.tasks || []).map((t) => ({
      day: (validDays.has(t.day as DayOfWeek) ? t.day : 'Mon') as DayOfWeek,
      course: t.course || validSubjects[0].course,
      title: t.title || 'Focused study block',
      startTime: /^\d{2}:\d{2}$/.test(t.startTime) ? t.startTime : '15:00',
      durationMinutes: Math.min(120, Math.max(30, Number(t.durationMinutes) || 60)),
      priority: (validPriorities.has(t.priority as 'High' | 'Medium' | 'Low')
        ? t.priority
        : 'Medium') as 'High' | 'Medium' | 'Low',
    }));

    return {
      strategyNote: parsed.strategyNote || 'Schedule balanced across your upcoming subjects.',
      tasks,
    };
  } catch (err) {
    throw mapGeminiError(err, 'study planner generation');
  }
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
  const { course, topic, detailLevel, sourceText } = params;
  if ((!topic || topic.trim().length < 2) && (!sourceText || sourceText.trim().length < 40)) {
    throw new ApiError(
      'Please enter a topic or select uploaded notes to generate exam notes.',
      'MISSING_EXAM_TOPIC',
      400
    );
  }

  const level: 'simple' | 'medium' | 'detailed' =
    detailLevel === 'simple' || detailLevel === 'detailed' ? detailLevel : 'medium';

  const depthGuidance =
    level === 'simple'
      ? 'Keep explanations ultra-concise, plain-English, and focused on quick last-minute recall.'
      : level === 'detailed'
      ? 'Provide thorough university-level explanations, step-by-step intuition, edge cases, and nuanced exam questions.'
      : 'Provide balanced college revision depth: crisp core explanation, 4-6 key revision bullets, and 3-4 exam questions.';

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: FREE_TIER_GEMINI_MODEL,
        contents: [
          `Generate structured exam revision notes for "${course || 'College Course'}".`,
          `Topic: ${topic?.trim() || 'Uploaded Lecture Notes'}`,
          `Explanation Depth: ${level.toUpperCase()} (${depthGuidance})`,
          sourceText ? `Reference Notes:\n${truncateSourceText(sourceText, 18000)}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an academic exam-prep specialist. Produce clear, accurate, high-yield exam revision sheets for college students.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: {
                type: Type.STRING,
                description: 'Concise 2-4 sentence overview of the topic.',
              },
              detailedExplanation: {
                type: Type.STRING,
                description: 'Explanation matched to the requested simple/medium/detailed depth.',
              },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 to 7 high-yield revision points, formulas, or rules.',
              },
              importantQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    keyAnswer: { type: Type.STRING },
                  },
                  required: ['question', 'keyAnswer'],
                },
                description: '3 to 5 likely exam questions with model answers.',
              },
              commonPitfall: {
                type: Type.STRING,
                description: 'A common mistake students make on exams for this topic.',
              },
            },
            required: [
              'title',
              'summary',
              'detailedExplanation',
              'keyPoints',
              'importantQuestions',
              'commonPitfall',
            ],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      title: string;
      summary: string;
      detailedExplanation: string;
      keyPoints: string[];
      importantQuestions: ExamImportantQuestion[];
      commonPitfall: string;
    };

    return {
      ...parsed,
      detailLevel: level,
    };
  } catch (err) {
    throw mapGeminiError(err, 'exam notes generation');
  }
}
