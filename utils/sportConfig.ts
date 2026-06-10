export const NEON_PALETTE = [
  "#22c55e", // 0: green (Foci)
  "#f97316", // 1: orange (Kosár)
  "#3b82f6", // 2: blue
  "#a855f7", // 3: purple
  "#06b6d4", // 4: cyan
  "#ef4444", // 5: red
  "#eab308", // 6: yellow
  "#ec4899", // 7: pink
  "#6366f1", // 8: indigo
  "#84cc16", // 9: lime
  "#14b8a6", // 10: teal
  "#f43f5e"  // 11: rose
];

// Helper to normalize strings for comparison
export const normalizeSport = (sport: string) => 
  sport.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const getSportIcon = (sport: string) => {
  if (!sport) return 'ph-trophy';
  const s = normalizeSport(sport);

  if (s.includes('foci') || s.includes('labdar') || s.includes('labtenisz')) return 'ph-soccer-ball';
  if (s.includes('kosar')) return 'ph-basketball';
  if (s.includes('rop') || s.includes('volleyball')) return 'ph-volleyball';
  if (s.includes('tenisz') && !s.includes('ping') && !s.includes('asztali')) return 'ph-tennis-ball';
  if (s.includes('ping') || s.includes('asztali')) return 'ph-ping-pong';
  if (s.includes('meta')) return 'ph-baseball';
  if (s.includes('usz') || s.includes('waves')) return 'ph-waves';
  if (s.includes('fut') || s.includes('atletika') || s.includes('sneaker')) return 'ph-sneaker-move';
  if (s.includes('bicikli') || s.includes('kerekpar')) return 'ph-bicycle';
  
  return 'ph-trophy';
};

// Generálunk egy stabil color map-et egy adott sportág listára
export const generateSportColorMap = (sports: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  const usedColorIndexes = new Set<number>();
  
  // 1. Kiosztjuk a dedikált színeket
  sports.forEach(sport => {
    const s = normalizeSport(sport);
    if (s.includes('foci') || s.includes('labdarugas')) {
      map[sport] = NEON_PALETTE[0]; // Zöld
      usedColorIndexes.add(0);
    } else if (s.includes('kosar')) {
      map[sport] = NEON_PALETTE[1]; // Narancs
      usedColorIndexes.add(1);
    }
  });
  
  // 2. Kiosztjuk a maradékot oly módon, hogy ne ismétlődjenek amíg van szabad szín
  let nextAvailableIndex = 0;
  
  sports.forEach(sport => {
    if (map[sport]) return; // Already assigned
    
    while (usedColorIndexes.has(nextAvailableIndex) && nextAvailableIndex < NEON_PALETTE.length) {
      nextAvailableIndex++;
    }
    
    if (nextAvailableIndex < NEON_PALETTE.length) {
      map[sport] = NEON_PALETTE[nextAvailableIndex];
      usedColorIndexes.add(nextAvailableIndex);
    } else {
      // Fallback if we run out of colors (unlikely unless there are > 12 sports)
      const hash = sport.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      map[sport] = NEON_PALETTE[hash % NEON_PALETTE.length];
    }
  });

  return map;
};
