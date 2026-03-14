import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('/Users/ikyoon/proj/kamivoca/secrets/kamivoca-app-firebase-adminsdk-fbsvc-2e9e8b97be.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const usersSnap = await db.collection('users').get();
  console.log(`Users count: ${usersSnap.size}`);
  usersSnap.docs.forEach(doc => {
    console.log(`- ${doc.id}: ${doc.data().displayName} (${doc.data().xp} XP)`);
  });

  const statsSnap = await db.collection('globalWordStats').get();
  console.log(`GlobalWordStats count: ${statsSnap.size}`);
}

check().catch(console.error);
