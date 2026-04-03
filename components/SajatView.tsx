
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

interface MatchItem {
  id: string;
  sport: string;
  round: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  location: string;
  startTime: string; 
  endTime: string;
  isFinished: boolean;
}

interface SajatViewProps {
  selectedClass: string;
}

const NEON_PALETTE = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#06b6d4", "#ef4444", 
  "#eab308", "#ec4899", "#6366f1", "#84cc16", "#14b8a6", "#f43f5e"
];

const DAYS = [
  { label: 'Hét', full: 'Hétfő', index: 1 },
  { label: 'Ked', full: 'Kedd', index: 2 },
  { label: 'Sze', full: 'Szerda', index: 3 },
  { label: 'Csü', full: 'Csütörtök', index: 4 },
  { label: 'Pén', full: 'Péntek', index: 5 },
];

export const getSportIcon = (sport: string) => {
  if (!sport) return 'ph-trophy';
  const s = sport.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (s.includes('foci') || s.includes('labdar') || s.includes('labtenisz')) return 'ph-soccer-ball';
  if (s.includes('kosar')) return 'ph-basketball';
  if (s.includes('rop') || s.includes('volleyball')) return 'ph-volleyball';
  if (s.includes('tenisz') && !s.includes('ping') && !s.includes('asztali')) return 'ph-tennis-ball';
  if (s.includes('ping') || s.includes('asztali')) return 'ph-ping-pong';
  if (s.includes('meta')) return 'ph-baseball';
  if (s.includes('usz') || s.includes('waves')) return 'ph-waves';
  if (s.includes('fut') || s.includes('atletika')) return 'ph-sneaker-move';
  if (s.includes('bicikli') || s.includes('kerekpar')) return 'ph-bicycle';
  return 'ph-trophy';
};

const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "??:??";
  }
};

