import React, { useState } from 'react';
import { Award, Brain, CheckCircle, HelpCircle, Loader2, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { Word, QuizQuestion } from '../types';

interface QuizEngineProps {
  wordsStudied: Word[];
  weakCategories: string[];
  onQuizCompleted: (accuracy: number) => void;
}

export default function QuizEngine({
  wordsStudied,
  weakCategories,
  onQuizCompleted
}: QuizEngineProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAns, setSelectedAns] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'active' | 'completed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Local Quiz Generator from studied words
  const generateLocalQuiz = () => {
    if (wordsStudied.length < 4) {
      setErrorMessage("Please study at least 4 words before starting a quiz so we have enough options.");
      return;
    }
    setErrorMessage('');
    setQuizState('loading');

    // Create 5 random questions
    const generated: QuizQuestion[] = [];
    const shuffledWords = [...wordsStudied].sort(() => 0.5 - Math.random());
    const limit = Math.min(shuffledWords.length, 5);

    for (let i = 0; i < limit; i++) {
      const targetWord = shuffledWords[i];
      const otherWords = wordsStudied.filter(w => w.word !== targetWord.word);
      const distractors = otherWords.sort(() => 0.5 - Math.random()).slice(0, 3);

      const qTypes: Array<'meaning-recall' | 'fill-blank' | 'synonym' | 'collocation'> = [
        'meaning-recall',
        'fill-blank',
        'synonym',
        'collocation'
      ];
      const selectedType = qTypes[Math.floor(Math.random() * qTypes.length)];

      let question = '';
      let correctAnswer = '';
      let options: string[] = [];
      let explanation = '';

      if (selectedType === 'meaning-recall') {
        question = `What is the correct meaning of the word "${targetWord.word}"?`;
        correctAnswer = targetWord.simpleDefinition;
        options = [correctAnswer, ...distractors.map(d => d.simpleDefinition)].sort(() => 0.5 - Math.random());
        explanation = `"${targetWord.word}" means: ${targetWord.detailedDefinition}. Hindi meaning: ${targetWord.hindiMeaning}.`;
      } else if (selectedType === 'fill-blank') {
        // Use conversational context
        const sentence = targetWord.contextExamples.simple;
        // replace word with blank
        const regex = new RegExp(targetWord.word, 'gi');
        question = `Complete the sentence with the most appropriate word: \n"${sentence.replace(regex, '_______')}"`;
        correctAnswer = targetWord.word;
        options = [correctAnswer, ...distractors.map(d => d.word)].sort(() => 0.5 - Math.random());
        explanation = `The correct word is "${targetWord.word}". Context: "${sentence}"`;
      } else if (selectedType === 'synonym') {
        question = `Which of the following is a direct synonym for "${targetWord.word}"?`;
        correctAnswer = targetWord.synonyms.advanced; // Advanced CAT synonyms
        options = [correctAnswer, ...distractors.map(d => d.synonyms.easy)].sort(() => 0.5 - Math.random());
        explanation = `The correct synonym is "${correctAnswer}". Synonyms range from simple ("${targetWord.synonyms.easy}") to advanced ("${targetWord.synonyms.advanced}").`;
      } else {
        // Collocation Matching
        const colVal = targetWord.collocations[0] || `${targetWord.word} evidence`;
        const restOfCol = colVal.toLowerCase().replace(targetWord.word.toLowerCase(), '').trim();
        question = `Identify the correct, frequently occurring collocation (word pairing) for the word "${targetWord.word}":`;
        correctAnswer = `${targetWord.word} ${restOfCol}`;
        options = [
          correctAnswer,
          `${targetWord.word} irrelevant`,
          `${targetWord.word} obsolete`,
          `${targetWord.word} shallow`
        ].sort(() => 0.5 - Math.random());
        explanation = `"${correctAnswer}" is a natural native collocation. Core collocations include: ${targetWord.collocations.join(', ')}.`;
      }

      generated.push({
        id: `q-${i}`,
        type: selectedType,
        word: targetWord.word,
        question,
        options,
        correctAnswer,
        explanation
      });
    }

    setQuestions(generated);
    setCurrentIdx(0);
    setCorrectCount(0);
    setSelectedAns('');
    setHasSubmitted(false);
    setQuizState('active');
  };

  // Generate AI Quiz via Gemini backend proxy
  const generateAIQuiz = async () => {
    setErrorMessage('');
    setQuizState('loading');

    const studiedList = wordsStudied.map(w => w.word);

    try {
      const response = await fetch('/api/gemini/generate-ai-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: studiedList.slice(0, 10), // focus on a few studied words
          weakCategories
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch AI questions.");
      }

      const aiQuestions: QuizQuestion[] = await response.json();
      if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
        throw new Error("Invalid questions structure returned by AI.");
      }

      setQuestions(aiQuestions);
      setCurrentIdx(0);
      setCorrectCount(0);
      setSelectedAns('');
      setHasSubmitted(false);
      setQuizState('active');
    } catch (err: any) {
      console.error("AI Quiz generation failure:", err);
      setErrorMessage(`Could not generate AI quiz: ${err.message}. Defaulting to studied-words quiz.`);
      // Fallback
      setTimeout(() => {
        generateLocalQuiz();
      }, 1500);
    }
  };

  const handleSelectOption = (opt: string) => {
    if (hasSubmitted) return;
    setSelectedAns(opt);
  };

  const handleSubmit = () => {
    if (!selectedAns) return;
    setHasSubmitted(true);
    if (selectedAns === questions[currentIdx].correctAnswer) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAns('');
      setHasSubmitted(false);
    } else {
      // Completed!
      const accuracy = Math.round((correctCount / questions.length) * 100);
      onQuizCompleted(accuracy);
      setQuizState('completed');
    }
  };

  return (
    <div className="bg-white rounded-sm border border-[#E5E1DA] shadow-sm p-6 max-w-3xl mx-auto" id="quiz-engine-wrapper">
      
      {/* State 1: Idle selection screen */}
      {quizState === 'idle' && (
        <div className="text-center py-8 space-y-6 animate-fade-in" id="quiz-idle">
          <div className="inline-flex p-3 rounded-sm bg-[#F3F1ED] text-zinc-800 border border-[#E5E1DA] mb-2">
            <Brain size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">Active Recall Exam Arena</h2>
            <p className="text-zinc-600 text-sm max-w-md mx-auto leading-relaxed">
              Test your contextual comprehension, advanced synonyms, natural collocations, and root inferences to cement memory trails.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 rounded-sm text-xs max-w-md mx-auto">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={generateLocalQuiz}
              className="px-6 py-3 bg-[#1A1A1A] hover:bg-black text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> Studied Words Quiz
            </button>
            <button
              onClick={generateAIQuiz}
              className="px-6 py-3 bg-[#F3F1ED] hover:bg-[#E5E1DA] border border-[#E5E1DA] text-[#1A1A1A] rounded-sm text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles size={14} /> AI-Generated CAT Quiz
            </button>
          </div>
          
          <p className="text-[10px] text-zinc-450 uppercase font-mono tracking-wider">
            *AI adaptive quizzes leverage studied items & target your weaknesses.
          </p>
        </div>
      )}

      {/* State 2: Loading animation */}
      {quizState === 'loading' && (
        <div className="text-center py-16 space-y-4" id="quiz-loading">
          <Loader2 className="animate-spin text-[#1A1A1A] mx-auto" size={44} />
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#1A1A1A] uppercase font-mono tracking-wider">Compiling Challenge...</p>
            <p className="text-xs text-zinc-500">Custom-assembling questions, distractors, and context explanations.</p>
          </div>
        </div>
      )}

      {/* State 3: Quiz in progress */}
      {quizState === 'active' && questions.length > 0 && (
        <div className="space-y-6 animate-fade-in" id="quiz-active">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span>Score: {correctCount}/{currentIdx + (hasSubmitted ? 1 : 0)}</span>
            </div>
            <div className="w-full bg-[#E5E1DA] rounded-full h-1 overflow-hidden">
              <div 
                className="bg-[#1A1A1A] h-full transition-all duration-300" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Box */}
          <div className="p-5 bg-[#F9F8F6] border border-[#E5E1DA] rounded-sm">
            <span className="px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold bg-[#F3F1ED] text-zinc-700 border border-[#E5E1DA] uppercase">
              {questions[currentIdx].type}
            </span>
            <p className="text-base md:text-lg font-serif font-bold text-zinc-900 mt-4 whitespace-pre-wrap leading-relaxed">
              {questions[currentIdx].question}
            </p>
          </div>

          {/* Choices Options Grid */}
          <div className="grid gap-2.5">
            {questions[currentIdx].options.map((opt, i) => {
              const isSelected = selectedAns === opt;
              const isCorrect = opt === questions[currentIdx].correctAnswer;
              
              let btnClass = "border-[#E5E1DA] bg-white hover:bg-[#F3F1ED] text-zinc-850";
              let icon = null;

              if (hasSubmitted) {
                if (isCorrect) {
                  btnClass = "border-emerald-500 bg-emerald-50 text-emerald-950";
                  icon = <CheckCircle size={16} className="text-emerald-700 ml-auto" />;
                } else if (isSelected) {
                  btnClass = "border-rose-450 bg-rose-50 text-rose-950";
                  icon = <XCircle size={16} className="text-rose-700 ml-auto" />;
                } else {
                  btnClass = "border-[#E5E1DA] bg-white/40 text-zinc-400 opacity-50";
                }
              } else if (isSelected) {
                btnClass = "border-[#1A1A1A] bg-[#F3F1ED] text-zinc-950 ring-1 ring-[#1A1A1A]";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(opt)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 text-left text-xs md:text-sm rounded-sm border font-semibold transition-all cursor-pointer flex items-center gap-3 ${btnClass}`}
                >
                  <span className="w-5 h-5 rounded-full border border-[#E5E1DA] text-zinc-500 bg-[#F3F1ED] flex items-center justify-center text-[10px] font-mono">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-serif text-sm">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Answer Status and Explanations */}
          {hasSubmitted && (
            <div className={`p-4 rounded-sm border space-y-2 animate-fade-in ${
              selectedAns === questions[currentIdx].correctAnswer 
                ? 'bg-emerald-50/50 border-emerald-250 text-emerald-950' 
                : 'bg-rose-50/50 border-rose-250 text-rose-950'
            }`}>
              <p className="text-[11px] font-mono uppercase tracking-wider font-bold">
                {selectedAns === questions[currentIdx].correctAnswer ? (
                  <span className="text-emerald-800">✓ Correct Choice</span>
                ) : (
                  <span className="text-rose-800">✗ Incorrect Choice</span>
                )}
              </p>
              <p className="text-xs text-zinc-700 leading-relaxed font-sans pl-1">
                {questions[currentIdx].explanation}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end pt-2">
            {!hasSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAns}
                className={`px-5 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
                  selectedAns 
                    ? "bg-[#1A1A1A] hover:bg-black text-white cursor-pointer" 
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
                }`}
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
              >
                {currentIdx < questions.length - 1 ? "Next Question" : "Complete Quiz"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 4: Completed summary */}
      {quizState === 'completed' && (
        <div className="text-center py-8 space-y-6 animate-fade-in" id="quiz-completed">
          <div className="inline-flex p-3 rounded-sm bg-[#F3F1ED] text-zinc-800 border border-[#E5E1DA] mb-2">
            <Award size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">Challenge Completed</h2>
            <div className="text-4xl font-serif font-black text-[#1A1A1A]">
              {Math.round((correctCount / questions.length) * 100)}%
            </div>
            <p className="text-zinc-550 text-xs uppercase font-mono tracking-wider">
              You answered {correctCount} out of {questions.length} questions correctly.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 bg-[#F9F8F6] rounded-sm border border-[#E5E1DA] text-xs text-zinc-750 leading-relaxed">
            {correctCount === questions.length ? (
              <p className="text-emerald-800 font-semibold font-serif">Exceptional! Perfect recall score. Your linguistic schema and reading memory structures are extremely solid. Keep practicing!</p>
            ) : correctCount >= 3 ? (
              <p className="text-[#1A1A1A] font-semibold font-serif">Great effort! A few subtle missteps, but your analytical retention is highly strategic. Keep reviewing those words in your Reading Canvas.</p>
            ) : (
              <p className="text-rose-800 font-medium font-serif">Good try. Active recall quizzes trigger error-based learning, which significantly deepens long-term retention. Re-study your cards before retrying.</p>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setQuizState('idle')}
              className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-white rounded-sm text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all"
            >
              Back to Arena
            </button>
            <button
              onClick={generateLocalQuiz}
              className="px-5 py-2.5 bg-[#F3F1ED] hover:bg-[#E5E1DA] text-[#1A1A1A] border border-[#E5E1DA] rounded-sm text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all"
            >
              Retry Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
