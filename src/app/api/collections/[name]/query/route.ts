import { NextRequest, NextResponse } from "next/server";
import { chromaService } from "@/lib/chroma";

// POST /api/collections/[name]/query - Query documents in a collection
export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    const body = await request.json();
    const { queryTexts, nResults = 5, where } = body;

    if (!queryTexts || !Array.isArray(queryTexts) || queryTexts.length === 0) {
      return NextResponse.json(
        { error: "Query texts array is required and must not be empty" },
        { status: 400 }
      );
    }

    const result = await chromaService.queryCollection(
      name,
      queryTexts,
      nResults,
      where
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results: result.results,
    });
  } catch (error) {
    console.error("Error in POST /api/collections/[name]/query:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
