/**
 * Void Survivor - Core Canvas Game Engine
 * 60FPS loop, GameDirector orchestration, procedural sector rendering,
 * modular ship simulation, combat resolution, bosses, nemesis, and pooling.
 */

import { audio } from './audio';
import { ObjectPoolSystem, PooledProjectile, PooledEnemyBullet } from './pool';
import { GameDirector } from './director';
import { SECTORS, SECTOR_SEQUENCE, PORTAL_DEFINITIONS, spawnRandomPortal } from './sectors';
import { WEAPON_DEFINITIONS, EVOLVED_WEAPON_DEFINITIONS, UPGRADE_CATALOG, SECRET_SYNERGIES } from './weapons';
import { createCapitalShipBoss, createProceduralNemesis } from './bosses';
import { renderPlayerShip } from './shipRenderer';
import { ThreeRenderer } from './threeRenderer';
import * as THREE from 'three';
import {
  ShipId,
  SectorId,
  WeaponId,
  EvolvedWeaponId,
  UpgradeDef,
  BossEntity,
  NemesisEntity,
  Portal,
  DynamicMission,
  SpaceEventState,
  RunStatistics,
  MetaProgression,
  TensionPhase,
} from './types';
import { SHIP_CLASSES, generateDynamicMission, generateSpaceEvent } from './progression';

export interface EnemyEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'SWARM' | 'INTERCEPTOR' | 'CRUISER' | 'KAMIKAZE' | 'ASTEROID';
  color: string;
  glowColor: string;
  attackTimer: number;
  telegraphTimer: number;
  targetAngle: number;
  isTelegraphing: boolean;
}

export interface GameCallbacks {
  onLevelUp: (choices: UpgradeDef[]) => void;
  onWeaponEvolved: (evolvedId: EvolvedWeaponId) => void;
  onSectorTransition: (sectorId: SectorId) => void;
  onMissionUpdate: (mission: DynamicMission | null) => void;
  onEventUpdate: (event: SpaceEventState | null) => void;
  onGameOver: (stats: RunStatistics) => void;
  onBossStateChange: (boss: BossEntity | null) => void;
  onNemesisStateChange: (nemesis: NemesisEntity | null) => void;
  onFeverChange: (isFever: boolean, combo: number) => void;
  onSynergyDiscovered: (synergyId: string) => void;
  onAchievementUnlocked: (achievementId: string) => void;
}

export class VoidGameEngine {
  public canvas3D: HTMLCanvasElement;
  public overlayCanvas: HTMLCanvasElement | null;
  private overlayCtx: CanvasRenderingContext2D | null;
  public threeRenderer: ThreeRenderer;
  private callbacks: GameCallbacks;

  // Systems
  public pool = new ObjectPoolSystem();
  public director = new GameDirector();

  // Run State
  public isRunning = false;
  public isPaused = false;
  public runTime = 0;
  public score = 0;
  public playerLevel = 1;
  public playerXp = 0;
  public xpToNextLevel = 50;
  public voidCredits = 0;
  public currentSectorId: SectorId = 'NEON_NEBULA';
  public shipClassId: ShipId = 'INTERCEPTOR';

  // Combat Tracking
  public combo = 0;
  public comboTimer = 0;
  public maxCombo = 0;
  public isFever = false;
  public feverTimer = 0;
  public damageDealtTotal = 0;
  public critsLanded = 0;
  public damageTakenTotal = 0;
  public totalKills = 0;
  public bossesKilled = 0;
  public nemesisKilled = 0;
  public favoriteWeapon = 'PLASMA_BLASTER';

