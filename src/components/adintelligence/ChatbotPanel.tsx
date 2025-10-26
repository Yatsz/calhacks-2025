"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Send,
  FileText,
  Lightbulb,
  FolderOpen,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getContentItemsByCategory, getAllCampaigns } from "@/lib/db";
import type { UIMessage } from "ai";
import type {
  CompetitorAnalysisDataPart,
  CompetitorAnalysisMetadata,
} from "@/types/competitor-analysis";
import { CompetitorMindmapOverlay } from "./CompetitorMindmapOverlay";

/*****************
 * Types
 *****************/
interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

interface CampaignMedia {
  type: "image" | "video";
  url: string;
  name?: string;
}

interface Campaign {
  id: string;
  media: CampaignMedia | null;
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
  campaignContext?: {
    id: string;
    caption: string;
    media: CampaignMedia | null;
  } | null;
  onCampaignContextUpdate?: (context: {
    id: string;
    caption: string;
    media: CampaignMedia | null;
  }) => void;
}

interface SocialAction {
  type: "post_to_social";
  platform: "instagram" | "linkedin" | "twitter";
  content: string;
  media?: string;
}

type SocialActionStatus = "pending" | "executing" | "success" | "error";

interface SocialActionState {
  status: SocialActionStatus;
  message?: string;
}

type ChatMessage = UIMessage<
  CompetitorAnalysisMetadata,
  { "competitor-analysis": CompetitorAnalysisDataPart }
