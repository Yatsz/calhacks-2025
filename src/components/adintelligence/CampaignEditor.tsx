import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getCampaignById,
  createCampaign,
  updateCampaign,
  getAllCampaigns,
} from "@/lib/db";

interface Campaign {
  id: string;
  media: { type: "image" | "video"; url: string; name?: string } | null;
  caption: string;
  createdAt: string;
}

interface CampaignEditorProps {
  campaignContext?: {
    id: string;
    caption: string;
    media: { type: "image" | "video"; url: string; name?: string } | null;
  } | null;
  setCampaignContext: (
    campaignContext: {
      id: string;
      caption: string;
      media: { type: "image" | "video"; url: string; name?: string } | null;
    } | null
  ) => void;
  editingCampaignId?: string | null;
}

export function CampaignEditor({
  campaignContext,
  setCampaignContext,
  editingCampaignId,
}: CampaignEditorProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load campaign when editingCampaignId changes
  const loadCampaign = useCallback(async () => {
    if (editingCampaignId && typeof window !== "undefined") {
      setLoading(true);
      try {
        const campaign = await getCampaignById(editingCampaignId);
        if (campaign) {
          setTimeout(() => {
            setCampaignContext({
              id: campaign.id,
              caption: campaign.caption,
              media: campaign.media,
            });
            setCurrentCampaignId(campaign.id);
          }, 0);
        }
      } catch (error) {
        console.error("Error loading campaign:", error);
        toast.error("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    } else {
      // Reset for new campaign
      setTimeout(() => {
        setCampaignContext({
          id: "",
          caption: "",
          media: null,
        });
        setCurrentCampaignId(null);
      }, 0);
    }
  }, [editingCampaignId, setCampaignContext]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const data = e.dataTransfer.getData("content-item");
    if (data) {
      const item = JSON.parse(data);

      // Check if it's a campaign being dragged (from Past Campaigns)
      if (item.text && item.text.length > 50) {
        // It's likely a campaign - load the full campaign from database
        try {
          const campaigns = await getAllCampaigns();
          const campaign = campaigns.find((c: Campaign) => c.id === item.id);
          if (campaign) {
            // Replace the entire campaign
            setCampaignContext({
              id: campaign.id,
              caption: campaign.caption,
              media: campaign.media,
            });
            setCurrentCampaignId(null); // Create as new campaign, not edit
            return;
          }
        } catch (error) {
          console.error("Error loading campaign for drag:", error);
        }
      }

      // Regular media item
      if (item.type === "image" || item.type === "video") {
        setCampaignContext({
          id: campaignContext?.id ?? currentCampaignId ?? "",
          caption: campaignContext?.caption ?? "",
          media: {
            type: item.type,
            url: item.url || item.thumbnail || "",
            name: item.name,
          },
        });
      }
    }
  };

  const currentCaption = campaignContext?.caption ?? "";
  const currentMedia = campaignContext?.media ?? null;

  const handleSaveCampaign = async () => {
    const captionForSave = currentCaption;
    const mediaForSave = currentMedia;
    if (!mediaForSave && captionForSave.trim().length === 0) {
      toast.error("Please add media or caption before saving");
      return;
    }

    setSaving(true);
    try {
      if (currentCampaignId) {
        // Update existing campaign
        await updateCampaign(currentCampaignId, {
          caption: captionForSave,
          media: mediaForSave,
        });
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        await createCampaign({
          caption: captionForSave,
          media: mediaForSave,
        });
        toast.success("Campaign saved successfully!");
      }

      // Navigate to campaigns page
      router.push("/campaigns");
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="backdrop-blur-2xl bg-white/40 rounded-3xl border border-white/50 shadow-2xl p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
              <p className="text-sm text-gray-700">Loading campaign...</p>
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-2xl bg-white/40 rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
            {/* Media Section */}
            <div
              className={`relative backdrop-blur-xl ${
                isDragging ? "bg-white/40" : "bg-white/20"
              } transition-colors`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {currentMedia ? (
                <div className="relative aspect-square">
                  {currentMedia.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.name || "Campaign media"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={currentMedia.url}
                      controls
                      className="w-full h-full object-cover bg-black"
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/60 flex items-center justify-center shadow-lg">
                      <ImageIcon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-900 font-medium">
                        Empty Media
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Drag from content library
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Caption Section */}
            <div className="p-6 space-y-4 backdrop-blur-xl bg-white/30 border-t-2 border-white/40">
              <div className="space-y-2">
                <Textarea
                  value={currentCaption}
                  onChange={(e) =>
                    setCampaignContext({
                      id: campaignContext?.id ?? currentCampaignId ?? "",
                      caption: e.target.value,
                      media: currentMedia,
                    })
                  }
                  placeholder="Write your campaign caption..."
                  className="min-h-[100px] resize-none backdrop-blur-xl bg-white/70 border-2 border-white/80 text-gray-900 placeholder:text-gray-500 shadow-sm focus:bg-white focus:border-gray-300"
                  disabled={saving}
                />
              </div>

              <Button
                onClick={handleSaveCampaign}
                className="w-full bg-gray-900 hover:bg-gray-800 shadow-lg text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Campaign"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
