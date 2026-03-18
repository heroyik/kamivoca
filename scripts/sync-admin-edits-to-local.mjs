#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { batchDelete, listDocuments } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fullDatasetPath = resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");
const transformScriptPath = resolve(__dirname, "./transform_japanese_data.mjs");
const shouldClearRemoteOverrides = process.argv.includes("--clear-remote-overrides");

const EDITABLE_FIELDS = ["word", "furigana", "meaning", "level", "jlpt", "pos", "opic", "example", "synonyms"];

function normalizeWordKey(word = "") {
  return word
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return undefined;
  return Array.from(
    new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function sanitizeOverride(data) {
  const patch = {};

  for (const field of EDITABLE_FIELDS) {
    if (!(field in data)) continue;

    if (field === "example" || field === "synonyms") {
      patch[field] = normalizeStringList(data[field]) ?? [];
      continue;
    }

    if (field === "level" && typeof data[field] === "number") {
      patch[field] = data[field];
      continue;
    }

    if (typeof data[field] === "string") {
      patch[field] = data[field].trim();
    }
  }

  return patch;
}

if (!existsSync(fullDatasetPath)) {
  console.error(`Missing source dataset file: ${fullDatasetPath}`);
  process.exit(1);
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const { config } = getFirebaseWebConfig();
  console.log(`Syncing admin edits -> local JSON (${config.projectId})`);
  if (shouldClearRemoteOverrides) {
    console.log("Remote override cleanup is enabled.");
  }

  const rawDataset = JSON.parse(readFileSync(fullDatasetPath, "utf8"));
  if (!Array.isArray(rawDataset)) {
    throw new Error("Expected voca_json/VOCA_word_furigana_separated.json to contain an array.");
  }

  const [overrideDocs, deletedDocs] = await Promise.all([
    listDocuments("adminVocabOverrides"),
    listDocuments("adminDeletedWords"),
  ]);

  const overrideMap = new Map(
    overrideDocs.map((docSnap) => [docSnap.id, sanitizeOverride(docSnap)]),
  );
  const deletedWordKeys = new Set(deletedDocs.map((docSnap) => docSnap.id));

  let appliedOverrideCount = 0;
  let missingOverrideCount = 0;

  const mergedDataset = rawDataset.map((entry) => {
    const override = overrideMap.get(String(entry.id).trim());
    if (!override) return entry;
    appliedOverrideCount += 1;
    return {
      ...entry,
      ...override,
      example: override.example ?? entry.example ?? [],
      synonyms: override.synonyms ?? entry.synonyms ?? [],
    };
  });

  overrideMap.forEach((_, entryId) => {
    if (!mergedDataset.some((entry) => String(entry.id).trim() === entryId)) {
      missingOverrideCount += 1;
      console.warn(`Override target not found in local dataset: ${entryId}`);
    }
  });

  const filteredDataset = mergedDataset.filter(
    (entry) => !deletedWordKeys.has(normalizeWordKey(entry.word)),
  );

  writeFileSync(fullDatasetPath, `${JSON.stringify(filteredDataset, null, 2)}\n`, "utf8");
  console.log(`Applied overrides: ${appliedOverrideCount}`);
  console.log(`Filtered deleted entries: ${mergedDataset.length - filteredDataset.length}`);
  console.log(`Missing override targets: ${missingOverrideCount}`);
  console.log(`Wrote ${filteredDataset.length} entries to ${fullDatasetPath}`);

  const transformResult = spawnSync("node", [transformScriptPath], {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
  });

  if (transformResult.status !== 0) {
    throw new Error("transform_japanese_data.mjs failed after syncing local admin edits.");
  }

  if (shouldClearRemoteOverrides && overrideDocs.length > 0) {
    await batchDelete(overrideDocs.map((docSnap) => `adminVocabOverrides/${docSnap.id}`));
    console.log(`Cleared remote adminVocabOverrides: ${overrideDocs.length}`);
  } else if (shouldClearRemoteOverrides) {
    console.log("Cleared remote adminVocabOverrides: 0");
  }

  console.log("Local source and transformed dataset are now in sync.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
