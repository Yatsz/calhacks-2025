import { ContentItem } from "./types";
import { chromaService } from "./chroma";
import { getUserId } from "./utils";

// Background task to sync content with Postman endpoint
export async function syncContentWithPostman(
  content: ContentItem[],
  section: string
) {
  try {
    // Get existing content from Chroma to check for duplicates using queryCollection with where clause
    const userId = getUserId();
    const collectionName = `user_${userId}_${section}`;
    const existingFilenames = new Set<string>();

    // Query for each content item to check if it already exists
    for (const item of content) {
      const queryResult = await chromaService.queryCollection(
        collectionName,
        [item.name], // Query by filename
        1, // Only need 1 result to check existence
        { name: item.name, section: item.section } // Where clause to filter by name and section
      );

      if (
        queryResult.success &&
        queryResult.results &&
        queryResult.results.ids &&
        queryResult.results.ids.length > 0
      ) {
        existingFilenames.add(item.name);
      }
    }

    // Filter out already processed files by checking against Chroma
    const newContent = content.filter((item) => {
      return !existingFilenames.has(item.name);
    });

    if (newContent.length === 0) {
      console.log("No new content to sync");
      return;
    }

    // Filter for media content only
    const mediaContent = newContent
      .filter(
        (item) =>
          item.type === "image" || item.type === "video" || item.type === "pdf"
      )
      .map((item) => ({
        id: item.id,
        content: item.url || item.text || "",
        metadata: {
          collection: collectionName,
          section: item.section,
          contentType: item.type,
          name: item.name,
        },
      }));

    if (mediaContent.length === 0) {
      console.log("No media content to sync");
      return;
    }

    // Call Postman endpoint
    const response = await fetch(
      process.env.NEXT_PUBLIC_POSTMAN_WORKFLOW_URL || "",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowName: "content-sync",
          parameters: {
            sectionName: section,
            mediaContent,
            timestamp: new Date().toISOString(),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Postman sync failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Content synced with Postman:", result);
  } catch (error) {
    console.error("Error syncing content with Postman:", error);
  }
}
