
import { useMemo } from 'react';

export interface Match {
  id: string;
  sport: string;
  round: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  nextMatchId?: string;
  isFinished: boolean;
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  data: Match;
}

export interface Edge {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  contentWidth: number;
  contentHeight: number;
}

const ROUND_GAP = 480;
const NODE_Y_GAP = 220;

export const useBracketLayout = (matches: Match[]) => {
  return useMemo(() => {
    if (!matches || matches.length === 0) return { nodes: [], edges: [], bounds: null };

    // 1. Parent Map építése (O(n))
    const parentMap = new Map<string, Match[]>();
    matches.forEach(m => {
      if (m.nextMatchId) {
        if (!parentMap.has(m.nextMatchId)) parentMap.set(m.nextMatchId, []);
        parentMap.get(m.nextMatchId)!.push(m);
      }
    });

    // 2. Memoizált Depth számítás
    const depthCache = new Map<string, number>();
    const getDepth = (matchId: string): number => {
      if (depthCache.has(matchId)) return depthCache.get(matchId)!;
      const parents = parentMap.get(matchId) || [];
      if (parents.length === 0) return 0;
      const d = 1 + Math.max(...parents.map(p => getDepth(p.id)));
      depthCache.set(matchId, d);
      return d;
    };

    const finalMatch = matches.find(m => m.round.toLowerCase().includes('döntő') && !m.round.toLowerCase().includes('bronz')) || matches[0];
    const maxDepth = getDepth(finalMatch.id);
    
    const nodes: PositionedNode[] = [];
    const edges: Edge[] = [];

    const positionMatch = (matchId: string, depth: number, slotIndex: number, side: 'left' | 'right' | 'center') => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const x = side === 'left' ? -depth * ROUND_GAP : (side === 'right' ? depth * ROUND_GAP : 0);
      const y = slotIndex * NODE_Y_GAP;

      nodes.push({ id: match.id, x, y, data: match });

      const parents = parentMap.get(matchId) || [];
      
      parents.forEach((parent, idx) => {
        let nextSide = side;
        let nextSlotIndex = slotIndex;

        if (side === 'center') {
          nextSide = idx === 0 ? 'left' : 'right';
          nextSlotIndex = 0; 
        } else {
          const offset = Math.pow(2, maxDepth - depth - 1);
          nextSlotIndex = slotIndex + (idx === 0 ? -offset : offset);
        }
        
        positionMatch(parent.id, depth + 1, nextSlotIndex, nextSide);

        const parentX = nextSide === 'left' ? -(depth + 1) * ROUND_GAP : (depth + 1) * ROUND_GAP;
        const parentY = nextSlotIndex * NODE_Y_GAP;
        
        edges.push({
          id: `edge-${parent.id}-${match.id}`,
          fromX: parentX,
          fromY: parentY,
          toX: x,
          toY: y
        });
      });
    };

    // Indítás a döntőtől középen
    positionMatch(finalMatch.id, 0, 0, 'center');

    // 2. Bronzmeccs kezelése (ha van)
    const bronzeMatch = matches.find(m => m.round.toLowerCase().includes('bronz'));
    if (bronzeMatch) {
      const finalNode = nodes.find(n => n.id === finalMatch.id);
      if (finalNode) {
        const x = finalNode.x;
        const y = finalNode.y + (NODE_Y_GAP * 1.5); // Kicsivel a döntő alá
        nodes.push({ id: bronzeMatch.id, x, y, data: bronzeMatch });
      }
    }

    // 3. Határok számítása
    const nodesX = nodes.map(n => n.x);
    const nodesY = nodes.map(n => n.y);
    
    const minNodeX = Math.min(...nodesX);
    const maxNodeX = Math.max(...nodesX);
    const minNodeY = Math.min(...nodesY);
    const maxNodeY = Math.max(...nodesY);

    const contentWidth = maxNodeX - minNodeX;
    const contentHeight = maxNodeY - minNodeY;

    // Hatalmas virtuális vászon (World) a "Fancy Camera" élményhez
    const worldPaddingX = 5000; 
    const worldPaddingY = 3000;

    const width = contentWidth + (worldPaddingX * 2);
    const height = contentHeight + (worldPaddingY * 2);

    // Normalizálás: A tartalom közepe legyen a világ közepe
    const offsetX = worldPaddingX - minNodeX;
    const offsetY = worldPaddingY - minNodeY;

    nodes.forEach(n => {
      n.x += offsetX;
      n.y += offsetY;
    });
    edges.forEach(e => {
      e.fromX += offsetX;
      e.fromY += offsetY;
      e.toX += offsetX;
      e.toY += offsetY;
    });

    const bounds: WorldBounds = {
      minX: 0,
      maxX: width,
      minY: 0,
      maxY: height,
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      contentWidth,
      contentHeight
    };

    return { nodes, edges, bounds };
  }, [matches]);
};
