"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Send, FileText, Lightbulb, FolderOpen, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  getContentItemsByCategory,
  getAllCampaigns,
} from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import type { UIMessage } from "ai";
import type {
  CompetitorAnalysisDataPart,
  CompetitorAnalysisMetadata,
} from "@/types/competitor-analysis";
import { CompetitorMindmapOverlay } from "./CompetitorMindmapOverlay";

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

interface ChatbotPanelProps {
  campaignContext?: { id: string; caption: string; media: { type: "image" | "video"; url: string; name?: string } | null } | null;
}

export function ChatbotPanel({ campaignContext }: ChatbotPanelProps) {
  console.log('ChatbotPanel received campaignContext:', campaignContext);
  const ANALYSIS_TRIGGER = '!analysis';

  type ChatMessage = UIMessage<
    CompetitorAnalysisMetadata,
    { 'competitor-analysis': CompetitorAnalysisDataPart }
  >;

  type CompetitorAnalysisPart = Extract<
    ChatMessage['parts'][number],
    { type: 'data-competitor-analysis' }
  >;

  const isCompetitorAnalysisPart = (
    part: ChatMessage['parts'][number]
  ): part is CompetitorAnalysisPart => part.type === 'data-competitor-analysis';

  export function ChatbotPanel() {
    // const { messages, sendMessage, status } = useChat<ChatMessage>({
    //   transport: new DefaultChatTransport({
    //     api: '/api/chat',
    //   }),
    // });

    const [inputValue, setInputValue] = useState("");
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuItems, setSlashMenuItems] = useState<ReferenceItem[]>([]);
    const [selectedReferences, setSelectedReferences] = useState<ReferenceItem[]>([]);
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
    const [isLoadingMenu, setIsLoadingMenu] = useState(false);
    const [selectedModel, setSelectedModel] = useState<"claude-4.5" | "gemini-2.5-flash" | "qwen-3-32b" | "gpt-oss-20b">("claude-4.5");
    const [analysisPending, setAnalysisPending] = useState(false);
    const [activeMindmap, setActiveMindmap] = useState<{
      messageId: string;
      data: CompetitorAnalysisDataPart;
    } | null>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Create an id that changes when campaign or model changes to force chat re-initialization
    const chatId = `${campaignContext?.id || 'no-campaign'}-${selectedModel}`;

    const { messages, sendMessage, status } = useChat({
      id: chatId,
      onError: (error) => {
        console.error('Chat error:', error);
      },
    });

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Helper function to remove metadata from displayed messages
    const stripMetadata = (text: string) => {
      return text.replace(/\n\n<!--METADATA:[\s\S]+?-->/, '');
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const loadSlashMenuItems = async (): Promise<ReferenceItem[]> => {
      useEffect(() => {
        if (typeof document !== "undefined") {
          setPortalTarget(document.body);
        }
      }, []);

      const items: ReferenceItem[] = [];
      try {
        setIsLoadingMenu(true);
        // Load inspiration
        const inspiration = await getContentItemsByCategory('inspiration');
        inspiration.forEach((item) => {
          items.push({
            type: "inspiration",
            icon: Lightbulb,
            color: "#669CE4",
            label: item.name,
            data: item as ContentItem,
          });
        });

        // Load content library
        const library = await getContentItemsByCategory('content-library');
        library.forEach((item) => {
          items.push({
            type: "library",
            icon: FolderOpen,
            color: "#3FB855",
            label: item.name,
            data: item as ContentItem,
          });
        });

        // Load campaigns
        const campaigns = await getAllCampaigns();
        campaigns.forEach((campaign) => {
          items.push({
            type: "campaign",
            icon: FileText,
            color: '#8462CF',
            label: campaign.caption ? campaign.caption.substring(0, 50) + '...' : 'Untitled Campaign',
            data: campaign as Campaign,
          });
        });
        setSlashMenuItems(items);
      } catch (error) {
        console.error('Failed to load slash menu items:', error);
      } finally {
        setIsLoadingMenu(false);
      }

      return items;
    };

    // Pre-load slash menu items on mount
    useEffect(() => {
      loadSlashMenuItems();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Check if user typed "/" - show menu immediately since items are pre-loaded
      if (value.endsWith('/')) {
        setShowSlashMenu(true);
        setSelectedMenuIndex(0);
      } else {
        setShowSlashMenu(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSlashMenu && slashMenuItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMenuIndex((prev) => (prev + 1) % slashMenuItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMenuIndex((prev) => (prev - 1 + slashMenuItems.length) % slashMenuItems.length);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSelectReference(slashMenuItems[selectedMenuIndex]);
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowSlashMenu(false);
          return;
        }
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
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

    const handleSendMessage = async () => {
      if (!inputValue.trim() && selectedReferences.length === 0) return;

      // Build message with references if any
      let messageText = inputValue;
      if (selectedReferences.length > 0) {
        const referenceTexts = selectedReferences.map(ref => {
          if (ref.data) {
            const data = ref.data as ContentItem | Campaign;
            if ('url' in data && data.url) {
              return `---REFERENCED ${ref.type.toUpperCase()}---\nName: ${data.name}\nURL: ${data.url}`;
            } else if ('text' in data && data.text) {
              return `---REFERENCED ${ref.type.toUpperCase()}---\n${data.text}`;
            }
          }
          return `---REFERENCED ${ref.type.toUpperCase()}---\n${ref.label}`;
        });
        messageText = `${messageText}\n\nReferenced Content:\n${referenceTexts.join('\n\n')}`;
      }

      // Append campaign context and model as hidden metadata
      const metadata = {
        campaignContext: campaignContext,
        model: selectedModel,
      };
      const metadataString = JSON.stringify(metadata);
      messageText += `\n\n<!--METADATA:${metadataString}-->`;

      console.log('🚀 [SEND] Sending message with metadata');
      console.log('🚀 [SEND] Campaign ID:', campaignContext?.id);
      console.log('🚀 [SEND] Model:', selectedModel);

      await sendMessage({ text: messageText });
      const formatReferenceContext = (references: ReferenceItem[]) => {
        if (references.length === 0) return '';

        let context = '\n\n---REFERENCED CONTENT---\n';
        references.forEach((ref, index) => {
          context += `\n[Reference ${index + 1} - ${ref.type}]: ${ref.label}\n`;
          if ('caption' in ref.data) {
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
        context += '---END REFERENCED CONTENT---\n\n';

        return context;
      };

      const handleSendMessage = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput && selectedReferences.length === 0) return;

        const referenceContext = formatReferenceContext(selectedReferences);
        const fullMessage = inputValue + referenceContext;
        const isAnalysisCommand = trimmedInput.toLowerCase().startsWith(ANALYSIS_TRIGGER);

        if (isAnalysisCommand) {
          setAnalysisPending(true);
        }

        try {
          await sendMessage({ text: fullMessage });
        } catch (error) {
          console.error('Failed to send message:', error);
        } finally {
          if (isAnalysisCommand) {
            setAnalysisPending(false);
          }
        }

        setInputValue("");
        setSelectedReferences([]);
      };

      return (
        <div className="h-full flex flex-col relative">
          {portalTarget && activeMindmap
            ? createPortal(
              <CompetitorMindmapOverlay
                analysis={activeMindmap.data}
                onClose={() => setActiveMindmap(null)}
              />,
              portalTarget
            )
            : null}
          <div className="px-6 py-4 border-b border-white/40">
            <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
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
                            <div className="whitespace-pre-wrap break-words overflow-wrap-break-word">
                              {message.parts.map((part, index: number) =>
                                part.type === 'text' ? <span key={index}>{stripMetadata(part.text)}</span> : null
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-900 break-words [&_a]:text-blue-600 [&_a:hover]:text-blue-800 [&_a]:underline [&_code]:text-gray-900 [&_strong]:text-gray-900 [&_em]:text-gray-900">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Assistant</div>
                          <div className="overflow-wrap-break-word">
                            {message.parts.map((part, index: number) =>
                              part.type === 'text' ? (
                                <ReactMarkdown
                                  key={index}
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ ...props }) => (
                                      <a {...props} className="!text-blue-600 hover:!text-blue-800 underline" />
                                    ),
                                    p: ({ ...props }) => (
                                      <p {...props} className="break-words !text-gray-900" />
                                    ),
                                    code: ({ ...props }) => (
                                      <code {...props} className="!text-gray-900 !bg-gray-100 px-1 py-0.5 rounded" />
                                    ),
                                    strong: ({ ...props }) => (
                                      <strong {...props} className="!text-gray-900 font-semibold" />
                                    ),
                                    em: ({ ...props }) => (
                                      <em {...props} className="!text-gray-900" />
                                    ),
                                    li: ({ ...props }) => (
                                      <li {...props} className="!text-gray-900" />
                                    ),
                                    h1: ({ ...props }) => (
                                      <h1 {...props} className="!text-gray-900" />
                                    ),
                                    h2: ({ ...props }) => (
                                      <h2 {...props} className="!text-gray-900" />
                                    ),
                                    h3: ({ ...props }) => (
                                      <h3 {...props} className="!text-gray-900" />
                                    ),
                                    h4: ({ ...props }) => (
                                      <h4 {...props} className="!text-gray-900" />
                                    ),
                                  }}
                                >
                                  {part.text}
                                </ReactMarkdown>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                  <div className="text-gray-900">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Assistant</div>
                    <div className="space-y-3">
                      {message.parts.map((part, index) => {
                        if (part.type === 'text') {
                          return (
                            <div key={`text-${message.id}-${index}`} className="prose prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {part.text}
                              </ReactMarkdown>
                            </div>
                          );
                        }

                        if (isCompetitorAnalysisPart(part)) {
                          return (
                            <CompetitorAnalysisPreview
                              key={`analysis-${message.id}-${index}`}
                              data={part.data}
                              onOpen={() =>
                                setActiveMindmap({ messageId: message.id, data: part.data })
                              }
                            />
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                )}
                </div>
              ))}
              {analysisPending && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Assistant</div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-800 px-3 py-1.5 text-xs shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    Calling BrightData competitor tool...
                  </div>
                </div>
              )}
              {(status === 'submitted' || status === 'streaming') && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600 mb-3">Assistant</div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                  </div>
              ))}
                  {(status === 'submitted' || status === 'streaming') && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-600 mb-3">Assistant</div>
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
          </div>

          <div className="px-6 py-4 border-t border-white/40 relative">
            {/* Slash Menu - Fixed position above input */}
            {showSlashMenu && (
              <div className="absolute bottom-full left-6 right-6 mb-2 backdrop-blur-2xl bg-white/90 border border-white/60 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
                {isLoadingMenu ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Loading...
                  </div>
                ) : slashMenuItems.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No content available. Add inspiration, library items, or campaigns first.
                  </div>
                ) : (
                  <div className="py-2">
                    {slashMenuItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectReference(item)}
                          className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${index === selectedMenuIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                            }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

            <div className="relative min-h-[60px] bg-white/50 backdrop-blur-xl border border-white/60 rounded-lg overflow-hidden">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Ask anything..."
                disabled={status !== "ready"}
                className="w-full min-h-[60px] pb-14 pt-3 px-3 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-500 resize-none"
              />

              {/* Bottom buttons bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2 bg-gray-50/50 border-t border-white/60">
                {/* Model Selection - Shows current model */}
                <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as typeof selectedModel)}>
                  <SelectTrigger className="h-8 px-3 text-xs bg-gray-800 hover:bg-gray-700 border-none text-white shadow-sm mr-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-medium">
                        {selectedModel === 'claude-4.5' ? 'Claude 4.5' :
                          selectedModel === 'gemini-2.5-flash' ? 'Gemini 2.5' :
                            selectedModel === 'qwen-3-32b' ? 'Qwen 3-32B' :
                              selectedModel === 'gpt-oss-20b' ? 'GPT-OSS-20B' : selectedModel}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="claude-4.5" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        <span>Claude 4.5</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini-2.5-flash" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        <span>Gemini 2.5</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="qwen-3-32b" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        <span>Qwen 3-32B</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-oss-20b" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        <span>GPT-OSS-20B</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={
                    status !== "ready" ||
                    (!inputValue.trim() && selectedReferences.length === 0)
                  }
                  className="h-8 w-8 bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => void handleSendMessage()}
                size="icon"
                disabled={status !== 'ready' || (!inputValue.trim() && selectedReferences.length === 0)}
                className="bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div >
          </div >
        </div >
      );

      interface CompetitorAnalysisPreviewProps {
        data: CompetitorAnalysisDataPart;
        onOpen: () => void;
      }

      function CompetitorAnalysisPreview({ data, onOpen }: CompetitorAnalysisPreviewProps) {
        const insightsCount = data.payload?.searchInsights.length ?? 0;
        const trendSummary = data.payload?.googleTrends;
        const trendLabel = trendSummary?.success
          ? `${trendSummary.interestOverTime.length} points \u2022 ${trendSummary.topRegions.length} regions`
          : 'Unavailable';
        const durationLabel =
          typeof data.durationMs === 'number'
            ? `${Math.max(0.1, data.durationMs / 1000).toFixed(1)}s`
            : undefined;

        const handleOpen = () => {
          if (!data.error) {
            onOpen();
          }
        };

        return (
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !data.error) {
                event.preventDefault();
                onOpen();
              }
            }}
            className="rounded-xl border border-sky-200 bg-white/70 p-4 shadow-sm outline-none transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold">
                  BrightData Competitor Snapshot
                </p>
                <h4 className="mt-1 text-base font-semibold text-gray-900">{data.query}</h4>
              </div>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                BrightData
              </Badge>
            </div>

            {data.error ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {data.error}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2 shadow-inner">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Web signals</p>
                  <p className="text-sm font-semibold text-gray-900">{insightsCount}</p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2 shadow-inner">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Trend coverage</p>
                  <p className="text-sm font-semibold text-gray-900">{trendLabel}</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                Generated {formatGeneratedLabel(data.generatedAt)} via BrightData
                {durationLabel ? ` \u2022 ${durationLabel}` : ''}
              </span>
              {!data.error && <span className="text-sky-600">Click to expand</span>}
            </div>
          </div>
        );
      }

      function formatGeneratedLabel(timestamp: string) {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
          return 'just now';
        }

        const now = Date.now();
        const diffMs = date.getTime() - now;
        const diffMinutes = Math.round(diffMs / 60000);

        const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

        if (Math.abs(diffMinutes) < 60) {
          return rtf.format(diffMinutes, 'minute');
        }

        const diffHours = Math.round(diffMs / 3600000);
        if (Math.abs(diffHours) < 24) {
          return rtf.format(diffHours, 'hour');
        }

        return date.toLocaleString();
      }
