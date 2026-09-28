/**
 * High-performance Object Pools for Zero-Allocation Gameplay Loop
 */

export interface PooledProjectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  color: string;
  glowColor: string;
  trailColor: string;
  life: number;
  maxLife: number;
  isCrit: boolean;
  weaponType: string;
  isHoming: boolean;
  homingTargetId?: number;
  homingStrength?: number;
  explodeRadius?: number;
  bounceCount?: number;
  isEvolved?: boolean;
}

export interface PooledEnemyBullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  glowColor: string;
  life: number;
  maxLife: number;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'CIRCLE' | 'SQUARE' | 'SPARK' | 'RING';
  rotation: number;
  vRot: number;
}

export interface PooledDamageNumber {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  fontSize: number;
  alpha: number;
  decay: number;
  isCrit: boolean;
  scale: number;
}

export interface PooledDebris {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  points: { x: number; y: number }[];
}

export interface PooledShockwave {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface PooledPickup {
  active: boolean;
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'XP' | 'VOID_CRYSTAL' | 'NANO_REPAIR' | 'MAGNET_SURGE' | 'NUKE_CORE';
  value: number;
  radius: number;
  color: string;
  pulseTimer: number;
  magnetized: boolean;
}

export class ObjectPoolSystem {
  // Pre-allocated Pools
  public projectiles: PooledProjectile[] = [];
  public enemyBullets: PooledEnemyBullet[] = [];
  public particles: PooledParticle[] = [];
  public damageNumbers: PooledDamageNumber[] = [];
  public debris: PooledDebris[] = [];
  public shockwaves: PooledShockwave[] = [];
  public pickups: PooledPickup[] = [];

  private maxProjectiles = 600;
  private maxEnemyBullets = 500;
  private maxParticles = 1200;
  private maxDamageNumbers = 150;
  private maxDebris = 200;
  private maxShockwaves = 40;
  private maxPickups = 400;

  constructor() {
    this.allocate();
  }

