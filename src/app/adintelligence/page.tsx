"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getCampaignById } from "@/lib/db";
import { Header } from "@/components/adintelligence/Header";
import { ChatbotPanel } from "@/components/adintelligence/ChatbotPanel";
import { CampaignEditor } from "@/components/adintelligence/CampaignEditor";
import { ContentSection } from "@/components/adintelligence/ContentSection";
import { ContentPreviewModal } from "@/components/adintelligence/ContentPreviewModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

const contentTypes = [
  { id: "inspiration", label: "Inspiration", color: "#669CE4" },
  { id: "campaigns", label: "Past Campaigns", color: "#8462CF" },
  { id: "library", label: "Content Library", color: "#3FB855" },
];

const CHAT_WIDTH_STORAGE_KEY = "adintelligence-chat-width";
const DEFAULT_CHAT_WIDTH = 320;
const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 640;

export default function AdIntelligencePage() {
  const searchParams = useSearchParams();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("inspiration");
  const [campaignContext, setCampaignContext] = useState<{
    id: string;
    caption: string;
    media: { type: "image" | "video"; url: string; name?: string } | null;
  } | null>(null);
  const editingCampaignId = searchParams.get("edit");

  const computeMaxChatWidth = () => {
    if (typeof window === "undefined") {
      return MAX_CHAT_WIDTH;
    }
    const available = window.innerWidth - 420; // account for left panel and padding
    return Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, available));
  };

  const [chatPanelWidth, setChatPanelWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (!Number.isNaN(parsed)) {
        const maxWidth = Math.max(
          MIN_CHAT_WIDTH,
          Math.min(MAX_CHAT_WIDTH, parsed)
        );
        return maxWidth;
      }
    }
    return DEFAULT_CHAT_WIDTH;
  });
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null
  );
  const [isResizing, setIsResizing] = useState(false);

  // Load campaign context when editing a campaign
  useEffect(() => {
    (async () => {
      if (editingCampaignId && typeof window !== "undefined") {
        try {
          const campaign = await getCampaignById(editingCampaignId);
          if (campaign) {
            setCampaignContext({
              id: campaign.id,
              caption: campaign.caption,
              media: campaign.media,
            });
          }
        } catch (error) {
          console.error("Error loading campaign context:", error);
        }
      } else {
        setCampaignContext(null);
      }
    })();
  }, [editingCampaignId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CHAT_WIDTH_STORAGE_KEY,
        String(Math.round(chatPanelWidth))
      );
    }
  }, [chatPanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const maxWidth = computeMaxChatWidth();
      setChatPanelWidth((prev) =>
        Math.min(Math.max(prev, MIN_CHAT_WIDTH), maxWidth)
      );
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeStateRef.current) return;
      const { startX, startWidth } = resizeStateRef.current;
      const delta = event.clientX - startX;
      const maxWidth = computeMaxChatWidth();
      const nextWidth = Math.min(
        Math.max(startWidth - delta, MIN_CHAT_WIDTH),
        maxWidth
      );
      setChatPanelWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStateRef.current = null;
      document.body.classList.remove("select-none", "cursor-col-resize");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("select-none", "cursor-col-resize");
    };
  }, []);

  const handleResizeStart = (
    event: React.PointerEvent<HTMLDivElement>
  ): void => {
    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: chatPanelWidth,
    };
    setIsResizing(true);
    document.body.classList.add("select-none", "cursor-col-resize");
  };

  const activeColor =
    contentTypes.find((t) => t.id === activeTab)?.color || "#669CE4";

  // Convert hex to RGB for the spotlight
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
          result[3],
          16
        )}`
      : "102, 156, 228";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-linear-to-br from-blue-50 via-purple-50 to-green-50 transition-colors duration-700" />

      {/* Dynamic spotlight that changes with active tab */}
      <div
        className="fixed top-20 left-20 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-700"
        style={{
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.3)`,
        }}
      />
      <div
        className="fixed bottom-20 right-20 w-96 h-96 rounded-full blur-3xl transition-all duration-700"
        style={{
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.2)`,
        }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-700"
        style={{
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.15)`,
        }}
      />

      <div className="relative z-10">
        <Header />

        <div className="pt-[73px] h-screen flex gap-4 p-4">
          {/* Left Panel - Content Library with Tabs */}
          <div className="w-80 backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/40">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full backdrop-blur-xl bg-white/40 border border-white/50 h-auto p-1 gap-1">
                  {contentTypes.map((type) => (
                    <TabsTrigger
                      key={type.id}
                      value={type.id}
                      className="flex-1 text-gray-900! font-medium py-1.5 px-1.5 text-[10px] rounded-lg transition-all min-h-[44px]"
                      style={{
                        backgroundColor:
                          activeTab === type.id
                            ? `${type.color}30`
                            : "transparent",
                      }}
                    >
                      <span className="flex items-center gap-1 w-full">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-center leading-[1.1] flex-1 wrap-break-word">
                          {type.label}
                        </span>
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-6">
                <Tabs value={activeTab} className="w-full">
                  <TabsContent value="inspiration" className="mt-0">
                    <ContentSection
                      title="Inspiration"
                      color="#669CE4"
                      showMediaOnly={false}
                      onContentClick={setSelectedContent}
                    />
                  </TabsContent>
                  <TabsContent value="campaigns" className="mt-0">
                    <ContentSection
                      title="Past Campaigns"
                      color="#8462CF"
                      showMediaOnly={false}
                      onContentClick={setSelectedContent}
                    />
                  </TabsContent>
                  <TabsContent value="library" className="mt-0">
                    <ContentSection
                      title="Content Library"
                      color="#3FB855"
                      showMediaOnly={false}
                      onContentClick={setSelectedContent}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Center & Right Panels */}
          <div className="flex flex-1 gap-3 items-stretch">
            <div className="flex-1 overflow-auto">
              <CampaignEditor editingCampaignId={editingCampaignId} />
            </div>
            <div
              className={`relative w-2 flex-shrink-0 cursor-col-resize rounded-full bg-white/40 transition-colors ${
                isResizing ? "bg-white/70" : "hover:bg-white/60"
              }`}
              onPointerDown={handleResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize assistant panel"
            >
              <span className="sr-only">Resize assistant panel</span>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="h-10 w-[2px] rounded-full bg-white/80" />
              </div>
            </div>
            <div
              className="backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl shadow-xl overflow-hidden flex-shrink-0"
              style={{
                width: chatPanelWidth,
                flexBasis: chatPanelWidth,
              }}
            >
              <ChatbotPanel campaignContext={campaignContext} />
            </div>
          </div>
        </div>
      </div>

      <ContentPreviewModal
        content={selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </div>
  );
}
