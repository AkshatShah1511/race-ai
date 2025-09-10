// CYBERPUNK AUDIO ENGINE - Maximum synthwave experience!

interface SynthwaveTrack {
  tempo: number;
  baseFreq: number;
  harmonics: number[];
}

const SYNTHWAVE_TRACKS: SynthwaveTrack[] = [
  { tempo: 120, baseFreq: 80, harmonics: [1, 0.5, 0.25, 0.125] },
  { tempo: 140, baseFreq: 100, harmonics: [1, 0.7, 0.3, 0.15] },
  { tempo: 160, baseFreq: 120, harmonics: [1, 0.6, 0.4, 0.2] }
];

const ANNOUNCER_LINES = [
  "Glitch detected in the matrix!",
  "AI is absolutely vibin'!",
  "404 Finish Line Not Found!",
  "Neural networks are firing!",
  "Cyberpunk mode: ACTIVATED!",
  "The future is neon!",
  "Bzzt... calculating optimal path!",
  "Warning: Maximum synthwave detected!",
  "AI brain is overclocking!",
  "Neon dreams becoming reality!",
  "System error: Too much style!",
  "Initiating vibe sequence!"
];

const CRASH_SOUNDS = [
  "Ooof! That's gonna leave a mark!",
  "Critical system failure!",
  "Error 500: Crashed!",
  "Bzzt... rebooting...",
  "Neural network needs debugging!"
];

