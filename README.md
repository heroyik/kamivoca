# KamiVoca v3.0.3

KamiVoca is a mobile-first Japanese vocabulary app built with Next.js and Firebase. It combines a 15-step progression map, quiz/review loops, global mistake tracking, and admin-side dataset curation for a Korean-speaking learner audience.

Current dataset state:
- source entries: `886`
- transformed app entries: `886`
- learning units: `15`
- unit distribution: `60 x 7`, `59 x 8`

## Product Overview

KamiVoca is structured around one main learner loop:
- `LEARN`: sequential unit-based study
- `REVIEW`: personal mistake review plus global "Wall of Pain"
- `LEADER`: global leaderboard
- `PROFILE`: auth, settings, reset tools
- `COGNITE` / `EDIT`: admin-only tabs unlocked by admin cheat

The app is designed for static deployment on GitHub Pages, while runtime state and admin operations are backed by Firebase.

## Stack

- Next.js 16
- React 19
- Firebase Auth
- Firestore
- GitHub Pages
- Playwright

## Repository Layout

- [src/app](src/app): app routes, page shell, global styles
- [src/components](src/components): quiz UI, review UI, admin UI
- [src/contexts](src/contexts): app-wide state and Firestore sync
- [src/data/vocab.json](src/data/vocab.json): transformed runtime dataset
- [voca_json/VOCA_word_furigana_separated.json](voca_json/VOCA_word_furigana_separated.json): source dataset
- [scripts](scripts): normalization, transform, sync, admin maintenance
- [.github/workflows/nextjs.yml](.github/workflows/nextjs.yml): Pages build and deploy workflow

## Architecture Docs

- [strategy/DataArchitecture.md](strategy/DataArchitecture.md): vocab and Firestore data architecture
- [strategy/offline_workflow.md](strategy/offline_workflow.md): offline-ready study workflow and limitations
- [strategy/sentence_like_vocab_candidates.md](strategy/sentence_like_vocab_candidates.md): remaining sentence-like headword review list
- [strategy/duplicated.md](strategy/duplicated.md): current duplicate vocab review notes
- [distractor_conflicts.md](distractor_conflicts.md): quiz distractor conflict review notes

## Dataset Flow

There are two main dataset layers:

1. Source dataset
- [VOCA_word_furigana_separated.json](voca_json/VOCA_word_furigana_separated.json)
- includes `id`, `word`, `furigana`, `meaning`, `jlpt`, `opic`, `pos`, `example`, `synonyms`

2. Runtime dataset
- [vocab.json](src/data/vocab.json)
- generated from the source dataset by [transform_japanese_data.mjs](scripts/transform_japanese_data.mjs)
- assigns `level` 1-15 while preserving difficulty order

Current transform behavior:
- entries are globally sorted by JLPT, then OPIC, then stable shuffle
- they are split into 15 near-even buckets
- final result is serialized by `level`, then `id`

## Learning Model

### Units

- `15` units total
- currently balanced as `60/60/60/60/60/60/60/59/59/59/59/59/59/59/59`
- progression is sequential by default
- `unlockAllLevels` is available in settings/dev tools

### Quiz

- multiple-choice meaning quiz
- distractors are constrained by inferred POS
- incorrect answers go to mistake review
- `分かりません` is supported as a separate failure path
- feedback example shows a single example sentence
- example furigana is rendered with ruby support
- adverb and onomatopoeia examples are restricted to examples that actually contain the target surface form

### Review

- personal review list is based on mistake counts
- `Wall of Pain` is built from `globalWordStats`
- deleted words are filtered out globally

## Admin Features

Admin identity is controlled by `NEXT_PUBLIC_KAMI_ADMIN_KEY` / `KAMI_ADMIN_KEY`.

Admin tabs are not always visible. They appear only when:
- the signed-in account matches the admin key
- the profile admin cheat has been triggered

### COGNITE

- per-user manual curation list
- stored at `users/{uid}/manualCognites/{wordKey}`
- resilient to ID reshuffles because it keys off normalized headwords

### EDIT

- runtime dataset editor for:
  - `word`
  - `furigana`
  - `meaning`
  - `step`
  - `jlpt`
  - `pos`
  - `opic`
  - `example[]`
  - `synonyms[]`
- stores overrides in Firestore `adminVocabOverrides`
- also includes global delete actions for selected entries

### Global Delete

Deleted words are tracked by normalized headword in `adminDeletedWords`.

Deletion effects:
- filtered from app runtime
- excluded from Firestore sync scripts
- removed from `vocabEntries`
- removed from `fullVocaEntries`
- removed from all users' `manualCognites`

## Local Development

Requirements:
- Node.js
- npm
- Firebase project access
- Firebase CLI login via `firebase login`
- local Firebase web config in `.env.local`

