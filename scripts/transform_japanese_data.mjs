/* cspell:ignore voca opic */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'voca_json/VOCA_word_furigana_separated.json';
const OUTPUT_FILE = 'src/data/vocab.json';
const DUPLICATE_REPORT_FILES = ['duplicated.md', 'strategy/duplicated.md'];
const DISTRACTOR_REPORT_FILES = ['distractor_conflicts.md', 'strategy/distractor_conflicts.md'];
const TOTAL_LEVELS = 15;
const LEVEL_SHUFFLE_SALT = 'kamivoca-2.3.0-level-redistribute';

const JLPT_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1', '級外'];
const JLPT_RANK = new Map(JLPT_ORDER.map((level, index) => [level, index]));

// Easier -> harder within the same JLPT bucket.
const OPIC_ORDER = ['IM2', 'IH', 'AL'];
const OPIC_RANK = new Map(OPIC_ORDER.map((level, index) => [level, index]));
const DISTRACTOR_EXCLUSION_GROUPS = [
  ['〜がてら', 'ついでに'],
  ['手を繋ぐ', '手を握る'],
  ['1日を充実させる', '1日を有意義に過ごす'],
  ['頭が切れる', '頭の回転が速い'],
  ['育ってくれて', '息子がよく育ってくれて'],
  ['手がかかる', '手間がかかる'],
  ['たまたま見る', '見かける'],
  ['配慮がある', '思いやりがある'],
  ['趣旨', '主旨'],
  ['紛らわしい', '煩わしい'],
  ['原点', '原典'],
  ['好意', '行為'],
  ['購読', '講読'],
  ['解ける', '溶ける'],
];

