
import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface ImageGridProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  onReorderImages: (images: string[]) => void;
}

const ImageGrid = ({ images, onRemoveImage, onReorderImages }: ImageGridProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    // Make a copy of the images array
    const newImages = [...images];
    
    // Remove the dragged image
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    
    // Insert the dragged image at the drop position
    newImages.splice(dropIndex, 0, draggedImage);
    
    // Update the images array
    onReorderImages(newImages);
    setDraggedIndex(null);
  }, [draggedIndex, images, onReorderImages]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-2">
      {images.map((image, index) => (
        <div
          key={`${image}-${index}`}
          className={`relative aspect-[3/4] rounded-lg overflow-hidden group shadow-sm transition-all ${
            draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100'
          }`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
          <img
            src={image}
            alt={`Image ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all">
            <button
              onClick={() => onRemoveImage(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-white/80 text-gray-700 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-1 text-xs text-white bg-black/40 opacity-0 group-hover:opacity-100 transition-all">
            Image {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
