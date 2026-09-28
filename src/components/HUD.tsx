import React from 'react';
import { TensionPhase, DynamicMission, BossEntity, NemesisEntity, WeaponId, EvolvedWeaponId } from '../game/types';
import { WEAPON_DEFINITIONS, EVOLVED_WEAPON_DEFINITIONS } from '../game/weapons';
import { SECTORS } from '../game/sectors';
import { Shield, Zap, Pause, Volume2, VolumeX } from 'lucide-react';

interface HUDProps {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  level: number;
  xp: number;
  xpToNext: number;
  score: number;
  runTime: number;
  voidCredits: number;
  combo: number;
  isFever: boolean;
  sectorId: string;
  tensionPhase: TensionPhase;
  mission: DynamicMission | null;
  boss: BossEntity | null;
  nemesis: NemesisEntity | null;
  activeWeapons: WeaponId[];
  evolvedWeapons: EvolvedWeaponId[];
  dashCooldown: number;
  onPause: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onOpenCodex: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp,
  maxHp,
  shield,
  maxShield,
  level,
  xp,
  xpToNext,
  score,
  runTime,
  voidCredits,
  combo,
  isFever,
  sectorId,
  tensionPhase,
  mission,
  boss,
  nemesis,
  activeWeapons,
  evolvedWeapons,
  dashCooldown,
  onPause,
  onToggleMute,
  isMuted,
  onOpenCodex,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shield / maxShield) * 100));
  const xpPercent = Math.max(0, Math.min(100, (xp / xpToNext) * 100));

  const sector = SECTORS[sectorId as keyof typeof SECTORS] || SECTORS.NEON_NEBULA;

  const tensionColors: Record<TensionPhase, { badge: string; text: string }> = {
    CALM: { badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30', text: 'CALMA' },
    GROWTH: { badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/30', text: 'PROGRESIÓN' },
    TENSION: { badge: 'border-amber-500/40 text-amber-400 bg-amber-950/30', text: 'TENSIÓN' },
    CHAOS: { badge: 'border-rose-500/50 text-rose-400 bg-rose-950/40 animate-pulse', text: 'CAOS' },
    REWARD: { badge: 'border-purple-500/40 text-purple-400 bg-purple-950/30', text: 'RECOMPENSA' },
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 select-none z-10 font-mono">
      {/* Top Header Row - Minimalist Holographic Telemetry */}
      <header className="flex items-start justify-between gap-4">
        {/* Top-Left: Sleek Vitality Gauges */}
        <div className="flex flex-col gap-1 w-56 bg-black/40 backdrop-blur-xs p-2.5 rounded-lg border border-white/10 shadow-sm">
          {/* Hull Bar */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-400 flex items-center gap-1 font-semibold tracking-wider">
              <Zap className="w-3 h-3" /> CASCO
            </span>
            <span className="text-slate-300 tabular-nums text-[10px]">
              {Math.ceil(hp)} <span className="text-slate-500">/ {maxHp}</span>
            </span>
          </div>
          <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150 rounded-full"
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          {/* Shield Bar */}
          <div className="flex items-center justify-between text-[11px] mt-0.5">
            <span className="text-cyan-400 flex items-center gap-1 font-semibold tracking-wider">
              <Shield className="w-3 h-3" /> ESCUDO
            </span>
            <span className="text-slate-300 tabular-nums text-[10px]">
              {Math.ceil(shield)} <span className="text-slate-500">/ {maxShield}</span>
            </span>
          </div>
          <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-150 rounded-full"
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
        </div>

        {/* Center: Slim Floating Sector & Flight Time Indicator */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xs px-4 py-1.5 rounded-full border border-white/10 text-xs">
          <span className="text-slate-300 uppercase tracking-wider text-[11px] font-bold">{sector.name}</span>
          <span className="text-slate-600">·</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tensionColors[tensionPhase].badge}`}>
            {tensionColors[tensionPhase].text}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300 font-bold tracking-widest tabular-nums">{formatTime(runTime)}</span>
        </div>

        {/* Top-Right: Score, Credits & Minimal Audio/Pause Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-black/40 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">PUNTOS</span>
              <span className="font-bold text-amber-400 tabular-nums">{score.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">VACÍO</span>
              <span className="font-bold text-purple-400 tabular-nums">{voidCredits}</span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 bg-black/40 backdrop-blur-xs p-1 rounded-lg border border-white/10">
            <button
              onClick={onOpenCodex}
              className="px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              CÓDICE
            </button>
            <button
              onClick={onToggleMute}
              aria-label="Alternar Sonido"
              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onPause}
              aria-label="Pausar Juego"
              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-white/10 rounded transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Middle: Boss / Nemesis Health Bar (Appears only when active) */}
      <div className="flex flex-col items-center gap-2">
        {boss && (
          <div className="w-80 bg-black/50 backdrop-blur-xs p-2 rounded-lg border border-rose-500/40 shadow-lg">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-rose-400 tracking-wider uppercase">{boss.name}</span>
              <span className="text-slate-400 text-[10px]">{boss.title}</span>
            </div>
            {(() => {
              const core = boss.parts.find(p => p.type === 'CORE');
              const corePct = core ? Math.max(0, (core.hp / core.maxHp) * 100) : 0;
              return (
                <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden border border-rose-900/50">
                  <div
                    className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-amber-400 transition-all duration-150 rounded-full"
                    style={{ width: `${corePct}%` }}
                  />
                </div>
              );
            })()}
            {boss.shieldActive && (
              <div className="mt-0.5 text-[9px] text-cyan-400 text-center tracking-wider animate-pulse">
                [GENERADOR DE ESCUDOS ACTIVO]
              </div>
            )}
          </div>
        )}

        {nemesis && !boss && (
          <div className="w-72 bg-black/50 backdrop-blur-xs p-2 rounded-lg border border-purple-500/40 shadow-lg">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-purple-400">{nemesis.name}</span>
              <span className="text-slate-400 text-[10px]">{nemesis.title}</span>
            </div>
            <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-purple-900/50">
              <div
                className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(0, (nemesis.hp / nemesis.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Non-Intrusive Holographic Status & XP Laser */}
      <footer className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          {/* Mission Indicator (Compact) */}
          {mission && !mission.completed ? (
            <div className="bg-black/40 backdrop-blur-xs p-2 rounded-lg border border-white/10 text-[10px] w-60">
              <div className="text-amber-400 uppercase font-bold tracking-wider mb-0.5">
                {mission.title}
              </div>
              <div className="text-slate-400 text-[10px] mb-1">{mission.description}</div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{mission.currentCount} / {mission.targetCount}</span>
                {mission.timeLimit > 0 && (
                  <span className="text-rose-400 tabular-nums">{Math.ceil(mission.timeLeft)}s</span>
                )}
              </div>
            </div>
          ) : <div />}

          {/* Active Weapons Mini-Rack */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs p-1 rounded-lg border border-white/10">
            {activeWeapons.map(wid => {
              const def = WEAPON_DEFINITIONS[wid];
              if (!def) return null;
              return (
                <div
                  key={wid}
                  className="w-7 h-7 rounded bg-white/5 border border-white/10 flex items-center justify-center text-sm"
                  title={def.name}
                >
                  {def.icon}
                </div>
              );
            })}
            {evolvedWeapons.map(eid => {
              const def = EVOLVED_WEAPON_DEFINITIONS[eid];
              if (!def) return null;
              return (
                <div
                  key={eid}
                  className="w-7 h-7 rounded bg-purple-950/60 border border-fuchsia-500/70 shadow-sm shadow-purple-500/40 flex items-center justify-center text-sm animate-pulse"
                  title={`EVOLUCIONADA: ${def.name}`}
                >
                  {def.icon}
                </div>
              );
            })}
          </div>

          {/* Combo & Dash Status */}
          <div className="flex flex-col items-end gap-1.5">
            {combo > 3 && (
              <div
                className={`bg-black/40 backdrop-blur-xs px-3 py-1 rounded border ${
                  isFever
                    ? 'border-amber-400 text-amber-300 animate-pulse'
                    : 'border-white/10 text-slate-200'
                }`}
              >
                <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  {isFever ? '🔥 FIEBRE' : 'RACHA'}
                </div>
                <div className="text-base font-bold tabular-nums">
                  {combo}<span className="text-xs text-amber-400 ml-0.5">x</span>
                </div>
              </div>
            )}

            {/* Dash cooldown meter */}
            <div className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-[10px] flex items-center gap-2">
              <span className="text-slate-400">IMPULSO [ESPACIO]</span>
              <span className={`font-bold ${dashCooldown <= 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                {dashCooldown <= 0 ? 'LISTO' : `${dashCooldown.toFixed(1)}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Razor-thin Bottom XP Laser Bar */}
        <div className="w-full bg-black/40 backdrop-blur-xs py-1 px-2 rounded flex items-center gap-2 border border-white/10">
          <span className="text-[10px] text-cyan-400 font-bold tracking-wider">
            NVL {level}
          </span>
          <div className="flex-1 bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-400 transition-all duration-150 rounded-full"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-400 tabular-nums">
            {Math.floor(xp)} / {xpToNext} XP
          </span>
        </div>
      </footer>
    </div>
  );
};
