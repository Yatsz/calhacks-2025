"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { Send, FileText, Lightbulb, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text";
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

interface ReferenceItem {
  type: "inspiration" | "library" | "campaign";
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
  label: string;
  data: ContentItem | Campaign;
}

export function ChatbotPanel() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [inputValue, setInputValue] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuItems, setSlashMenuItems] = useState<ReferenceItem[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<ReferenceItem[]>(
    []
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSlashMenuItems = (): ReferenceItem[] => {
    const items: ReferenceItem[] = [];

    // Load inspiration
    const inspiration = localStorage.getItem("content-inspiration");
    if (inspiration) {
      const parsed = JSON.parse(inspiration);
      parsed.forEach((item: ContentItem) => {
        items.push({
          type: "inspiration",
          icon: Lightbulb,
          color: "#669CE4",
          label: item.name,
          data: item,
        });
      });
    }

    // Load content library
    const library = localStorage.getItem("content-content-library");
    if (library) {
      const parsed = JSON.parse(library);
      parsed.forEach((item: ContentItem) => {
        items.push({
          type: "library",
          icon: FolderOpen,
          color: "#3FB855",
          label: item.name,
          data: item,
        });
      });
    }

    // Load campaigns
    const campaigns = localStorage.getItem("campaigns");
    if (campaigns) {
      const parsed = JSON.parse(campaigns);
      parsed.forEach((campaign: Campaign) => {
        items.push({
          type: "campaign",
          icon: FileText,
          color: "#8462CF",
          label: campaign.caption
            ? campaign.caption.substring(0, 50) + "..."
            : "Untitled Campaign",
          data: campaign,
        });
      });
    }

    return items;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if user typed "/"
    if (value.endsWith("/")) {
      const items = loadSlashMenuItems();
      setSlashMenuItems(items);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectReference = (item: ReferenceItem) => {
    // Remove the "/" from input
    setInputValue(inputValue.slice(0, -1));
    setSelectedReferences([...selectedReferences, item]);
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  const removeReference = (index: number) => {
    setSelectedReferences(selectedReferences.filter((_, i) => i !== index));
  };

  const formatReferenceContext = (references: ReferenceItem[]) => {
    if (references.length === 0) return "";

    let context = "\n\n---REFERENCED CONTENT---\n";
    references.forEach((ref, index) => {
      context += `\n[Reference ${index + 1} - ${ref.type}]: ${ref.label}\n`;
      if ("caption" in ref.data) {
        // It's a Campaign
        const campaign = ref.data as Campaign;
        if (campaign.caption) {
          context += `Caption: ${campaign.caption}\n`;
        }
        if (campaign.media) {
          context += `Has media: Yes (${campaign.media.type})\n`;
        }
      } else {
        // It's a ContentItem
        const item = ref.data as ContentItem;
        if (item.text) {
          context += `Content: ${item.text}\n`;
        }
        if (item.type) {
          context += `Type: ${item.type}\n`;
        }
        if (item.url) {
          context += `Has media: Yes\n`;
        }
      }
    });
    context += "---END REFERENCED CONTENT---\n\n";

    return context;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() && selectedReferences.length === 0) return;

    const referenceContext = formatReferenceContext(selectedReferences);
    const fullMessage = inputValue + referenceContext;

    sendMessage({ text: fullMessage });
    setInputValue("");
    setSelectedReferences([]);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/40">
        <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center mt-70 justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                Let&apos;s build your campaign
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2 rounded-2xl text-sm bg-gray-900 text-white shadow-lg">
                      <div className="whitespace-pre-wrap break-words">
                        {message.parts.map((part, index) =>
                          part.type === "text" ? (
                            <span key={index}>{part.text}</span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-900">
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Assistant
                    </div>
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
                          {part.text}
                        </ReactMarkdown>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))}
            {(status === "submitted" || status === "streaming") && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600 mb-3">
                  Assistant
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="px-6 py-4 border-t border-white/40">
        {/* Selected References */}
        {selectedReferences.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedReferences.map((ref, index) => {
              const Icon = ref.icon;
              return (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs backdrop-blur-xl bg-white/60 border border-white/60"
                  style={{ borderColor: `${ref.color}40` }}
                >
                  <Icon className="w-3 h-3" style={{ color: ref.color }} />
                  <span className="text-gray-900 font-medium">{ref.label}</span>
                  <button
                    onClick={() => removeReference(index)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Slash Menu */}
        {showSlashMenu && (
          <div className="mb-3 backdrop-blur-2xl bg-white/90 border border-white/60 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {slashMenuItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No content available. Add inspiration, library items, or
                campaigns first.
              </div>
            ) : (
              <div className="py-2">
                {slashMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectReference(item)}
                      className="w-full px-4 py-2 hover:bg-white/60 flex items-center gap-3 text-left transition-colors"
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.type}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendMessage()
            }
            placeholder="Ask anything..."
            disabled={status !== "ready"}
            className="flex-1 backdrop-blur-xl bg-white/50 border-white/60 text-gray-900 placeholder:text-gray-500"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={
              status !== "ready" ||
              (!inputValue.trim() && selectedReferences.length === 0)
            }
            className="bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