> & {
  toolInvocations?: Array<{
    state: "call" | "result" | "partial-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
};

type ChatMessagePart = ChatMessage["parts"][number];

type CompetitorPart = Extract<
  ChatMessagePart,
  { type: "data-competitor-analysis" }
>;

type ToolCallPart = Extract<ChatMessagePart, { type: `tool-${string}` }>;

const isCompetitorAnalysisPart = (
  part: ChatMessagePart
): part is CompetitorPart => part.type === "data-competitor-analysis";

const isToolCallPart = (part: ChatMessagePart): part is ToolCallPart =>
  typeof part.type === "string" && part.type.startsWith("tool-");

const getToolNameFromPart = (toolCall: ToolCallPart) => {
  if (
    typeof toolCall.output === "object" &&
    toolCall.output !== null &&
    "toolName" in toolCall.output
  ) {
    const name = (toolCall.output as { toolName?: unknown }).toolName;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }

  return toolCall.type.startsWith("tool-")
    ? toolCall.type.slice("tool-".length)
    : toolCall.type;
};

/*****************
 * Helpers
 *****************/
const ANALYSIS_TRIGGER = "!analysis";

const stripHiddenDirectives = (text: string) =>
  text
    .replace(/\n\n<!--METADATA:[\s\S]+?-->/, "")
    .replace(/\n\n<!--TOOL_APPROVAL:[\s\S]+?-->/, "")
    .trim();

const shouldHideUserMessageText = (text: string, raw?: string) => {
  if (!text) return true;

  const normalized = text.trim();
  if (!normalized) return true;

  const isAutoApprovalText =
    normalized === "Execute approved action" || normalized === "Cancel action";

  if (isAutoApprovalText) {
    return raw?.includes("<!--TOOL_APPROVAL:") ?? false;
  }

  return false;
};

const ACTION_COMMENT_REGEX = /<!--SOCIAL_ACTION:([\s\S]*?)-->/g;

const parseActionFromText = (text: string): SocialAction | null => {
  const commentMatch = text.match(/<!--SOCIAL_ACTION:([\s\S]*?)-->/);
  if (commentMatch) {
    try {
      return JSON.parse(commentMatch[1]);
    } catch (error) {
      console.error("Failed to parse social action comment:", error);
      return null;
    }
  }

  const codeMatch = text.match(/```action\n([\s\S]*?)\n```/);
  if (codeMatch) {
    try {
      return JSON.parse(codeMatch[1]);
    } catch (error) {
      console.error("Failed to parse action:", error);
      return null;
    }
  }
  return null;
};

const stripActionBlocks = (text: string) =>
  text
    .replace(ACTION_COMMENT_REGEX, "")
    .replace(/\n{3,}/g, "\n\n");

const buildSocialActionKey = (messageId: string, action: SocialAction) =>
  `${messageId}:${JSON.stringify(action)}`;

const normalizeCampaignMedia = (media: unknown): CampaignMedia | null => {
  if (
    media &&
    typeof media === "object" &&
    "type" in media &&
    "url" in media &&
    typeof (media as { type?: unknown }).type === "string" &&
    typeof (media as { url?: unknown }).url === "string"
  ) {
    const type = (media as { type: string }).type;
    const url = (media as { url: string }).url;
    if ((type === "image" || type === "video") && url.length > 0) {
      const name =
        typeof (media as { name?: unknown }).name === "string"
          ? ((media as { name: string }).name as string)
          : undefined;
      return {
        type,
        url,
        name,
      };
    }
  }
  return null;
};

function formatReferenceContext(references: ReferenceItem[]) {
  if (references.length === 0) return "";

  let context = "\n\n---REFERENCED CONTENT---\n";
  references.forEach((ref, index) => {
    context += `\n[Reference ${index + 1} - ${ref.type}]: ${ref.label}\n`;
    if ("caption" in ref.data) {
      const campaign = ref.data as Campaign;
      if (campaign.caption) context += `Caption: ${campaign.caption}\n`;
      if (campaign.media)
        context += `Has media: Yes (${campaign.media.type})\n`;
    } else {
      const item = ref.data as ContentItem;
      if (item.text) context += `Content: ${item.text}\n`;
      if (item.type) context += `Type: ${item.type}\n`;
      if (item.url) context += "Has media: Yes\n";
    }
  });
  context += "---END REFERENCED CONTENT---\n\n";

  return context;
}

/*****************
 * Components
 *****************/
function ActionApprovalCard(
  props:
    | {
        variant: "tool";
        toolCall: ToolCallPart;
        onApprove: () => void;
        onReject: () => void;
      }
    | {
        variant: "social";
        action: SocialAction;
        status: SocialActionStatus;
        statusMessage?: string;
        onApprove: () => void;
        onReject: () => void;
      }
) {
  if (props.variant === "tool") {
    const { toolCall, onApprove, onReject } = props;

    console.log("🎨 [ActionApprovalCard] Rendering tool call:", toolCall);
    console.log(
      "🎨 [ActionApprovalCard] requiresApproval:",
      toolCall.output && typeof toolCall.output === "object"
        ? (toolCall.output as Record<string, unknown>)?.requiresApproval
        : undefined
    );

    if (
      toolCall.state !== "output-available" ||
      !toolCall.output ||
      typeof toolCall.output !== "object" ||
      !(toolCall.output as { requiresApproval?: boolean }).requiresApproval
    ) {
      console.log(
        "⚠️ [ActionApprovalCard] Not rendering - no approval required"
      );
      return null;
    }

    const output = toolCall.output as {
      requiresApproval?: boolean;
      parameters?: Record<string, unknown>;
      message?: string;
    };
    const inputParams =
      toolCall.input && typeof toolCall.input === "object"
        ? (toolCall.input as Record<string, unknown>)
        : undefined;
    const params = output.parameters || inputParams || {};
    const caption = params.caption as string | undefined;

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-amber-600 font-semibold">
              Campaign Update Request
            </p>
            <h4 className="mt-1 text-sm font-semibold text-gray-900">
              Approve this change?
            </h4>
          </div>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-100 text-amber-700"
          >
            Pending
          </Badge>
        </div>

        {caption && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-white/60 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              New Caption
            </p>
            <div className="text-sm text-gray-900 whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
              {caption}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={onApprove}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Accept
          </Button>
          <Button
            onClick={onReject}
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Reject
          </Button>
        </div>
      </div>
    );
  }

  const { action, status, statusMessage, onApprove, onReject } = props;

  const statusMeta: Record<
    SocialActionStatus,
    { badgeClass: string; cardClass: string; label: string; accent: string }
  > = {
    pending: {
      badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
      cardClass: "border-amber-200 bg-amber-50/70",
      label: "Pending",
      accent: "text-amber-600",
    },
    executing: {
      badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
      cardClass: "border-blue-200 bg-blue-50/70",
      label: "Posting",
      accent: "text-blue-600",
    },
    success: {
      badgeClass: "border-green-200 bg-green-100 text-green-700",
      cardClass: "border-green-200 bg-green-50/70",
      label: "Posted",
      accent: "text-green-600",
    },
    error: {
      badgeClass: "border-red-200 bg-red-100 text-red-700",
      cardClass: "border-red-200 bg-red-50/70",
      label: "Error",
      accent: "text-red-600",
    },
  };

  const { badgeClass, cardClass, label, accent } = statusMeta[status];
  const acceptLabel =
    status === "success"
      ? "Accepted"
      : status === "executing"
      ? "Posting..."
      : status === "error"
      ? "Retry"
      : "Accept";
  const acceptDisabled = status === "executing" || status === "success";
  const rejectDisabled = status === "executing" || status === "success";
  const showReject = status !== "success";
  const statusMessageClass =
    status === "error"
      ? "text-red-700"
      : status === "success"
      ? "text-green-700"
      : "text-gray-600";

  return (
    <div className={`rounded-xl border ${cardClass} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p
            className={`text-[11px] uppercase tracking-wide font-semibold ${accent}`}
          >
            Social Posting Request
          </p>
          <h4 className="mt-1 text-sm font-semibold text-gray-900">
            Post to{" "}
            {action.platform.charAt(0).toUpperCase() + action.platform.slice(1)}
          </h4>
        </div>
        <Badge variant="outline" className={badgeClass}>
          {label}
        </Badge>
      </div>

      <div className="mb-4 rounded-lg border border-white/60 bg-white/60 p-3">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Post Content
        </p>
        <div className="text-sm text-gray-900 whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
          {action.content}
        </div>
      </div>

      {action.media && (
        <div className="mb-4 rounded-lg border border-white/60 bg-white/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Media
          </p>
          <div className="text-sm text-gray-900 break-words">
            {action.media}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onApprove}
          size="sm"
          disabled={acceptDisabled}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-70"
        >
          {status === "executing" ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              {acceptLabel}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              {acceptLabel}
            </>
          )}
        </Button>
        {showReject ? (
          <Button
            onClick={onReject}
            size="sm"
            variant="outline"
            disabled={rejectDisabled}
            className="border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-70"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        ) : null}
      </div>

      {statusMessage && (
        <div className={`mt-3 text-xs ${statusMessageClass}`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}

function CompetitorAnalysisPreview({
  data,
  onOpen,
}: {
  data: CompetitorAnalysisDataPart;
  onOpen: () => void;
}) {
  const hasSnapshot = Boolean(data.payload) && !data.error;
  type SnapshotState = "ready" | "pending" | "error";
  const snapshotState: SnapshotState = data.error
    ? "error"
    : hasSnapshot
    ? "ready"
    : "pending";

  const stateMeta: Record<
    SnapshotState,
    {
      cardClass: string;
      badgeClass: string;
      accentClass: string;
      calloutClass: string;
      message: string;
      statusLabel: string;
    }
  > = {
    ready: {
      cardClass: "border-sky-200 bg-sky-50/70",
      badgeClass: "border-sky-200 bg-white text-sky-600",
      accentClass: "text-sky-600",
      calloutClass: "border-sky-200 bg-white/60 text-sky-700",
      message: "BrightData snapshot ready. Open to view the full analysis.",
      statusLabel: "Ready",
    },
    pending: {
      cardClass: "border-amber-200 bg-amber-50/70",
      badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
      accentClass: "text-amber-600",
      calloutClass: "border-amber-200 bg-white/70 text-amber-700",
      message: "Generating BrightData snapshot…",
      statusLabel: "Preparing",
    },
    error: {
      cardClass: "border-red-200 bg-red-50/80",
      badgeClass: "border-red-200 bg-red-100 text-red-700",
      accentClass: "text-red-600",
      calloutClass: "border-red-200 bg-red-50 text-red-700",
      message: "",
      statusLabel: "Error",
    },
  };

  const {
    cardClass,
    badgeClass,
    accentClass,
    calloutClass,
    message,
    statusLabel,
  } = stateMeta[snapshotState];
  const isClickable = snapshotState === "ready";

  const handleOpen = () => {
    if (isClickable) onOpen();
  };

  return (
    <div
      role={isClickable ? "button" : undefined}
      aria-disabled={!isClickable}
      tabIndex={isClickable ? 0 : -1}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (!isClickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={`rounded-xl border p-4 shadow-sm outline-none transition ${
        cardClass
      } ${
        isClickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-400"
          : snapshotState === "pending"
          ? "cursor-wait"
          : "cursor-default"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-[11px] uppercase tracking-wide font-semibold ${accentClass}`}
          >
            BrightData Competitor Snapshot
          </p>
          <h4 className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
            {data.query}
          </h4>
        </div>
        <Badge
          variant="outline"
          className={badgeClass}
        >
          {statusLabel}
        </Badge>
      </div>

      {data.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {data.error}
        </div>
      ) : (
        <div
          className={`mt-4 rounded-lg border px-3 py-3 text-sm shadow-inner ${calloutClass}`}
        >
          {message}
        </div>
      )}

      {isClickable && (
        <div
          className={`mt-4 text-xs font-semibold uppercase tracking-wide ${accentClass}`}
        >
          Click to open snapshot
        </div>
      )}
    </div>
  );
}

export function ChatbotPanel({
  campaignContext,
  onCampaignContextUpdate,
}: ChatbotPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuItems, setSlashMenuItems] = useState<ReferenceItem[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<ReferenceItem[]>(
    []
  );
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    "claude-4.5" | "gemini-2.5-flash" | "qwen-3-32b" | "gpt-oss-20b"
  >("claude-4.5");
  const [analysisPending, setAnalysisPending] = useState(false);
  const [activeMindmap, setActiveMindmap] = useState<{
    messageId: string;
    data: CompetitorAnalysisDataPart;
  } | null>(null);
  const [dismissedToolCallIds, setDismissedToolCallIds] = useState<string[]>(
    []
  );
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [socialActionStatuses, setSocialActionStatuses] = useState<
    Record<string, SocialActionState>
  >({});
  const [dismissedSocialActionKeys, setDismissedSocialActionKeys] = useState<
    string[]
  >([]);
  const appliedCampaignUpdateIdsRef = useRef<Set<string>>(new Set());

  const applyCampaignUpdateFromParams = useCallback(
    (params?: Record<string, unknown>) => {
      if (!onCampaignContextUpdate || !campaignContext) return;

      const nextCaption =
        params && typeof params.caption === "string"
          ? (params.caption as string)
          : campaignContext.caption;

      let nextMedia: CampaignMedia | null = campaignContext.media ?? null;
      if (params) {
        const mediaType = params.mediaType;
        const mediaUrl = params.mediaUrl;
        if (
          typeof mediaType === "string" &&
          (mediaType === "image" || mediaType === "video") &&
          typeof mediaUrl === "string" &&
          mediaUrl.length > 0
        ) {
          const mediaName =
            typeof params.mediaName === "string"
              ? (params.mediaName as string)
              : campaignContext.media?.name;
          nextMedia = {
            type: mediaType,
            url: mediaUrl,
            name: mediaName,
          };
        }
      }

      onCampaignContextUpdate({
        id: campaignContext.id,
        caption: nextCaption,
        media: nextMedia,
      });
    },
    [campaignContext, onCampaignContextUpdate]
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Re-init chat on campaign/model change
  const chatId = `${campaignContext?.id || "no-campaign"}-${selectedModel}`;

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: (message) => {
      console.log("🎉 [useChat] Message finished:", message);
    },
  });

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const executeAction = async (action: SocialAction, actionKey: string) => {
    setSocialActionStatuses((prev) => ({
      ...prev,
      [actionKey]: {
        status: "executing",
        message: "Posting to social...",
      },
    }));

    try {
      const response = await fetch("/api/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: "user-123", // TODO: Get actual user ID
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();

      setSocialActionStatuses((prev) => ({
        ...prev,
        [actionKey]: {
          status: result.success ? "success" : "error",
          message:
            typeof result.message === "string"
              ? result.message
              : result.success
              ? "Action completed successfully."
              : "Action failed to complete.",
        },
      }));
    } catch (error) {
      console.error("Failed to execute social action:", error);
      setSocialActionStatuses((prev) => ({
        ...prev,
        [actionKey]: {
          status: "error",
          message: "Failed to execute action",
        },
      }));
    }
  };

  const handleSocialActionApprove = (
    actionKey: string,
    action: SocialAction
  ) => {
    setDismissedSocialActionKeys((prev) =>
      prev.filter((key) => key !== actionKey)
    );
    void executeAction(action, actionKey);
  };

  const handleSocialActionReject = (actionKey: string) => {
    setDismissedSocialActionKeys((prev) =>
      prev.includes(actionKey) ? prev : [...prev, actionKey]
    );
    setSocialActionStatuses((prev) => {
      if (!(actionKey in prev)) return prev;
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setDismissedToolCallIds([]);
  }, [chatId]);

  useEffect(() => {
    setSocialActionStatuses({});
    setDismissedSocialActionKeys([]);
    appliedCampaignUpdateIdsRef.current.clear();
  }, [chatId]);

  useEffect(() => {
    if (!onCampaignContextUpdate) return;

    messages.forEach((message) => {
      const chatMsg = message as ChatMessage;
      chatMsg.toolInvocations?.forEach((invocation) => {
        if (
          invocation.toolName === "updateCampaign" &&
          invocation.state === "result" &&
          invocation.result &&
          typeof invocation.result === "object"
        ) {
          if (appliedCampaignUpdateIdsRef.current.has(invocation.toolCallId)) {
            return;
          }

          const result = invocation.result as {
            success?: boolean;
            campaign?: {
              id?: string;
              caption?: string;
              media?: CampaignMedia | null;
            };
          };

          if (result?.success && result.campaign) {
            const { id, caption, media } = result.campaign;
            if (id && typeof caption === "string") {
              onCampaignContextUpdate({
                id,
                caption,
                media: normalizeCampaignMedia(media) ?? null,
              });
              appliedCampaignUpdateIdsRef.current.add(invocation.toolCallId);
              return;
            }
          }

          if (
            result?.success &&
            campaignContext &&
            invocation.args &&
            typeof invocation.args === "object"
          ) {
            applyCampaignUpdateFromParams(
              invocation.args as Record<string, unknown>
            );
            appliedCampaignUpdateIdsRef.current.add(invocation.toolCallId);
          }
        }
      });
    });
  }, [
    messages,
    onCampaignContextUpdate,
    campaignContext,
    applyCampaignUpdateFromParams,
  ]);

  // Set portal target once DOM is available
  useEffect(() => {
    if (typeof document !== "undefined") setPortalTarget(document.body);
  }, []);

  // Load slash menu items on mount
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingMenu(true);
        const items: ReferenceItem[] = [];

        const inspiration = await getContentItemsByCategory("inspiration");
        inspiration.forEach((item) => {
          items.push({
            type: "inspiration",
            icon: Lightbulb,
            color: "#669CE4",
            label: item.name,
            data: item as ContentItem,
          });
        });

        const library = await getContentItemsByCategory("content-library");
        library.forEach((item) => {
          items.push({
            type: "library",
            icon: FolderOpen,
            color: "#3FB855",
            label: item.name,
            data: item as ContentItem,
          });
        });

        const campaigns = await getAllCampaigns();
        campaigns.forEach((campaign) => {
          items.push({
            type: "campaign",
            icon: FileText,
            color: "#8462CF",
            label: campaign.caption
              ? campaign.caption.substring(0, 50) + "..."
              : "Untitled Campaign",
            data: campaign as Campaign,
          });
        });

        setSlashMenuItems(items);
      } catch (err) {
        console.error("Failed to load slash menu items:", err);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    load();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.endsWith("/")) {
      setShowSlashMenu(true);
      setSelectedMenuIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu && slashMenuItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMenuIndex((prev) => (prev + 1) % slashMenuItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMenuIndex(
          (prev) => (prev - 1 + slashMenuItems.length) % slashMenuItems.length
        );
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSelectReference(slashMenuItems[selectedMenuIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSelectReference = (item: ReferenceItem) => {
    setInputValue((prev) => prev.slice(0, -1)); // remove trailing '/'
    setSelectedReferences((prev) => [...prev, item]);
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  const removeReference = (index: number) => {
    setSelectedReferences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (toolApproval?: {
    approved: boolean;
    toolName: string;
    parameters: Record<string, unknown>;
  }) => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && selectedReferences.length === 0 && !toolApproval)
      return;

    // Build reference context
    const referenceContext = formatReferenceContext(selectedReferences);

    // Append campaign context and model as hidden metadata
    const metadata = {
      campaignContext,
      model: selectedModel,
    };
    const metadataString = `\n\n<!--METADATA:${JSON.stringify(metadata)}-->`;

    // Append tool approval if present
    const toolApprovalString = toolApproval
      ? `\n\n<!--TOOL_APPROVAL:${JSON.stringify(toolApproval)}-->`
      : "";

    const fullMessage =
      (inputValue ||
        (toolApproval?.approved
          ? "Execute approved action"
          : "Cancel action")) +
      referenceContext +
      metadataString +
      toolApprovalString;
    const isAnalysisCommand = trimmedInput
      .toLowerCase()
      .startsWith(ANALYSIS_TRIGGER);
    if (isAnalysisCommand) setAnalysisPending(true);

    try {
      await sendMessage({ text: fullMessage });
    } finally {
      if (isAnalysisCommand) setAnalysisPending(false);
      setInputValue("");
      setSelectedReferences([]);
    }
  };

  const handleToolApprove = (toolCall: ToolCallPart) => {
    const toolName = getToolNameFromPart(toolCall);
    const outputParams =
      toolCall.output && typeof toolCall.output === "object"
        ? (toolCall.output as { parameters?: Record<string, unknown> })
            .parameters
        : undefined;
    const inputParams =
      toolCall.input && typeof toolCall.input === "object"
        ? (toolCall.input as Record<string, unknown>)
        : undefined;
    const parameters = outputParams || inputParams || {};
    const approval = {
      approved: true,
      toolName,
      parameters,
    };
    void handleSendMessage(approval);
    setDismissedToolCallIds((prev) =>
      prev.includes(toolCall.toolCallId) ? prev : [...prev, toolCall.toolCallId]
    );
    if (toolName === "updateCampaign") {
      applyCampaignUpdateFromParams(parameters);
    }
  };

  const handleToolReject = (toolCall: ToolCallPart) => {
    const toolName = getToolNameFromPart(toolCall);
    const outputParams =
      toolCall.output && typeof toolCall.output === "object"
        ? (toolCall.output as { parameters?: Record<string, unknown> })
            .parameters
        : undefined;
    const inputParams =
      toolCall.input && typeof toolCall.input === "object"
        ? (toolCall.input as Record<string, unknown>)
        : undefined;
    const parameters = outputParams || inputParams || {};
    const approval = {
      approved: false,
      toolName,
      parameters,
    };
    void handleSendMessage(approval);
    setDismissedToolCallIds((prev) =>
      prev.includes(toolCall.toolCallId) ? prev : [...prev, toolCall.toolCallId]
    );
  };

  /***************
   * Render
   ***************/
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
              {messages.map((message) => {
                const chatMsg = message as ChatMessage;
                const textParts = chatMsg.parts.filter(
                  (part): part is Extract<ChatMessagePart, { type: "text" }> =>
                    part.type === "text"
                );
                const combinedText = textParts
                  .map((part) => part.text)
                  .join("\n");
                const candidateSocialAction =
                  message.role === "assistant"
                    ? parseActionFromText(combinedText)
                    : null;
                const socialPostAction =
                  candidateSocialAction?.type === "post_to_social"
                    ? candidateSocialAction
                    : null;
                const socialActionKey = socialPostAction
                  ? buildSocialActionKey(message.id, socialPostAction)
                  : null;
                const socialActionState =
                  (socialActionKey && socialActionStatuses[socialActionKey]) ||
                  undefined;
                const socialActionDismissed = socialActionKey
                  ? dismissedSocialActionKeys.includes(socialActionKey)
                  : false;

                if (message.role === "assistant") {
                  console.log("🔍 [ChatbotPanel] Assistant message:", message);
                  console.log("🔍 [ChatbotPanel] Parts:", chatMsg.parts);
                  console.log(
                    "🔍 [ChatbotPanel] ToolInvocations:",
                    chatMsg.toolInvocations
                  );
                  console.log(
                    "🔍 [ChatbotPanel] Parsed social action:",
                    socialPostAction
                  );
                }

                return (
                  <div key={message.id} className="space-y-2">
                    {message.role === "user" ? (
                      (() => {
                        const visibleTexts = textParts
                          .map((part) => {
                            const withoutDirectives = stripHiddenDirectives(
                              part.text
                            );
                            const withoutActions =
                              stripActionBlocks(withoutDirectives);
                            return {
                              raw: part.text,
                              cleaned: withoutActions,
                            };
                          })
                          .filter(
                            ({ cleaned, raw }) =>
                              !shouldHideUserMessageText(cleaned, raw)
                          )
                          .map(({ cleaned }) => cleaned)
                          .filter((text) => text.trim().length > 0);

                        if (visibleTexts.length === 0) {
                          return null;
                        }

                        return (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] px-4 py-2 rounded-2xl text-sm bg-gray-900 text-white shadow-lg">
                              <div className="whitespace-pre-wrap wrap-break-word">
                                {visibleTexts.map((text, index) => (
                                  <span key={index}>{text}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-gray-900">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Assistant
                        </div>
                        <div className="space-y-3">
                          {chatMsg.parts.map((part, index) => {
                            if (part.type === "text") {
                              const sanitized = stripActionBlocks(part.text);
                              if (!sanitized.trim()) {
                                return null;
                              }

                              return (
                                <div
                                  key={`text-${message.id}-${index}`}
                                  className="prose prose-sm max-w-none wrap-break-word"
                                >
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      a: (props) => (
                                        <a
                                          {...props}
                                          className="text-blue-600! hover:text-blue-800! underline"
                                        />
                                      ),
                                      p: (props) => (
                                        <p
                                          {...props}
                                          className="wrap-break-word text-gray-900!"
                                        />
                                      ),
                                      code: (props) => (
                                        <code
                                          {...props}
                                          className="text-gray-900! bg-gray-100! px-1 py-0.5 rounded"
                                        />
                                      ),
                                      blockquote: (props) => (
                                        <blockquote
                                          {...props}
                                          className="wrap-break-word text-gray-900! border-l-2 border-amber-200 bg-amber-50/60 px-3 py-2 rounded max-h-32 overflow-y-auto"
                                        />
                                      ),
                                      strong: (props) => (
                                        <strong
                                          {...props}
                                          className="text-gray-900! font-semibold"
                                        />
                                      ),
                                      em: (props) => (
                                        <em
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                      li: (props) => (
                                        <li
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                      h1: (props) => (
                                        <h1
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                      h2: (props) => (
                                        <h2
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                      h3: (props) => (
                                        <h3
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                      h4: (props) => (
                                        <h4
                                          {...props}
                                          className="text-gray-900!"
                                        />
                                      ),
                                    }}
                                  >
                                    {sanitized}
                                  </ReactMarkdown>
                                </div>
                              );
                            }

                            if (isCompetitorAnalysisPart(part)) {
                              const competitorPart = part;
                              return (
                                <CompetitorAnalysisPreview
                                  key={`analysis-${message.id}-${index}`}
                                  data={competitorPart.data}
                                  onOpen={() =>
                                    setActiveMindmap({
                                      messageId: message.id,
                                      data: competitorPart.data,
                                    })
                                  }
                                />
                              );
                            }

                            if (
                              isToolCallPart(part) &&
                              !dismissedToolCallIds.includes(part.toolCallId)
                            ) {
                              const toolCallPart = part;
                              return (
                                <ActionApprovalCard
                                  key={`tool-${message.id}-${index}`}
                                  variant="tool"
                                  toolCall={toolCallPart}
                                  onApprove={() =>
                                    handleToolApprove(toolCallPart)
                                  }
                                  onReject={() =>
                                    handleToolReject(toolCallPart)
                                  }
                                />
                              );
                            }

                            return null;
                          })}

                          {/* Render tool invocations */}
                          {chatMsg.toolInvocations?.map((invocation, idx) => {
                            console.log(
                              "🔍 [ChatbotPanel] Tool invocation:",
                              invocation
                            );
                            console.log(
                              "🔍 [ChatbotPanel] Invocation state:",
                              invocation.state
                            );
                            console.log(
                              "🔍 [ChatbotPanel] Invocation toolName:",
                              invocation.toolName
                            );
                            console.log(
                              "🔍 [ChatbotPanel] Invocation result:",
                              invocation.result
                            );

                            if (invocation.toolName === "updateCampaign") {
                              if (
                                dismissedToolCallIds.includes(
                                  invocation.toolCallId
                                )
                              ) {
                                return null;
                              }

                              const args =
                                (invocation.args as Record<string, unknown>) ||
                                {};

                              if (
                                invocation.state === "call" ||
                                invocation.state === "partial-call"
                              ) {
                                const toolCallPart = {
                                  type: `tool-${invocation.toolName}`,
                                  toolCallId: invocation.toolCallId,
                                  state: "output-available",
                                  input: args,
                                  output: {
                                    requiresApproval: true,
                                    toolName: invocation.toolName,
                                    parameters: args,
                                  },
                                } as ToolCallPart;

                                console.log(
                                  "✅ [ChatbotPanel] Rendering ActionApprovalCard (call state)"
                                );

                                return (
                                  <ActionApprovalCard
                                    key={`tool-inv-${message.id}-${idx}`}
                                    variant="tool"
                                    toolCall={toolCallPart}
                                    onApprove={() =>
                                      handleToolApprove(toolCallPart)
                                    }
                                    onReject={() =>
                                      handleToolReject(toolCallPart)
                                    }
                                  />
                                );
                              }

                              const result = invocation.result as
                                | {
                                    requiresApproval?: boolean;
                                    toolName?: string;
                                    parameters?: Record<string, unknown>;
                                    message?: string;
                                  }
                                | undefined;
                              console.log(
                                "🔍 [ChatbotPanel] Result object:",
                                result
                              );
                              console.log(
                                "🔍 [ChatbotPanel] requiresApproval?",
                                result?.requiresApproval
                              );

                              if (result?.requiresApproval) {
                                const toolCallPart = {
                                  type: `tool-${invocation.toolName}`,
                                  toolCallId: invocation.toolCallId,
                                  state: "output-available",
                                  input: args,
                                  output: result,
                                } as ToolCallPart;
                                console.log(
                                  "✅ [ChatbotPanel] Rendering ActionApprovalCard (result state)"
                                );
                                return (
                                  <ActionApprovalCard
                                    key={`tool-inv-${message.id}-${idx}`}
                                    variant="tool"
                                    toolCall={toolCallPart}
                                    onApprove={() =>
                                      handleToolApprove(toolCallPart)
                                    }
                                    onReject={() =>
                                      handleToolReject(toolCallPart)
                                    }
                                  />
                                );
                              }
                            }
                            return null;
                          })}

                          {socialPostAction &&
                          socialActionKey &&
                          !socialActionDismissed ? (
                            <ActionApprovalCard
                              key={`social-${message.id}`}
                              variant="social"
                              action={socialPostAction}
                              status={socialActionState?.status ?? "pending"}
                              statusMessage={socialActionState?.message}
                              onApprove={() =>
                                handleSocialActionApprove(
                                  socialActionKey,
                                  socialPostAction
                                )
                              }
                              onReject={() =>
                                handleSocialActionReject(socialActionKey)
                              }
                            />
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {analysisPending && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600 mb-2">
                    Assistant
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-800 px-3 py-1.5 text-xs shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    Calling BrightData competitor tool...
                  </div>
                </div>
              )}

              {(status === "submitted" || status === "streaming") && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600 mb-3">
                    Assistant
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="px-6 py-4 border-t border-white/40 relative">
        {showSlashMenu && (
          <div className="absolute bottom-full left-6 right-6 mb-2 backdrop-blur-2xl bg-white/90 border border-white/60 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
            {isLoadingMenu ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Loading...
              </div>
            ) : slashMenuItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No content available. Add inspiration, library items, or
                campaigns first.
              </div>
            ) : (
              <div className="py-2">
                {slashMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === selectedMenuIndex;
                  return (
                    <button
                      key={`${item.type}-${index}`}
                      onClick={() => handleSelectReference(item)}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                        isActive ? "bg-blue-100" : "hover:bg-gray-100"
                      }`}
                    >
                      <Icon
                        className="w-4 h-4 shrink-0"
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

        {selectedReferences.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedReferences.map((ref, index) => {
              const Icon = ref.icon;
              return (
                <div
                  key={`${ref.type}-${index}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs backdrop-blur-xl bg-white/60 border border-white/60"
                  style={{ borderColor: `${ref.color}40` }}
                >
                  <Icon className="w-3 h-3" style={{ color: ref.color }} />
                  <span className="text-gray-900 font-medium">{ref.label}</span>
                  <button
                    onClick={() => removeReference(index)}
                    className="text-gray-500 hover:text-red-600"
                    aria-label={`Remove ${ref.label}`}
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
            placeholder="Ask anything..."
            disabled={status !== "ready"}
            className="w-full min-h-[60px] pb-14 pt-3 px-3 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-500 resize-none"
          />

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2 bg-gray-50/50 border-t border-white/60">
            <Select
              value={selectedModel}
              onValueChange={(value) =>
                setSelectedModel(value as typeof selectedModel)
              }
            >
              <SelectTrigger className="h-8 px-3 text-xs bg-gray-800 hover:bg-gray-700 border-none text-white shadow-sm mr-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  <span className="font-medium">
                    {selectedModel === "claude-4.5"
                      ? "Claude 4.5"
                      : selectedModel === "gemini-2.5-flash"
                      ? "Gemini 2.5"
                      : selectedModel === "qwen-3-32b"
                      ? "Qwen 3-32B"
                      : selectedModel === "gpt-oss-20b"
                      ? "GPT-OSS-20B"
                      : selectedModel}
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

            <Button
              onClick={() => {
                void handleSendMessage();
              }}
              size="icon"
              disabled={
                status !== "ready" ||
                (!inputValue.trim() && selectedReferences.length === 0)
              }
              className="h-8 w-8 bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
