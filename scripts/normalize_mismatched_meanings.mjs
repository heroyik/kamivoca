import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const MEANING_FIXES = {
  "0016": "단언할 수 있다, 확신을 가지고 말할 수 있다",
  "0075": "구체적인 형태로 실현하다, 구현하다",
  "0144": "지나치다, 타고 가다 목적지를 놓치다",
  "0173": "사재기, 대량으로 사들임",
  "0218": "일단 생맥주 한 잔, 우선 생맥주부터",
  "0258": "들려주다, 말해 주다, 이야기하게 해 주다",
  "0279": "적용된다, 해당된다, 들어맞는다",
  "0283": "미식가, 맛있는 것에 밝은 사람",
  "0333": "충실하게 하다, 알차게 만들다",
  "0344": "멘탈이 힘들다, 정신적으로 버겁다",
  "0360": "가마솥에 짓다",
  "0387": "많이 있다, 여러 가지 있다",
  "0436": "전자레인지에 돌리다, 데우다",
  "0442": "편식이 심하다, 가리는 것이 많다",
  "0454": "알차게 보내다, 의미 있게 보내다",
  "0461": "어쩔 수 없이 ~하다, ~하지 않을 수 없다",
  "0462": "배꼽 빠지게 웃다, 몹시 웃다",
  "0474": "야한 농담을 하다, 음담패설을 하다",
  "0511": "스트레스가 쌓이다",
  "0537": "~하기를 바라며 기도하다, ~되기를 기원하다",
  "0539": "설탕을 줄이다, 설탕 섭취를 자제하다",
  "0568": "우쭐해지다, 까불다, 기고만장해지다",
  "0596": "용돈기입장을 쓰다, 지출을 기록하다",
  "0633": "맛에 까다롭다, 미각이 예민하다",
  "0657": "간헐적 단식을 시도하다",
  "0667": "조용한 시간을 즐기다",
  "0673": "재난이다, 큰일이다, 운이 나쁘다",
  "0691": "과분한 말씀, 황송한 말씀",
  "0780": "왕창 사다, 대량으로 사들이다",
  "0786": "굴곡이 많다, 좋은 때도 나쁜 때도 있다",
  "0804": "기획을 구체화하다, 세부를 다듬다",
  "0836": "그렇구나, 과연, 알겠다",
  "0884": "힘을 빼다, 긴장을 풀다",
  "0916": "전업주부",
  "0963": "찔리는 것이 있다, 켕기는 것이 있다",
  "0968": "백마 탄 왕자님, 이상적인 연인",
  "0982": "송구합니다, 황송합니다, 몸둘 바를 모르겠습니다",
};

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
let changeCount = 0;

dataset.forEach((entry) => {
  const nextMeaning = MEANING_FIXES[entry.id];
  if (!nextMeaning || entry.meaning === nextMeaning) return;
  entry.meaning = nextMeaning;
  changeCount += 1;
});

fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(`Normalized ${changeCount} mismatched meanings.`);
