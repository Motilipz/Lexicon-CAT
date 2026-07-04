import React, { useState } from 'react';
import { BookOpen, Brain, Loader2, Sparkles, HelpCircle, Plus, ChevronRight, Check } from 'lucide-react';
import { Word } from '../types';

interface ReadingModeProps {
  dictionaryWords: Word[];
  onSelectWord: (word: Word) => void;
  onAddNewWord: (word: Word) => void;
}

// Quick preseeded passages so they can try it instantly
const SAMPLE_PASSAGES = [
  {
    title: "Philosophy & Epistemology: The Hermeneutics of Skepticism",
    genre: "Philosophy",
    text: "The hermeneutical study of historical skepticism reveals a glaring anachronism in modern interpretations of Cartesian doubt. Rather than being a purely destructive tool, Cartesian skepticism was a fastidious search for foundation. To judge Descartes through a contemporary pragmatic lens is to commit a grave interpretative error, projecting modern sensibilities onto classical actors whose taciturn silence on modern tech is entirely expected. An observer must remain scrupulous in verifying the veracity of such ideological claims, avoiding a capricious dismissal of ancient philosophical structures."
  },
  {
    title: "Behavioral Economics: Market Volatility and Choice Architecture",
    genre: "Economics",
    text: "In behavioral economics, decision-making is modeled as an erratic series of capricious reactions to environmental stimuli rather than a cold, rational calculation. This superfluous focus on abstract equations has left classical theorists unable to predict sudden, mercurial shifts in market confidence. To capture the actual velocity of market panic, analysts must discard theoretical dogmas and adopt a pragmatic approach. A toxic or pernicious corporate culture, where employees act like sycophants who fawn over CEOs rather than offering candid criticisms, further distorts pricing signals and breeds economic instability."
  },
  {
    title: "Sociology & Law: Feudal Codification and Servility",
    genre: "Law / Sociology",
    text: "Feudal societies systematically codified obsequious behavior, rewarding sycophantic servility with land grants and punishing independent dissent with swift retribution. These historical structures relied on a cacophony of overlapping jurisdictions that rendered justice highly capricious. Modern legal scholars, through assiduous archival research, have shown that such systems were far from stable. When asked if law preserves order, the historical archives give an equivocal response, showing how legal codification often served as a screen for raw power."
  }
];

