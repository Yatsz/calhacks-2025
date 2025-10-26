import { useCallback, useState } from "react";
import { Plus } from "lucide-react";

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  accept?: string;
}

export function UploadZone({ onUpload, accept = "*" }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onUpload(files);
      }
    },
    [onUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
        isDragging
          ? "border-white/80 bg-white/50 shadow-lg scale-[1.02]"
          : "border-white/50 backdrop-blur-xl bg-white/30"
      }`}
    >
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/60 flex items-center justify-center shadow-md">
          <Plus className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-sm text-gray-700">Drop files or click to upload</p>
      </div>
    </div>
  );
}
