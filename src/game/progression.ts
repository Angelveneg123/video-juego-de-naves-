/**
 * Void Survivor - Clases de Nave, Meta-Progresión, Misiones y Logros
 * 100% en Español
 */

import { ShipClassDef, ShipId, MetaProgression, DynamicMission, AchievementDef, SpaceEventType, SpaceEventState } from './types';

export const SHIP_CLASSES: Record<ShipId, ShipClassDef> = {
  INTERCEPTOR: {
    id: 'INTERCEPTOR',
    name: 'VF-01 Interceptor',
    tagline: 'Caza de Reconocimiento Ágil',
    description: 'Fuselaje ligero de titanio equipado con condensadores de plasma sobrecargados y postquemadores gemelos.',
    hullColor: '#38bdf8',
    accentColor: '#0284c7',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    baseStats: {
      maxHp: 80,
      maxShield: 40,
      shieldRegen: 8,
      speed: 260,
      damageMult: 1.0,
      fireRateMult: 1.25,
      critChance: 0.15,
      critMult: 2.2,
      armor: 0,
      pickupRadius: 100,
    },
    startingWeapon: 'PLASMA_BLASTER',
    unlockedByDefault: true,
    cost: 0,
    specialTrait: '+25% de cadencia de fuego base y recarga rápida de impulso.',
  },
  DESTROYER: {
    id: 'DESTROYER',
    name: 'DS-09 Acorazado',
    tagline: 'Plataforma Pesada de Artillería',
    description: 'Casco blindado multicapa armado con aceleradores cinéticos de riel y escudos reactivos reforzados.',
    hullColor: '#f97316',
    accentColor: '#c2410c',
    glowColor: 'rgba(249, 115, 22, 0.8)',
    baseStats: {
      maxHp: 160,
      maxShield: 80,
      shieldRegen: 5,
      speed: 180,
      damageMult: 1.45,
      fireRateMult: 0.85,
      critChance: 0.08,
      critMult: 1.8,
      armor: 3,
      pickupRadius: 90,
    },
    startingWeapon: 'RAILGUN',
    unlockedByDefault: true,
    cost: 0,
    specialTrait: '+45% de daño, +3 de blindaje, pero menor movilidad.',
  },
  PHANTOM: {
    id: 'PHANTOM',
    name: 'PX-Sombra Fantasma',
    tagline: 'Infiltrador Dimensional',
    description: 'Nave experimental con desplazamiento de fase cuántica para atravesar formaciones hostiles.',
    hullColor: '#a855f7',
    accentColor: '#7e22ce',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    baseStats: {
      maxHp: 90,
      maxShield: 60,
      shieldRegen: 7,
      speed: 235,
      damageMult: 1.15,
      fireRateMult: 1.05,
      critChance: 0.25,
      critMult: 2.6,
      armor: 1,
      pickupRadius: 110,
    },
    startingWeapon: 'SPREAD_SHOT',
    unlockedByDefault: false,
    cost: 800,
    specialTrait: 'Mayor invulnerabilidad en impulso y +25% de probabilidad de golpe crítico.',
  },
  ENGINEER: {
    id: 'ENGINEER',
    name: 'CE-Colmena Ingeniero',
    tagline: 'Comandante de Flota Autónoma',
    description: 'Portanaves modular equipado con microfábricas de drones de combate y emisores EMP.',
    hullColor: '#10b981',
    accentColor: '#047857',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    baseStats: {
      maxHp: 110,
      maxShield: 70,
      shieldRegen: 9,
      speed: 210,
      damageMult: 1.0,
      fireRateMult: 1.1,
      critChance: 0.1,
      critMult: 2.0,
      armor: 1,
      pickupRadius: 130,
    },
    startingWeapon: 'COMBAT_DRONES',
    unlockedByDefault: false,
    cost: 1500,
    specialTrait: 'Comienza con drones escolta autónomos y mayor aura de recolección.',
  },
  VOID_HUNTER: {
    id: 'VOID_HUNTER',
    name: 'VH-Cazador del Vacío',
    tagline: 'Tejedor de Singularidades',
    description: 'Infundido con materia pura del Vacío. Convierte naves neutralizadas en ondas gravitatorias.',
    hullColor: '#c084fc',
    accentColor: '#9333ea',
    glowColor: 'rgba(192, 132, 252, 0.9)',
    baseStats: {
      maxHp: 120,
      maxShield: 90,
      shieldRegen: 10,
      speed: 225,
      damageMult: 1.25,
      fireRateMult: 1.15,
      critChance: 0.18,
      critMult: 2.4,
      armor: 2,
      pickupRadius: 125,
    },
    startingWeapon: 'TESLA_COIL',
    unlockedByDefault: false,
    cost: 3000,
    specialTrait: 'Cosecha pasivamente Materia del Vacío y activa ondas de choque al subir de nivel.',
  },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'FIRST_BLOOD',
    title: 'Primera Sangre',
    description: 'Elimina tu primer dron hostil.',
    icon: '🩸',
    rewardCredits: 100,
  },
  {
    id: 'SWARM_CLEANSER',
    title: 'Purificador del Enjambre',
    description: 'Destruye 250 naves hostiles en una sola incursión.',
    icon: '⚔️',
    rewardCredits: 250,
  },
  {
    id: 'BOSS_HUNTER',
    title: 'Cazador de Titanes',
    description: 'Destruye un Acorazado Capital Supremo.',
    icon: '👑',
    rewardCredits: 500,
  },
  {
    id: 'EVOLUTION_MASTER',
    title: 'Evolución Suprema',
    description: 'Evoluciona con éxito cualquier arma a su forma legendaria.',
    icon: '🧬',
    rewardCredits: 400,
  },
  {
    id: 'FEVER_DEMON',
    title: 'Hiperfiebre',
    description: 'Alcanza una racha combo de 50x y desata el Modo Fiebre.',
    icon: '🔥',
    rewardCredits: 350,
  },
  {
    id: 'VOID_WALKER',
    title: 'Caminante del Vacío',
    description: 'Sobrevive más de 5 minutos en una sola incursión.',
    icon: '🌌',
    rewardCredits: 600,
  },
  {
    id: 'UNTOUCHABLE',
    title: 'Piloto Fantasma',
    description: 'Sobrevive 45 segundos sin sufrir daño al casco.',
    icon: '🛡️',
    rewardCredits: 300,
  },
];

