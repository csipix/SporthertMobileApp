
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AgakView from './components/AgakView';
import SajatView from './components/SajatView';
import HubView from './components/HubView';
import ClassSelector from './components/ClassSelector';
import { ViewType } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.SAJAT);
  const [selectedClass, setSelectedClass] = useState<string | null>(localStorage.getItem('selected_class'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? '#0d0d12' : '#f1f5f9';
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
        return <AgakView isDarkMode={isDarkMode} />;
      case ViewType.SAJAT:
        return <SajatView selectedClass={selectedClass || ''} isDarkMode={isDarkMode} />;
      case ViewType.HUB:
        return <HubView isDarkMode={isDarkMode} />;
      default:
        return <SajatView selectedClass={selectedClass || ''} isDarkMode={isDarkMode} />;
    }
  };

  if (!selectedClass) {
    return <ClassSelector onSelect={handleClassSelect} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`h-screen flex flex-col max-w-2xl mx-auto transition-colors duration-500 ${isDarkMode ? 'bg-[#0d0d12] text-white' : 'bg-[#f1f5f9] text-slate-900'} selection:bg-orange-500/20 overflow-hidden`}>
      <Header 
        onClassChange={handleChangeClass} 
        onNotificationsClick={() => setShowNotifications(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      
      <main className={`flex-grow relative px-4 pt-20 pb-20 no-scrollbar overflow-y-auto h-full flex flex-col ${activeView === ViewType.AGAK ? 'overflow-hidden' : ''}`}>
        {renderView()}
      </main>

      <Footer activeView={activeView} onViewChange={setActiveView} isDarkMode={isDarkMode} />

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={() => setShowNotifications(false)}>
          <div 
            className={`${isDarkMode ? 'bg-[#16161d]' : 'bg-white'} w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slideUp border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-12 h-1.5 ${isDarkMode ? 'bg-gray-700' : 'bg-slate-200'} rounded-full mx-auto mb-6`}></div>
            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <i className="ph-fill ph-bell text-blue-500 text-3xl"></i>
              Értesítések
            </h2>
            <div className="space-y-4 py-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} flex items-start gap-4`}>
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>Sikeres regisztráció!</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'} mt-1 uppercase font-black`}>Ma • 08:30</p>
                </div>
              </div>
              <div className={`text-center py-10 opacity-30 italic text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Nincs több értesítés...
              </div>
            </div>
            <button 
              onClick={() => setShowNotifications(false)}
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
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
