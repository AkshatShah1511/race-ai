// Car engine sound effects using Web Audio API

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;

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

      // Brief harsh sound for crash
      crashOscillator.type = 'square';
      crashOscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      crashGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);

      // Quick fade out
      crashGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

      crashOscillator.start();
      crashOscillator.stop(this.audioContext.currentTime + 0.2);
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

      // Play a pleasant ascending tone for finish
      const finishOscillator = this.audioContext.createOscillator();
      const finishGain = this.audioContext.createGain();

      finishOscillator.connect(finishGain);
      finishGain.connect(this.audioContext.destination);

      finishOscillator.type = 'sine';
      finishOscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A note
      finishOscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.5); // Octave up

      finishGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      finishGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      finishOscillator.start();
      finishOscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play finish sound:', error);
    }
  }

  // Cleanup method
  cleanup() {
    this.stopEngine();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create a singleton instance
const audioEngine = new AudioEngine();

export default audioEngine;
