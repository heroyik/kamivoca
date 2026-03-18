import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, "../voca_json/VOCA_word_furigana_separated.json");

const REMOVED_ENTRY_IDS = new Set([
  "0173", // keep 0913 買い占め (名詞)
  "0279", // keep 0226 当てはまる
  "0387", // keep 0481 多々ある
  "0678", // keep 0982 恐縮する
  "0780", // keep 0253 爆買い
]);

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const nextDataset = dataset.filter((entry) => !REMOVED_ENTRY_IDS.has(entry.id));

const removedCount = dataset.length - nextDataset.length;

fs.writeFileSync(datasetPath, `${JSON.stringify(nextDataset, null, 2)}\n`, "utf8");

console.log(`Removed ${removedCount} duplicate/similar vocab entries.`);
