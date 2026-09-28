import React, { useState } from 'react';
import { WEAPON_DEFINITIONS, EVOLVED_WEAPON_DEFINITIONS, SECRET_SYNERGIES } from '../game/weapons';
import { SECTORS, SECTOR_SEQUENCE } from '../game/sectors';
import { X, Lock, Sparkles, BookOpen } from 'lucide-react';

interface CodexModalProps {
  discoveredSynergies: string[];
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({ discoveredSynergies, onClose }) => {
  const [tab, setTab] = useState<'EVOLUTIONS' | 'SYNERGIES' | 'SECTORS'>('EVOLUTIONS');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-4xl h-[80vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-lg">
              <BookOpen className="w-5 h-5" /> Archivos del Vacío y Códice
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setTab('EVOLUTIONS')}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  tab === 'EVOLUTIONS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Evoluciones de Armas
              </button>
              <button
                onClick={() => setTab('SYNERGIES')}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  tab === 'SYNERGIES' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sinergias Secretas
              </button>
              <button
                onClick={() => setTab('SECTORS')}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  tab === 'SECTORS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Información de Sectores
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {tab === 'EVOLUTIONS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(EVOLVED_WEAPON_DEFINITIONS).map(ev => {
                const base = WEAPON_DEFINITIONS[ev.baseWeaponId];
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/40 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-xl shrink-0">
                          {ev.icon}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-slate-100 text-base">{ev.name}</h4>
                          <span className="text-xs font-mono text-purple-400">Arma Evolucionada</span>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-slate-300 leading-relaxed">{ev.description}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
                      <span className="text-cyan-400 font-bold">Receta: </span>
                      <span>{base.name} (NVL 3+) + {ev.requiredUpgradeId.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'SYNERGIES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECRET_SYNERGIES.map(syn => {
                const isDiscovered = discoveredSynergies.includes(syn.id);
                return (
                  <div
                    key={syn.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isDiscovered
                        ? 'bg-slate-900/80 border-cyan-500/50'
                        : 'bg-slate-950/80 border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {isDiscovered ? (
                          <Sparkles className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-600" />
                        )}
                        <h4 className="font-display font-bold text-base text-slate-100">
                          {isDiscovered ? syn.name : 'Sinergia Secreta Oculta'}
                        </h4>
                      </div>
                      <p className="text-xs font-mono text-slate-300 leading-relaxed">
                        {isDiscovered ? syn.description : 'Equipa armas compatibles durante el combate para desbloquear esta sinergia secreta.'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-400">
                      {isDiscovered ? (
                        <>
                          <span className="text-cyan-400 font-bold">Activador: </span>
                          <span>{syn.weaponA.replace(/_/g, ' ')} + {syn.weaponB.replace(/_/g, ' ')}</span>
                        </>
                      ) : (
                        <span className="text-slate-600">[DATOS CORROMPIDOS // DESCÚBRELO EN COMBATE]</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'SECTORS' && (
            <div className="flex flex-col gap-3">
              {SECTOR_SEQUENCE.map((secId, idx) => {
                const sec = SECTORS[secId];
                return (
                  <div
                    key={secId}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500">0{idx + 1}.</span>
                        <h4 className="font-display font-bold text-base text-slate-100">{sec.name}</h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {sec.threatLevel}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-1">{sec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
