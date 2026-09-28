/**
 * Void Survivor - Sistema de Sectores Procedimentales y Portales
 * 100% en Español
 */

import { SectorDef, SectorId, Portal, PortalType } from './types';

export const SECTORS: Record<SectorId, SectorDef> = {
  NEON_NEBULA: {
    id: 'NEON_NEBULA',
    name: 'Nebulosa de Neón',
    subtitle: 'Perímetro Exterior · Guardería Estelar',
    threatLevel: 'BAJO',
    bgGradient: ['#030712', '#081a36', '#020617'],
    nebulaColor: 'rgba(56, 189, 248, 0.12)',
    starColor: '#7dd3fc',
    ambientLight: 'rgba(56, 189, 248, 0.08)',
    hazards: [],
    enemyMultiplier: 1.0,
    musicTempo: 110,
    description: 'Nubes de gas luminoso ricas en depósitos de iones. Zona ideal de despegue para incursiones profundas.',
  },
  ASTEROID_GRAVEYARD: {
    id: 'ASTEROID_GRAVEYARD',
    name: 'Cementerio de Asteroides',
    subtitle: 'Sector 02 · Cinturón Fragmentado',
    threatLevel: 'MODERADO',
    bgGradient: ['#020617', '#111827', '#030712'],
    nebulaColor: 'rgba(148, 163, 184, 0.14)',
    starColor: '#e2e8f0',
    ambientLight: 'rgba(148, 163, 184, 0.06)',
    hazards: ['ASTEROIDS'],
    enemyMultiplier: 1.25,
    musicTempo: 118,
    description: 'Densos cinturones de asteroides masivos en rotación y restos de cargueros mineros abandonados.',
  },
  CRIMSON_VOID: {
    id: 'CRIMSON_VOID',
    name: 'Vacío Carmesí',
    subtitle: 'Sector 03 · Fulgor Coronal',
    threatLevel: 'ALTO',
    bgGradient: ['#1a050d', '#2d0612', '#070205'],
    nebulaColor: 'rgba(244, 63, 94, 0.15)',
    starColor: '#fda4af',
    ambientLight: 'rgba(244, 63, 94, 0.09)',
    hazards: ['SOLAR_PULSE'],
    enemyMultiplier: 1.5,
    musicTempo: 125,
    description: 'Territorio sin escudos al borde de una supergigante roja moribunda. Enjambres hostiles patrullan aquí.',
  },
  ABANDONED_WARZONE: {
    id: 'ABANDONED_WARZONE',
    name: 'Zona de Guerra Abandonada',
    subtitle: 'Sector 04 · El Cementerio de Hierro',
    threatLevel: 'ALTO',
    bgGradient: ['#080a14', '#151b2e', '#030509'],
    nebulaColor: 'rgba(99, 102, 241, 0.14)',
    starColor: '#a5b4fc',
    ambientLight: 'rgba(99, 102, 241, 0.08)',
    hazards: ['EMP_CLOUDS'],
    enemyMultiplier: 1.75,
    musicTempo: 128,
    description: 'Antiguos campos de batalla de acorazados donde plataformas de asalto autónomas aún ejecutan fuego letal.',
  },
  MACHINE_SECTOR: {
    id: 'MACHINE_SECTOR',
    name: 'Sector Máquina',
    subtitle: 'Sector 05 · Megaestructura Cibernética',
    threatLevel: 'EXTREMO',
    bgGradient: ['#040d12', '#092329', '#020709'],
    nebulaColor: 'rgba(20, 184, 166, 0.16)',
    starColor: '#5eead4',
    ambientLight: 'rgba(20, 184, 166, 0.1)',
    hazards: ['EMP_CLOUDS', 'ASTEROIDS'],
    enemyMultiplier: 2.1,
    musicTempo: 132,
    description: 'Núcleo planetario transformado en astilleros automatizados y fundiciones de naves nodriza.',
  },
  BLACK_HOLE_REGION: {
    id: 'BLACK_HOLE_REGION',
    name: 'Región del Agujero Negro',
    subtitle: 'Sector 06 · Horizonte de Sucesos Alfa',
    threatLevel: 'EXTREMO',
    bgGradient: ['#0d041a', '#1e0836', '#04010a'],
    nebulaColor: 'rgba(168, 85, 247, 0.18)',
    starColor: '#d8b4fe',
    ambientLight: 'rgba(168, 85, 247, 0.12)',
    hazards: ['GRAVITY_WELL'],
    enemyMultiplier: 2.5,
    musicTempo: 136,
    description: 'Curvatura extrema del espacio. Las anomalías gravitatorias atraen toda la materia hacia la singularidad.',
  },
  VOID_STORM: {
    id: 'VOID_STORM',
    name: 'Tormenta del Vacío',
    subtitle: 'Sector 07 · El Ojo Cósmico',
    threatLevel: 'PESADILLA',
    bgGradient: ['#18031e', '#290433', '#08000d'],
    nebulaColor: 'rgba(217, 70, 239, 0.22)',
    starColor: '#f0abfc',
    ambientLight: 'rgba(217, 70, 239, 0.14)',
    hazards: ['VOID_RIFTS', 'SOLAR_PULSE'],
    enemyMultiplier: 3.2,
    musicTempo: 142,
    description: 'Fisura inestable al límite de la realidad. Máxima hostilidad, distorsiones espaciales y entidades del vacío.',
  },
};

