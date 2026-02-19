
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getSportRecommendations = async (userInterest: string) => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Adj 3 konkrét sportág javaslatot magyarul valakinek, akit ez érdekel: "${userInterest}". Válaszolj JSON formátumban.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["name", "description", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    // Csak a hibaüzenetet logoljuk, hogy elkerüljük a körkörös JSON hibát
    console.error("Gemini Error:", error?.message || "Ismeretlen hiba");
    return [];
  }
};

export const getHubInsights = async () => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Írj egy rövid, motiváló hírt vagy érdekességet a magyar sportvilágból (pl. Olimpia, foci, vízisportok). Legyen tömör és inspiráló.",
      config: {
        systemInstruction: "Te egy lelkes magyar sportújságíró vagy."
      }
    });
    return response.text || "Maradj aktív, a sport az életünk része!";
  } catch (error: any) {
    console.error("Gemini Error:", error?.message || "Ismeretlen hiba");
    return "A sport összeköt minket!";
  }
};
