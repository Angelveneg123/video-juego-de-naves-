/**
 * Void Survivor - Dynamic Game Director
 * Analyzes player condition in real-time and orchestrates tension curves:
 * CALM -> GROWTH -> TENSION -> CHAOS -> REWARD -> CALM
 */

import { TensionPhase, GameDirectorState } from './types';

export class GameDirector {
  public state: GameDirectorState = {
    phase: 'CALM',
    phaseTime: 0,
    phaseDuration: 18,
    tensionScore: 20,
    recentDps: 0,
    recentDamageTaken: 0,
    timeSinceLastDamage: 0,
    killsPerMinute: 0,
    recommendedSpawnRate: 1.0,
    eliteChance: 0.05,
    activeEnemyCount: 0,
    eventTriggerCooldown: 40,
  };

  // Rolling history buffers
  private damageDealtHistory: { time: number; damage: number }[] = [];
  private damageTakenHistory: { time: number; damage: number }[] = [];
  private killTimestamps: number[] = [];

  // Phase duration ranges (in seconds)
  private phaseDurations: Record<TensionPhase, { min: number; max: number }> = {
    CALM: { min: 14, max: 22 },
    GROWTH: { min: 20, max: 32 },
    TENSION: { min: 22, max: 35 },
    CHAOS: { min: 15, max: 25 },
    REWARD: { min: 10, max: 16 },
  };

  public recordDamageDealt(damage: number, nowSec: number) {
    this.damageDealtHistory.push({ time: nowSec, damage });
  }

  public recordDamageTaken(damage: number, nowSec: number) {
    this.damageTakenHistory.push({ time: nowSec, damage });
    this.state.timeSinceLastDamage = 0;
  }

  public recordKill(nowSec: number) {
    this.killTimestamps.push(nowSec);
  }

