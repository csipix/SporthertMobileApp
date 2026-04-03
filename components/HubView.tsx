
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getSportIcon } from './SajatView';
import { useModalHistory } from '../hooks/useModalHistory';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

interface LiveMatch {
  id: string;
  teamA: string;
  teamB: string;
  sport: string;
  scoreA: number | null;
  scoreB: number | null;
  startTime: string;
  endTime: string;
  location: string;
  isFinished: boolean;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
}

interface Scorer {
  id: string;
  name: string;
  className: string;
  goals: number;
}

interface FairPlayStatus {
  isLocked: boolean;
  winnerName?: string;
  winnerClass?: string;
  reason?: string;
  points?: number;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

const HubView: React.FC = () => {
  const [allMatches, setAllMatches] = useState<LiveMatch[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGolkiraly, setShowGolkiraly] = useState(false);
  const [showFairPlay, setShowFairPlay] = useState(false);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loadingScorers, setLoadingScorers] = useState(false);
  const [fairPlayStatus, setFairPlayStatus] = useState<FairPlayStatus>({ isLocked: false });
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useModalHistory(showGolkiraly, () => setShowGolkiraly(false));
  useModalHistory(showFairPlay, () => setShowFairPlay(false));

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setCanScrollDown(scrollHeight > clientHeight + scrollTop + 10);
    }
  };

  useEffect(() => {
    if (showGolkiraly) {
      setTimeout(checkScroll, 100);
    }
  }, [showGolkiraly, scorers]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Marosvásárhely coordinates: 46.5425, 24.5575
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=46.5425&longitude=24.5575&current_weather=true');
        const data = await res.json();
        if (data.current_weather) {
          const code = data.current_weather.weathercode;
          let condition = "Napos";
          let icon = "ph-sun";
          
          if (code > 0 && code <= 3) { condition = "Részben felhős"; icon = "ph-cloud-sun"; }
          else if (code >= 45 && code <= 48) { condition = "Ködös"; icon = "ph-cloud-fog"; }
          else if (code >= 51 && code <= 67) { condition = "Esős"; icon = "ph-cloud-rain"; }
          else if (code >= 71 && code <= 77) { condition = "Havas"; icon = "ph-cloud-snow"; }
          else if (code >= 80 && code <= 82) { condition = "Zápor"; icon = "ph-cloud-rain"; }
          else if (code >= 95) { condition = "Viharos"; icon = "ph-cloud-lightning"; }

          setWeather({
            temp: Math.round(data.current_weather.temperature),
            condition,
            icon
          });
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      }
    };
    fetchWeather();
  }, []);

  // Fetch News from Firebase
  useEffect(() => {
    if (!db) {
      setNews([{ id: 'default', title: 'Üdvözöljük!', content: 'A versenyek rendben zajlanak!', createdAt: '', expiresAt: '' }]);
      return;
    }
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setNews([{ id: 'default', title: 'Üdvözöljük!', content: 'A versenyek rendben zajlanak!', createdAt: '', expiresAt: '' }]);
      } else {
        const newsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NewsItem[];
        setNews(newsData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'news');
      setNews([{ id: 'default', title: 'Hiba', content: 'Nem sikerült betölteni a híreket.', createdAt: '', expiresAt: '' }]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) {
      setLoadingMatches(false);
      return;
    }

    const q = query(collection(db, "matches"), orderBy("startTime", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveMatch[];
      setAllMatches(matches);
      setLoadingMatches(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
      setLoadingMatches(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Scorers
  useEffect(() => {
    if (!showGolkiraly || !db) return;
    
    setLoadingScorers(true);
    const q = query(collection(db, "scorers"), orderBy("goals", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scorersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Scorer[];
      setScorers(scorersData);
      setLoadingScorers(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'scorers');
      setLoadingScorers(false);
    });
    return () => unsubscribe();
  }, [showGolkiraly]);

  // Fetch Fair Play Status
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "fairplay"), (snapshot) => {
      const statusDoc = snapshot.docs.find(doc => doc.id === '_global_status');
      const isLocked = statusDoc?.data()?.isLocked || false;

      if (isLocked) {
        // Find the class with the highest points
        let maxPoints = -1;
        let winner: any = null;

        snapshot.docs.forEach(doc => {
          if (doc.id !== '_global_status') {
            const data = doc.data();
            const points = data.points || 0;
            if (points > maxPoints) {
              maxPoints = points;
              winner = { id: doc.id, ...data };
            }
          }
        });

        if (winner) {
          setFairPlayStatus({
            isLocked: true,
            winnerName: winner.name || winner.id,
            winnerClass: winner.className || winner.id,
            reason: winner.reason || "Kiemelkedő sportszerűségért és közösségi munkáért.",
            points: winner.points
          });
        } else {
          setFairPlayStatus({ isLocked: true });
        }
      } else {
        setFairPlayStatus({ isLocked: false });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fairplay');
    });
    return () => unsubscribe();
  }, []);

  const liveMatches = useMemo(() => {
    return allMatches.filter(m => {
      if (m.isFinished) return false;
      const start = new Date(m.startTime);
      const end = new Date(m.endTime);
      return start <= currentTime && end >= currentTime;
    });
  }, [allMatches, currentTime]);

  return (
    <div className="animate-fadeIn h-full flex flex-col pt-[72px] pb-[72px] px-4 overflow-hidden">
      <div className="flex-grow flex flex-col justify-evenly py-2">
        {/* 1. News Section */}
        {news.length > 0 && (
          <section className="flex-shrink-0 w-full px-1">
            <div className="border rounded-2xl p-4 transition-colors duration-500 bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20 dark:shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
                  <i className="ph ph-bold ph-megaphone text-orange-500 text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold leading-snug">
                    <span className="text-orange-500 uppercase block mb-0.5">{news[0].title}</span> 
                    <span className="text-slate-600 dark:text-gray-300">{news[0].content}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. Date & Weather Section */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0 px-1">
          <div className="border rounded-2xl p-4 flex flex-col items-center justify-center transition-all bg-white dark:bg-[#16161d] border-slate-100 dark:border-white/5 shadow-sm dark:shadow-2xl dark:shadow-blue-500/5">
            <span className="text-[9px] font-black tracking-widest uppercase mb-1 text-slate-400 dark:text-gray-500">Dátum</span>
            <span className="text-3xl font-black leading-none italic text-slate-900 dark:text-white">
              {currentTime.toLocaleDateString('hu-HU', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
          
          <div className="border rounded-2xl p-4 flex items-center justify-center gap-3 transition-all bg-white dark:bg-[#16161d] border-slate-100 dark:border-white/5 shadow-sm dark:shadow-2xl dark:shadow-orange-500/5">
            {weather ? (
              <>
                <i className={`ph ph-bold ${weather.icon} text-3xl text-orange-400`}></i>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{weather.temp}°C</span>
                  <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-gray-500">{weather.condition}</span>
                </div>
              </>
            ) : (
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            )}
          </div>
        </div>

        {/* 3. Live Section */}
        <section className="flex-shrink-0 min-h-0">
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500">Folyamatban lévő meccsek</h3>
            {liveMatches.length > 0 && (
               <span className="text-[8px] font-black bg-red-500 px-2 py-0.5 rounded text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">LIVE</span>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
            {loadingMatches ? (
              <div className="flex items-center justify-center w-full py-6">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : liveMatches.length > 0 ? (
              liveMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="snap-center min-w-[260px] border-2 rounded-[2rem] p-5 flex flex-col gap-3 relative overflow-hidden group active:scale-95 transition-all bg-white dark:bg-[#16161d] border-red-100 dark:border-red-500/30 shadow-xl dark:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                >
                  <div className="absolute -top-10 -right-10 w-24 h-24 blur-[40px] rounded-full transition-all bg-red-500/5 dark:bg-red-500/20"></div>
                  <div className="flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Élő</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <i className={`ph ph-fill ${getSportIcon(match.sport)} text-[12px] text-slate-400 dark:text-gray-400`}></i>
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-gray-400">{match.sport}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 my-2 z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black truncate mr-2 text-slate-700 dark:text-white">{match.teamA}</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">{match.scoreA ?? 0}</span>
                    </div>
                    <div className="w-full h-[1px] bg-slate-100 dark:bg-gradient-to-r dark:from-transparent dark:via-white/20 dark:to-transparent"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black truncate mr-2 text-slate-700 dark:text-white">{match.teamB}</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">{match.scoreB ?? 0}</span>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter z-10 text-slate-500 dark:text-gray-500">
                    <div className="flex items-center gap-1.5"><i className="ph ph-fill ph-map-pin-area"></i>{match.location}</div>
                    <span>Vége: {new Date(match.endTime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-[2rem] border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-gray-700 shadow-inner">
                <i className="ph ph-ghost text-2xl mb-2 opacity-20"></i>
                <p className="text-[9px] font-black uppercase tracking-widest text-center">Nincs élő meccs</p>
              </div>
            )}
          </div>
        </section>

        {/* 5. Action Buttons Section */}
        <div className="space-y-3 px-1 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                window.history.pushState({ modal: 'golkiraly' }, '');
                setShowGolkiraly(true);
              }}
              className="border font-black py-3 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 group bg-white dark:bg-[#16161d] border-orange-100 dark:border-orange-500/30 text-orange-600 dark:text-orange-500 shadow-sm dark:shadow-[0_0_15px_rgba(249,115,22,0.1)]"
            >
              <i className="ph ph-bold ph-trophy group-hover:scale-110 transition-transform text-lg"></i>
              Gólkirály
            </button>
            <button 
              onClick={() => {
                window.history.pushState({ modal: 'fairplay' }, '');
                setShowFairPlay(true);
              }}
              className="border font-black py-3 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 group bg-white dark:bg-[#16161d] border-purple-100 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-sm dark:shadow-[0_0_15px_rgba(168,85,247,0.1)]"
            >
              <i className="ph ph-bold ph-medal group-hover:scale-110 transition-transform text-lg"></i>
              Fair play
            </button>
          </div>
          <button className="w-full border font-black py-3 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 bg-white dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <i className="ph ph-bold ph-scroll text-lg"></i>
            Házirend & Szabályzat
          </button>
        </div>
      </div>

      {/* Gólkirály Modal */}
      {showGolkiraly && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center px-4 pb-[84px] pt-[80px]" onClick={() => window.history.back()}>
          <div 
            className="w-full max-w-md rounded-[2.5rem] p-8 animate-slideUp border bg-white dark:bg-[#16161d] border-slate-200 dark:border-white/10 shadow-2xl max-h-full overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
                <i className="ph-fill ph-trophy text-orange-500 text-3xl"></i>
                Gólkirály
              </h2>
              <button 
                onClick={() => {
                  setLoadingScorers(true);
                  setTimeout(() => setLoadingScorers(false), 800);
                }}
                className="p-2 rounded-xl active:rotate-180 transition-all duration-500 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400"
              >
                <i className="ph ph-bold ph-arrows-clockwise text-xl"></i>
              </button>
            </div>
            
            <div 
              ref={scrollRef}
              onScroll={checkScroll}
              className="space-y-4 py-4 max-h-[280px] overflow-y-auto no-scrollbar relative"
            >
              {loadingScorers ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : scorers.length > 0 ? (
                scorers.map((scorer, index) => (
                  <div key={scorer.id} className={`p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-center justify-between ${index > 2 ? 'opacity-80' : ''}`}>
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-black w-6 ${index === 0 ? 'text-orange-500' : index === 1 ? 'text-slate-400 dark:text-gray-400' : index === 2 ? 'text-amber-700' : 'text-slate-500 dark:text-gray-500'}`}>
                        {index + 1}.
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{scorer.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black">{scorer.className}</p>
                      </div>
                    </div>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{scorer.goals} gól</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-30 italic text-xs text-slate-900 dark:text-white">
                  A lista hamarosan frissül...
                </div>
              )}
            </div>

            {canScrollDown && (
              <div className="flex justify-center -mt-2 mb-2 animate-bounce">
                <i className="ph ph-bold ph-caret-down text-xl text-orange-500/50"></i>
              </div>
            )}

            <button 
              onClick={() => window.history.back()}
              className="mt-6 w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
            >
              BEZÁRÁS
            </button>
          </div>
        </div>
      )}

      {/* Fair play Modal */}
      {showFairPlay && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center px-4 pb-[84px] pt-[80px]" onClick={() => window.history.back()}>
          <div 
            className="w-full max-w-md rounded-[2.5rem] p-8 animate-slideUp border bg-white dark:bg-[#16161d] border-slate-200 dark:border-white/10 shadow-2xl max-h-full overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
              <i className="ph-fill ph-medal text-purple-500 text-3xl"></i>
              Fair play
            </h2>
            
            <div className="py-4">
              {fairPlayStatus.isLocked && fairPlayStatus.winnerName ? (
                <div className="p-8 rounded-[2rem] border-2 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 flex flex-col items-center text-center gap-6 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                    <i className="ph-fill ph-crown text-white text-4xl"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{fairPlayStatus.winnerName}</h3>
                    <p className="text-purple-500 font-black uppercase tracking-[0.2em] text-sm mt-2">GRATULÁLUNK!</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5">
                    <i className="ph ph-bold ph-hourglass-medium text-3xl animate-pulse text-purple-500 dark:text-purple-400"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-gray-200">A jelölés folyamatban...</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-2 max-w-[200px] leading-relaxed uppercase font-black tracking-widest">
                      Hamarosan kiderül, ki kapja az idei Fair Play díjat!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => window.history.back()}
              className="mt-6 w-full py-4 bg-purple-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
            >
              BEZÁRÁS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubView;
