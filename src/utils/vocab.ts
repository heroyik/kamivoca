import opicData from "@/data/vocab.json";

export interface VocabEntry {
  id: string;
  word: string;
  furigana: string;
  meaning: string;
  level: number;
  jlpt: string;
  pos: string;
  opic: string;
  example?: string[];
}

export type POS = "noun" | "verb" | "adjective" | "other";

export interface LearningUnit {
  id: string;
  title: string;
  source: string;
  words: VocabEntry[];
}

function isKana(char: string): boolean {
  return /[ぁ-ゖァ-ヺー]/.test(char);
}

function toHiragana(text: string): string {
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

export function normalizeDisplayFurigana(word: string, furigana?: string): string {
  const trimmedWord = word.trim();
  const trimmedFurigana = furigana?.trim() ?? "";

  if (!trimmedWord || !trimmedFurigana) return trimmedFurigana;

  const leadingKanaChars: string[] = [];
  for (const char of Array.from(trimmedWord)) {
    if (!isKana(char)) break;
    leadingKanaChars.push(char);
  }

  if (leadingKanaChars.length === 0) return trimmedFurigana;

  const furiganaChars = Array.from(trimmedFurigana);
  if (furiganaChars.length <= leadingKanaChars.length) return trimmedFurigana;

  const prefix = leadingKanaChars.join("");
  const normalizedPrefix = toHiragana(prefix);
  const furiganaPrefix = furiganaChars.slice(0, leadingKanaChars.length).join("");
  const furiganaRest = furiganaChars.slice(leadingKanaChars.length).join("");

  if (toHiragana(furiganaPrefix) !== normalizedPrefix) {
    return trimmedFurigana;
  }

  if (!toHiragana(furiganaRest).startsWith(normalizedPrefix)) {
    return trimmedFurigana;
  }

  return furiganaRest;
}

/**
 * Japanese POS classification for distractor generation
 */
export function categorizePOS(posString: string): POS {
  const p = posString.toLowerCase();
  if (p.includes("noun")) return "noun";
  if (p.includes("verb") || p.includes("v5") || p.includes("v1")) return "verb";
  if (p.includes("adj")) return "adjective";
  return "other";
}

/**
 * Infer POS when source data only has "other".
 * Priority: explicit POS tag -> heuristic from Japanese surface form.
 */
export function inferPOS(entry: Pick<VocabEntry, "pos" | "word" | "furigana">): POS {
  const taggedPOS = categorizePOS(entry.pos || "");
  if (taggedPOS !== "other") return taggedPOS;

  const text = (entry.furigana || entry.word || "")
    .trim()
    .replace(/[\s・、。？！「」『』（）()]/g, "");

  if (!text) return "other";

  // Japanese verb endings and common auxiliary verb forms
  if (/(する|できる|れる|られる|せる|させる)$/.test(text)) return "verb";
  if (/[うくぐすつぬぶむる]$/.test(text)) return "verb";

  // i-adjective and common adjective-style endings
  if (/(ない|たい)$/.test(text)) return "adjective";
  if (/(しい|い)$/.test(text)) return "adjective";

  // Default bucket for quiz distractor matching
  return "noun";
}

/**
 * KamiVoca uses a single combined JSON pipeline initially.
 * Eventually, this could merge multiple JSON files.
 */
function getAllVocabData(): VocabEntry[] {
  // Currently we just have one initial subset for testing/pilgrimage
  // We can expand this array later by concat'ing other json files like jlpt_n5.json
  return opicData.data as VocabEntry[];
}

/**
 * Creates the 15 units of the Pilgrimage Map based on JLPT Levels or overall progress.
 */
export function getUnits(): LearningUnit[] {
  const allWords = getAllVocabData();

  if (allWords.length === 0) return [];

  const TOTAL_UNITS = 15;
  const units: LearningUnit[] = [];

  for (let level = 1; level <= TOTAL_UNITS; level++) {
    const unitWords = allWords
      .filter((word) => word.level === level)
      .sort((a, b) => a.id.localeCompare(b.id));

    units.push({
      id: `unit-${level}`,
      title: `Step ${level}`,
      source: "Pilgrimage",
      words: unitWords,
    });
  }

  return units;
}

/**
 * Gets random words for distractor generation in quizzes.
 * Tries to match POS (Part of Speech) for better distractors.
 */
export function getRandomWords(
  count: number,
  targetPOS?: POS,
  excludeWordIds?: string[],
): VocabEntry[] {
  const allWords = getAllVocabData();
  const excludeArray = excludeWordIds || [];
  
  let candidates = allWords.filter((w) => !excludeArray.includes(w.id));

  // If a target POS is provided, try to find distractors of the same POS
  if (targetPOS) {
    const posCandidates = candidates.filter(
      (w) => inferPOS(w) === targetPOS
    );
    if (posCandidates.length >= count) {
      candidates = posCandidates;
    }
  }

  return [...candidates].sort(() => Math.random() - 0.5).slice(0, count);
}

export function getTotalWordCount(): number {
  return getAllVocabData().length;
}
