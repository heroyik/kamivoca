import opicData from "@/data/vocab.json";

export interface VocabEntry {
  id: string;
  word: string;
  furigana: string;
  meaning: string;
  level: number;
  jlpt: string;
  pos: string;
}

export type POS = "noun" | "verb" | "adjective" | "other";

export interface LearningUnit {
  id: string;
  title: string;
  source: string;
  words: VocabEntry[];
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

  // If we don't have enough words, just return 1 unit for now
  if (allWords.length === 0) return [];

  // Sort by ID to maintain a consistent order across the pilgrimage
  const allWordsSorted = [...allWords].sort((a, b) => a.id.localeCompare(b.id));

  const TOTAL_UNITS = 15;
  const unitSize = Math.max(1, Math.ceil(allWordsSorted.length / TOTAL_UNITS));
  const units: LearningUnit[] = [];

  for (let i = 0; i < TOTAL_UNITS; i++) {
    const start = i * unitSize;
    const end = Math.min(start + unitSize, allWordsSorted.length);
    const unitWords = allWordsSorted.slice(start, end);

    // If we run out of words before 15 units, we just stop or create empty units 
    // depending on design. Let's stop to avoid empty nodes on small datasets.
    if (unitWords.length === 0) break;

    units.push({
      id: `unit-${i + 1}`,
      title: `Step ${i + 1}`,
      source: "Pilgrimage",
      words: unitWords,
    });
  }

  // Ensure we ALWAYS return exactly 15 map nodes for the visual map layout if required.
  // Actually, implementation plan says: "15단계 순례길 맵 렌더링 검증"
  // Let's pad it out if we have very little sample data.
  while (units.length < TOTAL_UNITS) {
    units.push({
      id: `unit-${units.length + 1}`,
      title: `Step ${units.length + 1}`,
      source: "Pilgrimage",
      words: [], // Empty for now, handled gracefully by UI
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
