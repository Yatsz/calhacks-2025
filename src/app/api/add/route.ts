import { NextRequest, NextResponse } from "next/server";

import { chromaService } from "@/lib/chroma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, contentType, title, description, tags, status, metadata } =
      body;
    const result = await chromaService.addDocuments({
      ids: [content],
      documents: [content],
      metadatas: [metadata],
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/add:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
