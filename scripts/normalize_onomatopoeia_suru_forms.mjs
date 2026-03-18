import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const ONOMATOPOEIA_SURU_MAP = {
  "ワイワイする": { word: "ワイワイ", furigana: "ワイワイ" },
  "しんみりする": { word: "しんみり", furigana: "しんみり" },
  "ダラダラする": { word: "ダラダラ", furigana: "ダラダラ" },
  "ヒリヒリする": { word: "ヒリヒリ", furigana: "ヒリヒリ" },
  "ピリピリする": { word: "ピリピリ", furigana: "ピリピリ" },
  "ぼーっとする": { word: "ぼーっと", furigana: "ぼーっと" },
  "ちゃっかりしてる": { word: "ちゃっかり", furigana: "ちゃっかり" },
  "ズキズキしています": { word: "ズキズキ", furigana: "ズキズキ" },
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const changes = [];

dataset.forEach((entry) => {
  const replacement = ONOMATOPOEIA_SURU_MAP[entry.word];
  if (!replacement) return;

  changes.push({
    id: entry.id,
    fromWord: entry.word,
    toWord: replacement.word,
    fromPos: entry.pos,
    toPos: "オノマトペ",
  });

  entry.word = replacement.word;
  entry.furigana = replacement.furigana;
  entry.pos = "オノマトペ";
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changes.length} onomatopoeia suru-form entries.`);
changes.forEach((change) => {
  console.log(`${change.id}\t${change.fromWord}\t${change.fromPos}\t=>\t${change.toWord}\t${change.toPos}`);
});
