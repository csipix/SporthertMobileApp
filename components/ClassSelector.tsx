
import React from 'react';
import { LOGO_BASE64 } from '../constants';

interface ClassSelectorProps {
  onSelect: (className: string) => void;
  isDarkMode: boolean;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelect, isDarkMode }) => {
  const grades = [9, 10, 11, 12];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  
  const generatedClasses: string[] = [];
  grades.forEach(grade => {
    sections.forEach(section => {
      generatedClasses.push(`${grade}.${section}`);
    });
  });

  // Neon stílus sötét módhoz, lágy árnyék világoshoz
  const textStyle = isDarkMode 
    ? { textShadow: '0 0 10px rgba(255,255,255,0.2), 0 0 20px #afde33, 0 0 40px rgba(175,222,51,0.6)' }
    : { textShadow: '4px 4px 8px rgba(0,0,0,0.1)' };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col p-8 animate-fadeIn overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0d0d12]' : 'bg-[#f1f5f9]'}`}>
      <div className="mt-12 mb-10 text-center flex-shrink-0">
        <div className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center overflow-hidden transition-all duration-700 border-4 ${
          isDarkMode 
            ? 'bg-[#afde33] border-white/10 shadow-[0_0_50px_rgba(175,222,51,0.3)]' 
            : 'bg-white border-slate-100 shadow-2xl shadow-slate-300'
        }`}>
          <img 
            src={LOGO_BASE64} 
            alt="Sporthét Logo" 
            className="w-full h-full object-cover scale-110"
          />
        </div>
        
        {/* Neon hatású felirat */}
        <h1 className={`text-5xl font-black italic uppercase transition-all duration-500 tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
            style={textStyle}>
          SPORTHÉT
        </h1>
        
        <p className={`mt-3 font-bold text-xs uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
          Válaszd ki az osztályod
        </p>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pb-10">
        <div className="grid grid-cols-2 gap-4">
          {generatedClasses.map((cls) => (
            <button
              key={cls}
              onClick={() => onSelect(cls)}
              className={`border-2 active:scale-95 transition-all py-6 rounded-[2rem] text-xl font-black flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-[#16161d] border-white/5 text-gray-300 hover:text-white hover:border-orange-500/30 shadow-lg' 
                  : 'bg-white border-slate-100 text-slate-500 shadow-sm shadow-slate-200 hover:border-orange-500/50'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-shrink-0 text-center py-6">
        <div className={`w-1.5 h-1.5 mx-auto rounded-full animate-bounce ${isDarkMode ? 'bg-orange-500/50' : 'bg-slate-300'}`}></div>
      </div>
    </div>
  );
};

export default ClassSelector;
