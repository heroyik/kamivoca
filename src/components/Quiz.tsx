"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSound } from "@/hooks/useSound";
import { filterDeletedWords, VocabEntry, inferPOS, normalizeDisplayFurigana, POS } from "@/utils/vocab";
import { useRouter } from "next/navigation";
import { X, Frown } from "lucide-react";
import { isKamiAdminEmail } from "@/lib/admin";
import { BASE_PATH } from "@/lib/constants";
import { useGamification } from "@/hooks/useGamification";
import { useGlobalTop20 } from "@/hooks/useGlobalTop20";
import { useRank } from "@/hooks/useRank";
import { filterEasyCognates } from "@/utils/cognates";

interface QuizProps {
  unitId: string;
  unitWords: VocabEntry[];
  unitTitle?: string;
  sources: string[];
  isReview?: boolean;
  priorityWord?: string;
}

const HARD_JLPT_LEVELS = new Set(["N3", "N2", "N1", "級外"]);

function isKanji(char: string) {
  return /[一-龯々ヶヵ]/.test(char);
}

function isKana(char: string) {
  return /[ぁ-ゖァ-ヺー]/.test(char);
}

function toHiragana(text: string) {
  return Array.from(text)
    .map((char) => {
      const codePoint = char.codePointAt(0);
      if (codePoint === undefined) return char;
      if (codePoint >= 0x30A1 && codePoint <= 0x30F6) {
        return String.fromCodePoint(codePoint - 0x60);
      }
      return char;
    })
    .join("");
}

function isJapaneseWordChar(char: string) {
  return isKanji(char) || isKana(char);
}

function isParticleBridge(text: string) {
  return /[はがをにでとものへや]/.test(text);
}

function extractRubyBase(text: string, reading: string) {
  let runStart = text.length;
  while (runStart > 0 && isJapaneseWordChar(text[runStart - 1])) {
    runStart -= 1;
  }

  const run = text.slice(runStart);
  if (!run) {
    return { prefix: text, base: "" };
  }

  const lastKanjiOffset = Math.max(...Array.from(run).map((char, idx) => (isKanji(char) ? idx : -1)));
  if (lastKanjiOffset < 0) {
    return { prefix: text, base: run };
  }

  let baseStart = lastKanjiOffset;
  while (baseStart > 0 && isKanji(run[baseStart - 1])) {
    baseStart -= 1;
  }

  // Expand left across short kana bridges only when they connect to another kanji block.
  while (baseStart > 0) {
    let cursor = baseStart;
    let kanaCount = 0;

    while (cursor > 0 && isKana(run[cursor - 1]) && kanaCount < 2) {
      cursor -= 1;
      kanaCount += 1;
    }

    const bridge = run.slice(cursor, baseStart);
    if (isParticleBridge(bridge)) {
      break;
    }

    if (cursor === baseStart || cursor === 0 || !isKanji(run[cursor - 1])) {
      break;
    }

    while (cursor > 0 && isKanji(run[cursor - 1])) {
      cursor -= 1;
    }

    baseStart = cursor;
  }

  // Include leading kana only when it is explicitly reflected in the reading.
  let leadingKanaStart = baseStart;
  while (leadingKanaStart > 0 && isKana(run[leadingKanaStart - 1])) {
    leadingKanaStart -= 1;
  }

  const leadingKana = run.slice(leadingKanaStart, baseStart);
  if (leadingKana && reading.startsWith(leadingKana)) {
    baseStart = leadingKanaStart;
  }

  return {
    prefix: text.slice(0, runStart + baseStart),
    base: run.slice(baseStart),
  };
}

function FuriganaSentence({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("(", cursor);
    if (openIndex === -1) {
      nodes.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
      break;
    }

    const closeIndex = text.indexOf(")", openIndex + 1);
    if (closeIndex === -1) {
      nodes.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
      break;
    }

    const reading = text.slice(openIndex + 1, closeIndex).trim();
    const before = text.slice(cursor, openIndex);
    const { prefix, base } = extractRubyBase(before, reading);

    if (prefix) {
      nodes.push(<span key={`plain-${cursor}`}>{prefix}</span>);
    }

    if (base && reading) {
      nodes.push(
        <ruby key={`ruby-${openIndex}`} className="furigana-ruby">
          <span className="furigana-base">{base}</span>
          <rt className="furigana-rt">{reading}</rt>
        </ruby>,
      );
    } else {
      nodes.push(<span key={`fallback-${openIndex}`}>{before}({reading})</span>);
    }

    cursor = closeIndex + 1;
  }

  return <span className="furigana-sentence">{nodes}</span>;
}

