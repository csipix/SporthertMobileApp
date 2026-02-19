
import React from 'react';
import { ViewType } from '../types';

interface FooterProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isDarkMode: boolean;
}

const Footer: React.FC<FooterProps> = ({ activeView, onViewChange, isDarkMode }) => {
  const tabs = [
    { id: ViewType.AGAK, label: 'Ágak', icon: 'ph-squares-four' },
    { id: ViewType.SAJAT, label: 'Saját', icon: 'ph-calendar-blank' },
    { id: ViewType.HUB, label: 'Hub', icon: 'ph-house' },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 safe-bottom transition-colors duration-500 border-t ${isDarkMode ? 'bg-[#16161d] border-white/5' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-16 relative ${
              activeView === tab.id 
                ? 'text-blue-500' 
                : (isDarkMode ? 'text-gray-500' : 'text-slate-400')
            }`}
          >
            <i className={`ph-bold ${tab.icon} text-xl`}></i>
            <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
            {activeView === tab.id && (
              <div className="absolute -bottom-1 w-8 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Footer;
