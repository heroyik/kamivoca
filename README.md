# 🇯🇵 KamiVoca (v2.1.0) - Advanced Japanese Vocabulary App

`Version 2.1.0`

---

KamiVoca is a premium, gamified Japanese learning platform inspired by modern educational apps like Duolingo, but built with a deep, traditional Japanese atmosphere. It is designed to help users achieve god-tier (神) mastery of Japanese vocabulary through an immersive, mobile-optimized journey and a real-time competitive leaderboard.

---

## ✨ Key Highlights

### ⛩️ Gamified "Pilgrimage Route" UI

A winding, interactive learning path that visually guides users through 15 difficulty-sorted stages based on JLPT (N5 to N1) and OPIc frameworks.

- **Thematic Progression**: Travel from a coastal Torii gate, through a Bamboo Forest and Zen Rock Garden, all the way to Mount Fuji at Level 15.
- **Satisfying Flow**: Nodes turn from grey to vibrant, glowing icons upon completion.
- **Mastery Badges**: Mastered units feature a blooming **Sakura (Cherry Blossom)** or a **Hanko (Traditional Red Seal)** inscribed with "極" (Mastery).

### 🎨 Traditional Japanese Aesthetics

- **Bespoke Palette**: Crafted with traditional hues like Washi paper (`#F6F4EB`), Ai-iro Indigo (`#165E83`), Kurenai Crimson (`#CB1B45`), Matcha Green (`#B8D200`), and Kintsugi Gold (`#D4AF37`).
- **Typography**: A blend of elegant Shodo-style Mincho headers and clean modern Gothic body text for readable Kanji.
- **High-Tension Japanese Audio**: Features native Japanese female voice-overs (Mizuki voice) converted to optimized MP3 format for superior web performance without quality loss.
- **Audio Feedback**: Distinct sounds and haptics for correct answers (Satisfying "Ding!") and errors (Distinct "Bloop!").

---

## 🚀 Core Mechanics

### 📚 Dynamic Difficulty Sorting

- **15-Level System**: Vocabulary is aggregated from discrete JSON files and scientifically sorted into exactly 15 levels.
  - **Stage 1 (Levels 1-5)**: N5-N4 / Novice
  - **Stage 2 (Levels 6-10)**: N3 / Intermediate
  - **Stage 3 (Levels 11-15)**: N2-N1 / Advanced
- **Strict Progression**: Users must pass sequential levels to advance, with exceptions available for advanced learners via the "Unlock All Levels" setting.

### 📝 Intelligent Quizzes

- **Contextual Learning**: Correct answers present contextual JLPT sentences (e.g., `"遠慮"` -> `✅ 正解! 💬 "ご遠慮ください。" (Please refrain from doing so.)`).
- **POS-based Distractors**: Meaningful distractors matched by Part of Speech (U-verbs with U-verbs, Na-adjectives with Na-adjectives).
- **Mistake Management ("分かりません")**: Dedicated "I don't know" action that funnels weak words to dynamic Re-Review sessions.

### ✅ Recent Updates (2026-03)

The following behavior changes were implemented to improve quiz quality, map visibility, and review consistency:

1. **Restructured Example Sentences with Ruby Furigana**
   - Re-introduced example sentences in a structured `example: string[]` format.
   - Implemented `FuriganaSentence` component in `Quiz.tsx` to automatically render `Text(Furigana)` patterns into standard HTML `<ruby>` tags.
   - Integrated these examples into the quiz feedback bar for contextual learning immediately after answering.
   - Removed the noisy previous `sentences` logic that occasionally showed unnatural dialogue markers.
   - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `src/components/Quiz.tsx`, `scripts/transform_japanese_data.mjs`

2. **Distractor logic hardened by POS-only grouping**
   - Choice generation now enforces same POS bucket for distractors instead of mixing fallback choices from any category.
   - Added `inferPOS(...)` to handle current dataset reality where many entries are tagged as `pos: "other"`.
   - `inferPOS(...)` flow:
     - use explicit POS tag if available (`noun/verb/adjective`)
     - else infer from Japanese surface endings (`する`, `れる`, `...う`, `...い`, `...しい`, etc.)
     - default fallback bucket is `noun`
   - Updated both quiz option generation and random-word helper to use `inferPOS`.
   - Affected files:
     - `src/utils/vocab.ts`
     - `src/components/Quiz.tsx`