function splitWordReading(word: string, reading: string) {
  const wordChars = Array.from(word);
  const readingChars = Array.from(reading);

  let prefixLength = 0;
  while (
    prefixLength < wordChars.length &&
    prefixLength < readingChars.length &&
    isKana(wordChars[prefixLength]) &&
    toHiragana(wordChars[prefixLength]) === toHiragana(readingChars[prefixLength])
  ) {
    prefixLength += 1;
  }

  let wordSuffixLength = 0;
  let readingSuffixLength = 0;
  while (
    wordSuffixLength < wordChars.length - prefixLength &&
    readingSuffixLength < readingChars.length - prefixLength
  ) {
    const wordChar = wordChars[wordChars.length - 1 - wordSuffixLength];
    const readingChar = readingChars[readingChars.length - 1 - readingSuffixLength];
    if (!isKana(wordChar) || toHiragana(wordChar) !== toHiragana(readingChar)) {
      break;
    }
    wordSuffixLength += 1;
    readingSuffixLength += 1;
  }

  return {
    prefix: wordChars.slice(0, prefixLength).join(""),
    baseWord: wordChars.slice(prefixLength, wordChars.length - wordSuffixLength).join(""),
    baseReading: readingChars.slice(prefixLength, readingChars.length - readingSuffixLength).join(""),
    suffix: wordChars.slice(wordChars.length - wordSuffixLength).join(""),
  };
}

function escapeForRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function annotateExactWord(text: string, word: string, reading: string) {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const annotation = `${word}(${reading})`;

  if (new RegExp(`${escapedWord}(?!\\()`).test(text)) {
    return text.replace(new RegExp(`${escapedWord}(?!\\()`, "g"), annotation);
  }
  return text;
}

function annotateWordStem(text: string, word: string, reading: string) {
  const { baseWord, baseReading } = splitWordReading(word, reading);
  if (!baseWord || !baseReading || !/[一-龯々ヶヵ]/.test(baseWord)) {
    return text;
  }

  const escapedBaseWord = escapeForRegex(baseWord);
  return text.replace(new RegExp(`${escapedBaseWord}(?!\\()`, "g"), `${baseWord}(${baseReading})`);
}

function annotateDifficultExampleWords(text: string, difficultExampleEntries: VocabEntry[]) {
  return difficultExampleEntries.reduce((annotatedText, entry) => {
    if (!entry.furigana) return annotatedText;
    return annotateExactWord(annotatedText, entry.word, entry.furigana);
  }, text);
}

function annotateExampleSentence(example: string, word: string, reading: string, difficultExampleEntries: VocabEntry[]) {
  if (!example) {
    return example;
  }

  let annotatedText = example;
  if (word && reading) {
    annotatedText = annotateExactWord(annotatedText, word, reading);
    annotatedText = annotateWordStem(annotatedText, word, reading);
  }

  return annotateDifficultExampleWords(annotatedText, difficultExampleEntries);
}

function isAdverbLikePOS(pos: string) {
  return pos.includes("副詞");
}

function isOnomatopoeiaPOS(pos: string) {
  return pos.includes("オノマトペ");
}

