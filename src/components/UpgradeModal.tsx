import React, { useEffect } from 'react';
import { UpgradeDef } from '../game/types';
import { RARITY_COLORS } from '../game/weapons';
import { Sparkles, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
  choices: UpgradeDef[];
  onSelect: (upgrade: UpgradeDef) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ choices, onSelect }) => {
  // Allow keyboard 1, 2, 3 selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && choices[0]) onSelect(choices[0]);
      if (e.key === '2' && choices[1]) onSelect(choices[1]);
      if (e.key === '3' && choices[2]) onSelect(choices[2]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [choices, onSelect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="flex flex-col items-center max-w-4xl w-full">
        {/* Modal Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold tracking-widest uppercase mb-1">
            <Sparkles className="w-4 h-4" /> Sistemas de la Nave Mejorados
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-slate-100 tracking-tight">
            Selecciona Aumento Tecnológico
          </h2>
          <p className="text-slate-400 text-xs font-mono mt-1">
            Presiona [1], [2], o [3] o haz clic para sintetizar mejora
          </p>
        </div>

        {/* 3 Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {choices.map((upgrade, idx) => {
            const style = RARITY_COLORS[upgrade.rarity];
            const raritySpanish = 
              upgrade.rarity === 'COMMON' ? 'COMÚN' :
              upgrade.rarity === 'RARE' ? 'RARO' :
              upgrade.rarity === 'EPIC' ? 'ÉPICO' :
              upgrade.rarity === 'LEGENDARY' ? 'LEGENDARIO' : 'VACÍO';

            return (
              <button
                key={upgrade.id}
                onClick={() => onSelect(upgrade)}
                className={`flex flex-col justify-between text-left p-5 rounded-xl border ${style.border} bg-gradient-to-b ${style.bgGradient} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl group cursor-pointer`}
              >
                <div>
                  {/* Top Badge & Shortcut */}
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className={`font-bold tracking-wider uppercase ${style.badge}`}>
                      {raritySpanish}
                    </span>
                    <span className="w-6 h-6 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                      {upgrade.icon}
                    </div>
                    <h3 className="font-display font-bold text-slate-100 text-base leading-tight group-hover:text-cyan-300 transition-colors">
                      {upgrade.name}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300 text-xs leading-relaxed mt-2 font-mono">
                    {upgrade.description}
                  </p>

                  {/* Evolution tag if core upgrade */}
                  {upgrade.evolutionFor && (
                    <div className="mt-3 p-2 rounded bg-purple-950/60 border border-purple-500/40 text-[11px] font-mono text-purple-300">
                      ✦ Desbloquea Evolución de Arma
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-cyan-400">
                  <span>Sintetizar</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
