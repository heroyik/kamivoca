/* cspell:ignore voca opic */
import fs from 'fs';
import path from 'path';

const INPUT_FILE = 'voca_json/VOCA_word_furigana_separated.json';
const OUTPUT_FILE = 'src/data/vocab.json';

async function transform() {
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const dataset = JSON.parse(rawData);
  
  // Group by JLPT
  const groups = {
    'N5': [],
    'N4': [],
    'N3': [],
    'N2': [],
    'N1': []
  };

  dataset.forEach(item => {
    const jlpt = item.jlpt || 'N5';
    if (groups[jlpt]) {
      groups[jlpt].push(item);
    } else {
      groups['N5'].push(item);
    }
  });

  // Sort items into a single sequence based on JLPT order
  const sortedSequence = [
    ...groups['N5'],
    ...groups['N4'],
    ...groups['N3'],
    ...groups['N2'],
    ...groups['N1']
  ];

  const totalItems = sortedSequence.length;
  const itemsPerLevel = totalItems / 15;

  const transformedData = sortedSequence.map((item, index) => {
    // Determine level globally (1-15) based on position in the sorted list
    const level = Math.min(Math.floor(index / itemsPerLevel) + 1, 15);
    
    return {
      id: item.id,
      word: item.word,
      furigana: item.furigana,
      meaning: item.meaning,
      level: level,
      jlpt: item.jlpt || 'N5',
      pos: item.pos,
      opic: item.opic,
      example: item.example || []
    };
  });

  // Sort by ID to maintain consistency
  transformedData.sort((a, b) => a.id.localeCompare(b.id));

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
