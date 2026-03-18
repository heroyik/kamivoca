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
  synonyms?: string[];
}

export type POS = "noun" | "verb" | "adjective" | "adverb" | "onomatopoeia" | "other";

export interface LearningUnit {
  id: string;
  title: string;
  source: string;
  words: VocabEntry[];
}

export function normalizeVocabWordKey(word: string): string {
  return word
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

export function filterDeletedWords<T extends Pick<VocabEntry, "word">>(
  entries: T[],
  deletedWordKeys: Iterable<string> = [],
): T[] {
  const deletedSet = new Set(deletedWordKeys);
  if (deletedSet.size === 0) return entries;
  return entries.filter((entry) => !deletedSet.has(normalizeVocabWordKey(entry.word)));
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
  if (posString.includes("オノマトペ")) return "onomatopoeia";
  if (posString.includes("副詞")) return "adverb";
  if (posString.includes("名詞")) return "noun";
  if (posString.includes("形容詞")) return "adjective";
  if (posString.includes("動詞")) return "verb";
  if (p.includes("noun")) return "noun";
  if (p.includes("verb") || p.includes("v5") || p.includes("v1")) return "verb";
  if (p.includes("adj")) return "adjective";
  if (p.includes("adverb")) return "adverb";
  if (p.includes("onomatopoeia")) return "onomatopoeia";
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

  const kanaText = text.replace(/[〜～]/g, "");
  const repeatedKanaPattern = /^([ぁ-ゖァ-ヺー]{1,3})\1(?:[ぁ-ゖァ-ヺー]{0,3})?$/;
  if (repeatedKanaPattern.test(kanaText)) return "onomatopoeia";

  // Japanese verb endings and common auxiliary verb forms
  if (/(する|できる|れる|られる|せる|させる)$/.test(text)) return "verb";
  if (/[うくぐすつぬぶむる]$/.test(text)) return "verb";

  // i-adjective and common adjective-style endings
  if (/(ない|たい)$/.test(text)) return "adjective";
  if (/(しい|い)$/.test(text)) return "adjective";

  // Default bucket for quiz distractor matching
  return "noun";
}

export const defaultVocabEntries = opicData.data as VocabEntry[];

function getAllVocabData(
  deletedWordKeys: Iterable<string> = [],
  entries: VocabEntry[] = defaultVocabEntries,
): VocabEntry[] {
  return filterDeletedWords(entries, deletedWordKeys);
}

/**
 * Creates the 15 units of the Pilgrimage Map based on JLPT Levels or overall progress.
 */
export function getUnits(
  deletedWordKeys: Iterable<string> = [],
  entries: VocabEntry[] = defaultVocabEntries,
): LearningUnit[] {
  const allWords = getAllVocabData(deletedWordKeys, entries);

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
  deletedWordKeys: Iterable<string> = [],
  entries: VocabEntry[] = defaultVocabEntries,
): VocabEntry[] {
  const allWords = getAllVocabData(deletedWordKeys, entries);
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

export function getTotalWordCount(
  deletedWordKeys: Iterable<string> = [],
  entries: VocabEntry[] = defaultVocabEntries,
): number {
  return getAllVocabData(deletedWordKeys, entries).length;
}
