# Batch A Review

Source: `voca_json/VOCA_word_furigana_separated.json`  
Scope: Newly added Batch A entries (`1008` - `1027`)

## Summary

- Added entries: `20`
- Duplicate word groups added: `0`
- Exact duplicate groups added: `0`
- Firestore sync: completed
- Build status: passed

## Review Notes

- `趣旨` / `主旨` are intentionally both included as a contrast pair.
- `紛らわしい` / `煩わしい` are intentionally both included as a contrast pair.
- The original plan's 4 grammar-pattern slots were replaced with exact-verified N1/N2 alternatives, because exact JLPT verification failed for the planned grammar entries.
- Meanings were written to work as quiz answers directly, not as meta explanations.

## Added Entries

| id | word | furigana | jlpt | pos | meaning |
|---|---|---|---|---|---|
| 1008 | いっそ | いっそ | N1 | 副詞 | 차라리, 아예 |
| 1009 | まして | まして | N1 | 副詞 | 더구나, 하물며 |
| 1010 | さほど | さほど | N1 | 副詞 | 그다지, 그렇게까지 |
| 1011 | ひいては | ひいては | N1 | 接続詞 | 나아가, 더 나아가 결국 |
| 1012 | いかにも | いかにも | N1 | 副詞 | 정말로, 아주 ~답게 |
| 1013 | せめて | せめて | N2 | 副詞 | 적어도, 최소한 |
| 1014 | かろうじて | かろうじて | N1 | 副詞 | 겨우, 간신히 |
| 1015 | 断然 | だんぜん | N1 | 副詞 | 단연, 압도적으로 |
| 1016 | 紛らわしい | まぎらわしい | N1 | イ形容詞 | 헷갈리기 쉽다, 혼동스럽다 |
| 1017 | 煩わしい | わずらわしい | N1 | イ形容詞 | 번거롭다, 귀찮다 |
| 1018 | 著しい | いちじるしい | N1 | イ形容詞 | 두드러지다, 현저하다 |
| 1019 | 根拠 | こんきょ | N1 | 名詞 | 근거, 근거가 되는 자료나 이유 |
| 1020 | 趣旨 | しゅし | N1 | 名詞 | 취지, 목적이나 중심 생각 |
| 1021 | 施行 | しこう | N1 | 名詞 | 시행, 법령 등을 실제로 실시함 |
| 1022 | 抑制 | よくせい | N1 | 名詞 | 억제, 억누름 |
| 1023 | 緩和 | かんわ | N1 | 名詞 | 완화, 누그러뜨림 |
| 1024 | 妥当 | だとう | N2 | ナ形容詞 | 타당함, 적절함 |
| 1025 | 規制 | きせい | N1 | 名詞 | 규제, 제한을 가함 |
| 1026 | 余地 | よち | N1 | 名詞 | 여지, 남아 있는 가능성이나 공간 |
| 1027 | 主旨 | しゅし | N1 | 名詞 | 요지, 말이나 글의 핵심 내용 |

## Contrast Pairs Worth Spot-Checking

### 趣旨 vs 主旨

- `趣旨`: 목적, 의도, 중심 생각
- `主旨`: 말이나 글의 핵심 내용, 요지

### 紛らわしい vs 煩わしい

- `紛らわしい`: 헷갈리기 쉽다
- `煩わしい`: 번거롭고 귀찮다

### いっそ vs せめて

- `いっそ`: 차라리 아예 그렇게 하자
- `せめて`: 최소한 이 정도는 하자

## Suggested Next QA Pass

1. Quiz distractor sampling for the 20 new entries
2. Meaning differentiation review for `趣旨 / 主旨`
3. Example naturalness review for formal nouns like `施行`, `抑制`, `緩和`
4. Check whether `副詞` entries over-cluster in the same option pool during quizzes
