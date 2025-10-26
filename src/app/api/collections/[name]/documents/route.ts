import { NextRequest, NextResponse } from "next/server";
import { chromaService } from "@/lib/chroma";

// POST /api/collections/[name]/documents - Add documents to a collection
export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    const body = await request.json();
    const { documents, ids, metadatas, embeddings } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "Documents array is required and must not be empty" },
        { status: 400 }
      );
    }

    const result = await chromaService.addDocuments(
      name,
      documents,
      ids,
      metadatas,
      embeddings
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Added ${documents.length} document(s) to collection '${name}'`,
      result: result.result,
    });
  } catch (error) {
    console.error("Error in POST /api/collections/[name]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/collections/[name]/documents - Get all documents from a collection
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    const result = await chromaService.getCollectionData(name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in GET /api/collections/[name]/documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
