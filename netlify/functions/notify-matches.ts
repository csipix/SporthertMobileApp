import { schedule } from '@netlify/functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT env var nem található, próbálkozás default beállításokkal...");
      admin.initializeApp();
    }
  } catch (error) {
    console.error("Firebase admin inicializációs hiba:", error);
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export const handler = schedule("*/5 * * * *", async (event) => {
  console.log("Értesítés küldő funkció elindult...");
  
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK nincs inicializálva.");
    return { statusCode: 500 };
  }

  try {
    const now = new Date();
    // 15 percen belüli meccseket keresünk, és 5 percenként futunk
    const futureTime = new Date(now.getTime() + 15 * 60000); 
    
    // Kikeressük azokat a meccseket, amik a következő 15 percben kezdődnek és még nem küldtünk róluk értesítést.
    // Dátum formátum függ attól, hogy ISO stringként vagy Firestore Timestamp-ként mentjük.
    // Feltételezzük, hogy ISO string, a blueprint alapján.
    
    const matchesSnapshot = await db.collection("matches")
      .where("isFinished", "==", false)
      .get();
      
    if (matchesSnapshot.empty) {
      console.log("Nincs hamarosan kezdődő meccs, amiről nem ment ki értesítés.");
      return { statusCode: 200 };
    }

    const matchesToNotify = matchesSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (data.notificationSent) return false;
      if (!data.startTime) return false;
      
      const startTime = new Date(data.startTime);
      // Ha a kezdési idő a jelen és a jövőbeli 15 perc közé esik
      return startTime > now && startTime <= futureTime;
    });

    if (matchesToNotify.length === 0) {
      console.log("Nincs a következő 15 percben kezdődő meccs.");
      return { statusCode: 200 };
    }

    // Lekérjük az összes feliratkozót
    const devicesSnapshot = await db.collection("device_notifications")
      .where("classMatch", "==", true)
      .get();
      
    const devices = devicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const matchDoc of matchesToNotify) {
      const match = matchDoc.data();
      const teamA = match.teamA;
      const teamB = match.teamB;
      
      console.log(`Értesítés küldése: ${teamA} vs ${teamB}`);

      // Keressük meg a releváns tokeneket
      const tokens: string[] = [];
      for (const device of devices) {
        if (!device.fcmToken) continue;
        
        const targetClasses = device.targetClasses || [];
        if (targetClasses.includes(teamA) || targetClasses.includes(teamB)) {
          tokens.push(device.fcmToken);
        }
      }

      if (tokens.length > 0) {
        // FCM multi-cast maximum 500 token lehet egyszerre
        const payload = {
          notification: {
            title: `Hamarosan kezdődik: ${teamA} vs ${teamB}`,
            body: `Időpont: ${new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | Helyszín: ${match.location || 'Sportpálya'}`,
          },
          tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`${response.successCount} értesítés sikeresen elküldve, ${response.failureCount} hiba.`);
      } else {
        console.log("Senki sem követi ezeket az osztályokat, nincs kinek küldeni.");
      }

      // Megjelöljük a meccset, hogy már elküldtük az értesítést
      await matchDoc.ref.update({ notificationSent: true });
    }

    return { statusCode: 200, body: "Sikeres lefutás" };
  } catch (error) {
    console.error("Hiba történt a funkció futása során:", error);
    return { statusCode: 500, body: "Hiba" };
  }
});
