import { batchSet } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

const mockGlobalStats = [
  { word: "読む", failCount: 156, meaning: "to read", book: "N5", unitNum: 1 },
  { word: "食べる", failCount: 142, meaning: "to eat", book: "N5", unitNum: 2 },
  { word: "行く", failCount: 128, meaning: "to go", book: "N5", unitNum: 1 },
  { word: "見る", failCount: 115, meaning: "to see", book: "N5", unitNum: 3 },
  { word: "来る", failCount: 102, meaning: "to come", book: "N5", unitNum: 4 },
  { word: "勉強", failCount: 98, meaning: "study", book: "N5", unitNum: 5 },
  { word: "仕事", failCount: 87, meaning: "work", book: "N5", unitNum: 2 },
  { word: "時間", failCount: 76, meaning: "time", book: "N5", unitNum: 3 },
  { word: "電話", failCount: 65, meaning: "telephone", book: "N5", unitNum: 4 },
  { word: "友達", failCount: 54, meaning: "friend", book: "N5", unitNum: 6 },
];

async function seedGlobalStats() {
  const { config } = getFirebaseWebConfig();
  console.log(`Seeding globalWordStats -> ${config.projectId}...`);

  await batchSet("globalWordStats", mockGlobalStats.map((stat) => ({
    id: encodeURIComponent(stat.word),
    data: {
      word: stat.word,
      failCount: stat.failCount,
      meaning: stat.meaning,
      book: stat.book,
      unitNum: stat.unitNum,
    },
  })), { serverTimestampFields: ["updatedAt"] });

  console.log('Successfully seeded 10 global word stats!');
}

seedGlobalStats().catch(console.error);
