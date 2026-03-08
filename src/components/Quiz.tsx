"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSound } from "@/hooks/useSound";
import { VocabEntry, categorizePOS } from "@/utils/vocab";
import vocabData from "@/data/vocab.json"; // Import full vocab for distractors
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Frown, Landmark } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useGlobalTop20 } from "@/hooks/useGlobalTop20";
import { useRank } from "@/hooks/useRank";
import Image from "next/image";

interface QuizProps {
  unitId: string;
  unitWords: VocabEntry[];
  unitTitle?: string;
  sources: string[];
  isReview?: boolean;
}

export default function Quiz({ unitId, unitWords, unitTitle, isReview = false }: QuizProps) {
  const router = useRouter();
  const { addXP, addGem, addMistake, completeUnit, user, stats, removeMistake } = useGamification();

  // Sound hook — preloaded + Chrome Android unlock
  const { play: playSound } = useSound(stats.settings?.soundEnabled ?? true);

  // 6.2 — Live rank refresh after quiz ends
  const { refresh: refreshRank } = useRank(user?.uid ?? null, stats.xp);

  // Wall of Pain lookup (session-cached, no extra Firestore reads)
  const { top20 } = useGlobalTop20();
  const wallOfPainMap = useMemo(() => {
    const map = new Map<string, number>();
    top20.forEach((entry, idx) => map.set(entry.word, idx + 1));
    return map;
  }, [top20]);

  // Memoize grouped vocabulary by POS to optimize generation
  const vocabByPOS = useMemo(() => {
    const groups: Record<string, VocabEntry[]> = {
      noun: [],
      verb: [],
      adjective: [],
      other: []
    };
    (vocabData.data as VocabEntry[]).forEach((entry: VocabEntry) => {
      const pos = categorizePOS(entry.pos);
      groups[pos].push(entry);
    });
    return groups;
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasMistakes, setHasMistakes] = useState(false);
  const [questions] = useState(() => [...unitWords].sort(() => Math.random() - 0.5));
  const [prevIndex, setPrevIndex] = useState(-1);
  const [initiallyWasMistake, setInitiallyWasMistake] = useState(false);
  const [hearts, setHearts] = useState(5); // New Magatama/Heart system

  // Sync initial mistake status when moving to a new question
  if (currentIndex !== prevIndex && questions[currentIndex]) {
    setPrevIndex(currentIndex);
    const word = questions[currentIndex].word.trim();
    setInitiallyWasMistake(!!stats.mistakes?.[word]);
  }

  // Refresh rank when quiz finishes (6.2)
  useEffect(() => {
    if (showResult) {
      refreshRank();
    }
  }, [showResult, refreshRank]);

  const generateOptions = useCallback((currentEntry: VocabEntry) => {
    const correctAnswer = currentEntry.meaning;
    const pos = categorizePOS(currentEntry.pos);

    // 1. Try to get 3 distractors from the same POS
    const samePOSDistractors = vocabByPOS[pos]
      .filter(v => v.meaning !== correctAnswer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    let finalDistractors = samePOSDistractors.map(v => v.meaning);

    // 2. Fallback if not enough same-POS words (unlikely with this dataset but safe)
    if (finalDistractors.length < 3) {
      const fallbackDistractors = (vocabData.data as VocabEntry[])
        .filter((v: VocabEntry) => v.meaning !== correctAnswer && !finalDistractors.includes(v.meaning))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - finalDistractors.length)
        .map(v => v.meaning);

      finalDistractors = [...finalDistractors, ...fallbackDistractors];
    }

    return [correctAnswer, ...finalDistractors].sort(() => Math.random() - 0.5);
  }, [vocabByPOS]);

  const options = useMemo(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      return generateOptions(questions[currentIndex]);
    }
    return [];
  }, [currentIndex, questions, generateOptions]);

  const handleCheck = (option: string) => {
    if (selectedOption) return;

    setSelectedOption(option);
    const correct = option === questions[currentIndex].meaning;
    setIsCorrect(correct);

    if (correct) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      setScore(prev => prev + 1);
      addXP(10);

      if (initiallyWasMistake) {
        removeMistake(questions[currentIndex].word);
      }

      if (newCombo >= 3) {
        playSound("cheer");
        triggerHaptic("combo");
      } else {
        playSound("correct");
        triggerHaptic("success");
      }
    } else {
      setComboCount(0);
      setHasMistakes(true);
      addMistake(questions[currentIndex].word, unitId);
      setHearts(prev => Math.max(0, prev - 1));
      playSound("incorrect");
      triggerHaptic("error");
    }
  };

  const handleUnknown = () => {
    if (selectedOption) return;

    setComboCount(0);
    setHasMistakes(true);
    addMistake(questions[currentIndex].word, unitId);
    setHearts(prev => Math.max(0, prev - 1));
    setIsCorrect(false);
    setSelectedOption("UNKNOWN");
    playSound("incorrect");
    triggerHaptic("error");
  };

  // playSound is now provided by useSound hook above

  const triggerHaptic = (type: "success" | "error" | "combo") => {
    if (!stats.settings?.hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    if (type === "success") {
      navigator.vibrate(50);
    } else if (type === "combo") {
      navigator.vibrate([50, 30, 50, 30, 50]);
    } else {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setShowResult(true);
      if (unitId !== 'review') {
        const passThreshold = Math.ceil(questions.length * 0.8);
        if (score >= passThreshold) {
          // If in review mode, we need a perfect score to mark as mastered
          const isPerfectReview = isReview && score === questions.length;
          const isPerfectNormal = !isReview && !hasMistakes;
          
          completeUnit(unitId, 0, isPerfectReview || isPerfectNormal);
          
          if (isPerfectReview || isPerfectNormal) {
            // Gem addition is now handled in completeUnit
          } else {
            addGem(10);
          }
        }
      }
    }
  };

  if (questions.length === 0) return <div className="flex-center min-h-screen font-800">Loading...</div>;

  if (showResult) {
    const isMastery = isReview && score === questions.length;
    return (
      <div className="container flex-center min-h-screen flex-col pt-40-pb-20 relative">
        {/* JLPT Level Badge */}
        {questions.length > 0 && questions[currentIndex] && (
          <div className="jlpt-badge-quiz" data-testid="jlpt-badge">
            {questions[currentIndex].jlpt}
          </div>
        )}

        <div className="w-full max-w-md mb-8 flex justify-between items-center px-4"></div>
        <h2 className={`text-main-title ${isMastery ? 'text-duo-yellow' : 'text-duo-green'} mb-20`}>
          {isMastery ? "UNIT MASTERED!" : "Finished!"}
        </h2>
        <div className="text-center mb-32">
          {isMastery && <div className="font-64 mb-16">🏆</div>}
          <div className="text-subtitle mb-8">Your Score:</div>
          <span className="score-text">
            {score} / {questions.length}
          </span>
          <p className="pass-message">
            {isMastery ? "You've conquered all the tricky words! 🌟" : score === questions.length ? "Perfect! 🌟" : score >= questions.length * 0.8 ? "Great job! 🔥" : "Keep practicing! 💪"}
          </p>
        </div>
        <button
          onClick={() => {
            router.push('/');
            // Small delay to ensure navigation is triggered before any other state changes
          }}
          className={`duo-button ${isMastery ? 'duo-button-secondary' : 'duo-button-primary'} w-auto px-40 py-12`}
        >
          {isMastery ? "BACK TO MAP" : "CONTINUE"}
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;
  const painRank = wallOfPainMap.get(currentQuestion.word);
  const isUnknown = selectedOption === "UNKNOWN";

  // 6.4 — JSON sentence mapped correctly
  const contextualSentence = isCorrect && currentQuestion.sentences && currentQuestion.sentences.length > 0
    ? currentQuestion.sentences[0]
    : null;

  return (
    <div className="container flex flex-col min-h-screen p-20-120 relative">
      {/* Header */}
      <div className="flex-between gap-16 mb-16">
        <Link href="/" aria-label="Close lesson" className="no-underline">
          <X className="text-subtitle pointer" />
        </Link>
        <div className="flex-1 flex items-center gap-12">
          <div className="flex-1 progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-small font-800" style={{ color: 'var(--text-secondary)', minWidth: '45px', textAlign: 'right' }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>
      
      {/* Hearts Visualization */}
      <div className="flex justify-center gap-4 mb-24">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`font-24 transition-transform ${i < hearts ? 'scale-100' : 'scale-75 opacity-20 grayscale'}`} style={{ filter: i < hearts ? 'drop-shadow(0 2px 4px rgba(255, 105, 180, 0.3))' : 'none' }}>
            🌸
          </span>
        ))}
      </div>

      <div className="flex-1">
        <h2 className="text-title mb-32">
          {unitTitle && <span className="text-duo-blue mr-8">{unitTitle}:</span>}
          What does this word mean?
        </h2>

        <div className="quiz-card mb-32">
          {/* JLPT Level Badge inside Card */}
          {questions.length > 0 && questions[currentIndex] && (
            <div className="jlpt-badge-quiz smaller" data-testid="jlpt-badge">
              {questions[currentIndex].jlpt}
            </div>
          )}
          <div className="text-main-title text-kv-kurenai mb-4">
            {currentQuestion.word}
          </div>
          {!stats.settings?.hideFurigana && currentQuestion.furigana && currentQuestion.word !== currentQuestion.furigana && (
            <div className="text-title text-secondary mb-4">
              {currentQuestion.furigana}
            </div>
          )}
          {!stats.settings?.hideRomaji && currentQuestion.romaji && (
            <div className="text-subtitle text-tertiary mb-8" style={{ color: '#9ca3af' }}>
              {currentQuestion.romaji}
            </div>
          )}
          {initiallyWasMistake && (
            <div className="mistake-badge mb-12">
              Tricky Word
            </div>
          )}
          {currentQuestion.sentences && currentQuestion.sentences.length > 0 && (
            <div className="mt-8 flex flex-col items-center">
              <div className="text-subtitle italic font-16">
                &quot;{currentQuestion.sentences[0].japanese}&quot;
              </div>
              {!stats.settings?.hideFurigana && currentQuestion.sentences[0].furigana && (
                <div className="text-small text-secondary italic mt-4">
                  {currentQuestion.sentences[0].furigana}
                </div>
              )}
            </div>
          )}
          {/* 6.2 — Wall of Pain badge */}
          {painRank && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "10px",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "10px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <Frown size={13} />
              Wall of Pain #{painRank}
            </div>
          )}
        </div>
        <div className="grid-gap-12">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleCheck(option)}
              className={`duo-button duo-button-outline ${selectedOption === option
                ? (isCorrect ? 'correct' : 'incorrect')
                : (selectedOption && option === currentQuestion.meaning ? 'correct' : '')
                }`}
              disabled={!!selectedOption}
            >
              {option}
            </button>
          ))}
        </div>

        {/* 6.3 — Funnier No Lo Sé button */}
        {!selectedOption && (
          <button
            onClick={handleUnknown}
            className="duo-button duo-button-outline btn-nolo w-full mt-24 text-subtitle"
            style={{ borderColor: '#afafaf', color: '#777' }}
          >
            <span style={{ marginRight: "8px", fontSize: "20px" }}>🪭</span>
            分かりません (I don&apos;t know)
          </button>
        )}
      </div>

      {/* 6.3 + 6.4 — Feedback Bar */}
      {selectedOption && (
        <div
          className={`quiz-feedback-bar ${isCorrect ? 'correct' : 'incorrect'}`}
          style={isUnknown ? { background: "#fff0f0", borderColor: "#fecaca" } : undefined}
        >
          <div className="container flex-between">
            <div className="flex flex-col items-start">
              <div>
                {/* 6.3 — Friendlier message for "unknown" answer */}
                <h3
                  className={`text-subtitle ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}
                  style={isUnknown ? { color: "#dc2626" } : undefined}
                >
                  {isReview && isCorrect && score + 1 === questions.length && !hasMistakes 
                    ? "🌟 Unit Mastered!" 
                    : isUnknown
                      ? "😅 That's okay! Here's the answer:"
                      : isCorrect
                        ? initiallyWasMistake ? "✨ 極めました！ (Mastered!)" : "✅ 正解！ (Correct!)"
                        : "Correct solution:"}
                </h3>
                {(!isCorrect || isUnknown) && (
                  <p className="correct-solution">
                    {questions[currentIndex].meaning}
                  </p>
                )}
                {/* 6.4 — JSON contextual sentence */}
                {contextualSentence && (
                  <div
                    style={{
                      marginTop: "8px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "12px",
                      color: "#166534",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                      💬 &quot;{contextualSentence.japanese}&quot;
                    </div>
                    {contextualSentence.furigana && <div style={{ opacity: 0.8, fontSize: '10px' }}>{contextualSentence.furigana}</div>}
                    <div style={{ opacity: 0.75 }}>({contextualSentence.meaning})</div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleNext}
              className={`duo-button w-auto px-40 py-12 ${isCorrect ? 'duo-button-primary' : ''}`}
              style={{
                backgroundColor: isCorrect ? 'var(--duo-green)' : 'var(--kv-kurenai)',
                color: 'white',
                boxShadow: isCorrect ? '0 4px 0 var(--duo-green-dark)' : '0 4px 0 var(--duo-red-dark)'
              }}
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {/* 6.3 — No Lo Sé jiggle animation */}
      <style>{`
        @keyframes jiggle {
          0%  { transform: rotate(0deg); }
          20% { transform: rotate(-3deg); }
          40% { transform: rotate(3deg); }
          60% { transform: rotate(-3deg); }
          80% { transform: rotate(3deg); }
          100%{ transform: rotate(0deg); }
        }
        .btn-nolo:hover {
          animation: jiggle 0.4s ease;
        }
      `}</style>
    </div>
  );
}
