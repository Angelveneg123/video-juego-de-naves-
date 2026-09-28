/**
 * Void Survivor - Procedural Web Audio API Sound & Adaptive Music Engine
 * Multi-layer procedural music with smooth cross-fading and rich synthesized SFX.
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music Layer Gains
  private ambientGain: GainNode | null = null;
  private combatGain: GainNode | null = null;
  private dangerGain: GainNode | null = null;
  private eliteGain: GainNode | null = null;
  private bossGain: GainNode | null = null;
  private voidGain: GainNode | null = null;

  // Active Music Generators
  private isMusicPlaying = false;
  private musicInterval: number | null = null;
  private currentStep = 0;
  private baseFreq = 55; // Root A1 (55Hz)
  private musicTempo = 115; // BPM

  // Settings
  public musicVolume = 0.5;
  public sfxVolume = 0.7;
  public isMuted = false;

  // Combo pitch tracking for gem collects
  private lastCollectTime = 0;
  private collectCombo = 0;

  constructor() {
    // Load persisted volume settings
    try {
      const savedMusic = localStorage.getItem('void_survivor_music_vol');
      if (savedMusic !== null) this.musicVolume = parseFloat(savedMusic);
      const savedSfx = localStorage.getItem('void_survivor_sfx_vol');
      if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
      const savedMute = localStorage.getItem('void_survivor_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
    } catch {
      // Ignore localStorage errors
    }
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Bus gains
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music sub-layers
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.ambientGain.connect(this.musicGain);

      this.combatGain = this.ctx.createGain();
      this.combatGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.combatGain.connect(this.musicGain);

      this.dangerGain = this.ctx.createGain();
      this.dangerGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.dangerGain.connect(this.musicGain);

      this.eliteGain = this.ctx.createGain();
      this.eliteGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.eliteGain.connect(this.musicGain);

      this.bossGain = this.ctx.createGain();
      this.bossGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.bossGain.connect(this.musicGain);

      this.voidGain = this.ctx.createGain();
      this.voidGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.voidGain.connect(this.musicGain);

      this.startAdaptiveMusic();
    } catch (e) {
      console.warn('Web Audio API not supported or user gesture required', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
    localStorage.setItem('void_survivor_music_vol', this.musicVolume.toString());
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    localStorage.setItem('void_survivor_sfx_vol', this.sfxVolume.toString());
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    localStorage.setItem('void_survivor_muted', this.isMuted.toString());
    return this.isMuted;
  }

  /**
   * Adapts the 6 procedural music layer volumes based on real-time combat conditions
   */
  public updateMusicLayers(params: {
    intensity: number;      // 0 to 1 (from GameDirector)
    isEliteAlive: boolean;
    isBossAlive: boolean;
    isVoidActive: boolean;
    isFeverActive: boolean;
    playerHpRatio: number;  // 0 to 1
  }) {
    if (!this.ctx || !this.isMusicPlaying) return;
    const now = this.ctx.currentTime;
    const ramp = 0.8; // Smooth ramp seconds

    // Ambient: always somewhat present, dips during intense boss fights
    const targetAmbient = params.isBossAlive ? 0.25 : 0.6;
    // Combat: ramps up with intensity
    const targetCombat = params.isBossAlive ? 0.3 : Math.min(0.8, params.intensity * 0.9);
    // Danger: rises when player HP is critical (< 35%) or high intensity
    const hpDanger = params.playerHpRatio < 0.35 ? (0.35 - params.playerHpRatio) / 0.35 : 0;
    const targetDanger = Math.min(0.7, (params.intensity > 0.65 ? (params.intensity - 0.65) * 2 : 0) + hpDanger * 0.6);
    // Elite
    const targetElite = params.isEliteAlive ? 0.75 : 0;
    // Boss
    const targetBoss = params.isBossAlive ? 0.9 : 0;
    // Void / Fever
    const targetVoid = (params.isVoidActive || params.isFeverActive) ? 0.75 : 0;

    if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(targetAmbient, now, ramp);
    if (this.combatGain) this.combatGain.gain.setTargetAtTime(targetCombat, now, ramp);
    if (this.dangerGain) this.dangerGain.gain.setTargetAtTime(targetDanger, now, ramp);
    if (this.eliteGain) this.eliteGain.gain.setTargetAtTime(targetElite, now, ramp);
    if (this.bossGain) this.bossGain.gain.setTargetAtTime(targetBoss, now, ramp);
    if (this.voidGain) this.voidGain.gain.setTargetAtTime(targetVoid, now, ramp);
  }

  private startAdaptiveMusic() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;

    // Ambient drone pad
    this.startAmbientDrone();

    // Sequencer interval (16th notes)
    const stepDurationMs = (60 / this.musicTempo / 4) * 1000;
    this.musicInterval = window.setInterval(() => {
      this.playSequencerStep();
    }, stepDurationMs);
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.ambientGain) return;
    try {
      // 2 gentle detuned sine/triangle oscillators
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(this.baseFreq * 1.5, this.ctx.currentTime); // E2
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(this.baseFreq * 0.75, this.ctx.currentTime); // A0

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(padGain);
      padGain.connect(this.ambientGain);

      osc1.start();
      osc2.start();
    } catch (e) {
      console.warn('Could not start ambient drone', e);
    }
  }

  private playSequencerStep() {
    if (!this.ctx) return;
    const step = this.currentStep % 16;
    this.currentStep++;

    // Minor pentatonic scale offsets: [0, 3, 5, 7, 10, 12, 15, 17]
    const scale = [0, 3, 5, 7, 10, 12];
    const now = this.ctx.currentTime;

    // Combat Bass Kick / Bassline (Steps 0, 4, 8, 12 + offbeats on 6, 14)
    if (this.combatGain && (step === 0 || step === 4 || step === 8 || step === 12 || step === 6 || step === 14)) {
      this.playSynthNote({
        freq: step === 0 ? this.baseFreq : this.baseFreq * (step % 8 === 0 ? 1 : 1.25),
        duration: 0.15,
        type: 'sawtooth',
        destination: this.combatGain,
        filterCutoff: 380,
        volume: 0.22,
      });

      // Subtle metallic hi-hat on odd steps
      if (step % 2 === 1) {
        this.playHiHat(this.combatGain, 0.05);
      }
    }

    // Danger Arpeggiator (Fast 16th arpeggio)
    if (this.dangerGain && this.dangerGain.gain.value > 0.05) {
      const noteIdx = (step * 3) % scale.length;
      const semitones = scale[noteIdx] + 24; // 2 octaves up
      const freq = this.baseFreq * Math.pow(2, semitones / 12);
      this.playSynthNote({
        freq,
        duration: 0.08,
        type: 'triangle',
        destination: this.dangerGain,
        filterCutoff: 1400,
        volume: 0.12,
      });
    }

    // Elite Resonance (Pulsing fifths on bars)
    if (this.eliteGain && this.eliteGain.gain.value > 0.05 && (step === 0 || step === 8)) {
      this.playSynthNote({
        freq: this.baseFreq * 1.5,
        duration: 0.35,
        type: 'square',
        destination: this.eliteGain,
        filterCutoff: 600,
        volume: 0.25,
      });
    }

    // Boss Heavy Hit & Sub-Drop (Bar 0)
    if (this.bossGain && this.bossGain.gain.value > 0.05 && step === 0) {
      this.playSynthNote({
        freq: this.baseFreq * 0.5, // 27.5 Hz Sub
        duration: 0.6,
        type: 'sine',
        destination: this.bossGain,
        filterCutoff: 200,
        volume: 0.45,
      });
    }

    // Void Shimmer (Every 4 steps)
    if (this.voidGain && this.voidGain.gain.value > 0.05 && step % 4 === 2) {
      const freq = this.baseFreq * 4; // High ethereal pitch
      this.playSynthNote({
        freq,
        duration: 0.25,
        type: 'sine',
        destination: this.voidGain,
        filterCutoff: 2200,
        volume: 0.15,
      });
    }
  }

  private playSynthNote(opts: {
    freq: number;
    duration: number;
    type: OscillatorType;
    destination: AudioNode;
    filterCutoff: number;
    volume: number;
  }) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = opts.type;
      osc.frequency.setValueAtTime(opts.freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(opts.filterCutoff, now);

      gain.gain.setValueAtTime(opts.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(opts.destination);

      osc.start(now);
      osc.stop(now + opts.duration + 0.05);
    } catch {
      // Ignore transient audio node failures
    }
  }

  private playHiHat(destination: AudioNode, volume: number) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // White noise buffer for hi-hat
      const bufferSize = this.ctx.sampleRate * 0.03;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(now);
    } catch {
      // Ignore
    }
  }

  // ===================== SFX PROCEDURAL SYNTHESIS =====================

  public playLaser(type: 'PLASMA' | 'RAILGUN' | 'MISSILE' | 'TESLA' | 'SPREAD' | 'EVOLVED') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      switch (type) {
        case 'PLASMA': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(740, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }
        case 'RAILGUN': {
          // Sharp sonic crack
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }
        case 'MISSILE': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(440, now + 0.15);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'TESLA': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(950, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.13);
          break;
        }
        case 'SPREAD': {
          for (let i = 0; i < 2; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(480 + i * 90, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.09);
          }
          break;
        }
        case 'EVOLVED': {
          // Deep booming energy beam
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(900, now);
          osc1.frequency.exponentialRampToValueAtTime(90, now + 0.28);
          osc2.type = 'square';
          osc2.frequency.setValueAtTime(240, now);
          osc2.frequency.exponentialRampToValueAtTime(45, now + 0.3);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.sfxGain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.35);
          osc2.stop(now + 0.35);
          break;
        }
      }
    } catch {
      // Ignore
    }
  }

  public playExplosion(size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'BOSS_CORE') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const dur = size === 'SMALL' ? 0.2 : size === 'MEDIUM' ? 0.35 : size === 'LARGE' ? 0.6 : 1.2;
      const baseVol = size === 'SMALL' ? 0.16 : size === 'MEDIUM' ? 0.25 : size === 'LARGE' ? 0.4 : 0.65;

      // Filtered noise burst
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(size === 'BOSS_CORE' ? 240 : 480, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(baseVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);

      // Add deep sub-rumble for LARGE / BOSS_CORE
      if (size === 'LARGE' || size === 'BOSS_CORE') {
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(95, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + dur);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + dur + 0.05);
      }
    } catch {
      // Ignore
    }
  }

  public playPulseShot(barrel: 'LEFT' | 'RIGHT') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      // Create high-tech dual-layer pulse laser sound
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Alternating frequency between left and right barrels for crisp "RATATATATA" rhythm
      const startFreq = barrel === 'LEFT' ? 880 : 960;
      const endFreq = barrel === 'LEFT' ? 140 : 170;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.075);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(startFreq * 0.5, now);
      osc2.frequency.exponentialRampToValueAtTime(endFreq * 0.5, now + 0.075);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.075);
      filter.Q.setValueAtTime(1.8, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.08);
      osc2.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  public playHitMarker(isKill: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      if (!isKill) {
        // Crisp high-tech tactile tick (Modern Warfare style feedback)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2600, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.035);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
      } else {
        // Deep crunch + metallic ring on enemy destruction
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(420, now);
        osc1.frequency.exponentialRampToValueAtTime(75, now + 0.12);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1800, now);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.12);

        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.13);
        osc2.stop(now + 0.13);
      }
    } catch {
      // Ignore
    }
  }

  public playCrystalCollect() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = performance.now();
    if (now - this.lastCollectTime < 500) {
      this.collectCombo = Math.min(16, this.collectCombo + 1);
    } else {
      this.collectCombo = 0;
    }
    this.lastCollectTime = now;

    try {
      const audioNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      // Musical pentatonic scale progression
      const base = 440; // A4
      const intervals = [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25, 2.5];
      const pitchMult = intervals[this.collectCombo % intervals.length] * (1 + Math.floor(this.collectCombo / intervals.length) * 0.5);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * pitchMult, audioNow);
      gain.gain.setValueAtTime(0.08, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(audioNow);
      osc.stop(audioNow + 0.09);
    } catch {
      // Ignore
    }
  }

  public playHit(type: 'SHIELD' | 'HULL' | 'CRIT') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'SHIELD') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.07);
        gain.gain.setValueAtTime(0.15, now);
      } else if (type === 'HULL') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
      } else {
        // CRIT
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.28, now);
      }

      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // Ignore
    }
  }

  public playLevelUp() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const chord = [392, 493.88, 587.33, 783.99]; // G major
      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + idx * 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + 0.55 + idx * 0.06);
      });
    } catch {
      // Ignore
    }
  }

  public playWeaponEvolution() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      // Ascending triumphant synthesis
      const notes = [220, 330, 440, 660, 880, 1320];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.22, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.85 + i * 0.08);
      });
    } catch {
      // Ignore
    }
  }

  public playSectorTransition() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.6);
      osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.25);
    } catch {
      // Ignore
    }
  }

  public playPortalEnter() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Ignore
    }
  }

  public playAlertKlaxon() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      [0, 0.22].forEach(delay => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(650, now + delay);
        osc.frequency.setValueAtTime(450, now + delay + 0.1);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  public playFeverStart() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }

  public playTelegraphTone(chargeDuration: number) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + chargeDuration);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.2, now + chargeDuration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + chargeDuration + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + chargeDuration + 0.06);
    } catch {
      // Ignore
    }
  }
}

export const audio = new AudioManager();
