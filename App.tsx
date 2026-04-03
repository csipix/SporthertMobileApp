
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AgakView from './components/AgakView';
import SajatView from './components/SajatView';
import HubView from './components/HubView';
import ClassSelector from './components/ClassSelector';
import { ViewType } from './types';
import { useModalHistory } from './hooks/useModalHistory';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.SAJAT);
  const [selectedClass, setSelectedClass] = useState<string | null>(localStorage.getItem('selected_class'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [isImmersive, setIsImmersive] = useState(false);

  useModalHistory(showNotifications, () => setShowNotifications(false));

  useEffect(() => {
    if (activeView !== ViewType.AGAK) {
      setIsImmersive(false);
    }
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0d0d12';
      document.documentElement.style.color = 'white';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#f1f5f9';
      document.documentElement.style.color = '#0f172a';
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#0d0d12' : '#f1f5f9');
    }
  }, [isDarkMode]);

  const handleClassSelect = (className: string) => {
    localStorage.setItem('selected_class', className);
    setSelectedClass(className);
  };

  const handleChangeClass = () => {
    localStorage.removeItem('selected_class');
    setSelectedClass(null);
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const renderView = () => {
    switch (activeView) {
      case ViewType.AGAK:
        return (
          <AgakView 
            selectedClass={selectedClass || ''} 
            onClose={() => setActiveView(ViewType.SAJAT)} 
            onImmersiveChange={setIsImmersive}
          />
        );
      case ViewType.SAJAT:
        return <SajatView selectedClass={selectedClass || ''} />;
      case ViewType.HUB:
        return <HubView />;
      default:
        return <SajatView selectedClass={selectedClass || ''} />;
    }
  };

  if (!selectedClass) {
    return <ClassSelector onSelect={handleClassSelect} />;
  }

  const isNoScroll = isImmersive || activeView === ViewType.HUB;

  return (
    <div className="h-[100dvh] flex flex-col max-w-2xl mx-auto transition-colors duration-500 bg-[#f1f5f9] dark:bg-[#0d0d12] text-slate-900 dark:text-white selection:bg-orange-500/20 overflow-hidden">
      {!isImmersive && (
        <Header 
          onClassChange={handleChangeClass} 
          onNotificationsClick={() => {
            window.history.pushState({ modal: 'notifications' }, '');
            setShowNotifications(true);
          }}
          onToggleTheme={toggleTheme}
        />
      )}
      
      <main className="flex-grow relative p-0 h-full flex flex-col overflow-hidden">
        {renderView()}
      </main>

      {!isImmersive && (
        <Footer activeView={activeView} onViewChange={setActiveView} />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={() => window.history.back()}>
          <div 
            className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slideUp border bg-white dark:bg-[#16161d] border-slate-200 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
              <i className="ph-fill ph-bell text-blue-500 text-3xl"></i>
              Értesítések
            </h2>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-gray-200">Sikeres regisztráció!</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 uppercase font-black">Ma • 08:30</p>
                </div>
              </div>
              <div className="text-center py-10 opacity-30 italic text-sm text-slate-900 dark:text-white">
                Nincs több értesítés...
              </div>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="mt-4 w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
            >
              BEZÁRÁS
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes neon-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
        }
        .animate-neon-pulse { animation: neon-pulse 2s infinite ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
