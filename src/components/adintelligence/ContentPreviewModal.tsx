import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  name: string;
  url?: string;
  thumbnail?: string;
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
            {content.type === "image" && (content.url || content.thumbnail) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.url || content.thumbnail || ''}
                alt={content.name}
                className="w-full rounded-lg"
              />
            )}

            {content.type === "video" && (content.url || content.thumbnail) && (
              <video
                src={content.url || content.thumbnail || ''}
                controls
                controlsList="nodownload"
                preload="metadata"
                className="w-full rounded-lg"
              >
                <source src={content.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}

            {content.type === "pdf" && content.url && (
              <iframe
                src={content.url}
                className="w-full h-[600px] rounded-lg"
                title={content.name}
              />
            )}

            {(content.type === "text" || content.type === "campaign") && content.text && (
              <div className="backdrop-blur-xl bg-white/60 rounded-lg p-6 border border-white/60">
                <p className="whitespace-pre-wrap text-gray-900">{content.text}</p>
              </div>
            )}

            {content.type === "link" && content.url && (
              <div className="backdrop-blur-xl bg-white/60 rounded-lg p-6 border border-white/60">
                <p className="text-sm text-gray-600 mb-2">Link</p>
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {content.url}
                </a>
              </div>
            )}

            {content.text && content.type !== "text" && content.type !== "campaign" && content.type !== "link" && (
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
