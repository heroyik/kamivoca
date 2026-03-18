#!/usr/bin/env node
/**
 * scripts/sync-firestore-vocab.mjs
 *
 * Full sync of local dataset -> Firestore (Firebase CLI OAuth).
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
import { batchDelete, batchSet, listDocuments, getDocument } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = resolve(__dirname, "../src/data/vocab.json");

function normalizeWordKey(word = "") {
  return word
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const { config } = getFirebaseWebConfig();
  console.log(`\n🔄 Initializing sync via Firebase CLI OAuth -> ${config.projectId}`);

  // 2. Load Local Data
  if (!existsSync(datasetPath)) {
    console.error(`❌ Missing dataset file: ${datasetPath}`);
    process.exit(1);
  }

  const raw = readFileSync(datasetPath, "utf-8");
  const localRaw = JSON.parse(raw);
  const local = localRaw.data;
  if (!Array.isArray(local)) throw new Error("Dataset 'data' field must be an array.");

  const deletedWordDocs = await listDocuments("adminDeletedWords");
  const deletedWordKeys = new Set(deletedWordDocs.map((docSnap) => docSnap.id));
  const filteredLocal = local.filter((entry) => !deletedWordKeys.has(normalizeWordKey(entry.word)));

  const localMap = new Map();
  for (const entry of filteredLocal) {
    const id = String(entry.id).trim();
    if (!id) throw new Error("Found entry with empty id.");
    if (localMap.has(id)) throw new Error(`Duplicate id detected: ${id}`);
    localMap.set(id, entry);
  }

  console.log(`📦 Loaded local dataset (${local.length} entries)`);
  console.log(`🧹 Excluding ${local.length - filteredLocal.length} admin-deleted entries`);

  // 3. Fetch Remote State
  console.log("🔍 Fetching remote entries...");
  const remoteDocs = await listDocuments("vocabEntries");
  const remoteIds = new Set(remoteDocs.map((doc) => doc.id));
  const localIds = new Set(localMap.keys());

  const upserts = [...localMap.entries()].map(([id, entry]) => ({ id, entry }));
  const deletes = [...remoteIds].filter((id) => !localIds.has(id));

  console.log(`🚀 Starting sync (Upserts: ${upserts.length}, Deletes: ${deletes.length})...`);

  // 4. Perform Upserts
  let count = 0;
  for (const part of chunk(upserts, 400)) {
    await batchSet("vocabEntries", part.map(({ id, entry }) => ({ id, data: entry })), {
      serverTimestampFields: ["updatedAt"],
    });
    count += part.length;
    process.stdout.write(`\r   Upserting... ${count}/${upserts.length}`);
  }
  process.stdout.write("\n");

  // 5. Perform Deletes
  let delCount = 0;
  for (const part of chunk(deletes, 400)) {
    await batchDelete(part.map((id) => `vocabEntries/${id}`));
    delCount += part.length;
    process.stdout.write(`\r   Deleting... ${delCount}/${deletes.length}`);
  }
  process.stdout.write("\n");

  // 6. Update Metadata
  const datasetHash = crypto.createHash("sha256").update(raw).digest("hex");
  await batchSet("datasetMeta", [{
    id: "vocab",
    data: {
      source: "src/data/vocab.json",
      collection: "vocabEntries",
      totalCount: localMap.size,
      hashSha256: datasetHash,
    },
  }], { serverTimestampFields: ["syncedAt"] });

  console.log(`\n✅ Sync Summary:`);
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
