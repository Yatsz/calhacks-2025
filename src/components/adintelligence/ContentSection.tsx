import { useState } from "react";
import { UploadZone } from "./UploadZone";
import { ContentCard } from "./ContentCard";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

interface ContentSectionProps {
  title: string;
  color: string;
  showMediaOnly: boolean;
  onContentClick: (content: ContentItem) => void;
}

export function ContentSection({ title, color, showMediaOnly, onContentClick }: ContentSectionProps) {
  const [items, setItems] = useState<ContentItem[]>([]);

  const handleUpload = (files: File[]) => {
    const newItems: ContentItem[] = files.map((file) => {
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type === "application/pdf"
        ? "pdf"
        : "text";

      return {
        id: Date.now().toString() + Math.random(),
        type,
        name: file.name,
        url: URL.createObjectURL(file),
        thumbnail: type === "image" || type === "video" ? URL.createObjectURL(file) : undefined,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Filter items based on media toggle
  const filteredItems = showMediaOnly
    ? items.filter((item) => item.type === "image" || item.type === "video")
    : items;

  return (
    <div className="px-6 space-y-3">
      <UploadZone onUpload={handleUpload} />

      {filteredItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              {...item}
              onDelete={handleDelete}
              onClick={() => onContentClick(item)}
            />
          ))}
        </div>
      )}

      {showMediaOnly && items.length > 0 && filteredItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No media files in this section</p>
        </div>
      )}
    </div>
  );
}
