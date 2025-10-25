import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CampaignEditor() {
  const [media, setMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);
  const [caption, setCaption] = useState("");

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith("image/") ? "image" : "video";
    const url = URL.createObjectURL(file);
    setMedia({ type, url });
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="backdrop-blur-2xl bg-white/40 rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
          {/* Media Section */}
          <div className="relative backdrop-blur-xl bg-white/20">
            {media ? (
              <div className="relative aspect-square">
                <button
                  onClick={() => setMedia(null)}
                  className="absolute top-3 right-3 z-10 backdrop-blur-xl bg-white/80 hover:bg-white/90 rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-lg"
                >
                  <X className="w-4 h-4 text-gray-900" />
                </button>
                {media.type === "image" ? (
                  <img
                    src={media.url}
                    alt="Campaign media"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={media.url}
                    controls
                    className="w-full h-full object-cover bg-black"
                  />
                )}
              </div>
            ) : (
              <label className="aspect-square flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/60 flex items-center justify-center shadow-lg">
                    <ImageIcon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-900">Add Media</p>
                    <p className="text-xs text-gray-600 mt-1">Click to upload</p>
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Caption Section */}
          <div className="p-6 space-y-4 backdrop-blur-xl bg-white/30">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your campaign caption..."
              className="min-h-[100px] resize-none backdrop-blur-xl bg-white/50 border-white/60 text-gray-900 placeholder:text-gray-500"
            />

            <Button className="w-full bg-gray-900 hover:bg-gray-800 shadow-lg text-white">
              Save Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
