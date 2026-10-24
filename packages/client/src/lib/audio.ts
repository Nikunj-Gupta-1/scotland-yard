"use client";

/**
 * Web Audio API Sound Engine for Digital Scotland Yard.
 * Pure procedural synthesis with zero external audio assets.
 */

interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
}

const STORAGE_KEY = "scotland_yard_audio_settings";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private ambientSource: AudioBufferSourceNode | null = null;
  private isAmbientPlaying: boolean = false;

  private settings: AudioSettings = {
    muted: false,
    masterVolume: 0.8,
    sfxVolume: 0.9,
    ambientVolume: 0.4
  };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
      } catch {
        // Fallback to default
      }
    }
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.applyVolumes();

    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  private ensureRunning() {
    this.initContext();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private applyVolumes() {
    if (!this.masterGain || !this.sfxGain || !this.ambientGain) return;
    const now = this.ctx ? this.ctx.currentTime : 0;
    const effectiveMaster = this.settings.muted ? 0 : this.settings.masterVolume;

    this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
    this.ambientGain.gain.setValueAtTime(this.settings.ambientVolume, now);
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.applyVolumes();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Storage unavailable
      }
    }
  }

  public toggleMute(): boolean {
    this.updateSettings({ muted: !this.settings.muted });
    return this.settings.muted;
  }

  // --- AMBIENT SOUNDSCAPE: Procedural Detective Noir City Rain & Low Drone ---
  public startAmbient() {
    if (this.isAmbientPlaying) return;
    this.ensureRunning();
    if (!this.ctx || !this.ambientGain) return;

    try {
      // 1. Generate 3 seconds of pink noise buffer for rain
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Filter noise: Lowpass around 1200Hz to simulate rain outside detective window
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;

      noiseSource.connect(filter);
      filter.connect(this.ambientGain);

      noiseSource.start();
      this.ambientSource = noiseSource;
      this.isAmbientPlaying = true;
    } catch {
      // Audio autoplay restrictions or context error
    }
  }

  public stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch {
        // Source already stopped
      }
      this.ambientSource = null;
    }
    this.isAmbientPlaying = false;
  }

  public toggleAmbient(): boolean {
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  public getIsAmbientPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  // --- SOUND EFFECTS (SFX) ---

  /**
   * Mechanical tactile ticket stamp click
   */
  public playTicketClick() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Deep low-frequency subway rumble for Underground Tube moves
   */
  public playSubwayRumble() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.linearRampToValueAtTime(75, t + 0.3);
    osc.frequency.linearRampToValueAtTime(45, t + 0.8);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.25);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  /**
   * Bus transit engine sound
   */
  public playBusEngine() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 350;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * Vintage Taxi Horn tap
   */
  public playTaxiHorn() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(320, t);
    osc2.frequency.setValueAtTime(385, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.16);
    osc2.stop(t + 0.16);
  }

  /**
   * Dramatic Surfacing Alarm pulse when Mister X must reveal his location
   */
  public playSurfacingAlarm() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const tones = [587.33, 523.25, 440.0, 349.23]; // D5, C5, A4, F4 high tension motif

    tones.forEach((freq, idx) => {
      const startTime = t + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, startTime);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    });
  }

  /**
   * Triumphant fanfare when Detectives capture Mister X
   */
  public playCaptureFanfare() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const chords = [
      { f: [349.23, 440.0, 523.25], dur: 0.2 }, // F Major
      { f: [392.0, 493.88, 587.33], dur: 0.2 }, // G Major
      { f: [523.25, 659.25, 783.99], dur: 0.6 } // C Major Triumph
    ];

    let offset = 0;
    chords.forEach((chord) => {
      chord.f.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t + offset);

        gain.gain.setValueAtTime(0.2, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + chord.dur);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(t + offset);
        osc.stop(t + offset + chord.dur + 0.05);
      });
      offset += chord.dur;
    });
  }

  /**
   * Ominous synth tone when Mister X escapes (exhaustion/wins)
   */
  public playEscapeFanfare() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const notes = [220.0, 207.65, 196.0, 185.0]; // Descending chromatic mystery

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.22;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, startTime);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  /**
   * Informant radar ping / sonar echo
   */
  public playRadarPing() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.45);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.52);
  }

  /**
   * Heavy metallic thud for police roadblock deployment
   */
  public playRoadblockDrop() {
    this.ensureRunning();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export const soundEngine = new SoundEngine();
