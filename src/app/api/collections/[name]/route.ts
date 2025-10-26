import { NextRequest, NextResponse } from "next/server";
import { chromaService } from "@/lib/chroma";

// GET /api/collections/[name] - Get a specific collection
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    const result = await chromaService.getCollection(name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      collection: result.collection,
    });
  } catch (error) {
    console.error("Error in GET /api/collections/[name]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[name] - Delete a specific collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    const result = await chromaService.deleteCollection(name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Collection '${name}' deleted successfully`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/collections/[name]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
