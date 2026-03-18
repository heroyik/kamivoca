#!/usr/bin/env node
/**
 * scripts/replace-global-word-stats.mjs
 *
 * Replaces all globalWordStats documents with the new TOP 20 word list.
 * Run: node scripts/replace-global-word-stats.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const { config } = getFirebaseWebConfig();
const app = initializeApp(config);
const db = getFirestore(app);

// Final approved TOP 20 (user-confirmed order)
const NEW_WORDS = [
  { word: "peligroso/a",  meaning: "위험한",              seedCount: 97 },
  { word: "traer",        meaning: "가지고 오다",          seedCount: 88 },
  { word: "lavarse",      meaning: "씻다",                 seedCount: 81 },
  { word: "peinarse",     meaning: "머리 빗다",            seedCount: 79 },
  { word: "despertarse",  meaning: "깨다",                 seedCount: 76 },
  { word: "tardar",       meaning: "(시간이) 걸리다",      seedCount: 65 },
  { word: "quitarse",     meaning: "벗다",                 seedCount: 64 },
  { word: "ponerse",      meaning: "입다",                 seedCount: 61 },
  { word: "sentarse",     meaning: "앉다",                 seedCount: 56 },
  { word: "demasiado",    meaning: "너무나",               seedCount: 54 },
  { word: "divertirse",   meaning: "즐기다",               seedCount: 53 },
  { word: "girar",        meaning: "돌다",                 seedCount: 51 },
  { word: "parar",        meaning: "멈추다",               seedCount: 49 },
  { word: "sentirse",     meaning: "~하다고 느끼다",       seedCount: 48 },
  { word: "hacia",        meaning: "~쪽으로",              seedCount: 43 },
  { word: "seguramente",  meaning: "아마도, 확실히",       seedCount: 40 },
  { word: "ganar",        meaning: "벌다, 이기다",         seedCount: 39 },
  { word: "enviar",       meaning: "부치다",               seedCount: 36 },
  { word: "querido/a",    meaning: "친애하는",             seedCount: 33 },
  { word: "diario/a",     meaning: "매일의",               seedCount: 31 },
];

async function main() {
  console.log(`\n🔄 Replacing globalWordStats → ${config.projectId}\n`);

  // 1. Delete all existing documents
  console.log("  🗑  Deleting existing documents…");
  const snap = await getDocs(collection(db, "globalWordStats"));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    console.log(`     ✕ deleted: ${decodeURIComponent(d.id)}`);
  }
  console.log();

  // 2. Write new documents
  console.log("  ✍️  Writing new TOP 20…\n");
  for (const entry of NEW_WORDS) {
    const docId = encodeURIComponent(entry.word);
    await setDoc(doc(db, "globalWordStats", docId), {
      word:      entry.word,
      meaning:   entry.meaning,
      seedCount: entry.seedCount,
      failCount: 0,
    });
    const rank = NEW_WORDS.indexOf(entry) + 1;
    console.log(`  ✅ #${String(rank).padStart(2)}  ${entry.word}  (${entry.seedCount})`);
  }

  console.log("\n🎉 Done — 20 words written\n");
  process.exit(0);
}

main().catch((e) => { console.error("❌", e.code ?? e.message); process.exit(1); });
