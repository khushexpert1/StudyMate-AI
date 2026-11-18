import { useCallback, useEffect, useState } from 'react';
import { SetupGuideModal } from './components/SetupGuideModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/sections/DashboardView';
import { DoubtSolverView } from './components/sections/DoubtSolverView';
import { ExamNotesView } from './components/sections/ExamNotesView';
import { ProgressTrackerView } from './components/sections/ProgressTrackerView';
import { QuizGeneratorView } from './components/sections/QuizGeneratorView';
import { SmartNotesAnalyzerView } from './components/sections/SmartNotesAnalyzerView';
import { StudentProfileView } from './components/sections/StudentProfileView';
import { StudyPlannerView } from './components/sections/StudyPlannerView';
import { useStudyStore } from './hooks/useStudyStore';
import { fetchApiHealth, GEMINI_KEY_CHANGED_EVENT } from './services/api';
import { ApiHealthStatus, NavSectionId } from './types/study';

const VALID_SECTIONS: NavSectionId[] = [
  'dashboard',
  'student-profile',
  'notes-analyzer',
  'doubt-solver',
  'quiz-generator',
  'study-planner',
  'exam-notes',
  'progress-tracker',
];

function getInitialSection(): NavSectionId {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#', '') as NavSectionId;
  return VALID_SECTIONS.includes(hash) ? hash : 'dashboard';
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>(getInitialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus | null>(null);

  const {
    state,
    stats,
    resetToDemoData,
    clearAllData,
    setIncludeSampleData,
    dismissOnboarding,
    reopenOnboarding,
    updateStudentProfile,
    addSubject,
    removeSubject,
    renameSubject,
    addUploadedNote,
    saveNoteAnalysis,
    removeUploadedNote,
    createDoubtThread,
    selectDoubtThread,
    appendDoubtExchange,
    clearDoubtMessages,
    saveGeneratedQuiz,
    deleteSavedQuiz,
    recordQuizAttempt,
    addStudyTask,
    updateStudyTask,
    adoptDemoPlanAsUserPlan,
    addGeneratedSchedule,
    toggleStudyTask,
    deleteStudyTask,
    addExamNote,
    toggleExamNoteBookmark,
    deleteExamNote,
    updateTopicStatus,
    addTopic,
  } = useStudyStore();

  const refreshApiHealth = useCallback(() => {
    fetchApiHealth().then((health) => {
      setApiHealth(health);
    });
  }, []);

  useEffect(() => {
    refreshApiHealth();
    window.addEventListener(GEMINI_KEY_CHANGED_EVENT, refreshApiHealth);
    window.addEventListener('storage', refreshApiHealth);
    return () => {
      window.removeEventListener(GEMINI_KEY_CHANGED_EVENT, refreshApiHealth);
      window.removeEventListener('storage', refreshApiHealth);
    };
  }, [refreshApiHealth]);

  const handleSelectSection = (section: NavSectionId) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${section}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const next = getInitialSection();
      setActiveSection(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        hasDemoData={state.hasDemoData}
        onResetDemoData={resetToDemoData}
        onClearAllData={clearAllData}
        completedTopicsCount={stats.completedTopicsCount}
        totalTopicsCount={stats.totalTopicsCount}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeSection={activeSection}
          hasDemoData={state.hasDemoData}
          branch={state.studentProfile.branch}
          semester={state.studentProfile.semester}
          geminiConfigured={apiHealth?.geminiConfigured ?? true}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSetupGuide={() => setSetupModalOpen(true)}
          onNavigate={handleSelectSection}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1320px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              apiHealth={apiHealth}
              studentProfile={state.studentProfile}
              onboardingDismissed={state.onboardingDismissed}
              onDismissOnboarding={dismissOnboarding}
              onReopenOnboarding={reopenOnboarding}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
              hasDemoData={state.hasDemoData}
              includeSampleData={state.includeSampleData}
              onToggleSampleData={setIncludeSampleData}
              streakDays={state.streakDays}
              totalWeeklyHours={stats.totalWeeklyHours}
              avgQuizScore={stats.avgQuizScore}
              realQuizzesCount={stats.realQuizzesCount}
              completedTopicsCount={stats.completedTopicsCount}
              totalTopicsCount={stats.totalTopicsCount}
              completedTasksCount={stats.completedTasksCount}
              totalTasksCount={stats.totalTasksCount}
              demoTotalWeeklyHours={stats.demoTotalWeeklyHours}
              demoAvgQuizScore={stats.demoAvgQuizScore}
              demoCompletedTopicsCount={stats.demoCompletedTopicsCount}
              demoTotalTopicsCount={stats.demoTotalTopicsCount}
              demoCompletedTasksCount={stats.demoCompletedTasksCount}
              demoTotalTasksCount={stats.demoTotalTasksCount}
              combinedWeeklyChart={stats.combinedWeeklyChart}
              activities={stats.visibleActivities}
              studyTasks={stats.visibleTasks}
              hasAnyRealActivity={stats.hasAnyRealActivity}
              onToggleTask={toggleStudyTask}
              onNavigate={handleSelectSection}
              onResetDemoData={resetToDemoData}
            />
          )}

          {activeSection === 'student-profile' && (
            <StudentProfileView
              profile={state.studentProfile}
              onUpdateProfile={updateStudentProfile}
              onAddSubject={addSubject}
              onRemoveSubject={removeSubject}
              onRenameSubject={renameSubject}
              onNavigate={handleSelectSection}
            />
          )}

          {activeSection === 'notes-analyzer' && (
            <SmartNotesAnalyzerView
              apiHealth={apiHealth}
              subjects={state.studentProfile.subjects}
              notes={state.uploadedNotes}
              onAddNote={addUploadedNote}
              onSaveAnalysis={saveNoteAnalysis}
              onRemoveNote={removeUploadedNote}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
            />
          )}

          {activeSection === 'doubt-solver' && (
            <DoubtSolverView
              apiHealth={apiHealth}
              subjects={state.studentProfile.subjects}
              topics={state.topics}
              threads={state.doubtThreads}
              activeThreadId={state.activeDoubtThreadId}
              onCreateThread={createDoubtThread}
              onSelectThread={selectDoubtThread}
              onAppendExchange={appendDoubtExchange}
              onClearHistory={clearDoubtMessages}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
            />
          )}

          {activeSection === 'quiz-generator' && (
            <QuizGeneratorView
              apiHealth={apiHealth}
              subjects={state.studentProfile.subjects}
              topics={state.topics}
              uploadedNotes={state.uploadedNotes}
              savedQuizzes={state.savedQuizzes}
              onSaveGeneratedQuiz={saveGeneratedQuiz}
              onDeleteSavedQuiz={deleteSavedQuiz}
              onRecordAttempt={recordQuizAttempt}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
            />
          )}

          {activeSection === 'study-planner' && (
            <StudyPlannerView
              apiHealth={apiHealth}
              subjects={state.studentProfile.subjects}
              dailyGoal={state.studentProfile.dailyStudyHoursGoal}
              tasks={state.studyTasks}
              onAddTask={addStudyTask}
              onUpdateTask={updateStudyTask}
              onAdoptDemoPlan={adoptDemoPlanAsUserPlan}
              onAddGeneratedSchedule={addGeneratedSchedule}
              onToggleTask={toggleStudyTask}
              onDeleteTask={deleteStudyTask}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
            />
          )}

          {activeSection === 'exam-notes' && (
            <ExamNotesView
              apiHealth={apiHealth}
              subjects={state.studentProfile.subjects}
              topics={state.topics}
              uploadedNotes={state.uploadedNotes}
              notes={state.examNotes}
              onAddNote={addExamNote}
              onToggleBookmark={toggleExamNoteBookmark}
              onDeleteNote={deleteExamNote}
              onOpenSetupGuide={() => setSetupModalOpen(true)}
            />
          )}

          {activeSection === 'progress-tracker' && (
            <ProgressTrackerView
              subjects={state.studentProfile.subjects}
              includeSampleData={state.includeSampleData}
              onToggleSampleData={setIncludeSampleData}
              totalWeeklyHours={stats.totalWeeklyHours}
              avgQuizScore={stats.avgQuizScore}
              completedTopicsCount={stats.completedTopicsCount}
              totalTopicsCount={stats.totalTopicsCount}
              completedTasksCount={stats.completedTasksCount}
              totalTasksCount={stats.totalTasksCount}
              realTopics={stats.realTopics}
              realQuizzes={stats.realQuizzes}
              demoTotalWeeklyHours={stats.demoTotalWeeklyHours}
              demoAvgQuizScore={stats.demoAvgQuizScore}
              demoCompletedTopicsCount={stats.demoCompletedTopicsCount}
              demoTotalTopicsCount={stats.demoTotalTopicsCount}
              demoCompletedTasksCount={stats.demoCompletedTasksCount}
              demoTotalTasksCount={stats.demoTotalTasksCount}
              demoQuizzes={stats.demoQuizzes}
              topics={state.topics}
              quizAttempts={state.quizAttempts}
              studyTasks={state.studyTasks}
              onUpdateTopicStatus={updateTopicStatus}
              onAddTopic={addTopic}
            />
          )}
        </main>
      </div>

      <SetupGuideModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        profile={state.studentProfile}
        onNavigate={handleSelectSection}
      />
    </div>
  );
}