function normalizeExampleForMatch(example: string) {
  return example
    .replace(/[「」『』"]/g, "")
    .replace(/\([^)]+\)/g, "");
}

function selectFeedbackExample(entry: VocabEntry) {
  const examples = (entry.example || []).filter((example) => example.trim().length > 0);
  if (examples.length === 0) return null;

  if (!isAdverbLikePOS(entry.pos)) {
    return examples[0];
  }

  const exactSurfaceExamples = examples.filter((example) =>
    normalizeExampleForMatch(example).includes(entry.word),
  );

  if (isOnomatopoeiaPOS(entry.pos)) {
    return exactSurfaceExamples[0] ?? null;
  }

  return exactSurfaceExamples[0] ?? null;
}

function isValidQuizMeaning(meaning: string) {
  const normalizedMeaning = meaning.trim();
  return normalizedMeaning !== "" && normalizedMeaning !== "뜻" && normalizedMeaning !== "의미";
}

function normalizeWordKey(word: string) {
  return word.trim().toLowerCase();
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string) {
  const nextRandom = createSeededRandom(seed);
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

const DISTRACTOR_EXCLUSION_GROUPS = [
  ["〜がてら", "ついでに"],
  ["手を繋ぐ", "手を握る"],
  ["1日を充実させる", "1日を有意義に過ごす"],
  ["頭が切れる", "頭の回転が速い"],
  ["育ってくれて", "息子がよく育ってくれて"],
  ["手がかかる", "手間がかかる"],
  ["たまたま見る", "見かける"],
  ["配慮がある", "思いやりがある"],
  ["趣旨", "主旨"],
  ["紛らわしい", "煩わしい"],
  ["原点", "原典"],
  ["好意", "行為"],
  ["購読", "講読"],
  ["解ける", "溶ける"],
];

const normalizedDistractorExclusionGroups = DISTRACTOR_EXCLUSION_GROUPS.map((group) =>
  group.map((word) => normalizeWordKey(word)),
);

function normalizeReadingKey(reading: string) {
  return toHiragana(reading.trim());
}

function normalizeMeaningToken(token: string) {
  return token
    .trim()
    .toLowerCase()
    .replace(/[~～,./·•|(){}\[\]"'`]/g, "")
    .replace(/\s+/g, "");
}

function getMeaningTokens(meaning: string) {
  return Array.from(
    new Set(
      meaning
        .split(/[,\n/·•|(){}\[\]]|,|،|，/)
        .flatMap((chunk) => chunk.split(/\s+/))
        .map(normalizeMeaningToken)
        .filter((token) => token.length >= 2),
    ),
  );
}

function hasHighlySimilarMeaning(currentMeaning: string, candidateMeaning: string) {
  const currentTokens = getMeaningTokens(currentMeaning);
  const candidateTokens = getMeaningTokens(candidateMeaning);

  if (currentTokens.length === 0 || candidateTokens.length === 0) {
    return false;
  }

  const overlapCount = currentTokens.filter((token) => candidateTokens.includes(token)).length;
  const shorterLength = Math.min(currentTokens.length, candidateTokens.length);
  const longerLength = Math.max(currentTokens.length, candidateTokens.length);

  return overlapCount >= 2 && overlapCount >= shorterLength && overlapCount / longerLength >= 0.6;
}

function shouldExcludeDistractorEntry(currentEntry: VocabEntry, candidateEntry: VocabEntry) {
  const normalizedCurrentWord = normalizeWordKey(currentEntry.word);
  const normalizedCandidateWord = normalizeWordKey(candidateEntry.word);

  if (
    normalizedDistractorExclusionGroups.some(
      (group) => group.includes(normalizedCurrentWord) && group.includes(normalizedCandidateWord),
    )
  ) {
    return true;
  }

  const currentReading = normalizeReadingKey(currentEntry.furigana || currentEntry.word);
  const candidateReading = normalizeReadingKey(candidateEntry.furigana || candidateEntry.word);
  if (
    currentReading &&
    candidateReading &&
    currentReading === candidateReading &&
    normalizedCurrentWord !== normalizedCandidateWord
  ) {
    return true;
  }

  return hasHighlySimilarMeaning(currentEntry.meaning, candidateEntry.meaning);
}

export default function Quiz({ unitId, unitWords, unitTitle, isReview = false, priorityWord }: QuizProps) {
  const router = useRouter();
  const { addXP, addGem, addMistake, completeUnit, user, stats, manualCogniteIds, globalDeletedWordKeys, markManualCognite, vocabEntries, isOfflineMode } = useGamification();

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

  const hideEasyCognates = stats.settings?.hideEasyCognates ?? false;
  const difficultExampleEntries = useMemo(() => Array.from(
    new Map(
      vocabEntries
        .filter((entry) => HARD_JLPT_LEVELS.has(entry.jlpt) && /[一-龯々ヶヵ]/.test(entry.word))
        .map((entry) => [entry.word, entry] as const),
    ).values(),
  ).sort((a, b) => b.word.length - a.word.length), [vocabEntries]);

  // Memoize grouped vocabulary by POS to optimize generation
  const vocabByPOS = useMemo(() => {
    const filteredVocab = filterEasyCognates(
      filterDeletedWords(vocabEntries, globalDeletedWordKeys),
      hideEasyCognates,
      manualCogniteIds,
    );
    const groups: Record<POS, VocabEntry[]> = {
      noun: [],
      verb: [],
      adjective: [],
      adverb: [],
      onomatopoeia: [],
      other: []
    };
    filteredVocab.forEach((entry: VocabEntry) => {
      const pos = inferPOS(entry);
      groups[pos].push(entry);
    });
    return groups;
  }, [globalDeletedWordKeys, hideEasyCognates, manualCogniteIds, vocabEntries]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasMistakes, setHasMistakes] = useState(false);
  const [questions] = useState(() => {
    const shuffledWords = seededShuffle(
      unitWords,
      `${unitId}:${priorityWord ?? "default"}:${unitWords.map((entry) => entry.id).join("|")}`,
    );

    if (!priorityWord) {
      return shuffledWords;
    }

    const normalizedPriorityWord = normalizeWordKey(priorityWord);
    const priorityIndex = shuffledWords.findIndex((entry) => normalizeWordKey(entry.word) === normalizedPriorityWord);

    if (priorityIndex <= 0) {
      return shuffledWords;
    }

    const [priorityEntry] = shuffledWords.splice(priorityIndex, 1);
    return [priorityEntry, ...shuffledWords];
  });
  const [initiallyWasMistake, setInitiallyWasMistake] = useState(false);
  const [hearts, setHearts] = useState(5); // New Magatama/Heart system

  const navigateTo = (path: string) => {
    if (isOfflineMode && typeof window !== "undefined") {
      window.location.assign(`${BASE_PATH}${path}`);
      return;
    }
    router.push(path);
  };

  useEffect(() => {
    const currentWord = questions[currentIndex]?.word.trim();
    if (!currentWord) {
      setInitiallyWasMistake(false);
      return;
    }

    setInitiallyWasMistake(!!stats.mistakes?.[currentWord]);
  }, [currentIndex, questions, stats.mistakes]);

  // Refresh rank when quiz finishes (6.2)
  useEffect(() => {
    if (showResult) {
      refreshRank();
    }
  }, [showResult, refreshRank]);

  const generateOptions = useCallback((currentEntry: VocabEntry) => {
    const correctAnswer = currentEntry.meaning;
    const pos = inferPOS(currentEntry);
    const distractorSeed = `${unitId}:${currentEntry.id}:distractors`;
    const optionSeed = `${unitId}:${currentEntry.id}:options`;

    // Keep distractors in the same POS bucket only
    const finalDistractors = seededShuffle(Array.from(
      new Set(
        vocabByPOS[pos]
          .filter(
            (v) =>
              v.meaning !== correctAnswer &&
              isValidQuizMeaning(v.meaning) &&
              !shouldExcludeDistractorEntry(currentEntry, v),
          )
          .map((v) => v.meaning)
      )
    ), distractorSeed).slice(0, 3);

    return seededShuffle([correctAnswer, ...finalDistractors], optionSeed);
  }, [unitId, vocabByPOS]);

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
            navigateTo('/');
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
  const displayFurigana = normalizeDisplayFurigana(currentQuestion.word, currentQuestion.furigana);
  const feedbackExample = selectFeedbackExample(currentQuestion);
  const progress = ((currentIndex) / questions.length) * 100;
  const painRank = wallOfPainMap.get(currentQuestion.word);
  const isUnknown = selectedOption === "UNKNOWN";
  const isAdminUser = isKamiAdminEmail(user?.email);
  const isManuallyMarkedCognite = manualCogniteIds.includes(currentQuestion.id);

  return (
    <div className="container flex flex-col min-h-screen p-20-120 relative">
      {/* Header */}
      <div className="flex-between gap-16 mb-16">
        <button
          type="button"
          aria-label="Close lesson"
          className="quiz-close-button"
          onClick={() => {
            navigateTo('/');
          }}
        >
          <X className="text-subtitle pointer" />
        </button>
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
          <span key={i} className={`quiz-hearts font-24 transition-transform ${i < hearts ? 'scale-100' : 'scale-75 opacity-20 grayscale'}`} style={{ filter: i < hearts ? 'drop-shadow(0 2px 4px rgba(255, 105, 180, 0.3))' : 'none' }}>
            🌸
          </span>
        ))}
      </div>

      <div className="flex-1">
        <h2 className="quiz-prompt text-title mb-32">
          {unitTitle && <span className="text-duo-blue mr-8">{unitTitle}:</span>}
          What does this word mean?
        </h2>

        <div className="quiz-card mb-32">
          {unitTitle && (
            <div className="quiz-unit-badge" aria-label={`Current unit ${unitTitle}`}>
              {unitTitle}
            </div>
          )}
          {/* JLPT Level Badge inside Card */}
          {questions.length > 0 && questions[currentIndex] && (
            <div className="jlpt-badge-quiz smaller" data-testid="jlpt-badge">
              {questions[currentIndex].jlpt}
            </div>
          )}
          {isAdminUser && (
            <button
              type="button"
              className={`quiz-cognite-button ${isManuallyMarkedCognite ? "is-active" : ""}`}
              disabled={isManuallyMarkedCognite}
              onClick={() => void markManualCognite(currentQuestion.id)}
            >
              {isManuallyMarkedCognite ? "COGNITE Y" : "COGNITE"}
            </button>
          )}
          <div className="text-main-title text-kv-kurenai mb-4">
            {currentQuestion.word}
          </div>
          {!stats.settings?.hideFurigana && displayFurigana && currentQuestion.word !== displayFurigana && (
            <div className="text-title text-secondary mb-4">
              {displayFurigana}
            </div>
          )}
          {initiallyWasMistake && (
            <div className="mistake-badge mb-12">
              Tricky Word
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
            <span style={{ marginRight: "8px", fontSize: "20px" }}>❓</span>
            分かりません
          </button>
        )}
      </div>

      {/* 6.3 + 6.4 — Feedback Bar */}
      {selectedOption && (
        <div
          className={`quiz-feedback-bar ${isCorrect ? 'correct' : 'incorrect'}`}
          style={isUnknown ? { background: "#fff0f0", borderColor: "#fecaca" } : undefined}
        >
          <div className="container flex-between quiz-feedback-content">
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
                      ? "😅 Answer:"
                      : isCorrect
                        ? initiallyWasMistake ? "✨ 極めました！ (Mastered!)" : "✅ 正解！ (Correct!)"
                        : "❌ Answer:"}
                </h3>
                {(!isCorrect || isUnknown) && (
                  <p className="correct-solution">
                    {questions[currentIndex].meaning}
                  </p>
                )}
              </div>
              
              {/* Example Sentences Section */}
              {feedbackExample && (
                <div className="mt-12 flex flex-col gap-8">
                  <div
                    className={`example-sentence-box ${isCorrect ? 'bg-green-soft' : 'bg-red-soft'}`}
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.6",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: isCorrect ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.05)",
                      border: "1px solid",
                      borderColor: isCorrect ? "rgba(88, 167, 0, 0.2)" : "rgba(234, 61, 61, 0.1)",
                      color: "inherit",
                      maxWidth: "100%"
                    }}
                  >
                    <FuriganaSentence
                      text={annotateExampleSentence(feedbackExample, currentQuestion.word, currentQuestion.furigana, difficultExampleEntries)}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleNext}
              className={`duo-button w-auto px-40 py-12 quiz-feedback-next ${isCorrect ? 'duo-button-primary' : ''}`}
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
