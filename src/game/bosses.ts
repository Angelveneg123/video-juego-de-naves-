/**
 * Void Survivor - Multi-Stage Bosses, Capital Ships & Nemesis System
 */

import { BossEntity, BossPart, NemesisEntity } from './types';

// Capital Ship Boss templates
export function createCapitalShipBoss(id: number, x: number, y: number, sectorDifficulty: number): BossEntity {
  const hpScale = 1 + sectorDifficulty * 0.45;

  const parts: BossPart[] = [
    // 1. Shield Generator
    {
      id: 'shield_gen',
      name: 'Generador de Escudos del Vacío',
      type: 'SHIELD_GEN',
      relX: 0,
      relY: -20,
      radius: 24,
      maxHp: 450 * hpScale,
      hp: 450 * hpScale,
      destroyed: false,
      cooldownTimer: 0,
      cooldownMax: 10,
      telegraphTimer: 0,
      angleOffset: 0,
    },
    // 2. Left Heavy Turret
    {
      id: 'left_turret',
      name: 'Batería de Plasma de Babor',
      type: 'TURRET',
      relX: -70,
      relY: 10,
      radius: 20,
      maxHp: 380 * hpScale,
      hp: 380 * hpScale,
      destroyed: false,
      cooldownTimer: 2.2,
      cooldownMax: 2.6,
      telegraphTimer: 0,
      angleOffset: -0.4,
    },
    // 3. Right Heavy Turret
    {
      id: 'right_turret',
      name: 'Batería de Plasma de Estribor',
      type: 'TURRET',
      relX: 70,
      relY: 10,
      radius: 20,
      maxHp: 380 * hpScale,
      hp: 380 * hpScale,
      destroyed: false,
      cooldownTimer: 2.5,
      cooldownMax: 2.6,
      telegraphTimer: 0,
      angleOffset: 0.4,
    },
    // 4. Missile Pod Array
    {
      id: 'missile_pod',
      name: 'Matriz de Misiles VLS',
      type: 'MISSILE_POD',
      relX: 0,
      relY: -65,
      radius: 22,
      maxHp: 340 * hpScale,
      hp: 340 * hpScale,
      destroyed: false,
      cooldownTimer: 4.5,
      cooldownMax: 5.5,
      telegraphTimer: 0,
      angleOffset: 0,
    },
    // 5. Heavy Engines
    {
      id: 'main_engines',
      name: 'Propulsores Sub-Lumínicos',
      type: 'ENGINE',
      relX: 0,
      relY: 85,
      radius: 28,
      maxHp: 500 * hpScale,
      hp: 500 * hpScale,
      destroyed: false,
      cooldownTimer: 0,
      cooldownMax: 0,
      telegraphTimer: 0,
      angleOffset: Math.PI,
    },
    // 6. Central Singularity Core (Final Target)
    {
      id: 'main_core',
      name: 'Núcleo de Singularidad Sobrecargado',
      type: 'CORE',
      relX: 0,
      relY: 20,
      radius: 34,
      maxHp: 1800 * hpScale,
      hp: 1800 * hpScale,
      destroyed: false,
      cooldownTimer: 1.8,
      cooldownMax: 2.0,
      telegraphTimer: 0,
      angleOffset: 0,
    },
  ];

  return {
    id,
    name: 'ACORAZADO GOLIATH',
    title: 'Nave Insignia de la Legión de Hierro',
    isCapitalShip: true,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    radius: 95, // Huge capital ship radius
    parts,
    phase: 1,
    shieldActive: true,
    isDying: false,
    deathTimer: 0,
    maxDeathTime: 3.2,
    color: '#f43f5e',
  };
}

// Procedural Nemesis generator
const NEMESIS_NAMES = ['VARKON', 'XALAR', 'KRAVEN', 'THRAX', 'ZERIK', 'VOLTIS', 'MALOK', 'NYXIS'];
const NEMESIS_TITLES = [
  'EL CAZADOR DEL VACÍO',
  'AZOTE DE NAVES',
  'COSECHADOR ESTELAR',
  'EJECUTOR DE LAS SOMBRAS',
  'ASESINO TEMPORAL',
  'JINETE DEL ECLIPSE',
];
const NEMESIS_AURAS = ['#f43f5e', '#a855f7', '#06b6d4', '#eab308', '#ec4899'];

export function createProceduralNemesis(id: number, x: number, y: number, sectorDifficulty: number): NemesisEntity {
  const name = NEMESIS_NAMES[Math.floor(Math.random() * NEMESIS_NAMES.length)];
  const title = NEMESIS_TITLES[Math.floor(Math.random() * NEMESIS_TITLES.length)];
  const aura = NEMESIS_AURAS[Math.floor(Math.random() * NEMESIS_AURAS.length)];

  const possibleAbilities: ('TELEPORT' | 'TRIPLE_PLASMA' | 'REGENERATION' | 'PHASE_SHIELD')[] = [
    'TELEPORT',
    'TRIPLE_PLASMA',
    'REGENERATION',
    'PHASE_SHIELD',
  ];

  // Pick 2-3 distinct abilities
  const shuffled = [...possibleAbilities].sort(() => 0.5 - Math.random());
  const count = 2 + (Math.random() > 0.4 ? 1 : 0);
  const abilities = shuffled.slice(0, count);

  const hpScale = 1 + sectorDifficulty * 0.4;
  const baseHp = 420 * hpScale;

  return {
    id,
    name,
    title,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 24,
    hp: baseHp,
    maxHp: baseHp,
    speed: 135,
    abilities,
    auraColor: aura,
    attackTimer: 1.2,
    teleportCooldown: 6.0,
    shieldActive: abilities.includes('PHASE_SHIELD'),
  };
}
