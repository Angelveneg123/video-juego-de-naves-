export type ShipId = 'INTERCEPTOR' | 'DESTROYER' | 'PHANTOM' | 'ENGINEER' | 'VOID_HUNTER';

export interface ShipClassDef {
  id: ShipId;
  name: string;
  tagline: string;
  description: string;
  hullColor: string;
  accentColor: string;
  glowColor: string;
  baseStats: {
    maxHp: number;
    maxShield: number;
    shieldRegen: number;
    speed: number;
    damageMult: number;
    fireRateMult: number;
    critChance: number;
    critMult: number;
    armor: number;
    pickupRadius: number;
  };
  startingWeapon: WeaponId;
  unlockedByDefault: boolean;
  cost: number;
  specialTrait: string;
}

export type SectorId = 
  | 'NEON_NEBULA'
  | 'ASTEROID_GRAVEYARD'
  | 'CRIMSON_VOID'
  | 'ABANDONED_WARZONE'
  | 'MACHINE_SECTOR'
  | 'BLACK_HOLE_REGION'
  | 'VOID_STORM';

export interface SectorDef {
  id: SectorId;
  name: string;
  subtitle: string;
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'NIGHTMARE' | 'BAJO' | 'MODERADO' | 'ALTO' | 'EXTREMO' | 'PESADILLA';
  bgGradient: [string, string, string];
  nebulaColor: string;
  starColor: string;
  ambientLight: string;
  hazards: ('ASTEROIDS' | 'SOLAR_PULSE' | 'VOID_RIFTS' | 'EMP_CLOUDS' | 'GRAVITY_WELL')[];
  enemyMultiplier: number;
  musicTempo: number;
  description: string;
}

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'VOID';

export type WeaponId = 
  | 'PLASMA_BLASTER'
  | 'RAILGUN'
  | 'MISSILE_PODS'
  | 'COMBAT_DRONES'
  | 'SPREAD_SHOT'
  | 'TESLA_COIL';

export type EvolvedWeaponId =
  | 'SUPERNOVA_CANNON'
  | 'VOID_LANCE'
  | 'DOOMSDAY_SALVO'
  | 'OMEGA_SWARM'
  | 'STARFALL_BARRAGE'
  | 'ARCLIGHT_STORM';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  icon: string;
  color: string;
  baseCooldown: number; // in seconds
  baseDamage: number;
  range: number;
  projectileSpeed: number;
  projectileSize: number;
  pierce: number;
  evolutionRequiredUpgrade: string;
  evolutionResult: EvolvedWeaponId;
}

export interface EvolvedWeaponDef {
  id: EvolvedWeaponId;
  name: string;
  baseWeaponId: WeaponId;
  requiredUpgradeId: string;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
  cooldown: number;
  damage: number;
  projectileSpeed: number;
  pierce: number;
  specialEffect: string;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: 'OFFENSIVE' | 'DEFENSIVE' | 'UTILITY' | 'CORE';
  icon: string;
  maxLevel: number;
  statEffects?: Partial<{
    maxHp: number;
    maxShield: number;
    shieldRegen: number;
    speed: number;
    damageMult: number;
    fireRateMult: number;
    critChance: number;
    critMult: number;
    armor: number;
    pickupRadius: number;
    pierce: number;
    extraProjectiles: number;
  }>;
  evolutionFor?: WeaponId;
  behaviorTag?: string;
}

export interface SynergyDef {
  id: string;
  name: string;
  description: string;
  weaponA: WeaponId | EvolvedWeaponId;
  weaponB: WeaponId | EvolvedWeaponId;
  discovered: boolean;
  effect: string;
}

export type PortalType = 'SAFE_SECTOR' | 'ELITE_SECTOR' | 'TREASURE_SECTOR' | 'VOID_SECTOR' | 'BOSS_DIMENSION';

export interface Portal {
  id: number;
  x: number;
  y: number;
  type: PortalType;
  radius: number;
  lifeTime: number; // remaining seconds
  totalTime: number;
  targetSector: SectorId;
  active: boolean;
}

