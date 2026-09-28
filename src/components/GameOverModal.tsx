import React from 'react';
import { RunStatistics } from '../game/types';
import { RotateCcw, Wrench, Sparkles, Trophy } from 'lucide-react';

interface GameOverModalProps {
  stats: RunStatistics;
  isVictory?: boolean;
  onRestart: () => void;
  onOpenHangar: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, isVictory, onRestart, onOpenHangar }) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Grade evaluation
  let rank = 'C';
  let rankColor = 'text-slate-400';
  if (stats.score > 25000 || stats.bossesKilled >= 2) {
    rank = 'S';
    rankColor = 'text-amber-400';
  } else if (stats.score > 12000 || stats.bossesKilled >= 1) {
    rank = 'A';
    rankColor = 'text-purple-400';
  } else if (stats.score > 5000) {
    rank = 'B';
    rankColor = 'text-cyan-400';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Informe de Misión</span>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-slate-100 mt-0.5">
              {isVictory ? 'Sector Purificado' : 'Chasis Neutralizado'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Rango</span>
              <span className={`text-2xl font-display font-extrabold ${rankColor}`}>{rank}</span>
            </div>
          </div>
        </div>

        {/* Currency Awarded */}
        <div className="flex items-center justify-between my-4 p-4 rounded-xl bg-purple-950/40 border border-purple-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-display font-bold text-slate-100">Materia del Vacío Cosechada</span>
          </div>
          <span className="text-xl font-mono font-extrabold text-purple-300 tabular-nums">
            +{stats.voidCreditsEarned} M
          </span>
        </div>

        {/* Combat Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-2">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Puntaje Final</span>
            <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Tiempo Sobrevivido</span>
            <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {formatTime(stats.timeSurvived)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Enemigos Eliminados</span>
            <div className="text-lg font-bold font-mono text-slate-200 tabular-nums">
              {stats.kills}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Titanes Destruidos</span>
            <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
              {stats.bossesKilled}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Daño Infligido</span>
            <div className="text-lg font-bold font-mono text-slate-200 tabular-nums">
              {stats.damageDealt.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Golpes Críticos</span>
            <div className="text-lg font-bold font-mono text-amber-300 tabular-nums">
              {stats.criticalHits}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Combo Máximo</span>
            <div className="text-lg font-bold font-mono text-fuchsia-400 tabular-nums">
              {stats.maxCombo}x
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-slate-500 uppercase">Nivel de Piloto</span>
            <div className="text-lg font-bold font-mono text-indigo-400 tabular-nums">
              {stats.level}
            </div>
          </div>
        </div>

        {/* Favorite Weapon & Sector */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 my-2 px-1">
          <span>Sector: <strong className="text-slate-200">{stats.sectorReached}</strong></span>
          <span>Arma Predilecta: <strong className="text-cyan-400">{stats.favoriteWeapon.replace(/_/g, ' ')}</strong></span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onOpenHangar}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
          >
            <Wrench className="w-4 h-4" /> Hangar de Naves
          </button>
          <button
            onClick={onRestart}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Desplegar de Nuevo
          </button>
        </div>
      </div>
    </div>
  );
};
