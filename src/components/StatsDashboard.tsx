import React, { useState } from 'react';
import { Award, BookOpen, Brain, Calendar, CheckCircle2, Download, Flame, History, Sparkles, Upload } from 'lucide-react';
import { UserStats, UserWordProgress } from '../types';

interface StatsDashboardProps {
  stats: UserStats;
  progressList: UserWordProgress[];
  categoryCount: { [cat: string]: number };
  onImportBackup: (data: string) => void;
  onExportBackup: () => void;
  onResetProgress: () => void;
}

export default function StatsDashboard({
  stats,
  progressList,
  categoryCount,
  onImportBackup,
  onExportBackup,
  onResetProgress
}: StatsDashboardProps) {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');

  // Calculations
  const totalStudied = progressList.length;
  const masteredCount = progressList.filter(p => p.confidence === 'perfect' || p.confidence === 'good').length;
  const revisingCount = progressList.filter(p => p.confidence === 'unsure' || p.confidence === 'forgot').length;

  // Calculate estimated CAT readiness
  const masteredWeight = masteredCount * 4;
  const studiedWeight = (totalStudied - masteredCount) * 1.5;
  const accuracyBoost = (stats.quizAccuracy / 100) * 15;
  const streakBoost = Math.min(stats.currentStreak * 1.5, 15);
  const rawReadiness = Math.round(masteredWeight + studiedWeight + accuracyBoost + streakBoost);
  const readinessPercentage = Math.min(Math.max(rawReadiness, 5), 99); // max out at 99% to keep them hungry!

  // Category list
  const categories = [
    { name: "Business", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Economics", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Psychology", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Politics", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Philosophy", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Science", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Law", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "History", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "Literature", color: "bg-[#FDFCFB] text-zinc-800 border-[#E5E1DA]" },
    { name: "CAT High Frequency", color: "bg-[#F3F1ED] text-zinc-900 border-[#E5E1DA]" }
  ];

  const handleImport = () => {
    try {
      if (!importText.trim()) {
        setImportError("Please paste a valid backup JSON string.");
        return;
      }
      const parsed = JSON.parse(importText);
      if (!parsed.stats || !parsed.progress) {
        setImportError("Invalid backup structure. Must contain stats and progress.");
        return;
      }
      onImportBackup(importText);
      setShowImport(false);
      setImportText('');
      setImportError('');
      alert("Backup imported successfully!");
    } catch (e: any) {
      setImportError("Invalid JSON string: " + e.message);
    }
  };

  return (
    <div className="space-y-6" id="stats-dashboard-container">
      {/* Dynamic CAT Readiness Banner */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-black text-white rounded-sm p-6 md:p-8 shadow-sm border border-zinc-800 relative overflow-hidden" id="readiness-banner">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles size={160} className="text-white" />
        </div>
        <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-mono font-bold tracking-widest bg-white/10 text-amber-400 border border-white/20 uppercase">
              <Award size={12} /> Dynamic Probability Profile
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
              Your CAT Vocabulary Readiness
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl leading-relaxed">
              An advanced comprehension retention index modeled dynamically from your spaced-repetition memory confidence rates, vocabulary coverage across core RC genres, and active recall test accuracy.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-5 bg-zinc-900/60 rounded-sm border border-zinc-800">
            <div className="relative flex items-center justify-center">
              {/* Simple progress circle */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="54" strokeWidth="6" stroke="#2a2a2a" fill="transparent" />
                <circle cx="64" cy="64" r="54" strokeWidth="6" stroke="#f59e0b" fill="transparent" 
                  strokeDasharray={339.29}
                  strokeDashoffset={339.29 - (339.29 * readinessPercentage) / 100}
                  className="transition-all duration-1000 ease-out animate-fade-in"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-mono font-bold text-amber-400">{readinessPercentage}%</span>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Ready</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 mt-4 font-mono uppercase tracking-wider">
              Level: {readinessPercentage < 30 ? "Novice Reader" : readinessPercentage < 60 ? "Proficient Comprehender" : readinessPercentage < 85 ? "Strategic Analytical" : "RC Master Elite"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider font-bold">Words Studied</span>
            <div className="p-2 rounded-sm bg-[#F3F1ED] text-[#1A1A1A] border border-[#E5E1DA]"><BookOpen size={16} /></div>
          </div>
          <div>
            <div className="text-3xl font-serif font-black text-[#1A1A1A]">{totalStudied}</div>
            <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider mt-0.5">Unique words loaded</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider font-bold">Mastered (Anki)</span>
            <div className="p-2 rounded-sm bg-[#F3F1ED] text-emerald-850 border border-[#E5E1DA]"><CheckCircle2 size={16} /></div>
          </div>
          <div>
            <div className="text-3xl font-serif font-black text-[#1A1A1A]">{masteredCount}</div>
            <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider mt-0.5">Perfect / Good rating</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider font-bold">Current Streak</span>
            <div className="p-2 rounded-sm bg-[#F3F1ED] text-amber-700 border border-[#E5E1DA]"><Flame size={16} /></div>
          </div>
          <div>
            <div className="text-3xl font-serif font-black text-[#1A1A1A]">{stats.currentStreak} <span className="text-xs font-sans font-normal text-zinc-500">days</span></div>
            <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider mt-0.5">Max streak: {stats.maxStreak} days</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider font-bold">Quiz Accuracy</span>
            <div className="p-2 rounded-sm bg-[#F3F1ED] text-indigo-900 border border-[#E5E1DA]"><Brain size={16} /></div>
          </div>
          <div>
            <div className="text-3xl font-serif font-black text-[#1A1A1A]">{stats.quizAccuracy}%</div>
            <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider mt-0.5">{stats.totalQuizzesTaken} challenge trials</p>
          </div>
        </div>
      </div>

      {/* Spaced Repetition Stats & Category Radar */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Category Strength Breakdown */}
        <div className="bg-white p-6 rounded-sm border border-[#E5E1DA] shadow-sm md:col-span-2 space-y-4">
          <h3 className="text-sm font-sans font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles size={15} /> Genre Core Mastery
          </h3>
          <p className="text-xs text-zinc-650 leading-relaxed">
            CAT Reading Comprehension passages draw extensively from key academic disciplines. Here is your vocabulary footprint across these subjects:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {categories.map((cat) => {
              const count = categoryCount[cat.name] || 0;
              const maxNeeded = 10; // baseline targets
              const percentage = Math.min((count / maxNeeded) * 100, 100);

              return (
                <div key={cat.name} className={`p-3 rounded-sm border ${cat.color} flex flex-col justify-between space-y-2`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-tight font-sans">{cat.name}</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-600">{count} words</span>
                  </div>
                  <div className="w-full bg-[#E5E1DA] h-1 overflow-hidden">
                    <div className="bg-[#1A1A1A] h-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Repetition Engine Status & Backup */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-sm border border-[#E5E1DA] shadow-sm space-y-4">
            <h3 className="text-sm font-sans font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wider">
              <History size={15} /> Spaced Repetition Queue
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-2 border-b border-[#E5E1DA]">
                <span className="text-zinc-650">Scheduled for Today</span>
                <span className="font-mono font-bold text-[#1A1A1A] bg-[#F3F1ED] border border-[#E5E1DA] px-2.5 py-0.5 rounded-sm">
                  {progressList.filter(p => new Date(p.nextReviewDate) <= new Date()).length} words
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-2 border-b border-[#E5E1DA]">
                <span className="text-zinc-650">Active Spaced Loops</span>
                <span className="font-mono font-bold text-zinc-700 bg-[#F3F1ED] border border-[#E5E1DA] px-2.5 py-0.5 rounded-sm">{revisingCount} words</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2">
                <span className="text-zinc-650">Completely Mastered</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 rounded-sm">{masteredCount} words</span>
              </div>
            </div>
            <div className="p-3 bg-[#F9F8F6] rounded-sm border border-[#E5E1DA]">
              <p className="text-[11px] text-zinc-550 leading-relaxed font-sans">
                <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[9px] block mb-0.5">Strategy Protocol:</span> Words rated lower are scheduled at shorter intervals (Day 1, 3, 7) whereas Perfect rating shifts item revision loops to Day 30+.
              </p>
            </div>
          </div>

          {/* Backup Options */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E1DA] shadow-sm space-y-4">
            <h3 className="text-sm font-sans font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wider">
              <Download size={15} /> Local Retention Backup
            </h3>
            <p className="text-xs text-zinc-650 leading-relaxed">
              Your learning histories are saved locally. Export a backup text file or paste it below to restore your progress, streak, and bookmarks!
            </p>
            <div className="flex gap-2">
              <button
                onClick={onExportBackup}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-700 bg-[#F3F1ED] hover:bg-[#E5E1DA] border border-[#E5E1DA] cursor-pointer transition-all"
              >
                <Download size={14} /> Export Backup
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black cursor-pointer transition-all"
              >
                <Upload size={14} /> Restore
              </button>
            </div>

            {showImport && (
              <div className="pt-3 space-y-2.5 border-t border-[#E5E1DA]">
                <textarea
                  placeholder="Paste your JSON backup data here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-24 p-3.5 text-xs border border-[#E5E1DA] bg-[#F9F8F6] rounded-sm font-mono focus:outline-none focus:border-[#1A1A1A]"
                />
                {importError && (
                  <p className="text-[11px] text-rose-700 font-bold">{importError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowImport(false)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-3 py-1 bg-[#1A1A1A] hover:bg-black text-white rounded-sm text-[10px] font-bold uppercase tracking-widest"
                  >
                    Import Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
