
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
    const imageElements: HTMLImageElement[] = [];
    let loadedImages = 0;
    
    // Preload all images to ensure smooth transitions
    images.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        loadedImages++;
        if (loadedImages === images.length) {
          startRendering();
        }
      };
      img.onerror = (e) => {
        console.error(`Error loading image ${index}:`, e);
        loadedImages++;
        if (loadedImages === images.length) {
          startRendering();
        }
      };
      img.src = src;
      imageElements.push(img);
    });
    
    // Track time and beat state
    let startTime: number;
    let currentBeatIndex = -1;
    let currentImageIndex = -1;
    
    // Function to draw an image properly centered and fitted in the canvas
    const drawImageToCanvas = (img: HTMLImageElement) => {
      // Clear canvas first
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
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

    const startRendering = () => {
      onProgress(30);
      console.log('Synchronizing with beat data...');
      
      // Set initial image
      if (imageElements.length > 0) {
        drawImageToCanvas(imageElements[0]);
      }
      
      // Start the audio and the animation
      startTime = performance.now();
      audio.play();
      
      // Animation loop for rendering frames
      const renderFrame = () => {
        const currentTime = (performance.now() - startTime) / 1000;
        
        // Find the correct beat for the current time
        // Updated logic to properly determine what image to show
        let newBeatIndex = -1;
        
        // Find the beat that corresponds to the current time
        for (let i = 0; i < beats.length; i++) {
          if (beats[i].time <= currentTime) {
            newBeatIndex = i;
          } else {
            break;
          }
        }
        
        // If we've reached a new beat, update the image
        if (newBeatIndex !== currentBeatIndex) {
          currentBeatIndex = newBeatIndex;
          
          // Calculate which image to show based on the beat index
          // Change images less frequently by using integer division
          const newImageIndex = currentBeatIndex >= 0 ? Math.floor(currentBeatIndex / 2) % images.length : 0;
          
          if (newImageIndex !== currentImageIndex) {
            currentImageIndex = newImageIndex;
            // Draw the new image if it's loaded
            if (imageElements[currentImageIndex]) {
              drawImageToCanvas(imageElements[currentImageIndex]);
            }
          }
        }
        
        // Update progress
        const progress = Math.min(90, 30 + (currentTime / audio.duration) * 60);
        onProgress(progress);
        
        // Continue animation if not finished
        if (currentTime < audio.duration) {
          requestAnimationFrame(renderFrame);
        } else {
          // Finish recording when audio ends
          setTimeout(() => {
            mediaRecorder.stop();
            audio.pause();
          }, 500); // Add a small delay to capture the last frame
        }
      };
      
      // Start the rendering loop
      renderFrame();
    };
    
    // If we have no images to load, start immediately
    if (images.length === 0) {
      startRendering();
    }
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
  
  // Change images less frequently by using integer division
  return Math.floor(closestBeatIndex / 2) % images.length;
};
