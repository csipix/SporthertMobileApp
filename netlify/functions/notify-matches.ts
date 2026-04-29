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
    
    // Kiszámítjuk a jelenlegi időt Bukarest zónában, "YYYY-MM-DDTHH:mm:ss" formátumban
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    // Kicseréljük a szóközt T-re, hogy a JS parser biztosan egyetértsen
    const bucharestStr = formatter.format(now).replace(' ', 'T');
    
    // Ezzel egy olyan Date-et kapunk, ami az óramutatók állása szerint megegyezik a román idővel, mint UTC
    const localNow = new Date(bucharestStr + 'Z'); 
    const futureTime = new Date(localNow.getTime() + 15 * 60000); 
    
    console.log(`Jelenlegi román idő (UTC-ként interpretálva): ${localNow.toISOString()}`);
    
    const matchesSnapshot = await db.collection("matches")
      .where("isFinished", "==", false)
      .get();
      
    if (matchesSnapshot.empty) {
      console.log("Nincs hamarosan kezdődő meccs, amiről nem ment ki értesítés.");
      return { statusCode: 200 };
    }

    const matchesToNotify = matchesSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (!data.startTime) return false;
      
      // A startTime formátuma pl "2026-04-24T13:30". Ezt is úgy parse-oljuk, mint a lokális időt
      const startTimeStr = data.startTime.length === 16 ? data.startTime + ':00' : data.startTime;
      const startTime = new Date(startTimeStr + 'Z');
      
      console.log(`Ellenőrzés: Meccs (${data.teamA} vs ${data.teamB}): ${startTimeStr} -> Idő: ${startTime.toISOString()}`);
      
      // Ha a kezdési idő a jelen és a jövőbeli 15 perc közé esik
      return startTime > localNow && startTime <= futureTime;
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
      const matchId = matchDoc.id;
      
      const sentId = `${matchId}_${match.startTime}`;
      
      // Ellenőrizzük, hogy küldtünk-e már erről a meccsről értesítést (adott kezdési időponttal)
      const sentRef = db.collection('sent_notifications').doc(sentId);
      const sentSnap = await sentRef.get();
      if (sentSnap.exists) {
        console.log(`Már kiment az értesítés erről a meccsről (időpont: ${match.startTime}): ${matchId}`);
        continue;
      }

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
        // Kiszűrjük a duplikált tokeneket, hátha egy eszköz többször is regisztrálva van
        const uniqueTokens = [...new Set(tokens)];
        
        // FCM multi-cast maximum 500 token lehet egyszerre
        const payload: any = {
          notification: {
            title: `Hamarosan kezdődik: ${teamA} vs ${teamB}`,
            body: `Időpont: ${new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | Helyszín: ${match.location || 'Sportpálya'}`,
          },
          webpush: {
            notification: {
              icon: '/pwa-192x192.png',
              tag: `match-${matchId}-${Date.now()}` // Egyedi tag, hogy külön értesítésként jelenjenek meg
            },
            fcmOptions: {
              link: 'https://sporthet.netlify.app' // Vagy bármilyen URL, amire a felhasználó érkezzen kattintáskor
            }
          },
          tokens: uniqueTokens,
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`${response.successCount} értesítés sikeresen elküldve, ${response.failureCount} hiba.`);
      } else {
        console.log("Senki sem követi ezeket az osztályokat, nincs kinek küldeni.");
      }

      // Feljegyezzük az új táblába, hogy erről a meccsről kiment az értesítés (így nem kell a matches-t módosítani)
      await sentRef.set({ 
        sentAt: new Date().toISOString(),
        teamA, 
        teamB 
      });
    }

    return { statusCode: 200, body: "Sikeres lefutás" };
  } catch (error) {
    console.error("Hiba történt a funkció futása során:", error);
    return { statusCode: 500, body: "Hiba" };
  }
});
