import { useState, useEffect } from "react";
import { ContentCard } from "./ContentCard";
import { AddContentModal } from "./AddContentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

interface Campaign {
  id: string;
  media: { type: "image" | "video"; url: string; name?: string } | null;
  caption: string;
  createdAt: string;
}

interface ContentSectionProps {
  title: string;
  color: string;
  showMediaOnly: boolean;
  onContentClick: (content: ContentItem) => void;
}

export function ContentSection({ title, color, showMediaOnly, onContentClick }: ContentSectionProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const storageKey = `content-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const isPastCampaigns = title === "Past Campaigns";

  // Load from localStorage on mount and periodically check for updates
  useEffect(() => {
    const loadItems = () => {
      if (isPastCampaigns) {
        // For Past Campaigns, sync with the campaigns localStorage
        const campaignsStored = localStorage.getItem('campaigns');
        if (campaignsStored) {
          try {
            const campaigns: Campaign[] = JSON.parse(campaignsStored);
            // Convert campaigns to ContentItem format
            const campaignItems: ContentItem[] = campaigns.map((campaign: Campaign) => ({
              id: campaign.id,
              type: campaign.media?.type === 'video' ? 'video' : 'image',
              name: campaign.caption ? campaign.caption.substring(0, 50) : 'Untitled Campaign',
              url: campaign.media?.url,
              thumbnail: campaign.media?.url,
              text: campaign.caption,
            }));
            setItems(campaignItems);
          } catch (e) {
            console.error('Failed to load campaigns:', e);
          }
        }
      } else {
        // Regular content sections
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            setItems(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to load content:', e);
          }
        }
      }
    };

    loadItems();

    // If it's Past Campaigns, set up an interval to check for updates
    if (isPastCampaigns) {
      const interval = setInterval(loadItems, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [storageKey, isPastCampaigns]);

  // Save to localStorage whenever items change (but not for Past Campaigns since they sync from campaigns)
  useEffect(() => {
    if (!isPastCampaigns && items.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, storageKey, isPastCampaigns]);

  const handleAdd = (content: Omit<ContentItem, "id">) => {
    const newItem: ContentItem = {
      ...content,
      id: Date.now().toString() + Math.random(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    if (newItems.length === 0) {
      localStorage.removeItem(storageKey);
    }
  };

  // Filter items based on media toggle
  const filteredItems = showMediaOnly
    ? items.filter((item) => item.type === "image" || item.type === "video")
    : items;

  return (
    <div className="px-6 space-y-3">
      {!isPastCampaigns && (
        <Button
          onClick={() => setShowModal(true)}
          className="w-full backdrop-blur-xl bg-white/50 hover:bg-white/70 border-2 border-white/60 text-gray-900 font-medium shadow-sm transition-all"
          style={{ borderColor: `${color}40` }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      )}

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

      <AddContentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
