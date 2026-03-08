<!-- markdownlint-disable MD013 MD033 -->
# Kotoba Prime: Advanced Japanese Vocabulary App Strategy

This document outlines the detailed strategy for cloning the `KamiVoca` architecture to create a brand-new, hip, and highly traditional Japanese vocabulary learning app.

## 1. App Naming Proposal

The user requested a "hip English name" that conveys the meaning of "Advanced Japanese Vocabulary".

**Primary Recommendation:**

- **KamiVoca**: 'Kami' (神) implies god-tier or mastery level vocabulary.

**Alternative Hip Options:**

1. **Kotoba Prime**: (`Kotoba` = Words, `Prime` = Advanced/Top-tier)
2. **Nihongo Zenith**: Represents the absolute peak of Japanese learning.
3. **YabaKotoba**: 'Yabai' (やばい) is versatile Gen-Z slang for "insanely awesome/crazy".
4. **EguiVoca / SugeeVoca**: 'Egui' (えぐい) and 'Sugee' (すげー) are modern youth slang for "god-tier" or "mind-blowing" vocabulary mastery.

*(For the rest of this document, we will use **KamiVoca** as the working title).*

## 2. Overall Design Look & Feel (Duolingo-Inspired Traditional Japanese)

The entire design system of KamiVoca will be overhauled to reflect a deep, traditional Japanese atmosphere, while strictly adhering to the highly engaging, gamified UX/UI patterns popularized by **Duolingo**.

### Duolingo-Inspired UX/UI Mechanics

1. **The Pilgrimage Map (Vertical Progression)**:
   - Like Duolingo's path, users navigate a scrolling vertical map. Instead of a generic snake path, it will be a thematic "Pilgrimage Route" (e.g., Nakasendo trail).
   - Nodes represent levels, and completion changes the node from a greyed-out state to a vibrant, glowing icon.
2. **Bite-Sized Lessons & Progress Bars**:
   - Quizzes are short (approx. 10-20 questions per session). A prominent horizontal progress bar at the top of the quiz screen fills up smoothly with green as correct answers are submitted.
3. **Immediate, Loud Feedback**:
   - **Correct**: A satisfying, bright green feedback banner slides up from the bottom with a cheerful "Ding!" sound.
   - **Incorrect**: A distinct red/orange banner slides up with the correct answer clearly highlighted, accompanied by a low-pitched "Bloop!" sound and haptic vibration.
4. **Hearts/Lives System (Mistake Tracking)**:
   - Visualizing health using icons (e.g., 5 Origami cranes or Magatama beads) at the top of the screen during a quiz. Making a mistake depletes one, adding stakes to the learning process.
5. **Streaks & Daily Engagement**:
   - A prominent "Fire" or "Sun" icon in the header tracks the user's daily consecutive logins, rewarding consistency with intense visual celebrations when a streak is extended.
6. **Polished Micro-Animations**:
   - Buttons should "press down" visibly with CSS transforms, and characters/mascots should have slight idle bouncing animations to make the UI feel alive and playful.

### Color Palette

- **Primary Background**: Washi paper texture `#F6F4EB` (Subtle off-white with fiber textures).
- **Primary Accent**: **Ai-iro** (Traditional Indigo Blue) `#165E83` and **Kurenai** (Crimson Red) `#CB1B45` for buttons and highlights.
- **Success/Mastery**: **Matcha Green** `#B8D200` and **Gold Leaf (Kintsugi)** `#D4AF37`.

### Typography

- **Headers/Display**: Elegant Mincho or Brush-script fonts (e.g., `Shippori Mincho` or `Yuji Syuku` via Google Fonts) to mimic traditional calligraphy (Shodo).
- **Body/UI**: Clean, modern Gothic fonts for readability of complex Kanji (e.g., `Noto Sans JP`).

### Thematic UI Elements

- **Level Map (The Snake Path)**: Replaced with a **Pilgrimage Route**. The user starts at a coastal Torii gate, travels through a Bamboo Forest, a Zen Rock Garden, and finally ascends towards Mount Fuji at Level 15.
- **Mastery Badges**: Instead of the "Thumbs Up", use a blooming **Sakura (Cherry Blossom)** or a **Hanko (Traditional Red Seal)** marking "極" (Mastery).
- **Don't Know Button (No Lo Sé)**: Changed to "分かりません" (I don't know). The icon can be a closing traditional folding fan (Sensu) or a politely bowing character.
- **Mistake/Health**: Visualized as Magatama beads or Origami paper cranes.

---

## 3. Data & Progression Logic (The 15-Level System)

Unlike KamiVoca, which utilizes Book 1 and Book 2 selection, **Kotoba Prime** will use a single, unified progression track based on aggregating JSON files.

### 3.1. Data Aggregation

- **Source**: A dedicated folder named `voca_json/` will contain multiple `.json` files (e.g., `jlpt_n5.json`, `jlpt_n4.json`, `advanced_idioms.json`, etc.).
- **Process**: At build time or app initialization, the system will read **all** JSON files within `voca_json/` and flatten them into a single, massive array of vocabulary expressions.

