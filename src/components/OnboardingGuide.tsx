import React from 'react';
import { BookOpen, Download, UploadCloud, UserCog, X } from 'lucide-react';
import { NavSectionId, StudentProfile } from '../types/study';

interface OnboardingGuideProps {
  profile: StudentProfile;
  onNavigate: (section: NavSectionId) => void;
  onDismiss: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  profile,
  onNavigate,
  onDismiss,
}) => {
  return (
    <section
      aria-label="First-time student onboarding guide"
      className="rounded-xl border border-violet-500/35 bg-[#10172D] p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-violet-300">
            First-Time Student Setup · {profile.branch} · Semester {profile.semester}
          </p>
          <h3 className="font-display text-lg sm:text-xl font-semibold text-white mt-1 text-balance">
            Welcome to StudyMate AI — Upload your notes and start studying
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
            Your workspace is pre-configured with Semester {profile.semester} ({profile.branch}) subjects and clearly labelled <span className="text-amber-300 font-medium">DEMO DATA</span> samples so you can explore every AI tool right away. Demo quiz scores and demo study hours are never mixed into your real progress.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss onboarding guide"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div className="rounded-lg border border-slate-800/90 bg-[#0B1120] p-4 space-y-2">
          <p className="text-xs font-mono text-violet-400">01. Upload Personal Notes</p>
          <p className="text-sm font-medium text-white">Add Lecture PDFs or Text Notes</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Open Smart Notes Analyzer and upload any text-based PDF, .txt, or .md file (up to 15 MB) to extract text and generate AI summaries and exam questions—or download our sample educational PDF to test it first.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/90 bg-[#0B1120] p-4 space-y-2">
          <p className="text-xs font-mono text-violet-400">02. Customize Subjects & Plan</p>
          <p className="text-sm font-medium text-white">Review Your Student Profile</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your profile starts with {profile.subjects.join(', ')}. Edit your branch, semester, subjects, or daily study goal anytime in Student Profile, and customize the sample study plan.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/90 bg-[#0B1120] p-4 space-y-2">
          <p className="text-xs font-mono text-violet-400">03. Practice & Track Real Progress</p>
          <p className="text-sm font-medium text-white">Test Quizzes, Doubts & Exam Notes</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click any sample topic in Quiz Generator, AI Doubt Solver, or Exam Notes Generator. Only your real quiz attempts, completed topics, and logged study blocks count toward your actual progress.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onNavigate('notes-analyzer')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Personal Notes</span>
        </button>

        <a
          href="/api/sample-notes/pdf"
          download="AI_ML_Sem1_Data_Driven_AI_Sample_Notes.pdf"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600/25 transition-colors whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          <span>Download Sample PDF</span>
        </a>

        <button
          type="button"
          onClick={() => onNavigate('student-profile')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap"
        >
          <UserCog className="h-4 w-4" />
          <span>Edit Student Profile</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('quiz-generator')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-800 bg-[#0B1120] text-slate-300 hover:text-white transition-colors whitespace-nowrap"
        >
          <BookOpen className="h-4 w-4" />
          <span>Try Sample Topics</span>
        </button>
      </div>
    </section>
  );
};
