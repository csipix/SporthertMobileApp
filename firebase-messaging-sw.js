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
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
