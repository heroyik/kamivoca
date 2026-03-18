# Data Architecture

## Overview

KamiVoca has two vocab datasets on disk and two synced vocab collections in Firestore.
The app does not read Firestore `vocabEntries` as its primary quiz source during normal runtime.
Instead, it loads the transformed local dataset from `src/data/vocab.json` and then applies live Firestore overlays such as admin edits and global deletes.

Core model:

1. Source dataset: `voca_json/VOCA_word_furigana_separated.json`
2. Transformed runtime dataset: `src/data/vocab.json`
3. Runtime overlays from Firestore:
   - `adminDeletedWords`
   - `adminVocabOverrides`
   - `users/{uid}/manualCognites`
4. Firestore synced mirrors:
   - `vocabEntries`
   - `fullVocaEntries`

## Local Data Layers

### 1. Source Dataset

File:
- `voca_json/VOCA_word_furigana_separated.json`

Purpose:
- canonical editable source of the vocab inventory
- contains the most complete raw vocab entry objects
- used as input for dataset normalization scripts
- used as the source of truth for `fullVocaEntries` sync

Typical fields:
- `id`
- `word`
- `furigana`
- `meaning`
- `jlpt`
- `opic`
- `pos`
- `example`
- `synonyms`

Updated by:
- manual edits to the JSON
- normalization scripts under `scripts/normalize_*.mjs`
- `scripts/sync-admin-edits-to-local.mjs` when remote admin overrides are finalized back into local files

### 2. Runtime Dataset

File:
- `src/data/vocab.json`

Generated from:
- `voca_json/VOCA_word_furigana_separated.json`

Generator:
- `scripts/transform_japanese_data.mjs`

Purpose:
- optimized app-facing dataset
- used directly by the client bundle
- primary base dataset for quiz, review, home, and cognite flows

Shape:
- JSON object with a `data` array

The app imports this file directly here:
- `src/contexts/GamificationContext.tsx`
- `src/utils/vocab.ts`

## Runtime Data Resolution

### Base Runtime Source

`GamificationContext` imports `src/data/vocab.json` and treats `vocabData.data` as the base vocab array.

Relevant code:
- `src/contexts/GamificationContext.tsx`

Key variables:
- `baseVocabEntries`
- `baseVocabEntriesById`
- `vocabEntries`

### Final Runtime Dataset Used by the App

The final dataset exposed to the app is `vocabEntries`.

Construction:

1. Start with `baseVocabEntries` from `src/data/vocab.json`
2. Overlay per-entry patches from Firestore `adminVocabOverrides`
3. Filter deleted words using Firestore `adminDeletedWords`
4. Map user manual cognites from `users/{uid}/manualCognites`

This means the visible quiz data is:

`src/data/vocab.json + adminVocabOverrides - adminDeletedWords`

with user-specific cognite state layered on top.

### Components That Use `vocabEntries`

Main consumers:
- `src/app/page.tsx`
- `src/components/Quiz.tsx`
- `src/components/QuizLoader.tsx`
- `src/components/ReviewTab.tsx`
- `src/components/ReviewQuizLoader.tsx`
- `src/components/CogniteTab.tsx`
- `src/hooks/useGlobalTop20.ts`

Implication:
- if a vocab change is only pushed to Firestore `vocabEntries` but not reflected in local `src/data/vocab.json` or `adminVocabOverrides`, the app UI may not show that change
- the app UI follows context state, not Firestore mirror collections directly

## Firestore Collections

### `vocabEntries`

Purpose:
- Firestore mirror of the transformed runtime dataset
- synchronized from `src/data/vocab.json`

Source:
- `scripts/sync-firestore-vocab.mjs`

Metadata doc:
- `datasetMeta/vocab`

Notes:
- excludes entries whose normalized headword exists in `adminDeletedWords`
- updated in bulk via REST sync script
- not the direct source of quiz rendering in the browser

### `fullVocaEntries`

Purpose:
- Firestore mirror of the full source dataset
- synchronized from `voca_json/VOCA_word_furigana_separated.json`

Source:
- `scripts/sync-full-voca.mjs`

Metadata doc:
- `datasetMeta/fullVoca`

Notes:
- excludes entries whose normalized headword exists in `adminDeletedWords`
- intended as the full remote dataset counterpart to the local source JSON

### `adminDeletedWords`

Purpose:
- global delete registry keyed by normalized word form

Effects:
- hidden from app runtime
- excluded from sync scripts
- removed from `vocabEntries`
- removed from `fullVocaEntries`
- removed from all users' `manualCognites`

Key behavior:
- deletion is normalized by headword, not only by entry ID
- protects against a deleted word reappearing during later syncs

### `adminVocabOverrides`

Purpose:
- live runtime override layer for admins

Used for:
- `word`
- `furigana`
- `meaning`
- `level`
- `jlpt`
- `pos`
- `opic`
- `example`
- `synonyms`

Behavior:
- loaded by snapshot listener in `GamificationContext`
- merged over `src/data/vocab.json` at runtime
- can later be written back into local source files through `scripts/sync-admin-edits-to-local.mjs`

### `users/{uid}/manualCognites`

Purpose:
- per-user easy-word / cognite curation state

Storage key:
- normalized word key, not only entry ID

Why this matters:
- resilient to entry ID reshuffles
- still maps to updated entries after local normalization or admin overrides

