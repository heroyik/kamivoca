import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const KANA_TO_KANJI_MAP = {
  "もとより": "元より",
  "おしゃべり": "お喋り",
  "なめらか": "滑らか",
  "みずみずしい": "瑞々しい",
  "うさんくさい": "胡散臭い",
  "さらなる": "更なる",
  "ざるをえない": "ざるを得ない",
  "ささやく": "囁く",
  "ノリがいい": "ノリが良い",
  "たいてい": "大抵",
  "かさばる": "嵩張る",
  "ごまかす": "誤魔化す",
  "さきがけて": "先駆けて",
  "ゆでる": "茹でる",
  "ありがたみ": "有り難み",
  "さわやかだ": "爽やかだ",
  "ありのまま": "有りのまま",
  "もくもく": "黙々",
  "こだわり": "拘り",
  "めったに": "滅多に",
  "もったいない": "勿体ない",
  "やぶさかではない": "吝かではない",
  "からといって": "からと言って",
  "あいづち": "相槌",
  "くつろぎ": "寛ぎ",
  "あらかじめ": "予め",
  "わずか": "僅か",
  "うちわ": "団扇",
  "なぐさめる": "慰める",
  "おしぼり": "お絞り",
  "いやし": "癒し",
  "いけばな": "生け花",
  "まごころ": "真心",
  "いびきをかく": "鼾をかく",
  "しおり": "栞",
  "たね": "種",
  "あえて": "敢えて",
  "さほど": "然程",
  "ひいては": "延いては",
  "いかにも": "如何にも",
  "かろうじて": "辛うじて",
  "ことごとく": "悉く",
  "おびただしい": "夥しい",
  "いたって": "至って",
  "こだわる": "拘る",
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const changes = [];

dataset.forEach((entry) => {
  const replacement = KANA_TO_KANJI_MAP[entry.word];
  if (!replacement || replacement === entry.word) return;
  changes.push({ id: entry.id, from: entry.word, to: replacement });
  entry.word = replacement;
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changes.length} kana-first expressions to kanji-first forms.`);
changes.forEach((change) => {
  console.log(`${change.id}\t${change.from}\t=>\t${change.to}`);
});
