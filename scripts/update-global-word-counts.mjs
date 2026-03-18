#!/usr/bin/env node
/**
 * scripts/update-global-word-counts.mjs
 *
 * Updates seedCount in globalWordStats to the new values.
 * Run: node scripts/update-global-word-counts.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const { config } = getFirebaseWebConfig();
const app = initializeApp(config);
const db = getFirestore(app);

// New seed counts: rank1=97, rank2=88, ... rank20=31
const UPDATED_WORDS = [
  { word: "llamar ~ / ~se",    seedCount: 97 },
  { word: "civilización",      seedCount: 88 },
  { word: "antipático/a",      seedCount: 81 },
  { word: "vegetariano/a",     seedCount: 79 },
  { word: "dependiente/a",     seedCount: 76 },
  { word: "aquel/aquella",     seedCount: 65 },
  { word: "probablemente",     seedCount: 64 },
  { word: "compañero/a",       seedCount: 61 },
  { word: "madrileño/a",       seedCount: 56 },
  { word: "histórico/a",       seedCount: 54 },
  { word: "simpático/a",       seedCount: 53 },
  { word: "últimamente",       seedCount: 51 },
  { word: "rápidamente",       seedCount: 49 },
  { word: "actor/actriz",      seedCount: 48 },
  { word: "arquitecto/a",      seedCount: 43 },
  { word: "extranjero/a",      seedCount: 40 },
  { word: "supermercado",      seedCount: 39 },
  { word: "bienvenido/a",      seedCount: 36 },
  { word: "generalmente",      seedCount: 33 },
  { word: "preocupado/a",      seedCount: 31 },
];

async function main() {
  console.log(`\n📝 Updating seedCounts → ${config.projectId}\n`);
  for (const entry of UPDATED_WORDS) {
    const docId = encodeURIComponent(entry.word);
    const ref = doc(db, "globalWordStats", docId);
    await updateDoc(ref, { seedCount: entry.seedCount });
    console.log(`  ✅  ${entry.word}  → seedCount=${entry.seedCount}`);
  }
  console.log("\n🎉 Done\n");
  process.exit(0);
}

main().catch((e) => { console.error("❌", e.code ?? e.message); process.exit(1); });