export default function ReadingMode({
  dictionaryWords,
  onSelectWord,
  onAddNewWord
}: ReadingModeProps) {
  const [inputText, setInputText] = useState('');
  const [activeText, setActiveText] = useState(SAMPLE_PASSAGES[0].text);
  const [lookupWord, setLookupWord] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [isImported, setIsImported] = useState(false);

  // Split text into tokens (words and non-words) to maintain exact layout
  const tokenizeText = (text: string) => {
    // Regex matching alphanumeric words, or non-alphanumeric clusters
    return text.split(/(\b[a-zA-Z]+-?[a-zA-Z]*\b)/);
  };

  // Check if a word exists in our active list
  const getExistingWord = (token: string): Word | undefined => {
    const clean = token.toLowerCase().trim();
    return dictionaryWords.find(w => w.word.toLowerCase() === clean);
  };

  // Perform Gemini AI quick lookup for ANY word not in dictionary
  const handleWordClick = async (token: string) => {
    const cleanWord = token.replace(/[^a-zA-Z-]/g, '').trim();
    if (!cleanWord || cleanWord.length < 2) return;

    // If it exists in active list, just select it!
    const existing = getExistingWord(cleanWord);
    if (existing) {
      onSelectWord(existing);
      setLookupWord('');
      setLookupResult(null);
      return;
    }

    // Otherwise, perform AI live lookup
    setLookupWord(cleanWord);
    setIsLoadingLookup(true);
    setLookupResult(null);
    setLookupError('');
    setIsImported(false);

    try {
      const response = await fetch('/api/gemini/quick-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanWord })
      });

      if (!response.ok) {
        throw new Error("Failed to look up word via AI server.");
      }

      const data = await response.json();
      setLookupResult(data);
    } catch (err: any) {
      console.error(err);
      setLookupError(`Could not analyze "${cleanWord}". Please check connection or try again.`);
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleImportLookup = () => {
    if (!lookupResult) return;
    onAddNewWord(lookupResult);
    setIsImported(true);
  };

  const tokens = tokenizeText(activeText);

  return (
    <div className="space-y-6" id="reading-mode-wrapper">
      
      {/* Editorial Selector */}
      <div className="grid md:grid-cols-3 gap-4" id="pasted-text-inputs">
        {/* Paste Box */}
        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm md:col-span-2 space-y-3">
          <h3 className="text-sm font-sans font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wider">
            <BookOpen size={15} /> Paste Editorial or RC Passage
          </h3>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste any article from The Hindu, Indian Express, NYT, or a practice RC passage here..."
            className="w-full h-24 p-3 text-sm border border-[#E5E1DA] rounded-sm focus:outline-none focus:border-[#1A1A1A] bg-[#F9F8F6] text-zinc-800 transition-colors"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 leading-snug max-w-[70%]">Click words inside the passage for interactive explanation and vocabulary indexing.</span>
            <button
              onClick={() => {
                if (inputText.trim()) {
                  setActiveText(inputText);
                  setInputText('');
                }
              }}
              disabled={!inputText.trim()}
              className={`px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                inputText.trim() 
                  ? "bg-[#1A1A1A] text-white hover:bg-black" 
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
              }`}
            >
              Analyze
            </button>
          </div>
        </div>

        {/* Preset Passages Carousel */}
        <div className="bg-white p-5 rounded-sm border border-[#E5E1DA] shadow-sm flex flex-col justify-between">
          <div className="space-y-1.5">
            <h3 className="text-sm font-sans font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} /> Preset RC Passages
            </h3>
            <p className="text-xs text-zinc-650 leading-relaxed">
              Try one of our highly dense academic passages to test live highlights and click-lookups:
            </p>
          </div>

          <div className="space-y-2 pt-3">
            {SAMPLE_PASSAGES.map((pass, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveText(pass.text);
                  setLookupWord('');
                  setLookupResult(null);
                }}
                className={`w-full p-2.5 rounded-sm border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                  activeText === pass.text
                    ? "border-[#1A1A1A] bg-[#F3F1ED] text-[#1A1A1A] font-bold"
                    : "border-[#E5E1DA] bg-white hover:bg-[#F3F1ED] text-zinc-700"
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-serif font-bold block truncate">{pass.title}</span>
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{pass.genre}</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Screen layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Interactive Reader Block */}
        <div className="bg-white p-6 md:p-8 rounded-sm border border-[#E5E1DA] shadow-sm lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#E5E1DA] pb-4">
            <h2 className="text-base font-sans font-bold text-[#1A1A1A] flex items-center gap-2 uppercase tracking-wider">
              <BookOpen size={16} /> Interactive Reader Canvas
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/20 border border-amber-300" /> Dictionary Word
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-50 border border-[#E5E1DA]" /> Standard Word
              </span>
            </div>
          </div>

          {/* Rendered tokenized article */}
          <div className="font-serif text-base md:text-lg leading-relaxed text-zinc-800 space-y-4 max-h-[500px] overflow-y-auto pr-2 select-text">
            <p className="indent-8 text-justify">
              {tokens.map((token, idx) => {
                const existing = getExistingWord(token);
                
                if (existing) {
                  return (
                    <button
                      key={idx}
                      onClick={() => handleWordClick(token)}
                      className="px-1 py-0.5 rounded-sm bg-amber-400/10 border-b-2 border-amber-500 text-zinc-950 font-bold cursor-pointer hover:bg-amber-400/25 transition-all focus:outline-none"
                      title={`Definition: ${existing.simpleDefinition}`}
                    >
                      {token}
                    </button>
                  );
                }

                const isWord = /^[a-zA-Z]+-?[a-zA-Z]*$/.test(token);
                if (isWord) {
                  return (
                    <span
                      key={idx}
                      onClick={() => handleWordClick(token)}
                      className="cursor-pointer hover:bg-[#F3F1ED] hover:text-black px-0.5 rounded-sm transition-all"
                    >
                      {token}
                    </span>
                  );
                }

                return <span key={idx}>{token}</span>;
              })}
            </p>
          </div>
        </div>

        {/* Live Lookup Side Panel */}
        <div className="space-y-4">
          {/* Default idle block */}
          {!lookupWord && !isLoadingLookup && (
            <div className="bg-[#F3F1ED] border border-[#E5E1DA] rounded-sm p-6 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[300px]">
              <HelpCircle className="text-zinc-400" size={32} />
              <div className="space-y-1">
                <h4 className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-widest">AI Instant Dictionary</h4>
                <p className="text-xs text-zinc-650 max-w-[200px] mx-auto leading-relaxed mt-1">
                  Click any word in the passage canvas to run an instant phonetic, Hindi, and mnemonic analysis.
                </p>
              </div>
            </div>
          )}

          {/* Loading scan state */}
          {isLoadingLookup && (
            <div className="bg-white border border-[#E5E1DA] shadow-sm rounded-sm p-6 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[300px] animate-pulse">
              <Loader2 className="text-[#1A1A1A] animate-spin" size={32} />
              <div className="space-y-1">
                <h4 className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-widest">Scanning &quot;{lookupWord}&quot;...</h4>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px] mx-auto mt-1">
                  AI is scanning linguistic corpora, root origin databases, and translating meaning.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {lookupError && (
            <div className="bg-rose-50 border border-rose-200 rounded-sm p-6 text-center space-y-4 min-h-[300px] flex flex-col items-center justify-center">
              <p className="text-xs text-rose-800 font-medium leading-relaxed">{lookupError}</p>
              <button
                onClick={() => handleWordClick(lookupWord)}
                className="px-3.5 py-1.5 bg-rose-700 text-white rounded-sm text-xs font-semibold cursor-pointer"
              >
                Retry Lookup
              </button>
            </div>
          )}

          {/* Successfully looked up custom word sheet */}
          {lookupResult && !isLoadingLookup && (
            <div className="bg-white border border-[#E5E1DA] shadow-sm rounded-sm p-5 space-y-4 animate-fade-in">
              <div className="flex justify-between items-start border-b border-[#E5E1DA] pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold bg-[#F3F1ED] text-zinc-700 px-2 py-0.5 rounded-sm border border-[#E5E1DA]">AI SCAN</span>
                  <h3 className="text-xl font-serif font-bold text-[#1A1A1A] mt-1 select-all">{lookupResult.word}</h3>
                  <div className="flex gap-2 items-center text-xs text-zinc-500 mt-0.5">
                    <span className="font-mono">{lookupResult.ipa}</span>
                    <span className="italic font-serif">({lookupResult.partOfSpeech.toLowerCase()})</span>
                  </div>
                </div>

                {isImported ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase border border-emerald-250 tracking-wider">
                    <Check size={12} /> Learned
                  </span>
                ) : (
                  <button
                    onClick={handleImportLookup}
                    className="px-2.5 py-1 rounded-sm bg-[#1A1A1A] text-white hover:bg-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="Import to Spaced Repetition Study Lists"
                  >
                    <Plus size={12} /> Study
                  </button>
                )}
              </div>

              {/* Definitions */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Translation Definition</span>
                  <p className="text-zinc-800 font-medium font-serif leading-relaxed mt-0.5">{lookupResult.simpleDefinition}</p>
                </div>

                <div className="bg-[#F9F8F6] p-2.5 rounded-sm border border-[#E5E1DA]">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block">Hindi Meaning</span>
                  <p className="text-zinc-900 font-sans font-semibold text-xs mt-0.5">{lookupResult.hindiMeaning}</p>
                </div>

                {/* AI Mnemonic */}
                <div className="p-3 bg-amber-50/40 rounded-sm border border-amber-200 text-zinc-800 space-y-0.5">
                  <span className="text-[9px] font-mono uppercase text-amber-700 font-bold flex items-center gap-1">
                    <Brain size={11} className="fill-amber-500 text-amber-550" /> AI-Generated Mnemonic
                  </span>
                  <p className="italic font-sans text-xs leading-relaxed">{lookupResult.memory.mnemonic}</p>
                </div>

                {/* Synonyms */}
                <div>
                  <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold block">Synonyms</span>
                  <p className="text-zinc-700 font-medium mt-0.5">
                    {lookupResult.synonyms.easy}, {lookupResult.synonyms.medium}, <span className="text-[#1A1A1A] font-bold underline">{lookupResult.synonyms.advanced}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
