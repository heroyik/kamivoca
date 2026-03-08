# 🇯🇵 KamiVoca (v1.0.0) - Japanese Vocabulary Learning App

`Version 2.1.0`

---

## 🆕 Latest Updates

### [v2.1.0] - 2026-02-28 — Mistake Highlighting & Automatic Mastering

- **Unit Mistake Review Flow**: Clickable red mistake badges on the map launch targeted sessions for previously incorrect words.
- **Mastery Redirection & Feedback**: Perfect reviews now trigger a "UNIT MASTERED! 🏆" celebratory screen with a "BACK TO MAP" button for seamless navigation.
- **Automatic Visual Mastery**: Successfully cleared units instantly transform into a **Thumbs Up (👍)** icon and unlock the subsequent level.
- **Next.js & React Stability**: Fixed `QuizLoader` pre-emption bugs and refined client-side redirection to ensure a smooth, flash-free mastery experience.
- **Vocabulary Refinement**: Added **"final"** to the easy cognates list to ensure it's prioritized for early learning and excluded from advanced quizzes.
- **Dictionary Expansion**: Added Spanish UI terms to the project's spellcheck configuration to maintain clean linting states.

### [v2.0.3] - 2026-02-27 — Admin Progression Preservation

- **Admin Cheat Logic Refinement**: Modified "Initialize" and "Unlock Level" cheat actions to preserve **Total XP**, **Gems**, and **Mistakes**. Only localized progress (unit completion, streaks, unit-specific stats) are now reset, ensuring global persistence is maintained even during admin operations.

### [v2.0.2] - 2026-02-27 — Admin Persistence & Sync Optimization

- **Persistent Admin Actions**: Fixed an issue where "Initialize Progress" and "Unlock to Level" cheat keys would fail to sync to the cloud.

### [v2.0.1] - 2026-02-27 — Mobile In-App Browser Compatibility

- **External Browser Redirection**: Implemented logic to detect unsupported mobile in-app browsers (KakaoTalk, Instagram, Facebook, Line) that block Google Login.
- **Auto-Launch Chrome/Safari**:
  - On **Android**, the app now automatically forces opening in Chrome via Android Intents.
  - On **iOS (KakaoTalk)**, it automatically triggers opening in Safari.
  - Provides guidance for other iOS IABs to ensure a seamless Google Login experience.

---

KamiVoca is a premium, gamified Japanese learning platform inspired by modern educational apps. It helps users master over 720+ Japanese words through a mobile-optimized **Snake Path** journey and a real-time competitive leaderboard.

### [v2.0.0] - 2026-02-25 — Official Release & Vocabulary Optimization

- **Official 2.0 Launch**: Transitioned from alpha to official release. All core systems (Audio, Sync, Gamification) are now finalized.
- **Static Vocabulary Partitioning**: Reorganized 721 unique words into 15 static units based on difficulty scoring. Unit 1 is always the easiest, and Unit 15 is the most challenging.
- **Volume-Specific Independent Filtering**:
  - Users can select Vol 1, Vol 2, or both.
  - Quizzes and mistake tracking now independently filter words based on selected volumes.
  - Ensures 100% coverage of selected volume words per unit.
- **Enhanced UI Feedback**:
  - **Thumbs Up Mastery**: Mastered units (0 mistakes remaining) now display a prominent 👍 icon.
  - **Dual-Volume Mistake Badges**: Unit nodes now show twin counters — **Vol 1 mistakes (top-right)** and **Vol 2 mistakes (top-left)** — for clear learning focus.
- **Safari Audio Compatibility**: Finalized migration to **WebAudio API**, ensuring perfectly synchronized sound across iOS/macOS Safari and Chrome.
- **Real-time Cloud Sync**: Replaced the 5-second throttled auto-sync with immediate, asynchronous Firestore writes. Settings and mistake deletions now persist instantly.
- **Developer Console Upgrades**: Added specialized tools for admin (`heroyik@gmail.com`) to manually manage profile metadata and initialize learning progression.

---

## ✨ Key Highlights

### 🕹️ Gamified "Snake Path" UI

A winding, interactive learning path that visually guides users through 15 difficulty-sorted units.

- **Motivational Stickers**: Every unit is labeled with engaging titles like "🌱 First Steps", "🌉 Bridge Builder", and "👑 Word Royalty".
- **Dynamic Connection**: Units are visually connected by a signature SVG "snake line" that adapts to your progress.
- **Mastery Glow**: Units completed with zero mistakes display a glowing gold animation to celebrate mastery.
- **START! Callout**: A pulsing animation ensures you always know which unit to tackle next.

### 📚 Premium Aesthetics

- **Visual Clarity**: Real-time count of total words prominently displayed in the header.
- **My Learning Aura ✨**: A dedicated XP tracking system relocated to the sticky footer for constant visibility.
- **Textbook Lightbox**: High-quality thumbnails of "¡Hola, español! 1 & 2" that can be zoomed for detailed viewing.

---

## 🚀 Core Features

- 🏠 **Unified Navigation**: Seamlessly switch between **Learn**, **Leader**, and **Profile** views using a responsive tab bar.
- 🏆 **Global Hall of Fame**: A real-time leaderboard showing the Top 10 users worldwide by XP. Optimized with error-safe loading states.
- 🔐 **Google Authentication**: One-tap sign-in to sync your streaks, gems, and progress across all devices.
- ☁️ **Cloud Synchronization**: Powered by **Firebase Firestore**, ensuring your "Learning Aura" follows you everywhere.
- 📝 **Intelligent Quizzes**: Includes Korean-to-Spanish, Spanish-to-Korean, and a specialized **Spanish Gender (el/la)** logic that handles complex gendered forms.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Client Components)
- **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
- **Styling**: Vanilla CSS with a bespoke premium design system.
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

---

## 🗺 Roadmap & Strategy

Check out our historical transition and future plans:

- [v2.0 Transition & Workflow Guide](file:///Users/ikyoon/proj/holavoca/strategy/v2.0_workflow.md)
- [v1.4.0 Upgrade Proposal (Archived)](file:///Users/ikyoon/proj/holavoca/strategy/upgrade_proposal.md)
- [v1.4.0 Test Automation Plan](file:///Users/ikyoon/proj/holavoca/strategy/testplan.md)

---

## 🔄 Multi-Device Development Workflow

To maintain consistency across multiple development environments (laptops), follow this dual-stream workflow:

### 1. Mandatory Pre-Push Checklist

Before syncing your local changes to GitHub, you **MUST** complete these steps:

1. **Update Versioning**: Ensure `package.json`, `constants.ts`, and `README.md` reflect the target version.
2. **Verify with Playwright**: Run `npx playwright test` to ensure no regressions.
3. **Audit .gitignore**: Ensure sensitive files (API keys, `.env.local`) are not tracked.

---
¡Aprende japonés con KamiVoca! ✨🇯🇵
