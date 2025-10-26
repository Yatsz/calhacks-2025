/**
 * BrightData API Client Utilities
 *
 * Helper functions to interact with BrightData search and scraping endpoints
 */

interface SearchResult {
  success: boolean;
  results: any[];
  query: string;
}

interface ScrapeResult {
  success: boolean;
  markdown: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Perform a web search using BrightData
 *
 * @param query - The search query string
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Search results
 *
 * @example
 * const results = await searchWeb("best marketing strategies 2025");
 * console.log(results.results);
 */
export async function searchWeb(
  query: string,
  maxResults: number = 10
): Promise<SearchResult> {
  const response = await fetch("/api/brightdata/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, maxResults }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Search failed");
  }

  return response.json();
}

/**
 * Scrape a webpage and return its content as markdown
 *
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Scraped content as markdown
 *
 * @example
 * const result = await scrapeWebpage("https://example.com/article");
 * console.log(result.markdown);
 */
export async function scrapeWebpage(
  url: string,
  options?: {
    includeLinks?: boolean;
    includeImages?: boolean;
  }
): Promise<ScrapeResult> {
  const response = await fetch("/api/brightdata/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      includeLinks: options?.includeLinks ?? true,
      includeImages: options?.includeImages ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Scraping failed");
  }

  return response.json();
}

/**
 * Search for marketing content and scrape the top result
 *
 * @param query - The search query
 * @returns Combined search and scrape results
 *
 * @example
 * const content = await searchAndScrape("viral tiktok marketing campaigns");
 * console.log(content.scrapedContent);
 */
export async function searchAndScrape(query: string) {
  // First, search for the query
  const searchResults = await searchWeb(query, 5);

  if (!searchResults.success || searchResults.results.length === 0) {
    throw new Error("No search results found");
  }

  // Get the first result's URL
  const topResult = searchResults.results[0];
  const url = topResult.url || topResult.link;

  if (!url) {
    throw new Error("No URL found in search results");
  }

  // Scrape the top result
  const scrapedContent = await scrapeWebpage(url);

  return {
    query,
    searchResults: searchResults.results,
    topResultUrl: url,
    scrapedContent: scrapedContent.markdown,
    metadata: scrapedContent.metadata,
  };
}
