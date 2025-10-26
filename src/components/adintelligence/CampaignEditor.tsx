import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Campaign {
  id: string;
  media: { type: "image" | "video"; url: string; name?: string } | null;
  caption: string;
  createdAt: string;
}

interface CampaignEditorProps {
  editingCampaignId?: string | null;
}

export function CampaignEditor({ editingCampaignId }: CampaignEditorProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  
  // Initialize campaign ID directly from prop
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(editingCampaignId || null);
  
  // Initialize state from localStorage if editing
  const [media, setMedia] = useState<{ type: "image" | "video"; url: string; name?: string } | null>(() => {
    if (editingCampaignId && typeof window !== 'undefined') {
      const stored = localStorage.getItem('campaigns');
      if (stored) {
        const campaigns: Campaign[] = JSON.parse(stored);
        const campaign = campaigns.find(c => c.id === editingCampaignId);
        if (campaign) {
          return campaign.media;
        }
      }
    }
    return null;
  });
  
  const [caption, setCaption] = useState<string>(() => {
    if (editingCampaignId && typeof window !== 'undefined') {
      const stored = localStorage.getItem('campaigns');
      if (stored) {
        const campaigns: Campaign[] = JSON.parse(stored);
        const campaign = campaigns.find(c => c.id === editingCampaignId);
        if (campaign) {
          return campaign.caption;
        }
      }
    }
    return "";
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const data = e.dataTransfer.getData('content-item');
    if (data) {
      const item = JSON.parse(data);
      if (item.type === 'image' || item.type === 'video') {
        setMedia({
          type: item.type,
          url: item.url || item.thumbnail || '',
          name: item.name
        });
      }
    }
  };

  const handleSaveCampaign = () => {
    if (!media && !caption.trim()) {
      alert("Please add media or caption before saving.");
      return;
    }

    // Get existing campaigns
    const existingCampaigns = localStorage.getItem('campaigns');
    const campaigns: Campaign[] = existingCampaigns ? JSON.parse(existingCampaigns) : [];
    
    if (currentCampaignId) {
      // Update existing campaign
      const index = campaigns.findIndex(c => c.id === currentCampaignId);
      if (index !== -1) {
        campaigns[index] = {
          ...campaigns[index],
          media,
          caption,
        };
        localStorage.setItem('campaigns', JSON.stringify(campaigns));
        alert("Campaign updated successfully!");
      }
    } else {
      // Create new campaign
      const newCampaign: Campaign = {
        id: Date.now().toString() + Math.random(),
        media,
        caption,
        createdAt: new Date().toISOString(),
      };
      campaigns.push(newCampaign);
      localStorage.setItem('campaigns', JSON.stringify(campaigns));
      alert("Campaign saved successfully!");
    }

    // Navigate to campaigns page
    router.push('/campaigns');
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="backdrop-blur-2xl bg-white/40 rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
          {/* Media Section */}
          <div 
            className={`relative backdrop-blur-xl ${isDragging ? 'bg-white/40' : 'bg-white/20'} transition-colors`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {media ? (
              <div className="relative aspect-square">
                {media.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.url}
                    alt={media.name || "Campaign media"}
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
              <div className="aspect-square flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/60 flex items-center justify-center shadow-lg">
                    <ImageIcon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-900 font-medium">Empty Media</p>
                    <p className="text-xs text-gray-600 mt-1">Drag from content library</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caption Section */}
          <div className="p-6 space-y-4 backdrop-blur-xl bg-white/30 border-t-2 border-white/40">
            <div className="space-y-2">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your campaign caption..."
                className="min-h-[100px] resize-none backdrop-blur-xl bg-white/70 border-2 border-white/80 text-gray-900 placeholder:text-gray-500 shadow-sm focus:bg-white focus:border-gray-300"
              />
            </div>

            <Button 
              onClick={handleSaveCampaign}
              className="w-full bg-gray-900 hover:bg-gray-800 shadow-lg text-white"
            >
              Save Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
