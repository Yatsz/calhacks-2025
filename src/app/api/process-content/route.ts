import { NextRequest, NextResponse } from "next/server";
import { updateContentItem } from "@/lib/db";
import { chromaService } from "@/lib/chroma";

/**
 * Background processing function that updates Supabase and Chroma
 * This runs asynchronously without blocking the response
 */
async function processContentInBackground(
  id: string,
  type: string,
  url: string | undefined,
  name: string,
  category: string,
  summary: string
): Promise<void> {
  try {
    console.log(`[Background] Processing content ${id}`);

    // Update Supabase with the summary (only if we have one)
    if (summary) {
      try {
        const updatedItem = await updateContentItem(id, { summary });
        if (updatedItem) {
          console.log(`[Background] Updated Supabase for ${id} with summary`);
        } else {
          console.warn(
            `[Background] Content item ${id} not found in database - skipping Supabase update`
          );
        }
      } catch (error) {
        console.error("[Background] Failed to update Supabase:", error);
      }
    }

    // Add to Chroma (only if we have a valid summary)
    if (!summary) {
      console.log(
        `[Background] Skipping Chroma for ${id}: No summary available yet`
      );
      return;
    }

    console.log(
      `[Background] Adding to Chroma for ${id} with summary: ${summary.substring(
        0,
        100
      )}...`
    );

    await chromaService.addDocuments({
      ids: [id],
      documents: [summary],
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

    console.log(`[Background] Successfully processed content ${id}`);
  } catch (error) {
    console.error(`[Background] Failed to process content ${id}:`, error);
  }
}

/**
 * Background processing endpoint for content items
 * 1. Updates Supabase with the summary
 * 2. Adds the document to Chroma for vector search
 * Returns immediately with 202 Accepted status
 *
 * Call paths:
 * - Media items: analyze-media → process-content (automatic pipeline)
 * - Non-media items: ensureContentInChroma → process-content (direct call)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type, url, name, category, summary: providedSummary } = body;

    // Quick validation and exit path
    if (!id) {
      return NextResponse.json(
        { error: "Missing content item id" },
        { status: 400 }
      );
    }

    const summary = providedSummary || "";

    // Start background processing without waiting
    processContentInBackground(id, type, url, name, category, summary).catch(
      (error) => {
        console.error("Background content processing failed:", error);
      }
    );

    // Return immediately with accepted status
    return NextResponse.json(
      {
        accepted: true,
        message: "Content processing job accepted and running in background",
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    console.error("Error in POST /api/process-content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
