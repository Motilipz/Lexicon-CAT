import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { UserStats, UserWordProgress } from '../types';
import { X, LogIn, UserPlus, LogOut, CheckCircle, AlertCircle, Loader2, CloudLightning } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (uid: string, stats: UserStats, progress: { [word: string]: UserWordProgress }) => void;
  localStats: UserStats;
  localProgress: { [word: string]: UserWordProgress };
}

export default function AuthModal({
  onClose,
  onLoginSuccess,
  localStats,
  localProgress
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mergeConflict, setMergeConflict] = useState(false);
  const [tempUid, setTempUid] = useState('');
  const [tempCloudStats, setTempCloudStats] = useState<UserStats | null>(null);
  const [tempCloudProgress, setTempCloudProgress] = useState<{ [word: string]: UserWordProgress }>({});

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // Sign Up Flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (displayName) {
          await updateProfile(user, { displayName });
        }

        // Initialize Firestore stats & progress for the new user
        // Check if there is local progress to merge
        const hasLocalProgress = Object.keys(localProgress).length > 0;
        
        if (hasLocalProgress) {
          // Auto-merge local progress for new signup
          await saveUserDataToCloud(user.uid, localStats, localProgress);
          setSuccessMsg('Account created! Your local learning logs have been backed up successfully.');
          onLoginSuccess(user.uid, localStats, localProgress);
        } else {
          // Initialize empty profile
          const initialStats: UserStats = {
            todayGoal: 15,
            currentStreak: 0,
            maxStreak: 0,
            lastStudyDate: '',
            retentionRate: 100,
            quizAccuracy: 0,
            totalQuizzesTaken: 0,
            totalWordsReviewed: 0,
          };
          await saveUserDataToCloud(user.uid, initialStats, {});
          setSuccessMsg('Account created successfully!');
          onLoginSuccess(user.uid, initialStats, {});
        }

        setTimeout(() => {
          onClose();
        }, 1500);

      } else {
        // Sign In Flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch cloud data
        const { stats: cloudStats, progress: cloudProgress } = await fetchCloudUserData(user.uid);

        // Check if we need to merge
        const hasLocalProgress = Object.keys(localProgress).length > 0;
        const hasCloudProgress = Object.keys(cloudProgress).length > 0;

        if (hasLocalProgress && hasCloudProgress) {
          // Conflict: both exist. Prompt the user for merge options.
          setTempUid(user.uid);
          setTempCloudStats(cloudStats);
          setTempCloudProgress(cloudProgress);
          setMergeConflict(true);
          setLoading(false);
          return;
        } else if (hasLocalProgress && !hasCloudProgress) {
          // Local exists but cloud empty: backup local to cloud
          await saveUserDataToCloud(user.uid, localStats, localProgress);
          setSuccessMsg('Welcome back! Your local data has been backed up.');
          onLoginSuccess(user.uid, localStats, localProgress);
        } else {
          // Cloud exists (or empty), local empty: restore cloud to local
          setSuccessMsg('Welcome back! Restoring your tracked vocabulary history.');
          onLoginSuccess(user.uid, cloudStats || localStats, cloudProgress);
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      if (!mergeConflict) {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Fetch cloud data
      const { stats: cloudStats, progress: cloudProgress } = await fetchCloudUserData(user.uid);

      // Check if we need to merge
      const hasLocalProgress = Object.keys(localProgress).length > 0;
      const hasCloudProgress = Object.keys(cloudProgress).length > 0;

      if (hasLocalProgress && hasCloudProgress) {
        // Conflict: both exist. Prompt the user for merge options.
        setTempUid(user.uid);
        setTempCloudStats(cloudStats);
        setTempCloudProgress(cloudProgress);
        setMergeConflict(true);
        setLoading(false);
        return;
      } else if (hasLocalProgress && !hasCloudProgress) {
        // Local exists but cloud empty: backup local to cloud
        await saveUserDataToCloud(user.uid, localStats, localProgress);
        setSuccessMsg(`Welcome, ${user.displayName || 'scholar'}! Your local data has been backed up successfully.`);
        onLoginSuccess(user.uid, localStats, localProgress);
      } else {
        // Cloud exists (or empty), local empty: restore cloud to local
        setSuccessMsg(`Welcome back, ${user.displayName || 'scholar'}! Restoring your tracked vocabulary history.`);
        onLoginSuccess(user.uid, cloudStats || localStats, cloudProgress);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('The Google sign-in popup was blocked by your browser. Please allow popups for this site, or click "Open in a new tab" at the top of the screen to authenticate.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. The Google sign-in window was closed.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A previous Google sign-in process was already pending. Please try again.');
      } else {
        setError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      if (!mergeConflict) {
        setLoading(false);
      }
    }
  };

  // Helper: Fetch stats & progress collection from Cloud
  const fetchCloudUserData = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      
      let stats: UserStats | null = null;
      if (userSnap.exists()) {
        stats = userSnap.data() as UserStats;
      }

      // Fetch progress subcollection (Note: we can do it via a quick API proxy or Firestore)
      // Since we are inside the client, we query directly:
      const progressMap: { [word: string]: UserWordProgress } = {};
      
      // Let's perform a getDocs of the user's progress subcollection.
      // Import on demand to keep imports clean
      const { getDocs } = await import('firebase/firestore');
      const progressCollRef = collection(db, 'users', uid, 'progress');
      const querySnap = await getDocs(progressCollRef);
      querySnap.forEach((doc) => {
        progressMap[doc.id] = doc.data() as UserWordProgress;
      });

      return { stats, progress: progressMap };
    } catch (e) {
      console.error("Error fetching cloud user data:", e);
      return { stats: null, progress: {} };
    }
  };

  // Helper: Save/Overwrite stats & progress subcollection to Cloud
  const saveUserDataToCloud = async (uid: string, stats: UserStats, progress: { [word: string]: UserWordProgress }) => {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...stats,
      updatedAt: new Date().toISOString()
    });

    const progressWords = Object.keys(progress);
    if (progressWords.length > 0) {
      // Use Firestore Write Batches to write multiple progress documents efficiently
      const batch = writeBatch(db);
      progressWords.forEach((word) => {
        const docRef = doc(db, 'users', uid, 'progress', word);
        batch.set(docRef, progress[word]);
      });
      await batch.commit();
    }
  };

  // Merge choice handlers
  const handleMergeOverwriteCloud = async () => {
    setLoading(true);
    try {
      // Overwrite cloud with local
      await saveUserDataToCloud(tempUid, localStats, localProgress);
      setSuccessMsg('Successfully synced! Cloud updated with your current local session logs.');
      onLoginSuccess(tempUid, localStats, localProgress);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError('Failed to update cloud data: ' + err.message);
    } finally {
      setLoading(false);
      setMergeConflict(false);
    }
  };

  const handleMergeKeepCloud = () => {
    // Keep cloud stats, ignore current local
    setSuccessMsg('Successfully restored! Recovered your tracked learning progress.');
    if (tempCloudStats) {
      onLoginSuccess(tempUid, tempCloudStats, tempCloudProgress);
    }
    setTimeout(() => {
      onClose();
    }, 1500);
    setMergeConflict(false);
  };

  const handleMergeCombine = async () => {
    setLoading(true);
    try {
      // Combine local & cloud progress maps
      const mergedProgress = { ...tempCloudProgress, ...localProgress };
      
      // Merge stats (take higher stats, sum counts)
      const mergedStats: UserStats = {
        todayGoal: Math.max(tempCloudStats?.todayGoal || 15, localStats.todayGoal),
        currentStreak: Math.max(tempCloudStats?.currentStreak || 0, localStats.currentStreak),
        maxStreak: Math.max(tempCloudStats?.maxStreak || 0, localStats.maxStreak),
        lastStudyDate: localStats.lastStudyDate || tempCloudStats?.lastStudyDate || '',
        retentionRate: Math.round(((tempCloudStats?.retentionRate || 100) + localStats.retentionRate) / 2),
        quizAccuracy: Math.max(tempCloudStats?.quizAccuracy || 0, localStats.quizAccuracy),
        totalQuizzesTaken: (tempCloudStats?.totalQuizzesTaken || 0) + localStats.totalQuizzesTaken,
        totalWordsReviewed: Object.keys(mergedProgress).length,
      };

      await saveUserDataToCloud(tempUid, mergedStats, mergedProgress);
      setSuccessMsg('Successfully merged local session data with your cloud archive!');
      onLoginSuccess(tempUid, mergedStats, mergedProgress);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError('Merge failed: ' + err.message);
    } finally {
      setLoading(false);
      setMergeConflict(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/70 backdrop-blur-xs animate-fade-in" id="auth-modal">
      <div className="relative w-full max-w-md bg-white rounded-sm shadow-xl border border-[#E5E1DA] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E5E1DA] flex items-center justify-between bg-[#FDFCFB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1A1A1A] text-white flex items-center justify-center font-serif italic text-sm">
              L
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                {mergeConflict ? 'Sync Progress Data' : isSignUp ? 'Create Cloud Account' : 'Account Recovery'}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                {mergeConflict ? 'Resolve data overlapping' : 'LEXICON CAT PERSISTENCE'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#F3F1ED] text-zinc-400 hover:text-black rounded-sm transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-sm mb-4 flex items-start gap-2 animate-fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm mb-4 flex items-start gap-2 animate-fade-in">
              <CheckCircle size={15} className="shrink-0 mt-0.5" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {mergeConflict ? (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-800 font-sans font-bold text-xs uppercase tracking-wider">
                  <CloudLightning size={14} className="text-amber-500" /> Overlapping progress detected
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                  We found vocabulary study histories both on this local browser and inside your cloud account backup. Choose how to merge them:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                <button
                  onClick={handleMergeCombine}
                  disabled={loading}
                  className="w-full p-3 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold rounded-sm uppercase tracking-wider transition-all text-left flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="block">Combine Logs (Recommended)</span>
                    <span className="text-[10px] text-zinc-400 font-normal lowercase font-sans">Merges your current local ratings with cloud history</span>
                  </div>
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                </button>

                <button
                  onClick={handleMergeKeepCloud}
                  disabled={loading}
                  className="w-full p-3 bg-white hover:bg-[#F3F1ED] border border-[#E5E1DA] text-zinc-800 text-xs font-bold rounded-sm uppercase tracking-wider transition-all text-left flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="block">Restore Cloud Archive</span>
                    <span className="text-[10px] text-zinc-500 font-normal lowercase font-sans">Discard local ratings, restore from cloud backup</span>
                  </div>
                </button>

                <button
                  onClick={handleMergeOverwriteCloud}
                  disabled={loading}
                  className="w-full p-3 bg-white hover:bg-[#F3F1ED] border border-[#E5E1DA] text-rose-700 hover:text-rose-900 text-xs font-bold rounded-sm uppercase tracking-wider transition-all text-left flex justify-between items-center cursor-pointer"
                >
                  <div>
                    <span className="block">Overwrite Cloud Storage</span>
                    <span className="text-[10px] text-rose-650 font-normal lowercase font-sans">Replace cloud data with your current browser session</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <p className="text-xs text-zinc-650 leading-relaxed">
                {isSignUp 
                  ? 'Sign up to safely back up your streaks, bookmarks, daily word configurations, and notes to the cloud.' 
                  : 'Log in with your credentials to instant-recover your vocabulary logs and study state from any device.'}
              </p>

              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] font-medium"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={13} /> Processing...
                    </>
                  ) : isSignUp ? (
                    <>
                      <UserPlus size={13} /> Create Account
                    </>
                  ) : (
                    <>
                      <LogIn size={13} /> Authenticate & Restore
                    </>
                  )}
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5E1DA]"></div>
                <span className="flex-shrink mx-4 text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-[#E5E1DA]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-[#F9F8F6] active:bg-[#F3F1ED] text-zinc-800 border border-[#E5E1DA] rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
              </button>

              <div className="text-center pt-3 border-t border-[#E5E1DA] mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-xs text-zinc-500 hover:text-black font-semibold uppercase tracking-wider hover:underline"
                >
                  {isSignUp ? 'Already registered? Login instead' : 'New scholar? Create an account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
