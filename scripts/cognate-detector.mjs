/* cspell:ignore Hanja hanja yoku */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabPath = resolve(__dirname, '../src/data/vocab.json');

const KANJI_TO_HANJA = {
  '沐': '목', '浴': '욕', '足': '족', '袋': '대', '靴': '화', '下': '하', '世': '세', '話': '화', '目': '목', '口': '구',
  '悪': '악', '堅': '견', '軽': '경', '重': '중', '挟': '협', '滑': '활', '合': '합', '鼻': '비', '고': '고', '笑': '소',
  '息': '식', '荒': '황', '利': '리', '点': '점', '覚': '각', '回': '회', '通': '통', '離': '리', '引': '인', '付': '부',
  '加': '가', '込': '입', '耳': '이', '美': '미', '化': '화', '語': '어', '上': '상', '品': '품', '番': '번', '搾': '착',
  '麦': '맥', '芽': '아', '着': '착', '縫': '봉', '退': '퇴', '社': '사', '帰': '귀', '宅': '택', '職': '직', '問': '문',
  '登': '등', '校': '교', '味': '미', '出': '출', '所': '소', '形': '형', '명': '명', '連': '연', '休': '휴', '祝': '축',
  '日': '일', '暇': '가', '盆': '분', '折': '절', '平': '평', '発': '발', '表': '표', '明': '명', '見': '견', '予': '예',
  '測': '측', '期': '기', '待': '대', '当': '당', '宛': '완', '円': '원', '安': '안', '格': '격', '激': '격', '簡': '간',
  '単': '단', '整': '정', '理': '리', '頓': '돈', '片': '편', '説': '설', '睦': '목', '如': '여', '弥': '미', '生': '생',
  '卯': '묘', '皐': '고', '水': '수', '無': '무', '文': '문', '葉': '엽', '長': '장', '神': '신', '霜': '상', '師': '사',
  '走': '주', '親': '친', '御': '어', '両': '양', '祖': '조', '父': '부', '母': '모', '今': '금', '度': '도', '立': '립',
  '飽': '포', '伝': '전', '得': '득', '体': '체', '促': '촉', '進': '진', '貼': '첩', '紙': '지', '訪': '방', '向': '향',
  '買': '매', '正': '정', '露': '로', '丸': '환', '裏': '리', '原': '원', '宿': '숙', '落': '락', '乙': '을', '女': '녀',
  '人': '인', '気': '기', '道': '도', '질': '질', '屋': '옥', '氷': '빙', '銘': '명', '柄': '병', '入': '입', '飾': '식',
  '使': '사', '戸': '호', '建': '건', '後': '후', '適': '적', '切': '절', '奥': '오', '行': '행', '焼': '소', '汚': '오',
  '指': '지', '溶': '용', '乗': '승', '大': '대', '苦': '고', '間': '간', '限': '한', '定': '정', '希': '희', '少': '소',
  '価': '가', '値': '치', '압': '압', '看': '간', '板': '판', '商': '상', '普': '보', '遍': '편', '的': '적', '疎': '소',
  '会': '회', '公': '공', '私': '사', '混': '혼', '同': '동', '恐': '공', '縮': '축', '場': '장', '恋': '련', '愛': '애',
  '傾': '경', '二': '이', '掘': '굴', '物': '물', '温': '온', '金': '금', '稼': '가', '貯': '저', '傘': '산', '도': '도',
  '飲': '음', '外': '외', '可': '가', '死': '사', '잔': '잔', '真': '진', '夏': '하', '情': '정', '천': '천', '特': '특',
  '徴': '징', '청': '청', '태': '태', '泣': '읍', '대': '대', '사': '사', '시': '시', '주': '주', '역': '역', '무': '무',
  '명': '명', '의': '의', '시': '시', '색': '색', '회': '회', '긴': '긴', '장': '장', '해': '해', '정': '정', '흥': '흥',
  '飲': '음', '外': '외', '可': '가', '死': '사', '残': '잔', '真': '진', '夏': '하', '情': '정', '千': '천', '特': '특',
  '徴': '징', '清': '청', '態': '태', '泣': '읍', '対': '대', '使': '사', '詩': '시', '主': '주', '役': '역', '無': '무',
  '名': '명', '医': '의', '視': '시', '色': '색', '会': '회', '緊': '긴', '張': '장', '解': '해', '情': '정', '興': '흥',
  '福': '복', '相': '상', '演': '연', '期': '기', '力': '력', '再': '재', '政': '정', '結': '결', '束': '속', '家': '가',
  '族': '족', '安': '안', '非': '비', '情': '정', '約': '약',
  // Re-adding missed ones or correcting keys
  '高': '고', '鼻': '비', '喘': '천', '正': '정', '露': '로', '丸': '환', '結': '결', '束': '속', '家': '가', '族': '족', '約': '약', '束': '속'
};

