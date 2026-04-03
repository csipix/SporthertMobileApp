
import React, { useState, useRef, useEffect } from 'react';
import { LOGO_BASE64 } from '../constants';
import { useModalHistory } from '../hooks/useModalHistory';

interface HeaderProps {
  onClassChange: () => void;
  onNotificationsClick: () => void;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClassChange, onNotificationsClick, onToggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useModalHistory(isOpen, () => setIsOpen(false));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (isOpen) {
          window.history.back();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] safe-top h-16 transition-colors duration-500 bg-white/90 dark:bg-[#0d0d12]/90 border-slate-200 dark:border-white/5 backdrop-blur-md border-b">
      <div className="flex items-center justify-between px-6 h-full max-w-2xl mx-auto relative">
        
        {/* Bal oldal: Logo */}
        <div className="flex-1 flex items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all ring-1 bg-white dark:bg-[#afde33] ring-slate-100 dark:ring-white/20 shadow-sm dark:shadow-[0_0_15px_rgba(175,222,51,0.4)]">
             <img 
               src={LOGO_BASE64} 
               alt="Logo" 
               className="w-full h-full object-cover scale-110"
             />
          </div>
        </div>

        {/* Közép: App név neon hatással */}
        <div className="flex-grow text-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter transition-all duration-500 text-slate-900 dark:text-white [text-shadow:2px_2px_4px_rgba(0,0,0,0.15)] dark:[text-shadow:0_0_7px_rgba(255,255,255,0.3),0_0_10px_#afde33,0_0_21px_#afde33]">
            SPORTHÉT
          </h1>
        </div>

        {/* Jobb oldal: Menu */}
        <div className="flex-1 flex justify-end" ref={menuRef}>
          <div className="relative flex items-center justify-center">
            <div className={`absolute top-0 right-0 border shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-[1.5rem] bg-white dark:bg-[#1e1e26] border-slate-200 dark:border-white/10 ${isOpen ? 'h-[170px] w-12 opacity-100' : 'h-12 w-12 opacity-0 pointer-events-none'}`}></div>
            <button 
              onClick={() => {
                if (!isOpen) {
                  window.history.pushState({ modal: 'settings' }, '');
                  setIsOpen(true);
                } else {
                  window.history.back();
                }
              }} 
              className={`relative z-20 w-12 h-12 flex items-center justify-center transition-all duration-300 rounded-full active:scale-90 ${
                isOpen 
                  ? 'text-[#afde33] drop-shadow-[0_0_8px_rgba(175,222,51,0.8)]' 
                  : 'text-slate-400 dark:text-gray-400'
              }`}
            >
              <i className={`ph-bold ph-gear-six text-2xl transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`}></i>
            </button>
            <div className={`absolute top-12 right-0 z-20 flex flex-col items-center transition-all duration-300 origin-top w-12 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-4 pointer-events-none'}`}>
              <button onClick={() => { window.history.back(); setTimeout(() => onToggleTheme(), 50); }} className="w-12 h-10 flex items-center justify-center transition-all active:scale-90 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"><i className="ph-bold ph-sun dark:ph-moon text-xl"></i></button>
              <button onClick={() => { window.history.back(); setTimeout(() => onNotificationsClick(), 50); }} className="w-12 h-10 flex items-center justify-center transition-all active:scale-90 hover:text-blue-500 text-slate-500 dark:text-gray-400"><i className="ph-bold ph-bell text-xl"></i></button>
              <button onClick={() => { window.history.back(); setTimeout(() => onClassChange(), 50); }} className="w-12 h-10 flex items-center justify-center transition-all active:scale-90 hover:text-[#afde33] text-slate-500 dark:text-gray-400"><i className="ph-bold ph-pencil-line text-xl"></i></button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
