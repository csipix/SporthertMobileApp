import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'matches'));
  const rounds = new Set();
  snapshot.docs.forEach(doc => {
    rounds.add(doc.data().round);
  });
  console.log("Rounds:", Array.from(rounds));
  process.exit(0);
}

run();