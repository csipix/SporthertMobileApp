
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
  const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>('groups');

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

  const groupMatches = React.useMemo(() => matches.filter(m => m.round.toLowerCase().includes('csoport')), [matches]);
  const bracketMatches = React.useMemo(() => matches.filter(m => !m.round.toLowerCase().includes('csoport')), [matches]);

  const groups = React.useMemo(() => {
    const groupMap = new Map<string, Match[]>();
    groupMatches.forEach(m => {
      if (!groupMap.has(m.round)) groupMap.set(m.round, []);
      groupMap.get(m.round)!.push(m);
    });
    
    const result = Array.from(groupMap.entries()).map(([groupName, groupMatches]) => {
      const hasSelectedClass = groupMatches.some(m => m.teamA === selectedClass || m.teamB === selectedClass);
      
      return {
        name: groupName,
        hasSelectedClass,
        matches: groupMatches.sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0;
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        })
      };
    });

    return result.sort((a, b) => {
      if (a.hasSelectedClass && !b.hasSelectedClass) return -1;
      if (!a.hasSelectedClass && b.hasSelectedClass) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [groupMatches, selectedClass]);

  // 3. Layout Engine futtatása
  const { nodes, edges, bounds } = useBracketLayout(bracketMatches);

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
                    setActiveTab('groups');
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
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">{selectedSport}</span>
          </div>
        </button>
      </div>

      {/* Segmented Control */}
      {selectedSport?.toLowerCase() === 'foci' && (
        <div className="absolute top-4 left-0 right-0 z-[65] flex justify-center pointer-events-none px-16">
          <div className="pointer-events-auto flex items-center p-1 h-10 bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl">
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-3 sm:px-4 h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                activeTab === 'groups' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                  : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Csoportkör
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-3 sm:px-4 h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bracket' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                  : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Egyenes kiesés
            </button>
          </div>
        </div>
      )}

      {/* Loading állapot ágrajz közben */}
      {loading && (
        <div className="absolute inset-0 z-[65] backdrop-blur-sm flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-[#0d0d12]/50">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-200 dark:border-white/10 border-t-slate-800 dark:border-t-white/80"></div>
        </div>
      )}

      {/* Csoportkör Nézet */}
      {selectedSport?.toLowerCase() === 'foci' && activeTab === 'groups' && (
        <div className="absolute inset-0 z-[60] bg-slate-50 dark:bg-[#0d0d12] overflow-y-auto no-scrollbar pt-24 pb-24 px-4 animate-fadeIn">
          <div className="max-w-md mx-auto space-y-6">
            {groups.length > 0 ? groups.map(group => (
              <div key={group.name} className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <div className={`w-2 h-2 rounded-full ${group.hasSelectedClass ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${group.hasSelectedClass ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-white/50'}`}>
                    {group.name} {group.hasSelectedClass && '(Saját csoport)'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {group.matches.map(match => {
                    const isOwnMatch = match.teamA === selectedClass || match.teamB === selectedClass;
                    const hasScore = match.scoreA !== null && match.scoreB !== null && match.scoreA !== undefined && match.scoreB !== undefined;
                    const showScore = match.isFinished || hasScore;
                    
                    return (
                      <div 
                        key={match.id}
                        className={`flex items-center p-3 rounded-xl border shadow-sm gap-3 transition-colors ${
                          isOwnMatch 
                            ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/20' 
                            : 'bg-white dark:bg-[#16161d] border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center w-20 shrink-0 border-r border-slate-100 dark:border-white/5 pr-3 gap-1">
                          <span className="text-[12px] font-black text-slate-700 dark:text-white/80">
                            {match.startTime ? new Date(match.startTime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '??:??'}
                          </span>
                          <div className="flex items-center gap-0.5 text-slate-400 dark:text-white/40 w-full justify-center">
                            <i className="ph-fill ph-map-pin text-[10px] shrink-0"></i>
                            <span className="text-[9px] font-bold uppercase tracking-wider truncate">
                              {match.location || 'Pálya'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <span className={`text-[13px] font-bold truncate flex-1 text-right ${match.teamA === selectedClass ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'}`}>{match.teamA || 'TBD'}</span>
                          <div className="w-16 flex justify-center shrink-0">
                            {showScore ? (
                              <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 shadow-inner">
                                <span className={`text-[13px] font-black ${match.scoreA! > match.scoreB! ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>{match.scoreA}</span>
                                <span className="text-[10px] text-slate-400 dark:text-white/30 font-bold">:</span>
                                <span className={`text-[13px] font-black ${match.scoreB! > match.scoreA! ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>{match.scoreB}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-400 dark:text-white/30 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-100 dark:border-white/5">VS</span>
                            )}
                          </div>
                          <span className={`text-[13px] font-bold truncate flex-1 text-left ${match.teamB === selectedClass ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white/80'}`}>{match.teamB || 'TBD'}</span>
                        </div>
                      </div>
                    );
                  })}
                  {group.matches.length === 0 && (
                    <div className="text-center py-4 text-slate-400 dark:text-white/30 italic text-xs bg-white dark:bg-[#16161d] rounded-xl border border-slate-200 dark:border-white/10">
                      Nincsenek mérkőzések.
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-400 dark:text-white/30 italic">
                Nincsenek csoportkörök ehhez a sportághoz.
              </div>
            )}
          </div>
        </div>
      )}

      {/* A Kamera Rendszer */}
      {(selectedSport?.toLowerCase() !== 'foci' || activeTab === 'bracket') && bounds && (
        <div className="absolute inset-0 z-[50] animate-fadeIn">
          <BracketViewport 
            nodes={nodes} 
            edges={edges} 
            bounds={bounds} 
            color={currentSportColor} 
            selectedClass={selectedClass}
          />
        </div>
      )}
    </div>
  );
};

export default AgakView;
