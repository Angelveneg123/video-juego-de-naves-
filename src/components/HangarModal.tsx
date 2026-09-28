import React, { useState } from 'react';
import { ShipId, MetaProgression } from '../game/types';
import { SHIP_CLASSES, saveMetaProgression } from '../game/progression';
import { Shield, Zap, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { audio } from '../game/audio';

interface HangarModalProps {
  meta: MetaProgression;
  onUpdateMeta: (meta: MetaProgression) => void;
  onClose: () => void;
  onLaunch: (selectedShip: ShipId) => void;
}

export const HangarModal: React.FC<HangarModalProps> = ({ meta, onUpdateMeta, onClose, onLaunch }) => {
  const [activeTab, setActiveTab] = useState<'SHIPS' | 'TECH_TREE'>('SHIPS');
  const [selectedShipId, setSelectedShipId] = useState<ShipId>(meta.selectedShip);

  const shipList: ShipId[] = ['INTERCEPTOR', 'DESTROYER', 'PHANTOM', 'ENGINEER', 'VOID_HUNTER'];

  const UPGRADE_SPECS: {
    key: keyof MetaProgression['upgrades'];
    name: string;
    description: string;
    icon: string;
    maxLevel: number;
    baseCost: number;
  }[] = [
    {
      key: 'hullReinforcement',
      name: 'Aleación de Casco Reforzada',
      description: '+20 Integridad de Casco Máximo por nivel.',
      icon: '🛡️',
      maxLevel: 10,
      baseCost: 150,
    },
    {
      key: 'shieldMatrix',
      name: 'Matriz de Escudos Cuánticos',
      description: '+15 Capacidad Máxima de Escudo y +1.5/s Tasa de recarga.',
      icon: '⚡',
      maxLevel: 8,
      baseCost: 180,
    },
    {
      key: 'plasmaCapacitors',
      name: 'Condensadores de Alta Potencia',
      description: '+8% Daño Global infligido en todas las armas.',
      icon: '💥',
      maxLevel: 10,
      baseCost: 200,
    },
    {
      key: 'warpThrusters',
      name: 'Propulsores Sub-Lumínicos',
      description: '+12 Velocidad Sub-lumínica y maniobrabilidad.',
      icon: '🚀',
      maxLevel: 8,
      baseCost: 140,
    },
    {
      key: 'quantumMagnet',
      name: 'Sifón de Materia Cuántica',
      description: '+25 Radio de atracción de cristales y nanitos.',
      icon: '🧲',
      maxLevel: 8,
      baseCost: 120,
    },
    {
      key: 'voidAttunement',
      name: 'Sintonización del Vacío',
      description: '+15% Créditos del Vacío adicionales y probabilidad de botín raro.',
      icon: '🌌',
      maxLevel: 6,
      baseCost: 350,
    },
  ];

  const handleBuyShip = (shipId: ShipId, cost: number) => {
    if (meta.credits >= cost) {
      const updated: MetaProgression = {
        ...meta,
        credits: meta.credits - cost,
        unlockedShips: [...meta.unlockedShips, shipId],
        selectedShip: shipId,
      };
      setSelectedShipId(shipId);
      onUpdateMeta(updated);
      saveMetaProgression(updated);
      audio.playLevelUp();
    }
  };

  const handleSelectShip = (shipId: ShipId) => {
    setSelectedShipId(shipId);
    const updated: MetaProgression = { ...meta, selectedShip: shipId };
    onUpdateMeta(updated);
    saveMetaProgression(updated);
  };

  const handleUpgradeTech = (spec: (typeof UPGRADE_SPECS)[0]) => {
    const currentLvl = meta.upgrades[spec.key] || 0;
    if (currentLvl >= spec.maxLevel) return;
    const cost = spec.baseCost * (currentLvl + 1);

    if (meta.credits >= cost) {
      const updated: MetaProgression = {
        ...meta,
        credits: meta.credits - cost,
        upgrades: {
          ...meta.upgrades,
          [spec.key]: currentLvl + 1,
        },
      };
      onUpdateMeta(updated);
      saveMetaProgression(updated);
      audio.playLevelUp();
    }
  };

  const currentShipDef = SHIP_CLASSES[selectedShipId];
  const isSelectedUnlocked = meta.unlockedShips.includes(selectedShipId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-display font-extrabold text-slate-100 tracking-tight">
              Hangar Orbital y Taller
            </h2>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('SHIPS')}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  activeTab === 'SHIPS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chasis de Naves
              </button>
              <button
                onClick={() => setActiveTab('TECH_TREE')}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  activeTab === 'TECH_TREE' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Árbol Tecnológico Permanente
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-xs font-mono text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Materia:</span>
              <span className="font-bold text-slate-100 tabular-nums">{meta.credits}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Tab 1: SHIP HANGAR */}
        {activeTab === 'SHIPS' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
            {/* Ship List */}
            <div className="p-4 border-r border-slate-800 overflow-y-auto flex flex-col gap-2">
              {shipList.map(sId => {
                const ship = SHIP_CLASSES[sId];
                const isUnlocked = meta.unlockedShips.includes(sId);
                const isSelected = selectedShipId === sId;

                return (
                  <button
                    key={sId}
                    onClick={() => setSelectedShipId(sId)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500/80 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-slate-100">{ship.name}</span>
                        {meta.selectedShip === sId && (
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                            ACTIVA
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{ship.tagline}</div>
                    </div>
                    <div>
                      {isUnlocked ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-xs font-mono font-bold text-purple-400">{ship.cost} M</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Ship Detail View */}
            <div className="col-span-2 p-8 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{currentShipDef.tagline}</span>
                    <h3 className="text-2xl font-display font-extrabold text-slate-100 mt-1">{currentShipDef.name}</h3>
                  </div>
                  <div
                    className="w-16 h-16 rounded-xl border border-slate-700 flex items-center justify-center text-3xl shadow-xl"
                    style={{ backgroundColor: currentShipDef.hullColor + '20', borderColor: currentShipDef.hullColor }}
                  >
                    🚀
                  </div>
                </div>

                <p className="text-sm font-mono text-slate-300 mt-4 leading-relaxed max-w-xl">
                  {currentShipDef.description}
                </p>

                {/* Base Stats Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Casco Máx</span>
                    <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
                      {currentShipDef.baseStats.maxHp}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Escudo Máx</span>
                    <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                      {currentShipDef.baseStats.maxShield}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Velocidad Sub-luz</span>
                    <div className="text-lg font-bold font-mono text-slate-200 tabular-nums">
                      {currentShipDef.baseStats.speed}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Mult. de Daño</span>
                    <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
                      x{currentShipDef.baseStats.damageMult}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Prob. Crítica</span>
                    <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">
                      {Math.round(currentShipDef.baseStats.critChance * 100)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400">Blindaje</span>
                    <div className="text-lg font-bold font-mono text-slate-300 tabular-nums">
                      +{currentShipDef.baseStats.armor}
                    </div>
                  </div>
                </div>

                {/* Special Trait */}
                <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 text-xs font-mono">
                  <span className="text-cyan-400 font-bold">Especialización de Chasis: </span>
                  <span className="text-slate-300">{currentShipDef.specialTrait}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-800">
                {isSelectedUnlocked ? (
                  <>
                    <button
                      onClick={() => handleSelectShip(selectedShipId)}
                      className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                        meta.selectedShip === selectedShipId
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      }`}
                    >
                      {meta.selectedShip === selectedShipId ? 'Chasis Activo' : 'Elegir como Activo'}
                    </button>
                    <button
                      onClick={() => {
                        handleSelectShip(selectedShipId);
                        onLaunch(selectedShipId);
                      }}
                      className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                    >
                      Desplegar Misión <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleBuyShip(selectedShipId, currentShipDef.cost)}
                    disabled={meta.credits < currentShipDef.cost}
                    className={`px-6 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      meta.credits >= currentShipDef.cost
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Desbloquear Chasis ({currentShipDef.cost} Materia)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: TECH TREE UPGRADES */}
        {activeTab === 'TECH_TREE' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {UPGRADE_SPECS.map(spec => {
                const currentLvl = meta.upgrades[spec.key] || 0;
                const isMax = currentLvl >= spec.maxLevel;
                const cost = spec.baseCost * (currentLvl + 1);
                const canAfford = meta.credits >= cost && !isMax;

                return (
                  <div
                    key={spec.key}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        {spec.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-sm text-slate-100">{spec.name}</h4>
                          <span className="text-[11px] font-mono text-cyan-400">
                            Nivel {currentLvl}/{spec.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1">{spec.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUpgradeTech(spec)}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold shrink-0 transition-all ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MÁXIMO' : `${cost} M`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