const DEFAULT_META: MetaProgression = {
  credits: 250,
  highScore: 0,
  bestTime: 0,
  totalKills: 0,
  totalBosses: 0,
  unlockedShips: ['INTERCEPTOR', 'DESTROYER'],
  selectedShip: 'INTERCEPTOR',
  upgrades: {
    hullReinforcement: 0,
    shieldMatrix: 0,
    plasmaCapacitors: 0,
    warpThrusters: 0,
    naniteSynthesizer: 0,
    quantumMagnet: 0,
    voidAttunement: 0,
  },
  discoveredSynergies: [],
  achievementsUnlocked: [],
};

const STORAGE_KEY = 'void_survivor_meta_save_v1';

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_META, ...parsed, upgrades: { ...DEFAULT_META.upgrades, ...(parsed.upgrades || {}) } };
    }
  } catch (e) {
    console.warn('Fallo al cargar guardado meta, usando valores por defecto', e);
  }
  return { ...DEFAULT_META };
}

export function saveMetaProgression(meta: MetaProgression) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn('Fallo al guardar progreso meta', e);
  }
}

// Generar misiones secundarias dinámicas
export function generateDynamicMission(playerLevel: number): DynamicMission {
  const missionTypes = [
    {
      type: 'DESTROY_ENEMIES' as const,
      title: 'Supresión del Enjambre',
      description: 'Aniquila 30 naves hostiles antes de que expire el tiempo.',
      targetCount: 30,
      timeLimit: 45,
      rewardCredits: 150 + playerLevel * 15,
    },
    {
      type: 'SURVIVE' as const,
      title: 'Maniobras Evasivas',
      description: 'Resiste la ofensiva enemiga durante 40 segundos.',
      targetCount: 40,
      timeLimit: 40,
      rewardCredits: 180 + playerLevel * 15,
    },
    {
      type: 'AVOID_DAMAGE' as const,
      title: 'Protocolo de Integridad de Escudo',
      description: 'Mantén el casco sin daños durante 25 segundos.',
      targetCount: 25,
      timeLimit: 25,
      rewardCredits: 220 + playerLevel * 20,
    },
    {
      type: 'COLLECT_CRYSTALS' as const,
      title: 'Cosecha del Vacío',
      description: 'Recolecta 25 orbes de experiencia o cristales.',
      targetCount: 25,
      timeLimit: 45,
      rewardCredits: 140 + playerLevel * 10,
    },
  ];

  const template = missionTypes[Math.floor(Math.random() * missionTypes.length)];
  return {
    id: `mission_${Date.now()}_${Math.random()}`,
    title: template.title,
    description: template.description,
    targetCount: template.targetCount,
    currentCount: 0,
    rewardCredits: template.rewardCredits,
    timeLimit: template.timeLimit,
    timeLeft: template.timeLimit,
    type: template.type,
    completed: false,
    failed: false,
  };
}

// Generar eventos espaciales
export function generateSpaceEvent(): SpaceEventState {
  const events: { type: SpaceEventType; name: string; description: string; duration: number }[] = [
    {
      type: 'METEOR_SHOWER',
      name: 'Cataclismo de Meteoritos',
      description: '¡Rocas espaciales a hipervelocidad cruzan el sector a gran velocidad!',
      duration: 25,
    },
    {
      type: 'SOLAR_FLARE',
      name: 'Llamarada Coronal Supergigante',
      description: '¡Radiación ionizante barre el campo, potenciando la velocidad y daño energético!',
      duration: 20,
    },
    {
      type: 'VOID_STORM',
      name: 'Brecha Dimensional del Vacío',
      description: '¡Rayos cósmicos caen incesantemente sobre la cuadrícula de batalla!',
      duration: 25,
    },
    {
      type: 'SWARM_INVASION',
      name: 'Asalto de la Vanguardia',
      description: '¡Líneas masivas de interceptores hostiles atacan coordinadamente!',
      duration: 30,
    },
    {
      type: 'CAPITAL_INCURSION',
      name: 'Incursión de Acorazados',
      description: '¡Un Acorazado de Mando hostil ha ingresado al sector activo!',
      duration: 35,
    },
    {
      type: 'BLACK_HOLE_ANOMALY',
      name: 'Singularidad Gravitacional',
      description: '¡Una micro-singularidad absorbe materia hacia su horizonte!',
      duration: 22,
    },
  ];

  const ev = events[Math.floor(Math.random() * events.length)];
  return {
    type: ev.type,
    name: ev.name,
    description: ev.description,
    duration: ev.duration,
    timeLeft: ev.duration,
    active: true,
    intensity: 1.0,
  };
}
