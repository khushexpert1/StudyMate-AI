export type NavSectionId =
  | 'dashboard'
  | 'student-profile'
  | 'notes-analyzer'
  | 'doubt-solver'
  | 'quiz-generator'
  | 'study-planner'
  | 'exam-notes'
  | 'progress-tracker';

export interface StudentProfile {
  studentName: string;
  branch: string;
  semester: number;
  subjects: string[];
  dailyStudyHoursGoal: number;
  preferredStudyTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  sessionLengthMinutes: 30 | 45 | 60 | 90;
  learningFocus: string;
}

export type ActivityCategory = 'quiz' | 'notes' | 'planner' | 'topic' | 'doubt';

export interface ActivityItem {
  id: string;
  title: string;
  course: string;
  category: ActivityCategory;
  timestamp: string;
  detail: string;
  isDemo?: boolean;
}

export interface NoteDefinition {
  term: string;
  definition: string;
}

export interface NoteExamQuestion {
  question: string;
  answerHint: string;
}

export interface NoteAnalysis {
  summary: string;
  importantTopics: string[];
  keyDefinitions: NoteDefinition[];
  examQuestions: NoteExamQuestion[];
  analyzedAt: string;
}

export interface StudyNoteDoc {
  id: string;
  fileName: string;
  course: string;
  fileSizeBytes: number;
  pageCount: number;
  uploadedAt: string;
  mimeType: string;
  previewText: string;
  extractedText?: string;
  keyConcepts: string[];
  analysis?: NoteAnalysis;
  isDemo?: boolean;
}

export interface DoubtMessage {
  id: string;
  role: 'user' | 'assistant' | 'system-notice';
  subject: string;
  content: string;
  timestamp: string;
  isDemo?: boolean;
}

export interface DoubtChatThread {
  id: string;
  title: string;
  subject: string;
  updatedAt: string;
  messages: DoubtMessage[];
  isDemo?: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizPack {
  id: string;
  title: string;
  course: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Exam-Level';
  estimatedMinutes: number;
  isDemo: boolean;
  sourceLabel?: string;
  createdAt?: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizTitle: string;
  course: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  isDemo?: boolean;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface StudyTask {
  id: string;
  day: DayOfWeek;
  course: string;
  title: string;
  startTime: string;
  durationMinutes: number;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  isDemo?: boolean;
}

export interface ExamImportantQuestion {
  question: string;
  keyAnswer: string;
}

export interface ExamNote {
  id: string;
  title: string;
  course: string;
  detailLevel?: 'simple' | 'medium' | 'detailed';
  summary: string;
  detailedExplanation?: string;
  keyPoints: string[];
  importantQuestions?: ExamImportantQuestion[];
  commonPitfall: string;
  updatedAt: string;
  bookmarked: boolean;
  isDemo?: boolean;
}

export type TopicStatus = 'not-started' | 'in-progress' | 'completed';

export interface TopicProgress {
  id: string;
  course: string;
  courseCode: string;
  title: string;
  status: TopicStatus;
  estimatedMinutes: number;
  isDemo?: boolean;
}

export interface DailyStudyHours {
  day: DayOfWeek;
  hours: number;
  targetHours: number;
}

export interface StudyStoreState {
  schemaVersion?: number;
  hasDemoData: boolean;
  includeSampleData: boolean;
  onboardingDismissed: boolean;
  studentProfile: StudentProfile;
  streakDays: number;
  weeklyHours: DailyStudyHours[];
  realStudyHours: DailyStudyHours[];
  activities: ActivityItem[];
  uploadedNotes: StudyNoteDoc[];
  doubtMessages: DoubtMessage[];
  doubtThreads: DoubtChatThread[];
  activeDoubtThreadId: string | null;
  savedQuizzes: QuizPack[];
  quizAttempts: QuizAttempt[];
  studyTasks: StudyTask[];
  examNotes: ExamNote[];
  topics: TopicProgress[];
}

export interface ApiHealthStatus {
  status: string;
  service: string;
  geminiConfigured: boolean;
  aiFeaturesEnabled: boolean;
  model: string;
}
