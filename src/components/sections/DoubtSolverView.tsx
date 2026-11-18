import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import { COURSES, SUBJECT_SAMPLE_TOPICS } from '../../data/demoData';
import { ApiError, askDoubtSolver } from '../../services/api';
import { ApiHealthStatus, DoubtChatThread, TopicProgress } from '../../types/study';
import { AiStatusBanner } from '../AiStatusBanner';

interface DoubtSolverViewProps {
  apiHealth: ApiHealthStatus | null;
  subjects: string[];
  topics: TopicProgress[];
  threads: DoubtChatThread[];
  activeThreadId: string | null;
  onCreateThread: (subject: string) => string;
  onSelectThread: (threadId: string) => void;
  onAppendExchange: (
    threadId: string | null,
    subject: string,
    question: string,
    reply: { role: 'assistant' | 'system-notice'; content: string }
  ) => void;
  onClearHistory: () => void;
  onOpenSetupGuide?: () => void;
}

export const DoubtSolverView: React.FC<DoubtSolverViewProps> = ({
  apiHealth,
  subjects,
  topics,
  threads,
  activeThreadId,
  onCreateThread,
  onSelectThread,
  onAppendExchange,
  onClearHistory,
  onOpenSetupGuide,
}) => {
  const activeSubjects = subjects.length > 0 ? subjects : [...COURSES];
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0] ?? null;
  const [subject, setSubject] = useState<string>(activeThread?.subject || activeSubjects[0]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeThread?.subject && activeSubjects.includes(activeThread.subject)) {
      setSubject(activeThread.subject);
    } else if (!activeSubjects.includes(subject)) {
      setSubject(activeSubjects[0]);
    }
  }, [activeThread?.id, activeThread?.subject, activeSubjects, subject]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, isSending]);

  const sampleTopicsForSubject = useMemo(() => {
    const preset = SUBJECT_SAMPLE_TOPICS[subject] ?? [];
    const tracked = topics.filter((t) => t.course === subject).map((t) => t.title);
    return Array.from(new Set([...preset, ...tracked])).slice(0, 6);
  }, [subject, topics]);

  const handleNewChat = () => {
    setErrorMsg(null);
    onCreateThread(subject);
  };

  const handleSelectTopicPrompt = (topicTitle: string) => {
    setInput(
      `Explain "${topicTitle}" in ${subject} step by step with a concrete example and common exam mistake.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setErrorMsg(null);
    setIsSending(true);

    const history = (activeThread?.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const targetThreadId = activeThread ? activeThread.id : onCreateThread(subject);

    try {
      const { answer } = await askDoubtSolver({
        subject,
        question: trimmed,
        history,
      });

      onAppendExchange(targetThreadId, subject, trimmed, {
        role: 'assistant',
        content: answer,
      });
      setInput('');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to reach AI Doubt Solver right now. Please try again.';
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            AI Doubt Solver
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Ask academic questions or click any Semester 1 sample topic for step-by-step explanations and worked examples powered by Gemini AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Select subject context"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
          >
            {activeSubjects.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>

          {threads.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-[#0F172A] text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      <AiStatusBanner
        apiHealth={apiHealth}
        errorMessage={errorMsg}
        onDismissError={() => setErrorMsg(null)}
        onOpenSetupGuide={onOpenSetupGuide}
      />

      {/* Quick-Test Sample Topics Bar */}
      {sampleTopicsForSubject.length > 0 && (
        <section className="rounded-xl border border-slate-800/80 bg-[#0F172A]/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-amber-300/90 shrink-0">
              DEMO DATA Topics ({subject}):
            </span>
            {sampleTopicsForSubject.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopicPrompt(topic)}
                className="text-xs text-slate-300 hover:text-white bg-[#0B1120] border border-slate-800 hover:border-violet-500/50 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Chat Threads History */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-4 flex flex-col">
          <div className="pb-3 border-b border-slate-800/70 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">
              Chat Threads ({threads.length})
            </h3>
          </div>

          {threads.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              Start a new chat or click a sample topic above to ask a question.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800/60 mt-2 space-y-1 overflow-y-auto max-h-[480px]">
              {threads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
                return (
                  <li key={thread.id} className="pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        isSelected
                          ? 'bg-violet-600/15 border border-violet-500/35 text-white'
                          : 'hover:bg-slate-800/40 border border-transparent text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-medium truncate">{thread.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {thread.subject} · {thread.messages.length} msgs
                        {thread.isDemo ? (
                          <span className="text-amber-300/90"> · DEMO DATA</span>
                        ) : (
                          ''
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Active Chat Interface */}
        <section className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 flex flex-col min-h-[480px] max-h-[640px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!activeThread || activeThread.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <p className="text-sm font-medium text-slate-200">
                  Ask StudyMate AI any question in {subject}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Click a topic below to pre-fill a question or type your own doubt at the bottom.
                </p>
                <div className="mt-5 flex flex-col gap-2 w-full max-w-lg">
                  {sampleTopicsForSubject.slice(0, 3).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleSelectTopicPrompt(topic)}
                      className="text-left text-xs text-slate-300 hover:text-white bg-[#0B1120] border border-slate-800 hover:border-violet-500/40 rounded-lg px-3.5 py-2.5 transition-colors"
                    >
                      Explain &ldquo;{topic}&rdquo; in {subject} with a worked example
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeThread.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                      <span>
                        {isUser
                          ? 'You'
                          : msg.isDemo
                          ? 'StudyMate AI (DEMO DATA)'
                          : 'StudyMate AI'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{msg.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-violet-600 text-white'
                          : 'bg-[#0B1120] border border-slate-800 text-slate-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-violet-300 pt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating step-by-step explanation...</span>
              </div>
            )}
            <div ref={feedEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-800/80 p-4 bg-[#0B1120]/70 rounded-b-xl flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              placeholder={`Ask a question for ${subject}...`}
              className="flex-1 rounded-lg border border-slate-700/80 bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSending ? 'Solving...' : 'Ask AI'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
