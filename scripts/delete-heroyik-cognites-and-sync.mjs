#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { batchDelete, batchSet, listDocuments, lookupAuthUserByEmail, runCollectionQuery } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDatasetPath = resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");
const transformedDatasetPath = resolve(__dirname, "../src/data/vocab.json");
const adminEmail = (process.env.KAMI_ADMIN_KEY || process.env.NEXT_PUBLIC_KAMI_ADMIN_KEY || "").trim().toLowerCase();

if (!existsSync(rawDatasetPath)) {
  console.error(`Missing dataset file: ${rawDatasetPath}`);
  process.exit(1);
}

if (!adminEmail) {
  console.error("Missing KAMI_ADMIN_KEY (or NEXT_PUBLIC_KAMI_ADMIN_KEY) environment variable.");
  process.exit(1);
}

function normalizeWordKey(word = "") {
  return word
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function chunk(items, size) {
  const parts = [];
  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }
  return parts;
}

async function deleteDocs(refs) {
  return batchDelete(refs);
}

async function setAdminDeletedWords(wordKeys, removedEntries) {
  const entriesByWordKey = new Map();
  removedEntries.forEach((entry) => {
    const wordKey = normalizeWordKey(entry.word);
    if (!entriesByWordKey.has(wordKey)) {
      entriesByWordKey.set(wordKey, entry);
    }
  });

  let upserted = 0;
  for (const part of chunk(wordKeys, 400)) {
    await batchSet("adminDeletedWords", part.map((wordKey) => {
      const sample = entriesByWordKey.get(wordKey);
      return {
        id: wordKey,
        data: {
          word: sample?.word ?? null,
          wordKey,
          deletedByEmail: adminEmail,
          deletedByUid: null,
          source: "scripts/delete-heroyik-cognites-and-sync.mjs",
        },
      };
    }), { serverTimestampFields: ["deletedAt"] });
    upserted += part.length;
  }
  return upserted;
}

async function collectCollectionGroupRefs(wordKeys) {
  const users = await listDocuments("users");
  return users.flatMap((userDoc) =>
    wordKeys.map((wordKey) => `users/${userDoc.id}/manualCognites/${wordKey}`),
  );
}

async function main() {
  const { config } = getFirebaseWebConfig();
  console.log(`Initializing cleanup for ${adminEmail} -> ${config.projectId}`);

  const rawDataset = JSON.parse(readFileSync(rawDatasetPath, "utf8"));
  if (!Array.isArray(rawDataset)) {
    throw new Error("Raw dataset must be an array.");
  }

  const adminUser = await lookupAuthUserByEmail(adminEmail);
  if (!adminUser?.localId) {
    throw new Error(`Could not resolve Firebase Auth user for ${adminEmail}`);
  }

  const adminManualDocs = await listDocuments(`users/${adminUser.localId}/manualCognites`);

  const adminWordKeys = new Set(
    adminManualDocs.map((docSnap) => {
      return docSnap.wordKey || normalizeWordKey(docSnap.word || docSnap.id);
    }),
  );

  const legacyDocs = await runCollectionQuery("vocabEntries", "is_cognite", "EQUAL", "y");
  const legacyWordKeys = new Set(
    legacyDocs.map((docSnap) => {
      return normalizeWordKey(docSnap.word || "");
    }).filter(Boolean),
  );

  const deletedWordKeys = Array.from(new Set([...adminWordKeys, ...legacyWordKeys])).sort();
  if (deletedWordKeys.length === 0) {
    console.log("No admin manual cognites or legacy is_cognite=y entries found.");
    return;
  }

  const deleteWordKeySet = new Set(deletedWordKeys);
  const removedEntries = rawDataset.filter((entry) => deleteWordKeySet.has(normalizeWordKey(entry.word)));
  const keptEntries = rawDataset.filter((entry) => !deleteWordKeySet.has(normalizeWordKey(entry.word)));
  const removedEntryIds = Array.from(new Set(removedEntries.map((entry) => String(entry.id).trim()).filter(Boolean))).sort();

  console.log(`Deleting ${deletedWordKeys.length} word keys`);
  console.log(`Removing ${removedEntries.length} raw dataset entries`);
  console.log(`Admin manual cognite docs: ${adminManualDocs.length}`);
  console.log(`Legacy is_cognite docs: ${legacyDocs.length}`);

  writeFileSync(rawDatasetPath, `${JSON.stringify(keptEntries, null, 2)}\n`, "utf8");
  console.log(`Updated ${rawDatasetPath}`);

  const deletedManualCogniteRefs = await collectCollectionGroupRefs(deletedWordKeys);
  const manualCogniteDeleteCount = await deleteDocs(deletedManualCogniteRefs);

  const remoteRefs = [
    ...removedEntryIds.map((id) => `vocabEntries/${id}`),
    ...removedEntryIds.map((id) => `fullVocaEntries/${id}`),
    ...legacyDocs
      .map((docSnap) => docSnap.id)
      .filter((id) => !removedEntryIds.includes(id))
      .map((id) => `vocabEntries/${id}`),
  ];
  const remoteDeleteCount = await deleteDocs(remoteRefs);

  const adminDeletedCount = await setAdminDeletedWords(deletedWordKeys, removedEntries);

  const transformResult = spawnSync("node", ["scripts/transform_japanese_data.mjs"], {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
  });
  if (transformResult.status !== 0) {
    throw new Error("transform_japanese_data.mjs failed.");
  }

  if (!existsSync(transformedDatasetPath)) {
    throw new Error(`Transformed dataset missing: ${transformedDatasetPath}`);
  }

  const vocabSync = spawnSync("node", ["scripts/sync-firestore-vocab.mjs"], {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
  });
  if (vocabSync.status !== 0) {
    throw new Error("sync-firestore-vocab.mjs failed.");
  }

  const fullVocaSync = spawnSync("node", ["scripts/sync-full-voca.mjs"], {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
  });
  if (fullVocaSync.status !== 0) {
    throw new Error("sync-full-voca.mjs failed.");
  }

  console.log("");
  console.log("Cleanup summary");
  console.log(`- deleted word keys: ${deletedWordKeys.length}`);
  console.log(`- removed raw entries: ${removedEntries.length}`);
  console.log(`- deleted manualCognites docs: ${manualCogniteDeleteCount}`);
  console.log(`- deleted remote docs: ${remoteDeleteCount}`);
  console.log(`- upserted adminDeletedWords docs: ${adminDeletedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
