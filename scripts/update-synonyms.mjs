import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOCAB_FILE = path.join(__dirname, '../src/data/vocab.json');
const SYNONYMS_MAPPING_FILE = '/tmp/synonyms_mapping.json';

async function updateSynonyms() {
  try {
    const vocabJson = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
    const vocabData = vocabJson.data || [];
    
    // Read synonyms mapping
    const synonymsMapping = JSON.parse(fs.readFileSync(SYNONYMS_MAPPING_FILE, 'utf8'));

    console.log(`Updating synonyms for ${vocabData.length} entries...`);

    let updateCount = 0;
    const updatedVocabData = vocabData.map(entry => {
      const newSynonyms = synonymsMapping[entry.id];
      if (newSynonyms) {
        updateCount++;
        return {
          ...entry,
          synonyms: newSynonyms
        };
      }
      return entry;
    });

    // Write back to vocab.json
    vocabJson.data = updatedVocabData;
    fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocabJson, null, 2), 'utf8');

    console.log(`Successfully updated ${updateCount} entries in ${VOCAB_FILE}.`);
  } catch (error) {
    console.error('Error updating synonyms:', error);
    process.exit(1);
  }
}

updateSynonyms();