const SUCCESS_SOUNDS = [
  "Absolutely legendary!",
  "Peak performance achieved!",
  "The AI has transcended!",
  "Neon perfection!",
  "System optimization: Complete!"
];

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private synthwaveOscillators: OscillatorNode[] = [];
  private synthwaveGain: GainNode | null = null;
  private currentTrack: number = 0;
  private musicPlaying: boolean = false;
  private lastAnnouncementTime: number = 0;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private initializeEngine() {
    if (!this.audioContext) return;

    // Create engine noise using multiple oscillators for realistic effect
    this.engineOscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    // Connect the audio nodes
    this.engineOscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Set initial parameters for engine sound
    this.engineOscillator.type = 'sawtooth'; // Gives a rough engine-like sound
    this.engineOscillator.frequency.setValueAtTime(80, this.audioContext.currentTime); // Base engine frequency
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime); // Start silent
  }

  startEngine() {
    if (!this.audioContext || this.isPlaying) return;

    try {
      // Resume audio context if suspended (browser requirement)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.initializeEngine();
      if (!this.engineOscillator || !this.gainNode) return;

      this.engineOscillator.start();
      this.isPlaying = true;

      // Fade in engine sound
      this.gainNode.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not start engine sound:', error);
    }
  }

  // Generate synthwave background music using layered oscillators
  private initializeMusic() {
    if (!this.audioContext) return;

    // Create a master gain node for music control
    this.synthwaveGain = this.audioContext.createGain();
    this.synthwaveGain.gain.setValueAtTime(0.06, this.audioContext.currentTime);
    this.synthwaveGain.connect(this.audioContext.destination);

    // Layer multiple oscillators for a rich synthwave texture
    const track = SYNTHWAVE_TRACKS[this.currentTrack % SYNTHWAVE_TRACKS.length];
    const waveTypes: OscillatorType[] = ['sawtooth', 'square', 'triangle'];

    this.synthwaveOscillators = track.harmonics.map((harmonic, idx) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.type = waveTypes[idx % waveTypes.length];
      osc.frequency.setValueAtTime(track.baseFreq * harmonic, this.audioContext!.currentTime);
      gain.gain.setValueAtTime(0.1 / (idx + 1), this.audioContext!.currentTime);
      osc.connect(gain);
      gain.connect(this.synthwaveGain!);
      return osc;
    });
  }

  startMusic() {
    if (!this.audioContext || this.musicPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.initializeMusic();
    this.synthwaveOscillators.forEach(osc => osc.start());
    this.musicPlaying = true;
  }

  stopMusic() {
    if (!this.audioContext || !this.musicPlaying) return;
    try {
      this.synthwaveOscillators.forEach(osc => osc.stop());
      this.synthwaveOscillators = [];
      this.musicPlaying = false;
    } catch (e) {
      // ignore
    }
  }

  updateEngine(speed: number, isAccelerating: boolean = false) {
    if (!this.audioContext || !this.engineOscillator || !this.gainNode || !this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;
    
    // Map speed (0-3) to frequency (80-200 Hz) for engine pitch
    const baseFreq = 80;
    const maxFreq = 200;
    const frequency = baseFreq + (Math.abs(speed) / 3) * (maxFreq - baseFreq);
    
    // Add acceleration boost
    const accelBoost = isAccelerating ? 20 : 0;
    
    // Smooth frequency transition
    this.engineOscillator.frequency.exponentialRampToValueAtTime(
      Math.max(frequency + accelBoost, 20), // Ensure frequency doesn't go too low
      currentTime + 0.05
    );

    // Adjust volume based on speed (idle vs driving)
    const baseVolume = 0.05; // Idle volume
    const maxVolume = 0.15;  // Max driving volume
    const volume = baseVolume + (Math.abs(speed) / 3) * (maxVolume - baseVolume);
    
    this.gainNode.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.01), // Ensure volume doesn't go to 0 (would cause error)
      currentTime + 0.05
    );
  }

  stopEngine() {
    if (!this.audioContext || !this.gainNode || !this.engineOscillator || !this.isPlaying) return;

    try {
      const currentTime = this.audioContext.currentTime;
      
      // Fade out engine sound
      this.gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
      
      // Stop oscillator after fade out
      setTimeout(() => {
        if (this.engineOscillator) {
          this.engineOscillator.stop();
          this.engineOscillator = null;
        }
        this.gainNode = null;
        this.isPlaying = false;
      }, 350);
    } catch (error) {
      console.warn('Could not stop engine sound:', error);
    }
  }

  // Announcer voice lines (text-to-speech simulation with beeps)
  private playAnnouncement(message: string) {
    if (!this.audioContext) return;
    
    // Throttle announcements to avoid spam
    const now = Date.now();
    if (now - this.lastAnnouncementTime < 3000) return;
    this.lastAnnouncementTime = now;
    
    console.log(`🎤 ANNOUNCER: ${message}`);
    
    // Play announcement sound effect (beeping pattern)
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!this.audioContext) return;
        const beep = this.audioContext.createOscillator();
        const beepGain = this.audioContext.createGain();
        beep.connect(beepGain);
        beepGain.connect(this.audioContext.destination);
        
        beep.type = 'sine';
        beep.frequency.setValueAtTime(800 + i * 200, this.audioContext.currentTime);
        beepGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        beepGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        beep.start();
        beep.stop(this.audioContext.currentTime + 0.1);
      }, i * 150);
    }
  }
  
  playRandomAnnouncement() {
    const message = ANNOUNCER_LINES[Math.floor(Math.random() * ANNOUNCER_LINES.length)];
    this.playAnnouncement(message);
  }
  
  // Enhanced neon zap sound for various actions
  playNeonZap() {
    if (!this.audioContext) return;
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const zapOsc = this.audioContext.createOscillator();
      const zapGain = this.audioContext.createGain();
      
      zapOsc.connect(zapGain);
      zapGain.connect(this.audioContext.destination);
      
      zapOsc.type = 'sawtooth';
      zapOsc.frequency.setValueAtTime(2000, this.audioContext.currentTime);
      zapOsc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
      
      zapGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      zapGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
      
      zapOsc.start();
      zapOsc.stop(this.audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play neon zap sound:', error);
    }
  }
  
  // Synthwave whoosh sound
  playWhoosh() {
    if (!this.audioContext) return;
    
    try {
      const whooshOsc = this.audioContext.createOscillator();
      const whooshGain = this.audioContext.createGain();
      
      whooshOsc.connect(whooshGain);
      whooshGain.connect(this.audioContext.destination);
      
      whooshOsc.type = 'sine';
      whooshOsc.frequency.setValueAtTime(100, this.audioContext.currentTime);
      whooshOsc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.5);
      
      whooshGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      whooshGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      whooshOsc.start();
      whooshOsc.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play whoosh sound:', error);
    }
  }

  // Create crash sound effect
  playBriefCrash() {
    if (!this.audioContext) return;

    try {
      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const crashOscillator = this.audioContext.createOscillator();
      const crashGain = this.audioContext.createGain();

      crashOscillator.connect(crashGain);
      crashGain.connect(this.audioContext.destination);

      // Enhanced glitchy crash sound
      crashOscillator.type = 'square';
      crashOscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      crashOscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
      crashGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);

      // Glitchy fade out with distortion
      crashGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      crashOscillator.start();
      crashOscillator.stop(this.audioContext.currentTime + 0.3);
      
      // Play crash announcement
      setTimeout(() => {
        const crashMessage = CRASH_SOUNDS[Math.floor(Math.random() * CRASH_SOUNDS.length)];
        this.playAnnouncement(crashMessage);
      }, 100);
    } catch (error) {
      console.warn('Could not play crash sound:', error);
    }
  }

  // Create finish sound effect
  playFinish() {
    if (!this.audioContext) return;

    try {
      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Epic synthwave victory fanfare with multiple layers
      const fanfareFreqs = [440, 554.37, 659.25, 880]; // A major chord progression
      
      fanfareFreqs.forEach((freq, idx) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime + idx * 0.1);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioContext!.currentTime + 0.8 + idx * 0.1);
        
        gain.gain.setValueAtTime(0, this.audioContext!.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.2, this.audioContext!.currentTime + 0.1 + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.8 + idx * 0.1);
        
        osc.start(this.audioContext!.currentTime + idx * 0.1);
        osc.stop(this.audioContext!.currentTime + 0.8 + idx * 0.1);
      });
      
      // Play success announcement
      setTimeout(() => {
        const successMessage = SUCCESS_SOUNDS[Math.floor(Math.random() * SUCCESS_SOUNDS.length)];
        this.playAnnouncement(successMessage);
      }, 200);
    } catch (error) {
      console.warn('Could not play finish sound:', error);
    }
  }

  // Cleanup method
  cleanup() {
    this.stopEngine();
    this.stopMusic();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create a singleton instance
const audioEngine = new AudioEngine();

export default audioEngine;
