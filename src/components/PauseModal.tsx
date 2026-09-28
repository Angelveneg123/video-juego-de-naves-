import React from 'react';
import { Play, RotateCcw, Wrench, Volume2, VolumeX, BookOpen } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenHangar: () => void;
  onOpenCodex: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenHangar,
  onOpenCodex,
  onToggleMute,
  isMuted,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="flex flex-col items-center w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
        <h2 className="text-xl font-display font-extrabold text-slate-100 tracking-tight mb-1">
          Pausa Táctica
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">Simulación suspendida</p>

        <div className="flex flex-col gap-2.5 w-full font-mono text-xs font-bold">
          <button
            onClick={onResume}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Reanudar Combate
          </button>
          <button
            onClick={onOpenCodex}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> Códice y Sinergias
          </button>
          <button
            onClick={onOpenHangar}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" /> Hangar y Mejoras
          </button>
          <button
            onClick={onToggleMute}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMuted ? 'Activar Sonido' : 'Silenciar Audio'}
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/40 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <RotateCcw className="w-4 h-4" /> Abortar y Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
};