  public update(dt: number, params: {
    nowSec: number;
    hp: number;
    maxHp: number;
    shield: number;
    maxShield: number;
    playerLevel: number;
    weaponCount: number;
    activeEnemies: number;
    isBossAlive: boolean;
  }): {
    phaseChanged: boolean;
    previousPhase: TensionPhase;
    newPhase: TensionPhase;
    shouldSpawnElite: boolean;
    shouldSpawnPowerup: boolean;
    shouldTriggerEvent: boolean;
    recommendedSpawnRate: number;
  } {
    const { nowSec, hp, maxHp, shield, maxShield, playerLevel, weaponCount, activeEnemies, isBossAlive } = params;

    this.state.activeEnemyCount = activeEnemies;
    this.state.phaseTime += dt;
    this.state.timeSinceLastDamage += dt;
    if (this.state.eventTriggerCooldown > 0) {
      this.state.eventTriggerCooldown -= dt;
    }

    // 1. Clean up rolling buffers (5s window for DPS, 8s for damage taken, 60s for KPM)
    this.damageDealtHistory = this.damageDealtHistory.filter(h => nowSec - h.time <= 5);
    this.damageTakenHistory = this.damageTakenHistory.filter(h => nowSec - h.time <= 8);
    this.killTimestamps = this.killTimestamps.filter(t => nowSec - t <= 60);

    // Calculate DPS
    const totalDealt = this.damageDealtHistory.reduce((sum, h) => sum + h.damage, 0);
    this.state.recentDps = totalDealt / 5;

    // Calculate recent damage taken
    this.state.recentDamageTaken = this.damageTakenHistory.reduce((sum, h) => sum + h.damage, 0);

    // Calculate KPM
    this.state.killsPerMinute = this.killTimestamps.length;

    // Player health metrics
    const hpRatio = hp / Math.max(1, maxHp);
    const shieldRatio = shield / Math.max(1, maxShield);
    const combinedVitality = (hpRatio * 0.7) + (shieldRatio * 0.3);

    // 2. Compute dynamic Tension Score (0 to 100)
    // Factors: Vitality (low health raises tension), active enemies vs player DPS, kill streak
    let computedTension = 0;

    switch (this.state.phase) {
      case 'CALM':
        computedTension = 15 + Math.min(25, activeEnemies * 1.5);
        break;
      case 'GROWTH':
        computedTension = 35 + (this.state.phaseTime / this.state.phaseDuration) * 25;
        break;
      case 'TENSION':
        computedTension = 65 + Math.min(20, (1 - combinedVitality) * 25);
        break;
      case 'CHAOS':
        computedTension = 85 + (isBossAlive ? 15 : 0);
        break;
      case 'REWARD':
        computedTension = 10;
        break;
    }

    // If player is struggling hard (vitality < 0.25 and taking lots of damage), ease tension slightly
    if (combinedVitality < 0.25 && this.state.recentDamageTaken > maxHp * 0.4) {
      computedTension = Math.max(20, computedTension - 20);
    }
    // If player is crushing everything without scratch for > 15s, ramp tension up
    else if (this.state.timeSinceLastDamage > 15 && this.state.recentDps > 200) {
      computedTension = Math.min(95, computedTension + 15);
    }

    this.state.tensionScore = computedTension;

    // 3. Phase Transition Logic
    let phaseChanged = false;
    const previousPhase = this.state.phase;

    // If boss is alive, pin in CHAOS / TENSION until boss is cleared
    if (isBossAlive) {
      if (this.state.phase !== 'CHAOS') {
        this.setPhase('CHAOS');
        phaseChanged = true;
      }
    } else if (this.state.phaseTime >= this.state.phaseDuration) {
      phaseChanged = true;
      const nextPhase = this.getNextPhase(this.state.phase);
      this.setPhase(nextPhase);
    }

    // 4. Compute Dynamic Outputs
    // Spawn rate multiplier
    const levelScale = 1 + (playerLevel - 1) * 0.08 + (weaponCount - 1) * 0.05;
    let baseSpawnMultiplier = 1.0;

    switch (this.state.phase) {
      case 'CALM':
        baseSpawnMultiplier = 0.55;
        this.state.eliteChance = 0.02;
        break;
      case 'GROWTH':
        baseSpawnMultiplier = 1.0;
        this.state.eliteChance = 0.08;
        break;
      case 'TENSION':
        baseSpawnMultiplier = 1.6;
        this.state.eliteChance = 0.2;
        break;
      case 'CHAOS':
        baseSpawnMultiplier = 2.4;
        this.state.eliteChance = 0.35;
        break;
      case 'REWARD':
        baseSpawnMultiplier = 0.25;
        this.state.eliteChance = 0.0;
        break;
    }

    // Soft cap on active enemies to protect 60FPS
    if (activeEnemies > 100) {
      baseSpawnMultiplier *= 0.35;
    } else if (activeEnemies > 75) {
      baseSpawnMultiplier *= 0.65;
    }

    this.state.recommendedSpawnRate = baseSpawnMultiplier * levelScale;

    // Flags for spawn events
    const shouldSpawnElite = (this.state.phase === 'TENSION' || this.state.phase === 'CHAOS') && Math.random() < this.state.eliteChance;
    const shouldSpawnPowerup = this.state.phase === 'REWARD' || (combinedVitality < 0.3 && Math.random() < 0.08);
    const shouldTriggerEvent = this.state.phase === 'CHAOS' && this.state.eventTriggerCooldown <= 0;

    if (shouldTriggerEvent) {
      this.state.eventTriggerCooldown = 75; // 75 seconds between major events
    }

    return {
      phaseChanged,
      previousPhase,
      newPhase: this.state.phase,
      shouldSpawnElite,
      shouldSpawnPowerup,
      shouldTriggerEvent,
      recommendedSpawnRate: this.state.recommendedSpawnRate,
    };
  }

  private getNextPhase(current: TensionPhase): TensionPhase {
    switch (current) {
      case 'CALM': return 'GROWTH';
      case 'GROWTH': return 'TENSION';
      case 'TENSION': return 'CHAOS';
      case 'CHAOS': return 'REWARD';
      case 'REWARD': return 'CALM';
    }
  }

  private setPhase(newPhase: TensionPhase) {
    this.state.phase = newPhase;
    this.state.phaseTime = 0;
    const limits = this.phaseDurations[newPhase];
    this.state.phaseDuration = limits.min + Math.random() * (limits.max - limits.min);
  }

  public forcePhase(phase: TensionPhase) {
    this.setPhase(phase);
  }
}