### 3.2. Dynamic Difficulty Sorting (OPIc & JLPT Framework)

To create exactly 15 levels with accurate progression, the aggregated list of words will be sorted by cross-referencing established proficiency frameworks (JLPT and OPIc) rather than using naive character-based heuristics.

**Difficulty Heuristics based on Proficiency Data:**
The vocabulary will be divided into 3 primary stages, covering the 15 levels:

1. **Stage 1: Foundational (Levels 1 - 5)**
   - **Framework Alignment**: JLPT N5-N4 / OPIc Novice (Low-High).
   - **Vocabulary Type**: Basic personal information, daily activities, isolated words, immediate needs, and basic greetings.
   - **Characteristics**: High-frequency everyday words. Often written in Hiragana/Katakana or basic introductory Kanji.

2. **Stage 2: Communicative (Levels 6 - 10)**
   - **Framework Alignment**: JLPT N3 / OPIc Intermediate (Low-High).
   - **Vocabulary Type**: Survival situations, straightforward social interactions, travel, expressing personal meaning, and recombining learned concepts.
   - **Characteristics**: Common verbs, expressions for daily life, standard workplace/school terminology, and moderate Kanji use.

3. **Stage 3: Advanced & Academic (Levels 11 - 15)**
   - **Framework Alignment**: JLPT N2-N1 / OPIc Advanced (Low+).
   - **Vocabulary Type**: Formal conversations, academic reading, news, opinion pieces, abstract concepts, and connected discourse.
   - **Characteristics**: Complex Kanji, four-character idioms (Yojijukugo / 四字熟語), nuanced expressions, and specialized vocabulary.

**Scoring Implementation:**
Instead of guessing difficulty based on stroke count, the JSON data processing pipeline will score words by:

1. **Pre-tagged Metadata**: Utilizing explicit `jlpt_level` or `opic_level` tags in the source JSON files.
2. **Database Cross-Referencing**: If untagged, the system will match the expression against a standard JLPT N5-N1 frequency database during the build process to assign a scientifically accurate difficulty weight.

### 3.3. Level Partitioning

1. Once all words are sorted by their difficulty score from lowest to highest, divide the total count by 15.
2. Partition the array into 15 equal chunks:
   - **Level 1**: Absolute beginner expressions (Hiragana, Greetings).
   - **...**
   - **Level 15**: Highly advanced vocabulary, obscure Kanji, and N1+ expressions.
3. Users **must pass** sequential levels to unlock the next, ensuring a smooth difficulty curve. The settings toggle `"Unlock all levels"` (from KamiVoca Phase 3) can be retained for advanced users who want to jump straight to Level 15.

---

## 4. Advanced Quiz & Engagement Features (Adapted from KamiVoca)

### 4.1. Pos-Based Distractors

Similar to KamiVoca's distractor logic, Kotoba Prime will match Part of Speech (POS) for distractors.

- Verbs ending in `~u` (U-verbs) or `~ru` (Ru-verbs) will have other verbs as distractors.
- `Na-adjectives` will be distractors for other `Na-adjectives`.
- `I-adjectives` for `I-adjectives`.

### 4.2. Contextual Sentences (DELE to JLPT)

When a user gets a question right, instead of a simple "Correct!", present a contextual sentence.

- Example: `"遠慮"` -> `✅ 正解! (Correct!) 💬 "ご遠慮ください。" (Please refrain from doing so.)`

### 4.3. Social & Live Ranking

