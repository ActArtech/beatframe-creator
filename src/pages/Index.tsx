import { useState, useEffect } from 'react';
import { Music, Image as ImageIcon, Play, Pause, Info } from 'lucide-react';
import { toast } from 'sonner';

import DropZone from '@/components/DropZone';
import AudioVisualizer from '@/components/AudioVisualizer';
import Timeline from '@/components/Timeline';
import ImageGrid from '@/components/ImageGrid';
import VideoPreview from '@/components/VideoPreview';
import ExportPanel from '@/components/ExportPanel';
import beatDetector, { BeatInfo } from '@/lib/beatDetection';

const Index = () => {
  // State
  const [images, setImages] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [beats, setBeats] = useState<BeatInfo[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle image uploads
  const handleImagesUpload = async (files: File[]) => {
    // Check if there are already a lot of images
    if (images.length + files.length > 300) {
      toast.error('Maximum 300 images allowed');
      return;
    }
    
    const newImages: string[] = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        continue;
      }
      
      const reader = new FileReader();
      
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        newImages.push(dataUrl);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(`Error reading ${file.name}`);
      }
    }
    
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      toast.success(`Added ${newImages.length} images`);
    }
  };

  // Handle audio upload
  const handleAudioUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    if (!file.type.startsWith('audio/')) {
      toast.error(`File ${file.name} is not an audio file`);
      return;
    }
    
    setAudioFile(file);
    toast.success(`Added audio: ${file.name}`);
    
    // Reset related state
    setBeats([]);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    
    // Process audio to detect beats
    try {
      setIsProcessing(true);
      await beatDetector.loadAudio(file);
      const detectedBeats = await beatDetector.detectBeats();
      setBeats(detectedBeats);
      setAudioDuration(beatDetector.getAudioDuration());
      toast.success(`Detected ${detectedBeats.length} beats in audio`);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Error processing audio file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      beatDetector.stopAudio();
      setIsPlaying(false);
    } else {
      if (audioFile && beats.length > 0) {
        beatDetector.playAudio((time) => {
          setCurrentTime(time);
        });
        setIsPlaying(true);
      } else {
        toast.error('Please upload and process audio first');
      }
    }
  };

  // Handle timeline scrubbing
  const handleScrub = (time: number) => {
    setCurrentTime(time);
    
    // If playing, stop and restart at new time
    if (isPlaying) {
      beatDetector.stopAudio();
      setIsPlaying(false);
      
      // Small delay to avoid playback issues
      setTimeout(() => {
        beatDetector.playAudio((t) => {
          setCurrentTime(t + time);
        });
        setIsPlaying(true);
      }, 50);
    }
  };

  // Handle reset
  const handleReset = () => {
    beatDetector.stopAudio();
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Handle image reordering
  const handleReorderImages = (newImages: string[]) => {
    setImages(newImages);
  };

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      beatDetector.stopAudio();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <Music className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-heading font-semibold">BeatFrame Creator</h1>
            </div>
            
            <button 
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all"
              onClick={() => toast.info(
                'BeatFrame Creator synchronizes your images with music beats for dynamic video content.',
                { duration: 5000 }
              )}
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Image uploads */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100">
              <h2 className="text-lg font-medium mb-4">Images</h2>
              
              {images.length === 0 ? (
                <DropZone
                  onFilesDrop={handleImagesUpload}
                  accept="image/*"
                  label="Upload Images"
                  icon={<ImageIcon className="w-6 h-6" />}
                  className="h-60"
                  multiple={true}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {images.length} {images.length === 1 ? 'image' : 'images'} uploaded
                    </span>
                    <button
                      onClick={() => {
                        // Show small dropzone
                        document.getElementById('add-more-images-btn')?.click();
                      }}
                      className="text-sm text-primary hover:text-primary-700 font-medium"
                    >
                      Add More
                    </button>
                  </div>
                  
                  <div className="hidden">
                    <DropZone
                      id="add-more-images-btn"
                      onFilesDrop={handleImagesUpload}
                      accept="image/*"
                      label="Add More Images"
                      multiple={true}
                    />
                  </div>
                  
                  <div className="border border-gray-100 rounded-lg overflow-auto max-h-60">
                    <ImageGrid 
                      images={images}
                      onRemoveImage={handleRemoveImage}
                      onReorderImages={handleReorderImages}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Audio upload */}
            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100">
              <h2 className="text-lg font-medium mb-4">Audio</h2>
              
              {!audioFile ? (
                <DropZone
                  onFilesDrop={handleAudioUpload}
                  accept="audio/*"
                  label="Upload Audio"
                  icon={<Music className="w-6 h-6" />}
                  className="h-40"
                  multiple={false}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{audioFile.name}</span>
                    <button
                      onClick={() => {
                        // Trigger the hidden file input
                        const replaceAudioBtn = document.getElementById('replace-audio-btn');
                        if (replaceAudioBtn) {
                          const input = replaceAudioBtn.querySelector('input');
                          if (input) input.click();
                        }
                      }}
                      className="text-sm text-primary hover:text-primary-700 font-medium"
                    >
                      Replace
                    </button>
                  </div>
                  
                  <div className="hidden">
                    <DropZone
                      id="replace-audio-btn"
                      onFilesDrop={handleAudioUpload}
                      accept="audio/*"
                      label="Replace Audio"
                      multiple={false}
                    />
                  </div>
                  
                  {isProcessing ? (
                    <div className="flex items-center justify-center h-16 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Processing audio...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <AudioVisualizer isPlaying={isPlaying} />
                      
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handlePlayPause}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-600 transition-colors"
                          disabled={!audioFile || beats.length === 0}
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        
                        <div className="flex-1">
                          <Timeline
                            duration={audioDuration}
                            beats={beats}
                            currentTime={currentTime}
                            images={images}
                            onScrub={handleScrub}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Preview */}
            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100">
              <h2 className="text-lg font-medium mb-4">Preview</h2>
              <VideoPreview
                images={images}
                beats={beats}
                currentTime={currentTime}
                isPlaying={isPlaying}
                duration={audioDuration}
                onPlayPause={handlePlayPause}
                onReset={handleReset}
              />
            </div>
          </div>
          
          {/* Right column - Export */}
          <div>
            <ExportPanel
              images={images}
              audioFile={audioFile}
              beats={beats}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="text-center text-sm text-gray-500">
            BeatFrame Creator — Synchronize images with music beats
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
