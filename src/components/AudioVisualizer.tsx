
import { useEffect, useRef } from 'react';
import beatDetector from '@/lib/beatDetection';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

const AudioVisualizer = ({ isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dataArray = beatDetector.getVisualizationData();
      if (!dataArray || !isPlaying) return;

      // Get canvas dimensions
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear previous frame
      ctx.clearRect(0, 0, width, height);
      
      // Set visualizer properties
      const barWidth = width / dataArray.length;
      let x = 0;
      
      // Draw visualizer bars
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');  // accent
        gradient.addColorStop(1, 'rgba(139, 92, 246, 1)');  // accent
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        
        x += barWidth;
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);
  
  return (
    <div className="w-full h-16 bg-black/5 rounded-lg overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        width={800}
        height={100}
      />
    </div>
  );
};

export default AudioVisualizer;
