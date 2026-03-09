# 🇯🇵 KamiVoca (v1.0.0) - Advanced Japanese Vocabulary App

`Version 1.0.0`

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

1. **Quiz card sentence rendering removed**
   - Removed direct rendering of `sentences[0].japanese` and `sentences[0].furigana` in the quiz card area.
   - Removed contextual sentence box from the bottom feedback panel as well.
   - Result: noisy lines like `"A: それ、どう？"` no longer appear during quiz solving.
   - Affected file: `src/components/Quiz.tsx`

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

7. **Lint validation**
   - All touched TypeScript files were lint-checked after each fix cycle.
   - CSS lint warning for `globals.css` remains expected under current ESLint config (file not targeted), with no runtime impact.

8. **Persistent top header while scrolling**
   - Updated the top `KamiVoca` header behavior so it stays visible during vertical scroll.
   - Switched header positioning from sticky to fixed for more consistent behavior across mobile browsers.
   - Added top padding to the main content container to prevent overlap with the fixed header.
   - Affected files:
     - `src/app/globals.css`
     - `src/app/page.tsx`

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