export const SECTOR_SEQUENCE: SectorId[] = [
  'NEON_NEBULA',
  'ASTEROID_GRAVEYARD',
  'CRIMSON_VOID',
  'ABANDONED_WARZONE',
  'MACHINE_SECTOR',
  'BLACK_HOLE_REGION',
  'VOID_STORM',
];

export const PORTAL_DEFINITIONS: Record<PortalType, {
  name: string;
  tagline: string;
  riskDescription: string;
  rewardDescription: string;
  color: string;
  glowColor: string;
  bgRiftColor: string;
}> = {
  SAFE_SECTOR: {
    name: 'Fisura de Refugio Seguro',
    tagline: 'Estación de Reabastecimiento y Nanitos',
    riskDescription: 'Sin enemigos · 25s de tregua',
    rewardDescription: '100% Reparación de casco y escudo + Nanocaché',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    bgRiftColor: 'rgba(16, 185, 129, 0.2)',
  },
  ELITE_SECTOR: {
    name: 'Fisura de Incursión Némesis',
    tagline: 'Campo de Batalla de Alta Letalidad',
    riskDescription: '+70% Letalidad hostil y triple Némesis',
    rewardDescription: 'Botín garantizado de mejoras Épicas y Legendarias',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    bgRiftColor: 'rgba(245, 158, 11, 0.2)',
  },
  TREASURE_SECTOR: {
    name: 'Fisura de la Bóveda del Vacío',
    tagline: 'Flotilla de Carga a la Deriva',
    riskDescription: 'Portal temporal (30s de duración)',
    rewardDescription: '+800 Materia del Vacío y alijo de mejoras',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    bgRiftColor: 'rgba(6, 182, 212, 0.2)',
  },
  VOID_SECTOR: {
    name: 'Fisura de Dimensión Cero',
    tagline: 'Brecha Cósmica Corrupta',
    riskDescription: 'Peligro extremo: Drenaje constante de casco',
    rewardDescription: 'Desbloquea evoluciones exclusivas de Rango Vacío',
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.9)',
    bgRiftColor: 'rgba(192, 132, 252, 0.3)',
  },
  BOSS_DIMENSION: {
    name: 'Fisura de Singularidad Alfa',
    tagline: 'Trono del Acorazado Titán',
    riskDescription: 'Acorazado Capital Supremo con flota escolta',
    rewardDescription: 'Plano de nave permanente + Alijo de superarmas',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.95)',
    bgRiftColor: 'rgba(244, 63, 94, 0.3)',
  },
};

export function spawnRandomPortal(x: number, y: number, currentSector: SectorId): Portal {
  const types: PortalType[] = ['SAFE_SECTOR', 'ELITE_SECTOR', 'TREASURE_SECTOR', 'VOID_SECTOR', 'BOSS_DIMENSION'];
  // Weighted selection
  const weights = [0.25, 0.3, 0.25, 0.12, 0.08];
  let r = Math.random();
  let selectedType: PortalType = 'ELITE_SECTOR';
  for (let i = 0; i < types.length; i++) {
    if (r < weights[i]) {
      selectedType = types[i];
      break;
    }
    r -= weights[i];
  }

  // Next sector recommendation
  const currentIdx = SECTOR_SEQUENCE.indexOf(currentSector);
  const nextSector = SECTOR_SEQUENCE[Math.min(SECTOR_SEQUENCE.length - 1, currentIdx + 1)];

  return {
    id: Math.floor(Math.random() * 100000),
    x,
    y,
    type: selectedType,
    radius: 36,
    lifeTime: 40,
    totalTime: 40,
    targetSector: nextSector,
    active: true,
  };
}
