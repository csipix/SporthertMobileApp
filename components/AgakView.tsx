
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getSportIcon } from './SajatView';
import { useBracketLayout, Match } from '../hooks/useBracketLayout';
import BracketViewport from './agak/BracketViewport';
import { useModalHistory } from '../hooks/useModalHistory';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

interface AgakViewProps {
  selectedClass: string;
  onClose: () => void;
  onImmersiveChange?: (isImmersive: boolean) => void;
}

const NEON_PALETTE = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#06b6d4", "#ef4444", 
  "#eab308", "#ec4899", "#6366f1", "#84cc16", "#14b8a6", "#f43f5e"
];

const AgakView: React.FC<AgakViewProps> = ({ selectedClass, onClose, onImmersiveChange }) => {
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Értesítjük az App-ot, ha immersive módba lépünk (választottunk sportot)
  useEffect(() => {
    onImmersiveChange?.(!!selectedSport);
  }, [selectedSport, onImmersiveChange]);

  useModalHistory(!!selectedSport, () => setSelectedSport(null));

  // 1. Sportágak listájának lekérése
  useEffect(() => {
    const q = query(collection(db, "matches"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSports: string[] = snapshot.docs.map(doc => doc.data().sport as string);
      setSports(Array.from(new Set(allSports)).sort());
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });
    return () => unsubscribe();
  }, []);

  // 2. Kiválasztott sportág meccseinek lekérése
  useEffect(() => {
    if (!selectedSport) {
      setMatches([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "matches"), where("sport", "==", selectedSport));
    return onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `matches?sport=${selectedSport}`);
    });
  }, [selectedSport]);

  // 3. Layout Engine futtatása
  const { nodes, edges, bounds } = useBracketLayout(matches);

  const currentSportColor = selectedSport 
    ? NEON_PALETTE[sports.indexOf(selectedSport) % NEON_PALETTE.length] 
    : "#ffffff";

  // Sportágválasztó menü
  if (!selectedSport) {
    return (
      <div className="animate-fadeIn px-5 pt-[72px] pb-[72px] h-full flex flex-col relative overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-t-blue-500 rounded-full animate-spin border-slate-200 dark:border-white/10"></div>
            <span className="font-black uppercase tracking-widest text-xs text-slate-400 dark:text-white/20">Sportágak betöltése...</span>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 w-full max-w-md mx-auto place-items-center py-8">
              {sports.map((sport, idx) => (
                <div 
                  key={sport} 
                  onClick={() => {
                    window.history.pushState({ modal: 'sport' }, '');
                    setSelectedSport(sport);
                  }} 
                  className="flex flex-col items-center cursor-pointer group w-full"
                >
                  <div 
                    className="aspect-square w-full max-w-[80px] sm:max-w-[90px] rounded-[2rem] border-2 flex items-center justify-center text-4xl sm:text-5xl transition-all active:scale-90 shadow-2xl bg-white dark:bg-[#16161d] border-slate-100 dark:border-white/5"
                    style={{ 
                      color: NEON_PALETTE[idx % NEON_PALETTE.length], 
                      borderColor: `${NEON_PALETTE[idx % NEON_PALETTE.length]}44` 
                    }}
                  >
                    <i className={`ph-fill ${getSportIcon(sport)}`}></i>
                  </div>
                  <span className="mt-2.5 text-[10px] font-black uppercase tracking-widest text-center line-clamp-1 w-full px-1 text-slate-500 dark:text-white/40">{sport}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ágrajz nézet
  return (
    <div className="relative w-full h-full overflow-hidden transition-colors duration-500 bg-slate-200 dark:bg-[#0d0d12]">
      {/* Header / Vissza gomb */}
      <div className="absolute top-4 left-4 z-[70] flex items-center pointer-events-none">
        <button 
          onClick={() => {
            if (selectedSport) {
              window.history.back();
            }
          }} 
          className="pointer-events-auto flex items-center gap-2 border backdrop-blur-2xl rounded-xl shadow-2xl px-3 h-10 active:scale-95 transition-all group bg-white/80 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
        >
          <i className="ph-bold ph-caret-left text-xl group-hover:-translate-x-1 transition-transform"></i>
          <div className="flex items-center gap-2 pr-1">
            <i className={`ph-fill ${getSportIcon(selectedSport)} text-xl`} style={{color: currentSportColor}}></i>
            <span className="text-[10px] font-black uppercase tracking-widest">{selectedSport}</span>
          </div>
        </button>
      </div>

      {/* Loading állapot ágrajz közben */}
      {loading && (
        <div className="absolute inset-0 z-[65] backdrop-blur-sm flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-[#0d0d12]/50">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-200 dark:border-white/10 border-t-slate-800 dark:border-t-white/80"></div>
        </div>
      )}

      {/* A Kamera Rendszer */}
      {bounds && (
        <BracketViewport 
          nodes={nodes} 
          edges={edges} 
          bounds={bounds} 
          color={currentSportColor} 
          selectedClass={selectedClass}
        />
      )}
    </div>
  );
};

export default AgakView;
