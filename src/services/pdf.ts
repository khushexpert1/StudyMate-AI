import { extractText } from 'unpdf';
import { ApiError } from './api';

export interface ExtractedPdfResult {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  extractedText: string;
  charCount: number;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export function truncateSourceText(text: string, maxChars = 28000): string {
  const cleaned = text.replace(/\u0000/g, '').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[Truncated to first ${maxChars} characters for study processing]`;
}

export async function extractNotesFileClient(file: File): Promise<ExtractedPdfResult> {
  if (!file) {
    throw new ApiError('Please attach a PDF, TXT, or Markdown (.md) file.', 'NO_FILE', 400);
  }

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isText =
    file.type.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md');

  if (!isPdf && !isText) {
    throw new ApiError(
      'Unsupported file type. Only PDF, TXT, and Markdown (.md) files are accepted.',
      'UNSUPPORTED_FILE_TYPE',
      400
    );
  }

  if (file.size === 0) {
    throw new ApiError('The uploaded file is empty.', 'EMPTY_FILE', 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      'File exceeds the 15 MB upload limit. Please upload a smaller file.',
      'FILE_TOO_LARGE',
      400
    );
  }

  if (isText) {
    const text = (await file.text()).trim();
    if (text.length < 20) {
      throw new ApiError(
        'The uploaded text file contains too little readable text to analyze.',
        'INSUFFICIENT_TEXT',
        422
      );
    }

    return {
      fileName: file.name,
      mimeType: file.type || 'text/plain',
      fileSizeBytes: file.size,
      pageCount: Math.max(1, Math.ceil(text.length / 2500)),
      extractedText: truncateSourceText(text),
      charCount: text.length,
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = new TextDecoder('ascii').decode(bytes.subarray(0, 16));
    if (!header.includes('%PDF-')) {
      throw new ApiError(
        'The uploaded file does not appear to be a valid PDF document.',
        'INVALID_PDF',
        400
      );
    }

    const result = await extractText(bytes, { mergePages: true });
    const extracted = (result.text || '').replace(/\s+\n/g, '\n').trim();

    if (extracted.length < 40) {
      throw new ApiError(
        'No readable selectable text could be extracted from this PDF. It appears to be a scanned image-only PDF or encrypted document. Please upload a text-based PDF or .txt/.md notes.',
        'SCANNED_OR_EMPTY_PDF',
        422
      );
    }

    return {
      fileName: file.name,
      mimeType: 'application/pdf',
      fileSizeBytes: file.size,
      pageCount: result.totalPages || 1,
      extractedText: truncateSourceText(extracted),
      charCount: extracted.length,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error('[StudyMate AI] Client PDF extraction failed:', err);
    throw new ApiError(
      'Could not read this PDF file. It may be corrupted, password-protected, or malformed.',
      'PDF_PARSE_ERROR',
      400
    );
  }
}

function escapePdfText(line: string): string {
  return line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildSampleEducationalPdfBlob(): Blob {
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
    `4 0 obj\n<< /Length ${textOps.length} >>\nstream\n${textOps}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadSampleEducationalPdf(): void {
  const blob = buildSampleEducationalPdfBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'AI_ML_Sem1_Data_Driven_AI_Sample_Notes.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
