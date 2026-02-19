
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfdvRTqrzkn3Lo9VLxfYb84orf8sQakoM",
  authDomain: "sporthet-40ca7.firebaseapp.com",
  projectId: "sporthet-40ca7",
  storageBucket: "sporthet-40ca7.firebasestorage.app",
  messagingSenderId: "470513674034",
  appId: "1:470513674034:web:90a32bde17237cfd89592b"
};

let db = null;

try {
  // Megpróbáljuk inicializálni a Firebase-t
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  // Ha a konfiguráció hiányzik vagy hibás, a db null marad, de az app nem omlik össze
  console.error("Firebase initialization failed. Using local fallback data.", error);
}

export { db };
