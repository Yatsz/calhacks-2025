import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  UIMessage,
} from "ai";
import { updateCampaign } from "@/lib/db";
import { z } from "zod";
import { buildCompetitorAnalysisPayload } from "@/lib/competitor-analysis";
import type {
  CompetitorAnalysisDataPart,
  CompetitorAnalysisMetadata,
  CompetitorAnalysisPayload,
} from "@/types/competitor-analysis";

// Create AI clients
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as UIMessage[];

    // Check if this is a competitor analysis request
    const analysisResponse = await tryHandleCompetitorAnalysis(messages);
    if (analysisResponse) {
      return analysisResponse;
    }

    // Extract metadata from the last user message
    let campaignContext:
      | {
          id: string;
          caption: string;
          media: { type: "image" | "video"; url: string; name?: string } | null;
        }
      | undefined;
    let model: string | undefined;
    let toolApproval:
      | {
          approved: boolean;
          toolName: string;
          parameters: Record<string, unknown>;
        }
      | undefined;

    // Find the last user message and extract metadata
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      console.log("🔍 [API] Last user message:", lastUserMessage);
      const textPart = lastUserMessage.parts.find(
        (p: { type: string }) => p.type === "text"
      ) as { text?: string } | undefined;
      if (textPart?.text) {
        console.log("🔍 [API] Message text:", textPart.text);

        // Check for tool approval
        const approvalMatch = textPart.text.match(
          /<!--TOOL_APPROVAL:([\s\S]+?)-->/
        );
        if (approvalMatch) {
          console.log("🔍 [API] Found tool approval:", approvalMatch[1]);
          try {
            toolApproval = JSON.parse(approvalMatch[1]);
            textPart.text = textPart.text.replace(
              /\n\n<!--TOOL_APPROVAL:[\s\S]+?-->/,
              ""
            );
            console.log("✅ [API] Tool approval:", toolApproval);
          } catch (e) {
            console.error("❌ [API] Failed to parse tool approval:", e);
          }
        }

        const metadataMatch = textPart.text.match(/<!--METADATA:([\s\S]+?)-->/);
        if (metadataMatch) {
          console.log("🔍 [API] Found metadata match:", metadataMatch[1]);
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            campaignContext = metadata.campaignContext;
            model = metadata.model;

            // Remove metadata from the message text so AI doesn't see it
            textPart.text = textPart.text.replace(
              /\n\n<!--METADATA:[\s\S]+?-->/,
              ""
            );

            console.log("✅ [API] Extracted metadata from message");
            console.log(
              "✅ [API] campaignContext:",
              JSON.stringify(campaignContext, null, 2)
            );
            console.log("✅ [API] model:", model);
          } catch (e) {
            console.error("❌ [API] Failed to parse metadata:", e);
            console.error("❌ [API] Metadata string was:", metadataMatch[1]);
          }
        } else {
          console.log("⚠️ [API] No metadata found in message");
        }
      }
    }

    console.log("🟢 [API] Messages count:", messages.length);

    const sendImmediateMessage = (
      text: string,
      metadata?: CompetitorAnalysisMetadata | undefined
    ) => {
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const messageId = crypto.randomUUID();
          const textPartId = `${messageId}-text`;

          writer.write({
            type: "start",
            messageId,
            messageMetadata: metadata,
          });

          writer.write({ type: "text-start", id: textPartId });
          writer.write({ type: "text-delta", id: textPartId, delta: text });
          writer.write({ type: "text-end", id: textPartId });
          writer.write({ type: "finish" });
        },
      });

      return createUIMessageStreamResponse({ stream });
    };

    if (toolApproval && !campaignContext) {
      console.warn("⚠️ [API] Tool approval received without campaign context");
      toolApproval = undefined;
      return sendImmediateMessage(
        "⚠️ Unable to update campaign: no active campaign context."
      );
    }

    if (
      toolApproval &&
      campaignContext &&
      toolApproval.toolName === "updateCampaign"
    ) {
      const params = toolApproval.parameters ?? {};
      const requestedCaption =
        typeof params.caption === "string" ? params.caption : undefined;
      const mediaType =
        typeof params.mediaType === "string" &&
        (params.mediaType === "image" || params.mediaType === "video")
          ? params.mediaType
          : undefined;
      const mediaUrl =
        typeof params.mediaUrl === "string" ? params.mediaUrl : undefined;
      const mediaName =
        typeof params.mediaName === "string" ? params.mediaName : undefined;

      if (toolApproval.approved) {
        console.log("✅ [API] Processing approved updateCampaign tool call");

        try {
          const updateData: {
            caption: string;
            media: {
              type: "image" | "video";
              url: string;
              name?: string;
            } | null;
          } = {
            caption: campaignContext.caption,
            media: campaignContext.media,
          };

          if (requestedCaption !== undefined) {
            updateData.caption = requestedCaption;
          }

          if (mediaType && mediaUrl) {
            updateData.media = {
              type: mediaType,
              url: mediaUrl,
              name: mediaName,
            };
          }

          await updateCampaign(campaignContext.id, updateData);
          console.log("✅ [API] Campaign updated via approval");

          const confirmationLines: string[] = [
            "✅ Campaign updated successfully.",
          ];

          if (requestedCaption !== undefined) {
            const formattedCaption = requestedCaption
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n");

            confirmationLines.push(`**New caption:**\n${formattedCaption}`);
          }

          if (mediaType && mediaUrl) {
            confirmationLines.push(
              `**Media updated:** ${mediaType} • ${mediaUrl}`
            );
          }

          toolApproval = undefined;
          return sendImmediateMessage(confirmationLines.join("\n\n"));
        } catch (error) {
          console.error(
            "❌ [API] Failed to update campaign after approval:",
            error
          );
          toolApproval = undefined;
          return sendImmediateMessage(
            "⚠️ Failed to update the campaign after approval. Please try again."
          );
        }
      } else {
        console.log("🚫 [API] updateCampaign tool call rejected by user");
        toolApproval = undefined;
        return sendImmediateMessage(
          "🚫 Campaign update cancelled per your decision."
        );
      }
    }

    // Build system prompt with campaign context
    let systemPrompt = `You are an AI marketing campaign assistant, operating in a comprehensive marketing platform.

You are pair programming with a USER to help them build compelling marketing campaigns. Each time the USER sends a message, you have access to their current campaign state, referenced content, and previous conversation context.

You are an agent - please keep going until the user's query is completely resolved, before ending your turn. Autonomously resolve queries to the best of your ability. Only use tools when the user explicitly asks to update or modify the campaign.

**Your Goal**: Help users create engaging, authentic, and effective marketing campaigns across all channels through collaborative assistance.

**Key Responsibilities**:
1. Analyze campaign context and provide targeted, specific feedback
2. Help craft compelling campaign messaging that resonates with target audiences
3. Provide creative direction for content creation across all channels (social media, email, display ads, etc.)
4. Suggest improvements based on marketing best practices and data-driven insights
5. Analyze referenced content and draw actionable insights
6. Make content feel authentic, relatable, and strategically aligned with business objectives
7. Consider channel-specific best practices and audience behaviors
8. Help with brand voice, messaging consistency, and creative positioning

**When users reference content** (marked with ---REFERENCED CONTENT---):
- Carefully analyze the referenced material
- Focus your advice specifically on that content's context
- Draw meaningful connections between referenced content and campaign goals
- Suggest how to adapt or improve upon referenced material
- Highlight what works well and what could be enhanced
- Consider how to scale successful content across channels

When users request social media actions (e.g., "post this to Instagram", "share on LinkedIn"):
- Confirm the action and content before executing
- Ask for confirmation if the content needs refinement
- For Instagram posts, ALWAYS require media (image or video) - Instagram doesn't support text-only posts
- For LinkedIn and Twitter, media is optional
- After you provide the natural-language summary of the proposed post, embed a hidden directive using this exact format (no code fences, no visible JSON):

<!--SOCIAL_ACTION:{
  "type": "post_to_social",
  "platform": "instagram",
  "content": "Your post content here",
  "media": "media_url_required_for_instagram"
}-->

- Do not output \`\`\`action code blocks or any visible JSON payloads; rely on the hidden directive so the product surface can render the approval UI.

Important Instagram requirements:
- Instagram posts MUST include media (image or video)
- If user requests Instagram post without media, ask them to provide an image or video
- Use the media from referenced content if available

Best Practices for UGC Campaigns:
- Keep messaging authentic and relatable
- Use conversational language
- Include clear calls-to-action
- Highlight genuine user experiences
- Create emotional connections
- Be concise but impactful
**Best Practices for Marketing Campaigns**:
- Keep messaging authentic and aligned with brand voice
- Use conversational, engaging language that connects with the target audience
- Include clear, compelling calls-to-action
- Highlight key benefits and value propositions
- Create emotional connections through storytelling
- Be concise but impactful - every word should serve a purpose
- Optimize for the specific channel and audience
- Consider the customer journey and how this campaign fits into the broader strategy

**Your Communication Style**:
- Be encouraging and supportive - you're a collaborative partner, not a critic
- Be specific and actionable - vague advice isn't helpful
- Explain your reasoning so users learn and improve
- Use examples to illustrate your points
- Ask clarifying questions when needed
- Celebrate wins and be constructive about improvements
- Provide data-driven insights when available

Remember: You're helping real people create real campaigns that will reach real audiences. The quality of your advice directly impacts their marketing success.`;

    // Add campaign context if editing a campaign
    if (campaignContext) {
      systemPrompt += `\n\n**CURRENT CAMPAIGN CONTEXT**:
You are currently working on campaign ID: ${campaignContext.id}
Current caption: "${campaignContext.caption}"
Current media: ${
        campaignContext.media
          ? `${campaignContext.media.type} at ${campaignContext.media.url}`
          : "No media attached"
      }

**IMPORTANT INSTRUCTIONS FOR CAMPAIGN UPDATES**:
- You have access to the updateCampaign tool to modify this campaign
- When the user asks you to "update", "change", "modify", "set", or "rewrite" the campaign caption, you MUST use the updateCampaign tool
- Examples of when to use the tool:
  - "Update the caption to..."
  - "Change it to..."  
  - "Make the caption say..."
  - "Rewrite this as..."
- After you briefly describe the proposed change (one or two sentences), IMMEDIATELY call the updateCampaign tool in the same turn—no delays or follow-up questions.
- Never ask the user if you should apply the update or wait for them to confirm. The approval UI handles consent.
- When the tool call is finished, acknowledge that you've submitted the update for their approval or confirm success if already approved
- Always refer to this specific campaign when providing feedback or suggestions`;
    }

    // Define tool for updating campaigns
    const updateCampaignTool = {
      updateCampaign: {
        description:
          "Update the current campaign with a new caption or media. Use this when the user explicitly asks you to update, change, or modify the campaign content. IMPORTANT: Always explain what changes you are proposing before calling this tool.",
        inputSchema: z.object({
          caption: z
            .string()
            .optional()
            .describe(
              "The updated campaign caption or messaging. Only include if the user wants to change the caption."
            ),
          mediaType: z
            .enum(["image", "video"])
            .optional()
            .describe(
              "The type of media to add to the campaign. Required if adding/updating media."
            ),
          mediaUrl: z
            .string()
            .optional()
            .describe(
              "The URL or path to the media file. Required if adding/updating media."
            ),
          mediaName: z
            .string()
            .optional()
            .describe("Optional name for the media file."),
        }),
        execute: async ({
          caption,
          mediaType,
          mediaUrl,
          mediaName,
        }: {
          caption?: string;
          mediaType?: "image" | "video";
          mediaUrl?: string;
          mediaName?: string;
        }) => {
          console.log("🔧 [TOOL] updateCampaign called!");
          console.log("🔧 [TOOL] Parameters:", {
            caption,
            mediaType,
            mediaUrl,
            mediaName,
          });

          if (!campaignContext) {
            console.error("❌ [TOOL] No campaign context available");
            return {
              error:
                "No campaign is currently being edited. Cannot update campaign.",
            };
          }

          // Check if this is an approved execution
          if (
            toolApproval?.approved &&
            toolApproval.toolName === "updateCampaign"
          ) {
            console.log("✅ [TOOL] Executing approved tool call");
            try {
              console.log("🔧 [TOOL] Updating campaign:", campaignContext.id);

              const updateData: {
                caption: string;
                media: {
                  type: "image" | "video";
                  url: string;
                  name?: string;
                } | null;
              } = {
                caption: campaignContext.caption,
                media: campaignContext.media,
              };

              // Only update fields that are provided
              if (
                caption !== undefined &&
                caption !== campaignContext.caption
              ) {
                console.log("🔧 [TOOL] Updating caption to:", caption);
                updateData.caption = caption;
              }

              if (mediaUrl && mediaType) {
                console.log(
                  "🔧 [TOOL] Updating media to:",
                  mediaType,
                  mediaUrl
                );
                updateData.media = {
                  type: mediaType as "image" | "video",
                  url: mediaUrl,
                  name: mediaName,
                };
              }

              await updateCampaign(campaignContext.id, updateData);
              console.log("✅ [TOOL] Campaign updated successfully");

              return {
                success: true,
                message: "Campaign updated successfully",
                updatedCaption: updateData.caption !== campaignContext.caption,
                updatedMedia: Boolean(mediaUrl && mediaType),
                campaign: {
                  id: campaignContext.id,
                  caption: updateData.caption,
                  media: updateData.media,
                },
              };
            } catch (error) {
              console.error("❌ [TOOL] Error updating campaign:", error);
              return { error: "Failed to update campaign. Please try again." };
            }
          } else if (
            toolApproval?.approved === false &&
            toolApproval.toolName === "updateCampaign"
          ) {
            console.log("❌ [TOOL] Tool call rejected by user");
            return {
              success: false,
              message: "Update cancelled by user",
              rejected: true,
            };
          } else {
            // First time tool is called - return pending approval
            console.log("⏸️ [TOOL] Waiting for user approval");
            return {
              requiresApproval: true,
              toolName: "updateCampaign",
              parameters: { caption, mediaType, mediaUrl, mediaName },
              message: "Waiting for user approval to update campaign",
            };
          }
        },
      },
    };

    // Select the appropriate model
    const selectedModel = model || "claude-4.5";

    console.log("🎯 [API] Selecting model:", selectedModel);
    console.log("🎯 [API] Model value type:", typeof selectedModel);

    let aiModel;
    let modelName = "Claude Sonnet 4.5"; // For logging

    switch (selectedModel) {
      case "claude-4.5":
        aiModel = anthropic("claude-sonnet-4-5-20250929");
        modelName = "Claude Sonnet 4.5";
        break;
      case "gemini-2.5-flash":
        aiModel = google("gemini-2.5-flash-lite");
        modelName = "Gemini 2.5 Flash";
        break;
      case "qwen-3-32b":
        aiModel = groq("qwen/qwen3-32b");
        modelName = "Qwen 3-32B";
        break;
      case "llama-guard":
        aiModel = groq("meta-llama/llama-guard-4-12b");
        modelName = "Llama Guard 4-12B";
        break;
      case "gpt-oss-20b":
        aiModel = groq("openai/gpt-oss-20b");
        modelName = "GPT-OSS-20B";
        break;
      default:
        console.warn(
          "⚠️ [API] Unknown model, defaulting to Claude:",
          selectedModel
        );
        aiModel = anthropic("claude-sonnet-4-5-20250929");
        modelName = "Claude Sonnet 4.5 (default)";
    }

    console.log("🎯 [API] Using model:", modelName);
    console.log("🔧 [API] Campaign context available?", !!campaignContext);
    console.log("🔧 [API] Tool will be available?", !!campaignContext);

    // Stream the response using Vercel AI SDK
    const result = campaignContext
      ? streamText({
          model: aiModel,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          tools: updateCampaignTool,
          onFinish: () => {
            console.log("✅ [API] Response streaming finished");
          },
        })
      : streamText({
          model: aiModel,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
        });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
