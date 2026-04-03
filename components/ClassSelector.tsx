
import React from 'react';
import { LOGO_BASE64 } from '../constants';

interface ClassSelectorProps {
  onSelect: (className: string) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelect }) => {
  const grades = [9, 10, 11, 12];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  
  const generatedClasses: string[] = [];
  grades.forEach(grade => {
    sections.forEach(section => {
      generatedClasses.push(`${grade}.${section}`);
    });
  });

  return (
    <div className="fixed inset-0 z-[200] flex flex-col p-4 animate-fadeIn overflow-hidden transition-colors duration-500 bg-[#f1f5f9] dark:bg-[#0d0d12]">
      <div className="mt-2 mb-2 text-center flex-shrink-0">
        <div className="w-14 h-14 rounded-full mx-auto mb-1 flex items-center justify-center overflow-hidden transition-all duration-700 border-2 bg-white dark:bg-[#afde33] border-slate-100 dark:border-white/10 shadow-md dark:shadow-[0_0_15px_rgba(175,222,51,0.3)]">
          <img 
            src={LOGO_BASE64} 
            alt="Sporthét Logo" 
            className="w-full h-full object-cover scale-110"
          />
        </div>
        
        <h1 className="text-2xl font-black italic uppercase transition-all duration-500 tracking-tighter text-slate-900 dark:text-white [text-shadow:2px_2px_4px_rgba(0,0,0,0.1)] dark:[text-shadow:0_0_5px_rgba(255,255,255,0.2),0_0_10px_#afde33]">
          SPORTHÉT
        </h1>
        
        <p className="font-bold text-[8px] uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500">
          Válaszd ki az osztályod
        </p>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pb-4">
        <div className="grid grid-cols-2 gap-3">
          {generatedClasses.map((cls) => (
            <button
              key={cls}
              onClick={() => onSelect(cls)}
              className="border-2 active:scale-95 transition-all py-4 rounded-[1.5rem] text-lg font-black flex items-center justify-center bg-white dark:bg-[#16161d] border-slate-100 dark:border-white/5 text-slate-500 dark:text-gray-300 dark:hover:text-white shadow-sm dark:shadow-lg"
            >
              {cls}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-shrink-0 text-center py-2">
        <div className="w-1 h-1 mx-auto rounded-full animate-bounce bg-slate-300 dark:bg-orange-500/50"></div>
      </div>
    </div>
  );
};

export default ClassSelector;
