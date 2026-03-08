# 🇯🇵 KamiVoca (v1.0.0) - Advanced Japanese Vocabulary App

`Version 1.0.0`

---

KamiVoca (*Kotoba Prime*) is a premium, gamified Japanese learning platform inspired by modern educational apps like Duolingo, but built with a deep, traditional Japanese atmosphere. It is designed to help users achieve god-tier (神) mastery of Japanese vocabulary through an immersive, mobile-optimized journey and a real-time competitive leaderboard.

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

### 👥 Social & Engagement

- **Home (巡礼)**: Core learning path and Pilgrimage maps.
- **Leaderboard (ランキング)**: Weekly leagues (Bronze, Silver, Gold, Shogun) powered by a real-time XP scoring system.
- **Review (復習)**: Personal mistake lists and the global **TOP 20 Hardest Words** leaderboard.
- **Profile (マイページ)**: Tracks total XP, daily streaks (Sun/Fire icon), and traditional avatars (e.g., Samurai, Geisha, Shiba Inu).

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Client Components)
- **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
  - Real-time cloud sync with offline support and unified Google Login.
- **Design/Styling**: Vanilla CSS & Tailwind with the KamiVoca traditional palette.
- **Icons & Media**: [Lucide React](https://lucide.dev/) & optimized local assets.
- **Audio Engine**: Custom **WebAudio API** integrator for multi-browser compatibility.

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
¡Aprende japonés con KamiVoca! ✨🇯🇵
