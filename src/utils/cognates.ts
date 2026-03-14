import { VocabEntry } from "@/utils/vocab";

const hiraToKana = (input: string) =>
  input.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60),
  );

const JAPANESE_MULTI_ROMAJI: Array<[string, string]> = [
  ["キャ", "kya"], ["キュ", "kyu"], ["キョ", "kyo"],
  ["シャ", "sha"], ["シュ", "shu"], ["ショ", "sho"],
  ["チャ", "cha"], ["チュ", "chu"], ["チョ", "cho"],
  ["ニャ", "nya"], ["ニュ", "nyu"], ["ニョ", "nyo"],
  ["ヒャ", "hya"], ["ヒュ", "hyu"], ["ヒョ", "hyo"],
  ["ミャ", "mya"], ["ミュ", "myu"], ["ミョ", "myo"],
  ["リャ", "rya"], ["リュ", "ryu"], ["リョ", "ryo"],
  ["ギャ", "gya"], ["ギュ", "gyu"], ["ギョ", "gyo"],
  ["ジャ", "ja"], ["ジュ", "ju"], ["ジョ", "jo"],
  ["ビャ", "bya"], ["ビュ", "byu"], ["ビョ", "byo"],
  ["ピャ", "pya"], ["ピュ", "pyu"], ["ピョ", "pyo"],
];

const JAPANESE_ROMAJI: Record<string, string> = {
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa", ヲ: "o", ン: "n",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o",
  ー: "-",
};

const CHOSEONG = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const JUNGSEONG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const JONGSEONG = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

const KOREAN_ENDINGS = [
  "시키기", "시키다", "스럽다", "스럽게", "입니다", "이었다", "였다", "하기", "하다",
  "되다", "되는", "되기", "적인", "적", "으로", "하다", "감", "함",
];

function japaneseToRomaji(input: string) {
  let text = hiraToKana(input).replace(/[^\u30A1-\u30FAー]/g, "");
  if (!text) return "";

  for (const [kana, romaji] of JAPANESE_MULTI_ROMAJI) {
    text = text.split(kana).join(` ${romaji} `);
  }

  const chars = text.trim().split("");
  let result = "";

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (char === " ") {
      continue;
    }

    if (char === "ッ") {
      const next = chars[i + 1];
      const nextRomaji = next ? JAPANESE_ROMAJI[next] || "" : "";
      result += nextRomaji.charAt(0);
      continue;
    }

    if (char === "ー") {
      const lastVowel = result.match(/[aeiou](?!.*[aeiou])/);
      if (lastVowel) result += lastVowel[0];
      continue;
    }

    result += JAPANESE_ROMAJI[char] || char;
  }

  return result.replace(/\s+/g, "");
}

function koreanToRomaji(input: string) {
  const chars = input.replace(/[^가-힣]/g, "").split("");
  return chars
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return "";
      const cho = Math.floor(code / 588);
      const jung = Math.floor((code % 588) / 28);
      const jong = code % 28;
      return `${CHOSEONG[cho]}${JUNGSEONG[jung]}${JONGSEONG[jong]}`;
    })
    .join("");
}

function consonantSkeleton(input: string) {
  return input.replace(/[aeiouyw]/g, "");
}

function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[rows - 1][cols - 1];
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function normalizeKoreanToken(token: string) {
  let normalized = token.replace(/^[^가-힣]+|[^가-힣]+$/g, "");
  for (const ending of KOREAN_ENDINGS) {
    if (normalized.endsWith(ending) && normalized.length > ending.length + 1) {
      normalized = normalized.slice(0, -ending.length);
      break;
    }
  }
  return normalized;
}

function getMeaningTokens(meaning: string) {
  return meaning
    .split(/[,\s/·・()~\-]+/)
    .map(normalizeKoreanToken)
    .filter((token) => token.length >= 2);
}

function hasJapaneseRoot(entry: VocabEntry) {
  return /[一-龯ァ-ヶ々]/.test(entry.word);
}

export function isEasyCognate(entry: VocabEntry) {
  if (!hasJapaneseRoot(entry)) return false;

  const jpRomaji = japaneseToRomaji(entry.furigana || entry.word);
  const jpSkeleton = consonantSkeleton(jpRomaji);
  const meaningTokens = getMeaningTokens(entry.meaning);

  return meaningTokens.some((token) => {
    const koRomaji = koreanToRomaji(token);
    const koSkeleton = consonantSkeleton(koRomaji);

    const fullSimilarity = similarity(jpRomaji, koRomaji);
    const skeletonSimilarity = similarity(jpSkeleton, koSkeleton);

    return (
      (fullSimilarity >= 0.72 && skeletonSimilarity >= 0.6) ||
      (jpSkeleton.length >= 3 && jpSkeleton === koSkeleton) ||
      (skeletonSimilarity >= 0.8 && Math.abs(jpSkeleton.length - koSkeleton.length) <= 1)
    );
  });
}

export function filterEasyCognates(entries: VocabEntry[], hideEasyCognates: boolean) {
  if (!hideEasyCognates) return entries;
  return entries.filter((entry) => !isEasyCognate(entry));
}
