import React from 'react';
import { EvolvedWeaponId } from '../game/types';
import { EVOLVED_WEAPON_DEFINITIONS } from '../game/weapons';

interface EvolutionBannerProps {
  evolvedId: EvolvedWeaponId | null;
}

export const EvolutionBanner: React.FC<EvolutionBannerProps> = ({ evolvedId }) => {
  if (!evolvedId) return null;
  const def = EVOLVED_WEAPON_DEFINITIONS[evolvedId];
  if (!def) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center p-8 rounded-2xl bg-black/90 border border-fuchsia-500 shadow-2xl shadow-purple-500/50 backdrop-blur-xl max-w-lg text-center transform scale-105 animate-pulse">
        <div className="text-xs font-mono font-bold tracking-widest text-fuchsia-400 uppercase mb-1">
          ✦ EVOLUCIÓN DE ARMA COMPLETADA ✦
        </div>
        <div className="text-4xl my-2">{def.icon}</div>
        <h2 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-300 to-amber-300 uppercase tracking-wider">
          {def.name}
        </h2>
        <p className="text-slate-300 text-xs font-mono mt-2 max-w-sm">
          {def.description}
        </p>
      </div>
    </div>
  );
};
