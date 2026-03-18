# Quiz Distractor Conflict Report

Source: `voca_json/VOCA_word_furigana_separated.json`

Generated entries scanned: **891**

This report mirrors the current quiz distractor exclusion rules. Pairs listed here are candidates that should not appear together as answer options because they are same-reading pairs, known contrast pairs, or meanings are too close.

## Summary

- Manual exclusion pairs: **9**
- Same reading pairs: **6**
- Highly similar meaning pairs: **3**
- Total unique distractor conflict pairs: **11**

## Conflict Pairs

### ざるを得ない / 〜ざるをえない

- Types: highly similar meaning
- Meaning tokens overlap heavily enough to confuse distractor generation.
- 0180 | ざるを得ない | ざるをえない | ~하지 않을 수 없다, 어쩔 수 없이 ~하다
- 0461 | 〜ざるをえない | 〜ざるをえない | 어쩔 수 없이 ~하다, ~하지 않을 수 없다

### 配慮がある / 思いやりがある

- Types: manual exclusion pair
- Batch A contrast pair that should not appear together as distractors.
- 0677 | 配慮がある | はいりょがある | 세심하게 배려하다, 상대를 고려하다
- 0695 | 思いやりがある | おもいやりがある | 따뜻하게 남을 배려하다, 인정이 있다

### 紛らわしい / 煩わしい

- Types: manual exclusion pair
- Batch A contrast pair that should not appear together as distractors.
- 1016 | 紛らわしい | まぎらわしい | 헷갈리기 쉽다, 혼동스럽다
- 1017 | 煩わしい | わずらわしい | 번거롭다, 귀찮다

### 〜がてら / ついでに

- Types: manual exclusion pair, highly similar meaning
- Batch A contrast pair that should not appear together as distractors.
- Meaning tokens overlap heavily enough to confuse distractor generation.
- 0072 | 〜がてら | 〜がてら | ~하는 김에, ~겸
- 0182 | ついでに | ついでに | 하는 김에, 겸사겸사

### 手がかかる / 手間がかかる

- Types: manual exclusion pair, highly similar meaning
- Batch A contrast pair that should not appear together as distractors.
- Meaning tokens overlap heavily enough to confuse distractor generation.
- 0422 | 手がかかる | てがかかる | 손이 많이 가다, 신경 쓸 게 많다
- 0817 | 手間がかかる | てまがかかる | 손이 많이 가다

### 解ける / 溶ける

- Types: manual exclusion pair, same reading
- Batch A contrast pair that should not appear together as distractors.
- Same reading: `とける`
- 0313 | 解ける | とける | 풀리다, 해결되다
- 0326 | 溶ける | とける | 녹다

### 趣旨 / 主旨

- Types: manual exclusion pair, same reading
- Batch A contrast pair that should not appear together as distractors.
- Same reading: `しゅし`
- 1020 | 趣旨 | しゅし | 취지, 목적이나 중심 생각
- 1027 | 主旨 | しゅし | 요지, 말이나 글의 핵심 내용

### 好意 / 行為

- Types: manual exclusion pair, same reading
- Batch A contrast pair that should not appear together as distractors.
- Same reading: `こうい`
- 1055 | 好意 | こうい | 호의, 친절한 마음
- 1056 | 行為 | こうい | 행위, 행동

### 原点 / 原典

- Types: manual exclusion pair, same reading
- Batch A contrast pair that should not appear together as distractors.
- Same reading: `げんてん`
- 1069 | 原点 | げんてん | 원점, 출발점
- 1070 | 原典 | げんてん | 원전, 원본 문헌

### 購読 / 講読

- Types: manual exclusion pair, same reading
- Batch A contrast pair that should not appear together as distractors.
- Same reading: `こうどく`
- 1076 | 購読 | こうどく | 구독
- 1077 | 講読 | こうどく | 강독, 함께 읽고 풀이함

### だらだら / ダラダラ

- Types: same reading
- Same reading: `だらだら`
- 0011 | だらだら | だらだら | 질질 끌며 늘어지게
- 0260 | ダラダラ | ダラダラ | 빈둥거리다, 늘어지게 보내다
