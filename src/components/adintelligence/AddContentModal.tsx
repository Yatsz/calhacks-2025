"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Type, Link as LinkIcon, Layout, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, uploadVideoWithThumbnail } from "@/lib/storage";

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (content: {
    type: "image" | "video" | "text" | "link" | "campaign";
    name: string;
    url?: string;
    text?: string;
    thumbnail?: string;
  }) => void;
}

type ContentType = "file" | "text" | "link" | "campaign";

export function AddContentModal({ open, onClose, onAdd }: AddContentModalProps) {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [campaignCaption, setCampaignCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const contentTypes = [
    {
      id: "file" as ContentType,
      icon: Upload,
      title: "File Upload",
      description: "Upload images or videos",
      color: "#669CE4",
    },
    {
      id: "text" as ContentType,
      icon: Type,
      title: "Text Input",
      description: "Add text content",
      color: "#8462CF",
    },
    {
      id: "link" as ContentType,
      icon: LinkIcon,
      title: "Link",
      description: "TikTok, Instagram or YouTube link",
      color: "#3FB855",
    },
    {
      id: "campaign" as ContentType,
      icon: Layout,
      title: "Campaign",
      description: "Create a full campaign",
      color: "#F59E0B",
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const type = file.type.startsWith("image/") ? "image" : "video";

      if (type === "video") {
        // Upload video with thumbnail generation
        const { videoUrl, thumbnailUrl } = await uploadVideoWithThumbnail(file, 'content-library');
        
        onAdd({
          type,
          name: file.name,
          url: videoUrl,
          thumbnail: thumbnailUrl,
        });
        toast.success("Video uploaded successfully!");
      } else {
        // Upload image
        const url = await uploadFile(file, 'content-library');
        
        onAdd({
          type,
          name: file.name,
          url,
          thumbnail: url,
        });
        toast.success("Image uploaded successfully!");
      }
      
      handleClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedType === "text" && textInput.trim()) {
      onAdd({
        type: "text",
        name: nameInput || "Text Content",
        text: textInput,
      });
      handleClose();
    } else if (selectedType === "link" && linkInput.trim()) {
      // Check if it's a TikTok link
      if (linkInput.includes("tiktok.com")) {
        setIsDownloading(true);
        try {
          const response = await fetch("/api/download-video", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: linkInput }),
          });

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || "Failed to download TikTok video");
            setIsDownloading(false);
            return;
          }

          // Add the downloaded video
          onAdd({
            type: "video",
            name: nameInput || data.filename,
            url: data.videoUrl,
            thumbnail: data.thumbnail || data.videoUrl,
          });
          handleClose();
        } catch (error) {
          console.error("Error downloading TikTok video:", error);
          alert("Failed to download TikTok video. Please try again.");
          setIsDownloading(false);
        }
      } else {
        // For non-TikTok links, just store the link
        onAdd({
          type: "link",
          name: nameInput || "Link Content",
          url: linkInput,
          text: linkInput,
        });
        handleClose();
      }
    } else if (selectedType === "campaign") {
      onAdd({
        type: "campaign",
        name: nameInput || "Campaign",
        text: campaignCaption,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setTextInput("");
    setLinkInput("");
    setNameInput("");
    setCampaignCaption("");
    setIsDownloading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl backdrop-blur-2xl bg-white/90 border-white/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Add New Content
          </DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className="group relative backdrop-blur-xl bg-white/50 border-2 border-white/60 rounded-2xl p-6 hover:bg-white/70 hover:shadow-xl transition-all text-left"
                  style={{
                    borderColor: `${type.color}40`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: `${type.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: type.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {type.title}
                  </h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {selectedType === "file" && (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-64 backdrop-blur-xl bg-white/50 border-2 border-dashed border-white/60 rounded-2xl cursor-pointer hover:bg-white/70 transition-all">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-gray-400 mb-4 animate-spin" />
                      <p className="text-lg font-medium text-gray-900">
                        Uploading...
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Please wait while we upload your file
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900">
                        Click to upload
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Images or videos
                      </p>
                    </>
                  )}
                </label>
              </div>
            )}

            {selectedType === "text" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-900 font-medium">
                    Title
                  </Label>
                  <Input
                    id="name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Content title..."
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="text" className="text-gray-900 font-medium">
                    Text Content
                  </Label>
                  <Textarea
                    id="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter your text content..."
                    rows={8}
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                  />
                </div>
              </div>
            )}

            {selectedType === "link" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkName" className="text-gray-900 font-medium">
                    Title
                  </Label>
                  <Input
                    id="linkName"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Content title..."
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="link" className="text-gray-900 font-medium">
                    Link URL
                  </Label>
                  <Input
                    id="link"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://tiktok.com/... or https://instagram.com/..."
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                    disabled={isDownloading}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {isDownloading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Downloading TikTok video...
                    </span>
                  ) : (
                    "Paste a TikTok link to download, or Instagram/YouTube to save"
                  )}
                </p>
              </div>
            )}

            {selectedType === "campaign" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaignName" className="text-gray-900 font-medium">
                    Campaign Name
                  </Label>
                  <Input
                    id="campaignName"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Campaign title..."
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="caption" className="text-gray-900 font-medium">
                    Campaign Caption
                  </Label>
                  <Textarea
                    id="caption"
                    value={campaignCaption}
                    onChange={(e) => setCampaignCaption(e.target.value)}
                    placeholder="Write your campaign caption..."
                    rows={6}
                    className="mt-2 backdrop-blur-xl bg-white/70 border-white/80 text-gray-900"
                  />
                </div>
              </div>
            )}

            {selectedType !== "file" && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setSelectedType(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  disabled={
                    isDownloading ||
                    (selectedType === "text" && !textInput.trim()) ||
                    (selectedType === "link" && !linkInput.trim())
                  }
                >
                  {isDownloading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </span>
                  ) : (
                    "Add Content"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

