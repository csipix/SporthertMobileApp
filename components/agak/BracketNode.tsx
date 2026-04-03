
import React from 'react';
import { Match } from '../../hooks/useBracketLayout';

interface BracketNodeProps {
  x: number;
  y: number;
  data: Match;
  color: string;
  selectedClass: string;
}

const BracketNode: React.FC<BracketNodeProps> = ({ x, y, data, color, selectedClass }) => {
  const winnerA = data.isFinished && (data.scoreA || 0) > (data.scoreB || 0);
  const winnerB = data.isFinished && (data.scoreB || 0) > (data.scoreA || 0);

  const isSelected = (data.teamA === selectedClass) || (data.teamB === selectedClass);

  return (
    <foreignObject 
      x={x - 180} 
      y={y - 80} 
      width="360" 
      height="160"
      className="overflow-visible"
    >
      <div 
        className={`w-[360px] rounded-2xl border-2 overflow-hidden transition-all duration-500 shadow-2xl pointer-events-auto bg-white dark:bg-[#16161d]
          ${isSelected ? 'scale-[1.08] z-50 border-opacity-100' : 'scale-100 border-opacity-20'}
          ${isSelected ? 'animate-neon-pulse' : ''}`}
        style={{ 
          borderColor: isSelected ? color : `${color}30`,
          boxShadow: isSelected ? `0 0 40px ${color}60` : ''
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5">
          <span className="text-[13px] font-black uppercase tracking-widest truncate pr-2 text-slate-500 dark:text-white/40">
            {data.round}
          </span>
          {data.isFinished && <i className="ph-fill ph-check-circle text-green-500 text-base"></i>}
        </div>
        
        {/* Teams Section */}
        <div className="p-5 space-y-5">
          <div className="flex justify-between items-center h-7">
            <span className={`text-[18px] font-bold truncate flex-grow pr-3 transition-opacity duration-300
              ${winnerA ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/30'}`}>
              {data.teamA || 'TBD'}
            </span>
            <span className={`text-xl font-black w-12 text-right ${winnerA ? '' : 'text-slate-400 dark:text-white/20'}`} style={{color: winnerA ? color : ''}}>
              {data.scoreA ?? '-'}
            </span>
          </div>
          <div className="flex justify-between items-center h-7">
            <span className={`text-[18px] font-bold truncate flex-grow pr-3 transition-opacity duration-300
              ${winnerB ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/30'}`}>
              {data.teamB || 'TBD'}
            </span>
            <span className={`text-xl font-black w-12 text-right ${winnerB ? '' : 'text-slate-400 dark:text-white/20'}`} style={{color: winnerB ? color : ''}}>
              {data.scoreB ?? '-'}
            </span>
          </div>
        </div>
      </div>
    </foreignObject>
  );
};

export default React.memo(BracketNode);
