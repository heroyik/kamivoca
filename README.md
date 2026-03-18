# KamiVoca v2.4.0

KamiVoca is a mobile-first Japanese vocabulary app built with Next.js and Firebase. It combines a 15-step progression map, quiz/review loops, global mistake tracking, and admin-side dataset curation for a Korean-speaking learner audience.

Current dataset state:
- source entries: `892`
- transformed app entries: `892`
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

## Version 2.4.0 Highlights

This release consolidates the recent admin and dataset tooling changes:
- admin-only `EDIT` tab replaced the old delete-only admin surface
- runtime vocab overrides now merge through context and affect quiz/review immediately
- source JSON can be synchronized from Firestore admin edits
- sync finalization can clear remote `adminVocabOverrides`
- source dataset is currently redistributed evenly across 15 units
- README has been updated to reflect the real architecture and operational flow
