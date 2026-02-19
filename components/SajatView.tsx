
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
  isDarkMode: boolean;
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

const SajatView: React.FC<SajatViewProps> = ({ selectedClass, isDarkMode }) => {
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
      console.error("Firestore error:", error);
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
          className={`font-black text-[48vw] rotate-[-15deg] tracking-tighter italic transition-all duration-700 ${isDarkMode ? 'text-[#00f5ff] opacity-[0.2]' : 'text-[#0ea5e9] opacity-[0.08]'}`}
          style={{ 
            textShadow: isDarkMode ? `0 0 20px rgba(0, 245, 255, 0.9), 0 0 50px rgba(0, 245, 255, 0.5)` : 'none',
            filter: isDarkMode ? 'blur(1px)' : 'blur(0px)'
          }}
        >
          {selectedClass}
        </span>
      </div>

      <div className="animate-fadeIn pb-24 px-1 relative z-10">
        <div className="mb-8 relative z-20">
          <div className="flex justify-between items-center gap-2">
            {DAYS.map((day) => (
              <button
                key={day.index}
                onClick={() => setSelectedDayIndex(day.index)}
                className={`
                  flex-1 flex flex-col items-center py-3 rounded-2xl transition-all duration-300 border-2
                  ${selectedDayIndex === day.index 
                    ? `bg-orange-500 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,${isDarkMode ? '0.6' : '0.4'})] scale-105` 
                    : (isDarkMode ? 'bg-[#16161d] border-white/5 text-gray-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm')}
                `}
              >
                <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedDayIndex === day.index ? 'text-white' : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>
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
          <div className="relative ml-14 z-20">
            {/* Dinamikus haladási vonal - csak a kártyák között */}
            {filteredMatches.length > 1 && (
              <div 
                className="absolute left-0 top-5 w-0.5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full transition-all duration-1000 ease-in-out z-10"
                style={{ 
                  height: `${timelineProgress}%`, 
                  maxHeight: 'calc(100% - 40px)',
                  boxShadow: '0 0 15px rgba(249,115,22,0.8)' 
                }}
              >
                {timelineProgress > 0 && timelineProgress < 100 && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white] z-20"></div>
                )}
              </div>
            )}

            <div className="space-y-8 pb-4">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((item, index) => {
                  const sportColor = sportColorMap[item.sport] || "#6c757d";
                  const isLive = !item.isFinished && new Date(item.startTime) <= currentTime && new Date(item.endTime) >= currentTime;
                  
                  return (
                    <div key={item.id} className="relative pl-6">
                      {/* Függőleges vonal szakasz - CSAK ha nem az utolsó elem */}
                      {index < filteredMatches.length - 1 && (
                        <div className={`absolute left-0 top-5 bottom-[-32px] w-0.5 rounded-full z-0 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                      )}

                      <div className={`absolute left-[-62px] top-4 w-12 text-right text-[11px] font-black italic ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                        {formatTime(item.startTime)}
                      </div>
                      
                      <div 
                        className={`absolute left-[-5.5px] top-5 w-3 h-3 rounded-full border-2 z-30 transition-all duration-500 ${isDarkMode ? 'border-[#0d0d12]' : 'border-white'} ${isLive ? 'bg-green-500 scale-125' : (item.isFinished ? (isDarkMode ? 'bg-gray-700' : 'bg-slate-300') : 'bg-white/20')}`}
                        style={!item.isFinished && !isLive ? { backgroundColor: sportColor, boxShadow: isDarkMode ? `0 0 10px ${sportColor}` : 'none' } : {}}
                      ></div>

                      <div 
                        className={`relative p-5 rounded-[1.8rem] transition-all active:scale-[0.97] w-full border-2 ${isDarkMode ? 'bg-[#16161d]/90 border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}
                        style={{ 
                          borderColor: isDarkMode ? `${sportColor}55` : `${sportColor}22`,
                          boxShadow: isDarkMode ? `0 0 15px ${sportColor}15` : 'none'
                        }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2.5">
                            <i className={`ph ph-fill ${getSportIcon(item.sport)} text-xl`} style={{ color: sportColor }}></i>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: sportColor }}>
                              {item.sport} <span className={`mx-1 ${isDarkMode ? 'text-gray-700' : 'text-slate-200'}`}>•</span> {item.round}
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
                               <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.scoreA} - {item.scoreB}</span>
                            ) : <span className="text-[10px] font-black opacity-30 italic uppercase">vs</span>}
                          </div>
                          <div className="flex-1 text-center font-black text-sm">{item.teamB}</div>
                        </div>
                        <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-50'}`}>
                          <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                            <i className="ph ph-fill ph-map-pin-area text-[11px]"></i>
                            <span className="text-[10px] font-bold tracking-tight">{item.location}</span>
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
