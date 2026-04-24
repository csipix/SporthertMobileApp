import { db, messaging } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'sporthet_device_id';
const VAPID_KEY = 'BM5g4sDXxRgB6kSMRAZ9XSfTnruyjb6oLRhbYK13acaP13ZcKh_R5PPdVdTKtbr1trGH110K-e1aMg32zmO_x-g';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export interface NotificationPrefs {
  classMatch: boolean;
  news: boolean;
  targetClasses: string[];
}

export const getNotificationPreferences = async (): Promise<NotificationPrefs | null> => {
  if (!db) return null;
  const deviceId = getDeviceId();
  
  try {
    const docRef = doc(db, 'device_notifications', deviceId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      let classes: string[] = [];
      if (Array.isArray(data.targetClasses)) {
        classes = data.targetClasses;
      } else if (data.targetClass) {
        classes = [data.targetClass];
      }
      return {
        classMatch: data.classMatch || false,
        news: data.news || false,
        targetClasses: classes,
      };
    }
    return null;
  } catch (error) {
    console.error('Lekérdezési hiba:', error);
    return null;
  }
};

export const saveNotificationPreferences = async (prefs: NotificationPrefs): Promise<boolean> => {
  if (!db) return false;
  const deviceId = getDeviceId();
  
  try {
    let fcmToken = '';
    
    if (messaging && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      } catch (e) {
        console.error('Hiba az FCM token lekérésekor:', e);
      }
    }
    
    const docRef = doc(db, 'device_notifications', deviceId);
    await setDoc(docRef, {
      ...prefs,
      fcmToken,
      updatedAt: serverTimestamp(),
      platform: navigator.platform,
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Mentési hiba:', error);
    return false;
  }
};

export const setupForegroundListener = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Előtérben kapott értesítés: ', payload);
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = payload.notification?.title || 'Új értesítés';
      const options = {
        body: payload.notification?.body,
        icon: '/pwa-192x192.png'
      };
      
      // Mobil böngészőkön (főleg Android Chrome) a sima `new Notification()` sokszor nem működik
      // ha az app előtérben van, ezért a Service Worker-t használjuk az értesítés megjelenítésére
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      }).catch(err => {
        console.error('Service worker notification hiba, fallback:', err);
        new Notification(title, options);
      });
    }
  });
};
