
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAfdvRTqrzkn3Lo9VLxfYb84orf8sQakoM",
  authDomain: "sporthet-40ca7.firebaseapp.com",
  projectId: "sporthet-40ca7",
  storageBucket: "sporthet-40ca7.firebasestorage.app",
  messagingSenderId: "470513674034",
  appId: "1:470513674034:web:90a32bde17237cfd89592b"
};

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

try {
  // Megpróbáljuk inicializálni a Firebase-t
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  
  // Csak akkor inicializáljuk a messaginget, ha böngészőben vagyunk
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
  
  console.log("Firebase initialized successfully");
} catch (error) {
  // Ha a konfiguráció hiányzik vagy hibás, a db null marad, de az app nem omlik össze
  console.error("Firebase initialization failed. Using local fallback data.", error);
}

export { db, auth, messaging };
