import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { extractText } from 'unpdf';
import { ThinkingLevel, Type } from '@google/genai';
import {
  FREE_TIER_GEMINI_MODEL,
  handleGeminiError,
  isGeminiConfigured,
  requireGeminiClient,
  withRetry,
} from './server/gemini.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

function truncateSourceText(text: string, maxChars = 28000): string {
  const cleaned = text.replace(/\u0000/g, '').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[Truncated to first ${maxChars} characters for study processing]`;
}

function escapePdfText(line: string): string {
  return line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSampleEducationalPdfBuffer(): Buffer {
  const lines = [
    'StudyMate AI - Semester 1 (AI/ML) Sample Lecture Notes (DEMO DATA)',
    'Subject: Data-Driven AI | Topic: Foundations of Machine Learning & Data Pipelines',
    ' ',
    '1. What is Data-Driven AI?',
    'Data-Driven AI builds predictive and decision systems by learning statistical',
    'patterns directly from empirical datasets rather than relying solely on',
    'hand-coded if-else rules. Performance improves as data quality, feature',
    'representation, and model capacity are systematically tuned.',
    ' ',
    '2. Supervised vs. Unsupervised Learning',
    '- Supervised Learning: Trains on labeled input-output pairs (x, y) to learn a',
    '  mapping f(x) -> y. Core tasks include Regression (continuous targets such as',
    '  housing prices) and Classification (discrete labels such as spam detection).',
    '- Unsupervised Learning: Discovers hidden structure in unlabeled data (x).',
    '  Common methods include k-Means Clustering and Principal Component Analysis (PCA).',
    ' ',
    '3. Train, Validation, and Test Splits',
    'To measure generalization on unseen examples, split datasets into:',
    '- Training Set (70%): Used to fit model parameters (weights and biases).',
    '- Validation Set (15%): Used to tune hyperparameters and prevent overfitting.',
    '- Test Set (15%): Held out until the end for an unbiased performance estimate.',
    ' ',
    '4. Feature Scaling & Gradient Descent',
    'Gradient Descent iteratively updates parameters theta := theta - alpha * grad L.',
    'Standardization (z = (x - mean) / std) ensures features share comparable',
    'scales so gradient descent converges faster and avoids numerical instability.',
    ' ',
    '5. Key Evaluation Metrics',
    '- Regression: Mean Squared Error (MSE) and Root Mean Squared Error (RMSE).',
    '- Classification: Accuracy, Precision = TP / (TP + FP), Recall = TP / (TP + FN),',
    '  and the F1 Score (harmonic mean of Precision and Recall).',
    ' ',
    '6. Exam Revision Pitfall',
    'Never normalize or impute missing values using statistics computed on the full',
    'dataset before splitting; always fit scalers on the training set only to avoid',
    'data leakage.',
  ];

  const textOps = [
    'BT',
    '/F1 11 Tf',
    '54 748 Td',
    '16 TL',
    ...lines.map((line, index) =>
      index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`
    ),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(textOps, 'ascii')} >>\nstream\n${textOps}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '5mb' }));

  // Health and AI availability endpoint (never exposes API key)
  app.get('/api/health', (_req, res) => {
    const configured = isGeminiConfigured();
    res.json({
      status: 'ok',
      service: 'StudyMate AI Backend',
      geminiConfigured: configured,
      aiFeaturesEnabled: configured,
      model: FREE_TIER_GEMINI_MODEL,
    });
  });

  // Downloadable sample educational PDF for testing Smart Notes Analyzer
  app.get('/api/sample-notes/pdf', (_req, res) => {
    const pdfBuffer = buildSampleEducationalPdfBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="AI_ML_Sem1_Data_Driven_AI_Sample_Notes.pdf"'
    );
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  });

  // FEATURE 1A: Extract readable text from uploaded PDF / TXT / MD files
  app.post('/api/notes/extract', (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            error: 'FILE_TOO_LARGE',
            message: 'File exceeds the 15 MB upload limit. Please upload a smaller file.',
          });
          return;
        }
        res.status(400).json({
          error: 'UPLOAD_FAILED',
          message: uploadErr instanceof Error ? uploadErr.message : 'Failed to process uploaded file.',
        });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({
          error: 'NO_FILE',
          message: 'Please attach a PDF, TXT, or Markdown (.md) file.',
        });
        return;
      }

      const lowerName = file.originalname.toLowerCase();
      const isPdf = file.mimetype === 'application/pdf' || lowerName.endsWith('.pdf');
      const isText =
        file.mimetype.startsWith('text/') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md');

      if (!isPdf && !isText) {
        res.status(400).json({
          error: 'UNSUPPORTED_FILE_TYPE',
          message: 'Unsupported file type. Only PDF, TXT, and Markdown (.md) files are accepted.',
        });
        return;
      }

      if (file.size === 0) {
        res.status(400).json({
          error: 'EMPTY_FILE',
          message: 'The uploaded file is empty.',
        });
        return;
      }

      try {
        if (isText) {
          const text = file.buffer.toString('utf-8').trim();
          if (text.length < 20) {
            res.status(422).json({
              error: 'INSUFFICIENT_TEXT',
              message: 'The uploaded text file contains too little readable text to analyze.',
            });
            return;
          }
          res.json({
            fileName: file.originalname,
            mimeType: file.mimetype || 'text/plain',
            fileSizeBytes: file.size,
            pageCount: Math.max(1, Math.ceil(text.length / 2500)),
            extractedText: truncateSourceText(text),
            charCount: text.length,
          });
          return;
        }

        // Validate PDF magic header (%PDF-)
        const header = file.buffer.subarray(0, 8).toString('ascii');
        if (!header.includes('%PDF-')) {
          res.status(400).json({
            error: 'INVALID_PDF',
            message: 'The uploaded file does not appear to be a valid PDF document.',
          });
          return;
        }

        const result = await extractText(new Uint8Array(file.buffer), { mergePages: true });
        const extracted = (result.text || '').replace(/\s+\n/g, '\n').trim();

        if (extracted.length < 40) {
          res.status(422).json({
            error: 'SCANNED_OR_EMPTY_PDF',
            message:
              'No readable selectable text could be extracted from this PDF. It appears to be a scanned image-only PDF or encrypted document. Please upload a text-based PDF or .txt/.md notes.',
          });
          return;
        }

        res.json({
          fileName: file.originalname,
          mimeType: 'application/pdf',
          fileSizeBytes: file.size,
          pageCount: result.totalPages || 1,
          extractedText: truncateSourceText(extracted),
          charCount: extracted.length,
        });
      } catch (err) {
        console.error('[StudyMate AI] PDF extraction failed:', err);
        res.status(400).json({
          error: 'PDF_PARSE_ERROR',
          message:
            'Could not read this PDF file. It may be corrupted, password-protected, or malformed.',
        });
      }
    });
  });

  // FEATURE 1B: Analyze extracted notes with Gemini AI
  app.post('/api/notes/analyze', async (req, res) => {
    const ai = requireGeminiClient(res);
    if (!ai) return;

    const { fileName, course, text } = req.body as {
      fileName?: string;
      course?: string;
      text?: string;
    };

    if (!text || text.trim().length < 40) {
      res.status(400).json({
        error: 'INSUFFICIENT_CONTENT',
        message: 'Please provide readable notes text (at least 40 characters) to analyze.',
      });
      return;
    }

    try {
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

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleGeminiError(err, res, 'notes analysis');
    }
  });

  // FEATURE 2: AI Doubt Solver (Conversational academic tutor)
  app.post('/api/doubt-solver', async (req, res) => {
    const ai = requireGeminiClient(res);
    if (!ai) return;

    const { subject, question, history } = req.body as {
      subject?: string;
      question?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!question || question.trim().length < 2) {
      res.status(400).json({
        error: 'EMPTY_QUESTION',
        message: 'Please enter a study question.',
      });
      return;
    }

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const transcript = recentHistory
      .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n\n');

    const prompt = transcript
      ? `Course Context: ${subject || 'General College Studies'}\n\nConversation so far:\n${transcript}\n\nStudent's New Question:\n${question.trim()}`
      : `Course Context: ${subject || 'General College Studies'}\n\nStudent Question:\n${question.trim()}`;

    try {
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
      res.json({ answer });
    } catch (err) {
      handleGeminiError(err, res, 'doubt solver');
    }
  });

  // FEATURE 3: Quiz Generator (5, 10, or 15 MCQs from notes or topic)
  app.post('/api/quiz/generate', async (req, res) => {
    const ai = requireGeminiClient(res);
    if (!ai) return;

    const { course, topic, difficulty, questionCount, sourceText } = req.body as {
      course?: string;
      topic?: string;
      difficulty?: 'Foundational' | 'Intermediate' | 'Exam-Level';
      questionCount?: number;
      sourceText?: string;
    };

    const count = [5, 10, 15].includes(Number(questionCount)) ? Number(questionCount) : 5;
    const hasTopic = Boolean(topic && topic.trim().length >= 2);
    const hasSource = Boolean(sourceText && sourceText.trim().length >= 40);

    if (!hasTopic && !hasSource) {
      res.status(400).json({
        error: 'MISSING_QUIZ_INPUT',
        message: 'Provide either a topic name or select uploaded notes to generate a quiz.',
      });
      return;
    }

    const promptParts = [
      `Create a ${count}-question multiple-choice quiz for college students.`,
      `Course: ${course || 'General Studies'}`,
      `Difficulty: ${difficulty || 'Intermediate'}`,
    ];
    if (hasTopic) promptParts.push(`Topic Focus: ${topic!.trim()}`);
    if (hasSource) promptParts.push(`Base questions on these notes:\n${truncateSourceText(sourceText!, 18000)}`);

    try {
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

      res.json({
        title: parsed.title || (hasTopic ? topic!.trim() : 'Generated Study Quiz'),
        questions: sanitizedQuestions,
      });
    } catch (err) {
      handleGeminiError(err, res, 'quiz generation');
    }
  });

  // FEATURE 4: AI Study Planner (Realistic daily timetable)
  app.post('/api/study-planner/generate', async (req, res) => {
    const ai = requireGeminiClient(res);
    if (!ai) return;

    const { subjects, dailyHours, focusGoal } = req.body as {
      subjects?: Array<{ course: string; topics: string; examDate: string }>;
      dailyHours?: number;
      focusGoal?: string;
    };

    const validSubjects = Array.isArray(subjects)
      ? subjects.filter((s) => s.course?.trim() && s.topics?.trim())
      : [];

    if (validSubjects.length === 0) {
      res.status(400).json({
        error: 'MISSING_PLANNER_INPUT',
        message: 'Please enter at least one subject and its topics.',
      });
      return;
    }

    const hoursPerDay = Math.min(10, Math.max(1, Number(dailyHours) || 3));
    const subjectLines = validSubjects
      .map(
        (s, i) =>
          `${i + 1}. Course: ${s.course.trim()} | Topics: ${s.topics.trim()} | Exam Date: ${s.examDate || 'Upcoming'}`
      )
      .join('\n');

    try {
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
                  description: 'A brief 2-sentence overview of how the timetable prioritizes exams and spaced repetition.',
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

      const validDays = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      const validPriorities = new Set(['High', 'Medium', 'Low']);

      const tasks = (parsed.tasks || []).map((t) => ({
        day: validDays.has(t.day) ? t.day : 'Mon',
        course: t.course || validSubjects[0].course,
        title: t.title || 'Focused study block',
        startTime: /^\d{2}:\d{2}$/.test(t.startTime) ? t.startTime : '15:00',
        durationMinutes: Math.min(120, Math.max(30, Number(t.durationMinutes) || 60)),
        priority: validPriorities.has(t.priority) ? t.priority : 'Medium',
      }));

      res.json({
        strategyNote: parsed.strategyNote || 'Schedule balanced across your upcoming subjects.',
        tasks,
      });
    } catch (err) {
      handleGeminiError(err, res, 'study planner generation');
    }
  });

  // FEATURE 5: Exam Notes Generator (simple / medium / detailed)
  app.post('/api/exam-notes/generate', async (req, res) => {
    const ai = requireGeminiClient(res);
    if (!ai) return;

    const { course, topic, detailLevel, sourceText } = req.body as {
      course?: string;
      topic?: string;
      detailLevel?: 'simple' | 'medium' | 'detailed';
      sourceText?: string;
    };

    if ((!topic || topic.trim().length < 2) && (!sourceText || sourceText.trim().length < 40)) {
      res.status(400).json({
        error: 'MISSING_EXAM_TOPIC',
        message: 'Please enter a topic or select uploaded notes to generate exam notes.',
      });
      return;
    }

    const level =
      detailLevel === 'simple' || detailLevel === 'detailed' ? detailLevel : 'medium';

    const depthGuidance =
      level === 'simple'
        ? 'Keep explanations ultra-concise, plain-English, and focused on quick last-minute recall.'
        : level === 'detailed'
        ? 'Provide thorough university-level explanations, step-by-step intuition, edge cases, and nuanced exam questions.'
        : 'Provide balanced college revision depth: crisp core explanation, 4-6 key revision bullets, and 3-4 exam questions.';

    try {
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

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ...parsed, detailLevel: level });
    } catch (err) {
      handleGeminiError(err, res, 'exam notes generation');
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        allowedHosts: true,
        hmr: !isHmrDisabled,
        ws: { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyMate AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StudyMate AI server:', err);
  process.exit(1);
});
