
/**
 * Utilities for exporting the video
 */

import { BeatInfo } from './beatDetection';

interface ExportOptions {
  images: string[];
  audioFile: File;
  beats: BeatInfo[];
  width: number;
  height: number;
  fps: number;
  onProgress: (progress: number) => void;
}

export const exportVideo = async ({
  images,
  audioFile,
  beats,
  width,
  height,
  fps,
  onProgress
}: ExportOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!images.length || !audioFile || !beats.length) {
      reject(new Error('Missing required data for video export'));
      return;
    }

    // Create an offscreen canvas for rendering frames
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Create a stream from the canvas
    const stream = canvas.captureStream(fps);
    
    // Create an audio element for the audio track
    const audio = new Audio();
    const audioUrl = URL.createObjectURL(audioFile);
    audio.src = audioUrl;
    
    // Connect audio to the stream
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audio);
    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    source.connect(audioCtx.destination);  // Also connect to speakers
    
    // Add audio tracks to the stream
    destination.stream.getAudioTracks().forEach(track => {
      stream.addTrack(track);
    });
    
    // Set up MediaRecorder with the combined stream
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 5000000
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      // Clean up resources
      URL.revokeObjectURL(audioUrl);
      
      // Create the final video blob from all chunks
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      
      // Report progress
      onProgress(100);
      console.log('Finalizing video...');
      
      resolve(videoBlob);
    };
    
    // Start recording
    mediaRecorder.start(1000); // Collect data in 1-second chunks
    
    // Prepare for rendering frames
    let currentImageIndex = 0;
    let lastBeatTime = 0;
    let startTime = performance.now();
    
    // Report initial progress
    onProgress(10);
    console.log('Preparing audio track...');
    
    // Play the audio
    audio.play();
    
    // Report next progress step
    onProgress(20);
    console.log('Processing image sequence...');
    
    // Animation function to render frames based on beat timing
    const renderFrame = () => {
      const currentTime = (performance.now() - startTime) / 1000;
      
      // Find the current beat
      let currentBeatIndex = 0;
      for (let i = 0; i < beats.length; i++) {
        if (beats[i].time <= currentTime) {
          currentBeatIndex = i;
        } else {
          break;
        }
      }
      
      // If we've hit a new beat, change the image
      if (currentBeatIndex > 0 && beats[currentBeatIndex].time !== lastBeatTime) {
        currentImageIndex = currentBeatIndex % images.length;
        lastBeatTime = beats[currentBeatIndex].time;
      }
      
      // Clear canvas and draw the current image
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Load and draw the current image
      const img = new Image();
      img.onload = () => {
        // Calculate proportional sizing to fit within canvas
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        
        let drawWidth, drawHeight, x, y;
        
        if (imgRatio > canvasRatio) {
          // Image is wider relative to canvas
          drawWidth = width;
          drawHeight = width / imgRatio;
          x = 0;
          y = (height - drawHeight) / 2;
        } else {
          // Image is taller relative to canvas
          drawHeight = height;
          drawWidth = height * imgRatio;
          x = (width - drawWidth) / 2;
          y = 0;
        }
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
      };
      img.src = images[currentImageIndex];
      
      // Update progress based on audio time
      const progress = Math.min(90, 20 + (currentTime / audio.duration) * 70);
      onProgress(progress);
      
      // Continue animating if we're still recording
      if (currentTime < audio.duration) {
        requestAnimationFrame(renderFrame);
      } else {
        // Stop recording when audio finishes
        mediaRecorder.stop();
        audio.pause();
      }
    };
    
    // Start the frame rendering
    onProgress(30);
    console.log('Synchronizing with beat data...');
    
    // Wait a moment for everything to initialize
    setTimeout(() => {
      startTime = performance.now();
      renderFrame();
    }, 500);
  });
};

// Helper function to determine which image to show at a given time
export const getImageForTime = (time: number, beats: BeatInfo[], images: string[]): number => {
  if (!beats.length || !images.length) return 0;
  
  // Find the closest beat to the current time
  let closestBeatIndex = 0;
  
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].time <= time) {
      closestBeatIndex = i;
    } else {
      break;
    }
  }
  
  // Map beat index to image index, cycling through available images
  return closestBeatIndex % images.length;
};
