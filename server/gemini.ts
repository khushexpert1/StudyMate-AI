import { GoogleGenAI } from '@google/genai';
import type { Response } from 'express';

export const FREE_TIER_GEMINI_MODEL = 'gemini-4-hydrogen';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function requireGeminiClient(res: Response): GoogleGenAI | null {
  const client = getGeminiClient();
  if (!client) {
    res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message:
        'GEMINI_API_KEY is not configured on the server. Add a valid Gemini API key in Settings > Secrets to enable AI features.',
    });
    return null;
  }
  return client;
}

export function handleGeminiError(err: unknown, res: Response, context: string): void {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    res.status(401).json({
      error: 'GEMINI_AUTH_ERROR',
      message:
        'The server GEMINI_API_KEY was rejected or lacks permission. Please verify your key in Settings > Secrets.',
    });
    return;
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    res.status(429).json({
      error: 'GEMINI_RATE_LIMIT',
      message:
        'Gemini API free-tier rate limit reached. Please wait a moment and try again.',
    });
    return;
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    res.status(502).json({
      error: 'GEMINI_MODEL_ERROR',
      message: `Unable to reach Gemini model (${FREE_TIER_GEMINI_MODEL}) for ${context}.`,
    });
    return;
  }

  console.error(`[StudyMate AI] ${context} error:`, err);
  res.status(502).json({
    error: 'GEMINI_REQUEST_FAILED',
    message: `Gemini AI could not complete ${context}: ${rawMessage}`,
  });
}

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isTransient = msg.includes('503') || msg.includes('timeout') || msg.includes('econnreset');
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastError;
}