### `datasetMeta`

Purpose:
- sync metadata for dataset mirrors

Current active docs:
- `datasetMeta/vocab`
- `datasetMeta/fullVoca`

Stored fields include:
- source file path
- collection name
- total count
- dataset hash
- `syncedAt`

## Sync Paths

### A. Source JSON -> Runtime JSON

Flow:

1. edit or normalize `voca_json/VOCA_word_furigana_separated.json`
2. run `scripts/transform_japanese_data.mjs`
3. regenerate `src/data/vocab.json`

This is the core local build pipeline.

### B. Runtime JSON -> Firestore Runtime Mirror

Flow:

1. source: `src/data/vocab.json`
2. script: `scripts/sync-firestore-vocab.mjs`
3. target: `vocabEntries`
4. metadata: `datasetMeta/vocab`

Notes:
- filters out `adminDeletedWords`
- upserts by `id`
- deletes remote entries no longer present locally

### C. Source JSON -> Firestore Full Mirror

Flow:

1. source: `voca_json/VOCA_word_furigana_separated.json`
2. script: `scripts/sync-full-voca.mjs`
3. target: `fullVocaEntries`
4. metadata: `datasetMeta/fullVoca`

### D. Firestore Admin Overrides -> Local Files

Flow:

1. source: `adminVocabOverrides`
2. source: `adminDeletedWords`
3. script: `scripts/sync-admin-edits-to-local.mjs`
4. apply changes into `voca_json/VOCA_word_furigana_separated.json`
5. rerun `scripts/transform_japanese_data.mjs`
6. update `src/data/vocab.json`
7. optional: clear remote `adminVocabOverrides`

This is the reconciliation path when browser-side admin edits need to become permanent source data.

## Admin Edit and Delete Behavior

### Edit Tab

Admin runtime edit UI:
- `src/components/AdminEditTab.tsx`

What it changes immediately:
- writes entry patches to `adminVocabOverrides`

What the user sees immediately:
- `GamificationContext` receives snapshot updates
- `vocabEntries` changes in memory
- quiz/review/home/cognite UI reflects the edits right away

What it does not do automatically:
- it does not directly rewrite local JSON files on disk
- it does not automatically rewrite `src/data/vocab.json`
- it does not automatically rewrite `voca_json/VOCA_word_furigana_separated.json`

For permanence:
- run `scripts/sync-admin-edits-to-local.mjs`

### Global Delete

Admin delete action records normalized word keys in `adminDeletedWords`.

Immediate effects:
- hidden from app runtime
- removed from Firestore mirror collections
- removed from users' manual cognites

Permanent local effect:
- if finalized locally, deleted entries are removed from source JSON during admin-to-local sync

## Normalization Pipeline

Primary orchestrator:
- `scripts/normalize_vocab_pipeline.mjs`

The pipeline currently includes:
- kana to kanji promotion
- long phrase shortening
- sentence-like headword normalization
- meaning correction for mismatched headwords
- onomatopoeia POS normalization
- `する`-form onomatopoeia normalization
- duplicate disambiguation
- runtime transform regeneration

Important distinction:
- normalization changes local files first
- sync scripts then push those local files to Firestore mirrors

## Effective Source of Truth by Use Case

### For quiz rendering right now

Source of truth:
- `src/data/vocab.json`
- plus `adminVocabOverrides`
- minus `adminDeletedWords`

### For long-term editable dataset ownership

Source of truth:
- `voca_json/VOCA_word_furigana_separated.json`

### For remote mirrored datasets

Source of truth:
- `src/data/vocab.json` for `vocabEntries`
- `voca_json/VOCA_word_furigana_separated.json` for `fullVocaEntries`

### For user-specific cognite state

Source of truth:
- `users/{uid}/manualCognites`

## Operational Rules

1. If you change source vocab locally, rerun `scripts/transform_japanese_data.mjs`.
2. If you want Firestore mirrors updated, rerun both sync scripts.
3. If you edit vocab from the admin UI and want that reflected in git-managed JSON files, run `scripts/sync-admin-edits-to-local.mjs`.
4. If a word is globally deleted, it must remain in `adminDeletedWords` or it can reappear from later syncs.
5. `vocabEntries` and `fullVocaEntries` are mirrors, not the only runtime authority.

## Important Files

Local datasets:
- `voca_json/VOCA_word_furigana_separated.json`
- `src/data/vocab.json`

Runtime logic:
- `src/contexts/GamificationContext.tsx`
- `src/utils/vocab.ts`

Admin UI:
- `src/components/AdminEditTab.tsx`

Sync scripts:
- `scripts/transform_japanese_data.mjs`
- `scripts/sync-firestore-vocab.mjs`
- `scripts/sync-full-voca.mjs`
- `scripts/sync-admin-edits-to-local.mjs`
- `scripts/normalize_vocab_pipeline.mjs`

Supporting docs:
- `README.md`

## Summary

The app's real-time vocab experience is built from local transformed data plus Firestore overlays.
The Firestore mirror collections are important for synchronization and external consistency, but the browser UI primarily follows `src/data/vocab.json` merged with `adminVocabOverrides` and filtered by `adminDeletedWords`.
For durable dataset maintenance, the canonical editable asset remains `voca_json/VOCA_word_furigana_separated.json`.
