#!/usr/bin/env node
/**
 * scripts/seed-global-word-stats.mjs
 *
 * ONE-TIME seed script — no auth required (Firestore rules temporarily opened).
 * Run from project root: node scripts/seed-global-word-stats.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const { config } = getFirebaseWebConfig();
const app = initializeApp(config);
const db = getFirestore(app);

const SEED_WORDS = [
  { word: "llamar ~ / ~se",    meaning: "부르다 / ~의 이름이 ~이다",  seedCount: 20 },
  { word: "civilización",      meaning: "문명",                       seedCount: 19 },
  { word: "antipático/a",      meaning: "불친절한",                   seedCount: 18 },
  { word: "vegetariano/a",     meaning: "채식주의자",                 seedCount: 17 },
  { word: "dependiente/a",     meaning: "종업원",                     seedCount: 16 },
  { word: "aquel/aquella",     meaning: "저, 저것, 저 사람",          seedCount: 15 },
  { word: "probablemente",     meaning: "아마도",                     seedCount: 14 },
  { word: "compañero/a",       meaning: "동료, 학우",                 seedCount: 13 },
  { word: "madrileño/a",       meaning: "마드리드 사람",              seedCount: 12 },
  { word: "histórico/a",       meaning: "역사적인",                   seedCount: 11 },
  { word: "simpático/a",       meaning: "상냥한",                     seedCount: 10 },
  { word: "últimamente",       meaning: "최근에",                     seedCount:  9 },
  { word: "rápidamente",       meaning: "빨리",                       seedCount:  8 },
  { word: "actor/actriz",      meaning: "배우",                       seedCount:  7 },
  { word: "arquitecto/a",      meaning: "건축가",                     seedCount:  6 },
  { word: "extranjero/a",      meaning: "외국인",                     seedCount:  5 },
  { word: "supermercado",      meaning: "슈퍼마켓",                   seedCount:  4 },
  { word: "bienvenido/a",      meaning: "환영하는",                   seedCount:  3 },
  { word: "generalmente",      meaning: "일반적으로",                 seedCount:  2 },
  { word: "preocupado/a",      meaning: "걱정하는",                   seedCount:  1 },
];

async function main() {
  console.log(`\n🌱 Seeding globalWordStats → ${config.projectId}\n`);
  let seeded = 0, skipped = 0;

  for (const entry of SEED_WORDS) {
    const docId = encodeURIComponent(entry.word);
    const ref   = doc(db, "globalWordStats", docId);
    const snap  = await getDoc(ref);

    if (snap.exists()) {
      console.log(`  ⏭  SKIP    ${entry.word}`);
      skipped++;
      continue;
    }

    await setDoc(ref, {
      word:      entry.word,
      meaning:   entry.meaning,
      seedCount: entry.seedCount,
      failCount: 0,
    });
    const rank = 21 - entry.seedCount;
    console.log(`  ✅ #${String(rank).padStart(2)}  ${entry.word}  (seedCount=${entry.seedCount})`);
    seeded++;
  }

  console.log(`\n🎉 Done — seeded: ${seeded}, skipped: ${skipped}\n`);
  process.exit(0);
}

main().catch((e) => { console.error("❌", e.code ?? e.message); process.exit(1); });
