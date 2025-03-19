/**
 * Utility for analyzing audio and detecting beats
 */

export interface BeatInfo {
  time: number;
  intensity: number;
}

export class BeatDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private isAnalyzing: boolean = false;
  private beats: BeatInfo[] = [];

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public async loadAudio(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Reset beats
      this.beats = [];
      
      // We don't return the result of detectBeats here
      // just prepare the audio buffer
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }

  public async detectBeats(): Promise<BeatInfo[]> {
    if (!this.audioBuffer) {
      throw new Error('No audio buffer loaded');
    }

    // Create offline context for faster-than-realtime processing
    const offlineContext = new OfflineAudioContext(
      this.audioBuffer.numberOfChannels,
      this.audioBuffer.length,
      this.audioBuffer.sampleRate
    );

    // Create source and analyzer
    const source = offlineContext.createBufferSource();
    source.buffer = this.audioBuffer;

    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 1024;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connect nodes
    source.connect(analyser);
    analyser.connect(offlineContext.destination);

    // Start source
    source.start(0);

    // Basic beat detection algorithm
    // For a production app, we would implement a more sophisticated algorithm
    const detectBeats = (audioProcessingEvent: OfflineAudioCompletionEvent) => {
      const renderedBuffer = audioProcessingEvent.renderedBuffer;
      const channelData = renderedBuffer.getChannelData(0);
      
      const sampleRate = renderedBuffer.sampleRate;
      const duration = renderedBuffer.duration;
      
      // Parameters for beat detection
      const sampleInterval = 0.05; // Check every 50ms
      const beatThreshold = 0.15; // Threshold for beat detection
      const sampleWindow = Math.floor(sampleRate * sampleInterval);
      
      const beats: BeatInfo[] = [];
      let prevAvg = 0;
      
      // Analyze segments of audio to find beats
      for (let i = 0; i < channelData.length; i += sampleWindow) {
        let sum = 0;
        const end = Math.min(i + sampleWindow, channelData.length);
        
        // Calculate average amplitude for this segment
        for (let j = i; j < end; j++) {
          sum += Math.abs(channelData[j]);
        }
        
        const avg = sum / (end - i);
        const time = i / sampleRate;
        
        // If this segment is significantly louder than the previous, consider it a beat
        if (avg > prevAvg * 1.5 && avg > beatThreshold) {
          beats.push({ time, intensity: Math.min(avg * 5, 1) });
        }
        
        prevAvg = avg;
      }
      
      // Ensure we have reasonable number of beats - if too few, lower threshold and try again
      if (beats.length < 5 && beatThreshold > 0.05) {
        return this.detectBeats();
      }
      
      // If too many beats (more than 1 per second on average), filter some out
      if (beats.length > duration) {
        // Sort by intensity and keep only the strongest beats
        beats.sort((a, b) => b.intensity - a.intensity);
        beats.splice(Math.floor(duration), beats.length - Math.floor(duration));
        
        // Sort back by time
        beats.sort((a, b) => a.time - b.time);
      }
      
      this.beats = beats;
      return beats;
    };

    // Process audio offline (faster than real-time)
    try {
      const renderedBuffer = await offlineContext.startRendering();
      return detectBeats(new OfflineAudioCompletionEvent('complete', { renderedBuffer }));
    } catch (error) {
      console.error('Error during beat detection:', error);
      throw error;
    }
  }

  public getBeats(): BeatInfo[] {
    return this.beats;
  }

  public playAudio(onTimeUpdate?: (currentTime: number) => void): void {
    if (!this.audioBuffer || !this.audioContext) return;
    
    // Stop any playing audio
    this.stopAudio();
    
    // Create new source
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.audioContext.destination);
    
    // Create analyzer for visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    // Start playback
    this.source.start(0);
    this.isAnalyzing = true;
    
    // Set up time update callback
    if (onTimeUpdate) {
      const startTime = this.audioContext.currentTime;
      const updateInterval = setInterval(() => {
        if (!this.isAnalyzing) {
          clearInterval(updateInterval);
          return;
        }
        const currentTime = this.audioContext.currentTime - startTime;
        onTimeUpdate(currentTime);
        
        if (currentTime >= (this.audioBuffer?.duration || 0)) {
          clearInterval(updateInterval);
          this.isAnalyzing = false;
        }
      }, 50);
    }
  }

  public stopAudio(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.source = null;
    }
    this.isAnalyzing = false;
  }

  public getAudioDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  public getVisualizationData(): Uint8Array | null {
    if (this.analyser && this.dataArray && this.isAnalyzing) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  }
}

export default new BeatDetector();
