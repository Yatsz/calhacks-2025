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
};

type AnalyzeResponse =
  | {
      summary: string;
    }
  | {
      error: string;
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

export async function POST(req: Request) {
  try {
    assertGeminiConfigured();

    const body: AnalyzeRequest = await req.json();
    const { url, type, name } = body;

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

    let fileUrl: URL;
    try {
      fileUrl = new URL(url);
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
      return new Response(
        JSON.stringify({
          error: "Gemini did not return a summary.",
        } satisfies AnalyzeResponse),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ summary } satisfies AnalyzeResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to analyze media with Gemini:", error);
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
