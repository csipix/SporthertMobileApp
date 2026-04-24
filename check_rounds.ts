import { db } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }
  const snapshot = await getDocs(collection(db, 'matches'));
  const rounds = new Set();
  snapshot.docs.forEach(doc => {
    rounds.add(doc.data().round);
  });
  console.log("Rounds:", Array.from(rounds));
  process.exit(0);
}

run();
