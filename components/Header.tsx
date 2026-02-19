
import React, { useState, useRef, useEffect } from 'react';
import { LOGO_BASE64 } from '../constants';

interface HeaderProps {
  onClassChange: () => void;
  onNotificationsClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClassChange, onNotificationsClick, isDarkMode, onToggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Neon stílus sötét módhoz, lágy árnyék világoshoz a feliratnak
  const textStyle = isDarkMode 
    ? { textShadow: '0 0 7px rgba(255,255,255,0.3), 0 0 10px #afde33, 0 0 21px #afde33' }
    : { textShadow: '2px 2px 4px rgba(0,0,0,0.15)' };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[60] safe-top h-16 transition-colors duration-500 ${isDarkMode ? 'bg-[#0d0d12]/90 border-white/5' : 'bg-white/90 border-slate-200'} backdrop-blur-md border-b`}>
      <div className="flex items-center justify-between px-6 h-full max-w-2xl mx-auto relative">
        
        {/* Bal oldal: Logo */}
        <div className="flex-1 flex items-center">
          <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all ring-1 ${
            isDarkMode 
              ? 'bg-[#afde33] ring-white/20 shadow-[0_0_15px_rgba(175,222,51,0.4)]' 
              : 'bg-white ring-slate-100 shadow-sm'
          }`}>
             <img 
               src={LOGO_BASE64} 
               alt="Logo" 
               className="w-full h-full object-cover scale-110"
             />
          </div>
        </div>

        {/* Közép: App név neon hatással */}
        <div className="flex-grow text-center">
          <h1 className={`text-xl font-black italic uppercase tracking-tighter transition-all duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
              style={textStyle}>
            SPORTHÉT
          </h1>
        </div>

        {/* Jobb oldal: Menu */}
        <div className="flex-1 flex justify-end" ref={menuRef}>
          <div className="relative flex items-center justify-center">
            <div className={`absolute top-0 right-0 border shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-[1.5rem] ${isDarkMode ? 'bg-[#1e1e26] border-white/10' : 'bg-white border-slate-200'} ${isOpen ? 'h-[170px] w-12 opacity-100' : 'h-12 w-12 opacity-0 pointer-events-none'}`}></div>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`relative z-20 w-12 h-12 flex items-center justify-center transition-all duration-300 rounded-full active:scale-90 ${
                isOpen 
                  ? 'text-[#afde33] drop-shadow-[0_0_8px_rgba(175,222,51,0.8)]' 
                  : (isDarkMode ? 'text-gray-400' : 'text-slate-400')
              }`}
            >
              <i className={`ph-bold ph-gear-six text-2xl transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`}></i>
            </button>
            <div className={`absolute top-12 right-0 z-20 flex flex-col items-center transition-all duration-300 origin-top w-12 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-4 pointer-events-none'}`}>
              <button onClick={() => { onToggleTheme(); setIsOpen(false); }} className={`w-12 h-10 flex items-center justify-center text-gray-400 transition-all active:scale-90 ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}><i className={`ph-bold ${isDarkMode ? 'ph-sun' : 'ph-moon'} text-xl`}></i></button>
              <button onClick={() => { onNotificationsClick(); setIsOpen(false); }} className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all active:scale-90"><i className="ph-bold ph-bell text-xl"></i></button>
              <button onClick={() => { onClassChange(); setIsOpen(false); }} className="w-12 h-10 flex items-center justify-center text-gray-400 hover:text-[#afde33] transition-all active:scale-90"><i className="ph-bold ph-pencil-line text-xl"></i></button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
