import React, { useState, useEffect } from 'react';
import { PRESEEDED_WORDS } from './preseededWords';
import { Word, UserWordProgress, UserStats, MemoryConfidence } from './types';
import StatsDashboard from './components/StatsDashboard';
import WordCard from './components/WordCard';
import QuizEngine from './components/QuizEngine';
import ReadingMode from './components/ReadingMode';
import WordDetailModal from './components/WordDetailModal';
import AuthModal from './components/AuthModal';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Cloud, CloudOff, CloudLightning } from 'lucide-react';
import { 
  Award, 
  BookOpen, 
  Brain, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  HelpCircle, 
  History, 
  Layers, 
  Loader2, 
  Plus, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Star 
} from 'lucide-react';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [dictionary, setDictionary] = useState<Word[]>([]);
  const [progress, setProgress] = useState<{ [word: string]: UserWordProgress }>({});
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    todayGoal: 15,
    currentStreak: 0,
    maxStreak: 0,
    lastStudyDate: '',
    retentionRate: 100,
    quizAccuracy: 0,
    totalQuizzesTaken: 0,
    totalWordsReviewed: 0,
  });

  const [currentTab, setCurrentTab] = useState<'daily' | 'search' | 'reading' | 'quiz' | 'stats'>('daily');
  
  // Daily 15 list state
  const [dailyWords, setDailyWords] = useState<Word[]>([]);
  const [dailyIdx, setDailyIdx] = useState(0);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'All'>('All');
  const [searchFilter, setSearchFilter] = useState<'All' | 'Bookmarked' | 'UnderRevision' | 'DueToday'>('All');

  // Custom Word addition
  const [customWordInput, setCustomWordInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customError, setCustomError] = useState('');

  // Overlay Inspect details
  const [inspectWord, setInspectWord] = useState<Word | null>(null);

  // --- INITIALIZATION & SYNCHRONIZATION ---
  useEffect(() => {
    // 1. Load Dictionary (append preseeded words so we don't duplicate)
    const storedDictText = localStorage.getItem('cat_dictionary');
    let loadedDict: Word[] = [];
    if (storedDictText) {
      try {
        loadedDict = JSON.parse(storedDictText);
      } catch (e) {
        loadedDict = [...PRESEEDED_WORDS];
      }
    } else {
      loadedDict = [...PRESEEDED_WORDS];
    }
    // Make sure all preseeded words exist in the loaded dict
    PRESEEDED_WORDS.forEach(p => {
      if (!loadedDict.find(item => item.word.toLowerCase() === p.word.toLowerCase())) {
        loadedDict.push(p);
      }
    });
    setDictionary(loadedDict);
    localStorage.setItem('cat_dictionary', JSON.stringify(loadedDict));

    // 2. Load Progress
    const storedProg = localStorage.getItem('cat_progress');
    let loadedProg: { [word: string]: UserWordProgress } = {};
    if (storedProg) {
      try {
        loadedProg = JSON.parse(storedProg);
        setProgress(loadedProg);
      } catch (e) {}
    }

    // 3. Load Stats
    const storedStats = localStorage.getItem('cat_stats');
    let loadedStats: UserStats = {
      todayGoal: 15,
      currentStreak: 0,
      maxStreak: 0,
      lastStudyDate: '',
      retentionRate: 100,
      quizAccuracy: 0,
      totalQuizzesTaken: 0,
      totalWordsReviewed: 0,
    };
    if (storedStats) {
      try {
        loadedStats = JSON.parse(storedStats);
        setStats(loadedStats);
      } catch (e) {}
    }

    // 4. Setup Daily 15 list
    const storedDailyWords = localStorage.getItem('cat_daily_words');
    const storedDailyDate = localStorage.getItem('cat_daily_date');
    const todayStr = new Date().toISOString().split('T')[0];

    if (storedDailyWords && storedDailyDate === todayStr) {
      try {
        const wordNames: string[] = JSON.parse(storedDailyWords);
        const mapped = wordNames
          .map(name => loadedDict.find(w => w.word.toLowerCase() === name.toLowerCase()))
          .filter((w): w is Word => !!w);
        
        if (mapped.length > 0) {
          setDailyWords(mapped);
        } else {
          rollDailyList(loadedDict, loadedProg, loadedStats, todayStr);
        }
      } catch (e) {
        rollDailyList(loadedDict, loadedProg, loadedStats, todayStr);
      }
    } else {
      rollDailyList(loadedDict, loadedProg, loadedStats, todayStr);
    }
  }, []);

  // Firebase Authentication state listener & real-time auto restoration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        // Automatically fetch and synchronize latest cloud backup
        try {
          const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
          const userDocRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userDocRef);
          
          let cloudStats: UserStats | null = null;
          if (userSnap.exists()) {
            cloudStats = userSnap.data() as UserStats;
            setStats(cloudStats);
            localStorage.setItem('cat_stats', JSON.stringify(cloudStats));
          }

          const progressMap: { [word: string]: UserWordProgress } = {};
          const progressCollRef = collection(db, 'users', u.uid, 'progress');
          const querySnap = await getDocs(progressCollRef);
          querySnap.forEach((doc) => {
            progressMap[doc.id] = doc.data() as UserWordProgress;
          });

          if (Object.keys(progressMap).length > 0) {
            setProgress(progressMap);
            localStorage.setItem('cat_progress', JSON.stringify(progressMap));
          }

          // Trigger a silent rotation update based on newly merged records
          const todayStr = new Date().toISOString().split('T')[0];
          rollDailyList(dictionary, progressMap, cloudStats || stats, todayStr);
        } catch (e) {
          console.error("Failed to automatically synchronize cloud backup on boot:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [dictionary]);

  // Cloud synchronization helpers
  const syncProgressToCloud = async (wordName: string, item: UserWordProgress) => {
    if (auth.currentUser) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'progress', wordName), item);
      } catch (e) {
        console.error("Cloud progress sync failed:", e);
      }
    }
  };

  const syncStatsToCloud = async (newStats: UserStats) => {
    if (auth.currentUser) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          ...newStats,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Cloud stats sync failed:", e);
      }
    }
  };

  const handleLoginSuccess = (
    uid: string, 
    fetchedStats: UserStats, 
    fetchedProgress: { [word: string]: UserWordProgress }
  ) => {
    setStats(fetchedStats);
    setProgress(fetchedProgress);
    localStorage.setItem('cat_stats', JSON.stringify(fetchedStats));
    localStorage.setItem('cat_progress', JSON.stringify(fetchedProgress));
    
    // Rotate today's words list relative to the recovered profile
    rollDailyList(dictionary, fetchedProgress, fetchedStats, new Date().toISOString().split('T')[0]);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out from LEXICON CAT? Your progress will remain saved on this local browser session.")) {
      try {
        await signOut(auth);
        setFirebaseUser(null);
      } catch (e) {
        console.error("Sign out failed:", e);
      }
    }
  };

  // --- CORE METHODS ---

  // Select 15 words for the daily queue
  const rollDailyList = (
    currentDict: Word[], 
    currentProg: { [word: string]: UserWordProgress },
    currentStats: UserStats,
    todayStr: string
  ) => {
    // 1. Calculate streak updates
    let updatedStreak = currentStats.currentStreak;
    const lastDate = currentStats.lastStudyDate;

    if (lastDate) {
      const lastTime = new Date(lastDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        updatedStreak += 1;
      } else if (diffDays > 1) {
        updatedStreak = 1; // broken streak, reset
      }
    } else {
      updatedStreak = 1; // first day
    }

    const updatedMax = Math.max(updatedStreak, currentStats.maxStreak);
    const updatedStats = {
      ...currentStats,
      currentStreak: updatedStreak,
      maxStreak: updatedMax,
      lastStudyDate: todayStr
    };
    setStats(updatedStats);
    localStorage.setItem('cat_stats', JSON.stringify(updatedStats));
    syncStatsToCloud(updatedStats);

    // 2. Prioritize words:
    // Priority A: Words due for Spaced Repetition today (nextReviewDate <= today)
    // Priority B: Words with 'forgot' or 'unsure' ratings
    // Priority C: Words never studied
    // Priority D: Rest of the dictionary
    const now = new Date();
    
    const wordsWithScore = currentDict.map(w => {
      const prog = currentProg[w.word];
      let score = 100; // default for unstudied

      if (prog) {
        const reviewDate = new Date(prog.nextReviewDate);
        if (reviewDate <= now) {
          score = 10; // high priority if due today
        } else if (prog.confidence === 'forgot') {
          score = 20;
        } else if (prog.confidence === 'unsure') {
          score = 30;
        } else if (prog.confidence === 'good') {
          score = 60;
        } else {
          score = 80; // mastered
        }
      }
      return { word: w, score };
    });

    // Sort by score ascending, then shuffle slightly for variety
    const selected = wordsWithScore
      .sort((a, b) => a.score - b.score)
      .slice(0, 15)
      .map(item => item.word);

    setDailyWords(selected);
    setDailyIdx(0);

    // Save state
    localStorage.setItem('cat_daily_words', JSON.stringify(selected.map(w => w.word)));
    localStorage.setItem('cat_daily_date', todayStr);
  };

  // Anki rating memory trigger
  const handleRateConfidence = (wordName: string, confidence: MemoryConfidence) => {
    const today = new Date();
    let daysToAdd = 1;

    switch (confidence) {
      case 'perfect': daysToAdd = 30; break;
      case 'good': daysToAdd = 7; break;
      case 'unsure': daysToAdd = 3; break;
      case 'forgot': daysToAdd = 1; break;
    }

    const nextReview = new Date(today);
    nextReview.setDate(today.getDate() + daysToAdd);

    const wordProgress = progress[wordName];
    const updatedProg: UserWordProgress = {
      word: wordName,
      confidence,
      nextReviewDate: nextReview.toISOString(),
      intervalDays: daysToAdd,
      streak: (confidence === 'perfect' || confidence === 'good') ? (wordProgress?.streak || 0) + 1 : 0,
      lastReviewed: today.toISOString(),
      bookmarked: wordProgress?.bookmarked || false,
      notes: wordProgress?.notes || '',
      tags: wordProgress?.tags || []
    };

    const newProgress = { ...progress, [wordName]: updatedProg };
    setProgress(newProgress);
    localStorage.setItem('cat_progress', JSON.stringify(newProgress));
    syncProgressToCloud(wordName, updatedProg);

    // Update stats studied count
    const totalStudied = Object.keys(newProgress).length;
    const updatedStats = {
      ...stats,
      totalWordsReviewed: totalStudied,
      lastStudyDate: today.toISOString().split('T')[0]
    };
    setStats(updatedStats);
    localStorage.setItem('cat_stats', JSON.stringify(updatedStats));
    syncStatsToCloud(updatedStats);

    // Simple audio sound / visual confirmation
    if (currentTab === 'daily' && dailyIdx < dailyWords.length - 1) {
      // automatically slide to the next word card to optimize learning flow!
      setDailyIdx(prev => prev + 1);
    }
  };

  // Toggle Bookmark state
  const handleBookmarkToggle = (wordName: string) => {
    const wordProgress = progress[wordName];
    const updatedProg: UserWordProgress = {
      word: wordName,
      confidence: wordProgress?.confidence || 'unsure',
      intervalDays: wordProgress?.intervalDays || 1,
      streak: wordProgress?.streak || 0,
      lastReviewed: wordProgress?.lastReviewed || new Date().toISOString(),
      nextReviewDate: wordProgress?.nextReviewDate || new Date().toISOString(),
      bookmarked: !wordProgress?.bookmarked,
      notes: wordProgress?.notes || '',
      tags: wordProgress?.tags || []
    };

    const newProgress = { ...progress, [wordName]: updatedProg };
    setProgress(newProgress);
    localStorage.setItem('cat_progress', JSON.stringify(newProgress));
    syncProgressToCloud(wordName, updatedProg);
  };

  // Edit custom tags or notes
  const handleAddNote = (wordName: string, notes: string) => {
    const wordProgress = progress[wordName];
    const updatedProg: UserWordProgress = {
      word: wordName,
      confidence: wordProgress?.confidence || 'unsure',
      intervalDays: wordProgress?.intervalDays || 1,
      streak: wordProgress?.streak || 0,
      lastReviewed: wordProgress?.lastReviewed || new Date().toISOString(),
      nextReviewDate: wordProgress?.nextReviewDate || new Date().toISOString(),
      bookmarked: wordProgress?.bookmarked || false,
      notes: notes,
      tags: wordProgress?.tags || []
    };

    const newProgress = { ...progress, [wordName]: updatedProg };
    setProgress(newProgress);
    localStorage.setItem('cat_progress', JSON.stringify(newProgress));
    syncProgressToCloud(wordName, updatedProg);
  };

  // Save dynamically analyzed quick word
  const handleAddNewWord = (newWord: Word) => {
    const lowercaseWord = newWord.word.toLowerCase();
    
    // Check duplication
    if (dictionary.some(w => w.word.toLowerCase() === lowercaseWord)) {
      return;
    }

    const updatedDict = [newWord, ...dictionary];
    setDictionary(updatedDict);
    localStorage.setItem('cat_dictionary', JSON.stringify(updatedDict));

    // Auto-create initial progress
    const today = new Date();
    const initProg: UserWordProgress = {
      word: newWord.word,
      confidence: 'unsure',
      intervalDays: 1,
      streak: 0,
      lastReviewed: today.toISOString(),
      nextReviewDate: today.toISOString(),
      bookmarked: false,
      notes: 'Imported from interactive editorial lookup.',
      tags: ['import']
    };

    const updatedProg = { ...progress, [newWord.word]: initProg };
    setProgress(updatedProg);
    localStorage.setItem('cat_progress', JSON.stringify(updatedProg));
    syncProgressToCloud(newWord.word, initProg);

    // Inject to today's daily queue so they can review it immediately!
    if (!dailyWords.some(w => w.word.toLowerCase() === lowercaseWord)) {
      const updatedDaily = [newWord, ...dailyWords];
      setDailyWords(updatedDaily);
      localStorage.setItem('cat_daily_words', JSON.stringify(updatedDaily.map(w => w.word)));
    }
  };

  // AI custom prompt addition
  const handleTeachAIWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = customWordInput.trim();
    if (!word) return;

    setIsAddingCustom(true);
    setCustomError('');

    try {
      const response = await fetch('/api/gemini/quick-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });

      if (!response.ok) {
        throw new Error("Failed to look up word with Gemini.");
      }

      const wordData: Word = await response.json();
      handleAddNewWord(wordData);
      setInspectWord(wordData); // open overlay modal
      setCustomWordInput('');
    } catch (err: any) {
      setCustomError(`AI could not analyze "${word}". Please verify spelling.`);
    } finally {
      setIsAddingCustom(false);
    }
  };

  // Generate a brand new daily list with AI
  const handleGenerateAIDailyList = async () => {
    setIsGeneratingDaily(true);
    try {
      const activeWordNames = Object.keys(progress);
      const reducedCats = dictionary.reduce((acc: { [c: string]: number }, w) => {
        const prog = progress[w.word];
        if (prog && (prog.confidence === 'forgot' || prog.confidence === 'unsure')) {
          acc[w.category] = (acc[w.category] || 0) + 1;
        }
        return acc;
      }, {});
      const weakCats = Object.entries(reducedCats)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(item => item[0]);

      const response = await fetch('/api/gemini/generate-daily-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studiedWords: activeWordNames,
          weakCategories: weakCats
        })
      });

      if (!response.ok) {
        throw new Error("AI daily list generation failed.");
      }

      const newList: Word[] = await response.json();
      if (newList && newList.length > 0) {
        // Merge into dictionary
        const mergedDict = [...dictionary];
        newList.forEach(item => {
          if (!mergedDict.some(w => w.word.toLowerCase() === item.word.toLowerCase())) {
            mergedDict.push(item);
          }
        });
        setDictionary(mergedDict);
        localStorage.setItem('cat_dictionary', JSON.stringify(mergedDict));

        // Save daily selection
        setDailyWords(newList);
        setDailyIdx(0);
        localStorage.setItem('cat_daily_words', JSON.stringify(newList.map(w => w.word)));
        alert("Personalized AI Vocabulary List successfully compiled and rotated!");
      }
    } catch (e) {
      alert("AI generator experienced a minor connection lag. Defaulting to local rotation.");
      rollDailyList(dictionary, progress, stats, new Date().toISOString().split('T')[0]);
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  // Backup operations
  const handleImportBackup = (backupStr: string) => {
    try {
      const parsed = JSON.parse(backupStr);
      if (parsed.stats) {
        setStats(parsed.stats);
        localStorage.setItem('cat_stats', JSON.stringify(parsed.stats));
      }
      if (parsed.progress) {
        setProgress(parsed.progress);
        localStorage.setItem('cat_progress', JSON.stringify(parsed.progress));
      }
      if (parsed.dictionary) {
        setDictionary(parsed.dictionary);
        localStorage.setItem('cat_dictionary', JSON.stringify(parsed.dictionary));
      }
      // Re-initialize lists
      rollDailyList(parsed.dictionary || dictionary, parsed.progress || progress, parsed.stats || stats, new Date().toISOString().split('T')[0]);
    } catch (e) {
      alert("Import failed. Stale configuration file.");
    }
  };

  const handleExportBackup = () => {
    const data = {
      stats,
      progress,
      dictionary
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAT-Vocabulary-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure you want to reset all vocabulary ratings, Streaks, and studied progress? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Update statistics after a quiz completion
  const handleQuizCompleted = (accuracy: number) => {
    const newCount = stats.totalQuizzesTaken + 1;
    // Weighted accuracy
    const newAccuracy = Math.round(((stats.quizAccuracy * stats.totalQuizzesTaken) + accuracy) / newCount);

    const updated = {
      ...stats,
      totalQuizzesTaken: newCount,
      quizAccuracy: newAccuracy
    };
    setStats(updated);
    localStorage.setItem('cat_stats', JSON.stringify(updated));
    syncStatsToCloud(updated);
  };

  // --- FILTRATION CALCULATIONS ---
  const filteredWords = dictionary.filter(w => {
    const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.simpleDefinition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.etymology.rootWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.hindiMeaning.includes(searchQuery);

    const matchesCategory = selectedCategory === 'All' || w.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || w.difficulty === selectedDifficulty;

    const prog = progress[w.word];
    let matchesFilter = true;
    if (searchFilter === 'Bookmarked') {
      matchesFilter = !!prog?.bookmarked;
    } else if (searchFilter === 'UnderRevision') {
      matchesFilter = prog?.confidence === 'forgot' || prog?.confidence === 'unsure';
    } else if (searchFilter === 'DueToday') {
      if (!prog) matchesFilter = false;
      else {
        const reviewDate = new Date(prog.nextReviewDate);
        matchesFilter = reviewDate <= new Date();
      }
    }

    return matchesSearch && matchesCategory && matchesDifficulty && matchesFilter;
  });

  // Calculate generic frequencies for stats
  const categoryCount = dictionary.reduce((acc: { [c: string]: number }, w) => {
    const prog = progress[w.word];
    if (prog && (prog.confidence === 'perfect' || prog.confidence === 'good')) {
      acc[w.category] = (acc[w.category] || 0) + 1;
    }
    return acc;
  }, {});

  const reducedWeakCats = dictionary.reduce((acc: { [c: string]: number }, w) => {
    const prog = progress[w.word];
    if (prog && (prog.confidence === 'forgot' || prog.confidence === 'unsure')) {
      acc[w.category] = (acc[w.category] || 0) + 1;
    }
    return acc;
  }, {});
  const weakCategoriesList = Object.entries(reducedWeakCats)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(x => x[0]);

  const categories = ["All", "Business", "Economics", "Psychology", "Politics", "Philosophy", "Science", "Law", "History", "Literature"];

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans text-[#1A1A1A] selection:bg-[#E5E1DA] selection:text-[#1A1A1A]" id="app-root-layout">
      
      {/* Top Banner Header */}
      <header className="bg-white border-b border-[#E5E1DA] sticky top-0 z-40" id="header-navigation-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center font-serif italic text-2xl">
              L
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#1A1A1A] font-sans">
                LEXICON <span className="font-light text-[#888]">CAT</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#888] font-medium leading-none">
                Academic Reading Trainer
              </p>
            </div>
          </div>

          {/* Quick Streak Widget & Goal Progress */}
          <div className="flex items-center gap-6">
            {/* Cloud Sync Status Widget */}
            {firebaseUser ? (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-sm">
                <Cloud className="text-emerald-600 shrink-0" size={14} />
                <span className="text-[10px] font-mono font-bold text-emerald-800 tracking-tight uppercase max-w-[80px] sm:max-w-[110px] truncate" title={firebaseUser.email || ""}>
                  Synced: {firebaseUser.displayName || firebaseUser.email?.split('@')[0]}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-[9px] font-mono font-bold text-zinc-500 hover:text-red-700 uppercase tracking-tight ml-1 hover:underline cursor-pointer"
                >
                  [Log out]
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-sm transition-colors text-amber-800 font-mono font-bold text-[10px] uppercase tracking-wider cursor-pointer"
              >
                <CloudOff size={14} className="text-amber-650 animate-pulse" />
                <span>Sync Account</span>
              </button>
            )}

            {stats.currentStreak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#F3F1ED] border border-[#E5E1DA] rounded-sm">
                <Flame className="text-orange-600 fill-orange-500" size={14} />
                <span className="text-[10px] font-mono font-bold text-zinc-800 tracking-tight uppercase">
                  {stats.currentStreak} day streak
                </span>
              </div>
            )}

            {/* Daily Goal Progress */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-widest text-[#888] font-bold leading-none mb-1">Daily Goal</span>
              <div className="flex items-center gap-2">
                <div className="w-24 sm:w-32 h-1.5 bg-[#E5E1DA] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1A1A1A] transition-all duration-500" 
                    style={{ width: `${Math.min((dailyWords.filter(w => progress[w.word]).length / 15) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                  {String(dailyWords.filter(w => progress[w.word]).length).padStart(2, '0')}/15
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Panel Content with Sidebar Navigation */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-60 flex-shrink-0 flex md:flex-col gap-1.5 overflow-x-auto scrollbar-none md:overflow-visible pb-2 md:pb-0" id="sidebar-tabs">
          <button
            onClick={() => setCurrentTab('daily')}
            className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2.5 transition-all cursor-pointer border ${
              currentTab === 'daily' 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white border-[#E5E1DA] hover:bg-[#F3F1ED]'
            }`}
          >
            <BookOpen size={14} /> Daily 15 Words
          </button>
          <button
            onClick={() => setCurrentTab('search')}
            className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2.5 transition-all cursor-pointer border ${
              currentTab === 'search' 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white border-[#E5E1DA] hover:bg-[#F3F1ED]'
            }`}
          >
            <Search size={14} /> Search & Bookmarks
          </button>
          <button
            onClick={() => setCurrentTab('reading')}
            className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2.5 transition-all cursor-pointer border ${
              currentTab === 'reading' 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white border-[#E5E1DA] hover:bg-[#F3F1ED]'
            }`}
          >
            <Layers size={14} /> Interactive Reader
          </button>
          <button
            onClick={() => setCurrentTab('quiz')}
            className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2.5 transition-all cursor-pointer border ${
              currentTab === 'quiz' 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white border-[#E5E1DA] hover:bg-[#F3F1ED]'
            }`}
          >
            <Brain size={14} /> Exam Quiz Arena
          </button>
          <button
            onClick={() => setCurrentTab('stats')}
            className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2.5 transition-all cursor-pointer border ${
              currentTab === 'stats' 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white border-[#E5E1DA] hover:bg-[#F3F1ED]'
            }`}
          >
            <Award size={14} /> My Performance
          </button>

          <hr className="hidden md:block my-3 border-[#E5E1DA]" />

          {/* Quick instructions / reset block */}
          <div className="hidden md:block p-4 bg-[#F3F1ED] rounded-sm border border-[#E5E1DA] text-[11px] text-zinc-600 space-y-2">
            <span className="font-mono font-bold uppercase tracking-wider text-zinc-800 block">Daily Study Mode</span>
            <p className="leading-relaxed">Rotate your daily learning cards or paste test articles to dynamically analyze vocab.</p>
            <button
              onClick={handleResetProgress}
              className="text-red-700 hover:text-red-900 hover:underline font-bold uppercase tracking-wide text-[10px] cursor-pointer block pt-1"
            >
              Reset learning logs
            </button>
          </div>
        </aside>

        {/* Tab content area */}
        <main className="flex-1 min-w-0" id="main-content-canvas">
          
          {/* TAB 1: Daily Learning */}
          {currentTab === 'daily' && (
            <div className="space-y-6 animate-fade-in" id="daily-learning-tab">
              
              {/* Daily word rotations header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-sm border border-[#E5E1DA] shadow-sm">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Today&apos;s Academic Core</h2>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    15 carefully weighted high-frequency CAT passage vocabulary cards generated for today.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleGenerateAIDailyList}
                    disabled={isGeneratingDaily}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black cursor-pointer transition-all disabled:bg-zinc-300"
                    title="Leverage Gemini to construct a custom curated vocab list"
                  >
                    {isGeneratingDaily ? (
                      <>
                        <Loader2 className="animate-spin" size={13} /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="fill-white/10" /> Compile AI Daily List
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => rollDailyList(dictionary, progress, stats, new Date().toISOString().split('T')[0])}
                    className="inline-flex items-center justify-center p-2 rounded-sm border border-[#E5E1DA] hover:bg-[#F3F1ED] text-[#1A1A1A] cursor-pointer transition-all"
                    title="Rotate list manually"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Word Swiper carousel frame */}
              {dailyWords.length > 0 ? (
                <div className="grid md:grid-cols-4 gap-6 items-start">
                  
                  {/* Left Side: Navigator Sidebar */}
                  <div className="space-y-2 bg-white p-4 rounded-sm border border-[#E5E1DA] shadow-sm">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2 px-1">Words List</span>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-none">
                      {dailyWords.map((w, idx) => {
                        const prog = progress[w.word];
                        const isStudied = !!prog;
                        const isCurrent = idx === dailyIdx;

                        return (
                          <button
                            key={w.word}
                            onClick={() => setDailyIdx(idx)}
                            className={`w-full px-3 py-2 text-left rounded-sm text-xs font-bold tracking-tight uppercase transition-all cursor-pointer flex items-center justify-between border ${
                              isCurrent 
                                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                                : isStudied 
                                  ? "bg-[#F9F8F6] text-zinc-700 border-[#E5E1DA]" 
                                  : "text-zinc-600 bg-white border-transparent hover:bg-[#F3F1ED]"
                            }`}
                          >
                            <span className="truncate pr-1">{String(idx + 1).padStart(2, '0')}. {w.word}</span>
                            {prog?.confidence === 'perfect' && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Mastered" />}
                            {prog?.confidence === 'good' && <span className="w-2 h-2 rounded-full bg-blue-500" title="Good" />}
                            {prog?.confidence === 'unsure' && <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsure" />}
                            {prog?.confidence === 'forgot' && <span className="w-2 h-2 rounded-full bg-rose-500" title="Forgot" />}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="pt-3 border-t border-[#E5E1DA] flex justify-between text-[11px] text-zinc-500 px-1 font-mono">
                      <span>Streak: {stats.currentStreak}d</span>
                      <span>{dailyWords.filter(w => progress[w.word]).length}/15 Rated</span>
                    </div>
                  </div>

                  {/* Main Word Details Card with swiper controls */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="relative">
                      <WordCard
                        word={dailyWords[dailyIdx]}
                        progress={progress[dailyWords[dailyIdx].word]}
                        onBookmarkToggle={handleBookmarkToggle}
                        onRateConfidence={handleRateConfidence}
                        onAddNote={handleAddNote}
                      />
                    </div>

                    {/* Left & Right Swiper buttons */}
                    <div className="flex justify-between items-center bg-white p-3.5 rounded-sm border border-[#E5E1DA] shadow-sm">
                      <button
                        onClick={() => setDailyIdx(prev => Math.max(prev - 1, 0))}
                        disabled={dailyIdx === 0}
                        className="inline-flex items-center gap-1 px-4 py-2 border border-[#E5E1DA] text-[10px] font-bold uppercase hover:bg-[#F3F1ED] transition-colors rounded-sm text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <span className="text-xs font-mono font-bold text-[#666]">
                        {dailyIdx + 1} of {dailyWords.length}
                      </span>
                      <button
                        onClick={() => setDailyIdx(prev => Math.min(prev + 1, dailyWords.length - 1))}
                        disabled={dailyIdx === dailyWords.length - 1}
                        className="inline-flex items-center gap-1 px-4 py-2 border border-[#E5E1DA] text-[10px] font-bold uppercase hover:bg-[#F3F1ED] transition-colors rounded-sm text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-3">
                  <Loader2 className="animate-spin mx-auto text-indigo-600" size={32} />
                  <p className="text-sm font-semibold text-zinc-700">Constructing daily selection profile...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Search & Bookmarks */}
          {currentTab === 'search' && (
            <div className="space-y-6 animate-fade-in" id="search-tab">
              {/* Dynamic Search Filters Panel */}
              <div className="bg-white p-6 rounded-sm border border-[#E5E1DA] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  
                  {/* Search input field */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search by spelling, meaning, root, synonym, or theme tag..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] text-xs sm:text-sm text-zinc-800 font-medium transition-colors"
                    />
                  </div>

                  {/* AI Teach new word Form */}
                  <form onSubmit={handleTeachAIWord} className="sm:w-1/3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Analyze any external word..."
                      value={customWordInput}
                      onChange={(e) => setCustomWordInput(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] text-xs text-zinc-800 font-medium transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={isAddingCustom || !customWordInput.trim()}
                      className="px-4 rounded-sm bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-400 shrink-0"
                    >
                      {isAddingCustom ? <Loader2 className="animate-spin" size={14} /> : "Ask AI"}
                    </button>
                  </form>
                </div>

                {customError && (
                  <p className="text-xs text-rose-600 font-mono">{customError}</p>
                )}

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#E5E1DA]">
                  
                  {/* Category Dropdown */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Academic Theme</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="p-1.5 border border-[#E5E1DA] rounded-sm text-xs bg-white text-[#1A1A1A] font-semibold focus:outline-none focus:border-[#1A1A1A]"
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Difficulty Selector */}
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Difficulty stars</span>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                      className="p-1.5 border border-[#E5E1DA] rounded-sm text-xs bg-white text-[#1A1A1A] font-semibold focus:outline-none focus:border-[#1A1A1A]"
                    >
                      <option value="All">All Stars</option>
                      <option value="1">1 Star</option>
                      <option value="2">2 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="5">5 Stars</option>
                    </select>
                  </div>

                  {/* Status Badges Filter checkboxes */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto pt-2 sm:pt-0">
                    <button
                      onClick={() => setSearchFilter('All')}
                      className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                        searchFilter === 'All' 
                          ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                          : 'bg-white border-[#E5E1DA] text-zinc-600 hover:bg-[#F3F1ED]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSearchFilter('Bookmarked')}
                      className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                        searchFilter === 'Bookmarked' 
                          ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                          : 'bg-white border-[#E5E1DA] text-zinc-600 hover:bg-[#F3F1ED]'
                      }`}
                    >
                      Bookmarked
                    </button>
                    <button
                      onClick={() => setSearchFilter('UnderRevision')}
                      className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                        searchFilter === 'UnderRevision' 
                          ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                          : 'bg-white border-[#E5E1DA] text-zinc-600 hover:bg-[#F3F1ED]'
                      }`}
                    >
                      Revision
                    </button>
                    <button
                      onClick={() => setSearchFilter('DueToday')}
                      className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                        searchFilter === 'DueToday' 
                          ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                          : 'bg-white border-[#E5E1DA] text-zinc-600 hover:bg-[#F3F1ED]'
                      }`}
                    >
                      Due Today
                    </button>
                  </div>

                </div>
              </div>

              {/* Word List results grid */}
              {filteredWords.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" id="search-grid">
                  {filteredWords.map((w) => {
                    const prog = progress[w.word];
                    
                    return (
                      <div
                        key={w.word}
                        onClick={() => setInspectWord(w)}
                        className="p-5 bg-white rounded-sm border border-[#E5E1DA] hover:border-[#1A1A1A] hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-3 relative group"
                        id={`search-card-${w.word}`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                              {w.category}
                            </span>
                            {prog?.bookmarked && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Bookmarked" />
                            )}
                          </div>
                          <h4 className="text-base font-serif font-bold text-[#1A1A1A] select-all group-hover:underline transition-colors leading-tight">
                            {w.word}
                          </h4>
                          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                            {w.simpleDefinition}
                          </p>
                        </div>

                        {/* Card bottom tags info */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#E5E1DA]">
                          <span className="font-mono text-[10px] text-zinc-400">{w.ipa}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${
                            prog?.confidence === 'perfect' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : prog?.confidence === 'good' 
                                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                : prog?.confidence === 'unsure' 
                                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                  : prog?.confidence === 'forgot'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                    : 'bg-zinc-50 border-[#E5E1DA] text-zinc-500'
                          }`}>
                            {prog?.confidence ? prog.confidence.toUpperCase() : "UNSTUDIED"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-sm border border-[#E5E1DA] shadow-sm space-y-2">
                  <p className="text-sm font-semibold text-[#1A1A1A]">No words match your filters.</p>
                  <p className="text-xs text-zinc-500">Try modifying your query or adding this word via AI Teach above!</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Interactive Reader Mode */}
          {currentTab === 'reading' && (
            <div className="animate-fade-in" id="reading-mode-tab">
              <ReadingMode
                dictionaryWords={dictionary}
                onSelectWord={(w) => setInspectWord(w)}
                onAddNewWord={handleAddNewWord}
              />
            </div>
          )}

          {/* TAB 4: Quiz Arena */}
          {currentTab === 'quiz' && (
            <div className="animate-fade-in" id="quiz-arena-tab">
              <QuizEngine
                wordsStudied={dictionary.filter(w => progress[w.word])}
                weakCategories={weakCategoriesList}
                onQuizCompleted={handleQuizCompleted}
              />
            </div>
          )}

          {/* TAB 5: Performance Dashboard */}
          {currentTab === 'stats' && (
            <div className="animate-fade-in" id="stats-tab">
              <StatsDashboard
                stats={stats}
                progressList={Object.values(progress)}
                categoryCount={categoryCount}
                onImportBackup={handleImportBackup}
                onExportBackup={handleExportBackup}
                onResetProgress={handleResetProgress}
              />
            </div>
          )}

        </main>
      </div>

      {/* INSPECT DETAILED WORD OVERLAY MODAL */}
      {inspectWord && (
        <WordDetailModal
          word={inspectWord}
          progress={progress[inspectWord.word]}
          onClose={() => setInspectWord(null)}
          onBookmarkToggle={handleBookmarkToggle}
          onRateConfidence={handleRateConfidence}
          onAddNote={handleAddNote}
        />
      )}

      {/* CLOUD AUTHENTICATION MODAL */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
          localStats={stats}
          localProgress={progress}
        />
      )}

      {/* Footer details */}
      <footer className="bg-white border-t border-[#E5E1DA] mt-auto py-6" id="footer-details">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <p>© 2026 LEXICON CAT. Dedicated to high-retaining active recall & reading comprehension.</p>
          <div className="flex gap-4 text-[10px] uppercase font-mono tracking-wider text-zinc-400">
            <span>Server Proxy: Online</span>
            <span>Storage: Local Durable</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
