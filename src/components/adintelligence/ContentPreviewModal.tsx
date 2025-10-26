import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  text?: string;
}

interface ContentPreviewModalProps {
  content: ContentItem | null;
  onClose: () => void;
}

export function ContentPreviewModal({ content, onClose }: ContentPreviewModalProps) {
  if (!content) return null;

  return (
    <Dialog open={!!content} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] backdrop-blur-2xl bg-white/80 border-white/60 shadow-2xl">
        <DialogTitle className="sr-only">{content.name}</DialogTitle>
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-2">
            {content.type === "image" && content.url && (
              <img
                src={content.url}
                alt={content.name}
                className="w-full rounded-lg"
              />
            )}

            {content.type === "video" && content.url && (
              <video
                src={content.url}
                controls
                className="w-full rounded-lg"
              />
            )}

            {content.type === "pdf" && content.url && (
              <iframe
                src={content.url}
                className="w-full h-[600px] rounded-lg"
                title={content.name}
              />
            )}

            {content.type === "text" && content.text && (
              <div className="backdrop-blur-xl bg-white/60 rounded-lg p-6 border border-white/60">
                <p className="whitespace-pre-wrap text-gray-900">{content.text}</p>
              </div>
            )}

            {content.text && content.type !== "text" && (
              <div className="mt-4 backdrop-blur-xl bg-white/60 rounded-lg p-4 border border-white/60">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{content.text}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
