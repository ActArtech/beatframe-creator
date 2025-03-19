
import { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { exportVideo } from '@/lib/videoExport';
import { BeatInfo } from '@/lib/beatDetection';
import { toast } from 'sonner';

interface ExportPanelProps {
  images: string[];
  audioFile: File | null;
  beats: BeatInfo[];
  isProcessing: boolean;
}

const ExportPanel = ({ images, audioFile, beats, isProcessing }: ExportPanelProps) => {
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleExport = async () => {
    if (isProcessing || isExporting) return;
    
    if (images.length === 0) {
      toast.error('Please upload images first.');
      return;
    }
    
    if (!audioFile) {
      toast.error('Please upload audio first.');
      return;
    }
    
    if (beats.length === 0) {
      toast.error('Please process audio to detect beats first.');
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const videoBlob = await exportVideo({
        images,
        audioFile,
        beats,
        width: 1280,
        height: 720,
        fps: 30,
        onProgress: (progress) => {
          setExportProgress(progress);
        }
      });
      
      // Create and trigger download link
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beatframe-video.webm'; // Using .webm format
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setIsComplete(true);
      toast.success('Video exported successfully!');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getButtonText = () => {
    if (isExporting) return 'Exporting...';
    if (isComplete) return 'Exported!';
    return 'Export Video';
  };

  const getButtonIcon = () => {
    if (isExporting) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (isComplete) return <Check className="w-5 h-5" />;
    return <Download className="w-5 h-5" />;
  };

  const canExport = images.length > 0 && audioFile && beats.length > 0 && !isProcessing;

  return (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100 flex flex-col">
      <h3 className="text-lg font-medium mb-4">Export Video</h3>
      
      <div className="space-y-4 flex-1">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Format</span>
            <span className="font-medium">WebM (VP9)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Resolution</span>
            <span className="font-medium">1280x720</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Images</span>
            <span className="font-medium">{images.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Beat Points</span>
            <span className="font-medium">{beats.length}</span>
          </div>
        </div>
        
        {isExporting && (
          <div className="space-y-1 mt-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{Math.round(exportProgress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={handleExport}
        disabled={!canExport || isExporting}
        className={`mt-6 px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition ${
          canExport && !isExporting && !isComplete
            ? 'bg-primary text-white hover:bg-primary-600'
            : isComplete
              ? 'bg-accent text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>
    </div>
  );
};

export default ExportPanel;
