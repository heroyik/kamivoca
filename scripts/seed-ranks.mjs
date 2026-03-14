import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccount = JSON.parse(
  readFileSync('/Users/ikyoon/proj/kamivoca/secrets/kamivoca-app-firebase-adminsdk-fbsvc-2e9e8b97be.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const users = [
  { id: 'seed-rank-2', displayName: 'Li Wei', xp: 2850, photoURL: '/images/avatars/li_wei.png', nationality: 'Chinese' },
  { id: 'seed-rank-3', displayName: 'Nguyen Minh', xp: 2620, photoURL: '/images/avatars/nguyen_minh.png', nationality: 'Vietnamese' },
  { id: 'seed-rank-4', displayName: 'James Smith', xp: 2410, photoURL: '/images/avatars/james_smith.png', nationality: 'American' },
  { id: 'seed-rank-5', displayName: 'Alejandro Diaz', xp: 2180, photoURL: '/images/avatars/alejandro_diaz.png', nationality: 'Spanish' },
  { id: 'seed-rank-6', displayName: 'Park Ji-won', xp: 1940, photoURL: '/images/avatars/park_ji_won.png', nationality: 'Korean' },
  { id: 'seed-rank-7', displayName: 'Zhang Wei', xp: 1720, photoURL: '/images/avatars/zhang_wei.png', nationality: 'Chinese' },
  { id: 'seed-rank-8', displayName: 'Tran Kim', xp: 1530, photoURL: '/images/avatars/tran_kim.png', nationality: 'Vietnamese' },
  { id: 'seed-rank-9', displayName: 'Emily Brown', xp: 1280, photoURL: '/images/avatars/emily_brown.png', nationality: 'American' },
  { id: 'seed-rank-10', displayName: 'Maria Garcia', xp: 1050, photoURL: null, nationality: 'Spanish' }
];

async function seed() {
  console.log("Seeding ranks 2-10...");
  const batch = db.batch();
  
  for (const user of users) {
    const { id, ...data } = user;
    const ref = db.collection('users').doc(id);
    batch.set(ref, {
      ...data,
      email: `${id}@example.com`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  console.log("Seeding completed successfully!");
}

seed().catch(console.error);
