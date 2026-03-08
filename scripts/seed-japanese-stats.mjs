#!/usr/bin/env node
/**
 * scripts/seed-japanese-stats.mjs
 *
 * Seeds globalWordStats with top words from the new Japanese vocab.json.
 * Run: node scripts/seed-japanese-stats.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const secretsEnvPath = resolve(__dirname, "../secrets/.env.local");

const targetEnvPath = existsSync(envPath) ? envPath : (existsSync(secretsEnvPath) ? secretsEnvPath : null);

if (!targetEnvPath) {
  console.error("❌ .env.local not found.");
  process.exit(1);
}

const envLines = readFileSync(targetEnvPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const app = initializeApp({
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

async function main() {
  const vocabPath = resolve(__dirname, "../src/data/vocab.json");
  const vocabData = JSON.parse(readFileSync(vocabPath, "utf-8"));
  
  // Pick the first 20 words as initial "top failed" or just common words for the leaderboard
  const initialWords = vocabData.data.slice(0, 20);

  console.log(`\n🌱 Seeding globalWordStats → ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);

  for (let i = 0; i < initialWords.length; i++) {
    const entry = initialWords[i];
    const docId = encodeURIComponent(entry.word);
    
    // Give them some random seed counts to make the list look populated
    const seedCount = 100 - (i * 4) + Math.floor(Math.random() * 5);
    
    await setDoc(doc(db, "globalWordStats", docId), {
      word:      entry.word,
      meaning:   entry.meaning,
      seedCount: seedCount,
      failCount: 0,
    });
    
    console.log(`  ✅ #${String(i + 1).padStart(2)}  ${entry.word} (${entry.meaning}) - Seed: ${seedCount}`);
  }

  console.log("\n🎉 Seeding complete.\n");
  process.exit(0);
}

main().catch((e) => { 
  console.error("❌ Error:", e.message); 
  process.exit(1); 
});
