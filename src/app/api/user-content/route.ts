import { NextRequest, NextResponse } from "next/server";
import { chromaService } from "@/lib/chroma";

// GET /api/user-content - Get user's content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const contentType = searchParams.get('type');
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const collectionName = `user_${userId}`;

    // If query provided, search user's collection
    if (query) {
      const result = await chromaService.queryCollection(
        collectionName,
        [query],
        limit
      );
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        userId,
        query,
        results: result.results
      });
    }

    // If content type specified, filter by metadata
    if (contentType) {
      const validTypes = ['inspiration', 'past-work', 'current-work'];
      if (!validTypes.includes(contentType)) {
        return NextResponse.json(
          { error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }

      const result = await chromaService.queryCollection(
        collectionName,
        [''], // Empty query to get all
        limit,
        { contentType }
      );
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        userId,
        contentType,
        results: result.results
      });
    }

    // Get all user content
    const result = await chromaService.getCollectionData(collectionName);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId,
      data: result.data
    });
  } catch (error) {
    console.error("Error in GET /api/user-content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user-content - Add content to user's collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      content, 
      contentType, 
      metadata = {}, 
      title, 
      description,
      tags = [],
      status = 'draft'
    } = body;

    if (!userId || !content || !contentType) {
      return NextResponse.json(
        { error: "userId, content, and contentType are required" },
        { status: 400 }
      );
    }

    const validTypes = ['inspiration', 'past-work', 'current-work'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const collectionName = `user_${userId}`;

    // Check if user collection exists, create if not
    const collectionResult = await chromaService.getCollection(collectionName);
    if (!collectionResult.success) {
      // Create user collection if it doesn't exist
      const createResult = await chromaService.createCollection(collectionName, {
        userId,
        description: `Content collection for user ${userId}`,
        createdAt: new Date().toISOString()
      });
      
      if (!createResult.success) {
        return NextResponse.json({ error: createResult.error }, { status: 500 });
      }
    }

    // Prepare document metadata
    const documentMetadata = {
      userId,
      title: title || 'Untitled',
      description: description || '',
      tags: tags,
      status: status,
      contentType: contentType,
      createdAt: new Date().toISOString(),
      ...metadata
    };

    // Add content to user's collection
    const result = await chromaService.addDocuments(
      collectionName,
      [content],
      undefined, // Let Chroma generate IDs
      [documentMetadata]
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Content added to user ${userId}'s collection`,
      userId,
      contentType,
      result: result.result
    });
  } catch (error) {
    console.error("Error in POST /api/user-content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user-content - Delete user's collection (GDPR compliance)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const collectionName = `user_${userId}`;
    const result = await chromaService.deleteCollection(collectionName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${userId}'s collection deleted successfully`
    });
  } catch (error) {
    console.error("Error in DELETE /api/user-content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
