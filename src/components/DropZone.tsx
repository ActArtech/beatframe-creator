
import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  multiple?: boolean;
}

const DropZone = ({
  onFilesDrop,
  accept = '*',
  maxFiles = 300,
  label,
  icon,
  className,
  multiple = true
}: DropZoneProps) => {
  const [isActive, setIsActive] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    if (multiple && files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    if (!multiple && files.length > 1) {
      onFilesDrop([files[0]]);
      return;
    }

    onFilesDrop(files);
  }, [maxFiles, multiple, onFilesDrop]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const files = Array.from(fileList);
    
    if (multiple && files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    onFilesDrop(files);
  }, [maxFiles, multiple, onFilesDrop]);

  return (
    <div
      className={cn(
        'dropzone',
        isActive ? 'dropzone-active' : 'border-gray-300 hover:border-primary',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="sr-only"
          multiple={multiple}
        />
        <div className="mb-2 rounded-full p-2 bg-primary-50 text-primary">
          {icon || <Upload className="w-6 h-6" />}
        </div>
        <div className="font-medium text-sm">{label}</div>
        <p className="text-xs text-gray-500 mt-1">
          {multiple 
            ? `Drag & drop or click to select files (max ${maxFiles})`
            : "Drag & drop or click to select a file"}
        </p>
      </label>
    </div>
  );
};

export default DropZone;
