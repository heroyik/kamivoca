import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccount = JSON.parse(
  readFileSync('./secrets/kamivoca-app-firebase-adminsdk-fbsvc-2e9e8b97be.json', 'utf8')
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

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
  console.log('Seeding globalWordStats...');
  const batch = db.batch();

  for (const stat of mockGlobalStats) {
    const docRef = db.collection('globalWordStats').doc(encodeURIComponent(stat.word));
    batch.set(docRef, {
      word: stat.word,
      failCount: stat.failCount,
      meaning: stat.meaning,
      book: stat.book,
      unitNum: stat.unitNum,
      updatedAt: new Date()
    });
  }

  await batch.commit();
  console.log('Successfully seeded 10 global word stats!');
}

seedGlobalStats().catch(console.error);
