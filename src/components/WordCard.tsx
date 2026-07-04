import React, { useState } from 'react';
import { Book, Bookmark, BookmarkCheck, Brain, Calendar, AlertTriangle, GitBranch, HelpCircle, Layers, Lightbulb, Play, Quote, RefreshCw, Star, Volume2 } from 'lucide-react';
import { Word, MemoryConfidence, UserWordProgress } from '../types';

interface WordCardProps {
  word: Word;
  progress?: UserWordProgress;
  onBookmarkToggle: (word: string) => void;
  onRateConfidence: (word: string, confidence: MemoryConfidence) => void;
  onAddNote: (word: string, note: string) => void;
}

export default function WordCard({
  word,
  progress,
  onBookmarkToggle,
  onRateConfidence,
  onAddNote
}: WordCardProps) {
  const [activeTab, setActiveTab] = useState<'meanings' | 'memory' | 'etymology' | 'contexts' | 'mistakes'>('meanings');
  const [noteText, setNoteText] = useState(progress?.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  // Fallback TTS pronunciation
  const speakWord = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // slightly slower for clean phonetic analysis
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  const handleSaveNote = () => {
    onAddNote(word.word, noteText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < word.difficulty);

  return (
    <div className="bg-white rounded-sm border border-[#E5E1DA] shadow-sm overflow-hidden flex flex-col h-full" id={`word-card-${word.word}`}>
      
      {/* Top Header Card */}
      <div className="p-6 bg-[#FDFCFB] border-b border-[#E5E1DA] relative">
        {/* Bookmark and Tags */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F3F1ED] text-zinc-700 border border-[#E5E1DA]">
              {word.category}
            </span>
            <span className="px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold bg-[#1A1A1A] text-white uppercase border border-[#1A1A1A]">
              {word.cefr}
            </span>
          </div>
          <button
            onClick={() => onBookmarkToggle(word.word)}
            className="p-1.5 rounded-sm hover:bg-[#F3F1ED] text-zinc-400 hover:text-amber-600 transition-all cursor-pointer border border-transparent hover:border-[#E5E1DA]"
            title="Bookmark Word"
            id={`bookmark-${word.word}`}
          >
            {progress?.bookmarked ? (
              <BookmarkCheck className="text-amber-600 fill-amber-500" size={18} />
            ) : (
              <Bookmark size={18} />
            )}
          </button>
        </div>

        {/* Word Display and TTS Play */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            {word.word}
          </h1>
          <button
            onClick={speakWord}
            className="p-2 rounded-sm bg-white hover:bg-[#F3F1ED] text-zinc-800 transition-all cursor-pointer border border-[#E5E1DA]"
            title="Play Audio Pronunciation"
            id={`audio-play-${word.word}`}
          >
            <Volume2 size={15} />
          </button>
        </div>

        {/* IPA Pronunciation & Part of Speech */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm">
          <span className="font-mono text-zinc-500 select-all" title="Phonetic Spelling">
            {word.ipa}
          </span>
          <span className="text-zinc-500 font-serif italic">
            ({word.partOfSpeech.toLowerCase()})
          </span>
          
          {/* Difficulty Stars */}
          <div className="flex items-center gap-0.5 ml-1" title={`Difficulty: ${word.difficulty}/5`}>
            {difficultyStars.map((isLit, idx) => (
              <Star
                key={idx}
                size={12}
                className={isLit ? "text-amber-500 fill-amber-500" : "text-zinc-200"}
              />
            ))}
          </div>
        </div>

        {/* Tone and Connotation Tags */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-dashed border-[#E5E1DA]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Tone:</span>
            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-semibold border uppercase ${
              word.emotionalTone.toLowerCase() === 'positive' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : word.emotionalTone.toLowerCase() === 'negative' 
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-zinc-50 text-zinc-700 border-[#E5E1DA]'
            }`}>
              {word.emotionalTone}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">CAT Frequency:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 bg-[#E5E1DA] rounded-full h-1 overflow-hidden">
                <div className="bg-[#1A1A1A] h-full" style={{ width: `${word.frequency}%` }} />
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-600">{word.frequency}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for detailed sections */}
      <div className="flex border-b border-[#E5E1DA] overflow-x-auto scrollbar-none bg-[#F3F1ED]">
        <button
          onClick={() => setActiveTab('meanings')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'meanings' 
              ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <Book size={13} /> Meanings
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'memory' 
              ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <Brain size={13} /> Mnemonics
        </button>
        <button
          onClick={() => setActiveTab('etymology')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'etymology' 
              ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <GitBranch size={13} /> Root Origin
        </button>
        <button
          onClick={() => setActiveTab('contexts')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'contexts' 
              ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <Quote size={13} /> Usage Examples
        </button>
        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'mistakes' 
              ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <AlertTriangle size={13} /> Pitfalls
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5 max-h-[460px] min-h-[300px] bg-white">
        {activeTab === 'meanings' && (
          <div className="space-y-5 animate-fade-in" id="meanings-tab-content">
            {/* Simple Definition */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Translation Definition</span>
              <p className="text-zinc-800 text-sm md:text-base leading-relaxed font-serif">
                {word.simpleDefinition}
              </p>
            </div>

            {/* Hindi Meaning */}
            <div className="bg-[#F9F8F6] p-4 rounded-sm border border-[#E5E1DA] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1A1A1A] font-bold">Hindi Translation</span>
                <p className="text-zinc-900 font-sans text-base font-semibold mt-0.5 leading-snug">
                  {word.hindiMeaning}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-[#1A1A1A] text-white font-mono font-bold rounded-sm border border-[#1A1A1A]">
                हिन्दी
              </span>
            </div>

            {/* Detailed Dictionary Definition */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Academic Explanation</span>
              <p className="text-zinc-700 text-xs md:text-sm leading-relaxed">
                {word.detailedDefinition}
              </p>
            </div>

            {/* Alternative meanings */}
            {word.alternativeMeanings && word.alternativeMeanings.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Alternative Interpretations</span>
                <ul className="list-disc list-inside text-xs text-zinc-600 space-y-1.5 pl-1 leading-relaxed">
                  {word.alternativeMeanings.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Synonyms Grid */}
            <div className="pt-3 grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 rounded-sm border border-[#E5E1DA]">
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-450 font-bold block mb-1">Easy synonym</span>
                <span className="text-xs font-semibold text-zinc-800">{word.synonyms.easy}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-sm border border-[#E5E1DA]">
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-1">Medium synonym</span>
                <span className="text-xs font-semibold text-[#1A1A1A]">{word.synonyms.medium}</span>
              </div>
              <div className="p-3 bg-[#FDFCFB] rounded-sm border border-amber-300">
                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-700 font-bold block mb-1">Advanced (CAT)</span>
                <span className="text-xs font-bold text-amber-900">{word.synonyms.advanced}</span>
              </div>
            </div>

            {/* Antonyms */}
            {word.antonyms && word.antonyms.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-2">Useful Antonyms</span>
                <div className="flex flex-wrap gap-2">
                  {word.antonyms.map((ant, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-sm text-xs bg-[#F3F1ED] text-zinc-700 border border-[#E5E1DA] font-medium">
                      {ant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-5 animate-fade-in" id="memory-tab-content">
            {/* Primary Mnemonic */}
            <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-sm space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-amber-700 font-bold flex items-center gap-1.5">
                <Lightbulb size={12} className="fill-amber-500 text-amber-600" /> Verbal Mnemonic Aid
              </span>
              <p className="text-zinc-900 text-sm leading-relaxed font-sans font-medium">
                {word.memory.mnemonic}
              </p>
            </div>

            {/* Visual Metaphor */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Visual Metaphor</span>
              <p className="text-zinc-700 text-xs md:text-sm leading-relaxed leading-relaxed">
                {word.memory.visualImagination}
              </p>
            </div>

            {/* Narrative Trick */}
            <div className="space-y-1 border-t border-[#E5E1DA] pt-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Memory Storyline</span>
              <p className="text-zinc-700 text-xs md:text-sm leading-relaxed italic font-serif">
                &ldquo;{word.memory.storyTrick}&rdquo;
              </p>
            </div>

            {/* Real Life / Quirky Connections */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-zinc-50 rounded-sm border border-[#E5E1DA] text-xs space-y-1">
                <span className="font-mono font-bold text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Real-Life Association</span>
                <p className="text-zinc-700 leading-relaxed">{word.memory.realAssociation}</p>
              </div>
              <div className="p-3.5 bg-zinc-50 rounded-sm border border-[#E5E1DA] text-xs space-y-1">
                <span className="font-mono font-bold text-[9px] uppercase tracking-widest text-zinc-500 block mb-0.5">Quirky Memory Cue</span>
                <p className="text-zinc-700 leading-relaxed">{word.memory.funnyTrick}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'etymology' && (
          <div className="space-y-5 animate-fade-in" id="etymology-tab-content">
            {/* Root-word Breakdown Tree */}
            <div className="p-4 bg-zinc-50 border border-[#E5E1DA] rounded-sm space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">Root Breakdown Tree</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Core Root Word</span>
                  <p className="text-base font-bold text-[#1A1A1A] font-mono select-all">
                    &quot;{word.etymology.rootWord}&quot;
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Root Definition</span>
                  <p className="text-sm font-semibold text-zinc-800">
                    {word.etymology.rootMeaning}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-dashed border-[#E5E1DA]">
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 block">Prefix</span>
                  <span className="font-mono font-bold text-zinc-850">{word.etymology.prefix || "None"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 block">Suffix</span>
                  <span className="font-mono font-bold text-zinc-850">{word.etymology.suffix || "None"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 block">Origin Language</span>
                  <span className="font-bold text-zinc-850">{word.etymology.origin}</span>
                </div>
              </div>
            </div>

            {/* Shared Root Words (Semantic inferences) */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                Etymological Inferences: Words Sharing Root
              </span>
              <div className="space-y-2">
                {word.etymology.sharedRootWords.map((shared, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-sm bg-white hover:bg-zinc-50 transition-colors border border-[#E5E1DA] text-xs">
                    <span className="font-mono font-bold text-zinc-900 select-all sm:w-1/3">
                      {shared.word}
                    </span>
                    <span className="text-zinc-650 sm:w-2/3 mt-0.5 sm:mt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-[#E5E1DA] leading-relaxed">
                      {shared.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Word Forms Family */}
            {word.wordFamily && word.wordFamily.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-2">Word Family Tree</span>
                <div className="flex flex-wrap gap-2">
                  {word.wordFamily.map((fam, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs bg-[#F3F1ED] text-zinc-800 border border-[#E5E1DA]">
                      <span className="font-bold select-all">{fam.form}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">({fam.partOfSpeech.toLowerCase()})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contexts' && (
          <div className="space-y-4 animate-fade-in" id="contexts-tab-content">
            {/* Sentences matrix */}
            <div className="space-y-4">
              {Object.entries(word.contextExamples).map(([key, value]) => {
                const colors: { [k: string]: { label: string; bg: string; text: string } } = {
                  simple: { label: "Everyday Standard Context", bg: "bg-zinc-100", text: "text-zinc-700" },
                  editorial: { label: "Newspaper Editorial Context", bg: "bg-zinc-200/50", text: "text-zinc-800" },
                  catRc: { label: "CAT Academic RC Context (Complex Structure)", bg: "bg-amber-55/40", text: "text-amber-950" },
                  business: { label: "Commercial Business Context", bg: "bg-emerald-50", text: "text-emerald-800" },
                  academic: { label: "Research Journal Context", bg: "bg-purple-50", text: "text-purple-800" },
                  conversation: { label: "Conversational Context", bg: "bg-rose-50", text: "text-rose-800" },
                };
                const style = colors[key] || { label: key, bg: "bg-zinc-50", text: "text-zinc-800" };

                return (
                  <div key={key} className="space-y-1.5 p-4 rounded-sm bg-white border border-[#E5E1DA]">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold ${style.bg} ${style.text} uppercase border border-[#E5E1DA]`}>
                      {style.label}
                    </span>
                    <p className="text-zinc-800 text-xs md:text-sm leading-relaxed font-serif italic pl-1">
                      &ldquo;{value}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'mistakes' && (
          <div className="space-y-5 animate-fade-in" id="mistakes-tab-content">
            {/* Common Mistakes */}
            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-sm space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-850 font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} className="fill-rose-500 text-rose-600" /> Confusions & Pitfalls
              </span>

              <div>
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Often Confused With</span>
                <p className="text-xs font-bold text-rose-900 mt-0.5">
                  {word.commonMistakes.confusedWith}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-sm bg-red-50/50 border border-red-250 text-[11px]">
                  <span className="font-mono text-rose-850 uppercase font-bold text-[9px] block">Incorrect Usage</span>
                  <p className="text-zinc-700 leading-relaxed italic mt-0.5">&ldquo;{word.commonMistakes.incorrectUsage}&rdquo;</p>
                </div>
                <div className="p-3 rounded-sm bg-emerald-50/50 border border-emerald-250 text-[11px]">
                  <span className="font-mono text-emerald-850 uppercase font-bold text-[9px] block">Correct Usage</span>
                  <p className="text-zinc-700 leading-relaxed italic mt-0.5">&ldquo;{word.commonMistakes.correctUsage}&rdquo;</p>
                </div>
              </div>

              <div className="border-t border-rose-200/40 pt-2 text-[11px]">
                <span className="font-mono text-zinc-500 uppercase text-[9px] block">Academic Distinction</span>
                <p className="text-zinc-700 leading-relaxed mt-0.5">{word.commonMistakes.grammarMistake}</p>
              </div>
            </div>

            {/* Reading Recognition tips */}
            <div className="space-y-2 p-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">Authorial Clues & RC Tactics</span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 block">Editorial Behaviour:</span>
                  <p className="text-zinc-650 leading-relaxed mt-0.5">{word.readingRecognition.newspaperAppearance}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 block">Passage Tone Signal:</span>
                  <p className="text-zinc-650 leading-relaxed mt-0.5">Signals a <span className="font-semibold text-zinc-900">{word.readingRecognition.authorTone}</span> authorial tone.</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 block">Subtextual Meaning:</span>
                  <p className="text-zinc-650 leading-relaxed italic mt-0.5">{word.readingRecognition.hiddenMeanings}</p>
                </div>
              </div>
            </div>

            {/* Collocations */}
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-2.5">
                Common Collocations (Natural Pairings)
              </span>
              <div className="flex flex-wrap gap-2">
                {word.collocations.map((coll, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-sm text-xs font-mono font-semibold bg-[#F3F1ED] text-zinc-800 border border-[#E5E1DA]">
                    {coll}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note pad section */}
      <div className="p-4 bg-[#F9F8F6] border-t border-[#E5E1DA] space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Personal Mnemonic Notes</span>
          {isSaved && <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Saved!</span>}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add personal mnemonic hints, translation rules, or key themes..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-white border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] text-zinc-800"
          />
          <button
            onClick={handleSaveNote}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      {/* Spaced repetition memory confidence rates */}
      <div className="p-5 bg-[#F3F1ED] border-t border-[#E5E1DA]">
        <div className="text-center mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#1A1A1A] font-bold block">
            Memory Recall Confidence (Anki Spaced Repetition)
          </span>
          <p className="text-[10px] text-zinc-550 mt-0.5">
            Select rating to schedule this word for dynamic revision loops.
          </p>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onRateConfidence(word.word, 'perfect')}
            className="flex flex-col items-center justify-center p-2.5 rounded-sm border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 cursor-pointer transition-all active:scale-95"
            id={`rate-perfect-${word.word}`}
          >
            <span className="text-xs font-bold font-sans">Perfect</span>
            <span className="text-[8px] font-mono text-emerald-700 font-bold mt-0.5">Day 30+</span>
          </button>
          <button
            onClick={() => onRateConfidence(word.word, 'good')}
            className="flex flex-col items-center justify-center p-2.5 rounded-sm border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 cursor-pointer transition-all active:scale-95"
            id={`rate-good-${word.word}`}
          >
            <span className="text-xs font-bold font-sans">Good</span>
            <span className="text-[8px] font-mono text-blue-700 font-bold mt-0.5">Day 7</span>
          </button>
          <button
            onClick={() => onRateConfidence(word.word, 'unsure')}
            className="flex flex-col items-center justify-center p-2.5 rounded-sm border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 cursor-pointer transition-all active:scale-95"
            id={`rate-unsure-${word.word}`}
          >
            <span className="text-xs font-bold font-sans">Unsure</span>
            <span className="text-[8px] font-mono text-amber-700 font-bold mt-0.5">Day 3</span>
          </button>
          <button
            onClick={() => onRateConfidence(word.word, 'forgot')}
            className="flex flex-col items-center justify-center p-2.5 rounded-sm border border-rose-300 bg-white hover:bg-rose-50 text-rose-900 cursor-pointer transition-all active:scale-95"
            id={`rate-forgot-${word.word}`}
          >
            <span className="text-xs font-bold font-sans">Forgot</span>
            <span className="text-[8px] font-mono text-rose-700 font-bold mt-0.5">Day 1</span>
          </button>
        </div>
      </div>
    </div>
  );
}