3. **Map node icon visibility bug fixed**
   - Root cause: map icons used `next/image` with `fill`, but parent wrappers had no guaranteed dimensions in utility CSS, causing invisible icons.
   - Fix: switched node icons to fixed-size `Image` (`width`/`height`) for stable rendering.
   - Affected file: `src/app/page.tsx`

4. **Unit fail badge count now visibly rendered**
   - Added explicit text style class for the red circular fail badge (`.fail-badge-count`) so numbers always appear.
   - Replaced undefined legacy class usage (`vol-count`, `vol1-count`) with defined class.
   - Affected files:
     - `src/app/page.tsx`
     - `src/app/globals.css`

5. **Unit fail badge metric corrected**
   - Previous behavior counted only distinct failed words in the unit.
   - New behavior sums total mistake occurrences for words in the unit, so if failed/unknown count is 2, badge shows `2`.
   - Added normalized key lookup handling (`raw` and lowercase trimmed keys).
   - Affected file: `src/app/page.tsx`

6. **Wall of Pain data logic revalidated and aligned**
   - Global ranking now uses `failCount` only (actual global wrong/unknown accumulation), not `seedCount + failCount`.
   - Added normalized word-key matching for better map/join reliability between Firestore and local vocab metadata.
   - Session cache behavior changed:
     - cached data can render immediately
     - but fetch now always refreshes from Firestore when possible to avoid stale global rankings
   - `ReviewTab` now explicitly refreshes global stats when mistakes change, so newly failed words can surface in Wall of Pain without waiting for a new session.
   - Affected files:
     - `src/hooks/useGlobalTop20.ts`
     - `src/components/ReviewTab.tsx`

7. **Persistent top header while scrolling**
   - Updated the top `KamiVoca` header behavior so it stays visible during vertical scroll.
   - Switched header positioning from sticky to fixed for more consistent behavior across mobile browsers.
   - Added top padding to the main content container to prevent overlap with the fixed header.
   - Affected files:
     - `src/app/globals.css`
     - `src/app/page.tsx`

8. **Lint validation and Build Fixes**
    - All touched TypeScript files were lint-checked and verified.
    - Fixed a critical GitHub build error caused by ID type mismatches between the data and interfaces.

9. **Schema Cleanup and Optimization**
    - Removed unused keys: `cog_score`, `synonyms`, and `sentences` from `vocab.json` and `VocabEntry` interface.
    - These fields were identified as redundant or not utilized by the current application UI/logic, reducing the overall dataset size.
    - Simplified the `vocab.json` root structure by removing the redundant `totalWords` key (now dynamically calculated).
    - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `scripts/transform_japanese_data.mjs`

10. **ID Refactoring and Data Quality Enhancements**
    - Refactored all vocabulary IDs to zero-padded strings (e.g., `"0001"`, `"0002"`) to resolve TypeScript type mismatches and ensure stable lexicographical sorting.
    - This fix resolved a major GitHub build error where the data IDs (numeric) conflicted with the interface (string).
    - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `scripts/transform_japanese_data.mjs`

11. **Global Even Level Distribution & Playwright E2E Testing**
    - Refactored the 15-level distribution logic to be completely even globally (92-93 words per level) while maintaining JLPT (N5-N1) order.
    - Preserved the `opic` field in `vocab.json` for better cross-framework compatibility.
    - Integrated Playwright for comprehensive E2E testing, including custom mobile viewports for **Galaxy S25** and **iPhone 16 Pro**.
    - Verified furigana rendering in example sentences via automated web tests.
    - Affected files: `scripts/transform_japanese_data.mjs`, `src/data/vocab.json`, `playwright.config.ts`, `tests/vocab-levels.spec.ts`

