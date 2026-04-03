
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { WorldBounds, PositionedNode, Edge } from '../../hooks/useBracketLayout';
import BracketStage from './BracketStage';

interface BracketViewportProps {
  nodes: PositionedNode[];
  edges: Edge[];
  bounds: WorldBounds;
  color: string;
  selectedClass: string;
}

// --- BIZTONSÁGI KAR (SAFETY LEVER) ---
// Ha bármi hiba van a határvédelemmel, állítsd ezt false-ra!
const ENABLE_ADVANCED_BOUNDARIES = true; 

const BracketViewport: React.FC<BracketViewportProps> = ({ nodes, edges, bounds, color, selectedClass }) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialScale, setInitialScale] = useState(1);
  const isAdjusting = useRef(false);

  // Initial Fit számítása: A tényleges TARTALOMRA (meccsekre) zoomolunk
  const calculateInitialFit = useCallback(() => {
    if (!containerRef.current || !bounds) return;

    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
    
    // A felhasználó kérése: a tetejét és alját majdnem érje el (kis paddinggel)
    // 80px függőleges padding (40-40 alul-felül)
    const scaleY = containerHeight / (bounds.contentHeight + 80);
    
    // Vízszintesen is megnézzük, de a függőleges az elsődleges
    const scaleX = containerWidth / (bounds.contentWidth + 100);
    
    // Úgy választunk skálát, hogy függőlegesen kitöltse, de ne legyen abszurd a zoom
    const fitScale = Math.min(scaleY, scaleX * 1.5); 
    const finalScale = Math.max(Math.min(fitScale, 0.5), 0.05);

    setInitialScale(finalScale);

    if (transformRef.current) {
      const { setTransform } = transformRef.current;
      // A világ közepére (ahol a tartalom van) ugrunk azonnal
      const tx = containerWidth / 2 - bounds.centerX * finalScale;
      const ty = containerHeight / 2 - bounds.centerY * finalScale;
      setTransform(tx, ty, finalScale, 0);
    }
  }, [bounds]);

  // ResizeObserver: Ha változik a kijelző mérete, igazítsunk újra
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => calculateInitialFit());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculateInitialFit]);

  // Első betöltéskor azonnali igazítás
  useEffect(() => {
    calculateInitialFit();
  }, [calculateInitialFit]);

  // --- HALADÓ HATÁRVÉDELEM (SOFT BOUNDARIES) ---
  const handleTransform = (ref: ReactZoomPanPinchRef) => {
    if (!containerRef.current) return;
    
    // LoD frissítés
    containerRef.current.style.setProperty('--zoom-level', ref.state.scale.toString());

    if (!ENABLE_ADVANCED_BOUNDARIES || isAdjusting.current) return;

    const { scale, positionX, positionY } = ref.state;
    const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();

    // Mennyire kényszerítsük az átfedést (pixelben)
    // A negatív érték azt jelenti, hogy ennyi pixelnek MINIMUM látszódnia kell a tartalomból
    const minOverlap = 150 * scale; 

    // A tartalom tényleges szélei a 10.000px-es világban
    const actualContentLeft = (bounds.width - bounds.contentWidth) / 2;
    const actualContentRight = actualContentLeft + bounds.contentWidth;
    const actualContentTop = (bounds.height - bounds.contentHeight) / 2;
    const actualContentBottom = actualContentTop + bounds.contentHeight;

    // Aktuális nézet határai világ-koordinátákban
    const viewLeft = -positionX / scale;
    const viewRight = (cW - positionX) / scale;
    const viewTop = -positionY / scale;
    const viewBottom = (cH - positionY) / scale;

    let nextX = positionX;
    let nextY = positionY;
    let needsAdjustment = false;

    // Szigorú ellenőrzés: Ha a nézet elhagyná a tartalmat úgy, hogy kevesebb mint minOverlap maradna
    if (viewLeft > actualContentRight - minOverlap / scale) { 
      nextX = -(actualContentRight - minOverlap / scale) * scale; 
      needsAdjustment = true; 
    }
    if (viewRight < actualContentLeft + minOverlap / scale) { 
      nextX = cW - (actualContentLeft + minOverlap / scale) * scale; 
      needsAdjustment = true; 
    }
    if (viewTop > actualContentBottom - minOverlap / scale) { 
      nextY = -(actualContentBottom - minOverlap / scale) * scale; 
      needsAdjustment = true; 
    }
    if (viewBottom < actualContentTop + minOverlap / scale) { 
      nextY = cH - (actualContentTop + minOverlap / scale) * scale; 
      needsAdjustment = true; 
    }

    if (needsAdjustment) {
      isAdjusting.current = true;
      ref.setTransform(nextX, nextY, scale, 300, "easeOutQuad");
      setTimeout(() => { isAdjusting.current = false; }, 350);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative transition-colors duration-500 bg-[#f1f5f9] dark:bg-[#0d0d12]">
      <TransformWrapper
        key={`${bounds.width}-${bounds.height}`}
        ref={transformRef}
        initialScale={initialScale}
        minScale={0.05}
        maxScale={0.6}
        centerOnInit={false} 
        limitToBounds={false} 
        centerZoomedOut={false}
        onTransformed={handleTransform}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: false }}
      >
        <TransformComponent 
          wrapperClass="!w-full !h-full" 
          contentClass="!w-auto !h-auto"
        >
          <BracketStage 
            nodes={nodes} 
            edges={edges} 
            bounds={bounds} 
            color={color} 
            selectedClass={selectedClass}
          />
        </TransformComponent>
      </TransformWrapper>

      {/* Camera Reset Button */}
      <div className="absolute bottom-20 inset-x-0 flex justify-center z-50 pointer-events-auto">
        <button 
          onClick={() => calculateInitialFit()}
          className="w-14 h-14 flex items-center justify-center rounded-full backdrop-blur-xl border shadow-2xl transition-all active:scale-90 bg-white/80 dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-white/10"
          title="Reset View"
        >
          <i className="ph ph-arrows-counter-clockwise text-2xl"></i>
        </button>
      </div>
    </div>
  );
};

export default BracketViewport;
