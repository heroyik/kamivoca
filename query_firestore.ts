import { db } from './src/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

async function queryTop() {
  const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.log("No users found");
  } else {
    console.log("Top user:", snapshot.docs[0].data());
  }
}

queryTop();