const ANALYSIS_TRIGGER = "!analysis";

type UITextPart = Extract<
  UIMessage["parts"][number],
  { type: "text"; text: string }
>;

async function tryHandleCompetitorAnalysis(
  messages: UIMessage[]
): Promise<Response | null> {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) {
    return null;
  }

  const lastMessage = messages[lastUserIndex];
  const messageText = getMessageText(lastMessage).trim();

  if (!messageText.toLowerCase().startsWith(ANALYSIS_TRIGGER)) {
    return null;
  }

  const userInstruction =
    messageText.replace(/^!analysis\s*/i, "").trim() || messageText;

  const executionStart = Date.now();

  const stream = createUIMessageStream<
    UIMessage<
      CompetitorAnalysisMetadata,
      { "competitor-analysis": CompetitorAnalysisDataPart }
    >
  >({
    execute: async ({ writer }) => {
      const messageId = crypto.randomUUID();
      const textPartId = `${messageId}-text`;

      const metadata: CompetitorAnalysisMetadata = {
        kind: "brightdata-analysis",
        query: userInstruction,
      };

      writer.write({ type: "start", messageId, messageMetadata: metadata });
      writer.write({ type: "text-start", id: textPartId });

      let payload: CompetitorAnalysisPayload | undefined;
      let errorMessage: string | undefined;

      try {
        payload = await buildCompetitorAnalysisPayload(userInstruction);
      } catch (error: unknown) {
        console.error("Competitor analysis error:", error);
        errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to gather BrightData insights";
      }

      if (errorMessage) {
        writer.write({
          type: "text-delta",
          id: textPartId,
          delta: `\n\n⚠️ BrightData tool call failed: ${errorMessage}.`,
        });
      } else {
        writer.write({
          type: "text-delta",
          id: textPartId,
          delta: "\n\n📡 Powered by BrightData SERP research.",
        });
      }

      writer.write({ type: "text-end", id: textPartId });

      const dataPart: CompetitorAnalysisDataPart = {
        query: userInstruction,
        payload,
        error: errorMessage,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - executionStart,
        source: "brightdata",
      };

      writer.write({
        type: "data-competitor-analysis",
        id: messageId,
        data: dataPart,
      });

      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function findLastUserMessageIndex(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return i;
    }
  }
  return -1;
}

function getMessageText(message: UIMessage) {
  if (!message?.parts?.length) return "";
  return message.parts
    .filter(
      (part): part is UITextPart =>
        part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("\n");
}
