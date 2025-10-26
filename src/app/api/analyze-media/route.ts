import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const GEMINI_API_KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY,
});

const FALLBACK_IMAGE_TYPE = "image/jpeg";
const FALLBACK_VIDEO_TYPE = "video/mp4";

type AnalyzeRequest = {
  url?: string;
  type?: "image" | "video";
  name?: string;
  id?: string; // Content item ID for updating after analysis
  category?: string; // Category for Chroma processing
};

type AnalyzeResponse =
  | {
      summary: string;
    }
  | {
      error: string;
    }
  | {
      accepted: true;
      message: string;
    };

async function resolveMediaType(
  url: string,
  fallback: string
): Promise<string> {
  try {
    const headResponse = await fetch(url, { method: "HEAD" });
    if (headResponse.ok) {
      return headResponse.headers.get("content-type") || fallback;
    }
  } catch (error) {
    console.warn("Failed to resolve media type via HEAD request:", error);
  }

  return fallback;
}

function assertGeminiConfigured(): void {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }
}

/**
 * Background processing function that analyzes media with Gemini
 * and automatically updates the database and Chroma
 */
async function processMediaAnalysis(
  url: string,
  type: "image" | "video",
  name: string | undefined,
  id: string | undefined,
  category: string | undefined
): Promise<void> {
  try {
    console.log(`[Background] Starting media analysis for ${id || url}`);

    const fileUrl = new URL(url);

    const mediaType =
      type === "image"
        ? await resolveMediaType(url, FALLBACK_IMAGE_TYPE)
        : await resolveMediaType(url, FALLBACK_VIDEO_TYPE);

    const promptIntro =
      type === "image"
        ? "Analyze this user-generated image created for advertising purposes."
        : "Analyze this user-generated video created for advertising purposes.";

    const { text } = await generateText({
      model: google("models/gemini-2.5-flash"),
      system:
        "You are an expert creative strategist evaluating user-generated advertising content. Provide a single concise paragraph explaining what the asset depicts, the tone, on-screen subjects, actions, and relevance for UGC marketing campaigns. Highlight any hooks or calls to action that would matter to performance marketers.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${promptIntro} Summarize what you see in one paragraph, focusing on details that a performance marketer would care about.`,
            },
            {
              type: "file",
              data: fileUrl,
              mediaType,
              filename: name,
            },
          ],
        },
      ],
    });

    const summary = text?.trim();

    if (!summary) {
      console.error(`[Background] Gemini did not return a summary for: ${url}`);
      return;
    }

    console.log(`[Background] Generated summary for ${id || url}: ${summary.substring(0, 100)}...`);

    // If we have an ID and category, automatically update the database and Chroma
    // This calls process-content which handles both Supabase update and Chroma insertion
    // NOTE: This is the ONLY path for media items to reach process-content
    // (ensureContentInChroma skips media with summaries to prevent duplicate processing)
    if (id && category) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-content`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              type,
              url,
              name,
              category,
              summary,
            }),
          }
        );

        if (response.ok) {
          console.log(`[Background] Successfully processed content for ${id}`);
        } else {
          console.error(`[Background] Failed to process content for ${id}:`, response.status);
        }
      } catch (error) {
        console.error(`[Background] Failed to call process-content for ${id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Background] Failed to analyze media with Gemini:", error);
  }
}

export async function POST(req: Request) {
  try {
    assertGeminiConfigured();

    const body: AnalyzeRequest = await req.json();
    const { url, type, name, id, category } = body;

    // Quick validation and exit path
    if (!url || !type) {
      return new Response(
        JSON.stringify({
          error: "Missing url or type.",
        } satisfies AnalyzeResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid media URL.",
        } satisfies AnalyzeResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Start background processing without waiting
    // This will analyze the media and automatically update DB + Chroma
    processMediaAnalysis(url, type, name, id, category).catch((error) => {
      console.error("Background media analysis failed:", error);
    });

    // Return immediately with accepted status
    return new Response(
      JSON.stringify({
        accepted: true,
        message: "Media analysis job accepted and processing in background",
      }),
      {
        status: 202, // 202 Accepted
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to accept media analysis job:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      } satisfies AnalyzeResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
