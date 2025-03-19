
import { useEffect, useRef, useState } from 'react';
import { getImageForTime } from '@/lib/videoExport';
import { BeatInfo } from '@/lib/beatDetection';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface VideoPreviewProps {
  images: string[];
  beats: BeatInfo[];
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  onPlayPause: () => void;
  onReset: () => void;
}

const VideoPreview = ({
  images,
  beats,
  currentTime,
  isPlaying,
  duration,
  onPlayPause,
  onReset
}: VideoPreviewProps) => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<'entering' | 'stable' | 'exiting'>('stable');
  const lastImageIndex = useRef<number | null>(null);

  useEffect(() => {
    if (images.length === 0 || beats.length === 0) {
      setCurrentImage(null);
      return;
    }

    const imageIndex = getImageForTime(currentTime, beats, images);
    
    // If image changed, animate transition
    if (lastImageIndex.current !== imageIndex) {
      // Start exit animation for current image
      if (lastImageIndex.current !== null) {
        setTransitionState('exiting');
        
        // After a short delay, start enter animation for new image
        setTimeout(() => {
          setCurrentImage(images[imageIndex]);
          setTransitionState('entering');
          
          // After enter animation completes, set to stable
          setTimeout(() => {
            setTransitionState('stable');
          }, 300);
        }, 200);
      } else {
        // First image, no transition needed
        setCurrentImage(images[imageIndex]);
      }
      
      lastImageIndex.current = imageIndex;
    }
  }, [currentTime, images, beats]);

  // Reset animation when playback stops
  useEffect(() => {
    if (!isPlaying) {
      setTransitionState('stable');
    }
  }, [isPlaying]);

  const getTransitionClass = () => {
    switch (transitionState) {
      case 'entering': return 'image-transition-entering';
      case 'exiting': return 'image-transition-exiting';
      default: return '';
    }
  };

  // Progress percentage
  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden relative shadow-medium">
      {currentImage ? (
        <div className="w-full h-full flex items-center justify-center relative">
          <img
            src={currentImage}
            alt="Preview"
            className={`max-w-full max-h-full object-contain ${getTransitionClass()}`}
          />
          
          {/* Playback controls overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
            <div className="flex gap-2">
              <button
                onClick={onReset}
                className="p-3 rounded-full bg-white/80 text-gray-700 opacity-0 hover:opacity-100 hover:bg-white transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={onPlayPause}
                className="p-3 rounded-full bg-white/80 text-gray-700 opacity-0 hover:opacity-100 hover:bg-white transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50">
          <p className="text-center">
            {images.length === 0 ? 'Upload images to see preview' : 
             beats.length === 0 ? 'Upload and process audio to see preview' : 
             'Loading preview...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
