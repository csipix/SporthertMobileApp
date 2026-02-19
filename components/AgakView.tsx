
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getSportIcon } from './SajatView';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ROUND_NAME_FINAL = "Döntő";
const ROUND_NAME_BRONZE = "Bronzmérkőzés";

interface Match {
  id: string;
  sport: string;
  round: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  nextMatchId?: string;
  isFinished: boolean;
  level?: number;
  localSlotIndex?: number;
}

interface AgakViewProps {
  isDarkMode: boolean;
}

const NEON_PALETTE = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#06b6d4", "#ef4444", 
  "#eab308", "#ec4899", "#6366f1", "#84cc16", "#14b8a6", "#f43f5e"
];

const AgakView: React.FC<AgakViewProps> = ({ isDarkMode }) => {
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  
  const transformWrapperRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "matches"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSports: string[] = snapshot.docs.map(doc => doc.data().sport as string);
      setSports(Array.from(new Set(allSports)).sort());
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSport) return;
    setLoading(true);
    const q = query(collection(db, "matches"), where("sport", "==", selectedSport));
    return onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
      setLoading(false);
    });
  }, [selectedSport]);

  const bracketData = useMemo(() => {
    if (matches.length === 0) return null;
    const final = matches.find(m => m.round === ROUND_NAME_FINAL);
    if (!final) return null;

    const bronze = matches.find(m => 
      m.round === ROUND_NAME_BRONZE || 
      m.round.toLowerCase().includes('bronz') ||
      m.round === "Bronzmeccs"
    );

    const getDepth = (mId: string): number => {
      const parents = matches.filter(m => m.nextMatchId === mId);
      if (parents.length === 0) return 1;
      return 1 + Math.max(...parents.map(p => getDepth(p.id)));
    };

    const maxDepth = getDepth(final.id);
    const finalParents = matches.filter(m => m.nextMatchId === final.id);
    
    const buildSide = (rootId: string) => {
      const sideMatches: Match[] = [];
      const mapNodes = (mId: string, level: number, indexInLevel: number) => {
        const match = matches.find(m => m.id === mId);
        if (!match) return;
        sideMatches.push({ ...match, level, localSlotIndex: indexInLevel });
        const parents = matches.filter(m => m.nextMatchId === mId);
        if (parents.length > 0) mapNodes(parents[0].id, level + 1, indexInLevel * 2);
        if (parents.length > 1) mapNodes(parents[1].id, level + 1, indexInLevel * 2 + 1);
      };
      if (rootId) mapNodes(rootId, 1, 0);
      
      const cols: Match[][] = Array.from({ length: maxDepth }, () => []);
      sideMatches.forEach(m => {
        if (m.level !== undefined) cols[m.level].push(m);
      });
      return cols.filter(c => c.length > 0).reverse();
    };

    return {
      left: finalParents[0] ? buildSide(finalParents[0].id) : [],
      final: { ...final, level: 0, localSlotIndex: 0 },
      bronze,
      right: finalParents[1] ? buildSide(finalParents[1].id) : [],
      maxDepth,
      finalParents
    };
  }, [matches]);

  // VÁLASZTÓ NÉZET
  if (!selectedSport) {
    return (
      <div className="animate-fadeIn p-6 space-y-8 pb-24 h-full overflow-y-auto no-scrollbar bg-[#0d0d12]">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Ágrajz Választó</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {sports.map((sport, idx) => (
            <div key={sport} onClick={() => setSelectedSport(sport)} className="flex flex-col items-center cursor-pointer group">
              <div className="w-24 h-24 rounded-[2.5rem] border-2 flex items-center justify-center text-5xl transition-all group-active:scale-90 bg-[#16161d] border-white/5 shadow-2xl"
                   style={{ color: NEON_PALETTE[idx % NEON_PALETTE.length], borderColor: `${NEON_PALETTE[idx % NEON_PALETTE.length]}44` }}>
                <i className={`ph-fill ${getSportIcon(sport)}`}></i>
              </div>
              <span className="mt-4 text-xs font-black uppercase tracking-widest text-white/50 text-center">{sport}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // LOADER NÉZET - Kiemelve a TransformWrapper elé a stabilitásért
  if (loading || !bracketData) {
    return (
      <div className="fixed inset-0 z-[65] bg-[#0d0d12] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white/80 rounded-full animate-spin"></div>
        <span className="text-white/20 font-black uppercase tracking-widest text-sm">Ágrajz összeállítása...</span>
      </div>
    );
  }

  // LOGIKA: Meglévő layout konstansok
  const VERTICAL_UNIT = 180; 
  const CARD_WIDTH = 220;
  const COLUMN_GAP = 80;
  const maxLeafNodes = Math.pow(2, bracketData.maxDepth - 1);
  const totalBracketHeight = maxLeafNodes * VERTICAL_UNIT;
  
  const totalCols = (bracketData.left.length + 1 + bracketData.right.length);
  const totalBracketWidth = (totalCols * CARD_WIDTH) + ((totalCols - 1) * COLUMN_GAP);

  const initialScale = Math.max(0.2, Math.min((window.innerWidth - 40) / totalBracketWidth, 0.8));
  const minScale = initialScale * 0.7;
  const currentSportColor = NEON_PALETTE[sports.indexOf(selectedSport!) % NEON_PALETTE.length];

  const calculateFinalY = () => {
    if (bracketData.finalParents.length === 0) return totalBracketHeight / 2;
    const semifinalRoundLevel = 1;
    const numSlotsInSemifinal = Math.pow(2, semifinalRoundLevel);
    const semifinalSlotHeight = totalBracketHeight / numSlotsInSemifinal;

    const parentYPositions = bracketData.finalParents.map(parent => {
      const matchInTree = [...bracketData.left.flat(), ...bracketData.right.flat()].find(m => m.id === parent.id);
      const slotIdx = matchInTree?.localSlotIndex || 0;
      return (slotIdx + 0.5) * semifinalSlotHeight;
    });

    if (parentYPositions.length === 1) return parentYPositions[0];
    return (parentYPositions[0] + parentYPositions[1]) / 2;
  };

  const finalY = calculateFinalY();

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-[60] bg-[#0d0d12] overflow-hidden select-none">
      
      {/* HUD - Floating UI elements */}
      <div className="absolute top-4 left-4 z-[70] flex items-center pointer-events-none">
        <button 
          onClick={() => setSelectedSport(null)} 
          className="pointer-events-auto flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-2xl rounded-xl shadow-2xl px-3 h-10 text-white active:scale-95 transition-all group"
        >
          <i className="ph-bold ph-caret-left text-xl group-hover:-translate-x-1 transition-transform"></i>
          <div className="flex items-center gap-2 pr-1">
            <i className={`ph-fill ${getSportIcon(selectedSport)} text-xl`} style={{color: currentSportColor}}></i>
            <span className="text-[10px] font-black uppercase tracking-widest">{selectedSport}</span>
          </div>
        </button>
      </div>

      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={initialScale}
        minScale={minScale}
        maxScale={2.5}
        centerOnInit={true}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: false }}
        pinch={{ step: 1 }}
        alignmentAnimation={{ disabled: false, sizeX: 0, sizeY: 0 }}
      >
        {({ resetTransform }) => (
          <>
            {/* Action Buttons Floating */}
            <div className="absolute bottom-24 right-4 z-[70] flex flex-col gap-3 pointer-events-none">
                <button 
                  onClick={() => resetTransform()}
                  className="pointer-events-auto w-12 h-12 bg-white/10 border border-white/10 backdrop-blur-2xl rounded-full text-white flex items-center justify-center text-xl shadow-2xl active:scale-90 transition-all"
                >
                  <i className="ph-bold ph-frame-corners"></i>
                </button>
            </div>

            <TransformComponent 
                wrapperClass="!w-screen !h-[100dvh]" 
                contentClass="!w-auto !h-auto flex items-center justify-center"
            >
              <div 
                className="relative bg-transparent flex items-center justify-center" 
                style={{ 
                    width: totalBracketWidth, 
                    height: totalBracketHeight,
                    touchAction: 'none' 
                }}
              >
                <div className="flex items-start pointer-events-none relative h-full" 
                     style={{ gap: COLUMN_GAP }}>
                  
                  {/* LEFT BRANCHES */}
                  {bracketData.left.map((column, colIdx) => {
                    const roundLevel = (bracketData.maxDepth - 1) - colIdx;
                    const numSlots = Math.pow(2, roundLevel);
                    const slotHeight = totalBracketHeight / numSlots;

                    return (
                      <div key={`left-${colIdx}`} className="relative h-full" style={{ width: CARD_WIDTH }}>
                        {Array.from({ length: numSlots }).map((_, i) => {
                          const match = column.find(m => m.localSlotIndex === i);
                          return (
                            <div 
                              key={i} 
                              className="absolute left-0 flex items-center justify-center w-full" 
                              style={{ height: slotHeight, top: i * slotHeight }}
                            >
                              {match && <BracketMatchCard match={match} color={currentSportColor} isDarkMode={isDarkMode} />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* CENTER COLUMN (FINAL & BRONZE) */}
                  <div className="relative h-full" style={{ width: CARD_WIDTH + 40 }}>
                    <div 
                      className="absolute left-0 w-full flex flex-col items-center"
                      style={{ top: finalY, transform: 'translateY(-50%)' }}
                    >
                      <div className="mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500 bg-yellow-500/10 px-4 py-1 rounded-full border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]">Bajnoki Döntő</span>
                      </div>
                      
                      <BracketMatchCard match={bracketData.final} color="#eab308" isDarkMode={isDarkMode} highlight />
                      
                      {bracketData.bronze && (
                        <div className="mt-16 flex flex-col items-center opacity-90 scale-90 w-full">
                          <div className="mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">Bronzmérkőzés</span>
                          </div>
                          <BracketMatchCard match={bracketData.bronze} color="#fb923c" isDarkMode={isDarkMode} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT BRANCHES */}
                  {bracketData.right.slice().reverse().map((column, colIdx) => {
                    const roundLevel = colIdx + 1;
                    const numSlots = Math.pow(2, roundLevel);
                    const slotHeight = totalBracketHeight / numSlots;

                    return (
                      <div key={`right-${colIdx}`} className="relative h-full" style={{ width: CARD_WIDTH }}>
                        {Array.from({ length: numSlots }).map((_, i) => {
                          const match = column.find(m => m.localSlotIndex === i);
                          return (
                            <div 
                              key={i} 
                              className="absolute left-0 flex items-center justify-center w-full" 
                              style={{ height: slotHeight, top: i * slotHeight }}
                            >
                              {match && <BracketMatchCard match={match} color={currentSportColor} isDarkMode={isDarkMode} />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  
                  {/* Watermark Logo in background */}
                  <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-[0.03] pointer-events-none">
                     <i className={`ph-fill ${getSportIcon(selectedSport || '')} text-[80rem] rotate-12`}></i>
                  </div>
                </div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

const BracketMatchCard = ({ match, color, isDarkMode, highlight = false }: { match: Match, color: string, isDarkMode: boolean, highlight?: boolean }) => {
  const winnerA = match.isFinished && (match.scoreA || 0) > (match.scoreB || 0);
  const winnerB = match.isFinished && (match.scoreB || 0) > (match.scoreA || 0);

  return (
    <div 
      className={`w-full rounded-2xl border-2 overflow-hidden transition-all shadow-2xl pointer-events-auto group ${isDarkMode ? 'bg-[#16161d] border-white/5' : 'bg-white border-slate-100'} ${highlight ? 'ring-4 ring-yellow-500/20' : ''}`}
      style={{ borderColor: highlight ? '#eab308' : `${color}30` }}
    >
      <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{match.round}</span>
        {match.isFinished && <i className="ph-fill ph-check-circle text-green-500 text-xs"></i>}
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center h-5">
          <span className={`text-xs font-bold truncate flex-grow pr-3 ${winnerA ? 'text-white' : 'text-white/30'}`}>
            {match.teamA || 'TBD'}
          </span>
          <span className={`text-sm font-black w-8 text-right ${winnerA ? '' : 'text-white/20'}`} style={{color: winnerA ? color : ''}}>
            {match.scoreA ?? '-'}
          </span>
        </div>
        <div className="flex justify-between items-center h-5">
          <span className={`text-xs font-bold truncate flex-grow pr-3 ${winnerB ? 'text-white' : 'text-white/30'}`}>
            {match.teamB || 'TBD'}
          </span>
          <span className={`text-sm font-black w-8 text-right ${winnerB ? '' : 'text-white/20'}`} style={{color: winnerB ? color : ''}}>
            {match.scoreB ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgakView;