export type BossPartType = 'TURRET' | 'MISSILE_POD' | 'SHIELD_GEN' | 'ENGINE' | 'ARMOR' | 'CORE';

export interface BossPart {
  id: string;
  name: string;
  type: BossPartType;
  relX: number;
  relY: number;
  radius: number;
  maxHp: number;
  hp: number;
  destroyed: boolean;
  cooldownTimer: number;
  cooldownMax: number;
  telegraphTimer: number;
  angleOffset: number;
}

export interface BossEntity {
  id: number;
  name: string;
  title: string;
  isCapitalShip: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  parts: BossPart[];
  phase: number;
  shieldActive: boolean;
  isDying: boolean;
  deathTimer: number;
  maxDeathTime: number;
  color: string;
}

export interface NemesisEntity {
  id: number;
  name: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  abilities: ('TELEPORT' | 'TRIPLE_PLASMA' | 'REGENERATION' | 'PHASE_SHIELD')[];
  auraColor: string;
  attackTimer: number;
  teleportCooldown: number;
  shieldActive: boolean;
}

export interface DynamicMission {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardCredits: number;
  timeLimit: number; // in seconds, or 0 if until next event
  timeLeft: number;
  type: 'SURVIVE' | 'DESTROY_ENEMIES' | 'DESTROY_ELITES' | 'AVOID_DAMAGE' | 'COLLECT_CRYSTALS';
  completed: boolean;
  failed: boolean;
}

export type TensionPhase = 'CALM' | 'GROWTH' | 'TENSION' | 'CHAOS' | 'REWARD';

export interface GameDirectorState {
  phase: TensionPhase;
  phaseTime: number;
  phaseDuration: number;
  tensionScore: number; // 0 to 100
  recentDps: number;
  recentDamageTaken: number;
  timeSinceLastDamage: number;
  killsPerMinute: number;
  recommendedSpawnRate: number;
  eliteChance: number;
  activeEnemyCount: number;
  eventTriggerCooldown: number;
}

export type SpaceEventType = 
  | 'NONE'
  | 'METEOR_SHOWER'
  | 'SOLAR_FLARE'
  | 'VOID_STORM'
  | 'SWARM_INVASION'
  | 'CAPITAL_INCURSION'
  | 'BLACK_HOLE_ANOMALY';

export interface SpaceEventState {
  type: SpaceEventType;
  name: string;
  description: string;
  duration: number;
  timeLeft: number;
  active: boolean;
  intensity: number;
}

export interface PlayerShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  speed: number;
  invulnerableTimer: number;
  dashCooldown: number;
  isDashing: boolean;
  dashTimer: number;
  // Visual upgrades
  engineThrustersLevel: number;
  armorPlatesLevel: number;
  shieldLevel: number;
  visibleWeapons: WeaponId[];
  evolvedWeapons: EvolvedWeaponId[];
}

export interface RunStatistics {
  score: number;
  kills: number;
  bossesKilled: number;
  nemesisKilled: number;
  damageDealt: number;
  criticalHits: number;
  damageTaken: number;
  favoriteWeapon: string;
  level: number;
  timeSurvived: number; // seconds
  maxCombo: number;
  voidCreditsEarned: number;
  sectorReached: string;
}

export interface MetaProgression {
  credits: number;
  highScore: number;
  bestTime: number;
  totalKills: number;
  totalBosses: number;
  unlockedShips: ShipId[];
  selectedShip: ShipId;
  upgrades: {
    hullReinforcement: number; // +Max HP
    shieldMatrix: number;      // +Max Shield & Regen
    plasmaCapacitors: number;  // +Damage Mult
    warpThrusters: number;     // +Move Speed
    naniteSynthesizer: number; // +Regen
    quantumMagnet: number;     // +Pickup Radius
    voidAttunement: number;    // +Luck & Credit multiplier
  };
  discoveredSynergies: string[];
  achievementsUnlocked: string[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCredits: number;
}