12. **Dynamic Weather Effects & Date Display**
    - Integrated Open-Meteo API to fetch real-time weather, including **high/low temperature ranges**.
    - Implemented **Solar (Gregorian) and Lunar (Lunar/Chinese)** date display using native `Intl.DateTimeFormat`.
    - Added a performant Canvas-based particle system (`WeatherBackground.tsx`) to render dynamic effects like Rain, Snow, and Thunder.
    - Designed premium blurred-glass badges for a clean, non-intrusive UI in the pilgrimage background.
    - Verified mobile responsiveness and performance on **Galaxy S25** and **iPhone** viewports.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`, `src/app/layout.tsx`

13. **UI Version Fix**
    - Updated `APP_VERSION` string in `src/lib/constants.ts` to `2.0.0` to ensure the UI visually matches the package.json version update.
    - Affected files: `src/lib/constants.ts`

14. **Weather Display Refinement (Location & Positioning)**
    - Implemented real-time **Reverse Geocoding** using the BigDataCloud API to fetch and display the user's current city name.
    - Optimized weather widget positioning to `top: 210px`, ensuring zero overlap with celestial bodies (Sun/Moon) across all devices.
    - Specifically refined celestial visibility logic to show the **Sun and Moon even in cloudy weather**, preserving a premium visual experience.
    - Refined the **Daytime Background** with a more vibrant, deep blue gradient for better atmosphere.
    - Added English city name display in a new elegant blurred-glass chip.
    - Verified layout stability on a high-fidelity **Galaxy S25** simulation.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`, `README.md`, `src/lib/constants.ts`, `package.json`

15. **Test File Cleanup**
    - Removed all temporary test scripts and Playwright test files used during debugging to keep the repository clean.

### 👥 Social & Engagement

- **Home (巡礼)**: Core learning path and Pilgrimage maps.
- **Leaderboard (ランキング)**: Weekly leagues (Bronze, Silver, Gold, Shogun) powered by a real-time XP scoring system.
- **Review (復習)**: Personal mistake lists and the global **TOP 20 Hardest Words** leaderboard.
- **Profile (マイページ)**: Tracks total XP, daily streaks (Sun/Fire icon), and traditional avatars (e.g., Samurai, Geisha, Shiba Inu).

---

## 📊 Dataset Maintenance

To add or update vocabulary, modify the source JSON files and run the transformation script.

### JSON Schema (`src/data/vocab.json`)

The application consumes `src/data/vocab.json`, which is a transformed version of the integrated dataset. This file is also used to synchronize the Firestore `vocabEntries` collection.

---

### Running the Pipeline

After updating the data, run:

```bash
node scripts/transform_japanese_data.mjs
```

This will regenerate `src/data/vocab.json`. To sync this data to the cloud:

```bash
npm run sync:firestore:vocab
```

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Client Components)
- **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
  - Real-time cloud sync with offline support and unified Google Login.
- **Design/Styling**: Vanilla CSS & Tailwind with the KamiVoca traditional palette.
- **Icons & Media**: [Lucide React](https://lucide.dev/) & optimized local assets. All local assets (images, sounds) use `BASE_PATH` (configured via `NEXT_PUBLIC_BASE_PATH`) to ensure proper loading on sub-paths like GitHub Pages.
- **Audio Engine**: Custom **WebAudio API** integrator for multi-browser compatibility.
- **CI/CD Security**: GitHub Actions workflow is hardened using **GitHub Repository Secrets**. Hardcoded credentials are strictly prohibited in the codebase.

---

## 🔧 Setup & Local Development

### Prerequisites

- Node.js 18+
- A Google Firebase Project (for Auth & Firestore)

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Configure your Firebase credentials in `src/lib/firebase.ts`.
3. Start the development server:

   ```bash
   npm run dev
   ```

### 📱 Device Compatibility Target

KamiVoca strictly runs flawlessly across:

- **PC/Desktop**: Windows (Chrome), macOS (Safari, Chrome)
- **Mobile/Tablet**: iOS (Safari), Android (Targeting Galaxy S25 base resolution)

---

## 🔄 Multi-Device Development Workflow

To maintain consistency across multiple development environments, follow this strictly:

1. **README Update First**: Ensure any new features are documented in this `README.md` *before* syncing to GitHub.
2. **CP Git Strategy**: Commit using the standard `CP` message policy to automate syncs.
3. **No Virtual Environments Included**: `.venv` arrays MUST remain in `.gitignore`.
4. **Validation Check**: Run a final format and vulnerability scan prior to branching pushing.

---
---
KamiVocaで、神レベルの日本語を。✨🇯🇵
Enjoy your pilgrimage to mastery with KamiVoca!
