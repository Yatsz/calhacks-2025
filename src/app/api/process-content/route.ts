import { NextRequest, NextResponse } from "next/server";
import { updateContentItem } from "@/lib/db";
import { chromaService } from "@/lib/chroma";

/**
 * Background processing endpoint for content items
 * 1. Updates Supabase with the summary
 * 2. Adds the document to Chroma for vector search
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type, url, name, category, summary: providedSummary } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing content item id" },
        { status: 400 }
      );
    }

    // Use provided summary if available, otherwise use name as fallback
    const summary = providedSummary || name || "No description available";

    // Update Supabase with the summary (async)
    if (summary) {
      try {
        await updateContentItem(id, { text: summary });
      } catch (error) {
        console.error("Failed to update Supabase:", error);
      }
    }

    // Add to Chroma
    try {
      const documentText = summary || name || "No description available";
      const result = await chromaService.addDocuments({
        ids: [id],
        documents: [documentText],
        metadatas: [
          {
            type,
            name,
            url: url || "",
            category: category || "unknown",
            hasMedia: !!(type === "image" || type === "video"),
          },
        ],
      });

      return NextResponse.json({
        success: true,
        summary,
        chromaResult: result,
      });
    } catch (error) {
      console.error("Failed to add to Chroma:", error);
      return NextResponse.json(
        {
          success: false,
          summary,
          error: "Failed to add to Chroma",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/process-content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
