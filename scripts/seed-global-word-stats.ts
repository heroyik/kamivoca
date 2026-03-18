#!/usr/bin/env ts-node
/**
 * scripts/seed-global-word-stats.ts
 *
 * ONE-TIME seed script: writes the TOP 20 hardest Spanish words to
 * Firestore /globalWordStats/{encodedWord} with synthetic fail counts.
 *
 * Run ONCE:
 *   npx ts-node scripts/seed-global-word-stats.ts
 *
 * After running, archive or delete this script — never re-run.
 */

import { initializeApp } from "firebase/app";
import { getDoc, getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import * as path from "path";

// ── 20 hardest words (scored by length × 2 + accents × 3) ────────────────────
const SEED_WORDS: { word: string; meaning: string; seedCount: number }[] = [
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
  { word: "últimamente",       meaning: "최근에",                     seedCount: 9  },
  { word: "rápidamente",       meaning: "빨리",                       seedCount: 8  },
  { word: "actor/actriz",      meaning: "배우",                       seedCount: 7  },
  { word: "arquitecto/a",      meaning: "건축가",                     seedCount: 6  },
  { word: "extranjero/a",      meaning: "외국인",                     seedCount: 5  },
  { word: "supermercado",      meaning: "슈퍼마켓",                   seedCount: 4  },
  { word: "bienvenido/a",      meaning: "환영하는",                   seedCount: 3  },
  { word: "generalmente",      meaning: "일반적으로",                 seedCount: 2  },
  { word: "preocupado/a",      meaning: "걱정하는",                   seedCount: 1  },
];

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const envLines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const env: Record<string, string> = {};
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    env[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }

  initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const db = getFirestore();

  console.log("Seeding globalWordStats…");

  for (const entry of SEED_WORDS) {
    const docId = encodeURIComponent(entry.word);
    const ref = doc(db, "globalWordStats", docId);

    // Skip if document already exists to avoid double-seeding
    const snap = await getDoc(ref);
    if (snap.exists) {
      console.log(`  ⏭  SKIP  ${entry.word} (already seeded)`);
      continue;
    }

    await setDoc(ref, {
      word:       entry.word,
      meaning:    entry.meaning,
      seedCount:  entry.seedCount,
      failCount:  0,
      // totalCount is derived: seedCount + failCount — computed client-side
    });
    console.log(`  ✅ SEEDED  ${entry.word}  (seedCount=${entry.seedCount})`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
