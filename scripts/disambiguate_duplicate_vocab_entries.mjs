import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const ENTRY_PATCHES = {
  "0055": { word: "空気がピリピリ", furigana: "くうきがピリピリ" },
  "0661": { word: "肌がピリピリ", furigana: "はだがピリピリ" },
  "0200": { word: "ノリが良い", furigana: "ノリがいい" },
  "0374": { word: "メイクのノリが良い", furigana: "メイクのノリがいい" },
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const changes = [];

dataset.forEach((entry) => {
  const patch = ENTRY_PATCHES[entry.id];
  if (!patch) return;
  if (entry.word === patch.word && entry.furigana === patch.furigana) return;
  changes.push({
    id: entry.id,
    fromWord: entry.word,
    toWord: patch.word,
    fromFurigana: entry.furigana,
    toFurigana: patch.furigana,
  });
  entry.word = patch.word;
  entry.furigana = patch.furigana;
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Disambiguated ${changes.length} duplicate vocab entries.`);
changes.forEach((change) => {
  console.log(`${change.id}\t${change.fromWord}\t=>\t${change.toWord}`);
});
