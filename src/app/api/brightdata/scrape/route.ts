import { NextRequest, NextResponse } from "next/server";

/**
 * BrightData Web Scraping API Endpoint
 *
 * Scrapes web pages and returns content as markdown using BrightData's scrape_as_markdown tool
 *
 * Request body:
 * {
 *   "url": "https://example.com",
 *   "includeLinks": true (optional),
 *   "includeImages": true (optional)
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { url, includeLinks = true, includeImages = false } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const brightDataToken = process.env.BRIGHTDATA_TOKEN || "6671113e-e070-44b5-a940-b46b94a584c1";

    // BrightData MCP API endpoint for scraping
    const apiUrl = "https://mcp.brightdata.com/api/tools/call";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${brightDataToken}`,
      },
      body: JSON.stringify({
        tool: "scrape_as_markdown",
        arguments: {
          url: url,
          include_links: includeLinks,
          include_images: includeImages,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BrightData scraping error:", errorText);
      return NextResponse.json(
        { error: "Failed to scrape webpage" },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("BrightData scrape success for URL:", url);

    return NextResponse.json({
      success: true,
      markdown: data.content || data.markdown || data,
      url: url,
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error("Error scraping webpage:", error);
    return NextResponse.json(
      { error: "Failed to scrape webpage" },
      { status: 500 }
    );
  }
}
