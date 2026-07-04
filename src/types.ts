export interface WordEtymology {
  rootWord: string;
  prefix: string;
  suffix: string;
  origin: string;
  rootMeaning: string;
  sharedRootWords: { word: string; meaning: string }[];
}

export interface WordMemory {
  mnemonic: string;
  visualImagination: string;
  storyTrick: string;
  realAssociation: string;
  funnyTrick: string;
}

export interface WordSynonyms {
  easy: string;
  medium: string;
  advanced: string;
}

export interface WordContextExamples {
  simple: string;
  editorial: string;
  catRc: string;
  business: string;
  academic: string;
  conversation: string;
}

export interface WordCommonMistakes {
  confusedWith: string;
  incorrectUsage: string;
  correctUsage: string;
  grammarMistake: string;
}

export interface WordReadingRecognition {
  newspaperAppearance: string;
  typicalPhrases: string[];
  hiddenMeanings: string;
  authorTone: string;
  connotation: string;
}

export interface Word {
  word: string;
  ipa: string;
  audioUrl?: string; // Optional, SpeechSynthesis acts as the native fallback
  partOfSpeech: string;
  cefr: string; // A1, A2, B1, B2, C1, C2
  difficulty: number; // 1-5
  frequency: number; // 1-100
  simpleDefinition: string;
  detailedDefinition: string;
  hindiMeaning: string;
  alternativeMeanings: string[];
  memory: WordMemory;
  etymology: WordEtymology;
  synonyms: WordSynonyms;
  antonyms: string[];
  wordFamily: { form: string; partOfSpeech: string }[];
  contextExamples: WordContextExamples;
  collocations: string[];
  commonMistakes: WordCommonMistakes;
  readingRecognition: WordReadingRecognition;
  emotionalTone: string; // "Positive" | "Negative" | "Neutral" | "Formal" | "Academic" | "Literary" | "Business"
  category: string; // Business, Economics, Psychology, Politics, Philosophy, Science, Law, History, etc.
}

export type MemoryConfidence = 'perfect' | 'good' | 'unsure' | 'forgot';

export interface UserWordProgress {
  word: string;
  confidence: MemoryConfidence;
  nextReviewDate: string; // ISO string
  intervalDays: number;
  streak: number;
  lastReviewed: string; // ISO string
  notes?: string;
  tags?: string[];
  bookmarked?: boolean;
}

export interface DayProgress {
  date: string; // YYYY-MM-DD
  wordsStudied: number;
  quizzesTaken: number;
  quizCorrect: number;
  quizTotal: number;
}

export interface UserStats {
  todayGoal: number; // default e.g. 15
  currentStreak: number;
  maxStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  retentionRate: number; // percentage
  quizAccuracy: number; // percentage
  totalQuizzesTaken: number;
  totalWordsReviewed: number;
}

export interface ArticleAnalysis {
  text: string;
  title: string;
  wordsFound: string[]; // words existing in dictionary or extracted
}

export interface QuizQuestion {
  id: string;
  type: 'meaning-recall' | 'fill-blank' | 'synonym' | 'antonym' | 'context-complete' | 'root-word' | 'collocation';
  word: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
