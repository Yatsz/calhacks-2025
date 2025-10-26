import { FileText, Video, Image as ImageIcon, File, X } from "lucide-react";

interface ContentCardProps {
  id: string;
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export function ContentCard({
  id,
  type,
  name,
  url,
  thumbnail,
  text,
  onDelete,
  onClick,
}: ContentCardProps) {
  const getIcon = () => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
      case "video":
        return <Video className="w-4 h-4 text-gray-400" />;
      case "pdf":
        return <File className="w-4 h-4 text-gray-400" />;
      case "text":
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({ id, type, name, url, thumbnail, text });
    e.dataTransfer.setData('content-item', data);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      onClick={onClick}
      draggable={type === 'image' || type === 'video'}
      onDragStart={handleDragStart}
      className="group relative backdrop-blur-xl bg-white/50 border border-white/60 rounded-xl p-3 cursor-pointer hover:bg-white/70 hover:shadow-lg transition-all"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xl bg-white/80 hover:bg-white w-5 h-5 rounded-full flex items-center justify-center shadow-md"
      >
        <X className="w-3 h-3 text-gray-600" />
      </button>

      {type === "image" && thumbnail ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden mb-2 bg-white/30 backdrop-blur-sm">
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : type === "video" && thumbnail ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden mb-2 bg-white/30 backdrop-blur-sm relative">
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full backdrop-blur-xl bg-white/90 flex items-center justify-center shadow-lg">
              <Video className="w-4 h-4 text-gray-900" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-video rounded-lg backdrop-blur-xl bg-white/40 flex items-center justify-center mb-2 border border-white/60">
          {getIcon()}
        </div>
      )}

      <p className="text-xs text-gray-900 truncate">{name}</p>
    </div>
  );
}
