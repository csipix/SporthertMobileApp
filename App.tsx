
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AgakView from './components/AgakView';
import SajatView from './components/SajatView';
import HubView from './components/HubView';
import ClassSelector from './components/ClassSelector';
import { ViewType } from './types';
import { useModalHistory } from './hooks/useModalHistory';
import { getNotificationPreferences, saveNotificationPreferences, setupForegroundListener } from './services/notifications';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.SAJAT);
  const [selectedClass, setSelectedClass] = useState<string | null>(localStorage.getItem('selected_class'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [isImmersive, setIsImmersive] = useState(false);
  
  const [notifState, setNotifState] = useState<{classMatch: boolean, news: boolean, targetClasses: string[]}>({ classMatch: false, news: false, targetClasses: [] });
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  useModalHistory(showNotifications, () => setShowNotifications(false));

  useEffect(() => {
    setupForegroundListener();
  }, []);

  useEffect(() => {
    if (showNotifications) {
      getNotificationPreferences().then(prefs => {
        if (prefs) {
          setNotifState({ classMatch: prefs.classMatch, news: prefs.news, targetClasses: prefs.targetClasses });
        }
      });
    }
  }, [showNotifications]);

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

  const handleClassSelect = async (className: string) => {
    localStorage.setItem('selected_class', className);
    setSelectedClass(className);
  };

  const handleNotifToggle = async (type: 'classMatch' | 'news') => {
    const newState = { ...notifState, [type]: !notifState[type] };
    setNotifState(newState);
    setIsSavingNotif(true);
    
    if (newState[type] && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'denied') {
           setNotifState({ ...newState, [type]: false });
           setIsSavingNotif(false);
           alert('Az értesítések engedélyezése elutasítva. Kérlek engedélyezd a böngésző beállításaiban.');
           return;
        }
      }
    }
    
    await saveNotificationPreferences({
      ...newState,
      targetClasses: notifState.targetClasses
    });
    
    setIsSavingNotif(false);
  };

  const handleSubscribeToClass = async (className: string) => {
    setIsSavingNotif(true);
    
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'denied') {
           setIsSavingNotif(false);
           alert('Az értesítések engedélyezése elutasítva. Kérlek engedélyezd a böngésző beállításaiban.');
           return;
        }
      }
    }

    if (!notifState.targetClasses.includes(className)) {
      const newClasses = [...notifState.targetClasses, className];
      const newState = { ...notifState, classMatch: true, targetClasses: newClasses };
      setNotifState(newState);
      await saveNotificationPreferences(newState);
    }
    setIsSavingNotif(false);
  };

  const handleUnsubscribeFromClass = async (className: string) => {
    setIsSavingNotif(true);
    const newClasses = notifState.targetClasses.filter(c => c !== className);
    const newState = { ...notifState, classMatch: newClasses.length > 0, targetClasses: newClasses };
    setNotifState(newState);
    await saveNotificationPreferences(newState);
    setIsSavingNotif(false);
  };

  const handleUnsubscribeAll = async () => {
    setIsSavingNotif(true);
    const newState = { classMatch: false, news: false, targetClasses: [] };
    setNotifState(newState);
    await saveNotificationPreferences(newState);
    setIsSavingNotif(false);
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
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-gray-200">Osztálymérkőzések</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 uppercase font-black">10 perccel a meccsek előtt szólunk</p>
                  </div>
                  {selectedClass ? (
                    !notifState.targetClasses.includes(selectedClass) ? (
                      <button 
                        onClick={() => handleSubscribeToClass(selectedClass)}
                        disabled={isSavingNotif}
                        className="mt-2 py-2.5 px-4 bg-blue-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <i className="ph-bold ph-plus"></i>
                        Feliratkozás: {selectedClass}
                      </button>
                    ) : (
                      <div className="mt-2 py-2.5 px-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 border border-emerald-500/20">
                        <i className="ph-bold ph-check"></i>
                        Követed: {selectedClass}
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-orange-500 mt-2 font-medium">Válassz egy osztályt a főoldalon a feliratkozáshoz.</p>
                  )}
                </div>

                {notifState.targetClasses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <p className="text-[10px] uppercase font-black tracking-wider mb-3 text-slate-500 dark:text-white/50">Követett osztályok:</p>
                    <div className="flex flex-wrap gap-2">
                      {notifState.targetClasses.map(cls => (
                        <div key={cls} className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 pl-3 pr-1 py-1 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-500/30">
                          <span>{cls}</span>
                          <button 
                            onClick={() => handleUnsubscribeFromClass(cls)} 
                            disabled={isSavingNotif} 
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors text-slate-500 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center"
                          >
                            <i className="ph-bold ph-x"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-gray-200">Hírek és bejelentések</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 uppercase font-black">Általános információk</p>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-slate-300 dark:bg-slate-700">
                   <input 
                     type="checkbox" 
                     className="peer opacity-0 w-0 h-0" 
                     checked={notifState.news}
                     onChange={() => handleNotifToggle('news')}
                     disabled={isSavingNotif}
                   />
                   <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 peer-checked:bg-blue-500"></span>
                   <span className="absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-all duration-300 peer-checked:translate-x-6"></span>
                </div>
              </label>
            </div>
            
            <div className="text-center py-6 opacity-30 italic text-sm text-slate-900 dark:text-white">
              Saját értesítések története jön ide...
            </div>
            
            <button 
              onClick={handleUnsubscribeAll}
              disabled={isSavingNotif}
              className="mt-2 w-full py-4 bg-red-500/10 text-red-500 dark:text-red-400 font-black rounded-2xl shadow-sm active:scale-95 transition-all uppercase tracking-widest border border-red-500/20 disabled:opacity-50"
            >
              Mindenről leiratkozom
            </button>
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
