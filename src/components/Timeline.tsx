
import { useState, useEffect, useRef } from 'react';
import { BeatInfo } from '@/lib/beatDetection';

interface TimelineProps {
  duration: number;
  beats: BeatInfo[];
  currentTime: number;
  images: string[];
  onScrub: (time: number) => void;
}

const Timeline = ({
  duration,
  beats,
  currentTime,
  images,
  onScrub
}: TimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Function to get image for a specific beat
  const getImageForBeat = (beatIndex: number) => {
    return images.length > 0 ? images[beatIndex % images.length] : null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = rect.width;
    
    // Calculate time based on position
    const time = Math.max(0, Math.min(duration, (offsetX / width) * duration));
    onScrub(time);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate time based on position
      const time = Math.max(0, Math.min(duration, (offsetX / width) * duration));
      onScrub(time);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [duration, isDragging, onScrub]);

  // Format time as MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div 
        ref={timelineRef}
        className="w-full h-24 bg-gray-100 rounded-lg relative cursor-pointer overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Timeline track */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-gray-300">
            <div 
              className="h-full bg-primary"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Beat markers */}
        {beats.map((beat, index) => (
          <div 
            key={index}
            className={`absolute bottom-0 transition-all ${
              beat.time <= currentTime ? 'opacity-100' : 'opacity-50'
            }`}
            style={{ 
              left: `${(beat.time / duration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div 
              className={`h-3 w-2 mb-1 rounded-sm ${
                beat.time <= currentTime ? 'bg-accent' : 'bg-gray-400'
              }`}
              style={{ 
                height: `${beat.intensity * 12 + 4}px` 
              }}
            />
            
            {getImageForBeat(index) && (
              <div 
                className="w-8 h-12 rounded-sm overflow-hidden border border-gray-300 bg-white"
                style={{ 
                  transform: `scale(${beat.time <= currentTime && beat.time > currentTime - 0.2 ? 1.1 : 1})`,
                  opacity: beat.time <= currentTime ? 1 : 0.7,
                  transition: 'transform 0.1s, opacity 0.1s'
                }}
              >
                <img 
                  src={getImageForBeat(index) || ''} 
                  alt={`Beat ${index}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        ))}

        {/* Current time indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-primary-600"
          style={{ 
            left: `${(currentTime / duration) * 100}%`,
            transform: 'translateX(-50%)'
          }}
        />
      </div>
    </div>
  );
};

export default Timeline;