function ensureDirForFile(filePath) {
  const outputDir = path.dirname(filePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function compareDifficulty(a, b) {
  const jlptRankA = JLPT_RANK.get(a.jlpt) ?? JLPT_RANK.size;
  const jlptRankB = JLPT_RANK.get(b.jlpt) ?? JLPT_RANK.size;
  if (jlptRankA !== jlptRankB) return jlptRankA - jlptRankB;

  const opicRankA = OPIC_RANK.get(a.opic) ?? OPIC_RANK.size;
  const opicRankB = OPIC_RANK.get(b.opic) ?? OPIC_RANK.size;
  if (opicRankA !== opicRankB) return opicRankA - opicRankB;

  const shuffleRankA = getStableShuffleRank(a);
  const shuffleRankB = getStableShuffleRank(b);
  if (shuffleRankA !== shuffleRankB) return shuffleRankA - shuffleRankB;

  const furiganaA = (a.furigana || '').localeCompare(b.furigana || 'ja');
  if (furiganaA !== 0) return furiganaA;

  const wordA = (a.word || '').localeCompare(b.word || '', 'ja');
  if (wordA !== 0) return wordA;

  return String(a.id).localeCompare(String(b.id));
}

function getStableShuffleRank(entry) {
  const key = [
    LEVEL_SHUFFLE_SALT,
    entry.word || '',
    entry.furigana || '',
    entry.meaning || '',
    entry.jlpt || '',
    entry.opic || '',
  ].join('::');

  return crypto
    .createHash('sha256')
    .update(key)
    .digest()
    .readUInt32BE(0);
}

function normalizeWordKey(word = '') {
  return word.normalize('NFKC').replace(/[〜～]/g, '~').replace(/\s+/g, '').toLowerCase();
}

function normalizeMeaningKey(meaning = '') {
  return meaning
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[~～]/g, '~')
    .replace(/[,.·•|/()[\]{}'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeReadingKey(reading = '') {
  return reading
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
    .toLowerCase();
}

function normalizeMeaningToken(token = '') {
  return token
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[~～,./·•|(){}\[\]"'`]/g, '')
    .replace(/\s+/g, '');
}

function getMeaningTokens(meaning = '') {
  return Array.from(
    new Set(
      meaning
        .split(/[,\n/·•|(){}\[\]]|،|，/)
        .flatMap((chunk) => chunk.split(/\s+/))
        .map(normalizeMeaningToken)
        .filter((token) => token.length >= 2),
    ),
  );
}

function hasHighlySimilarMeaning(aMeaning, bMeaning) {
  const aTokens = getMeaningTokens(aMeaning);
  const bTokens = getMeaningTokens(bMeaning);

  if (aTokens.length === 0 || bTokens.length === 0) {
    return false;
  }

  const overlapCount = aTokens.filter((token) => bTokens.includes(token)).length;
  const shorterLength = Math.min(aTokens.length, bTokens.length);
  const longerLength = Math.max(aTokens.length, bTokens.length);

  return overlapCount >= 2 && overlapCount >= shorterLength && overlapCount / longerLength >= 0.6;
}

function groupBy(items, keyBuilder) {
  const map = new Map();

  items.forEach((item) => {
    const key = keyBuilder(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  });

  return Array.from(map.entries())
    .map(([key, entries]) => ({ key, entries }))
    .filter((group) => group.entries.length > 1)
    .sort((a, b) => a.key.localeCompare(b.key, 'ja'));
}

function renderEntryLine(entry) {
  return `- ${entry.id} | ${entry.word} | ${entry.furigana} | ${entry.meaning}`;
}

function writeReportFiles(paths, content) {
  paths.forEach((filePath) => {
    ensureDirForFile(filePath);
    fs.writeFileSync(filePath, content);
  });
}

function buildDuplicateReport(dataset) {
  const exactDuplicateGroups = groupBy(
    dataset,
    (entry) => [normalizeWordKey(entry.word), normalizeReadingKey(entry.furigana), normalizeMeaningKey(entry.meaning)].join('::'),
  );
  const sameWordGroups = groupBy(dataset, (entry) => normalizeWordKey(entry.word));
  const sameReadingGroups = groupBy(dataset, (entry) => normalizeReadingKey(entry.furigana || entry.word))
    .filter((group) => new Set(group.entries.map((entry) => normalizeWordKey(entry.word))).size > 1);
  const sameMeaningGroups = groupBy(dataset, (entry) => normalizeMeaningKey(entry.meaning))
    .filter((group) => new Set(group.entries.map((entry) => normalizeWordKey(entry.word))).size > 1);

  const sections = [
    '# Duplicate And Similar Entry Report',
    '',
    `Source: \`${INPUT_FILE}\``,
    '',
    `Generated entries scanned: **${dataset.length}**`,
    '',
    'Most exact/same-word duplicates have been merged or removed. The remaining groups below are mainly semantic neighbors or same-reading different-kanji pairs that still need manual product judgement.',
    '',
    '## Summary',
    '',
    `- Exact duplicate records (word + furigana + meaning all identical): **${exactDuplicateGroups.length} groups**`,
    `- Same word duplicates: **${sameWordGroups.length} groups**`,
    `- Same furigana, different word: **${sameReadingGroups.length} groups**`,
    `- Same normalized meaning, different word: **${sameMeaningGroups.length} groups**`,
    '',
    '## Exact Duplicate Records',
    '',
  ];

  if (exactDuplicateGroups.length === 0) {
    sections.push('- None', '');
  } else {
    exactDuplicateGroups.forEach((group) => {
      sections.push(`### ${group.key} (${group.entries.length})`, '');
      group.entries.forEach((entry) => sections.push(renderEntryLine(entry)));
      sections.push('');
    });
  }

  sections.push('## Same Word Duplicates', '');
  if (sameWordGroups.length === 0) {
    sections.push('- None', '');
  } else {
    sameWordGroups.forEach((group) => {
      sections.push(`### ${group.entries[0].word} (${group.entries.length})`, '');
      group.entries.forEach((entry) => sections.push(renderEntryLine(entry)));
      sections.push('');
    });
  }

  sections.push('## Same Furigana, Different Word', '');
  if (sameReadingGroups.length === 0) {
    sections.push('- None', '');
  } else {
    sameReadingGroups.forEach((group) => {
      sections.push(`### ${group.key} (${group.entries.length})`, '');
      group.entries.forEach((entry) => sections.push(renderEntryLine(entry)));
      sections.push('');
    });
  }

  sections.push('## Same Meaning, Different Word', '');
  if (sameMeaningGroups.length === 0) {
    sections.push('- None', '');
  } else {
    sameMeaningGroups.forEach((group) => {
      sections.push(`### ${group.entries[0].meaning} (${group.entries.length})`, '');
      group.entries.forEach((entry) => sections.push(renderEntryLine(entry)));
      sections.push('');
    });
  }

  return sections.join('\n');
}

function buildDistractorConflictReport(dataset) {
  const normalizedExclusionGroups = DISTRACTOR_EXCLUSION_GROUPS.map((group) => group.map((word) => normalizeWordKey(word)));
  const pairMap = new Map();

  function pushPair(type, a, b, reason) {
    const ordered = [a, b].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const pairKey = `${ordered[0].id}::${ordered[1].id}`;
    if (!pairMap.has(pairKey)) {
      pairMap.set(pairKey, { a: ordered[0], b: ordered[1], reasons: new Set(), types: new Set() });
    }
    const pair = pairMap.get(pairKey);
    pair.reasons.add(reason);
    pair.types.add(type);
  }

  for (let i = 0; i < dataset.length; i += 1) {
    for (let j = i + 1; j < dataset.length; j += 1) {
      const a = dataset[i];
      const b = dataset[j];

      const aWord = normalizeWordKey(a.word);
      const bWord = normalizeWordKey(b.word);
      const aReading = normalizeReadingKey(a.furigana || a.word);
      const bReading = normalizeReadingKey(b.furigana || b.word);

      if (normalizedExclusionGroups.some((group) => group.includes(aWord) && group.includes(bWord))) {
        pushPair('manual exclusion pair', a, b, 'Batch A contrast pair that should not appear together as distractors.');
      }

      if (aReading && bReading && aReading === bReading && aWord !== bWord) {
        pushPair('same reading', a, b, `Same reading: \`${aReading}\``);
      }

      if (hasHighlySimilarMeaning(a.meaning, b.meaning)) {
        pushPair('highly similar meaning', a, b, 'Meaning tokens overlap heavily enough to confuse distractor generation.');
      }
    }
  }

  const groupedPairs = Array.from(pairMap.values()).sort((left, right) => {
    const leftKey = `${Array.from(left.types).join(',')} ${left.a.id}`;
    const rightKey = `${Array.from(right.types).join(',')} ${right.a.id}`;
    return leftKey.localeCompare(rightKey, 'ja');
  });

  const sections = [
    '# Quiz Distractor Conflict Report',
    '',
    `Source: \`${INPUT_FILE}\``,
    '',
    `Generated entries scanned: **${dataset.length}**`,
    '',
    'This report mirrors the current quiz distractor exclusion rules. Pairs listed here are candidates that should not appear together as answer options because they are same-reading pairs, known contrast pairs, or meanings are too close.',
    '',
    '## Summary',
    '',
    `- Manual exclusion pairs: **${groupedPairs.filter((pair) => pair.types.has('manual exclusion pair')).length}**`,
    `- Same reading pairs: **${groupedPairs.filter((pair) => pair.types.has('same reading')).length}**`,
    `- Highly similar meaning pairs: **${groupedPairs.filter((pair) => pair.types.has('highly similar meaning')).length}**`,
    `- Total unique distractor conflict pairs: **${groupedPairs.length}**`,
    '',
    '## Conflict Pairs',
    '',
  ];

  if (groupedPairs.length === 0) {
    sections.push('- None', '');
  } else {
    groupedPairs.forEach((pair) => {
      sections.push(`### ${pair.a.word} / ${pair.b.word}`);
      sections.push('');
      sections.push(`- Types: ${Array.from(pair.types).join(', ')}`);
      Array.from(pair.reasons).forEach((reason) => sections.push(`- ${reason}`));
      sections.push(renderEntryLine(pair.a));
      sections.push(renderEntryLine(pair.b));
      sections.push('');
    });
  }

  return sections.join('\n');
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
  ensureDirForFile(OUTPUT_FILE);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  writeReportFiles(DUPLICATE_REPORT_FILES, buildDuplicateReport(dataset));
  writeReportFiles(DISTRACTOR_REPORT_FILES, buildDistractorConflictReport(dataset));
  console.log(`Transformed ${transformedData.length} entries to ${OUTPUT_FILE}`);
}

transform().catch(console.error);
