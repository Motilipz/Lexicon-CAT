import React from 'react';
import { X } from 'lucide-react';
import { Word, UserWordProgress, MemoryConfidence } from '../types';
import WordCard from './WordCard';

interface WordDetailModalProps {
  word: Word;
  progress?: UserWordProgress;
  onClose: () => void;
  onBookmarkToggle: (word: string) => void;
  onRateConfidence: (word: string, confidence: MemoryConfidence) => void;
  onAddNote: (word: string, note: string) => void;
}

export default function WordDetailModal({
  word,
  progress,
  onClose,
  onBookmarkToggle,
  onRateConfidence,
  onAddNote
}: WordDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/65 backdrop-blur-xs animate-fade-in" id="word-detail-modal">
      <div className="relative w-full max-w-2xl bg-white rounded-sm shadow-lg overflow-hidden border border-[#E5E1DA]">
        
        {/* Close Button overlay */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 text-zinc-500 hover:text-black bg-white/95 hover:bg-[#F3F1ED] rounded-sm transition-all border border-[#E5E1DA] cursor-pointer shadow-xs"
          title="Close Modal"
        >
          <X size={15} />
        </button>

        {/* WordCard Container wrapper */}
        <div className="max-h-[85vh] overflow-y-auto">
          <WordCard
            word={word}
            progress={progress}
            onBookmarkToggle={onBookmarkToggle}
            onRateConfidence={onRateConfidence}
            onAddNote={onAddNote}
          />
        </div>
      </div>
    </div>
  );
}
