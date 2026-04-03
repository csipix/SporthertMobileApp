
import React from 'react';
import { PositionedNode, Edge, WorldBounds } from '../../hooks/useBracketLayout';
import BracketNode from './BracketNode';

interface BracketStageProps {
  nodes: PositionedNode[];
  edges: Edge[];
  bounds: WorldBounds;
  color: string;
  selectedClass: string;
}

const BracketStage: React.FC<BracketStageProps> = ({ nodes, edges, bounds, color, selectedClass }) => {
  const CORNER_RADIUS = 20;

  // Segédfüggvény a lekerekített derékszögű vonalakhoz
  const generateOrthogonalPath = (edge: Edge) => {
    const { fromX, fromY, toX, toY } = edge;
    
    // A töréspont (midX) számítása az iránytól függően
    // Ha a szülő balra van (fromX < toX), akkor jobbra haladunk a döntő felé
    // Ha a szülő jobbra van (fromX > toX), akkor balra haladunk a döntő felé
    const midX = fromX + (toX - fromX) / 2;
    
    // Ha egy vonalban vannak, sima egyenes
    if (Math.abs(fromY - toY) < 1) {
      return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }

    const directionY = toY > fromY ? 1 : -1;
    const directionX = toX > fromX ? 1 : -1;

    return `
      M ${fromX} ${fromY}
      L ${midX - (CORNER_RADIUS * directionX)} ${fromY}
      Q ${midX} ${fromY} ${midX} ${fromY + CORNER_RADIUS * directionY}
      L ${midX} ${toY - CORNER_RADIUS * directionY}
      Q ${midX} ${toY} ${midX + (CORNER_RADIUS * directionX)} ${toY}
      L ${toX} ${toY}
    `;
  };

  return (
    <svg 
      width={bounds.width} 
      height={bounds.height} 
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      className="block overflow-visible select-none touch-none"
    >
      <defs>
        {/* Grid Pattern Definiton */}
        <pattern 
          id="grid-pattern" 
          width="100" 
          height="100" 
          patternUnits="userSpaceOnUse"
        >
          <path 
            d="M 100 0 L 0 0 0 100" 
            fill="none" 
            strokeWidth="1.2" 
            className="stroke-black dark:stroke-white opacity-[0.08]"
          />
          <circle cx="0" cy="0" r="1.5" className="fill-black dark:fill-white opacity-[0.15]" />
        </pattern>
      </defs>

      {/* 0. Background Grid Layer - Massive area to feel infinite */}
      <rect 
        x="-50000" 
        y="-50000" 
        width="100000" 
        height="100000" 
        fill="url(#grid-pattern)" 
      />

      {/* 1. Edges Layer - Aura (halvány glow) */}
      <g className="edges-aura opacity-20">
        {edges.map(edge => (
          <path
            key={`aura-${edge.id}`}
            d={generateOrthogonalPath(edge)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* 2. Edges Layer - Core (éles vonal) */}
      <g className="edges-core opacity-40">
        {edges.map(edge => (
          <path
            key={`core-${edge.id}`}
            d={generateOrthogonalPath(edge)}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-white"
          />
        ))}
      </g>

      {/* 3. Nodes Layer */}
      <g className="nodes-layer">
        {nodes.map(node => (
          <BracketNode
            key={node.id}
            x={node.x}
            y={node.y}
            data={node.data}
            color={color}
            selectedClass={selectedClass}
          />
        ))}
      </g>
    </svg>
  );
};

export default React.memo(BracketStage);
