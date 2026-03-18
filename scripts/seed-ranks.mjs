import { batchSet } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

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
  const { config } = getFirebaseWebConfig();
  console.log(`Seeding ranks 2-10 -> ${config.projectId}...`);

  await batchSet("users", users.map(({ id, ...data }) => ({
    id,
    data: {
      ...data,
      email: `${id}@example.com`,
    },
  })), { serverTimestampFields: ["createdAt"] });

  console.log("Seeding completed successfully!");
}

seed().catch(console.error);