  private allocate() {
    // Projectiles
    for (let i = 0; i < this.maxProjectiles; i++) {
      this.projectiles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 3,
        damage: 10,
        pierce: 1,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.5)',
        trailColor: 'rgba(56, 189, 248, 0.2)',
        life: 0,
        maxLife: 2,
        isCrit: false,
        weaponType: 'PLASMA',
        isHoming: false,
      });
    }

    // Enemy bullets
    for (let i = 0; i < this.maxEnemyBullets; i++) {
      this.enemyBullets.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 4,
        damage: 15,
        color: '#f43f5e',
        glowColor: 'rgba(244, 63, 94, 0.6)',
        life: 0,
        maxLife: 3,
      });
    }

    // Particles
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        color: '#38bdf8',
        alpha: 1,
        decay: 0.05,
        shape: 'CIRCLE',
        rotation: 0,
        vRot: 0,
      });
    }

    // Damage numbers
    for (let i = 0; i < this.maxDamageNumbers; i++) {
      this.damageNumbers.push({
        active: false,
        x: 0,
        y: 0,
        vy: -40,
        text: '',
        color: '#ffffff',
        fontSize: 14,
        alpha: 1,
        decay: 1.2,
        isCrit: false,
        scale: 1,
      });
    }

    // Debris
    for (let i = 0; i < this.maxDebris; i++) {
      this.debris.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        vRot: 0,
        size: 8,
        color: '#64748b',
        alpha: 1,
        decay: 0.4,
        points: [
          { x: -5, y: -5 },
          { x: 5, y: -2 },
          { x: 3, y: 5 },
          { x: -4, y: 3 },
        ],
      });
    }

    // Shockwaves
    for (let i = 0; i < this.maxShockwaves; i++) {
      this.shockwaves.push({
        active: false,
        x: 0,
        y: 0,
        radius: 5,
        maxRadius: 80,
        speed: 160,
        color: 'rgba(56, 189, 248, 0.8)',
        alpha: 1,
        decay: 1.5,
      });
    }

    // Pickups
    for (let i = 0; i < this.maxPickups; i++) {
      this.pickups.push({
        active: false,
        id: i,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        type: 'XP',
        value: 10,
        radius: 5,
        color: '#06b6d4',
        pulseTimer: 0,
        magnetized: false,
      });
    }
  }

  public resetAll() {
    this.projectiles.forEach(p => (p.active = false));
    this.enemyBullets.forEach(b => (b.active = false));
    this.particles.forEach(p => (p.active = false));
    this.damageNumbers.forEach(d => (d.active = false));
    this.debris.forEach(d => (d.active = false));
    this.shockwaves.forEach(s => (s.active = false));
    this.pickups.forEach(p => (p.active = false));
  }

  // Spawn methods
  public spawnProjectile(config: Partial<PooledProjectile> & { x: number; y: number; vx: number; vy: number; damage: number }): PooledProjectile | null {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.active) {
        p.active = true;
        p.x = config.x;
        p.y = config.y;
        p.vx = config.vx;
        p.vy = config.vy;
        p.radius = config.radius ?? 4;
        p.damage = config.damage;
        p.pierce = config.pierce ?? 1;
        p.color = config.color ?? '#38bdf8';
        p.glowColor = config.glowColor ?? 'rgba(56, 189, 248, 0.6)';
        p.trailColor = config.trailColor ?? 'rgba(56, 189, 248, 0.2)';
        p.life = 0;
        p.maxLife = config.maxLife ?? 2.5;
        p.isCrit = config.isCrit ?? false;
        p.weaponType = config.weaponType ?? 'PLASMA';
        p.isHoming = config.isHoming ?? false;
        p.homingTargetId = config.homingTargetId;
        p.homingStrength = config.homingStrength ?? 4;
        p.explodeRadius = config.explodeRadius ?? 0;
        p.bounceCount = config.bounceCount ?? 0;
        p.isEvolved = config.isEvolved ?? false;
        return p;
      }
    }
    return null;
  }

  public spawnEnemyBullet(config: { x: number; y: number; vx: number; vy: number; damage: number; radius?: number; color?: string; glowColor?: string; maxLife?: number }): PooledEnemyBullet | null {
    for (let i = 0; i < this.enemyBullets.length; i++) {
      const b = this.enemyBullets[i];
      if (!b.active) {
        b.active = true;
        b.x = config.x;
        b.y = config.y;
        b.vx = config.vx;
        b.vy = config.vy;
        b.damage = config.damage;
        b.radius = config.radius ?? 4;
        b.color = config.color ?? '#f43f5e';
        b.glowColor = config.glowColor ?? 'rgba(244, 63, 94, 0.6)';
        b.life = 0;
        b.maxLife = config.maxLife ?? 3;
        return b;
      }
    }
    return null;
  }

  public spawnParticle(config: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    decay?: number;
    shape?: 'CIRCLE' | 'SQUARE' | 'SPARK' | 'RING';
    rotation?: number;
    vRot?: number;
  }): PooledParticle | null {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = config.x;
        p.y = config.y;
        p.vx = config.vx;
        p.vy = config.vy;
        p.radius = config.radius;
        p.color = config.color;
        p.alpha = 1;
        p.decay = config.decay ?? 1.5;
        p.shape = config.shape ?? 'CIRCLE';
        p.rotation = config.rotation ?? Math.random() * Math.PI * 2;
        p.vRot = config.vRot ?? (Math.random() - 0.5) * 8;
        return p;
      }
    }
    return null;
  }

  public spawnDamageNumber(config: {
    x: number;
    y: number;
    damage: number;
    isCrit?: boolean;
    isShield?: boolean;
    isBoss?: boolean;
  }) {
    for (let i = 0; i < this.damageNumbers.length; i++) {
      const d = this.damageNumbers[i];
      if (!d.active) {
        d.active = true;
        d.x = config.x + (Math.random() - 0.5) * 20;
        d.y = config.y - 10 + (Math.random() - 0.5) * 10;
        d.vy = config.isCrit ? -75 : -45;
        d.isCrit = config.isCrit ?? false;
        d.text = config.isCrit ? `CRIT ${Math.round(config.damage)}` : `${Math.round(config.damage)}`;
        d.alpha = 1;
        d.decay = config.isCrit ? 0.9 : 1.4;
        d.scale = config.isCrit ? 1.4 : 1.0;

        if (config.isShield) {
          d.color = '#38bdf8'; // Cyan
        } else if (config.isCrit) {
          d.color = '#fbbf24'; // Golden amber
        } else if (config.isBoss) {
          d.color = '#c084fc'; // Purple
        } else {
          d.color = '#f1f5f9'; // Slate light
        }
        return d;
      }
    }
    return null;
  }

  public spawnDebrisBurst(x: number, y: number, color: string, count: number = 5) {
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < this.debris.length; j++) {
        const d = this.debris[j];
        if (!d.active) {
          d.active = true;
          d.x = x;
          d.y = y;
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 120;
          d.vx = Math.cos(angle) * spd;
          d.vy = Math.sin(angle) * spd;
          d.rotation = Math.random() * Math.PI * 2;
          d.vRot = (Math.random() - 0.5) * 10;
          d.size = 5 + Math.random() * 8;
          d.color = color;
          d.alpha = 1;
          d.decay = 0.35 + Math.random() * 0.4;
          // Generate 3-5 polygon vertices
          const numPts = 3 + Math.floor(Math.random() * 3);
          d.points = [];
          for (let p = 0; p < numPts; p++) {
            const pAngle = (p / numPts) * Math.PI * 2;
            const r = d.size * (0.6 + Math.random() * 0.5);
            d.points.push({ x: Math.cos(pAngle) * r, y: Math.sin(pAngle) * r });
          }
          break;
        }
      }
    }
  }

  public spawnShockwave(x: number, y: number, maxRadius: number, color: string, speed = 250) {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const s = this.shockwaves[i];
      if (!s.active) {
        s.active = true;
        s.x = x;
        s.y = y;
        s.radius = 6;
        s.maxRadius = maxRadius;
        s.speed = speed;
        s.color = color;
        s.alpha = 1;
        s.decay = speed / maxRadius;
        return s;
      }
    }
    return null;
  }

  public spawnPickup(config: { x: number; y: number; type: 'XP' | 'VOID_CRYSTAL' | 'NANO_REPAIR' | 'MAGNET_SURGE' | 'NUKE_CORE'; value: number }) {
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (!p.active) {
        p.active = true;
        p.x = config.x + (Math.random() - 0.5) * 16;
        p.y = config.y + (Math.random() - 0.5) * 16;
        p.vx = (Math.random() - 0.5) * 20;
        p.vy = (Math.random() - 0.5) * 20;
        p.type = config.type;
        p.value = config.value;
        p.pulseTimer = Math.random() * Math.PI;
        p.magnetized = false;

        switch (config.type) {
          case 'XP':
            p.radius = 4;
            p.color = '#38bdf8'; // Blue/Cyan
            break;
          case 'VOID_CRYSTAL':
            p.radius = 5.5;
            p.color = '#c084fc'; // Purple Void
            break;
          case 'NANO_REPAIR':
            p.radius = 6;
            p.color = '#10b981'; // Emerald Green
            break;
          case 'MAGNET_SURGE':
            p.radius = 6;
            p.color = '#f59e0b'; // Amber
            break;
          case 'NUKE_CORE':
            p.radius = 7;
            p.color = '#f43f5e'; // Red
            break;
        }
        return p;
      }
    }
    return null;
  }
}