- Implement the **Global TOP 20 Hardest Words** leaderboard. Words that users frequently click "分かりません" (Don't Know) will rise to the top of the "Hardest Kotoba" list.
- Keep the floating rank notifications to encourage users to study continuously to maintain their Shogun/Samurai rank on the leaderboard.

---

## 5. App Sections (Tabs)

To provide a complete and engaging experience, the app will feature four primary tabs, accessible via a bottom navigation bar.

### 5.1. Home (巡礼 - Pilgrimage)

The core learning path where users spend most of their time.

- **Vertical Progression Map**: A gamified "Pilgrimage Route" (e.g., Nakasendo trail) with 15 distinct levels.
- **Node Status**: Nodes change appearance upon completion (e.g., from a grey Torii gate to a brightly lit one).
- **Start Quiz**: Tapping a node launches a bite-sized lesson (10-20 questions) with the progress bar, hearts system, and immediate feedback mechanics.

### 5.2. Leaderboard (ランキング - Rankings)

Builds a sense of community and competition, similar to Duolingo Leagues.

- **Weekly Leagues**: Users are grouped into leagues (Bronze, Silver, Gold, Shogun). Top XP earners promote, bottom earners demote each week.
- **XP Calculation**: Users earn XP by completing quizzes on the Home tab.
- **Live Leaderboard UI**: Displays the user's current rank, an avatar, and XP score. Dynamic slide-in notifications indicate rank changes.

### 5.3. Review (復習 - Fuku-shū)

Dedicated to spaced repetition and addressing weak points.

- **Personal Mistake Tracking**: Words marked incorrectly or via the "分かりません" (Don't Know) button accumulate here.
- **Review Weaknesses Quiz**: A dynamically generated quiz containing *only* words from the user's mistake list.
- **Global TOP 20 Hardest Words**: A real-time synchronized list showing the 20 words that all app users struggle with most, fostering a shared challenge.

### 5.4. Profile (マイページ - My Page)

Manages user identity, achievements, and app settings.

- **User Stats**: Displays total XP, current Streak (fire icon), and total levels mastered (Sakura badges).
- **Avatars**: Users can select from traditional Japanese avatars (e.g., Samurai, Ninja, Geisha, Shiba Inu).
- **Customization Settings**:
  - `Sound Effects (サウンド)`: Toggle UI feedback sounds.
  - `Haptics (バイブレーション)`: Toggle vibration feedback.
  - `Unlock All Levels (全レベル解放)`: For advanced users wanting to skip early levels.
  - `Hide Romaji/Furigana`: An advanced toggle for hardcore Kanji study.

---

## 6. Cross-Platform & Device Compatibility Requirement

Per project standards, the UI/UX must be strictly responsive and highly functional across all modern devices and viewports. There must be **no feature discrepancy** between devices.

**Target Validation Environments:**

- PC/Desktop: Windows (Chrome), macOS (Safari, Chrome)
- Mobile/Tablet: iOS (Safari), Android (Galaxy S25 Chrome target dimensions for mobile constraints)
- **Responsive Behavior**: The vertical map, bottom navigation, and modal dialogues must scale perfectly from mobile screens to large desktop monitors.

---

## 6. Authentication & Database Persistence (Firestore)

To ensure a seamless, cross-device experience, all user progress, settings, and social features will be persistently stored using **Firebase Authentication** and **Cloud Firestore**.

### 6.1. Google Login Integration

- **Auth Provider**: The app exclusively uses Google Sign-In via Firebase Auth (`signInWithPopup` / `signInWithRedirect`).
- **User Session**: Upon first login, the app creates a persistent user profile in the database.
- **Offline Support**: Firebase's built-in offline caching will be enabled so users can seamlessly study even during temporary network drops, syncing data back to the cloud when reconnected.

### 6.2. Firestore Data Schema

The database is structured to minimize read/write costs while keeping the UX highly responsive.

#### Collection: `users/{userId}` (Private User Data)

Stores all individual progress and settings. Data is restricted via Firestore Security Rules so only the authenticated `userId` can read/write.

- `xp` (number): Total XP used for leaderboard ranking.
- `gems` (number): Virtual currency for buying avatars/streak freezes.
- `streak` (number): Consecutive days studied.
- `lastStudyDate` (ISO string): Used to calculate streak continuation/resets.
- `completedLevels` (array of strings): IDs of levels the user has passed (e.g., `["level_1", "level_2"]`).
- `mistakes` (Map<string, number>): Dictionary tracking failed words and their fail counts (e.g., `{"遠慮": 3, "挨拶": 1}`).
- `settings` (Map): Preferences like `{"sound": true, "haptics": true, "hideRomaji": false}`.

#### Collection: `leaderboards/{leagueId}/users/{userId}` (Public Social Data)

For displaying the weekly / global rankings in the Leaderboard tab.

- `displayName` (string): Sourced from Google Auth.
- `photoURL` (string): Sourced from Google Auth or chosen app avatar.
- `weeklyXp` (number): Reset weekly. Used to sort users in the UI.

#### Collection: `globalStats/words` (Aggregated Public Data)

Powers the **Global TOP 20 Hardest Words** feature in the Review tab.

- **Schema**: Each document ID is the Spanish/Japanese expression itself (e.g., `globalStats/words/遠慮`).
- **Fields**:
  - `failCount` (number): Incrementally augmented across all users via `FieldValue.increment(1)` whenever *any* user misses the word.
- **Query Optimization**: The client queries `collection("globalStats/words").orderBy("failCount", "desc").limit(20)` to get the TOP 20 without downloading the entire dataset.

---

## 7. Technical Implementation Steps for the Clone

1. **Repository Setup**: Clone `kamivoca` into a new repository (e.g., `kotoba-prime`).
2. **Data Pipeline**: Replace the hardcoded `vocab.json` fetching with a dynamic script that reads `voca_json/*.json` and runs the OPIc/JLPT difficulty sorting algorithm.
3. **UI/UX Overhaul**:
   - Update `tailwind.config.ts` to include the new traditional Japanese color palette (`ai-iro`, `kurenai`, etc.).
   - Replace Spanish SVGs (flags, tacos) with Japanese SVGs (Torii, Sakura, Mount Fuji).
4. **Component Refactoring**: Remove all UI elements related to "Book 1 vs Book 2" volume selection. The home screen should jump directly into the 15-level Pilgrimage Map.
5. **Localization**: Replace all Spanish and Spanish-related UI strings with Japanese translations (e.g., "No Lo Sé" -> "分かりません").
6. **Firebase Integration**: Connect the new project to Firebase, configure the Auth/Firestore providers, and apply the Security Rules based on the schema above.