Environment variables used in app/workflow:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_KAMI_ADMIN_KEY`
- `KAMI_ADMIN_KEY`
- `NEXT_PUBLIC_BASE_PATH`

GitHub Pages builds use the same Firebase key set through repository secrets in `.github/workflows/nextjs.yml`.

Common commands:

```bash
npm install
npm run dev
npm run build
```

## Offline Mode

Offline study is supported for the admin Google account only.

Current behavior:
- offline access is allowed only when the signed-in Google account matches `NEXT_PUBLIC_KAMI_ADMIN_KEY`
- Firestore uses persistent local cache in the browser
- a service worker precaches the app shell, review route, and unit routes `unit-1` through `unit-15`
- the home header shows `OFFLINE ready!` once the service worker is installed and the offline cache is ready
- when the device is offline, the header switches to `OFFLINE`

Recommended real-device flow before boarding a flight:
1. Open the deployed app in Chrome while online.
2. Sign in with the admin Google account.
3. Confirm the `ADMIN` badge is visible in the Profile tab.
4. Wait until the home header shows `OFFLINE ready!`.
5. Open Home, Review, Profile, and at least one quiz route while still online.
6. Keep the tab open and then switch the device to airplane mode.
7. Re-enter the app from the same open tab or installed shortcut.

Important notes:
- if `OFFLINE ready!` is not visible yet, do not assume the app is safe for offline route navigation
- the first visit after a new deployment must happen online so the new service worker can install
- opening a brand-new Chrome tab directly to a route while already offline may still fail if the updated cache has not been installed yet
- guest mode and non-admin Google accounts are intentionally blocked when offline
- online sync resumes automatically after the network returns

What should work offline after preparation:
- opening the home screen
- entering review mode
- entering cached unit routes
- continuing to use the already signed-in admin session
- reading runtime vocab from the bundled dataset

What may still be limited offline:
- fresh Google sign-in
- leaderboard freshness
- any data that was never cached before the device went offline

## Data Commands

Normalize source data and rebuild transformed dataset:

```bash
npm run data:normalize
```

Sync local source/admin state into transformed runtime JSON:

```bash
npm run sync:local:admin-edits
```

Finalize that sync and clear remote Firestore overrides:

```bash
npm run sync:local:admin-edits:finalize
```

Sync transformed dataset to Firestore:

```bash
npm run sync:firestore:vocab
npm run sync:firestore:full-voca
```

Full regeneration + Firestore sync:

```bash
npm run data:refresh
```

Admin cleanup for the configured admin account:

```bash
npm run delete:heroyik:cognites
```

## Normalization Scripts

The current normalization pipeline includes:
- [normalize_kana_words_to_kanji.mjs](scripts/normalize_kana_words_to_kanji.mjs)
- [normalize_long_vocab_phrases.mjs](scripts/normalize_long_vocab_phrases.mjs)
- [normalize_onomatopoeia_pos.mjs](scripts/normalize_onomatopoeia_pos.mjs)
- [normalize_onomatopoeia_suru_forms.mjs](scripts/normalize_onomatopoeia_suru_forms.mjs)
- [disambiguate_duplicate_vocab_entries.mjs](scripts/disambiguate_duplicate_vocab_entries.mjs)
- [normalize_vocab_pipeline.mjs](scripts/normalize_vocab_pipeline.mjs)

Recent normalization themes:
- safe kana to kanji promotion
- overly long sentence-headword shortening
- onomatopoeia POS extraction
- `する`-form onomatopoeia normalization
- duplicate display disambiguation
- even 15-unit redistribution

## Firestore Collections

Main collections in active use:
- `users`
- `users/{uid}/manualCognites`
- `globalWordStats`
- `adminDeletedWords`
- `adminVocabOverrides`
- `vocabEntries`
- `fullVocaEntries`
- `datasetMeta`

## Deployment

GitHub Pages is deployed through [nextjs.yml](.github/workflows/nextjs.yml).

Workflow notes:
- uses `actions/checkout@v5`
- uses `actions/setup-node@v5`
- injects admin secret into both `KAMI_ADMIN_KEY` and `NEXT_PUBLIC_KAMI_ADMIN_KEY`
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` is enabled

Required GitHub secret:
- `KAMI_ADMIN_KEY`

## Testing

Build verification:

```bash
npm run build
```

Playwright:

```bash
npm test
npm run test:ui
```

Existing E2E coverage includes:
- version badge visibility
- unit page navigation
- deployed site smoke verification

## Version 3.0.3 Highlights

This release focuses on dataset cleanup and duplicate removal:
- duplicate and near-duplicate vocab groups were reviewed and one-sided deletions were applied
- source and runtime datasets were regenerated down to 886 entries
- duplicate and distractor review reports were refreshed
- Firestore mirrors were resynchronized to match the cleaned dataset
