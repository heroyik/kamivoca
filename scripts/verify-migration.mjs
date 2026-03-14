import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(__dirname, '../secrets/kamivoca-app-firebase-adminsdk-fbsvc-2e9e8b97be.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file not found');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verify() {
  console.log('Verifying Firestore data...');
  
  const collections = ['vocabEntries', 'fullVocaEntries', 'users', 'datasetMeta'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    console.log(`Collection "${collectionName}": ${snapshot.size} documents found.`);
  }

  // Check specific metadata
  const metaVocab = await db.collection('datasetMeta').doc('vocab').get();
  console.log('Metadata "vocab":', metaVocab.exists ? metaVocab.data() : 'MISSING');

  const metaFullVoca = await db.collection('datasetMeta').doc('fullVoca').get();
  console.log('Metadata "fullVoca":', metaFullVoca.exists ? metaFullVoca.data() : 'MISSING');

  process.exit(0);
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
