
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getSportIcon } from './SajatView';

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

interface HubViewProps {
  isDarkMode: boolean;
}

const DEFAULT_NEWS = {
  warning: "A versenyek rendben zajlanak!",
  temperature: "22°C",
  weather: "Napos",
  weatherIcon: "ph-sun"
};

const HubView: React.FC<HubViewProps> = ({ isDarkMode }) => {
  const [hubData] = useState(DEFAULT_NEWS);
  const [allMatches, setAllMatches] = useState<LiveMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
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
    }, (err) => {
      console.error("Hub matches error:", err);
      setLoadingMatches(false);
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
    <div className="animate-fadeIn pb-24 space-y-8">
      {/* 1. Header & Info Section */}
      <section>
        <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HUB</h2>
        <div className={`border rounded-2xl p-4 transition-colors duration-500 ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex gap-3 items-start">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-500/10'}`}>
              <i className="ph ph-bold ph-megaphone text-orange-500 text-sm"></i>
            </div>
            <p className="text-[11px] font-bold leading-snug">
              <span className="text-orange-500 uppercase block mb-0.5">Friss hírek</span> 
              <span className={isDarkMode ? 'text-gray-300' : 'text-slate-600'}>{hubData.warning}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. Date & Weather Section */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`border rounded-2xl p-4 flex flex-col items-center justify-center transition-all ${isDarkMode ? 'bg-[#16161d] border-white/5 shadow-2xl shadow-blue-500/5' : 'bg-white border-slate-100 shadow-sm'}`}>
          <span className={`text-[9px] font-black tracking-widest uppercase mb-1 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Dátum</span>
          <span className={`text-3xl font-black leading-none italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentTime.toLocaleDateString('hu-HU', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
        <div className={`border rounded-2xl p-4 flex items-center justify-center gap-3 transition-all ${isDarkMode ? 'bg-[#16161d] border-white/5 shadow-2xl shadow-orange-500/5' : 'bg-white border-slate-100 shadow-sm'}`}>
          <i className={`ph ph-bold ${hubData.weatherIcon} text-3xl text-orange-400`}></i>
          <div className="flex flex-col">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{hubData.temperature}</span>
            <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>{hubData.weather}</span>
          </div>
        </div>
      </div>

      {/* 3. Live Section */}
      <section>
        <div className="flex items-center justify-between px-2 mb-3">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Folyamatban lévő meccsek</h3>
          {liveMatches.length > 0 && (
             <span className="text-[8px] font-black bg-red-500 px-2 py-0.5 rounded text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">LIVE</span>
          )}
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1 snap-x">
          {loadingMatches ? (
            <div className="flex items-center justify-center w-full py-10">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : liveMatches.length > 0 ? (
            liveMatches.map((match) => (
              <div 
                key={match.id} 
                className={`snap-center min-w-[260px] border-2 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden group active:scale-95 transition-all ${isDarkMode ? 'bg-[#16161d] border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-white border-red-100 shadow-xl'}`}
              >
                <div className={`absolute -top-10 -right-10 w-24 h-24 blur-[40px] rounded-full transition-all ${isDarkMode ? 'bg-red-500/20' : 'bg-red-500/5'}`}></div>
                <div className="flex justify-between items-center z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Élő</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    <i className={`ph ph-fill ${getSportIcon(match.sport)} text-[12px] text-gray-400`}></i>
                    <span className={`text-[9px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>{match.sport}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 my-2 z-10">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-black truncate mr-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{match.teamA}</span>
                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{match.scoreA ?? 0}</span>
                  </div>
                  <div className={`w-full h-[1px] ${isDarkMode ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-slate-100'}`}></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-black truncate mr-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{match.teamB}</span>
                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{match.scoreB ?? 0}</span>
                  </div>
                </div>
                <div className={`pt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter z-10 ${isDarkMode ? 'text-gray-500' : 'text-slate-300'}`}>
                  <div className="flex items-center gap-1.5"><i className="ph ph-fill ph-map-pin-area"></i>{match.location}</div>
                  <span>Vége: {new Date(match.endTime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={`w-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-[2rem] ${isDarkMode ? 'border-white/10 bg-white/[0.02] text-gray-700 shadow-inner' : 'border-slate-200 bg-slate-50 text-slate-300'}`}>
              <i className="ph ph-ghost text-2xl mb-2 opacity-20"></i>
              <p className="text-[9px] font-black uppercase tracking-widest text-center">Nincs élő meccs</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Action Buttons Section */}
      <div className="space-y-3 px-1">
        <div className="grid grid-cols-2 gap-3">
          <button className={`border font-black py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 group ${isDarkMode ? 'bg-[#16161d] border-orange-500/30 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-white border-orange-100 text-orange-600 shadow-sm'}`}>
            <i className="ph ph-bold ph-trophy group-hover:scale-110 transition-transform text-lg"></i>
            Ranglista
          </button>
          <button className={`border font-black py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 group ${isDarkMode ? 'bg-[#16161d] border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-white border-purple-100 text-purple-600 shadow-sm'}`}>
            <i className="ph ph-bold ph-medal group-hover:scale-110 transition-transform text-lg"></i>
            Kiemeltek
          </button>
        </div>
        <button className={`w-full border font-black py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 ${isDarkMode ? 'bg-blue-500/5 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white border-blue-100 text-blue-600 shadow-sm'}`}>
          <i className="ph ph-bold ph-scroll text-lg"></i>
          Házirend & Szabályzat
        </button>
      </div>
    </div>
  );
};

export default HubView;
