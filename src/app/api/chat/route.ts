import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { updateCampaign } from "@/lib/db";
import { z } from "zod";

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

const SYSTEM_PROMPT = `You are an expert UGC (User Generated Content) campaign assistant with the ability to execute social media actions. Your role is to help users create compelling, authentic, and effective UGC marketing campaigns.

Key Responsibilities:
1. Help users craft engaging campaign captions and messaging
2. Provide creative direction for UGC content
3. Suggest improvements to campaigns based on best practices
4. Analyze referenced content (inspiration, previous campaigns, or library items) and provide insights
5. Help users understand what makes effective UGC
6. Execute social media actions when requested (post to Instagram, LinkedIn, Twitter)

When users reference content (marked with ---REFERENCED CONTENT---):
- Carefully analyze the referenced material
- Focus your advice specifically on that content
- Draw connections between the referenced content and the user's goals
- Suggest how to adapt or improve upon the referenced material
- Point out what works well and what could be enhanced

When users request social media actions (e.g., "post this to Instagram", "share on LinkedIn"):
- Confirm the action and content before executing
- Ask for confirmation if the content needs refinement
- For Instagram posts, ALWAYS require media (image or video) - Instagram doesn't support text-only posts
- For LinkedIn and Twitter, media is optional
- Respond with a structured action block in this format:

\`\`\`action
{
  "type": "post_to_social",
  "platform": "instagram",
  "content": "Your post content here",
  "media": "media_url_required_for_instagram"
}
\`\`\`

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

Always be encouraging, creative, and provide actionable advice. Help users feel confident in their campaign creation.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as UIMessage[];
    
    // Extract metadata from the last user message
    let campaignContext: { id: string; caption: string; media: { type: "image" | "video"; url: string; name?: string } | null } | undefined;
    let model: string | undefined;
    
    // Find the last user message and extract metadata
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      console.log('🔍 [API] Last user message:', lastUserMessage);
      const textPart = lastUserMessage.parts.find((p: { type: string }) => p.type === 'text') as { text?: string } | undefined;
      if (textPart?.text) {
        console.log('🔍 [API] Message text:', textPart.text);
        const metadataMatch = textPart.text.match(/<!--METADATA:([\s\S]+?)-->/);
        if (metadataMatch) {
          console.log('🔍 [API] Found metadata match:', metadataMatch[1]);
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            campaignContext = metadata.campaignContext;
            model = metadata.model;
            
            // Remove metadata from the message text so AI doesn't see it
            textPart.text = textPart.text.replace(/\n\n<!--METADATA:[\s\S]+?-->/, '');
            
            console.log('✅ [API] Extracted metadata from message');
            console.log('✅ [API] campaignContext:', JSON.stringify(campaignContext, null, 2));
            console.log('✅ [API] model:', model);
          } catch (e) {
            console.error('❌ [API] Failed to parse metadata:', e);
            console.error('❌ [API] Metadata string was:', metadataMatch[1]);
          }
        } else {
          console.log('⚠️ [API] No metadata found in message');
        }
      }
    }
    
    console.log('🟢 [API] Messages count:', messages.length);

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
Current media: ${campaignContext.media ? `${campaignContext.media.type} at ${campaignContext.media.url}` : 'No media attached'}

**IMPORTANT INSTRUCTIONS FOR CAMPAIGN UPDATES**:
- You have access to the updateCampaign tool to modify this campaign
- When the user asks you to "update", "change", "modify", "set", or "rewrite" the campaign caption, you MUST use the updateCampaign tool
- Examples of when to use the tool:
  - "Update the caption to..."
  - "Change it to..."  
  - "Make the caption say..."
  - "Rewrite this as..."
- After using the tool, confirm the update was successful
- Always refer to this specific campaign when providing feedback or suggestions`;
    }

    // Define tool for updating campaigns
    const updateCampaignTool = {
      updateCampaign: {
        description: 'Update the current campaign with a new caption or media. Use this when the user explicitly asks you to update, change, or modify the campaign content.',
        inputSchema: z.object({
          caption: z.string().optional().describe('The updated campaign caption or messaging. Only include if the user wants to change the caption.'),
          mediaType: z.enum(['image', 'video']).optional().describe('The type of media to add to the campaign. Required if adding/updating media.'),
          mediaUrl: z.string().optional().describe('The URL or path to the media file. Required if adding/updating media.'),
          mediaName: z.string().optional().describe('Optional name for the media file.'),
        }),
        execute: async ({ caption, mediaType, mediaUrl, mediaName }: { caption?: string; mediaType?: 'image' | 'video'; mediaUrl?: string; mediaName?: string }) => {
          console.log('🔧 [TOOL] updateCampaign called!');
          console.log('🔧 [TOOL] Parameters:', { caption, mediaType, mediaUrl, mediaName });
          
          if (!campaignContext) {
            console.error('❌ [TOOL] No campaign context available');
            return { error: 'No campaign is currently being edited. Cannot update campaign.' };
          }
      
          try {
            console.log('🔧 [TOOL] Updating campaign:', campaignContext.id);
            
            const updateData: { caption: string; media: { type: "image" | "video"; url: string; name?: string } | null } = {
              caption: campaignContext.caption,
              media: campaignContext.media,
            };
      
            // Only update fields that are provided
            if (caption !== undefined && caption !== campaignContext.caption) {
              console.log('🔧 [TOOL] Updating caption to:', caption);
              updateData.caption = caption;
            }
      
            if (mediaUrl && mediaType) {
              console.log('🔧 [TOOL] Updating media to:', mediaType, mediaUrl);
              updateData.media = {
                type: mediaType as "image" | "video",
                url: mediaUrl,
                name: mediaName,
              };
            }
      
            await updateCampaign(campaignContext.id, updateData);
            console.log('✅ [TOOL] Campaign updated successfully');
            
            return { 
              success: true, 
              message: 'Campaign updated successfully',
              updatedCaption: updateData.caption !== campaignContext.caption,
              updatedMedia: Boolean(mediaUrl && mediaType)
            };
          } catch (error) {
            console.error('❌ [TOOL] Error updating campaign:', error);
            return { error: 'Failed to update campaign. Please try again.' };
          }
        },
      },
    };

    // Select the appropriate model
    const selectedModel = model || "claude-4.5";
    
    console.log('🎯 [API] Selecting model:', selectedModel);
    console.log('🎯 [API] Model value type:', typeof selectedModel);
    
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
        console.warn('⚠️ [API] Unknown model, defaulting to Claude:', selectedModel);
        aiModel = anthropic("claude-sonnet-4-5-20250929");
        modelName = "Claude Sonnet 4.5 (default)";
    }
    
    console.log('🎯 [API] Using model:', modelName);
    console.log('🔧 [API] Campaign context available?', !!campaignContext);
    console.log('🔧 [API] Tool will be available?', !!campaignContext);

    // Stream the response using Vercel AI SDK
    const result = campaignContext 
      ? streamText({
          model: aiModel,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          tools: updateCampaignTool,
          onFinish: () => {
            console.log('✅ [API] Response streaming finished');
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