  // Player State
  public player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    shieldRegenRate: 6,
    shieldCooldownTimer: 0,
    speed: 240,
    damageMult: 1.0,
    fireRateMult: 1.0,
    critChance: 0.1,
    critMult: 2.0,
    armor: 0,
    pickupRadius: 100,
    pierce: 1,
    extraProjectiles: 0,
    invulnerableTimer: 0,
    dashCooldown: 0,
    isDashing: false,
    dashDuration: 0,
  };

  // Modular visual upgrades
  public visualUpgrades = {
    thrustersLevel: 0,
    armorLevel: 0,
    shieldLevel: 0,
    weapons: [] as WeaponId[],
    evolvedWeapons: [] as EvolvedWeaponId[],
  };

  // Upgrades & Inventory
  public activeWeapons: Map<WeaponId, { level: number; timer: number }> = new Map();
  public evolvedWeapons: Set<EvolvedWeaponId> = new Set();
  public acquiredUpgrades: Map<string, number> = new Map();
  public discoveredSynergies: Set<string> = new Set();

  // World Entities
  public enemies: EnemyEntity[] = [];
  public activeBoss: BossEntity | null = null;
  public activeNemesis: NemesisEntity | null = null;
  public portals: Portal[] = [];
  public activeMission: DynamicMission | null = null;
  public activeEvent: SpaceEventState | null = null;

  // Background Cosmic Simulation
  private stars: { x: number; y: number; size: number; speed: number; alpha: number; color: string }[] = [];
  private distantCruisers: { x: number; y: number; vx: number; vy: number; length: number; angle: number; color: string; shootTimer: number }[] = [];
  private distantLaserTracers: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  // Input
  public keys: Record<string, boolean> = {};
  public mousePos = { x: 0, y: 0 };
  public isMouseDown = false;
  public isRightMouseDown = false;

  // 3D Aiming, Crosshair & Combat Feedback
  public currentAimTarget = new THREE.Vector3();
  public isAimingAtEnemy = false;
  public aimedEnemyId: number | null = null;
  public crosshairRecoil = 0;
  public hitMarkerTimer = 0;
  public killMarkerTimer = 0;
  public secondaryCooldownTimer = 0;

  // Camera & Effects
  public camera = { x: 0, y: 0, targetX: 0, targetY: 0, shake: 0, zoom: 1.0, targetZoom: 1.0 };
  public hitStopTimer = 0;
  public timeDilation = 1.0; // Slow motion during boss death / weapon evolutions

  // Performance & Debug
  public fps = 60;
  private lastFrameTime = performance.now();
  private fpsBuffer: number[] = [];
  public debugMode = false;
  public graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' = 'HIGH';

  // Animation Frame
  private animFrameId: number | null = null;

  constructor(canvas3D: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement | null, callbacks: GameCallbacks) {
    this.canvas3D = canvas3D;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
    this.callbacks = callbacks;
    this.threeRenderer = new ThreeRenderer(canvas3D);
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'F2') {
        this.debugMode = !this.debugMode;
        e.preventDefault();
      }
      if (e.code === 'Space') {
        this.triggerDash();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    const target = this.overlayCanvas || this.canvas3D;

    target.addEventListener('mousemove', e => {
      const rect = target.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    target.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.fireSecondaryManual();
        e.preventDefault();
      }
    });

    target.addEventListener('mouseup', e => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    target.addEventListener('contextmenu', e => e.preventDefault());
  }

  public startNewRun(shipId: ShipId, meta: MetaProgression) {
    audio.init();
    audio.resume();

    this.isRunning = true;
    this.isPaused = false;
    this.runTime = 0;
    this.score = 0;
    this.playerLevel = 1;
    this.playerXp = 0;
    this.xpToNextLevel = 45;
    this.voidCredits = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.isFever = false;
    this.feverTimer = 0;
    this.damageDealtTotal = 0;
    this.critsLanded = 0;
    this.damageTakenTotal = 0;
    this.totalKills = 0;
    this.bossesKilled = 0;
    this.nemesisKilled = 0;
    this.currentSectorId = 'NEON_NEBULA';
    this.shipClassId = shipId;

    this.pool.resetAll();
    this.enemies = [];
    this.activeBoss = null;
    this.activeNemesis = null;
    this.portals = [];
    this.activeMission = generateDynamicMission(1);
    this.activeEvent = null;

    // Apply ship base stats + permanent meta upgrades
    const shipDef = SHIP_CLASSES[shipId] || SHIP_CLASSES.INTERCEPTOR;
    const { upgrades } = meta;

    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.angle = 0;

    const bonusHp = (upgrades.hullReinforcement || 0) * 20;
    const bonusShield = (upgrades.shieldMatrix || 0) * 15;
    const bonusSpeed = (upgrades.warpThrusters || 0) * 12;
    const bonusDamage = (upgrades.plasmaCapacitors || 0) * 0.08;
    const bonusMagnet = (upgrades.quantumMagnet || 0) * 25;

    this.player.maxHp = shipDef.baseStats.maxHp + bonusHp;
    this.player.hp = this.player.maxHp;
    this.player.maxShield = shipDef.baseStats.maxShield + bonusShield;
    this.player.shield = this.player.maxShield;
    this.player.shieldRegenRate = shipDef.baseStats.shieldRegen + (upgrades.shieldMatrix || 0) * 1.5;
    this.player.speed = shipDef.baseStats.speed + bonusSpeed;
    this.player.damageMult = shipDef.baseStats.damageMult + bonusDamage;
    this.player.fireRateMult = shipDef.baseStats.fireRateMult;
    this.player.critChance = shipDef.baseStats.critChance;
    this.player.critMult = shipDef.baseStats.critMult;
    this.player.armor = shipDef.baseStats.armor;
    this.player.pickupRadius = shipDef.baseStats.pickupRadius + bonusMagnet;
    this.player.invulnerableTimer = 1.0;
    this.player.dashCooldown = 0;
    this.player.isDashing = false;
    this.player.dashDuration = 0;

    // Reset upgrades
    this.activeWeapons.clear();
    this.evolvedWeapons.clear();
    this.acquiredUpgrades.clear();
    this.discoveredSynergies = new Set(meta.discoveredSynergies || []);

    // Add starting weapon
    this.activeWeapons.set(shipDef.startingWeapon, { level: 1, timer: 0 });
    this.favoriteWeapon = shipDef.startingWeapon;

    this.threeRenderer.setPlayerShipClass(shipId);
    this.updateVisualUpgrades();
    this.camera.x = 0;
    this.camera.y = 0;

    this.director.forcePhase('CALM');
    this.callbacks.onMissionUpdate(this.activeMission);
    this.callbacks.onBossStateChange(null);
    this.callbacks.onNemesisStateChange(null);
    this.callbacks.onSectorTransition(this.currentSectorId);

    this.lastFrameTime = performance.now();
    if (!this.animFrameId) {
      this.loop(performance.now());
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  public triggerDash() {
    if (this.player.dashCooldown <= 0 && !this.player.isDashing) {
      this.player.isDashing = true;
      this.player.dashDuration = 0.22;
      this.player.dashCooldown = this.shipClassId === 'PHANTOM' ? 2.0 : 3.2;
      this.player.invulnerableTimer = 0.35;

      // Burst particles
      for (let i = 0; i < 16; i++) {
        const angle = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.8;
        const spd = 120 + Math.random() * 160;
        this.pool.spawnParticle({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: 3,
          color: '#38bdf8',
          decay: 2.5,
        });
      }
      audio.playLaser('PLASMA');
    }
  }

  public selectUpgrade(upgrade: UpgradeDef) {
    const currentLvl = this.acquiredUpgrades.get(upgrade.id) || 0;
    this.acquiredUpgrades.set(upgrade.id, currentLvl + 1);

    // Apply stat benefits
    if (upgrade.statEffects) {
      if (upgrade.statEffects.maxHp) {
        this.player.maxHp += upgrade.statEffects.maxHp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + upgrade.statEffects.maxHp);
      }
      if (upgrade.statEffects.maxShield) {
        this.player.maxShield += upgrade.statEffects.maxShield;
        this.player.shield = this.player.maxShield;
      }
      if (upgrade.statEffects.shieldRegen) this.player.shieldRegenRate += upgrade.statEffects.shieldRegen;
      if (upgrade.statEffects.speed) this.player.speed += upgrade.statEffects.speed;
      if (upgrade.statEffects.damageMult) this.player.damageMult += upgrade.statEffects.damageMult;
      if (upgrade.statEffects.fireRateMult) this.player.fireRateMult += upgrade.statEffects.fireRateMult;
      if (upgrade.statEffects.critChance) this.player.critChance += upgrade.statEffects.critChance;
      if (upgrade.statEffects.critMult) this.player.critMult += upgrade.statEffects.critMult;
      if (upgrade.statEffects.armor) this.player.armor += upgrade.statEffects.armor;
      if (upgrade.statEffects.pickupRadius) this.player.pickupRadius += upgrade.statEffects.pickupRadius;
      if (upgrade.statEffects.pierce) this.player.pierce += upgrade.statEffects.pierce;
      if (upgrade.statEffects.extraProjectiles) this.player.extraProjectiles += upgrade.statEffects.extraProjectiles;
    }

    // Check weapon unlocks / additions
    Object.keys(WEAPON_DEFINITIONS).forEach(wId => {
      const wid = wId as WeaponId;
      if (upgrade.id === `WEAPON_${wid}` && !this.activeWeapons.has(wid)) {
        this.activeWeapons.set(wid, { level: 1, timer: 0 });
      }
    });

    // Check for Weapon Evolutions!
    this.checkWeaponEvolutions();

    // Check for Secret Synergies!
    this.checkSecretSynergies();

    this.updateVisualUpgrades();
    audio.playLevelUp();
    this.resume();
  }

  private checkWeaponEvolutions() {
    this.activeWeapons.forEach((weaponData, weaponId) => {
      const def = WEAPON_DEFINITIONS[weaponId];
      if (def && !this.evolvedWeapons.has(def.evolutionResult)) {
        const requiredUpgradeLvl = this.acquiredUpgrades.get(def.evolutionRequiredUpgrade) || 0;
        // Evolution condition: Weapon level >= 3 and has required core upgrade
        if (weaponData.level >= 3 && requiredUpgradeLvl >= 1) {
          this.triggerEvolution(def.evolutionResult, weaponId);
        }
      }
    });
  }

  private triggerEvolution(evolvedId: EvolvedWeaponId, baseId: WeaponId) {
    this.evolvedWeapons.add(evolvedId);
    this.activeWeapons.delete(baseId);
    this.favoriteWeapon = evolvedId;

    // Trigger Slow Motion & Shockwave
    this.timeDilation = 0.2;
    setTimeout(() => {
      this.timeDilation = 1.0;
    }, 1200);

    this.camera.shake = 25;
    this.pool.spawnShockwave(this.player.x, this.player.y, 280, '#c084fc', 350);

    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const spd = 160 + Math.random() * 200;
      this.pool.spawnParticle({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 4,
        color: '#e879f9',
        decay: 1.8,
      });
    }

    audio.playWeaponEvolution();
    this.callbacks.onWeaponEvolved(evolvedId);
    this.callbacks.onAchievementUnlocked('EVOLUTION_MASTER');
  }

  private checkSecretSynergies() {
    SECRET_SYNERGIES.forEach(synergy => {
      if (!this.discoveredSynergies.has(synergy.id)) {
        const hasA = this.activeWeapons.has(synergy.weaponA as WeaponId) || this.evolvedWeapons.has(synergy.weaponA as EvolvedWeaponId);
        const hasB = this.activeWeapons.has(synergy.weaponB as WeaponId) || this.evolvedWeapons.has(synergy.weaponB as EvolvedWeaponId);
        if (hasA && hasB) {
          this.discoveredSynergies.add(synergy.id);
          this.callbacks.onSynergyDiscovered(synergy.id);
          this.pool.spawnDamageNumber({
            x: this.player.x,
            y: this.player.y - 30,
            damage: 0,
            isCrit: true,
          });
        }
      }
    });
  }

  private updateVisualUpgrades() {
    const armorLvl = this.acquiredUpgrades.get('TITANIUM_PLATING') || 0;
    const thrustersLvl = this.acquiredUpgrades.get('HYPER_THRUSTER') || 0;
    const shieldLvl = this.acquiredUpgrades.get('HEX_SHIELD_ARRAY') || 0;

    this.visualUpgrades = {
      armorLevel: armorLvl,
      thrustersLevel: thrustersLvl,
      shieldLevel: shieldLvl,
      weapons: Array.from(this.activeWeapons.keys()),
      evolvedWeapons: Array.from(this.evolvedWeapons),
    };

    this.threeRenderer.updateModularShipVisuals(this.visualUpgrades);
  }

  // ===================== CORE GAME LOOP =====================

  private loop = (timestamp: number) => {
    const rawDt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    // Rolling FPS computation
    if (rawDt > 0) {
      const curFps = 1 / rawDt;
      this.fpsBuffer.push(curFps);
      if (this.fpsBuffer.length > 30) this.fpsBuffer.shift();
      this.fps = Math.round(this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length);
      this.adaptGraphicsQuality();
    }

    if (this.isRunning && !this.isPaused) {
      const dt = rawDt * this.timeDilation;
      this.update(dt);
    }

    this.render(rawDt);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private adaptGraphicsQuality() {
    // Graceful automatic performance tuning
    if (this.fps < 42 && this.graphicsQuality !== 'LOW') {
      if (this.graphicsQuality === 'ULTRA') this.graphicsQuality = 'HIGH';
      else if (this.graphicsQuality === 'HIGH') this.graphicsQuality = 'MEDIUM';
      else if (this.graphicsQuality === 'MEDIUM') this.graphicsQuality = 'LOW';
    } else if (this.fps > 58 && this.graphicsQuality === 'LOW' && this.runTime > 15) {
      this.graphicsQuality = 'MEDIUM';
    }
  }

  private update(dt: number) {
    this.runTime += dt;

    // 1. UPDATE GAME DIRECTOR
    const directorReport = this.director.update(dt, {
      nowSec: this.runTime,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      shield: this.player.shield,
      maxShield: this.player.maxShield,
      playerLevel: this.playerLevel,
      weaponCount: this.activeWeapons.size + this.evolvedWeapons.size,
      activeEnemies: this.enemies.length,
      isBossAlive: this.activeBoss !== null && !this.activeBoss.isDying,
    });

    if (directorReport.phaseChanged) {
      if (directorReport.newPhase === 'CHAOS') {
        audio.playAlertKlaxon();
      }
    }

    if (directorReport.shouldTriggerEvent && !this.activeEvent && !this.activeBoss) {
      this.activeEvent = generateSpaceEvent();
      this.callbacks.onEventUpdate(this.activeEvent);
      audio.playSectorTransition();
    }

    // 2. ADAPTIVE MUSIC LAYERS
    audio.updateMusicLayers({
      intensity: this.director.state.tensionScore / 100,
      isEliteAlive: this.activeNemesis !== null,
      isBossAlive: this.activeBoss !== null,
      isVoidActive: this.currentSectorId === 'VOID_STORM' || this.currentSectorId === 'BLACK_HOLE_REGION',
      isFeverActive: this.isFever,
      playerHpRatio: this.player.hp / Math.max(1, this.player.maxHp),
    });

    // 3. COMBO & FEVER SYSTEM
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        if (this.isFever) {
          this.isFever = false;
          this.callbacks.onFeverChange(false, 0);
        }
      }
    }

    if (this.combo >= 45 && !this.isFever) {
      this.isFever = true;
      this.feverTimer = 12;
      audio.playFeverStart();
      this.callbacks.onFeverChange(true, this.combo);
      this.callbacks.onAchievementUnlocked('FEVER_DEMON');
      this.camera.shake = 15;
    }

    if (this.isFever) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) {
        this.isFever = false;
        this.combo = 20; // Soft reset
        this.callbacks.onFeverChange(false, this.combo);
      }
    }

    // 4. PLAYER MOVEMENT & CONTROLS
    this.updatePlayerMovement(dt);

    // 5. WEAPON AUTO-FIRING & BEHAVIORS
    this.updateWeapons(dt);

    // 6. ENEMY SPAWNING & FORMATIONS
    this.updateEnemySpawning(dt, directorReport.recommendedSpawnRate);

    // 7. ENEMY UPDATES & AI
    this.updateEnemies(dt);

    // 8. BOSS & CAPITAL SHIP UPDATES
    this.updateBoss(dt);

    // 9. NEMESIS UPDATES
    this.updateNemesis(dt);

    // 10. OBJECT POOLS (Projectiles, Bullets, Pickups, Debris, Particles)
    this.updatePooledObjects(dt);

    // 11. PORTALS
    this.updatePortals(dt);

    // 12. DYNAMIC MISSIONS & EVENTS
    this.updateMissionsAndEvents(dt);

    // 13. CAMERA POSITION & SHAKE
    this.camera.x += (this.player.x - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.camera.y) * 0.12;
    if (this.camera.shake > 0) {
      this.camera.shake = Math.max(0, this.camera.shake - dt * 35);
    }
  }

  private updatePlayerMovement(dt: number) {
    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }

    // Dash speed burst
    let currentSpeed = this.player.speed;
    if (this.player.isDashing) {
      currentSpeed *= 3.0;
      this.player.dashDuration -= dt;
      if (this.player.dashDuration <= 0) {
        this.player.isDashing = false;
      }
    }

    if (this.isFever) {
      currentSpeed *= 1.25;
    }

    this.player.vx += (moveX * currentSpeed - this.player.vx) * 0.18;
    this.player.vy += (moveY * currentSpeed - this.player.vy) * 0.18;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Face forward flight depth with true 3D raycaster aiming
    const aimTarget = this.threeRenderer.getAimPointOnCombatPlane(
      this.mousePos.x,
      this.mousePos.y,
      this.canvas3D.width,
      this.canvas3D.height,
      this.player.x,
      this.player.y
    );
    this.currentAimTarget.copy(aimTarget);

    const targetAngle = Math.atan2(aimTarget.z - this.player.y, aimTarget.x - this.player.x);
    let delta = targetAngle - (-Math.PI / 2);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const clampedDelta = Math.max(-Math.PI * 0.38, Math.min(Math.PI * 0.38, delta));
    this.player.angle = -Math.PI / 2 + clampedDelta;

    // Detect if mouse cursor is aiming at any enemy in 3D
    this.detectEnemyUnderReticle();

    // Shield Recharge
    if (this.player.shieldCooldownTimer > 0) {
      this.player.shieldCooldownTimer -= dt;
    } else if (this.player.shield < this.player.maxShield) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + this.player.shieldRegenRate * dt);
    }

    // Dash Cooldown
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown -= dt;
    }

    // Secondary Cooldown
    if (this.secondaryCooldownTimer > 0) {
      this.secondaryCooldownTimer -= dt;
    }

    // Hit and kill marker timers decay
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer -= dt;
    if (this.killMarkerTimer > 0) this.killMarkerTimer -= dt;
    if (this.crosshairRecoil > 0) this.crosshairRecoil = Math.max(0, this.crosshairRecoil - dt * 26);

    // Invulnerability timer
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Spawn subtle thruster exhaust particles
    if (Math.hypot(this.player.vx, this.player.vy) > 30) {
      const backAngle = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.4;
      const speed = 60 + Math.random() * 80;
      this.pool.spawnParticle({
        x: this.player.x - Math.cos(this.player.angle) * 12,
        y: this.player.y - Math.sin(this.player.angle) * 12,
        vx: Math.cos(backAngle) * speed,
        vy: Math.sin(backAngle) * speed,
        radius: 2,
        color: this.isFever ? '#f59e0b' : '#38bdf8',
        decay: 3.5,
      });
    }
  }

  private detectEnemyUnderReticle() {
    this.isAimingAtEnemy = false;
    this.aimedEnemyId = null;

    if (!this.overlayCanvas) return;
    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;
    const mx = this.mousePos.x;
    const my = this.mousePos.y;

    const proj = new THREE.Vector3();

    // Check boss
    if (this.activeBoss && !this.activeBoss.isDying) {
      proj.set(this.activeBoss.x, 6, this.activeBoss.y);
      proj.project(this.threeRenderer.camera);
      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-(proj.y * 0.5) + 0.5) * h;
      if (Math.hypot(sx - mx, sy - my) < 70) {
        this.isAimingAtEnemy = true;
        this.aimedEnemyId = this.activeBoss.id;
        return;
      }
    }

    // Check nemesis
    if (this.activeNemesis) {
      proj.set(this.activeNemesis.x, 4, this.activeNemesis.y);
      proj.project(this.threeRenderer.camera);
      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-(proj.y * 0.5) + 0.5) * h;
      if (Math.hypot(sx - mx, sy - my) < 45) {
        this.isAimingAtEnemy = true;
        this.aimedEnemyId = this.activeNemesis.id;
        return;
      }
    }

    // Check enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      proj.set(e.x, 3, e.y);
      proj.project(this.threeRenderer.camera);
      if (proj.z > 1.0) continue; // Behind camera
      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-(proj.y * 0.5) + 0.5) * h;
      if (Math.hypot(sx - mx, sy - my) < 38) {
        this.isAimingAtEnemy = true;
        this.aimedEnemyId = e.id;
        return;
      }
    }
  }

  public fireSecondaryManual() {
    const secondaryKeys: WeaponId[] = ['RAILGUN', 'MISSILE_PODS', 'SPREAD_SHOT', 'TESLA_COIL'];
    let fired = false;
    for (const wid of secondaryKeys) {
      const state = this.activeWeapons.get(wid);
      if (state) {
        this.fireWeapon(wid, state.level);
        state.timer = 0;
        fired = true;
        break;
      }
    }

    // If no secondary weapon has been acquired yet, fire an Overcharged Twin-Pulse Burst
    if (!fired && this.secondaryCooldownTimer <= 0) {
      this.secondaryCooldownTimer = 1.4;
      this.threeRenderer.triggerMuzzleFlash('LEFT');
      this.threeRenderer.triggerMuzzleFlash('RIGHT');
      audio.playLaser('RAILGUN');
      this.camera.shake = 3.2;
      this.crosshairRecoil = 15;

      const leftPos = this.threeRenderer.getLeftMuzzleWorldPos();
      const rightPos = this.threeRenderer.getRightMuzzleWorldPos();
      [leftPos, rightPos].forEach(pos => {
        const dx = this.currentAimTarget.x - pos.x;
        const dy = this.currentAimTarget.z - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.pool.spawnProjectile({
          x: pos.x,
          y: pos.y,
          vx: (dx / dist) * 780,
          vy: (dy / dist) * 780,
          damage: 50 * this.player.damageMult,
          radius: 7,
          color: '#38bdf8',
          glowColor: 'rgba(56, 189, 248, 1.0)',
          isCrit: true,
          weaponType: 'PLASMA',
          pierce: 3,
        });
      });
    }
  }

  private updateWeapons(dt: number) {
    const fireRateBoost = this.player.fireRateMult * (this.isFever ? 1.4 : 1.0);

    // 1. PRIMARY WEAPON: CAÑÓN DE PULSOS (Fires rapidly on left click/hold)
    const primaryId: WeaponId = 'PLASMA_BLASTER';
    const primaryState = this.activeWeapons.get(primaryId);
    if (primaryState) {
      primaryState.timer += dt * fireRateBoost;
      // Cadence for intense, crisp "RATATATATA" pulse fire (~6 to 8 pulses per sec)
      const primaryCadence = 0.15 / fireRateBoost;
      if (this.isMouseDown && primaryState.timer >= primaryCadence) {
        primaryState.timer = 0;
        this.fireWeapon(primaryId, primaryState.level);
      }
    }

    // 2. SECONDARY WEAPONS
    this.activeWeapons.forEach((weaponState, weaponId) => {
      if (weaponId === primaryId) return;
      const def = WEAPON_DEFINITIONS[weaponId];
      if (!def) return;

      weaponState.timer += dt * fireRateBoost;
      // Drones fire automatically; other heavy weapons fire on right click or mouse fire
      const shouldFire = weaponId === 'COMBAT_DRONES' ? true : (this.isRightMouseDown || this.isMouseDown);
      if (shouldFire && weaponState.timer >= def.baseCooldown) {
        weaponState.timer = 0;
        this.fireWeapon(weaponId, weaponState.level);
      }
    });

    // 3. EVOLVED WEAPONS
    this.evolvedWeapons.forEach(evolvedId => {
      const def = EVOLVED_WEAPON_DEFINITIONS[evolvedId];
      if (!def) return;

      let evolvedState = this.activeWeapons.get(def.baseWeaponId);
      if (!evolvedState) {
        evolvedState = { level: 5, timer: 0 };
        this.activeWeapons.set(def.baseWeaponId, evolvedState);
      }

      evolvedState.timer += dt * fireRateBoost;
      if ((this.isMouseDown || this.isRightMouseDown) && evolvedState.timer >= def.cooldown) {
        evolvedState.timer = 0;
        this.fireEvolvedWeapon(evolvedId);
      }
    });
  }

  private findNearestEnemy(maxRange: number = 800): { x: number; y: number; id: number } | null {
    let nearest: { x: number; y: number; id: number } | null = null;
    let minDist = maxRange;

    // Check boss first if active
    if (this.activeBoss && !this.activeBoss.isDying) {
      const dist = Math.hypot(this.activeBoss.x - this.player.x, this.activeBoss.y - this.player.y);
      if (dist < minDist) {
        return { x: this.activeBoss.x, y: this.activeBoss.y, id: this.activeBoss.id };
      }
    }

    // Check nemesis
    if (this.activeNemesis) {
      const dist = Math.hypot(this.activeNemesis.x - this.player.x, this.activeNemesis.y - this.player.y);
      if (dist < minDist) {
        return { x: this.activeNemesis.x, y: this.activeNemesis.y, id: this.activeNemesis.id };
      }
    }

    // Check regular enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < minDist) {
        minDist = d;
        nearest = { x: e.x, y: e.y, id: e.id };
      }
    }
    return nearest;
  }

  private fireWeapon(id: WeaponId, level: number) {
    const def = WEAPON_DEFINITIONS[id];
    const target = this.findNearestEnemy(def.range);
    const aimAngle = target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.angle;
    const baseDamage = def.baseDamage * this.player.damageMult * (1 + (level - 1) * 0.25);
    const isCrit = Math.random() < this.player.critChance;
    const damage = isCrit ? baseDamage * this.player.critMult : baseDamage;

    switch (id) {
      case 'PLASMA_BLASTER': {
        // Physical hardpoints on wings: Alternate Left & Right barrels every shot
        const barrel: 'LEFT' | 'RIGHT' = this.threeRenderer.lastFiredBarrel === 'LEFT' ? 'RIGHT' : 'LEFT';
        this.threeRenderer.triggerMuzzleFlash(barrel);
        audio.playPulseShot(barrel);

        this.crosshairRecoil = Math.min(18, this.crosshairRecoil + 3.8);
        this.camera.shake = Math.min(2.5, this.camera.shake + 0.4);

        const muzzlePos = barrel === 'LEFT' ? this.threeRenderer.getLeftMuzzleWorldPos() : this.threeRenderer.getRightMuzzleWorldPos();

        // 3D vector to aim target point on combat plane
        const dx = this.currentAimTarget.x - muzzlePos.x;
        const dy = this.currentAimTarget.z - muzzlePos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const baseAngle = Math.atan2(dy, dx);

        const projCount = 1 + this.player.extraProjectiles;
        for (let i = 0; i < projCount; i++) {
          const spread = (i - (projCount - 1) / 2) * 0.06;
          const shotAngle = baseAngle + spread;
          const vx = Math.cos(shotAngle) * def.projectileSpeed;
          const vy = Math.sin(shotAngle) * def.projectileSpeed;

          this.pool.spawnProjectile({
            x: muzzlePos.x,
            y: muzzlePos.y,
            vx,
            vy,
            damage,
            radius: def.projectileSize,
            color: '#38bdf8',
            glowColor: 'rgba(56, 189, 248, 0.95)',
            isCrit,
            weaponType: 'PLASMA',
            pierce: def.pierce + this.player.pierce - 1,
          });

          // Trailing muzzle sparks
          for (let s = 0; s < 3; s++) {
            const spd = 60 + Math.random() * 100;
            const a = shotAngle + (Math.random() - 0.5) * 0.4;
            this.pool.spawnParticle({
              x: muzzlePos.x,
              y: muzzlePos.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              radius: 2.2,
              color: '#38bdf8',
              decay: 5.5,
            });
          }
        }
        break;
      }

      case 'RAILGUN': {
        this.pool.spawnProjectile({
          x: this.player.x + Math.cos(aimAngle) * 20,
          y: this.player.y + Math.sin(aimAngle) * 20,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: def.projectileSize,
          color: '#a855f7',
          glowColor: 'rgba(168, 85, 247, 0.9)',
          isCrit,
          weaponType: 'RAILGUN',
          pierce: def.pierce + this.player.pierce + 2,
        });
        audio.playLaser('RAILGUN');
        this.camera.shake = 3.5;
        break;
      }

      case 'MISSILE_PODS': {
        const count = 2 + this.player.extraProjectiles;
        for (let i = 0; i < count; i++) {
          const angle = aimAngle + (i === 0 ? -0.35 : 0.35);
          this.pool.spawnProjectile({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * def.projectileSpeed * 0.6,
            vy: Math.sin(angle) * def.projectileSpeed * 0.6,
            damage,
            radius: def.projectileSize,
            color: '#f97316',
            glowColor: 'rgba(249, 115, 22, 0.8)',
            isCrit,
            weaponType: 'MISSILE',
            isHoming: true,
            homingTargetId: target?.id,
            homingStrength: 5.5,
            explodeRadius: 45,
            pierce: 1,
          });
        }
        audio.playLaser('MISSILE');
        break;
      }

      case 'COMBAT_DRONES': {
        if (!target) return;
        this.pool.spawnProjectile({
          x: this.player.x + (Math.random() - 0.5) * 30,
          y: this.player.y + (Math.random() - 0.5) * 30,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: def.projectileSize,
          color: '#10b981',
          glowColor: 'rgba(16, 185, 129, 0.8)',
          isCrit,
          weaponType: 'DRONE',
          pierce: 1,
        });
        audio.playLaser('PLASMA');
        break;
      }

      case 'SPREAD_SHOT': {
        const pellets = 5 + this.player.extraProjectiles * 2;
        for (let i = 0; i < pellets; i++) {
          const spread = (i - (pellets - 1) / 2) * 0.16;
          const angle = aimAngle + spread;
          this.pool.spawnProjectile({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * (def.projectileSpeed + (Math.random() - 0.5) * 80),
            vy: Math.sin(angle) * (def.projectileSpeed + (Math.random() - 0.5) * 80),
            damage: damage * 0.6,
            radius: def.projectileSize,
            color: '#eab308',
            glowColor: 'rgba(234, 179, 8, 0.8)',
            isCrit,
            weaponType: 'SPREAD',
            pierce: def.pierce,
          });
        }
        audio.playLaser('SPREAD');
        break;
      }

      case 'TESLA_COIL': {
        if (!target) return;
        this.pool.spawnProjectile({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: def.projectileSize,
          color: '#06b6d4',
          glowColor: 'rgba(6, 182, 212, 0.9)',
          isCrit,
          weaponType: 'TESLA',
          pierce: 3,
          bounceCount: 2,
        });
        audio.playLaser('TESLA');
        break;
      }
    }
  }

  private fireEvolvedWeapon(id: EvolvedWeaponId) {
    const def = EVOLVED_WEAPON_DEFINITIONS[id];
    const target = this.findNearestEnemy(900);
    const aimAngle = target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : this.player.angle;
    const isCrit = Math.random() < (this.player.critChance + 0.15);
    const damage = (isCrit ? def.damage * this.player.critMult : def.damage) * this.player.damageMult;

    switch (id) {
      case 'SUPERNOVA_CANNON': {
        // Fires massive exploding star
        this.pool.spawnProjectile({
          x: this.player.x + Math.cos(aimAngle) * 20,
          y: this.player.y + Math.sin(aimAngle) * 20,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: 12,
          color: '#f59e0b',
          glowColor: 'rgba(245, 158, 11, 0.95)',
          isCrit,
          weaponType: 'SUPERNOVA',
          explodeRadius: 95,
          pierce: 3,
          isEvolved: true,
        });
        audio.playLaser('EVOLVED');
        this.camera.shake = 5;
        break;
      }

      case 'VOID_LANCE': {
        // Devastating instant singularity beam
        this.pool.spawnProjectile({
          x: this.player.x + Math.cos(aimAngle) * 25,
          y: this.player.y + Math.sin(aimAngle) * 25,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: 10,
          color: '#c084fc',
          glowColor: 'rgba(192, 132, 252, 1.0)',
          isCrit: true,
          weaponType: 'VOID_LANCE',
          pierce: 99,
          isEvolved: true,
        });
        audio.playLaser('EVOLVED');
        this.camera.shake = 6;
        break;
      }

      case 'DOOMSDAY_SALVO': {
        for (let i = 0; i < 5; i++) {
          const spreadAngle = aimAngle + (i - 2) * 0.28;
          this.pool.spawnProjectile({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(spreadAngle) * def.projectileSpeed * 0.8,
            vy: Math.sin(spreadAngle) * def.projectileSpeed * 0.8,
            damage,
            radius: 8,
            color: '#ef4444',
            glowColor: 'rgba(239, 68, 68, 0.95)',
            isCrit,
            weaponType: 'DOOMSDAY',
            isHoming: true,
            homingTargetId: target?.id,
            homingStrength: 7.0,
            explodeRadius: 75,
            pierce: 1,
            isEvolved: true,
          });
        }
        audio.playLaser('EVOLVED');
        break;
      }

      case 'OMEGA_SWARM': {
        for (let d = 0; d < 3; d++) {
          const angle = aimAngle + (Math.random() - 0.5) * 0.3;
          this.pool.spawnProjectile({
            x: this.player.x + (Math.random() - 0.5) * 40,
            y: this.player.y + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * def.projectileSpeed,
            vy: Math.sin(angle) * def.projectileSpeed,
            damage,
            radius: 6,
            color: '#34d399',
            glowColor: 'rgba(52, 211, 153, 0.9)',
            isCrit,
            weaponType: 'OMEGA_SWARM',
            pierce: 2,
            isEvolved: true,
          });
        }
        audio.playLaser('PLASMA');
        break;
      }

      case 'STARFALL_BARRAGE': {
        const count = 10;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          this.pool.spawnProjectile({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * def.projectileSpeed,
            vy: Math.sin(angle) * def.projectileSpeed,
            damage,
            radius: 7,
            color: '#f43f5e',
            glowColor: 'rgba(244, 63, 94, 0.9)',
            isCrit,
            weaponType: 'STARFALL',
            bounceCount: 3,
            pierce: 4,
            isEvolved: true,
          });
        }
        audio.playLaser('SPREAD');
        break;
      }

      case 'ARCLIGHT_STORM': {
        this.pool.spawnProjectile({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(aimAngle) * def.projectileSpeed,
          vy: Math.sin(aimAngle) * def.projectileSpeed,
          damage,
          radius: 8,
          color: '#38bdf8',
          glowColor: 'rgba(56, 189, 248, 1.0)',
          isCrit,
          weaponType: 'ARCLIGHT',
          bounceCount: 5,
          pierce: 8,
          isEvolved: true,
        });
        audio.playLaser('TESLA');
        break;
      }
    }
  }

  // ===================== ENEMY & FORMATION LOGIC =====================

  private spawnCooldown = 1.0;

  private updateEnemySpawning(dt: number, spawnMultiplier: number) {
    if (this.enemies.length >= 85) return; // Performance cap

    this.spawnCooldown -= dt * spawnMultiplier;
    if (this.spawnCooldown <= 0) {
      this.spawnCooldown = 0.8 + Math.random() * 0.6;

      const sector = SECTORS[this.currentSectorId];
      const sectorDiff = sector.enemyMultiplier;

      // Spawn Formations based on Tension Phase
      const phase = this.director.state.phase;
      if (phase === 'GROWTH' || phase === 'TENSION') {
        const formationTypes = ['V_FORMATION', 'CIRCLE_SURROUND', 'ATTACK_LINE'];
        const chosen = formationTypes[Math.floor(Math.random() * formationTypes.length)];
        this.spawnEnemyFormation(chosen, sectorDiff);
      } else {
        // Standard pack spawn
        const packSize = phase === 'CHAOS' ? 6 : 3;
        const angle = Math.random() * Math.PI * 2;
        const dist = 650;
        const cx = this.player.x + Math.cos(angle) * dist;
        const cy = this.player.y + Math.sin(angle) * dist;

        for (let i = 0; i < packSize; i++) {
          this.spawnSingleEnemy(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80, 'SWARM', sectorDiff);
        }
      }

      // Check Nemesis Spawn
      if ((phase === 'TENSION' || phase === 'CHAOS') && !this.activeNemesis && Math.random() < this.director.state.eliteChance) {
        this.spawnNemesis(sectorDiff);
      }

      // Check Boss Spawn (At minutes 2:30, 5:00, 8:00, etc.)
      const bossSpawnThreshold = 150 * (this.bossesKilled + 1);
      if (this.runTime >= bossSpawnThreshold && !this.activeBoss) {
        this.spawnBoss(sectorDiff);
      }
    }
  }

  private spawnSingleEnemy(x: number, y: number, type: 'SWARM' | 'INTERCEPTOR' | 'CRUISER' | 'KAMIKAZE', sectorDiff: number) {
    const hpMult = (1 + (this.playerLevel - 1) * 0.12) * sectorDiff;
    let baseHp = 35 * hpMult;
    let speed = 120;
    let radius = 12;
    let color = '#f43f5e';
    let glowColor = 'rgba(244, 63, 94, 0.7)';
    let damage = 12;

    if (type === 'INTERCEPTOR') {
      baseHp = 45 * hpMult;
      speed = 175;
      radius = 14;
      color = '#fb923c';
      glowColor = 'rgba(251, 146, 60, 0.7)';
      damage = 16;
    } else if (type === 'CRUISER') {
      baseHp = 130 * hpMult;
      speed = 80;
      radius = 22;
      color = '#a855f7';
      glowColor = 'rgba(168, 85, 247, 0.7)';
      damage = 25;
    } else if (type === 'KAMIKAZE') {
      baseHp = 25 * hpMult;
      speed = 220;
      radius = 11;
      color = '#ef4444';
      glowColor = 'rgba(239, 68, 68, 0.9)';
      damage = 35;
    }

    this.enemies.push({
      id: Math.floor(Math.random() * 1000000),
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp: baseHp,
      maxHp: baseHp,
      speed,
      damage,
      type,
      color,
      glowColor,
      attackTimer: 2.0 + Math.random() * 2.0,
      telegraphTimer: 0,
      targetAngle: 0,
      isTelegraphing: false,
    });
  }

  private spawnEnemyFormation(type: string, sectorDiff: number) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 700;
    const cx = this.player.x + Math.cos(angle) * dist;
    const cy = this.player.y + Math.sin(angle) * dist;

    if (type === 'V_FORMATION') {
      // 5 interceptors in V shape
      for (let i = 0; i < 5; i++) {
        const offset = i - 2;
        const fx = cx + Math.cos(angle + Math.PI / 2) * offset * 40 - Math.cos(angle) * Math.abs(offset) * 30;
        const fy = cy + Math.sin(angle + Math.PI / 2) * offset * 40 - Math.sin(angle) * Math.abs(offset) * 30;
        this.spawnSingleEnemy(fx, fy, 'INTERCEPTOR', sectorDiff);
      }
    } else if (type === 'CIRCLE_SURROUND') {
      // 8 swarms surrounding player in circle
      const r = 620;
      for (let i = 0; i < 8; i++) {
        const ca = (i / 8) * Math.PI * 2;
        this.spawnSingleEnemy(this.player.x + Math.cos(ca) * r, this.player.y + Math.sin(ca) * r, 'SWARM', sectorDiff);
      }
    } else if (type === 'ATTACK_LINE') {
      // Line sweep led by Cruiser with 2 interceptors
      this.spawnSingleEnemy(cx, cy, 'CRUISER', sectorDiff);
      this.spawnSingleEnemy(cx + 45, cy + 45, 'INTERCEPTOR', sectorDiff);
      this.spawnSingleEnemy(cx - 45, cy - 45, 'INTERCEPTOR', sectorDiff);
    }
  }

  private spawnNemesis(sectorDiff: number) {
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * 720;
    const y = this.player.y + Math.sin(angle) * 720;
    this.activeNemesis = createProceduralNemesis(Math.floor(Math.random() * 100000), x, y, sectorDiff);
    this.callbacks.onNemesisStateChange(this.activeNemesis);
    audio.playAlertKlaxon();
    this.camera.shake = 8;
  }

  private spawnBoss(sectorDiff: number) {
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * 850;
    const y = this.player.y + Math.sin(angle) * 850;
    this.activeBoss = createCapitalShipBoss(Math.floor(Math.random() * 100000), x, y, sectorDiff);
    this.callbacks.onBossStateChange(this.activeBoss);
    audio.playAlertKlaxon();
    this.camera.shake = 18;
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);

      // AI Movement
      if (dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Kamikaze charges straight, others keep slight spacing
        e.vx += (nx * e.speed - e.vx) * 0.1;
        e.vy += (ny * e.speed - e.vy) * 0.1;

        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }

      // Attack & Telegraphing Logic
      if (e.type === 'CRUISER') {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0.8 && !e.isTelegraphing) {
          e.isTelegraphing = true;
          e.targetAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          audio.playTelegraphTone(0.8);
        }

        if (e.attackTimer <= 0) {
          e.isTelegraphing = false;
          e.attackTimer = 3.5 + Math.random();
          // Fire telegraphed heavy plasma bolt
          this.pool.spawnEnemyBullet({
            x: e.x + Math.cos(e.targetAngle) * 18,
            y: e.y + Math.sin(e.targetAngle) * 18,
            vx: Math.cos(e.targetAngle) * 360,
            vy: Math.sin(e.targetAngle) * 360,
            damage: 26,
            radius: 6,
            color: '#a855f7',
            glowColor: 'rgba(168, 85, 247, 0.8)',
          });
        }
      }

      // Collision with Player
      if (dist < e.radius + 16 && this.player.invulnerableTimer <= 0) {
        this.damagePlayer(e.damage);
        // Kamikaze detonates on impact
        if (e.type === 'KAMIKAZE') {
          this.pool.spawnDebrisBurst(e.x, e.y, e.color, 8);
          this.enemies.splice(i, 1);
          continue;
        }
      }

      // Despawn if infinitely far away
      if (dist > 1600) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateBoss(dt: number) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;

    // Cinematic Death Logic
    if (b.isDying) {
      b.deathTimer += dt;
      this.timeDilation = 0.3; // Dramatic slow motion
      this.camera.shake = 12;

      // Sequential secondary explosions
      if (Math.random() < 0.4) {
        const randPart = b.parts[Math.floor(Math.random() * b.parts.length)];
        const px = b.x + Math.cos(b.angle) * randPart.relX - Math.sin(b.angle) * randPart.relY;
        const py = b.y + Math.sin(b.angle) * randPart.relX + Math.cos(b.angle) * randPart.relY;
        this.pool.spawnDebrisBurst(px, py, '#f43f5e', 6);
        this.pool.spawnShockwave(px, py, 60, '#f97316', 220);
        audio.playExplosion('MEDIUM');
      }

      if (b.deathTimer >= b.maxDeathTime) {
        // FINAL CORE DETONATION!
        this.timeDilation = 1.0;
        this.pool.spawnShockwave(b.x, b.y, 450, '#f43f5e', 400);
        this.pool.spawnDebrisBurst(b.x, b.y, '#f43f5e', 35);
        audio.playExplosion('BOSS_CORE');
        this.camera.shake = 30;

        // Spawn massive rewards & Portal!
        for (let i = 0; i < 20; i++) {
          this.pool.spawnPickup({ x: b.x, y: b.y, type: 'VOID_CRYSTAL', value: 35 });
        }
        this.pool.spawnPickup({ x: b.x, y: b.y, type: 'NUKE_CORE', value: 1 });

        // Spawn Portal to next sector or boss dimension
        this.portals.push(spawnRandomPortal(b.x, b.y, this.currentSectorId));

        this.bossesKilled++;
        this.callbacks.onAchievementUnlocked('BOSS_HUNTER');
        this.activeBoss = null;
        this.callbacks.onBossStateChange(null);
      }
      return;
    }

    // Boss Movement: Approaches and rotates slowly
    const dx = this.player.x - b.x;
    const dy = this.player.y - b.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // Engines part status affects mobility!
    const enginePart = b.parts.find(p => p.type === 'ENGINE');
    const moveSpeed = enginePart && enginePart.destroyed ? 25 : 65;

    b.vx += (Math.cos(targetAngle) * moveSpeed - b.vx) * 0.05;
    b.vy += (Math.sin(targetAngle) * moveSpeed - b.vy) * 0.05;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Smooth turn towards player
    let angleDiff = targetAngle - b.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    b.angle += angleDiff * 0.03;

    // Check Shield Generator state
    const shieldGen = b.parts.find(p => p.type === 'SHIELD_GEN');
    b.shieldActive = shieldGen ? !shieldGen.destroyed : false;

    // Boss Parts attack routines
    b.parts.forEach(part => {
      if (part.destroyed) return;

      const px = b.x + Math.cos(b.angle) * part.relX - Math.sin(b.angle) * part.relY;
      const py = b.y + Math.sin(b.angle) * part.relX + Math.cos(b.angle) * part.relY;

      if (part.type === 'TURRET') {
        part.cooldownTimer -= dt;
        if (part.cooldownTimer <= 0.6 && part.telegraphTimer <= 0) {
          part.telegraphTimer = 0.6;
          audio.playTelegraphTone(0.6);
        }
        if (part.cooldownTimer <= 0) {
          part.cooldownTimer = part.cooldownMax;
          part.telegraphTimer = 0;
          const shotAngle = b.angle + part.angleOffset;
          this.pool.spawnEnemyBullet({
            x: px,
            y: py,
            vx: Math.cos(shotAngle) * 340,
            vy: Math.sin(shotAngle) * 340,
            damage: 28,
            radius: 7,
            color: '#f43f5e',
          });
        }
      } else if (part.type === 'MISSILE_POD') {
        part.cooldownTimer -= dt;
        if (part.cooldownTimer <= 0) {
          part.cooldownTimer = part.cooldownMax;
          // Fires salvo of 3 homing rockets
          for (let m = -1; m <= 1; m++) {
            const mAngle = b.angle + m * 0.3;
            this.pool.spawnEnemyBullet({
              x: px,
              y: py,
              vx: Math.cos(mAngle) * 220,
              vy: Math.sin(mAngle) * 220,
              damage: 35,
              radius: 6,
              color: '#f97316',
            });
          }
          audio.playLaser('MISSILE');
        }
      }
    });

    this.callbacks.onBossStateChange(b);
  }

  private updateNemesis(dt: number) {
    if (!this.activeNemesis) return;
    const n = this.activeNemesis;

    const dx = this.player.x - n.x;
    const dy = this.player.y - n.y;
    const dist = Math.hypot(dx, dy);

    // AI & Ability Logic
    // 1. Teleport blink behind player
    if (n.abilities.includes('TELEPORT')) {
      n.teleportCooldown -= dt;
      if (n.teleportCooldown <= 0 && dist < 350) {
        n.teleportCooldown = 6.0;
        this.pool.spawnShockwave(n.x, n.y, 40, n.auraColor, 180);
        // Warp behind player
        const behindAngle = this.player.angle + Math.PI;
        n.x = this.player.x + Math.cos(behindAngle) * 220;
        n.y = this.player.y + Math.sin(behindAngle) * 220;
        this.pool.spawnShockwave(n.x, n.y, 50, n.auraColor, 200);
        audio.playPortalEnter();
      }
    }

    // 2. Regeneration
    if (n.abilities.includes('REGENERATION') && n.hp < n.maxHp) {
      n.hp = Math.min(n.maxHp, n.hp + 12 * dt);
    }

    // 3. Movement
    n.angle = Math.atan2(dy, dx);
    n.vx += (Math.cos(n.angle) * n.speed - n.vx) * 0.1;
    n.vy += (Math.sin(n.angle) * n.speed - n.vy) * 0.1;
    n.x += n.vx * dt;
    n.y += n.vy * dt;

    // 4. Attack
    n.attackTimer -= dt;
    if (n.attackTimer <= 0) {
      n.attackTimer = 2.2;
      const count = n.abilities.includes('TRIPLE_PLASMA') ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.22;
        const shotAngle = n.angle + spread;
        this.pool.spawnEnemyBullet({
          x: n.x + Math.cos(shotAngle) * 18,
          y: n.y + Math.sin(shotAngle) * 18,
          vx: Math.cos(shotAngle) * 360,
          vy: Math.sin(shotAngle) * 360,
          damage: 22,
          radius: 5,
          color: n.auraColor,
        });
      }
      audio.playLaser('PLASMA');
    }

    this.callbacks.onNemesisStateChange(n);
  }

  // ===================== OBJECT POOL COLLISION & UPDATE =====================

  private updatePooledObjects(dt: number) {
    // 1. Projectiles vs Enemies / Boss / Nemesis
    this.pool.projectiles.forEach(p => {
      if (!p.active) return;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        return;
      }

      // Homing calculation
      if (p.isHoming) {
        const nearest = this.findNearestEnemy(600);
        if (nearest) {
          const hAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          const curAngle = Math.atan2(p.vy, p.vx);
          let diff = hAngle - curAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const newAngle = curAngle + diff * (p.homingStrength || 4) * dt;
          const spd = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(newAngle) * spd;
          p.vy = Math.sin(newAngle) * spd;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Projectile collision with Boss parts
      if (this.activeBoss && !this.activeBoss.isDying) {
        const b = this.activeBoss;
        for (let i = 0; i < b.parts.length; i++) {
          const part = b.parts[i];
          if (part.destroyed) continue;

          const px = b.x + Math.cos(b.angle) * part.relX - Math.sin(b.angle) * part.relY;
          const py = b.y + Math.sin(b.angle) * part.relX + Math.cos(b.angle) * part.relY;
          const dist = Math.hypot(p.x - px, p.y - py);

          if (dist < p.radius + part.radius) {
            // If core is hit while shield is active, absorb damage
            if (part.type === 'CORE' && b.shieldActive) {
              this.pool.spawnDamageNumber({ x: px, y: py, damage: 0, isShield: true });
              p.active = false;
              return;
            }

            part.hp -= p.damage;
            this.damageDealtTotal += p.damage;
            this.director.recordDamageDealt(p.damage, this.runTime);

            this.pool.spawnDamageNumber({
              x: px,
              y: py,
              damage: p.damage,
              isCrit: p.isCrit,
              isBoss: true,
            });

            audio.playHit('HULL');

            if (part.hp <= 0) {
              part.destroyed = true;
              this.pool.spawnDebrisBurst(px, py, '#f43f5e', 12);
              this.pool.spawnShockwave(px, py, 90, '#f97316', 260);
              audio.playExplosion('LARGE');

              // If core is destroyed, trigger cinematic death!
              if (part.type === 'CORE') {
                b.isDying = true;
                b.deathTimer = 0;
              }
            }

            p.pierce--;
            if (p.pierce <= 0) {
              p.active = false;
              return;
            }
          }
        }
      }

      // Projectile collision with Nemesis
      if (this.activeNemesis) {
        const n = this.activeNemesis;
        const dist = Math.hypot(p.x - n.x, p.y - n.y);
        if (dist < p.radius + n.radius) {
          n.hp -= p.damage;
          this.damageDealtTotal += p.damage;
          this.director.recordDamageDealt(p.damage, this.runTime);

          this.pool.spawnDamageNumber({
            x: n.x,
            y: n.y,
            damage: p.damage,
            isCrit: p.isCrit,
          });

          audio.playHit(p.isCrit ? 'CRIT' : 'HULL');

          if (n.hp <= 0) {
            // Nemesis defeated!
            this.pool.spawnDebrisBurst(n.x, n.y, n.auraColor, 18);
            this.pool.spawnShockwave(n.x, n.y, 120, n.auraColor, 280);
            audio.playExplosion('LARGE');

            // Drop guaranteed rare/epic rewards
            for (let c = 0; c < 8; c++) {
              this.pool.spawnPickup({ x: n.x, y: n.y, type: 'VOID_CRYSTAL', value: 20 });
            }
            this.pool.spawnPickup({ x: n.x, y: n.y, type: 'NANO_REPAIR', value: 1 });

            this.nemesisKilled++;
            this.activeNemesis = null;
            this.callbacks.onNemesisStateChange(null);
          }

          p.pierce--;
          if (p.pierce <= 0) {
            p.active = false;
            return;
          }
        }
      }

      // Projectile collision with regular enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dist = Math.hypot(p.x - e.x, p.y - e.y);

        if (dist < p.radius + e.radius) {
          e.hp -= p.damage;
          this.damageDealtTotal += p.damage;
          if (p.isCrit) this.critsLanded++;
          this.director.recordDamageDealt(p.damage, this.runTime);

          this.pool.spawnDamageNumber({
            x: e.x,
            y: e.y,
            damage: p.damage,
            isCrit: p.isCrit,
          });

          // Tactical Hit Feedback
          this.hitMarkerTimer = 0.12;
          audio.playHitMarker(false);
          this.threeRenderer.triggerExplosionFX(e.x, e.y, 0x38bdf8, 0.4);

          // Secret Synergies impact effects:
          if (this.discoveredSynergies.has('PLASMA_STORM') && (p.weaponType === 'PLASMA' || p.weaponType === 'SUPERNOVA')) {
            // Electric lingering vortex
            this.pool.spawnShockwave(e.x, e.y, 35, '#06b6d4', 160);
          }
          if (this.discoveredSynergies.has('MISSILE_SWARM') && p.weaponType === 'MISSILE') {
            this.pool.spawnDebrisBurst(e.x, e.y, '#f97316', 4);
          }

          audio.playHit(p.isCrit ? 'CRIT' : 'HULL');

          if (e.hp <= 0) {
            this.killEnemy(e, i);
          }

          p.pierce--;
          if (p.pierce <= 0) {
            p.active = false;
            break;
          }
        }
      }
    });

    // 2. Enemy Bullets vs Player
    this.pool.enemyBullets.forEach(b => {
      if (!b.active) return;
      b.life += dt;
      if (b.life >= b.maxLife) {
        b.active = false;
        return;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      if (dist < b.radius + 16 && this.player.invulnerableTimer <= 0) {
        b.active = false;
        this.damagePlayer(b.damage);
      }
    });

    // 3. Particles
    this.pool.particles.forEach(p => {
      if (!p.active) return;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) p.active = false;
    });

    // 4. Damage Numbers
    this.pool.damageNumbers.forEach(d => {
      if (!d.active) return;
      d.y += d.vy * dt;
      d.alpha -= d.decay * dt;
      if (d.alpha <= 0) d.active = false;
    });

    // 5. Debris
    this.pool.debris.forEach(d => {
      if (!d.active) return;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rotation += d.vRot * dt;
      d.alpha -= d.decay * dt;
      if (d.alpha <= 0) d.active = false;
    });

    // 6. Shockwaves
    this.pool.shockwaves.forEach(s => {
      if (!s.active) return;
      s.radius += s.speed * dt;
      s.alpha -= s.decay * dt;
      if (s.radius >= s.maxRadius || s.alpha <= 0) s.active = false;
    });

    // 7. Pickups & Magnetic Attraction
    const magnetRadius = this.player.pickupRadius * (this.isFever ? 1.5 : 1.0);
    this.pool.pickups.forEach(p => {
      if (!p.active) return;
      p.pulseTimer += dt * 4;

      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < magnetRadius || p.magnetized) {
        p.magnetized = true;
        // Smooth curved acceleration toward ship
        const spd = 450 + (magnetRadius - Math.min(dist, magnetRadius)) * 2;
        p.vx += (dx / dist * spd - p.vx) * 0.18;
        p.vy += (dy / dist * spd - p.vy) * 0.18;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      if (dist < 22) {
        // Collect Pickup!
        p.active = false;
        this.collectPickup(p);
      }
    });
  }

  private killEnemy(e: EnemyEntity, index: number) {
    this.enemies.splice(index, 1);
    this.totalKills++;
    this.director.recordKill(this.runTime);

    // Combo progression
    this.combo++;
    this.comboTimer = 3.5;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Score & XP calculation
    const scoreAdd = (e.type === 'CRUISER' ? 120 : e.type === 'INTERCEPTOR' ? 50 : 25) * (this.isFever ? 3 : 1);
    this.score += scoreAdd;

    // Procedural hull debris and energetic sparks
    this.pool.spawnDebrisBurst(e.x, e.y, e.color, e.type === 'CRUISER' ? 14 : 7);
    this.pool.spawnShockwave(e.x, e.y, 45, e.glowColor, 180);
    audio.playExplosion(e.type === 'CRUISER' ? 'MEDIUM' : 'SMALL');

    // Tactical Kill Feedback in 3D
    this.killMarkerTimer = 0.22;
    audio.playHitMarker(true);
    const fxColor = e.type === 'CRUISER' ? 0xf43f5e : 0x38bdf8;
    this.threeRenderer.triggerExplosionFX(e.x, e.y, fxColor, e.type === 'CRUISER' ? 2.4 : 1.2);
    this.camera.shake = Math.min(8.0, this.camera.shake + (e.type === 'CRUISER' ? 5.0 : 1.8));

    // Spawn XP / Pickups
    const xpType = e.type === 'CRUISER' ? 'VOID_CRYSTAL' : 'XP';
    const xpVal = e.type === 'CRUISER' ? 25 : 10;
    this.pool.spawnPickup({ x: e.x, y: e.y, type: xpType, value: xpVal });

    // Mission target check
    if (this.activeMission && this.activeMission.type === 'DESTROY_ENEMIES' && !this.activeMission.completed) {
      this.activeMission.currentCount++;
      if (this.activeMission.currentCount >= this.activeMission.targetCount) {
        this.completeMission();
      }
      this.callbacks.onMissionUpdate(this.activeMission);
    }
  }

  private damagePlayer(amount: number) {
    // Check armor reduction
    const effectiveDamage = Math.max(1, amount - this.player.armor);
    this.damageTakenTotal += effectiveDamage;
    this.director.recordDamageTaken(effectiveDamage, this.runTime);

    // Reset shield delay
    this.player.shieldCooldownTimer = 4.0;
    this.player.invulnerableTimer = 0.25;
    this.camera.shake = 10;

    // Shield absorbs first
    if (this.player.shield > 0) {
      if (this.player.shield >= effectiveDamage) {
        this.player.shield -= effectiveDamage;
        audio.playHit('SHIELD');
      } else {
        const leftover = effectiveDamage - this.player.shield;
        this.player.shield = 0;
        this.player.hp -= leftover;
        audio.playHit('HULL');
      }
    } else {
      this.player.hp -= effectiveDamage;
      audio.playHit('HULL');
    }

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.handleGameOver();
    }
  }

  private collectPickup(p: { type: string; value: number }) {
    audio.playCrystalCollect();

    if (p.type === 'XP' || p.type === 'VOID_CRYSTAL') {
      const xpGain = p.value * (this.isFever ? 1.5 : 1.0);
      this.playerXp += xpGain;
      if (p.type === 'VOID_CRYSTAL') {
        this.voidCredits += Math.round(p.value * 0.8);
      }

      if (this.playerXp >= this.xpToNextLevel) {
        this.playerXp -= this.xpToNextLevel;
        this.playerLevel++;
        this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.35 + 25);
        this.triggerLevelUp();
      }
    } else if (p.type === 'NANO_REPAIR') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.pool.spawnDamageNumber({ x: this.player.x, y: this.player.y, damage: 40, isCrit: true });
    } else if (p.type === 'NUKE_CORE') {
      // Screen wipe bomb
      this.camera.shake = 25;
      this.pool.spawnShockwave(this.player.x, this.player.y, 800, '#ef4444', 600);
      audio.playExplosion('BOSS_CORE');
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.killEnemy(this.enemies[i], i);
      }
    }
  }

  private triggerLevelUp() {
    this.pause();
    // Generate 3 unique upgrade options from catalog
    const choices = this.rollUpgradeChoices();
    this.callbacks.onLevelUp(choices);
  }

  private rollUpgradeChoices(): UpgradeDef[] {
    const available = UPGRADE_CATALOG.filter(u => {
      const current = this.acquiredUpgrades.get(u.id) || 0;
      return current < u.maxLevel;
    });

    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  // ===================== PORTALS & SECTORS =====================

  private updatePortals(dt: number) {
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const p = this.portals[i];
      p.lifeTime -= dt;
      if (p.lifeTime <= 0) {
        this.portals.splice(i, 1);
        continue;
      }

      // Check player entry
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < p.radius + 18) {
        // Teleport to target sector!
        this.warpToSector(p.targetSector, p.type);
        this.portals.splice(i, 1);
        break;
      }
    }
  }

  public warpToSector(nextSectorId: SectorId, portalType?: string) {
    this.currentSectorId = nextSectorId;
    audio.playSectorTransition();
    this.camera.shake = 18;

    // Reset local enemies & spawn dramatic warp particles
    this.enemies = [];
    for (let i = 0; i < 45; i++) {
      const a = (i / 45) * Math.PI * 2;
      const spd = 200 + Math.random() * 300;
      this.pool.spawnParticle({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 4,
        color: '#38bdf8',
        decay: 1.5,
      });
    }

    if (portalType === 'SAFE_SECTOR') {
      this.player.hp = this.player.maxHp;
      this.player.shield = this.player.maxShield;
      this.voidCredits += 350;
    } else if (portalType === 'TREASURE_SECTOR') {
      this.voidCredits += 600;
      for (let i = 0; i < 15; i++) {
        this.pool.spawnPickup({ x: this.player.x, y: this.player.y, type: 'VOID_CRYSTAL', value: 30 });
      }
    }

    this.callbacks.onSectorTransition(this.currentSectorId);
  }

  // ===================== MISSIONS & EVENTS =====================

  private updateMissionsAndEvents(dt: number) {
    if (this.activeMission && !this.activeMission.completed && !this.activeMission.failed) {
      if (this.activeMission.timeLimit > 0) {
        this.activeMission.timeLeft -= dt;
        if (this.activeMission.timeLeft <= 0) {
          if (this.activeMission.type === 'SURVIVE' || this.activeMission.type === 'AVOID_DAMAGE') {
            this.completeMission();
          } else {
            this.activeMission.failed = true;
          }
          this.callbacks.onMissionUpdate(this.activeMission);
        }
      }
    }

    if (this.activeEvent && this.activeEvent.active) {
      this.activeEvent.timeLeft -= dt;
      if (this.activeEvent.timeLeft <= 0) {
        this.activeEvent.active = false;
        this.activeEvent = null;
        this.callbacks.onEventUpdate(null);
      }
    }
  }

  private completeMission() {
    if (!this.activeMission) return;
    this.activeMission.completed = true;
    this.voidCredits += this.activeMission.rewardCredits;
    audio.playLevelUp();
    this.callbacks.onMissionUpdate(this.activeMission);
  }

  private handleGameOver() {
    this.isRunning = false;
    audio.playExplosion('LARGE');

    const stats: RunStatistics = {
      score: this.score,
      kills: this.totalKills,
      bossesKilled: this.bossesKilled,
      nemesisKilled: this.nemesisKilled,
      damageDealt: Math.round(this.damageDealtTotal),
      criticalHits: this.critsLanded,
      damageTaken: Math.round(this.damageTakenTotal),
      favoriteWeapon: this.favoriteWeapon,
      level: this.playerLevel,
      timeSurvived: Math.round(this.runTime),
      maxCombo: this.maxCombo,
      voidCreditsEarned: this.voidCredits + Math.round(this.score * 0.1),
      sectorReached: SECTORS[this.currentSectorId].name,
    };

    this.callbacks.onGameOver(stats);
  }

  // ===================== RENDERING PIPELINE =====================

  private render(dt: number) {
    // 1. Render complete 3D scene via Three.js
    this.threeRenderer.render({
      player: {
        x: this.player.x,
        y: this.player.y,
        vx: this.player.vx,
        vy: this.player.vy,
        angle: this.player.angle,
        isDashing: this.player.isDashing,
        shield: this.player.shield,
        maxShield: this.player.maxShield,
      },
      enemies: this.enemies,
      boss: this.activeBoss,
      nemesis: this.activeNemesis,
      projectiles: this.pool.projectiles,
      enemyBullets: this.pool.enemyBullets,
      particles: this.pool.particles,
      pickups: this.pool.pickups,
      portals: this.portals,
      sectorId: this.currentSectorId,
      isFever: this.isFever,
      cameraShake: this.camera.shake,
      dt,
    });

    // 2. Render 2D Overlays (Projected floating damage numbers & F2 debug HUD)
    if (this.overlayCtx && this.overlayCanvas) {
      const ctx = this.overlayCtx;
      const width = this.overlayCanvas.width;
      const height = this.overlayCanvas.height;
      ctx.clearRect(0, 0, width, height);

      // Project floating damage numbers from 3D world to 2D screen
      const projVec = new THREE.Vector3();
      this.pool.damageNumbers.forEach(d => {
        if (!d.active) return;
        projVec.set(d.x, 8, d.y);
        projVec.project(this.threeRenderer.camera);

        // Convert normalized device coordinates (-1 to 1) to screen pixels
        const sx = (projVec.x * 0.5 + 0.5) * width;
        const sy = (-(projVec.y * 0.5) + 0.5) * height;

        ctx.save();
        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.alpha;
        ctx.font = `${d.isCrit ? 'bold 16px' : '13px'} "JetBrains Mono", monospace`;
        ctx.fillText(d.text, sx, sy);
        ctx.restore();
      });

      // Fever screen edge vignette
      if (this.isFever) {
        this.renderFeverVignette(ctx, width, height);
      }

      // Render Futuristic 3D Aim Reticle & Tactical Hit Markers
      this.renderFuturisticCrosshair(ctx, width, height);

      // Debug HUD (F2)
      if (this.debugMode) {
        this.renderDebugHUD(ctx);
      }
    }
  }

  private renderFuturisticCrosshair(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const mx = this.mousePos.x;
    const my = this.mousePos.y;

    // Do not draw outside screen bounds
    if (mx <= 0 || mx >= w || my <= 0 || my >= h) return;

    ctx.save();

    const isEnemy = this.isAimingAtEnemy;
    const mainColor = isEnemy ? '#f43f5e' : '#38bdf8';
    const glowColor = isEnemy ? 'rgba(244, 63, 94, 0.65)' : 'rgba(56, 189, 248, 0.55)';
    const r = 14 + this.crosshairRecoil;

    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isEnemy ? 12 : 8;

    // 1. Center Pip
    ctx.beginPath();
    ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. 4 Futuristic Sci-Fi Corner Brackets
    const bLen = 6;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(mx - r, my - r + bLen);
    ctx.lineTo(mx - r, my - r);
    ctx.lineTo(mx - r + bLen, my - r);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(mx + r - bLen, my - r);
    ctx.lineTo(mx + r, my - r);
    ctx.lineTo(mx + r, my - r + bLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(mx - r, my + r - bLen);
    ctx.lineTo(mx - r, my + r);
    ctx.lineTo(mx - r + bLen, my + r);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(mx + r - bLen, my + r);
    ctx.lineTo(mx + r, my + r);
    ctx.lineTo(mx + r, my + r - bLen);
    ctx.stroke();

    // 3. Segmented Tactical Arc Ring
    const rot = (this.runTime * 1.5) % (Math.PI * 2);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(mx, my, r + 6, rot, rot + Math.PI * 0.45);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mx, my, r + 6, rot + Math.PI, rot + Math.PI * 1.45);
    ctx.stroke();

    // 4. Subtle Cross Ticks
    const tickDist = r + 10;
    ctx.beginPath();
    ctx.moveTo(mx - tickDist, my);
    ctx.lineTo(mx - tickDist - 5, my);
    ctx.moveTo(mx + tickDist, my);
    ctx.lineTo(mx + tickDist + 5, my);
    ctx.moveTo(mx, my - tickDist);
    ctx.lineTo(mx, my - tickDist - 5);
    ctx.moveTo(mx, my + tickDist);
    ctx.lineTo(mx, my + tickDist + 5);
    ctx.stroke();

    // 5. Hostile Target Lock Bracket & Tag
    if (isEnemy) {
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('[OBJETIVO FIJADO]', mx, my - r - 12);
    }

    // 6. Tactical Hit Marker (Flashing on enemy hit)
    if (this.hitMarkerTimer > 0) {
      const hitAlpha = Math.min(1.0, this.hitMarkerTimer / 0.12);
      ctx.strokeStyle = `rgba(255, 255, 255, ${hitAlpha})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.2;
      const hmSize = 9;
      const hmGap = 5;

      // Diagonal 4-tick X: top-left, top-right, bottom-left, bottom-right
      ctx.beginPath();
      ctx.moveTo(mx - hmGap, my - hmGap);
      ctx.lineTo(mx - hmGap - hmSize, my - hmGap - hmSize);
      ctx.moveTo(mx + hmGap, my - hmGap);
      ctx.lineTo(mx + hmGap + hmSize, my - hmGap - hmSize);
      ctx.moveTo(mx - hmGap, my + hmGap);
      ctx.lineTo(mx - hmGap - hmSize, my + hmGap + hmSize);
      ctx.moveTo(mx + hmGap, my + hmGap);
      ctx.lineTo(mx + hmGap + hmSize, my + hmGap + hmSize);
      ctx.stroke();
    }

    // 7. Special Kill Marker (Flashing on enemy elimination)
    if (this.killMarkerTimer > 0) {
      const killAlpha = Math.min(1.0, this.killMarkerTimer / 0.22);
      ctx.strokeStyle = `rgba(244, 63, 94, ${killAlpha})`;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.95)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.8;
      const kmSize = 14;
      const kmGap = 7;

      ctx.beginPath();
      ctx.moveTo(mx - kmGap, my - kmGap);
      ctx.lineTo(mx - kmGap - kmSize, my - kmGap - kmSize);
      ctx.moveTo(mx + kmGap, my - kmGap);
      ctx.lineTo(mx + kmGap + kmSize, my - kmGap - kmSize);
      ctx.moveTo(mx - kmGap, my + kmGap);
      ctx.lineTo(mx - kmGap - kmSize, my + kmGap + kmSize);
      ctx.moveTo(mx + kmGap, my + kmGap);
      ctx.lineTo(mx + kmGap + kmSize, my + kmGap + kmSize);
      ctx.stroke();

      // Bold Kill feedback tag
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(244, 63, 94, ${killAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText('ELIMINADO', mx, my + r + 20);
    }

    ctx.restore();
  }

  private renderFeverVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const pulse = 0.8 + Math.sin(this.runTime * 12) * 0.2;
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
    vig.addColorStop(0, 'rgba(245, 158, 11, 0)');
    vig.addColorStop(1, `rgba(245, 158, 11, ${0.28 * pulse})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  private renderDebugHUD(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 15, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.fillRect(16, 16, 260, 210);
    ctx.strokeRect(16, 16, 260, 210);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('VOID SURVIVOR // THREE.JS 3D (F2)', 28, 38);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`FPS: ${this.fps} [${this.graphicsQuality}]`, 28, 62);
    ctx.fillText(`Director: ${this.director.state.phase} (Score: ${Math.round(this.director.state.tensionScore)})`, 28, 80);
    ctx.fillText(`DPS: ${Math.round(this.director.state.recentDps)} | KPM: ${this.director.state.killsPerMinute}`, 28, 98);
    ctx.fillText(`Enemies: ${this.enemies.length} | SpawnMult: ${this.director.state.recommendedSpawnRate.toFixed(2)}`, 28, 116);
    ctx.fillText(`Projectiles: ${this.pool.projectiles.filter(p => p.active).length}`, 28, 134);
    ctx.fillText(`Particles: ${this.pool.particles.filter(p => p.active).length}`, 28, 152);
    ctx.fillText(`Sector: ${this.currentSectorId}`, 28, 170);
    ctx.fillText(`Coords: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 28, 188);
    ctx.fillText(`Combo: ${this.combo} (Fever: ${this.isFever})`, 28, 206);

    ctx.restore();
  }

  public resize(width: number, height: number) {
    this.threeRenderer.resize(width, height);
    if (this.overlayCanvas) {
      this.overlayCanvas.width = width;
      this.overlayCanvas.height = height;
    }
  }

  public destroy() {
    this.threeRenderer.destroy();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
