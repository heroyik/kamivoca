import fs from 'fs';

const FILE = 'voca_json/japanese_opic_dataset_integrated.json';

function stripFurigana(text = '') {
  return text.replace(/([^()]+)\(([^()]+)\)/g, '$1').trim();
}

function normalize(text = '') {
  return stripFurigana(text).replace(/[\s　]/g, '').toLowerCase();
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, seed, offset = 0) {
  return arr[(seed + offset) % arr.length];
}

function inferPOS(japones) {
  const term = stripFurigana(japones);
  if (!term) return 'expression';

  // Idiomatic / phrasal clues first
  if (/[がをにへでと]$/.test(term)) return 'expression';
  if (/(こと|もの|よう)$/.test(term) && term.length > 2) return 'expression';

  // Verb clues
  if (/(する|できる|なる|られる|れる|せる|させる|ている|てる|てしまう|ちゃう|てみる|ておく)$/.test(term)) return 'verb';
  if (/[うくぐすつぬぶむる]$/.test(term)) return 'verb';

  // Adjective clues
  if (/(しい|やすい|づらい|っぽい|らしい|がたい|にくい)$/.test(term)) return 'adjective';
  if (/い$/.test(term) && !/(したい|みたい|くらい)$/.test(term)) return 'adjective';

  return 'noun';
}

const scenes = ['friend', 'work', 'family', 'school', 'shop', 'daily'];
const sceneJP = {
  friend: '友(とも)だちとの会話(かいわ)',
  work: '仕事(しごと)のやり取(と)り',
  family: '家族(かぞく)との会話(かいわ)',
  school: '勉強(べんきょう)の場面(ばめん)',
  shop: '店(みせ)でのやり取(と)り',
  daily: '日常(にちじょう)会話(かいわ)',
};

function buildCollocations(term, pos) {
  if (pos === 'verb') {
    return [
      `${term}って言(い)う`,
      `${term}ようにする`,
      `${term}か迷(まよ)う`,
    ];
  }
  if (pos === 'adjective') {
    return [
      `${term}って感(かん)じ`,
      `${term}って言(い)い方(かた)`,
      `${term}かどうか`,
    ];
  }
  if (pos === 'expression') {
    return [
      `${term}って表現(ひょうげん)`,
      `${term}を会話(かいわ)で使(つか)う`,
      `${term}のニュアンス`,
    ];
  }
  return [
    `${term}を使(つか)う`,
    `${term}の話(はなし)をする`,
    `${term}って言(い)う`,
  ];
}

function buildConversation(term, pos, seed, scene) {
  const openers = [
    `A: ${sceneJP[scene]}で「${term}」って、よく使(つか)う？`,
    `A: 最近(さいきん)、${sceneJP[scene]}で「${term}」を聞(き)くんだけど、自然(しぜん)？`,
    `A: 「${term}」って、${sceneJP[scene]}だとどんな時(とき)に出(で)る？`,
    `A: ${sceneJP[scene]}なら「${term}」って言(い)って大丈夫(だいじょうぶ)？`,
  ];

  const b1 = [
    `B: うん、${sceneJP[scene]}なら「${term}」で通(つう)じるよ。`,
    `B: うん、そこで「${term}」を使(つか)うのは自然(しぜん)。`,
    `B: うん、ふつうに「${term}」って言(い)うよ。`,
  ];

  const asks = [
    `A: じゃあ、どの言(い)い方(かた)で「${term}」を入(い)れればいい？`,
    `A: ニュアンス的(てき)には「${term}」って軽(かる)い感(かん)じ？`,
    `A: 似(に)た表現(ひょうげん)と比(くら)べると「${term}」はどう？`,
    `A: なるほど、会話(かいわ)のどこで「${term}」を使(つか)うのが自然(しぜん)？`,
  ];

  const b2ByPos = {
    noun: [
      `B: 話題(わだい)を出(だ)す時(とき)に「${term}」って置(お)くと自然(しぜん)だよ。`,
      `B: 名詞(めいし)としてそのまま「${term}」を入(い)れればOK。`,
      `B: 文(ぶん)の中心(ちゅうしん)に「${term}」を置(お)くと分(わ)かりやすい。`,
    ],
    verb: [
      `B: 動作(どうさ)を言(い)う流(なが)れで「${term}」って言(い)えば自然(しぜん)。`,
      `B: 文末(ぶんまつ)に「${term}」を置(お)くと会話(かいわ)っぽいよ。`,
      `B: 相手(あいて)の行動(こうどう)に対(たい)して「${term}」を使(つか)うと伝(つた)わる。`,
    ],
    adjective: [
      `B: 印象(いんしょう)を言(い)う時(とき)に「${term}」って言(い)うと自然(しぜん)。`,
      `B: 反応(はんのう)を添(そ)える形(かたち)で「${term}」を使(つか)うといいよ。`,
      `B: 感想(かんそう)として「${term}」を入(い)れると会話(かいわ)になじむ。`,
    ],
    expression: [
      `B: 決(き)まり文句(もんく)として「${term}」を使(つか)うと自然(しぜん)だよ。`,
      `B: 流(なが)れに合(あ)わせて「${term}」を挟(はさ)むと会話(かいわ)っぽい。`,
      `B: その場(ば)の反応(はんのう)で「${term}」って言(い)う感じ(かんじ)。`,
    ],
  };

  const closersA = [
    `A: わかった、次(つぎ)は「${term}」で言(い)ってみる。`,
    `A: なるほど、今度(こんど)の会話(かいわ)で「${term}」を使(つか)ってみる。`,
    `A: じゃあ実際(じっさい)に「${term}」を入(い)れて話(はな)してみる。`,
  ];

  const closersB = [
    `B: うん、それならかなり自然(しぜん)に聞(き)こえる。`,
    `B: いいね、その使(つか)い方(かた)で問題(もんだい)ないよ。`,
    `B: それで十分(じゅうぶん)伝(つた)わるし、会話(かいわ)もなめらかになる。`,
  ];

  return [
    pick(openers, seed, 0),
    pick(b1, seed, 1),
    pick(asks, seed, 2),
    pick(b2ByPos[pos], seed, 3),
    pick(closersA, seed, 4),
    pick(closersB, seed, 5),
  ];
}

