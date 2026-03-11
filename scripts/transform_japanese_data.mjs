/* cspell:ignore voca opic */
import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'voca_json/japanese_opic_dataset_integrated.json';
const OUTPUT_FILE = 'src/data/vocab.json';

// Helper to extract word and furigana
// Example: "沐浴(もくよく)" -> { word: "沐浴", furigana: "もくよく" }
// Example: "世話(せわ)になってね" -> { word: "世話になってね", furigana: "せわになってね" }
function extractFurigana(text) {
  if (!text) return { word: '', furigana: '' };
  
  const regex = /(.*?)\((.*?)\)/g;
  let word = '';
  let furigana = '';
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    word += text.substring(lastIndex, match.index) + match[1];
    furigana += text.substring(lastIndex, match.index) + match[2];
    lastIndex = regex.lastIndex;
  }
  
  word += text.substring(lastIndex);
  furigana += text.substring(lastIndex);
  
  // If no parentheses found, furigana is the word itself (if it's hiragana/katakana)
  if (!word) {
    word = text;
    furigana = text;
  }
  
  return { word, furigana };
}

function mapOPIcToJLPT(opic) {
  const mapping = {
    'AL': { level: 15, jlpt: 'N1' },
    'IH': { level: 13, jlpt: 'N2' },
    'IM3': { level: 11, jlpt: 'N2' },
    'IM2': { level: 9, jlpt: 'N3' },
    'IM1': { level: 7, jlpt: 'N3' },
    'IL': { level: 5, jlpt: 'N4' },
    'NH': { level: 3, jlpt: 'N5' },
    'NM': { level: 2, jlpt: 'N5' },
    'NL': { level: 1, jlpt: 'N5' },
  };
  return mapping[opic] || { level: 1, jlpt: 'N5' };
}

async function transform() {
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const dataset = JSON.parse(rawData);
  
  const transformedData = dataset.map((item, index) => {
    const { word, furigana } = extractFurigana(item.japanese);
    const { level, jlpt } = mapOPIcToJLPT(item.level);
    
    // Process sentences
    const sentences = [];
    if (item.conversations && item.conversations.length > 0) {
      item.conversations.forEach(line => {
        if (line.startsWith('A:') || line.startsWith('B:')) {
          const s = extractFurigana(line);
          sentences.push({
            japanese: s.word,
            furigana: s.furigana,
            meaning: '' // No translation available per line
          });
        }
      });
    } else if (item.examples) {
      item.examples.forEach(ex => {
        const s = extractFurigana(ex);
        sentences.push({
          japanese: s.word,
          furigana: s.furigana,
          meaning: '' // No translation available per line
        });
      });
    }

    const normalizedPos = String(item.PoS || item.pos || 'other').toLowerCase();

    return {
      id: String(index + 1).padStart(4, '0'),
      word: word,
      furigana: furigana,
      meaning: item.korean,
      level: level,
      jlpt: jlpt,
      pos: normalizedPos,
      synonyms: item.similar_expression || [],
      sentences: sentences
    };
  });

  const output = {
    totalWords: transformedData.length,
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
