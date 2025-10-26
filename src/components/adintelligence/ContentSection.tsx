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

/**
 * Ensures a content item is processed and added to Chroma
 * Fires non-blocking background jobs that handle the entire pipeline
 */
function ensureContentInChroma(item: {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  url?: string;
  name: string;
  caption: string;
  summary?: string;
  category: string;
}) {
  // Check if summary is just the filename (invalid summary)
  const isInvalidSummary =
    !item.summary || item.summary === item.name || item.summary.length < 20;

  const isMediaType = item.type === "image" || item.type === "video";

  // If it's media content without a valid summary, use analyze-media endpoint
  // which will automatically handle the entire pipeline (AI analysis -> DB update -> Chroma)
  if (isInvalidSummary && isMediaType && item.url) {
    console.log(
      `[Non-blocking] Triggering AI analysis for ${item.type} ${item.id}: ${item.name}`
    );

    // Fire and forget - this returns immediately with 202 Accepted
    // analyze-media will call process-content internally after generating summary
    fetch("/api/analyze-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: item.url,
        type: item.type,
        name: item.name,
        id: item.id,
        category: item.category,
      }),
    }).catch((error) => {
      console.warn(`Failed to trigger analysis for ${item.id}:`, error);
    });
  } else if (item.summary && !isMediaType) {
    // ONLY for non-media content with valid summaries, directly process
    // Media items with summaries are skipped to avoid duplicate processing
    console.log(
      `[Non-blocking] Processing non-media content with existing summary for ${item.id}`
    );

    // Fire and forget - this returns immediately with 202 Accepted
    fetch("/api/process-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        type: item.type,
        url: item.url,
        name: item.name,
        category: item.category,
        summary: item.summary,
      }),
    }).catch((error) => {
      console.warn(`Failed to trigger processing for ${item.id}:`, error);
    });
  } else if (isMediaType && item.summary) {
    // Media with summary - already processed, skip to avoid duplicate
    console.log(
      `[Non-blocking] Skipping ${item.id}: Media already has summary (already processed)`
    );
  } else {
    console.log(
      `[Non-blocking] Skipping ${item.id}: No summary and not media content`
    );
  }
}

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
            type: campaign.media?.type || "text",
            name: campaign.caption
              ? campaign.caption.substring(0, 50)
              : "Untitled Campaign",
            url: campaign.media?.url,
            thumbnail: campaign.media?.url,
            caption: campaign.caption,
            summary: undefined, // Don't use caption as summary - let it be generated from media
          }));
          setItems(campaignItems);

          // Ensure campaigns are in Chroma (background process)
          // This will generate summaries from the media content, not use captions
          campaignItems.forEach((item) => {
            ensureContentInChroma({
              id: item.id,
              type: item.type,
              url: item.url,
              name: item.name,
              caption: item.caption,
              summary: undefined, // Force generation from media
              category: "campaigns",
            });
          });
        } else {
          // Regular content sections
          const contentItems = await getContentItemsByCategory(category);
          setItems(contentItems);

          // Ensure content items are in Chroma (background process)
          contentItems.forEach((item) => {
            ensureContentInChroma({
              id: item.id,
              type: item.type,
              url: item.url,
              name: item.name,
              caption: item.caption,
              summary: item.summary,
              category,
            });
          });
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      }
    };

    loadItems();

    // If it's Past Campaigns, set up an interval to check for updates
    if (isPastCampaigns) {
      const interval = setInterval(loadItems, 60000); // Check every 60 seconds
      return () => clearInterval(interval);
    }
  }, [category, isPastCampaigns]);

  const handleAdd = async (content: Omit<ContentItem, "id">) => {
    if (isPastCampaigns) return; // Can't add directly to past campaigns

    try {
      // Step 1: Insert to Supabase immediately with empty summary field
      const newItem = await createContentItem(
        { ...content, summary: undefined },
        category
      );

      if (newItem) {
        // Update UI immediately
        setItems((prev) => [newItem, ...prev]);

        // Step 2: Process in background using the abstracted function
        ensureContentInChroma({
          id: newItem.id,
          type: content.type,
          url: content.url,
          name: content.name,
          caption: content.caption,
          summary: content.summary,
          category,
        });
      }
    } catch (error) {
      console.error("Failed to create content item:", error);
      alert("Failed to add content. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete content item:", error);
      alert("Failed to delete content. Please try again.");
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
