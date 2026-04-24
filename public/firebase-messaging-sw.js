importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Konfiguráció ugyanaz, mint a firebase.ts fájlban.
const firebaseConfig = {
  apiKey: "AIzaSyAfdvRTqrzkn3Lo9VLxfYb84orf8sQakoM",
  authDomain: "sporthet-40ca7.firebaseapp.com",
  projectId: "sporthet-40ca7",
  storageBucket: "sporthet-40ca7.firebasestorage.app",
  messagingSenderId: "470513674034",
  appId: "1:470513674034:web:90a32bde17237cfd89592b"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Ha a payload-ban van 'notification' objektum, az FCM beépített kódja
  // automatikusan megjeleníti az értesítést a háttérben.
  // Csak akkor kell manuálisan megjelenítenünk, ha adat (data) alapú push-t kapunk
  // notification objektum nélkül.
  if (payload.data && !payload.notification) {
    const notificationTitle = payload.data.title || 'Új értesítés';
    const notificationOptions = {
      body: payload.data.body,
      icon: '/pwa-192x192.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
