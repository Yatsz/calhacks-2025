import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  getContentItemsByCategory,
  createContentItem,
  deleteContentItem,
  getAllCampaigns,
} from "@/lib/db";

import { ContentCard } from "./ContentCard";
import { AddContentModal } from "./AddContentModal";

import { ContentItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ContentSectionProps {
  title: string;
  color: string;
  showMediaOnly: boolean;
  onContentClick: (content: ContentItem) => void;
}

export function ContentSection({
  title,
  color,
  showMediaOnly,
  onContentClick,
}: ContentSectionProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const isPastCampaigns = title === "Past Campaigns";
  const category = title === "Inspiration" ? "inspiration" : "content-library";

  // Load from database on mount and periodically check for updates
  useEffect(() => {
    const loadItems = async () => {
      try {
        if (isPastCampaigns) {
          // For Past Campaigns, sync with the campaigns database
          const campaigns = await getAllCampaigns();
          const campaignItems: ContentItem[] = campaigns.map((campaign) => ({
            id: campaign.id,
            type: (campaign.media?.type === 'video' ? 'video' : 'image') as 'image' | 'video',
            name: campaign.caption ? campaign.caption.substring(0, 50) : 'Untitled Campaign',
            url: campaign.media?.url,
            thumbnail: campaign.media?.url,
            text: campaign.caption,
          }));
          setItems(campaignItems);
        } else {
          // Regular content sections
          const contentItems = await getContentItemsByCategory(category);
          setItems(contentItems);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };

    loadItems();

    // If it's Past Campaigns, set up an interval to check for updates
    if (isPastCampaigns) {
      const interval = setInterval(loadItems, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [category, isPastCampaigns]);

  const handleAdd = async (content: Omit<ContentItem, "id">) => {
    if (isPastCampaigns) return; // Can't add directly to past campaigns
    
    try {
      const newItem = await createContentItem(content, category);
      if (newItem) {
        setItems((prev) => [newItem, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create content item:', error);
      alert('Failed to add content. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete content item:', error);
      alert('Failed to delete content. Please try again.');
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
          <p className="text-sm text-gray-500">
            No media files in this section
          </p>
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
