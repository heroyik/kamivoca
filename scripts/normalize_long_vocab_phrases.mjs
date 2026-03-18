import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const LONG_PHRASE_MAP = {
  "彼のアイデアが新しい製品として具現化された": { word: "具現化する", furigana: "ぐげんかする" },
  "ソロキャンプでは静かな時間を楽しめます": { word: "静かな時間を楽しむ", furigana: "しずかなじかんをたのしむ" },
  "マスクの買い占めが問題になっている": { word: "買い占めが問題になる", furigana: "かいしめがもんだいになる" },
  "お小遣い帳をつけてお金を管理する": { word: "お小遣い帳をつける", furigana: "おこづかいちょうをつける" },
  "16時間の間欠的断食を試している": { word: "間欠的断食を試す", furigana: "かんけつてきだんじきをためす" },
  "力を入れすぎず, 肩の力を抜いて": { word: "肩の力を抜く", furigana: "かたのちからをぬく" },
  "白馬に乗った王子様を待ってるの？": { word: "白馬の王子様", furigana: "はくばのおうじさま" },
  "居眠りして電車を乗り過ごした": { word: "乗り過ごす", furigana: "のりすごす" },
  "ケリをつける(蹴りをつける)": { word: "ケリをつける", furigana: "ケリをつける" },
  "なるほど、そうなんですね。": { word: "なるほど", furigana: "なるほど" },
  "彼女は好き嫌いが多いので": { word: "好き嫌いが多い", furigana: "すききらいがおおい" },
  "どうしても～ざるをえない": { word: "〜ざるをえない", furigana: "〜ざるをえない" },
  "いびきをかかれていらいら": { word: "いびきをかかれていらいらする", furigana: "いびきをかかれていらいらする" },
  "仮想通貨に投資している": { word: "仮想通貨に投資する", furigana: "かそうつうかにとうしする" },
  "腹がよじれるほど笑った": { word: "腹がよじれるほど笑う", furigana: "はらがよじれるほどわらう" },
  "彼はよくシモネタを言う": { word: "シモネタを言う", furigana: "シモネタをいう" },
  "息子がよく育ってくれて": { word: "よく育ってくれて", furigana: "よくそだってくれて" },
  "妊娠を目指して行う活動": { word: "妊活", furigana: "にんかつ" },
  "もったいないお言葉です": { word: "もったいないお言葉", furigana: "もったいないおことば" },
  "この企画を詰めていこう": { word: "企画を詰める", furigana: "きかくをつめる" },
  "過去の失敗にとらわれる": { word: "失敗にとらわれる", furigana: "しっぱいにとらわれる" },
  "やましいことがあるなら": { word: "やましいことがある", furigana: "やましいことがある" },
  "聞かせてもらえますか": { word: "聞かせてもらう", furigana: "きかせてもらう" },
  "健康でありますように": { word: "健康でありますように", furigana: "けんこうでありますように" },
  "ご飯をお釜で炊きます": { word: "お釜で炊く", furigana: "おかまでたく" },
  "1日を有意義に過ごす": { word: "有意義に過ごす", furigana: "ゆういぎにすごす" },
  "砂糖をひかえています": { word: "砂糖をひかえる", furigana: "さとうをひかえる" },
  "彼は味にうるさいので": { word: "味にうるさい", furigana: "あじにうるさい" },
  "コスメを爆買いした！": { word: "爆買いする", furigana: "ばくがいする" },
  "メイクのノリがいい": { word: "ノリが良い", furigana: "ノリがいい" },
  "大変です 災難です": { word: "災難だ", furigana: "さいなんだ" },
  "家内は専業主婦です": { word: "専業主婦", furigana: "せんぎょうしゅふ" },
  "大して気にしない": { word: "大して気にしない", furigana: "たいしてきにしない" },
  "食事が偏っている": { word: "食事が偏っている", furigana: "しょくじがかたよっている" },
  "見かけで判断する": { word: "見かけで判断する", furigana: "みかけではんだんする" },
  "とりあえず生中で": { word: "とりあえず生中", furigana: "とりあえずなまちゅう" },
  "彼はグルメだから": { word: "グルメ", furigana: "グルメ" },
  "1日を充実させる": { word: "充実させる", furigana: "じゅうじつさせる" },
  "メンタルしんどい": { word: "メンタルがしんどい", furigana: "メンタルがしんどい" },
  "チンしましょうか": { word: "チンする", furigana: "チンする" },
  "ストレスが貯まる": { word: "ストレスがたまる", furigana: "ストレスがたまる" },
  "調子に乗らないで": { word: "調子に乗る", furigana: "ちょうしにのる" },
  "オブラートに包む": { word: "オブラートに包む", furigana: "オブラートにつつむ" },
  "人生山あり谷あり": { word: "山あり谷あり", furigana: "やまありたにあり" }
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const changes = [];

dataset.forEach((entry) => {
  const replacement = LONG_PHRASE_MAP[entry.word];
  if (!replacement) return;
  if (entry.word === replacement.word && entry.furigana === replacement.furigana) return;
  changes.push({
    id: entry.id,
    fromWord: entry.word,
    toWord: replacement.word,
    fromFurigana: entry.furigana,
    toFurigana: replacement.furigana,
  });
  entry.word = replacement.word;
  entry.furigana = replacement.furigana;
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changes.length} long phrase vocab entries.`);
changes.forEach((change) => {
  console.log(`${change.id}\t${change.fromWord}\t=>\t${change.toWord}`);
});
