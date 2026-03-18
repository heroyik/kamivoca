import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const WORD_FIXES = {
  "0016": {
    word: "言い切る",
    furigana: "いいきる",
    meaning: "단언하다, 확신을 가지고 말하다",
  },
  "0116": {
    word: "体がもつ",
    furigana: "からだがもつ",
    meaning: "몸이 버티다, 몸이 견디다",
  },
  "0118": {
    word: "とはいえない",
    furigana: "とはいえない",
    meaning: "그렇다고는 할 수 없다, 라고는 말할 수 없다",
  },
  "0279": {
    word: "当てはまる",
    furigana: "あてはまる",
    meaning: "들어맞다, 해당되다, 적용되다",
  },
  "0317": {
    word: "心に留める",
    furigana: "こころにとめる",
    meaning: "마음에 새기다, 잊지 않고 기억해 두다",
  },
  "0387": {
    word: "多々ある",
    furigana: "たたある",
    meaning: "여럿 있다, 많이 있다",
  },
  "0716": {
    word: "薄情だ",
    furigana: "はくじょうだ",
    meaning: "매정하다, 인정이 없다",
  },
  "0721": {
    word: "のんきだ",
    furigana: "のんきだ",
    meaning: "태평하다, 느긋하다",
  },
  "0982": {
    word: "恐縮する",
    furigana: "きょうしゅくする",
    meaning: "송구하다, 황송하다",
  },
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
let changeCount = 0;

dataset.forEach((entry) => {
  const next = WORD_FIXES[entry.id];
  if (!next) return;

  let changed = false;
  if (entry.word !== next.word) {
    entry.word = next.word;
    changed = true;
  }
  if (entry.furigana !== next.furigana) {
    entry.furigana = next.furigana;
    changed = true;
  }
  if (next.meaning && entry.meaning !== next.meaning) {
    entry.meaning = next.meaning;
    changed = true;
  }

  if (changed) {
    changeCount += 1;
  }
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changeCount} sentence-like vocab headwords.`);
