// Custom Web Audio API synthesizer for Cyberpunk Red Combat & Netrunning Tracker
// Procedural music generation that runs purely in-browser (Offline ready, no CORS/missing MP3 issues)

export class CyberpunkAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicInterval: any = null;

  // Analyser node for the visual spectrum bars
  public analyser: AnalyserNode | null = null;

  // Options
  private muteMusic: boolean = false;
  private muteSfx: boolean = false;
  private musicVolume: number = 0.4;
  private sfxVolume: number = 0.6;
  
  // State
  private currentMode: 'exploration' | 'combat' = 'exploration';
  private step: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    // Context is lazily initialized on user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // Analyser for UI visualizers
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // Master audio path
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.muteMusic ? 0 : this.musicVolume, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.muteSfx ? 0 : this.sfxVolume, this.ctx.currentTime);

      // Connect nodes
      this.musicGain.connect(this.analyser);
      this.sfxGain.connect(this.analyser);
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Start the sequencer loop
      this.startSequencer();
      this.isPlaying = true;
    } catch (e) {
      console.warn("Failed to initialize Web Audio API", e);
    }
  }

  public setMode(mode: 'exploration' | 'combat') {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.step = 0;
    
    // Play transition alert on combat mode start
    if (mode === 'combat') {
      this.playAlert();
    } else {
      this.playNetSuccess();
    }
  }

  public getMode() {
    return this.currentMode;
  }

  public getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(32);
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = vol;
    if (this.musicGain && this.ctx && !this.muteMusic) {
      this.musicGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = vol;
    if (this.sfxGain && this.ctx && !this.muteSfx) {
      this.sfxGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  public toggleMuteMusic() {
    this.muteMusic = !this.muteMusic;
    if (this.musicGain && this.ctx) {
      const targetVol = this.muteMusic ? 0 : this.musicVolume;
      this.musicGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    }
    return this.muteMusic;
  }

  public toggleMuteSfx() {
    this.muteSfx = !this.muteSfx;
    if (this.sfxGain && this.ctx) {
      const targetVol = this.muteSfx ? 0 : this.sfxVolume;
      this.sfxGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    }
    return this.muteSfx;
  }

  private startSequencer() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    
    // Low tempo beats for cyber-environment (110 BPM)
    // 1 step = 150ms approximately
    this.musicInterval = setInterval(() => {
      this.tickSequencer();
    }, 140);
  }

  private tickSequencer() {
    if (!this.ctx || this.ctx.state === 'suspended' || this.muteMusic) return;

    const time = this.ctx.currentTime;
    
    if (this.currentMode === 'exploration') {
      // Atmospheric dark synth drone & subtle clicks
      // Base synth chord progression (repeats every 32 steps)
      const chordRoot = [110, 110, 110, 110, 130, 130, 146, 146, 98, 98, 98, 98, 110, 110, 120, 120][Math.floor(this.step / 4) % 16];
      
      // Step triggers
      const beat = this.step % 8;
      
      // Low sub bass pulse on beat 0
      if (beat === 0) {
        this.playSubBass(chordRoot, 1.2);
      }
      
      // Dynamic dark arpeggiator chord note
      if (beat === 2 || beat === 5 || beat === 7) {
        const arpeggio = [1, 1.5, 1.25, 1.875][(this.step) % 4];
        this.playArp(chordRoot * arpeggio, 0.4, 0.2);
      }

      // Ambient tick on beat 4
      if (beat === 4) {
        this.playTickClick(1500, 0.08);
      }

    } else {
      // Intense, fast combat techno beat / synthwave
      const beat = this.step % 8;
      const root = [110, 110, 110, 110, 165, 165, 146, 146, 110, 110, 110, 110, 165, 165, 196, 220][Math.floor(this.step / 8) % 16];

      // Fast industrial kick on 0, 2, 4, 6
      if (beat === 0 || beat === 2 || beat === 4 || beat === 6) {
        this.playCombatKick();
      }

      // Crunchy snare on 4
      if (beat === 4) {
        this.playSnareClap();
      }

      // Rapid high-hat on every odd beat
      if (beat % 2 === 1) {
        this.playTickClick(3000, 0.15);
      }

      // Fast sequence arpeggiator
      const scale = [1, 1.2, 1.33, 1.5, 1.8, 2.0];
      const noteMultiplier = scale[(this.step * 3) % scale.length];
      this.playArp(root * noteMultiplier, 0.3, 0.1);
    }

    this.step = (this.step + 1) % 64;
  }

  // --- PROCEDURAL MUSIC SYNTH PIECES ---

  private playSubBass(frequency: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency / 2, t); // Drop octave
    
    // Sweep lowpass filter
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(6, t);
    filter.frequency.setValueAtTime(100, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  private playArp(frequency: number, duration: number, volumeMax: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = this.currentMode === 'combat' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(frequency, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.currentMode === 'combat' ? 1200 : 700, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + duration);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volumeMax, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  private playTickClick(freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + duration);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  private playCombatKick() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  private playSnareClap() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    // Procedural noise snare
    const bufferSize = this.ctx.sampleRate * 0.15; // 150ms buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.Q.setValueAtTime(2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noiseNode.start(t);
    noiseNode.stop(t + 0.16);
  }

  // --- ACTION SOUND EFFECTS (SFX) ---

  // Triggered when entering combat mode
  public playAlert() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    // Siren sweeps (Cyberpunk RED threat alarm)
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, t + delay);
      osc.frequency.linearRampToValueAtTime(650, t + delay + 0.1);
      osc.frequency.linearRampToValueAtTime(250, t + delay + 0.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t + delay);

      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.35, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + delay);
      osc.stop(t + delay + 0.25);
    }
  }

  // Pistol / SMG Shoot sound effect
  public playPistol() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    // Sharp noise burst + high metallic click
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, t);
    noiseFilter.Q.setValueAtTime(3, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    // Crack kick frequency
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'square';
    kick.frequency.setValueAtTime(400, t);
    kick.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    kickGain.gain.setValueAtTime(0.4, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    kick.connect(kickGain);
    kickGain.connect(this.sfxGain);

    noise.start(t);
    kick.start(t);
    noise.stop(t + 0.08);
    kick.stop(t + 0.08);
  }

  // Heavy Shotgun / Rifle Shoot sound effect
  public playShotgun() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    // Booming noise explosion with distortion resonance
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.28);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.29);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    // Heavy low base impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(180, t);
    subOsc.frequency.linearRampToValueAtTime(30, t + 0.15);

    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    noise.start(t);
    subOsc.start(t);
    noise.stop(t + 0.3);
    subOsc.stop(t + 0.3);
  }

  // Melee attack sound effect
  public playMelee() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    // Metallic slash chord and impact thud
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const flt = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, t);
    osc1.frequency.linearRampToValueAtTime(1500, t + 0.05);
    osc1.frequency.linearRampToValueAtTime(110, t + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, t);
    osc2.frequency.linearRampToValueAtTime(800, t + 0.05);
    osc2.frequency.linearRampToValueAtTime(60, t + 0.12);

    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(900, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.15);
    osc2.stop(t + 0.15);
  }

  // Netrunning interaction / Scan / Click chirp
  public playNetChirp() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Sequential fast pitch step
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.setValueAtTime(1300, t + 0.03);
    osc.frequency.setValueAtTime(1800, t + 0.06);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Netrunning success chord
  public playNetSuccess() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major Sci-fi chord
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // Failure / Access Denied sweep
  public playNetFailure() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.35);

    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

    osc.connect(f);
    f.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // System notification chime
  public playUIBeep() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Digital Glitch sound effect for Jacking In and system glitches
  public playGlitch() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muteSfx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(400 - (i * 80) + Math.random() * 200, t + delay);
      gain.gain.setValueAtTime(0.25, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.045);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.05);
    }
  }
}

// Global Singleton
export const audio = new CyberpunkAudioEngine();
