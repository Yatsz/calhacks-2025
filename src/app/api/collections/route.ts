import { NextRequest, NextResponse } from "next/server";
import { chromaService } from "@/lib/chroma";

// GET /api/collections - List all collections
export async function GET() {
  try {
    const result = await chromaService.listCollections();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      collections: result.collections,
    });
  } catch (error) {
    console.error("Error in GET /api/collections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, metadata, contentType } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Validate content type if provided
    const validContentTypes = ["inspiration", "past-work", "current-work"];
    if (contentType && !validContentTypes.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Invalid content type. Must be one of: ${validContentTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Add content type to metadata
    const collectionMetadata = {
      ...metadata,
      contentType: contentType || "general",
      createdAt: new Date().toISOString(),
    };

    const result = await chromaService.createCollection(
      name,
      collectionMetadata
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Collection '${name}' created successfully`,
      collection: result.collection,
    });
  } catch (error) {
    console.error("Error in POST /api/collections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
