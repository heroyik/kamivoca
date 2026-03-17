#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(__dirname, "../secrets/kamivoca-app-firebase-adminsdk-fbsvc-2e9e8b97be.json");
const rawDatasetPath = resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");
const transformedDatasetPath = resolve(__dirname, "../src/data/vocab.json");
const adminEmail = (process.env.KAMI_ADMIN_KEY || process.env.NEXT_PUBLIC_KAMI_ADMIN_KEY || "").trim().toLowerCase();

if (!existsSync(serviceAccountPath)) {
  console.error(`Missing service account file: ${serviceAccountPath}`);
  process.exit(1);
}

if (!existsSync(rawDatasetPath)) {
  console.error(`Missing dataset file: ${rawDatasetPath}`);
  process.exit(1);
}

if (!adminEmail) {
  console.error("Missing KAMI_ADMIN_KEY (or NEXT_PUBLIC_KAMI_ADMIN_KEY) environment variable.");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

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
  let deleted = 0;
  for (const part of chunk(refs, 400)) {
    const batch = db.batch();
    part.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += part.length;
  }
  return deleted;
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
    const batch = db.batch();
    part.forEach((wordKey) => {
      const sample = entriesByWordKey.get(wordKey);
      batch.set(
        db.collection("adminDeletedWords").doc(wordKey),
        {
          word: sample?.word ?? null,
          wordKey,
          deletedByEmail: adminEmail,
          deletedByUid: null,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: "scripts/delete-heroyik-cognites-and-sync.mjs",
        },
        { merge: true },
      );
    });
    await batch.commit();
    upserted += part.length;
  }
  return upserted;
}

async function collectCollectionGroupRefs(wordKeys) {
  const userSnapshot = await db.collection("users").get();
  return userSnapshot.docs.flatMap((userDoc) =>
    wordKeys.map((wordKey) => db.collection("users").doc(userDoc.id).collection("manualCognites").doc(wordKey)),
  );
}

async function main() {
  console.log(`Initializing cleanup for ${adminEmail} -> ${serviceAccount.project_id}`);

  const rawDataset = JSON.parse(readFileSync(rawDatasetPath, "utf8"));
  if (!Array.isArray(rawDataset)) {
    throw new Error("Raw dataset must be an array.");
  }

  const adminUser = await auth.getUserByEmail(adminEmail);
  const adminManualSnapshot = await db.collection("users").doc(adminUser.uid).collection("manualCognites").get();

  const adminWordKeys = new Set(
    adminManualSnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return data.wordKey || normalizeWordKey(data.word || docSnap.id);
    }),
  );

  const legacySnapshot = await db.collection("vocabEntries").where("is_cognite", "==", "y").get();
  const legacyWordKeys = new Set(
    legacySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return normalizeWordKey(data.word || "");
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
  console.log(`Admin manual cognite docs: ${adminManualSnapshot.size}`);
  console.log(`Legacy is_cognite docs: ${legacySnapshot.size}`);

  writeFileSync(rawDatasetPath, `${JSON.stringify(keptEntries, null, 2)}\n`, "utf8");
  console.log(`Updated ${rawDatasetPath}`);

  const deletedManualCogniteRefs = await collectCollectionGroupRefs(deletedWordKeys);
  const manualCogniteDeleteCount = await deleteDocs(deletedManualCogniteRefs);

  const remoteRefs = [
    ...removedEntryIds.map((id) => db.collection("vocabEntries").doc(id)),
    ...removedEntryIds.map((id) => db.collection("fullVocaEntries").doc(id)),
    ...legacySnapshot.docs
      .map((docSnap) => docSnap.id)
      .filter((id) => !removedEntryIds.includes(id))
      .map((id) => db.collection("vocabEntries").doc(id)),
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
