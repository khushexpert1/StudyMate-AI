import React, { useState } from 'react';
import { Check, Edit3, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { COURSES, SUBJECT_SAMPLE_TOPICS } from '../../data/demoData';
import { NavSectionId, StudentProfile } from '../../types/study';

interface StudentProfileViewProps {
  profile: StudentProfile;
  onUpdateProfile: (updates: Partial<StudentProfile>) => void;
  onAddSubject: (subjectName: string) => boolean;
  onRemoveSubject: (subjectName: string) => void;
  onRenameSubject: (oldName: string, newName: string) => void;
  onNavigate: (section: NavSectionId) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  profile,
  onUpdateProfile,
  onAddSubject,
  onRemoveSubject,
  onRenameSubject,
  onNavigate,
}) => {
  const [studentName, setStudentName] = useState(profile.studentName);
  const [branch, setBranch] = useState(profile.branch);
  const [semester, setSemester] = useState(profile.semester);
  const [dailyGoal, setDailyGoal] = useState(profile.dailyStudyHoursGoal);
  const [preferredTime, setPreferredTime] = useState(profile.preferredStudyTime);
  const [sessionLength, setSessionLength] = useState(profile.sessionLengthMinutes);
  const [learningFocus, setLearningFocus] = useState(profile.learningFocus);

  const [newSubject, setNewSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!branch.trim()) {
      setErrorMessage('Please enter your academic branch.');
      return;
    }
    onUpdateProfile({
      studentName: studentName.trim() || 'Student',
      branch: branch.trim(),
      semester: Math.max(1, Math.min(12, Number(semester) || 1)),
      dailyStudyHoursGoal: Math.max(0.5, Math.min(14, Number(dailyGoal) || 3)),
      preferredStudyTime: preferredTime,
      sessionLengthMinutes: sessionLength,
      learningFocus: learningFocus.trim() || 'Consistent daily practice',
    });
    setStatusMessage('Student profile and study preferences saved to localStorage.');
  };

  const handleAddSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    const exists = profile.subjects.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setErrorMessage(`"${trimmed}" is already in your subject list.`);
      return;
    }
    onAddSubject(trimmed);
    setNewSubject('');
    setStatusMessage(`Added subject "${trimmed}". It is now available across all AI study tools.`);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editingSubjectValue.trim();
    if (!trimmed) return;
    onRenameSubject(oldName, trimmed);
    setEditingSubject(null);
    setEditingSubjectValue('');
    setStatusMessage(`Renamed "${oldName}" to "${trimmed}".`);
  };

  const handleRestoreDefaultSubjects = () => {
    setErrorMessage(null);
    onUpdateProfile({
      branch: 'AI/ML',
      semester: 1,
      subjects: [...COURSES],
    });
    setBranch('AI/ML');
    setSemester(1);
    setStatusMessage('Restored default AI/ML Semester 1 subjects.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Student Profile & Preferences
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure your academic branch, semester, enrolled subjects, and study preferences. Changes persist locally and update all study modules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRestoreDefaultSubjects}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#0F172A] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to AI/ML Sem 1 Defaults</span>
        </button>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-3 text-xs sm:text-sm text-emerald-100"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs text-emerald-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs sm:text-sm text-rose-100"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Academic Details & Study Preferences Form */}
        <section className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6">
          <div className="pb-4 border-b border-slate-800/70">
            <h3 className="font-display text-base font-semibold text-white">
              Academic Profile & Study Preferences
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Used by AI Study Planner, Progress Tracker, and Study Workspace
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-slate-300 mb-1">
                Student Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-branch" className="block text-xs font-medium text-slate-300 mb-1">
                  Branch / Major
                </label>
                <input
                  id="profile-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="AI/ML"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-semester" className="block text-xs font-medium text-slate-300 mb-1">
                  Semester
                </label>
                <select
                  id="profile-semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 font-mono focus:border-violet-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="profile-hours" className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Goal (hrs)
                </label>
                <input
                  id="profile-hours"
                  type="number"
                  min={0.5}
                  max={14}
                  step={0.5}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-time" className="block text-xs font-medium text-slate-300 mb-1">
                  Preferred Window
                </label>
                <select
                  id="profile-time"
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(
                      e.target.value as 'Morning' | 'Afternoon' | 'Evening' | 'Night'
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:outline-none"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-session" className="block text-xs font-medium text-slate-300 mb-1">
                  Session Block
                </label>
                <select
                  id="profile-session"
                  value={sessionLength}
                  onChange={(e) =>
                    setSessionLength(Number(e.target.value) as 30 | 45 | 60 | 90)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 font-mono focus:border-violet-500 focus:outline-none"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="profile-focus" className="block text-xs font-medium text-slate-300 mb-1">
                Study Focus & Exam Goals
              </label>
              <textarea
                id="profile-focus"
                rows={2}
                value={learningFocus}
                onChange={(e) => setLearningFocus(e.target.value)}
                placeholder="e.g., Master Python basics, linear algebra proofs, and ML evaluation"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Profile & Preferences</span>
              </button>
            </div>
          </form>
        </section>

        {/* Editable Subjects Manager */}
        <section className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0F172A]/90 p-5 sm:p-6 space-y-4">
          <div className="pb-4 border-b border-slate-800/70">
            <h3 className="font-display text-base font-semibold text-white">
              Enrolled Subjects ({profile.subjects.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add, rename, or remove subjects. Your active subjects sync across Notes, Doubt Solver, Quizzes, Planner, and Progress Tracker.
            </p>
          </div>

          <form onSubmit={handleAddSubjectSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Add another subject (e.g., Discrete Structures)..."
              className="flex-1 rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newSubject.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subject</span>
            </button>
          </form>

          <ul className="divide-y divide-slate-800/60">
            {profile.subjects.map((subject) => {
              const isEditing = editingSubject === subject;
              const sampleTopics = SUBJECT_SAMPLE_TOPICS[subject];
              return (
                <li key={subject} className="py-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingSubjectValue}
                          onChange={(e) => setEditingSubjectValue(e.target.value)}
                          className="flex-1 rounded-md border border-violet-500/60 bg-[#0B1120] px-2.5 py-1.5 text-sm text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(subject)}
                          aria-label="Confirm rename"
                          className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSubject(null)}
                          aria-label="Cancel rename"
                          className="p-1.5 rounded-md border border-slate-700 text-slate-300 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{subject}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {sampleTopics
                              ? `${sampleTopics.length} sample topics ready for testing`
                              : 'Custom user subject'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubject(subject);
                              setEditingSubjectValue(subject);
                            }}
                            aria-label={`Rename ${subject}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={profile.subjects.length <= 1}
                            onClick={() => onRemoveSubject(subject)}
                            aria-label={`Remove ${subject}`}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {sampleTopics && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <span className="text-amber-300/90">DEMO DATA Topics:</span>{' '}
                      {sampleTopics.join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="pt-2 border-t border-slate-800/70 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('quiz-generator')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors"
            >
              Test in Quiz Generator
            </button>
            <button
              type="button"
              onClick={() => onNavigate('doubt-solver')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors"
            >
              Test in AI Doubt Solver
            </button>
            <button
              type="button"
              onClick={() => onNavigate('exam-notes')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:border-violet-500/50 hover:text-white transition-colors"
            >
              Test in Exam Notes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