const SajatView: React.FC<SajatViewProps> = ({ selectedClass }) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const today = new Date().getDay();
    return (today >= 1 && today <= 5) ? today : 1;
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "matches"), orderBy("startTime", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchItem[];
      setMatches(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sportColorMap = useMemo(() => {
    const uniqueSports = Array.from(new Set(matches.map(m => m.sport)));
    const map: Record<string, string> = {};
    uniqueSports.forEach((sport, index) => {
      map[sport as string] = NEON_PALETTE[index % NEON_PALETTE.length];
    });
    return map;
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const matchDate = new Date(m.startTime);
      const isCorrectDay = matchDate.getDay() === selectedDayIndex;
      const isMyClass = m.teamA === selectedClass || m.teamB === selectedClass;
      return isCorrectDay && isMyClass;
    });
  }, [matches, selectedClass, selectedDayIndex]);

  const timelineProgress = useMemo(() => {
    if (filteredMatches.length === 0) return 0;
    
    const dayStart = new Date(filteredMatches[0].startTime).getTime();
    const dayEnd = new Date(filteredMatches[filteredMatches.length - 1].startTime).getTime();
    const now = currentTime.getTime();

    if (now <= dayStart) return 0;
    if (now >= dayEnd) return 100;
    
    return ((now - dayStart) / (dayEnd - dayStart)) * 100;
  }, [selectedDayIndex, currentTime, filteredMatches]);

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <span 
          className="font-black text-[48vw] rotate-[-15deg] tracking-tighter italic transition-all duration-700 text-[#0ea5e9] opacity-[0.08] dark:text-[#00f5ff] dark:opacity-[0.2] blur-[0px] dark:blur-[1px] [text-shadow:none] dark:[text-shadow:0_0_20px_rgba(0,245,255,0.9),0_0_50px_rgba(0,245,255,0.5)]"
        >
          {selectedClass}
        </span>
      </div>

      <div className="animate-fadeIn pt-[72px] pb-[72px] px-4 h-full overflow-y-auto no-scrollbar relative z-10">
        <div className="mb-8 relative z-20">
          <div className="flex justify-between items-center gap-2">
            {DAYS.map((day) => (
              <button
                key={day.index}
                onClick={() => setSelectedDayIndex(day.index)}
                className={`
                  flex-1 flex flex-col items-center py-3 rounded-2xl transition-all duration-300 border-2
                  ${selectedDayIndex === day.index 
                    ? `bg-orange-500 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.4)] dark:shadow-[0_0_25px_rgba(249,115,22,0.6)] scale-105` 
                    : 'bg-white dark:bg-[#16161d] border-slate-200 dark:border-white/5 text-slate-400 dark:text-gray-500 shadow-sm dark:shadow-none'}
                `}
              >
                <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedDayIndex === day.index ? 'text-white' : 'text-slate-400 dark:text-gray-500'}`}>
                  {day.label}
                </span>
                <div className={`mt-1.5 w-1 h-1 rounded-full ${selectedDayIndex === day.index ? 'bg-white' : 'bg-transparent'}`}></div>
              </button>
            ))}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20 relative z-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="relative z-20">
            {/* Globális haladási vonal konténer */}
            <div className="absolute left-0 top-0 bottom-0 w-[70px] pointer-events-none z-10">
              {filteredMatches.length > 1 && (
                <div 
                  className="absolute left-[34px] w-[2px] bg-gradient-to-b from-orange-400 to-orange-600"
                  style={{ 
                    height: `${timelineProgress}%`, 
                    top: '30px',
                    maxHeight: 'calc(100% - 140px)',
                    boxShadow: '0 0 15px rgba(249,115,22,0.8)' 
                  }}
                >
                  {timelineProgress > 0 && timelineProgress < 100 && (
                    <div className="absolute bottom-0 left-[-5px] translate-y-1/2 w-[12px] h-[12px] bg-white rounded-full shadow-[0_0_15px_white] z-20"></div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-8 pb-4">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((item, index) => {
                  const sportColor = sportColorMap[item.sport] || "#6c757d";
                  const isLive = !item.isFinished && new Date(item.startTime) <= currentTime && new Date(item.endTime) >= currentTime;
                  
                  return (
                    <div key={item.id} className="relative pl-[70px]">
                      {/* Tengely oszlop - itt centerezzük a vonalat és a pontot */}
                      <div className="absolute left-0 top-0 bottom-0 w-[70px] pointer-events-none">
                        {/* Statikus vonal szakasz */}
                        {index < filteredMatches.length - 1 && (
                          <div 
                            className="absolute left-[34px] top-[30px] w-[2px] bg-slate-200 dark:bg-white/10"
                            style={{ height: 'calc(100% + 32px)' }}
                          ></div>
                        )}
                        
                        {/* Időpont (a tengelytől balra) */}
                        <div className="absolute right-[46px] top-[30px] -translate-y-1/2 text-right text-[11px] font-black italic whitespace-nowrap text-slate-400 dark:text-gray-400">
                          {formatTime(item.startTime)}
                        </div>

                        {/* Pont (pontosan középen) */}
                        <div 
                          className={`absolute left-[29px] top-[30px] -translate-y-1/2 w-[12px] h-[12px] rounded-full border-2 box-border z-30 border-[#f1f5f9] dark:border-[#0d0d12] ${isLive ? 'bg-green-500 scale-125' : (item.isFinished ? 'bg-slate-300 dark:bg-gray-700' : 'bg-white/20')}`}
                          style={!item.isFinished && !isLive ? { backgroundColor: sportColor, boxShadow: `0 0 10px ${sportColor}` } : {}}
                        ></div>
                      </div>

                      <div 
                        className="relative p-5 rounded-[1.8rem] transition-all active:scale-[0.97] w-full border-2 bg-white dark:bg-[#16161d]/90 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-2xl"
                        style={{ 
                          borderColor: `${sportColor}55`,
                          boxShadow: `0 0 15px ${sportColor}15`
                        }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2.5">
                            <i className={`ph ph-fill ${getSportIcon(item.sport)} text-xl`} style={{ color: sportColor }}></i>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: sportColor }}>
                              {item.sport} <span className="mx-1 text-slate-400 dark:text-gray-700">•</span> {item.round}
                            </span>
                          </div>
                          {isLive && (
                            <div className="flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              <span className="text-[8px] font-black text-red-500 uppercase">Élő</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 py-1">
                          <div className="flex-1 text-center font-black text-sm">{item.teamA}</div>
                          <div className="flex flex-col items-center">
                            {item.scoreA !== null ? (
                               <span className="text-lg font-black text-slate-900 dark:text-white">{item.scoreA} - {item.scoreB}</span>
                            ) : <span className="text-[10px] font-black opacity-30 italic uppercase">vs</span>}
                          </div>
                          <div className="flex-1 text-center font-black text-sm">{item.teamB}</div>
                        </div>
                        <div className="mt-4 pt-3 border-t flex items-center justify-between border-slate-50 dark:border-white/5">
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                            <i className="ph ph-fill ph-map-pin-area text-[11px]"></i>
                            <span className="text-[10px] font-bold tracking-tight">{item.location}</span>
                          </div>
                          <div className="text-[10px] font-black italic text-slate-400 dark:text-gray-500">
                            {formatTime(item.startTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-24 text-center pr-6 opacity-30 italic">Nincs meccsed ezen a napon.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SajatView;
