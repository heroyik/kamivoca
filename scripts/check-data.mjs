import { listDocuments } from "./lib/firestore-rest.mjs";
import { getFirebaseWebConfig } from "./lib/firebase-env.mjs";

async function check() {
  const { config } = getFirebaseWebConfig();
  console.log(`Checking Firestore data -> ${config.projectId}`);

  const users = await listDocuments("users");
  console.log(`Users count: ${users.length}`);
  users.forEach((doc) => {
    console.log(`- ${doc.id}: ${doc.displayName} (${doc.xp} XP)`);
  });

  const stats = await listDocuments("globalWordStats");
  console.log(`GlobalWordStats count: ${stats.length}`);
}

check().catch(console.error);
