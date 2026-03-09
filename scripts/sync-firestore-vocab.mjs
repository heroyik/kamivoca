#!/usr/bin/env node
/**
 * scripts/sync-firestore-vocab.mjs
 *
 * Full sync of local dataset -> Firestore (Web SDK fallback).
 *
 * Source:
 * - src/data/vocab.json
 *
 * Target:
 * - collection: vocabEntries
 * - metadata doc: datasetMeta/vocab
 */

import crypto from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = resolve(__dirname, "../src/data/vocab.json");
const envPath = resolve(__dirname, "../secrets/.env.local");

// 1. Load Environment
if (!existsSync(envPath)) {
  console.error(`❌ Missing environment file: ${envPath}`);
  process.exit(1);
}

const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

// 2. Initialize Firebase
const firebaseConfig = {
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`\n🔄 Initializing sync via Web SDK -> ${firebaseConfig.projectId}`);

  // 3. Optional Auth (Required if rules specify authenticated access)
  // console.log("🔐 Authenticating anonymously...");
  // await signInAnonymously(auth);

  // 4. Load Local Data
  const raw = readFileSync(datasetPath, "utf-8");
  const localRaw = JSON.parse(raw);
  const local = localRaw.data;
  if (!Array.isArray(local)) throw new Error("Dataset 'data' field must be an array.");

  const localMap = new Map();
  for (const entry of local) {
    const id = String(entry.id).trim();
    if (!id) throw new Error("Found entry with empty id.");
    if (localMap.has(id)) throw new Error(`Duplicate id detected: ${id}`);
    localMap.set(id, entry);
  }

  console.log(`📦 Loaded local dataset (${localMap.size} entries)`);

  // 5. Fetch Remote State
  console.log("🔍 Fetching remote entries...");
  const vocabCol = collection(db, "vocabEntries");
  const remoteSnap = await getDocs(vocabCol);
  const remoteIds = new Set(remoteSnap.docs.map((d) => d.id));
  const localIds = new Set(localMap.keys());

  const upserts = [...localMap.entries()].map(([id, entry]) => ({ id, entry }));
  const deletes = [...remoteIds].filter((id) => !localIds.has(id));

  console.log(`🚀 Starting sync (Upserts: ${upserts.length}, Deletes: ${deletes.length})...`);

  // 6. Perform Upserts
  for (const part of chunk(upserts, 400)) {
    const batch = writeBatch(db);
    for (const { id, entry } of part) {
      const docRef = doc(db, "vocabEntries", id);
      batch.set(docRef, {
        ...entry,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    process.stdout.write(".");
  }

  // 7. Perform Deletes
  for (const part of chunk(deletes, 400)) {
    const batch = writeBatch(db);
    for (const id of part) {
      batch.delete(doc(db, "vocabEntries", id));
    }
    await batch.commit();
    process.stdout.write("x");
  }

  // 8. Update Metadata
  const datasetHash = crypto.createHash("sha256").update(raw).digest("hex");
  const metaRef = doc(db, "datasetMeta", "vocab");
  await setDoc(metaRef, {
    source: "src/data/vocab.json",
    collection: "vocabEntries",
    totalCount: localMap.size,
    hashSha256: datasetHash,
    syncedAt: serverTimestamp(),
  });

  console.log(`\n\n✅ Sync Summary:`);
  console.log(`   - Upserted: ${upserts.length}`);
  console.log(`   - Deleted:  ${deletes.length}`);
  console.log(`   - Metadata: datasetMeta/vocab updated`);
  console.log("\n🎉 Firestore sync completed.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ Sync failed:", e.code || e.message || e);
  process.exit(1);
});

