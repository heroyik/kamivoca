import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const steps = [
  "scripts/normalize_kana_words_to_kanji.mjs",
  "scripts/normalize_long_vocab_phrases.mjs",
  "scripts/normalize_sentence_like_vocab_words.mjs",
  "scripts/normalize_mismatched_meanings.mjs",
  "scripts/normalize_onomatopoeia_pos.mjs",
  "scripts/normalize_onomatopoeia_suru_forms.mjs",
  "scripts/disambiguate_duplicate_vocab_entries.mjs",
  "scripts/transform_japanese_data.mjs",
];

for (const step of steps) {
  console.log(`\n==> ${step}`);
  const result = spawnSync("node", [step], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nVocabulary normalization pipeline completed.");
