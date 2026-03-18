import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const MANUAL_POS_MAP = {
  "ビシバシ": "オノマトペ",
  "ぼんやり": "オノマトペ",
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const changes = [];

dataset.forEach((entry) => {
  const nextPos = MANUAL_POS_MAP[entry.word] || (entry.pos === "副詞・オノマトペ" ? "オノマトペ" : null);
  if (!nextPos || nextPos === entry.pos) return;
  changes.push({ id: entry.id, word: entry.word, from: entry.pos, to: nextPos });
  entry.pos = nextPos;
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changes.length} onomatopoeia POS tags.`);
changes.forEach((change) => {
  console.log(`${change.id}\t${change.word}\t${change.from}\t=>\t${change.to}`);
});