function buildExamples(term, pos, seed, sceneA, sceneB, similars) {
  const sim = similars.length > 0 ? stripFurigana(similars[seed % similars.length]) : '';

  const e1ByPos = {
    noun: `この${sceneJP[sceneA]}なら「${term}」をそのまま使(つか)うのが自然(しぜん)。`,
    verb: `${sceneJP[sceneA]}では「${term}」って言(い)うと動作(どうさ)がはっきり伝(つた)わる。`,
    adjective: `${sceneJP[sceneA]}で感想(かんそう)を言(い)うなら「${term}」がしっくりくる。`,
    expression: `${sceneJP[sceneA]}の流(なが)れで「${term}」を入(い)れると会話(かいわ)が自然(しぜん)になる。`,
  };

  let second;
  if (sim && sim !== stripFurigana(term)) {
    second = `「${term}」と「${sim}」は似(に)ていても、${sceneJP[sceneB]}では言(い)い分(わ)けると自然(しぜん)。`;
  } else {
    const e2ByPos = {
      noun: `${sceneJP[sceneB]}でも「${term}」って言(い)えば、意味(いみ)がすぐ伝(つた)わる。`,
      verb: `${sceneJP[sceneB]}で「${term}」を使(つか)うと、言(い)いたい行動(こうどう)が明確(めいかく)になる。`,
      adjective: `${sceneJP[sceneB]}で反応(はんのう)する時(とき)も「${term}」は使(つか)いやすい。`,
      expression: `${sceneJP[sceneB]}でも「${term}」はそのまま会話(かいわ)で使(つか)える。`,
    };
    second = e2ByPos[pos];
  }

  return [e1ByPos[pos], second];
}

const raw = fs.readFileSync(FILE, 'utf8');
const items = JSON.parse(raw);

for (const item of items) {
  const term = item.japones?.trim() || '';
  const seed = hashString(normalize(term));
  const pos = inferPOS(term);

  const s1 = pick(scenes, seed, 0);
  const s2 = pick(scenes, seed, 2);
  const s3 = pick(scenes, seed, 4);

  const similars = Array.isArray(item.expresion_similar) ? item.expresion_similar : [];

  item.PoS = pos;
  item.register = 'casual';
  item.context_scenes = [s1, s2, s3];
  item.learning_focus = ['context', 'nuance', 'correction'];
  item.collocations = buildCollocations(term, pos);
  item.conversacion = buildConversation(term, pos, seed, s1);
  item.ejemplos = buildExamples(term, pos, seed, s2, s3, similars);
}

fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + '\n', 'utf8');

const posCount = {};
for (const i of items) posCount[i.PoS] = (posCount[i.PoS] || 0) + 1;
console.log('updated', items.length);
console.log('pos', posCount);
