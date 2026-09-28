/**
 * Void Survivor - Three.js 3D Visual Engine
 * Stage 1.1 Complete Cinematic 3D Overhaul:
 * - True cinematic third-person chase camera (behind & slightly above the ship)
 * - Player ship prominently framed in the lower third (70-76% screen height, 50% horizontal)
 * - Detailed multi-primitive ship models with physical wings, nacelles, cockpit canopy, and thrusters
 * - ZERO permanent wireframe sphere! (Subtle, responsive energy ripple ONLY on shield hit)
 * - Dynamic 3D banking roll, pitch, inertia and camera spring damping
 * - Multi-layer deep space: Near streaming dust, Mid dynamic asteroid field, Colossal gas giant & procedural Neon Nebula
 * - Vibrant procedural Neon Nebula clouds (no pitch black void!)
 * - Substantial 3D enemy combat vessels (Swarm raiders, Interceptors, Heavy Cruisers, Kamikaze drones)
 * - Multi-stage capital ship boss & shadow nemesis
 * - Continuous forward motion perception via space dust streaming and warp streaks
 * - 0 console errors
 */

import * as THREE from 'three';
import { ShipId, SectorId, BossEntity, NemesisEntity, Portal, WeaponId, EvolvedWeaponId } from './types';
import { SECTORS } from './sectors';
import { SHIP_CLASSES } from './progression';

