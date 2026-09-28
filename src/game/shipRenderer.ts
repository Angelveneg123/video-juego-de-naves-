/**
 * Void Survivor - Modular Procedural Ship Renderer
 * Dynamically changes the physical appearance of the player ship based on upgrades and hull class.
 */

import { ShipId, WeaponId, EvolvedWeaponId } from './types';
import { SHIP_CLASSES } from './progression';

export function renderPlayerShip(
  ctx: CanvasRenderingContext2D,
  shipClassId: ShipId,
  x: number,
  y: number,
  angle: number,
  shieldRatio: number,
  dashProgress: number, // 0 to 1
  visualUpgrades: {
    thrustersLevel: number;
    armorLevel: number;
    shieldLevel: number;
    weapons: WeaponId[];
    evolvedWeapons: EvolvedWeaponId[];
  },
  gameTimeSec: number
) {
  const shipDef = SHIP_CLASSES[shipClassId] || SHIP_CLASSES.INTERCEPTOR;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Dash ghost / phase effect
  if (dashProgress > 0) {
    ctx.globalAlpha = 0.65;
  }

  // 1. ENGINE THRUST FLAMES (Base + Aux Thrusters)
  const flamePulse = 0.85 + Math.sin(gameTimeSec * 35) * 0.15;
  const flameLen = 16 * flamePulse;

  // Main center exhaust
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = shipDef.glowColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-10 - flameLen, 0);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fill();

  // Core inner hot flame
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-10, -2.5);
  ctx.lineTo(-10 - flameLen * 0.65, 0);
  ctx.lineTo(-10, 2.5);
  ctx.closePath();
  ctx.fill();

  // Auxiliary Thrusters (If Thrusters Level >= 2)
  if (visualUpgrades.thrustersLevel >= 2) {
    const auxLen = flameLen * 0.75;
    [-11, 11].forEach(offsetY => {
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(-6, offsetY - 2);
      ctx.lineTo(-6 - auxLen, offsetY);
      ctx.lineTo(-6, offsetY + 2);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();

  // 2. BASE SHIP HULL (Geometric futuristic fighter)
  ctx.save();
  ctx.fillStyle = '#0f172a'; // Dark metallic base
  ctx.strokeStyle = shipDef.hullColor;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = shipDef.glowColor;
  ctx.shadowBlur = 8;

  // Distinct silhouette per ship class
  ctx.beginPath();
  if (shipClassId === 'DESTROYER') {
    // Heavy broad wedge
    ctx.moveTo(18, 0);
    ctx.lineTo(8, -14);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-8, 18);
    ctx.lineTo(8, 14);
  } else if (shipClassId === 'PHANTOM') {
    // Sleek needle forward swept
    ctx.moveTo(22, 0);
    ctx.lineTo(4, -8);
    ctx.lineTo(-4, -18);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-4, 18);
    ctx.lineTo(4, 8);
  } else if (shipClassId === 'ENGINEER') {
    // Hexagonal modular drone bay hull
    ctx.moveTo(16, 0);
    ctx.lineTo(6, -15);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-10, 14);
    ctx.lineTo(6, 15);
  } else if (shipClassId === 'VOID_HUNTER') {
    // Aggressive crescent wings
    ctx.moveTo(20, 0);
    ctx.lineTo(6, -10);
    ctx.lineTo(-2, -20);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-2, 20);
    ctx.lineTo(6, 10);
  } else {
    // INTERCEPTOR (Classic diamond strike craft)
    ctx.moveTo(20, 0);
    ctx.lineTo(2, -12);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-10, 14);
    ctx.lineTo(2, 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit canopy glow
  ctx.fillStyle = shipDef.accentColor;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-1, -3);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-1, 3);
  ctx.closePath();
  ctx.fill();

  // 3. MODULAR UPGRADE ATTACHMENTS

  // A. REINFORCED ARMOR PLATES
  if (visualUpgrades.armorLevel >= 1) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.fillStyle = '#1e293b';

    // Port armor plate
    ctx.beginPath();
    ctx.moveTo(-3, -11);
    ctx.lineTo(5, -9);
    ctx.lineTo(2, -5);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Starboard armor plate
    ctx.beginPath();
    ctx.moveTo(-3, 11);
    ctx.lineTo(5, 9);
    ctx.lineTo(2, 5);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // B. VISIBLE RAILGUN BARRELS
  if (visualUpgrades.weapons.includes('RAILGUN') || visualUpgrades.evolvedWeapons.includes('VOID_LANCE')) {
    const isEvolved = visualUpgrades.evolvedWeapons.includes('VOID_LANCE');
    ctx.fillStyle = isEvolved ? '#c084fc' : '#a855f7';
    ctx.strokeStyle = isEvolved ? '#e879f9' : '#d8b4fe';
    ctx.lineWidth = 1.5;

    // Twin elongated magnetic rails
    ctx.fillRect(10, -5, 14, 2);
    ctx.strokeRect(10, -5, 14, 2);
    ctx.fillRect(10, 3, 14, 2);
    ctx.strokeRect(10, 3, 14, 2);
  }

  // C. VISIBLE MISSILE PODS
  if (visualUpgrades.weapons.includes('MISSILE_PODS') || visualUpgrades.evolvedWeapons.includes('DOOMSDAY_SALVO')) {
    const isEvolved = visualUpgrades.evolvedWeapons.includes('DOOMSDAY_SALVO');
    ctx.fillStyle = isEvolved ? '#ef4444' : '#f97316';
    // Wingtip launch pods
    [-13, 13].forEach(offsetY => {
      ctx.beginPath();
      ctx.arc(-2, offsetY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Micro missile heads
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, offsetY - 1, 3, 2);
    });
  }

  // D. CENTRAL VOID CORE (If evolved weapon present)
  if (visualUpgrades.evolvedWeapons.length > 0) {
    const corePulse = 0.8 + Math.sin(gameTimeSec * 8) * 0.2;
    ctx.save();
    ctx.fillStyle = '#0a0a0f';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 10 * corePulse;
    ctx.beginPath();
    ctx.arc(0, 0, 5 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // Restore ship rotation/translation

  // 4. ACTIVE COMBAT DRONES (Orbiting the ship in world coordinates)
  if (visualUpgrades.weapons.includes('COMBAT_DRONES') || visualUpgrades.evolvedWeapons.includes('OMEGA_SWARM')) {
    const isEvolved = visualUpgrades.evolvedWeapons.includes('OMEGA_SWARM');
    const droneCount = isEvolved ? 4 : 2;
    const orbitRadius = 40;
    const droneColor = isEvolved ? '#34d399' : '#10b981';

    for (let d = 0; d < droneCount; d++) {
      const droneAngle = gameTimeSec * 2.5 + (d * (Math.PI * 2 / droneCount));
      const dx = x + Math.cos(droneAngle) * orbitRadius;
      const dy = y + Math.sin(droneAngle) * orbitRadius;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(droneAngle + Math.PI / 2);

      // Drone hull
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = droneColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = droneColor;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Drone laser lens
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 5. HOLOGRAPHIC HEXAGONAL SHIELD DOME
  if (shieldRatio > 0.05) {
    ctx.save();
    ctx.translate(x, y);
    const shieldPulse = 0.95 + Math.sin(gameTimeSec * 4) * 0.05;
    const shieldR = (28 + visualUpgrades.shieldLevel * 3) * shieldPulse;
    const shieldAlpha = Math.min(0.65, shieldRatio * 0.7);

    ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
    ctx.fillStyle = `rgba(56, 189, 248, ${shieldAlpha * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    // Draw pulsating hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const hexAngle = (i / 6) * Math.PI * 2 + gameTimeSec * 0.5;
      const hx = Math.cos(hexAngle) * shieldR;
      const hy = Math.sin(hexAngle) * shieldR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
