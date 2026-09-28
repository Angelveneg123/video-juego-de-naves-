import React from 'react';
import { SectorId } from '../game/types';
import { SECTORS } from '../game/sectors';

interface SectorTransitionBannerProps {
  sectorId: SectorId | null;
}

export const SectorTransitionBanner: React.FC<SectorTransitionBannerProps> = ({ sectorId }) => {
  if (!sectorId) return null;
  const def = SECTORS[sectorId];
  if (!def) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center p-6 rounded-xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl shadow-cyan-500/30 backdrop-blur-xl max-w-md text-center">
        <div className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase mb-1">
          {def.subtitle}
        </div>
        <h2 className="text-3xl font-display font-extrabold text-slate-100 tracking-tight uppercase">
          {def.name}
        </h2>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">NIVEL DE AMENAZA:</span>
          <span className={`font-bold ${
            def.threatLevel === 'NIGHTMARE' || def.threatLevel === 'PESADILLA' ? 'text-fuchsia-400' :
            def.threatLevel === 'EXTREME' || def.threatLevel === 'EXTREMO' ? 'text-rose-400' :
            def.threatLevel === 'HIGH' || def.threatLevel === 'ALTO' ? 'text-amber-400' : 'text-cyan-400'
          }`}>
            {def.threatLevel}
          </span>
        </div>
      </div>
    </div>
  );
};
