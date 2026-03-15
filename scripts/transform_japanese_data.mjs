/* cspell:ignore voca opic */
import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'voca_json/VOCA_word_furigana_separated.json';
const OUTPUT_FILE = 'src/data/vocab.json';
const TOTAL_LEVELS = 15;

const JLPT_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1', '級外'];
const JLPT_RANK = new Map(JLPT_ORDER.map((level, index) => [level, index]));

// Easier -> harder within the same JLPT bucket.
const OPIC_ORDER = ['IM2', 'IH', 'AL'];
const OPIC_RANK = new Map(OPIC_ORDER.map((level, index) => [level, index]));

function compareDifficulty(a, b) {
  const jlptRankA = JLPT_RANK.get(a.jlpt) ?? JLPT_RANK.size;
  const jlptRankB = JLPT_RANK.get(b.jlpt) ?? JLPT_RANK.size;
  if (jlptRankA !== jlptRankB) return jlptRankA - jlptRankB;

  const opicRankA = OPIC_RANK.get(a.opic) ?? OPIC_RANK.size;
  const opicRankB = OPIC_RANK.get(b.opic) ?? OPIC_RANK.size;
  if (opicRankA !== opicRankB) return opicRankA - opicRankB;

  const furiganaA = (a.furigana || '').localeCompare(b.furigana || 'ja');
  if (furiganaA !== 0) return furiganaA;

  const wordA = (a.word || '').localeCompare(b.word || '', 'ja');
  if (wordA !== 0) return wordA;

  return String(a.id).localeCompare(String(b.id));
}

async function transform() {
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const dataset = JSON.parse(rawData);

  // Sort globally from easiest -> hardest, then split into exactly 15 even buckets.
  const sortedSequence = [...dataset].sort(compareDifficulty);
  const totalItems = sortedSequence.length;
  const baseSize = Math.floor(totalItems / TOTAL_LEVELS);
  const remainder = totalItems % TOTAL_LEVELS;

  const transformedData = [];
  let cursor = 0;

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const currentSize = baseSize + (level <= remainder ? 1 : 0);
    const chunk = sortedSequence.slice(cursor, cursor + currentSize);
    cursor += currentSize;

    chunk.forEach((item) => {
      transformedData.push({
        id: item.id,
        word: item.word,
        furigana: item.furigana,
        meaning: item.meaning,
        level,
        jlpt: item.jlpt || '級外',
        pos: item.pos,
        opic: item.opic,
        example: item.example || []
      });
    });
  }

  // Keep a stable serialized order for diffs and downstream processing.
  transformedData.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return String(a.id).localeCompare(String(b.id));
  });

  const output = {
    data: transformedData
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Transformed ${transformedData.length} entries to ${OUTPUT_FILE}`);
}

transform().catch(console.error);
