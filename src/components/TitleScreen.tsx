import React from 'react';
import { Play, Wrench, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { ShipId, MetaProgression } from '../game/types';
import { SHIP_CLASSES } from '../game/progression';

interface TitleScreenProps {
  meta: MetaProgression;
  onStartGame: () => void;
  onOpenHangar: () => void;
  onOpenCodex: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  meta,
  onStartGame,
  onOpenHangar,
  onOpenCodex,
  onToggleMute,
  isMuted,
}) => {
  const activeShip = SHIP_CLASSES[meta.selectedShip] || SHIP_CLASSES.INTERCEPTOR;

  return (
    <div className="relative flex flex-col justify-between w-full h-screen p-6 md:p-12 z-20 overflow-hidden bg-radial from-slate-900/60 via-[#04060d] to-[#020307]">
      {/* Top Bar Contract (Brand - Nav Links - Actions) */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto border-b border-slate-800/80 pb-4">
        {/* Zone 1: Single text element wordmark */}
        <span className="font-display font-black text-xl md:text-2xl tracking-wider text-slate-100 uppercase">
          Void Survivor
        </span>

        {/* Zone 2: Clean text links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-400">
          <button onClick={onOpenHangar} className="hover:text-cyan-400 transition-colors cursor-pointer">
            Flota de Naves
          </button>
          <button onClick={onOpenHangar} className="hover:text-cyan-400 transition-colors cursor-pointer">
            Árbol Tecnológico
          </button>
          <button onClick={onOpenCodex} className="hover:text-cyan-400 transition-colors cursor-pointer">
            Evoluciones y Sinergias
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-purple-300">
            <span>Materia:</span>
            <span className="font-bold text-slate-100 tabular-nums">{meta.credits}</span>
          </div>
          <button
            onClick={onToggleMute}
            aria-label="Alternar Sonido"
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Hero & CTA */}
      <main className="flex flex-col items-center justify-center text-center my-auto max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-widest mb-4">
          ✦ Simulación Espacial Roguelite Dinámica
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 uppercase">
          Void Survivor
        </h1>

        <p className="text-slate-300 font-mono text-sm md:text-base mt-4 max-w-xl leading-relaxed">
          Navega sectores procedurales del espacio profundo orquestados por un Director de Juego adaptativo.
          Evoluciona armamento devastador, pilota cazas estelares modulares y aniquila Titanes acorazados.
        </p>

        {/* Selected Ship Preview Card */}
        <div className="flex items-center gap-4 mt-8 p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div
            className="w-12 h-12 rounded-lg border border-slate-700 flex items-center justify-center text-2xl shadow-lg"
            style={{ backgroundColor: activeShip.hullColor + '20', borderColor: activeShip.hullColor }}
          >
            🚀
          </div>
          <div className="text-left font-mono">
            <div className="text-xs text-slate-500 uppercase">Nave Insignia Actual</div>
            <div className="font-display font-bold text-slate-100 text-sm">{activeShip.name}</div>
            <div className="text-[11px] text-cyan-400">{activeShip.tagline}</div>
          </div>
          <button
            onClick={onOpenHangar}
            className="ml-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          >
            Configurar
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <button
            onClick={onStartGame}
            className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-extrabold text-sm md:text-base tracking-wider uppercase transition-all shadow-xl shadow-cyan-500/25 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" /> Desplegar Misión
          </button>
          <button
            onClick={onOpenHangar}
            className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-cyan-400" /> Hangar y Mejoras
          </button>
          <button
            onClick={onOpenCodex}
            className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-400" /> Archivos y Códice
          </button>
        </div>
      </main>

      {/* Footer info & Controls breakdown */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span>Moverse: <strong className="text-slate-300">WASD / Flechas</strong></span>
          <span>·</span>
          <span>Apuntar: <strong className="text-cyan-400">Ratón</strong></span>
          <span>·</span>
          <span>Disparar: <strong className="text-cyan-400">Clic Izq</strong></span>
          <span>·</span>
          <span>Impulso: <strong className="text-slate-300">Espacio</strong></span>
        </div>
        <div className="mt-2 sm:mt-0">
          <span>Récord: <strong className="text-amber-400 tabular-nums">{meta.highScore.toLocaleString()}</strong></span>
        </div>
      </footer>
    </div>
  );
};
