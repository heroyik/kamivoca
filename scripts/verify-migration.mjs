import { getDocument, listDocuments } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

async function verify() {
  const { config } = getFirebaseWebConfig();
  console.log(`Verifying Firestore data -> ${config.projectId}...`);
  
  const collections = ['vocabEntries', 'fullVocaEntries', 'users', 'datasetMeta'];
  
  for (const collectionName of collections) {
    const documents = await listDocuments(collectionName);
    console.log(`Collection "${collectionName}": ${documents.length} documents found.`);
  }

  // Check specific metadata
  const metaVocab = await getDocument("datasetMeta/vocab");
  console.log('Metadata "vocab":', metaVocab || 'MISSING');

  const metaFullVoca = await getDocument("datasetMeta/fullVoca");
  console.log('Metadata "fullVoca":', metaFullVoca || 'MISSING');

  process.exit(0);
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