// Internal Romaji mapping for phonetic analysis
const kanaToRomaji = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
};

function toRomaji(text) {
  if (!text) return '';
  let processed = text.replace(/っ(.)/g, (match, p1) => {
    const nextRomaji = kanaToRomaji[p1] || p1;
    return nextRomaji[0] + nextRomaji;
  });
  processed = processed.replace(/ー/g, '');
  return processed.split('').map(char => kanaToRomaji[char] || char).join('');
}

function hangulToPhonetic(text) {
  const initials = ['k', 'kk', 'n', 't', 'tt', 'r', 'm', 'p', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const middles = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const finals = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

  return text.split('').map(char => {
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return char;

    const initial = Math.floor(code / 588);
    const middle = Math.floor((code % 588) / 28);
    const final = code % 28;

    let f = finals[final];
    if (f === 'k') f = 'k'; 
    if (f === 'ng') f = 'o'; 
    if (f === 'n' || f === 'm') f = 'n';
    if (f === 'l') f = 't'; 
    
    let m = middles[middle];
    if (m === 'eo') m = 'o';
    if (m === 'yeo') m = 'yo';

    return initials[initial] + m + f;
  }).join('').toLowerCase().replace(/[^a-z]/g, '');
}

function normalizeJapanese(romaji) {
  return romaji.toLowerCase()
    .replace(/[āâ]/g, 'o')
    .replace(/[ūû]/g, 'u')
    .replace(/ou/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/yoku/g, 'yok')
    .replace(/ku$/g, 'k')
    .replace(/ki$/g, 'k')
    .replace(/tsu$/g, 't')
    .replace(/chi$/g, 't')
    .replace(/n$/g, 'n')
    .replace(/[^a-z]/g, '');
}

function levenshtein(a, b) {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function calculateSimilarity(s1, s2) {
  const dist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return (maxLen - dist) / maxLen;
}

function getHanjaReading(word) {
  return word.split('').map(char => KANJI_TO_HANJA[char] || '').join('');
}

const raw = readFileSync(vocabPath, 'utf8');
const vocab = JSON.parse(raw).data;

const results = vocab.map(entry => {
  let krCore = entry.meaning
    .split(/[,(]/)[0]
    .replace(/아기/g, '')
    .replace(/하다/g, '')
    .replace(/시키기/g, '')
    .trim()
    .replace(/\s/g, ''); 
  
  const krPhonetic = hangulToPhonetic(krCore);
  const jpPhoneticBase = toRomaji(entry.furigana);
  const jpPhonetic = normalizeJapanese(jpPhoneticBase);
  const phoneticScore = calculateSimilarity(krPhonetic, jpPhonetic);
  
  const hanjaReading = getHanjaReading(entry.word);
  const visualScore = hanjaReading && (krCore.includes(hanjaReading) || hanjaReading.includes(krCore)) ? 1.0 : 0.0;
  
  const score = Math.max(phoneticScore, visualScore);
  
  return {
    id: entry.id,
    word: entry.word,
    meaning: entry.meaning,
    krCore,
    hanjaReading,
    phoneticScore,
    visualScore,
    score
  };
});

results.sort((a, b) => b.score - a.score);

console.log('--- Top 20 Easy Cognates (Visual & Phonetic) ---');
results.slice(0, 20).forEach((r, i) => {
  const type = r.visualScore > 0 ? ' [Visual]' : ' [Phonetic]';
  console.log(`${(i + 1).toString().padStart(2, ' ')}. [${r.score.toFixed(2)}]${type} ${r.word} ↔ ${r.meaning}`);
  if (r.visualScore > 0) {
    console.log(`    (Hanja: ${r.word} matches ${r.hanjaReading})`);
  } else {
    console.log(`    (Phonetic: ${toRomaji(vocab.find(v => v.id === r.id).furigana)} ↔ ${hangulToPhonetic(r.krCore)})`);
  }
});

console.log('\n--- Bottom 5 (Hardest) ---');
results.slice(-5).forEach((r, i) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. [${r.score.toFixed(2)}] ${r.word} ↔ ${r.meaning}`);
});
