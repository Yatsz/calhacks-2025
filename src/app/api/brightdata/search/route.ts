import { NextRequest, NextResponse } from "next/server";

/**
 * BrightData Web Search API Endpoint
 *
 * Performs web searches using BrightData's search_engine tool
 *
 * Request body:
 * {
 *   "query": "search query",
 *   "maxResults": 10 (optional)
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const brightDataToken = process.env.BRIGHTDATA_TOKEN || "6671113e-e070-44b5-a940-b46b94a584c1";

    // BrightData MCP API endpoint for search
    const apiUrl = "https://mcp.brightdata.com/api/tools/call";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${brightDataToken}`,
      },
      body: JSON.stringify({
        tool: "search_engine",
        arguments: {
          query: query,
          max_results: maxResults,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BrightData API error:", errorText);
      return NextResponse.json(
        { error: "Failed to perform search" },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("BrightData search results:", data);

    return NextResponse.json({
      success: true,
      results: data.results || data,
      query: query,
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