export class ThreeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private sunDirectionalLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private cameraChaseLight: THREE.DirectionalLight; // Dedicated rear/overhead key light for player ship
  private shipLateralLightLeft: THREE.PointLight;
  private shipLateralLightRight: THREE.PointLight;
  private sectorFillLight: THREE.PointLight;
  private playerEngineLight: THREE.PointLight;
  private shieldHitLight: THREE.PointLight;
  private muzzleFlashLight: THREE.PointLight;
  private muzzleFlashTimer = 0;

  // Environment Meshes
  private farStars!: THREE.Points;
  private midStars!: THREE.Points;
  private nearDustParticles!: THREE.Points;
  private nearDustPositions!: Float32Array;
  private speedStreaks!: THREE.LineSegments;
  private speedStreakPositions!: Float32Array;

  // Colossal Planet & Atmosphere
  private planetGroup!: THREE.Group;
  private planetMesh!: THREE.Mesh;
  private planetAtmosphereMesh!: THREE.Mesh;
  private planetRingsMesh!: THREE.Mesh;

  // Procedural Volumetric Neon Nebula Clouds
  private nebulaGroup!: THREE.Group;
  private nebulaPlanes: { mesh: THREE.Mesh; rotSpeed: number; baseColor: THREE.Color }[] = [];

  // Asteroid Field
  private asteroidField: {
    mesh: THREE.Mesh;
    rotSpeed: THREE.Vector3;
    relX: number;
    relY: number;
    relZ: number;
  }[] = [];

  // Distant Background Fleet Skirmishes
  private distantCruisers: { mesh: THREE.Group; speed: number; direction: number }[] = [];

  // Player 3D Group & Sub-parts
  public playerGroup: THREE.Group;
  public playerVisualShip: THREE.Group; // Inner group for banking roll, pitch and recoil
  private playerHullMesh!: THREE.Group;
  private thrusterPlumes: THREE.Mesh[] = [];
  private auxThrusterPlumes: THREE.Mesh[] = [];
  private armorPlateMeshes: THREE.Mesh[] = [];
  private railgunBarrelMeshes: THREE.Mesh[] = [];
  private missilePodMeshes: THREE.Mesh[] = [];
  private shieldImpactMesh: THREE.Mesh; // Only visible briefly on hit!
  private shieldHitTimer = 0;
  private voidCoreMesh: THREE.Group;
  private droneMeshes: THREE.Group[] = [];

  // Hardpoint Cannons & Muzzle Locators
  public leftCannonGroup: THREE.Group | null = null;
  public rightCannonGroup: THREE.Group | null = null;
  public leftMuzzleLocator = new THREE.Object3D();
  public rightMuzzleLocator = new THREE.Object3D();
  public leftMuzzleFlash: THREE.Mesh | null = null;
  public rightMuzzleFlash: THREE.Mesh | null = null;
  public leftBarrelRecoil = 0;
  public rightBarrelRecoil = 0;
  public shipRecoilZ = 0;
  public lastFiredBarrel: 'LEFT' | 'RIGHT' = 'RIGHT';

  // Expanding Explosive Shockwaves
  private shockwaves: { mesh: THREE.Mesh; life: number; maxLife: number; maxRadius: number }[] = [];

  // Smooth Chase Camera State
  private camFollowPos = new THREE.Vector3(0, 36, 92);
  private camCurrentPos = new THREE.Vector3(0, 36, 92);
  private camTargetLook = new THREE.Vector3(0, 8, -200);
  private camCurrentLook = new THREE.Vector3(0, 8, -200);
  private currentRoll = 0;
  private currentPitch = 0;

  // Entity Meshes Cache
  private enemyMeshPool: Map<number, THREE.Group> = new Map();
  private bossGroup: THREE.Group | null = null;
  private bossPartMeshes: Map<string, THREE.Group> = new Map();
  private nemesisGroup: THREE.Group | null = null;
  private portalMeshes: Map<number, THREE.Group> = new Map();

  // Projectiles & FX in 3D: Dual-Layer Energy Pulses (Cyan Glow Shroud + Bright White Core)
  private projectileMeshPool: THREE.InstancedMesh;
  private projectileCoreMeshPool: THREE.InstancedMesh;
  private maxInstancedProjectiles = 600;
  private enemyBulletMeshPool: THREE.InstancedMesh;
  private maxInstancedEnemyBullets = 500;
  private pickupMeshes: Map<number, THREE.Group> = new Map();

  // Particle Point Cloud in 3D (Smooth luminous circular sparks)
  private particleGeo: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private particlePoints: THREE.Points;
  private maxParticles = 1200;

  // Reusable Math objects
  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();

  constructor(canvas: HTMLCanvasElement) {
    // 1. Scene & Deep Space Fog (Tinted towards deep indigo cosmic mist)
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0c1a, 0.00032);

    // 2. Camera Setup: True Third-Person Chase Camera Behind the Ship
    const aspect = canvas.width / canvas.height || window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 10000);
    this.camera.position.set(0, 36, 92);
    this.camera.lookAt(0, 8, -200);

    // 3. WebGL Renderer Setup with ACES ToneMapping
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    // 4. Lighting System: Cinematic Space Contrast & Brilliant Ship Illumination
    this.ambientLight = new THREE.AmbientLight(0x253055, 2.4);
    this.scene.add(this.ambientLight);

    // Primary Celestial Key Light
    this.sunDirectionalLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    this.sunDirectionalLight.position.set(350, 500, -250);
    this.scene.add(this.sunDirectionalLight);

    // Camera Chase Key Light: shines from behind and above ship to guarantee crystal-clear hull visibility
    this.cameraChaseLight = new THREE.DirectionalLight(0xe0f2fe, 3.4);
    this.cameraChaseLight.position.set(0, 80, 140);
    this.scene.add(this.cameraChaseLight);

    // Vibrant Cyan / Blue Rim Light for silhouette edge illumination
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    this.rimLight.position.set(-450, 40, 150);
    this.scene.add(this.rimLight);

    // Lateral ship rim lights to clearly distinguish wings, engines and hardpoints
    this.shipLateralLightLeft = new THREE.PointLight(0x38bdf8, 3.2, 190);
    this.scene.add(this.shipLateralLightLeft);

    this.shipLateralLightRight = new THREE.PointLight(0x818cf8, 2.8, 190);
    this.scene.add(this.shipLateralLightRight);

    // Muzzle Flash PointLight (mounted dynamically at firing barrel)
    this.muzzleFlashLight = new THREE.PointLight(0x38bdf8, 0, 190);
    this.scene.add(this.muzzleFlashLight);

    // Sector Ambient Fill Light
    this.sectorFillLight = new THREE.PointLight(0x818cf8, 2.4, 3500);
    this.sectorFillLight.position.set(0, 300, -350);
    this.scene.add(this.sectorFillLight);

    // Local Ship Engine Glow Light (mounted right behind thrusters)
    this.playerEngineLight = new THREE.PointLight(0x38bdf8, 5.0, 130);
    this.scene.add(this.playerEngineLight);

    // Reactive Shield Hit Point Light
    this.shieldHitLight = new THREE.PointLight(0x38bdf8, 0, 140);
    this.scene.add(this.shieldHitLight);

    // 5. Build Environment (Nebula, Planet, Starfield, Asteroid Belt, Fleet Skirmishes)
    this.initMultiLayerStarfield();
    this.initColossalPlanet();
    this.initVolumetricNeonNebula();
    this.initRichAsteroidField();
    this.initDistant3DBattles();

    // 6. Build Player Modular Ship (Detailed multi-primitive model, prominent lower-third composition)
    this.playerGroup = new THREE.Group();
    this.playerVisualShip = new THREE.Group();
    this.playerGroup.add(this.playerVisualShip);

    this.playerHullMesh = this.buildPlayerShipMesh('INTERCEPTOR');
    this.playerVisualShip.add(this.playerHullMesh);

    // Shield Impact Mesh: INVISIBLE by default, only flashes briefly during damage impact!
    const shieldImpactGeo = new THREE.SphereGeometry(24, 24, 24);
    const shieldImpactMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.shieldImpactMesh = new THREE.Mesh(shieldImpactGeo, shieldImpactMat);
    this.shieldImpactMesh.visible = false;
    this.playerVisualShip.add(this.shieldImpactMesh);

    // Central Void Core (unlocked with evolved weapons)
    this.voidCoreMesh = this.buildVoidCoreMesh();
    this.voidCoreMesh.visible = false;
    this.playerVisualShip.add(this.voidCoreMesh);

    this.scene.add(this.playerGroup);

    // 7. Instanced Meshes for Projectiles (Dual-Layer: Outer Cyan Energy Shroud + Inner White Core)
    const projOuterGeo = new THREE.CylinderGeometry(2.6, 2.6, 26, 8);
    projOuterGeo.rotateX(Math.PI / 2);
    const projOuterMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.projectileMeshPool = new THREE.InstancedMesh(projOuterGeo, projOuterMat, this.maxInstancedProjectiles);
    this.projectileMeshPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.projectileMeshPool);

    const projInnerGeo = new THREE.CylinderGeometry(1.2, 1.2, 22, 6);
    projInnerGeo.rotateX(Math.PI / 2);
    const projInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });
    this.projectileCoreMeshPool = new THREE.InstancedMesh(projInnerGeo, projInnerMat, this.maxInstancedProjectiles);
    this.projectileCoreMeshPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.projectileCoreMeshPool);

    const enemyProjGeo = new THREE.SphereGeometry(3.6, 8, 8);
    const enemyProjMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    this.enemyBulletMeshPool = new THREE.InstancedMesh(enemyProjGeo, enemyProjMat, this.maxInstancedEnemyBullets);
    this.enemyBulletMeshPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.enemyBulletMeshPool);

    // 8. 3D Particle Point Cloud with Soft Circular Glow Texture (Zero square blocks!)
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);
    this.particleSizes = new Float32Array(this.maxParticles);
    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    const sparkTex = this.createSparkTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 4.8,
      map: sparkTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particlePoints = new THREE.Points(this.particleGeo, particleMat);
    this.scene.add(this.particlePoints);
  }

  private createSparkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  // ===================== MULTI-LAYER STARFIELD & FORWARD SPEED STREAKS =====================

  private initMultiLayerStarfield() {
    // 1. Far Stars (Thousands of distant celestial pinpricks of varying spectral types)
    const farCount = 4500;
    const farGeo = new THREE.BufferGeometry();
    const farPos = new Float32Array(farCount * 3);
    const farCol = new Float32Array(farCount * 3);

    for (let i = 0; i < farCount; i++) {
      const idx = i * 3;
      farPos[idx] = (Math.random() - 0.5) * 8500;
      farPos[idx + 1] = (Math.random() - 0.5) * 5000;
      farPos[idx + 2] = -1200 - Math.random() * 5000;

      const c = Math.random();
      if (c > 0.65) {
        farCol[idx] = 0.45; farCol[idx + 1] = 0.82; farCol[idx + 2] = 1.0; // Cyan-blue
      } else if (c > 0.35) {
        farCol[idx] = 0.88; farCol[idx + 1] = 0.55; farCol[idx + 2] = 1.0; // Magenta-violet
      } else if (c > 0.15) {
        farCol[idx] = 1.0; farCol[idx + 1] = 0.85; farCol[idx + 2] = 0.55; // Warm gold
      } else {
        farCol[idx] = 1.0; farCol[idx + 1] = 1.0; farCol[idx + 2] = 1.0; // White
      }
    }
    farGeo.setAttribute('position', new THREE.BufferAttribute(farPos, 3));
    farGeo.setAttribute('color', new THREE.BufferAttribute(farCol, 3));
    this.farStars = new THREE.Points(farGeo, new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 0.9 }));
    this.scene.add(this.farStars);

    // 2. Mid Stars
    const midCount = 1800;
    const midGeo = new THREE.BufferGeometry();
    const midPos = new Float32Array(midCount * 3);
    const midCol = new Float32Array(midCount * 3);

    for (let i = 0; i < midCount; i++) {
      const idx = i * 3;
      midPos[idx] = (Math.random() - 0.5) * 4500;
      midPos[idx + 1] = (Math.random() - 0.5) * 2500;
      midPos[idx + 2] = -300 - Math.random() * 2500;

      midCol[idx] = 0.7 + Math.random() * 0.3;
      midCol[idx + 1] = 0.85 + Math.random() * 0.15;
      midCol[idx + 2] = 1.0;
    }
    midGeo.setAttribute('position', new THREE.BufferAttribute(midPos, 3));
    midGeo.setAttribute('color', new THREE.BufferAttribute(midCol, 3));
    this.midStars = new THREE.Points(midGeo, new THREE.PointsMaterial({ size: 4.2, vertexColors: true, transparent: true, opacity: 0.92 }));
    this.scene.add(this.midStars);

    // 3. Near Streaming Dust Particles (Drifting past camera constantly for forward speed feel!)
    const dustCount = 600;
    this.nearDustPositions = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      const idx = i * 3;
      this.nearDustPositions[idx] = (Math.random() - 0.5) * 600;
      this.nearDustPositions[idx + 1] = -40 + Math.random() * 180;
      this.nearDustPositions[idx + 2] = -400 + Math.random() * 600;

      dustCol[idx] = 0.45;
      dustCol[idx + 1] = 0.85;
      dustCol[idx + 2] = 1.0;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.nearDustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    this.nearDustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 4.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this.nearDustParticles);

    // 4. Speed Streaks (Activated during Dash / Fever)
    const streakCount = 140;
    this.speedStreakPositions = new Float32Array(streakCount * 6);
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(this.speedStreakPositions, 3));

    const streakMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.speedStreaks = new THREE.LineSegments(streakGeo, streakMat);
    this.scene.add(this.speedStreaks);
  }

  // ===================== COLOSSAL PLANET & ATMOSPHERE =====================

  private initColossalPlanet() {
    this.planetGroup = new THREE.Group();
    // Positioned in upper right background to anchor cosmic scale (25-30% screen size)
    this.planetGroup.position.set(820, 460, -2400);

    const planetRadius = 450;
    const planetGeo = new THREE.SphereGeometry(planetRadius, 48, 48);

    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.72,
      metalness: 0.28,
      emissive: 0x111827,
      emissiveIntensity: 0.25,
    });
    this.planetMesh = new THREE.Mesh(planetGeo, planetMat);
    this.planetGroup.add(this.planetMesh);

    // Atmospheric Glow Halo
    const atmoGeo = new THREE.SphereGeometry(planetRadius * 1.05, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    this.planetAtmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.planetGroup.add(this.planetAtmosphereMesh);

    // Majestic Planetary Dust Rings
    const ringGeo = new THREE.RingGeometry(planetRadius * 1.38, planetRadius * 2.2, 64);
    ringGeo.rotateX(Math.PI * 0.42);
    ringGeo.rotateZ(Math.PI * 0.16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.planetRingsMesh = new THREE.Mesh(ringGeo, ringMat);
    this.planetGroup.add(this.planetRingsMesh);

    this.scene.add(this.planetGroup);
  }

  // ===================== VIBRANT PROCEDURAL NEON NEBULA =====================

  private initVolumetricNeonNebula() {
    this.nebulaGroup = new THREE.Group();
    this.nebulaPlanes = [];

    // Luminous neon nebula cloud colors
    const cloudColors = [
      new THREE.Color(0x0ea5e9), // Sky cyan
      new THREE.Color(0x6366f1), // Electric indigo
      new THREE.Color(0xa855f7), // Neon purple
      new THREE.Color(0xec4899), // Hot pink
      new THREE.Color(0x06b6d4), // Turquoise
    ];

    // Create high-res soft radial gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < 28; i++) {
      const size = 800 + Math.random() * 950;
      const planeGeo = new THREE.PlaneGeometry(size, size);
      const baseColor = cloudColors[i % cloudColors.length].clone();

      const planeMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        map: texture,
        transparent: true,
        opacity: 0.22 + Math.random() * 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(planeGeo, planeMat);
      mesh.position.set(
        (Math.random() - 0.5) * 4200,
        (Math.random() - 0.5) * 1800 + 100,
        -600 - Math.random() * 2600
      );
      mesh.rotation.z = Math.random() * Math.PI * 2;

      this.nebulaGroup.add(mesh);
      this.nebulaPlanes.push({
        mesh,
        rotSpeed: (Math.random() - 0.5) * 0.0006,
        baseColor,
      });
    }

    this.scene.add(this.nebulaGroup);
  }

  // ===================== RICH CONTINUOUS ASTEROID FIELD =====================

  private initRichAsteroidField() {
    this.asteroidField = [];

    // Distinct rock materials
    const rockyMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.75,
      flatShading: true,
    });

    const crystalOreMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.65,
      flatShading: true,
    });

    // 24 dynamic asteroids positioned relative to flight path (reduced ~40% for visual clarity)
    for (let i = 0; i < 24; i++) {
      const radius = 16 + Math.random() * 38;
      const geo = this.createDeformedIcosahedron(radius, 1);
      const mat = i % 5 === 0 ? crystalOreMat : i % 3 === 0 ? ironMat : rockyMat;
      const mesh = new THREE.Mesh(geo, mat);

      let relX = (Math.random() - 0.5) * 1400;
      // Keep central flight path and crosshair clear of obstructing boulders
      if (Math.abs(relX) < 160) {
        relX += relX >= 0 ? 160 : -160;
      }
      const relY = -30 + (Math.random() - 0.5) * 160;
      const relZ = -200 - Math.random() * 1200;

      mesh.position.set(relX, relY, relZ);
      this.scene.add(mesh);

      this.asteroidField.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.35
        ),
        relX,
        relY,
        relZ,
      });
    }
  }

  private createDeformedIcosahedron(radius: number, detail: number): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const factor = 1 + (Math.sin(vx * 0.18) + Math.cos(vy * 0.18) + Math.sin(vz * 0.18)) * 0.22;
      pos.setXYZ(i, vx * factor, vy * factor, vz * factor);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ===================== DISTANT FLEET SKIRMISHES =====================

  private initDistant3DBattles() {
    this.distantCruisers = [];
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    for (let i = 0; i < 4; i++) {
      const cruiser = new THREE.Group();
      const bodyGeo = new THREE.ConeGeometry(38, 160, 4);
      bodyGeo.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, hullMat);
      cruiser.add(body);

      const engGeo = new THREE.CylinderGeometry(8, 9, 14, 6);
      engGeo.rotateX(Math.PI / 2);
      const eng = new THREE.Mesh(engGeo, glowMat);
      eng.position.set(0, 0, 80);
      cruiser.add(eng);

      cruiser.position.set(
        (Math.random() - 0.5) * 3800,
        -180 - Math.random() * 220,
        -1600 - Math.random() * 1600
      );
      cruiser.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(cruiser);
      this.distantCruisers.push({ mesh: cruiser, speed: 20 + Math.random() * 25, direction: cruiser.rotation.y });
    }
  }

  // ===================== PLAYER SHIP BUILDER (DETAILED MULTI-PRIMITIVE) =====================

  public buildPlayerShipMesh(shipClassId: ShipId): THREE.Group {
    const group = new THREE.Group();
    // Scaled prominently so the ship is immediately visible and impressive
    group.scale.set(1.5, 1.5, 1.5);

    const shipDef = SHIP_CLASSES[shipClassId] || SHIP_CLASSES.INTERCEPTOR;
    const accentCol = new THREE.Color(shipDef.hullColor);

    const metalHullMat = new THREE.MeshStandardMaterial({
      color: 0x24324d, // Sleek titanium alloy gray/blue (never pitch black)
      metalness: 0.84,
      roughness: 0.28,
    });

    const armorPanelMat = new THREE.MeshStandardMaterial({
      color: 0x334566, // Distinct panel lines & reinforcement plating
      metalness: 0.88,
      roughness: 0.22,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: accentCol,
      metalness: 0.82,
      roughness: 0.22,
      emissive: accentCol,
      emissiveIntensity: 0.75, // Brilliant emissive accents
    });

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.15,
      roughness: 0.08,
      transmission: 0.9,
      thickness: 1.8,
      emissive: accentCol,
      emissiveIntensity: 0.45,
    });

    const engineHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.18,
    });

    const flameMat = new THREE.MeshBasicMaterial({
      color: accentCol,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });

    const cannonGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    this.thrusterPlumes = [];

    // Forward direction in Three.js is -Z (towards screen depth).
    // Rear of the ship is +Z (towards camera).
    if (shipClassId === 'DESTROYER') {
      // Heavy armored assault dreadnought
      const bodyGeo = new THREE.BoxGeometry(22, 10, 42);
      const body = new THREE.Mesh(bodyGeo, metalHullMat);
      group.add(body);

      // Prow ram pointing into depth (-Z)
      const ramGeo = new THREE.ConeGeometry(14, 18, 4);
      ramGeo.rotateX(-Math.PI / 2);
      const ram = new THREE.Mesh(ramGeo, accentMat);
      ram.position.set(0, 0, -26);
      group.add(ram);

      const wingGeo = new THREE.BoxGeometry(38, 4, 18);
      const wings = new THREE.Mesh(wingGeo, metalHullMat);
      wings.position.set(0, 0, 4);
      group.add(wings);

      [-8, -3, 3, 8].forEach(x => {
        const engGeo = new THREE.CylinderGeometry(2.5, 3.2, 10, 8);
        engGeo.rotateX(Math.PI / 2);
        const eng = new THREE.Mesh(engGeo, engineHousingMat);
        eng.position.set(x, 0, 22);
        group.add(eng);

        const flameGeo = new THREE.ConeGeometry(2.2, 18, 8);
        flameGeo.rotateX(Math.PI / 2); // Pointing backwards (+Z)
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(x, 0, 31);
        group.add(flame);
        this.thrusterPlumes.push(flame);
      });
    } else if (shipClassId === 'PHANTOM') {
      // Stealth interceptor
      const bodyGeo = new THREE.ConeGeometry(6, 42, 4);
      bodyGeo.rotateX(-Math.PI / 2); // Nose pointing forward (-Z)
      const body = new THREE.Mesh(bodyGeo, metalHullMat);
      group.add(body);

      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(26, 14);
      wingShape.lineTo(24, 4);
      wingShape.lineTo(0, -12);
      wingShape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.5 });
      wingGeo.center();

      const rWing = new THREE.Mesh(wingGeo, accentMat);
      rWing.rotation.x = Math.PI / 2;
      rWing.position.set(13, 0, 0);
      group.add(rWing);

      const lWing = new THREE.Mesh(wingGeo, accentMat);
      lWing.rotation.x = Math.PI / 2;
      lWing.rotation.y = Math.PI;
      lWing.position.set(-13, 0, 0);
      group.add(lWing);

      [-5, 5].forEach(x => {
        const engGeo = new THREE.CylinderGeometry(2.4, 2.8, 12, 6);
        engGeo.rotateX(Math.PI / 2);
        const eng = new THREE.Mesh(engGeo, engineHousingMat);
        eng.position.set(x, 0, 14);
        group.add(eng);

        const flameGeo = new THREE.ConeGeometry(2.2, 20, 6);
        flameGeo.rotateX(Math.PI / 2);
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(x, 0, 26);
        group.add(flame);
        this.thrusterPlumes.push(flame);
      });
    } else {
      // Default: INTERCEPTOR (High-Tech Strike Fighter)
      // Aerodynamic pointed nosecone pointing forward into depth (-Z)
      const fuselageGeo = new THREE.ConeGeometry(8.5, 38, 6);
      fuselageGeo.rotateX(-Math.PI / 2);
      const fuselage = new THREE.Mesh(fuselageGeo, metalHullMat);
      group.add(fuselage);

      // Cockpit Canopy (tinted reflective visor)
      const canopyGeo = new THREE.SphereGeometry(4.2, 8, 8);
      canopyGeo.scale(0.85, 0.75, 1.8);
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 3.2, -3);
      group.add(canopy);

      // Swept Wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 6);
      wingShape.lineTo(24, -8);
      wingShape.lineTo(20, -14);
      wingShape.lineTo(0, -10);
      wingShape.closePath();

      const extrudeSettings = { depth: 1.8, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.6, bevelThickness: 0.6 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      wingGeo.center();

      const rightWing = new THREE.Mesh(wingGeo, accentMat);
      rightWing.rotation.x = Math.PI / 2;
      rightWing.position.set(13, 0, 2);
      group.add(rightWing);

      const leftWing = new THREE.Mesh(wingGeo, accentMat);
      leftWing.rotation.x = Math.PI / 2;
      leftWing.rotation.y = Math.PI;
      leftWing.position.set(-13, 0, 2);
      group.add(leftWing);

      // Twin Heavy Fusion Nacelles
      [-5.5, 5.5].forEach(xOffset => {
        const nacelleGeo = new THREE.CylinderGeometry(3.2, 3.8, 14, 8);
        nacelleGeo.rotateX(Math.PI / 2);
        const nacelle = new THREE.Mesh(nacelleGeo, engineHousingMat);
        nacelle.position.set(xOffset, 0, 11);
        group.add(nacelle);

        // Vivid Thruster Flame Plume (pointing backwards into +Z)
        const flameGeo = new THREE.ConeGeometry(2.8, 18, 8);
        flameGeo.rotateX(Math.PI / 2);
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(xOffset, 0, 22);
        group.add(flame);
        this.thrusterPlumes.push(flame);
      });
    }

    // Modular Attachments
    this.armorPlateMeshes = [];
    [-11, 11].forEach(x => {
      const plateGeo = new THREE.BoxGeometry(6, 3, 14);
      const plate = new THREE.Mesh(plateGeo, metalHullMat);
      plate.position.set(x, 1.8, 2);
      plate.visible = false;
      group.add(plate);
      this.armorPlateMeshes.push(plate);
    });

    this.railgunBarrelMeshes = [];
    [-8.5, 8.5].forEach(x => {
      const barrelGeo = new THREE.CylinderGeometry(1.2, 1.2, 28, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xa855f7,
        emissiveIntensity: 0.6,
        metalness: 0.9,
      });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(x, -1, -8);
      barrel.visible = false;
      group.add(barrel);
      this.railgunBarrelMeshes.push(barrel);
    });

    this.missilePodMeshes = [];
    [-14, 14].forEach(x => {
      const podGeo = new THREE.BoxGeometry(5, 5, 8);
      const podMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(x, 3, 5);
      pod.visible = false;
      group.add(pod);
      this.missilePodMeshes.push(pod);
    });

    // ===================== DEDICATED TWIN PULSE CANNONS (LEFT & RIGHT) =====================
    const flashGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // 1. Left Pulse Cannon Hardpoint
    this.leftCannonGroup = new THREE.Group();
    const lPylon = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.0, 8.0), cannonMat);
    lPylon.position.set(0, 0, 0);
    this.leftCannonGroup.add(lPylon);

    const lHousing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 14, 8), cannonMat);
    lHousing.rotateX(Math.PI / 2);
    lHousing.position.set(0, 0, -2);
    this.leftCannonGroup.add(lHousing);

    const lCoolingRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.35, 6, 16), cannonGlowMat);
    lCoolingRing.position.set(0, 0, -4);
    this.leftCannonGroup.add(lCoolingRing);

    const lBarrel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 16, 8), cannonMat);
    lBarrel.rotateX(Math.PI / 2);
    lBarrel.position.set(0, 0, -11);
    this.leftCannonGroup.add(lBarrel);

    const lTip = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, 3, 8), cannonGlowMat);
    lTip.rotateX(Math.PI / 2);
    lTip.position.set(0, 0, -19);
    this.leftCannonGroup.add(lTip);

    this.leftMuzzleLocator.position.set(0, 0, -21);
    this.leftCannonGroup.add(this.leftMuzzleLocator);

    this.leftMuzzleFlash = new THREE.Mesh(flashGeo, flashMat.clone());
    this.leftMuzzleFlash.position.set(0, 0, -21);
    this.leftMuzzleFlash.visible = false;
    this.leftCannonGroup.add(this.leftMuzzleFlash);

    this.leftCannonGroup.position.set(-14, -0.8, -2);
    group.add(this.leftCannonGroup);

    // 2. Right Pulse Cannon Hardpoint
    this.rightCannonGroup = new THREE.Group();
    const rPylon = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.0, 8.0), cannonMat);
    rPylon.position.set(0, 0, 0);
    this.rightCannonGroup.add(rPylon);

    const rHousing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 14, 8), cannonMat);
    rHousing.rotateX(Math.PI / 2);
    rHousing.position.set(0, 0, -2);
    this.rightCannonGroup.add(rHousing);

    const rCoolingRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.35, 6, 16), cannonGlowMat);
    rCoolingRing.position.set(0, 0, -4);
    this.rightCannonGroup.add(rCoolingRing);

    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 16, 8), cannonMat);
    rBarrel.rotateX(Math.PI / 2);
    rBarrel.position.set(0, 0, -11);
    this.rightCannonGroup.add(rBarrel);

    const rTip = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, 3, 8), cannonGlowMat);
    rTip.rotateX(Math.PI / 2);
    rTip.position.set(0, 0, -19);
    this.rightCannonGroup.add(rTip);

    this.rightMuzzleLocator.position.set(0, 0, -21);
    this.rightCannonGroup.add(this.rightMuzzleLocator);

    this.rightMuzzleFlash = new THREE.Mesh(flashGeo, flashMat.clone());
    this.rightMuzzleFlash.position.set(0, 0, -21);
    this.rightMuzzleFlash.visible = false;
    this.rightCannonGroup.add(this.rightMuzzleFlash);

    this.rightCannonGroup.position.set(14, -0.8, -2);
    group.add(this.rightCannonGroup);

    return group;
  }

  private buildVoidCoreMesh(): THREE.Group {
    const group = new THREE.Group();
    const coreGeo = new THREE.SphereGeometry(4, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(7.5, 1.2, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    return group;
  }

  public setPlayerShipClass(shipClassId: ShipId) {
    if (this.playerHullMesh) {
      this.playerVisualShip.remove(this.playerHullMesh);
    }
    this.playerHullMesh = this.buildPlayerShipMesh(shipClassId);
    this.playerVisualShip.add(this.playerHullMesh);
  }

  public triggerShieldHitEffect() {
    this.shieldHitTimer = 0.28; // 280ms crisp energetic flare
    this.shieldHitLight.intensity = 4.5;
  }

  public updateModularShipVisuals(upgrades: {
    thrustersLevel: number;
    armorLevel: number;
    shieldLevel: number;
    weapons: WeaponId[];
    evolvedWeapons: EvolvedWeaponId[];
  }) {
    this.armorPlateMeshes.forEach(p => (p.visible = upgrades.armorLevel >= 1));
    const hasRailgun = upgrades.weapons.includes('RAILGUN') || upgrades.evolvedWeapons.includes('VOID_LANCE');
    this.railgunBarrelMeshes.forEach(b => (b.visible = hasRailgun));
    const hasMissiles = upgrades.weapons.includes('MISSILE_PODS') || upgrades.evolvedWeapons.includes('DOOMSDAY_SALVO');
    this.missilePodMeshes.forEach(p => (p.visible = hasMissiles));
    this.voidCoreMesh.visible = upgrades.evolvedWeapons.length > 0;

    const hasDrones = upgrades.weapons.includes('COMBAT_DRONES') || upgrades.evolvedWeapons.includes('OMEGA_SWARM');
    const targetDroneCount = hasDrones ? (upgrades.evolvedWeapons.includes('OMEGA_SWARM') ? 4 : 2) : 0;

    while (this.droneMeshes.length < targetDroneCount) {
      const droneGroup = this.buildDroneMesh(upgrades.evolvedWeapons.includes('OMEGA_SWARM'));
      this.scene.add(droneGroup);
      this.droneMeshes.push(droneGroup);
    }
    while (this.droneMeshes.length > targetDroneCount) {
      const removed = this.droneMeshes.pop();
      if (removed) this.scene.remove(removed);
    }
  }

  private buildDroneMesh(isEvolved: boolean): THREE.Group {
    const group = new THREE.Group();
    const color = isEvolved ? 0x34d399 : 0x10b981;

    const droneGeo = new THREE.ConeGeometry(3.5, 10, 5);
    droneGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(droneGeo, mat);
    group.add(mesh);

    const lensGeo = new THREE.SphereGeometry(1.5, 6, 6);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, -4.5);
    group.add(lens);

    return group;
  }

  // ===================== ENEMY 3D MESH GENERATION =====================

  public getOrCreateEnemyMesh(e: { id: number; type: string; color: string }): THREE.Group {
    let mesh = this.enemyMeshPool.get(e.id);
    if (!mesh) {
      mesh = new THREE.Group();
      const col = new THREE.Color(e.color);

      const metalMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.85,
        roughness: 0.28,
      });

      const glowMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.65,
        metalness: 0.6,
      });

      if (e.type === 'CRUISER') {
        // Heavy Armored Dreadnought
        const hullGeo = new THREE.BoxGeometry(28, 14, 58);
        const hull = new THREE.Mesh(hullGeo, metalMat);
        mesh.add(hull);

        const bridgeGeo = new THREE.BoxGeometry(16, 9, 20);
        const bridge = new THREE.Mesh(bridgeGeo, glowMat);
        bridge.position.set(0, 9, 6);
        mesh.add(bridge);

        const turretGeo = new THREE.CylinderGeometry(7, 7, 5, 8);
        const turret = new THREE.Mesh(turretGeo, metalMat);
        turret.position.set(0, 8, -14);
        mesh.add(turret);

        const barrelGeo = new THREE.CylinderGeometry(1.8, 1.8, 18, 6);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, glowMat);
        barrel.position.set(0, 8, -24);
        mesh.add(barrel);
      } else if (e.type === 'INTERCEPTOR') {
        // Fast Attack Fighter
        const bodyGeo = new THREE.ConeGeometry(6.5, 30, 5);
        bodyGeo.rotateX(-Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        mesh.add(body);

        const wingGeo = new THREE.BoxGeometry(34, 2, 12);
        const wings = new THREE.Mesh(wingGeo, glowMat);
        wings.position.set(0, 0, 4);
        mesh.add(wings);
      } else if (e.type === 'KAMIKAZE') {
        // Spiked explosive gyro drone
        const coreGeo = new THREE.DodecahedronGeometry(9, 0);
        const core = new THREE.Mesh(coreGeo, glowMat);
        mesh.add(core);

        const spikeGeo = new THREE.ConeGeometry(2.5, 16, 4);
        spikeGeo.rotateX(-Math.PI / 2);
        const spike = new THREE.Mesh(spikeGeo, metalMat);
        spike.position.set(0, 0, -10);
        mesh.add(spike);
      } else {
        // SWARM / SCOUT
        const scoutGeo = new THREE.TetrahedronGeometry(9, 0);
        scoutGeo.rotateX(-Math.PI / 2);
        const scout = new THREE.Mesh(scoutGeo, glowMat);
        mesh.add(scout);
      }

      this.scene.add(mesh);
      this.enemyMeshPool.set(e.id, mesh);
    }
    return mesh;
  }

  // ===================== CAPITAL BOSS 3D MESH =====================

  public updateBoss3DMesh(boss: BossEntity | null) {
    if (!boss) {
      if (this.bossGroup) {
        this.scene.remove(this.bossGroup);
        this.bossGroup = null;
        this.bossPartMeshes.clear();
      }
      return;
    }

    if (!this.bossGroup) {
      this.bossGroup = new THREE.Group();

      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        metalness: 0.9,
        roughness: 0.2,
      });

      const armorMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x9f1239,
        emissiveIntensity: 0.35,
      });

      const mainHullGeo = new THREE.BoxGeometry(95, 28, 200);
      const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
      this.bossGroup.add(mainHull);

      const prowGeo = new THREE.ConeGeometry(65, 100, 4);
      prowGeo.rotateX(-Math.PI / 2);
      const prow = new THREE.Mesh(prowGeo, armorMat);
      prow.position.set(0, 0, -145);
      this.bossGroup.add(prow);

      [-30, -12, 12, 30].forEach(x => {
        const engGeo = new THREE.CylinderGeometry(10, 12, 28, 8);
        engGeo.rotateX(Math.PI / 2);
        const eng = new THREE.Mesh(engGeo, hullMat);
        eng.position.set(x, 0, 105);
        this.bossGroup!.add(eng);

        const glowGeo = new THREE.CylinderGeometry(8, 8, 4, 8);
        glowGeo.rotateX(Math.PI / 2);
        const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        glow.position.set(x, 0, 119);
        this.bossGroup!.add(glow);
      });

      boss.parts.forEach(part => {
        const partGroup = new THREE.Group();

        if (part.type === 'TURRET') {
          const baseGeo = new THREE.CylinderGeometry(15, 17, 9, 8);
          const base = new THREE.Mesh(baseGeo, hullMat);
          partGroup.add(base);

          [-4.5, 4.5].forEach(bx => {
            const bGeo = new THREE.CylinderGeometry(3.5, 3.5, 36, 6);
            bGeo.rotateX(-Math.PI / 2);
            const barrel = new THREE.Mesh(bGeo, armorMat);
            barrel.position.set(bx, 2, -16);
            partGroup.add(barrel);
          });
        } else if (part.type === 'SHIELD_GEN') {
          const genGeo = new THREE.TorusGeometry(15, 4.5, 8, 16);
          const genMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const gen = new THREE.Mesh(genGeo, genMat);
          gen.rotation.x = Math.PI / 2;
          partGroup.add(gen);
        } else if (part.type === 'CORE') {
          const coreGeo = new THREE.SphereGeometry(20, 12, 12);
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0xc084fc,
            emissive: 0xc084fc,
            emissiveIntensity: 0.85,
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          partGroup.add(core);
        }

        partGroup.position.set(part.relX, 14, part.relY);
        this.bossGroup!.add(partGroup);
        this.bossPartMeshes.set(part.id, partGroup);
      });

      this.scene.add(this.bossGroup);
    }

    this.bossGroup.position.set(boss.x, 0, boss.y);
    this.bossGroup.rotation.y = -boss.angle + Math.PI / 2;

    boss.parts.forEach(part => {
      const pMesh = this.bossPartMeshes.get(part.id);
      if (pMesh) {
        pMesh.visible = !part.destroyed;
      }
    });
  }

  // ===================== NEMESIS 3D MESH =====================

  public updateNemesis3DMesh(nemesis: NemesisEntity | null) {
    if (!nemesis) {
      if (this.nemesisGroup) {
        this.scene.remove(this.nemesisGroup);
        this.nemesisGroup = null;
      }
      return;
    }

    if (!this.nemesisGroup) {
      this.nemesisGroup = new THREE.Group();
      const auraCol = new THREE.Color(nemesis.auraColor);

      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        metalness: 0.9,
        roughness: 0.2,
      });

      const auraMat = new THREE.MeshStandardMaterial({
        color: auraCol,
        emissive: auraCol,
        emissiveIntensity: 0.75,
        metalness: 0.5,
      });

      const fuselageGeo = new THREE.ConeGeometry(10, 42, 5);
      fuselageGeo.rotateX(-Math.PI / 2);
      const fuselage = new THREE.Mesh(fuselageGeo, hullMat);
      this.nemesisGroup.add(fuselage);

      const wingGeo = new THREE.BoxGeometry(42, 2.5, 14);
      const wings = new THREE.Mesh(wingGeo, auraMat);
      wings.position.set(0, 0, 6);
      this.nemesisGroup.add(wings);

      const auraGeo = new THREE.TorusGeometry(30, 2, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: auraCol,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(auraGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.nemesisGroup.add(ring);

      this.scene.add(this.nemesisGroup);
    }

    this.nemesisGroup.position.set(nemesis.x, 0, nemesis.y);
    this.nemesisGroup.rotation.y = -nemesis.angle + Math.PI / 2;
  }

  // ===================== 3D PORTALS =====================

  public updatePortals3D(portals: Portal[]) {
    const activeIds = new Set(portals.map(p => p.id));
    this.portalMeshes.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.portalMeshes.delete(id);
      }
    });

    portals.forEach(p => {
      let pGroup = this.portalMeshes.get(p.id);
      if (!pGroup) {
        pGroup = new THREE.Group();
        const torusGeo = new THREE.TorusGeometry(p.radius, 4, 12, 32);
        const torusMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        torus.rotation.x = Math.PI / 2;
        pGroup.add(torus);

        const coreGeo = new THREE.CircleGeometry(p.radius * 0.85, 24);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0x020617,
          side: THREE.DoubleSide,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.rotation.x = -Math.PI / 2;
        pGroup.add(core);

        this.scene.add(pGroup);
        this.portalMeshes.set(p.id, pGroup);
      }

      pGroup.position.set(p.x, 0, p.y);
      pGroup.rotation.y += 0.025;
    });
  }

  // ===================== 3D PICKUPS =====================

  public updatePickups3D(pickups: { active: boolean; id: number; x: number; y: number; type: string; color: string }[]) {
    const activePickups = pickups.filter(p => p.active);
    const activeIds = new Set(activePickups.map(p => p.id));

    this.pickupMeshes.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.pickupMeshes.delete(id);
      }
    });

    activePickups.forEach(p => {
      let pGroup = this.pickupMeshes.get(p.id);
      if (!pGroup) {
        pGroup = new THREE.Group();
        const col = new THREE.Color(p.color);
        const crystalGeo = new THREE.OctahedronGeometry(6.5, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.65,
          metalness: 0.8,
          roughness: 0.2,
          flatShading: true,
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        pGroup.add(crystal);

        this.scene.add(pGroup);
        this.pickupMeshes.set(p.id, pGroup);
      }

      pGroup.position.set(p.x, 6 + Math.sin(Date.now() * 0.005 + p.id) * 3, p.y);
      pGroup.rotation.y += 0.04;
      pGroup.rotation.x += 0.02;
    });
  }

  // ===================== MAIN 3D RENDER LOOP =====================

  public render(params: {
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      isDashing: boolean;
      shield: number;
      maxShield: number;
    };
    enemies: { id: number; x: number; y: number; vx: number; vy: number; type: string; color: string }[];
    boss: BossEntity | null;
    nemesis: NemesisEntity | null;
    projectiles: { active: boolean; x: number; y: number; vx: number; vy: number }[];
    enemyBullets: { active: boolean; x: number; y: number; vx: number; vy: number }[];
    particles: { active: boolean; x: number; y: number; color: string; radius: number; alpha: number }[];
    pickups: { active: boolean; id: number; x: number; y: number; type: string; color: string }[];
    portals: Portal[];
    sectorId: SectorId;
    isFever: boolean;
    cameraShake: number;
    dt: number;
  }) {
    const { player, enemies, boss, nemesis, projectiles, enemyBullets, particles, pickups, portals, isFever, cameraShake, dt } = params;

    // 1. Sector Lighting & Nebula Tint
    const secDef = SECTORS[params.sectorId] || SECTORS.NEON_NEBULA;
    const nebulaHex = parseInt(secDef.starColor.replace('#', '0x'), 16) || 0x38bdf8;
    this.sectorFillLight.color.setHex(nebulaHex);

    // 2. TRUE THIRD-PERSON CHASE CAMERA
    // Camera is positioned behind (+Z) and slightly above (+Y) the ship, looking ahead (-Z).
    // This reliably frames the player ship in the lower third (70-76% screen height).
    const camDistanceZ = 92;
    const camHeightY = 36;
    const camLookAheadZ = -220;

    // Follow target with damped inertia
    this.camFollowPos.set(
      player.x + (player.vx || 0) * 0.08,
      camHeightY,
      player.y + camDistanceZ + (player.vy || 0) * 0.05
    );

    const lerpFactor = Math.min(1.0, dt * 8.0);
    this.camCurrentPos.lerp(this.camFollowPos, lerpFactor);

    // Camera shake
    const shakeOffsetX = (Math.random() - 0.5) * cameraShake * 1.5;
    const shakeOffsetY = (Math.random() - 0.5) * cameraShake * 1.0;
    const shakeOffsetZ = (Math.random() - 0.5) * cameraShake * 1.5;

    this.camera.position.set(
      this.camCurrentPos.x + shakeOffsetX,
      this.camCurrentPos.y + shakeOffsetY,
      this.camCurrentPos.z + shakeOffsetZ
    );

    // Look-at target (deep into the forward horizon ahead of the ship)
    this.camTargetLook.set(
      player.x * 0.85 + this.camCurrentPos.x * 0.15,
      8,
      player.y + camLookAheadZ
    );
    this.camCurrentLook.lerp(this.camTargetLook, lerpFactor);
    this.camera.lookAt(this.camCurrentLook);

    // Dynamic FOV Dilation: 60° normal cruise -> 75° during Dash / Fever
    const targetFov = player.isDashing ? 75 : isFever ? 68 : 60;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 6.0);
    this.camera.updateProjectionMatrix();

    // 3. SHIP POSITIONING, INERTIAL BANKING & PITCH
    this.playerGroup.position.set(player.x, 0, player.y);

    // Update dynamic player lighting from chase and lateral positions
    this.cameraChaseLight.position.set(player.x, 80, player.y + 120);
    this.cameraChaseLight.target.position.set(player.x, 0, player.y - 60);
    this.cameraChaseLight.target.updateMatrixWorld();

    this.shipLateralLightLeft.position.set(player.x - 48, 14, player.y + 10);
    this.shipLateralLightRight.position.set(player.x + 48, 14, player.y + 10);

    // Realistic banking roll when moving sideways (vx)
    const targetRoll = Math.max(-0.55, Math.min(0.55, (player.vx || 0) * -0.0022));
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1.0, dt * 12);

    // Pitch down on acceleration forward (vy < 0)
    const targetPitch = Math.max(-0.25, Math.min(0.25, (player.vy || 0) * 0.0014));
    this.currentPitch += (targetPitch - this.currentPitch) * Math.min(1.0, dt * 10);

    // Aim yaw based on player.angle offset from straight forward (-Math.PI / 2)
    const aimYaw = -(player.angle + Math.PI / 2) * 0.52;
    this.playerVisualShip.rotation.set(this.currentPitch, aimYaw, this.currentRoll);

    // Smooth physical barrel and ship recoil damping
    this.leftBarrelRecoil = Math.max(0, this.leftBarrelRecoil - dt * 28);
    this.rightBarrelRecoil = Math.max(0, this.rightBarrelRecoil - dt * 28);
    this.shipRecoilZ = Math.max(0, this.shipRecoilZ - dt * 14);

    if (this.leftCannonGroup) {
      this.leftCannonGroup.position.z = -2 + this.leftBarrelRecoil;
    }
    if (this.rightCannonGroup) {
      this.rightCannonGroup.position.z = -2 + this.rightBarrelRecoil;
    }
    this.playerVisualShip.position.z = this.shipRecoilZ;

    // Muzzle flash decay and dynamic illumination
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      const progress = Math.max(0, this.muzzleFlashTimer / 0.08);
      this.muzzleFlashLight.intensity = 8.5 * progress;
      if (this.leftMuzzleFlash) {
        this.leftMuzzleFlash.scale.set(progress * 2.4, progress * 2.4, progress * 2.4);
        this.leftMuzzleFlash.visible = this.leftBarrelRecoil > 0.1;
      }
      if (this.rightMuzzleFlash) {
        this.rightMuzzleFlash.scale.set(progress * 2.4, progress * 2.4, progress * 2.4);
        this.rightMuzzleFlash.visible = this.rightBarrelRecoil > 0.1;
      }
    } else {
      this.muzzleFlashLight.intensity = 0;
      if (this.leftMuzzleFlash) this.leftMuzzleFlash.visible = false;
      if (this.rightMuzzleFlash) this.rightMuzzleFlash.visible = false;
    }

    this.playerEngineLight.position.set(player.x, 5, player.y + 14);

    // Thruster Flames Animation
    const baseFlameScale = player.isDashing ? 2.6 : isFever ? 1.9 : 1.1;
    const flameFlicker = baseFlameScale * (0.85 + Math.sin(Date.now() * 0.04) * 0.25);
    this.thrusterPlumes.forEach(p => p.scale.set(1, 1, flameFlicker));

    // Shield Flare: INVISIBLE normally; only flashes momentarily on hit!
    if (this.shieldHitTimer > 0) {
      this.shieldHitTimer -= dt;
      const hitProgress = Math.max(0, this.shieldHitTimer / 0.28);
      const mat = this.shieldImpactMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.65 * hitProgress;
      this.shieldImpactMesh.visible = true;
      this.shieldImpactMesh.rotation.y += 0.05;
      this.shieldHitLight.position.set(player.x, 3, player.y);
      this.shieldHitLight.intensity = 4.5 * hitProgress;
    } else {
      this.shieldImpactMesh.visible = false;
      this.shieldHitLight.intensity = 0;
    }

    // Orbiting Drones Position
    if (this.droneMeshes.length > 0) {
      const orbitR = 46;
      const t = Date.now() * 0.003;
      this.droneMeshes.forEach((d, i) => {
        const da = t + (i * (Math.PI * 2 / this.droneMeshes.length));
        d.position.set(player.x + Math.cos(da) * orbitR, 6 + Math.sin(da * 2) * 4, player.y + Math.sin(da) * orbitR);
        d.rotation.y = -da;
      });
    }

    // 4. Update Enemies in 3D
    const activeEnemyIds = new Set(enemies.map(e => e.id));
    this.enemyMeshPool.forEach((mesh, id) => {
      if (!activeEnemyIds.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshPool.delete(id);
      }
    });

    enemies.forEach(e => {
      const mesh = this.getOrCreateEnemyMesh(e);
      mesh.position.set(e.x, 0, e.y);
      const angle = Math.atan2(e.vy, e.vx);
      mesh.rotation.y = -angle + Math.PI / 2;
    });

    // 5. Boss & Nemesis
    this.updateBoss3DMesh(boss);
    this.updateNemesis3DMesh(nemesis);

    // 6. Projectiles (Dual-Layer: Instanced Mesh update for outer cyan halo + inner white core)
    let pIdx = 0;
    projectiles.forEach(p => {
      if (!p.active || pIdx >= this.maxInstancedProjectiles) return;
      this.dummy.position.set(p.x, 3.5, p.y);
      const pAngle = Math.atan2(p.vy, p.vx);
      this.dummy.rotation.set(0, -pAngle + Math.PI / 2, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.projectileMeshPool.setMatrixAt(pIdx, this.dummy.matrix);
      this.projectileCoreMeshPool.setMatrixAt(pIdx, this.dummy.matrix);
      pIdx++;
    });
    for (let i = pIdx; i < this.maxInstancedProjectiles; i++) {
      this.dummy.position.set(0, -1000, 0);
      this.dummy.updateMatrix();
      this.projectileMeshPool.setMatrixAt(i, this.dummy.matrix);
      this.projectileCoreMeshPool.setMatrixAt(i, this.dummy.matrix);
    }
    this.projectileMeshPool.instanceMatrix.needsUpdate = true;
    this.projectileCoreMeshPool.instanceMatrix.needsUpdate = true;

    // 7. Enemy Bullets (Instanced Mesh update)
    let bIdx = 0;
    enemyBullets.forEach(b => {
      if (!b.active || bIdx >= this.maxInstancedEnemyBullets) return;
      this.dummy.position.set(b.x, 3.5, b.y);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.enemyBulletMeshPool.setMatrixAt(bIdx, this.dummy.matrix);
      bIdx++;
    });
    for (let i = bIdx; i < this.maxInstancedEnemyBullets; i++) {
      this.dummy.position.set(0, -1000, 0);
      this.dummy.updateMatrix();
      this.enemyBulletMeshPool.setMatrixAt(i, this.dummy.matrix);
    }
    this.enemyBulletMeshPool.instanceMatrix.needsUpdate = true;

    // 8. 3D Particles
    let partIdx = 0;
    particles.forEach(pt => {
      if (!pt.active || partIdx >= this.maxParticles) return;
      const idx = partIdx * 3;
      this.particlePositions[idx] = pt.x;
      this.particlePositions[idx + 1] = 4 + Math.random() * 5;
      this.particlePositions[idx + 2] = pt.y;

      this.tempColor.set(pt.color);
      this.particleColors[idx] = this.tempColor.r;
      this.particleColors[idx + 1] = this.tempColor.g;
      this.particleColors[idx + 2] = this.tempColor.b;
      this.particleSizes[partIdx] = pt.radius * 2.2;
      partIdx++;
    });
    for (let i = partIdx; i < this.maxParticles; i++) {
      const idx = i * 3;
      this.particlePositions[idx + 1] = -1000;
    }
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;

    // 9. Pickups & Portals
    this.updatePickups3D(pickups);
    this.updatePortals3D(portals);

    // 10. UNIVERSE DYNAMICS (Streaming Dust, Asteroid Field, Planet, Nebula)
    this.planetMesh.rotation.y += 0.00015;
    this.planetAtmosphereMesh.rotation.y += 0.0002;
    this.planetGroup.position.x = player.x * 0.04 + 820;
    this.planetGroup.position.z = player.y * 0.04 - 2400;

    // Nebula volumetric slow rotation & parallax
    this.nebulaPlanes.forEach(p => {
      p.mesh.rotation.z += p.rotSpeed;
    });
    this.nebulaGroup.position.x = player.x * 0.07;
    this.nebulaGroup.position.z = player.y * 0.07;

    // Continuous Near Streaming Dust (gives direct sense of forward motion)
    const dustSpeed = (player.isDashing ? 650 : isFever ? 450 : 250) * dt;
    const dustPositions = this.nearDustPositions;
    for (let i = 0; i < dustPositions.length / 3; i++) {
      const idx = i * 3;
      // Dust streams towards camera (+Z)
      dustPositions[idx + 2] += dustSpeed;
      if (dustPositions[idx + 2] > player.y + 150) {
        dustPositions[idx] = player.x + (Math.random() - 0.5) * 600;
        dustPositions[idx + 1] = -40 + Math.random() * 180;
        dustPositions[idx + 2] = player.y - 450 - Math.random() * 200;
      }
    }
    this.nearDustParticles.geometry.attributes.position.needsUpdate = true;

    // Rich Dynamic Asteroid Field (continuously recycled ahead of flight path)
    this.asteroidField.forEach(a => {
      a.mesh.rotation.x += a.rotSpeed.x * dt;
      a.mesh.rotation.y += a.rotSpeed.y * dt;
      a.mesh.rotation.z += a.rotSpeed.z * dt;

      // Position relative to current player flight horizon
      a.mesh.position.set(player.x + a.relX, a.relY, player.y + a.relZ);

      // If camera has passed this asteroid, recycle it far ahead!
      if (a.relZ > 120) {
        a.relZ -= 1300;
        a.relX = (Math.random() - 0.5) * 1200;
      }
    });

    // Speed Streaks visibility during Dash or Fever
    const isHighSpeed = player.isDashing || isFever;
    const streakMat = this.speedStreaks.material as THREE.LineBasicMaterial;
    if (isHighSpeed) {
      streakMat.opacity = Math.min(0.85, streakMat.opacity + dt * 4.5);
      const pos = this.speedStreakPositions;
      for (let i = 0; i < 140; i++) {
        const idx = i * 6;
        const sx = player.x + (Math.random() - 0.5) * 400;
        const sy = (Math.random() - 0.5) * 90 + 20;
        const sz = player.y - 250 + Math.random() * 320;
        const len = 50 + Math.random() * 80;
        pos[idx] = sx; pos[idx + 1] = sy; pos[idx + 2] = sz;
        pos[idx + 3] = sx; pos[idx + 4] = sy; pos[idx + 5] = sz + len;
      }
      this.speedStreaks.geometry.attributes.position.needsUpdate = true;
    } else {
      streakMat.opacity = Math.max(0, streakMat.opacity - dt * 3.5);
    }

    // Distant cruisers background flight
    this.distantCruisers.forEach(c => {
      c.mesh.position.x += Math.cos(c.direction) * c.speed * dt;
      c.mesh.position.z += Math.sin(c.direction) * c.speed * dt;
    });

    // 10b. Update Expanding Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - sw.life / sw.maxLife;
      const currentScale = 1 + progress * sw.maxRadius;
      sw.mesh.scale.set(currentScale, currentScale, currentScale);
      const mat = sw.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - progress);
    }

    // 11. Three.js Final Frame Render
    this.renderer.render(this.scene, this.camera);
  }

  // ===================== 3D COMBAT & AIMING HELPERS =====================

  public getAimPointOnCombatPlane(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    playerX: number,
    playerY: number
  ): THREE.Vector3 {
    const ndcX = (screenX / (canvasWidth || 1)) * 2 - 1;
    const ndcY = -(screenY / (canvasHeight || 1)) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, target);

    if (!hit || target.z >= playerY - 35) {
      target.set(playerX + ndcX * 380, 0, playerY - 480);
    } else {
      target.z = Math.min(target.z, playerY - 60);
      target.z = Math.max(target.z, playerY - 1400);
    }
    return target;
  }

  public getLeftMuzzleWorldPos(): { x: number; y: number } {
    const v = new THREE.Vector3();
    this.leftMuzzleLocator.getWorldPosition(v);
    return { x: v.x, y: v.z };
  }

  public getRightMuzzleWorldPos(): { x: number; y: number } {
    const v = new THREE.Vector3();
    this.rightMuzzleLocator.getWorldPosition(v);
    return { x: v.x, y: v.z };
  }

  public triggerMuzzleFlash(barrel: 'LEFT' | 'RIGHT') {
    this.lastFiredBarrel = barrel;
    this.muzzleFlashTimer = 0.08;
    const pos = barrel === 'LEFT' ? this.getLeftMuzzleWorldPos() : this.getRightMuzzleWorldPos();
    this.muzzleFlashLight.position.set(pos.x, 4.0, pos.y);
    this.muzzleFlashLight.intensity = 8.5;

    if (barrel === 'LEFT') {
      this.leftBarrelRecoil = 2.2;
      if (this.leftMuzzleFlash) {
        this.leftMuzzleFlash.visible = true;
        this.leftMuzzleFlash.scale.set(2.4, 2.4, 2.4);
      }
    } else {
      this.rightBarrelRecoil = 2.2;
      if (this.rightMuzzleFlash) {
        this.rightMuzzleFlash.visible = true;
        this.rightMuzzleFlash.scale.set(2.4, 2.4, 2.4);
      }
    }
    this.shipRecoilZ = 1.0;
  }

  public triggerExplosionFX(x: number, y: number, colorHex: number = 0x38bdf8, scale: number = 1.0) {
    const shockGeo = new THREE.RingGeometry(2, 6, 32);
    shockGeo.rotateX(-Math.PI / 2);
    const shockMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shockMesh = new THREE.Mesh(shockGeo, shockMat);
    shockMesh.position.set(x, 2, y);
    this.scene.add(shockMesh);
    this.shockwaves.push({
      mesh: shockMesh,
      life: 0.38,
      maxLife: 0.38,
      maxRadius: 28 * scale,
    });
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.renderer.dispose();
  }
}
