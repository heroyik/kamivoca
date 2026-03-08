#!/usr/bin/env node
/**
 * scripts/wipe-firestore.mjs
 *
 * Wipes specific collections (globalWordStats, users) to initialize the database.
 * Run: node scripts/wipe-firestore.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const secretsEnvPath = resolve(__dirname, "../secrets/.env.local");

// Try to find .env.local in either root or secrets/
const targetEnvPath = existsSync(envPath) ? envPath : (existsSync(secretsEnvPath) ? secretsEnvPath : null);

if (!targetEnvPath) {
  console.error("❌ .env.local not found in root or secrets/ directory.");
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

async function wipeCollection(collectionName) {
  console.log(`  🗑  Wiping collection: ${collectionName}…`);
  const snap = await getDocs(collection(db, collectionName));
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  console.log(`     ✅ Deleted ${count} documents from ${collectionName}\n`);
}

async function main() {
  console.log(`\n🧹 Wiping Firestore → ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);

  await wipeCollection("globalWordStats");
  await wipeCollection("users");
  // If there's a 'vocabulary' collection, wipe it too (just in case)
  await wipeCollection("vocabulary");

  console.log("🎉 Firestore initialization (wipe) complete.\n");
  process.exit(0);
}

main().catch((e) => { 
  console.error("❌ Error:", e.message); 
  process.exit(1); 
});
