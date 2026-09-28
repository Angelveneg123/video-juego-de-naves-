import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoidGameEngine } from './game/engine';
import { audio } from './game/audio';
import { loadMetaProgression, saveMetaProgression } from './game/progression';
import {
  MetaProgression,
  UpgradeDef,
  EvolvedWeaponId,
  SectorId,
  DynamicMission,
  SpaceEventState,
  RunStatistics,
  BossEntity,
  NemesisEntity,
  TensionPhase,
  WeaponId,
} from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { UpgradeModal } from './components/UpgradeModal';
import { EvolutionBanner } from './components/EvolutionBanner';
import { SectorTransitionBanner } from './components/SectorTransitionBanner';
import { HangarModal } from './components/HangarModal';
import { CodexModal } from './components/CodexModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { AchievementToast } from './components/AchievementToast';

export default function App() {
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VoidGameEngine | null>(null);

  // High-level App State
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('TITLE');
  const [meta, setMeta] = useState<MetaProgression>(() => loadMetaProgression());

  // In-Game Live HUD Metrics
  const [hudState, setHudState] = useState({
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    level: 1,
    xp: 0,
    xpToNext: 50,
    score: 0,
    runTime: 0,
    voidCredits: 0,
    combo: 0,
    isFever: false,
    sectorId: 'NEON_NEBULA',
    tensionPhase: 'CALM' as TensionPhase,
    activeWeapons: [] as WeaponId[],
    evolvedWeapons: [] as EvolvedWeaponId[],
    dashCooldown: 0,
  });

  // Modal / Overlay States
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeDef[] | null>(null);
  const [activeEvolution, setActiveEvolution] = useState<EvolvedWeaponId | null>(null);
  const [activeSectorNotice, setActiveSectorNotice] = useState<SectorId | null>(null);
  const [activeMission, setActiveMission] = useState<DynamicMission | null>(null);
  const [activeBoss, setActiveBoss] = useState<BossEntity | null>(null);
  const [activeNemesis, setActiveNemesis] = useState<NemesisEntity | null>(null);
  const [isHangarOpen, setIsHangarOpen] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [lastRunStats, setLastRunStats] = useState<RunStatistics | null>(null);
  const [activeAchievement, setActiveAchievement] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(audio.isMuted);

  // Resize canvas to full window
  const updateCanvasSize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas3DRef.current) {
      canvas3DRef.current.width = width;
      canvas3DRef.current.height = height;
    }
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = width;
      overlayCanvasRef.current.height = height;
    }
    if (engineRef.current) {
      engineRef.current.resize(width, height);
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Sync HUD state from engine via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const poll = () => {
      if (engineRef.current && gameState === 'PLAYING') {
        const eng = engineRef.current;
        setHudState({
          hp: eng.player.hp,
          maxHp: eng.player.maxHp,
          shield: eng.player.shield,
          maxShield: eng.player.maxShield,
          level: eng.playerLevel,
          xp: eng.playerXp,
          xpToNext: eng.xpToNextLevel,
          score: eng.score,
          runTime: eng.runTime,
          voidCredits: eng.voidCredits,
          combo: eng.combo,
          isFever: eng.isFever,
          sectorId: eng.currentSectorId,
          tensionPhase: eng.director.state.phase,
          activeWeapons: Array.from(eng.activeWeapons.keys()),
          evolvedWeapons: Array.from(eng.evolvedWeapons),
          dashCooldown: Math.max(0, eng.player.dashCooldown),
        });
      }
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  // Initialize engine once canvas mounts
  useEffect(() => {
    if (!canvas3DRef.current || engineRef.current) return;

    const engine = new VoidGameEngine(canvas3DRef.current, overlayCanvasRef.current, {
      onLevelUp: choices => {
        setUpgradeChoices(choices);
      },
      onWeaponEvolved: evolvedId => {
        setActiveEvolution(evolvedId);
        setTimeout(() => setActiveEvolution(null), 3000);
      },
      onSectorTransition: sectorId => {
        setActiveSectorNotice(sectorId);
        setTimeout(() => setActiveSectorNotice(null), 2500);
      },
      onMissionUpdate: mission => {
        setActiveMission(mission ? { ...mission } : null);
      },
      onEventUpdate: _event => {
        // Handled via director
      },
      onGameOver: stats => {
        setLastRunStats(stats);
        setGameState('GAME_OVER');

        // Persist credits and high scores
        setMeta(prev => {
          const newHigh = Math.max(prev.highScore, stats.score);
          const newBestTime = Math.max(prev.bestTime, stats.timeSurvived);
          const updated: MetaProgression = {
            ...prev,
            credits: prev.credits + stats.voidCreditsEarned,
            highScore: newHigh,
            bestTime: newBestTime,
            totalKills: prev.totalKills + stats.kills,
            totalBosses: prev.totalBosses + stats.bossesKilled,
          };
          saveMetaProgression(updated);
          return updated;
        });
      },
      onBossStateChange: boss => {
        setActiveBoss(boss ? { ...boss } : null);
      },
      onNemesisStateChange: nemesis => {
        setActiveNemesis(nemesis ? { ...nemesis } : null);
      },
      onFeverChange: (isFever, combo) => {
        setHudState(prev => ({ ...prev, isFever, combo }));
      },
      onSynergyDiscovered: synergyId => {
        setMeta(prev => {
          if (!prev.discoveredSynergies.includes(synergyId)) {
            const updated = {
              ...prev,
              discoveredSynergies: [...prev.discoveredSynergies, synergyId],
            };
            saveMetaProgression(updated);
            return updated;
          }
          return prev;
        });
      },
      onAchievementUnlocked: achievementId => {
        setMeta(prev => {
          if (!prev.achievementsUnlocked.includes(achievementId)) {
            const updated = {
              ...prev,
              achievementsUnlocked: [...prev.achievementsUnlocked, achievementId],
            };
            saveMetaProgression(updated);
            setActiveAchievement(achievementId);
            setTimeout(() => setActiveAchievement(null), 4000);
            return updated;
          }
          return prev;
        });
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    if (!engineRef.current) return;
    engineRef.current.startNewRun(meta.selectedShip, meta);
    setGameState('PLAYING');
    setUpgradeChoices(null);
    setActiveEvolution(null);
  };

  const handlePause = () => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.pause();
      setGameState('PAUSED');
    }
  };

  const handleResume = () => {
    if (engineRef.current && gameState === 'PAUSED') {
      engineRef.current.resume();
      setGameState('PLAYING');
    }
  };

  const handleSelectUpgrade = (upgrade: UpgradeDef) => {
    if (engineRef.current) {
      engineRef.current.selectUpgrade(upgrade);
      setUpgradeChoices(null);
    }
  };

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04060d] text-slate-100 font-sans">
      {/* 3D WebGL Canvas rendered with Three.js */}
      <canvas
        ref={canvas3DRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* 2D Overlay Canvas for projected floating damage numbers and F2 Debug */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* Subtle CRT Scanline Overlay */}
      <div className="scanlines absolute inset-0 z-10 pointer-events-none" />

      {/* Screen 1: TITLE SCREEN */}
      {gameState === 'TITLE' && (
        <TitleScreen
          meta={meta}
          onStartGame={handleStartGame}
          onOpenHangar={() => setIsHangarOpen(true)}
          onOpenCodex={() => setIsCodexOpen(true)}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* Screen 2: IN-GAME ACTIVE HUD */}
      {gameState === 'PLAYING' && (
        <HUD
          hp={hudState.hp}
          maxHp={hudState.maxHp}
          shield={hudState.shield}
          maxShield={hudState.maxShield}
          level={hudState.level}
          xp={hudState.xp}
          xpToNext={hudState.xpToNext}
          score={hudState.score}
          runTime={hudState.runTime}
          voidCredits={hudState.voidCredits}
          combo={hudState.combo}
          isFever={hudState.isFever}
          sectorId={hudState.sectorId}
          tensionPhase={hudState.tensionPhase}
          mission={activeMission}
          boss={activeBoss}
          nemesis={activeNemesis}
          activeWeapons={hudState.activeWeapons}
          evolvedWeapons={hudState.evolvedWeapons}
          dashCooldown={hudState.dashCooldown}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          onOpenCodex={() => setIsCodexOpen(true)}
        />
      )}

      {/* Screen 3: LEVEL UP UPGRADE MODAL */}
      {upgradeChoices && (
        <UpgradeModal choices={upgradeChoices} onSelect={handleSelectUpgrade} />
      )}

      {/* Screen 4: PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleStartGame}
          onOpenHangar={() => setIsHangarOpen(true)}
          onOpenCodex={() => setIsCodexOpen(true)}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* Screen 5: GAME OVER / RUN DEBRIEF MODAL */}
      {gameState === 'GAME_OVER' && lastRunStats && (
        <GameOverModal
          stats={lastRunStats}
          onRestart={handleStartGame}
          onOpenHangar={() => setIsHangarOpen(true)}
        />
      )}

      {/* Cinematics & Banners */}
      <EvolutionBanner evolvedId={activeEvolution} />
      <SectorTransitionBanner sectorId={activeSectorNotice} />

      {/* Hangar & Tech Tree Modal */}
      {isHangarOpen && (
        <HangarModal
          meta={meta}
          onUpdateMeta={updated => setMeta(updated)}
          onClose={() => setIsHangarOpen(false)}
          onLaunch={selectedShip => {
            setIsHangarOpen(false);
            if (engineRef.current) {
              engineRef.current.startNewRun(selectedShip, meta);
              setGameState('PLAYING');
            }
          }}
        />
      )}

      {/* Codex Modal */}
      {isCodexOpen && (
        <CodexModal
          discoveredSynergies={meta.discoveredSynergies}
          onClose={() => setIsCodexOpen(false)}
        />
      )}

      {/* Achievement Toast Notification */}
      <AchievementToast achievementId={activeAchievement} />
    </div>
  );
}
