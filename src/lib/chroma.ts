import { CloudClient, Collection, Metadata, Where } from "chromadb";

interface AddDataRequest {
  ids: string[];
  documents: string[];
  metadatas: Metadata[];
}

// Initialize Chroma Cloud client
const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

export default client;

// Utility functions for collection operations
export class ChromaService {
  private client: CloudClient;
  private collection: Collection | null;

  constructor() {
    this.client = client;
    this.collection = null;
  }

  getMyCollection = async () => {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({
        name: "user_default",
      });
    }
    return this.collection;
  };

  // Check if document exists in collection by ID
  async documentExists(id: string): Promise<boolean> {
    try {
      const collection = await this.getMyCollection();
      const result = await collection.get({
        ids: [id],
      });
      return result.ids.length > 0;
    } catch (error) {
      console.error("Error checking document existence:", error);
      return false;
    }
  }

  // Add documents to a collection (with duplicate prevention)
  async addDocuments(data: AddDataRequest) {
    try {
      const collection = await this.getMyCollection();

      // Filter out duplicates if requested
      let filteredIds =
        data.ids || data.documents.map((_, index) => `${Date.now()}_${index}`);
      let filteredDocuments = data.documents;
      let filteredMetadatas = data.metadatas;

      const existingChecks = await Promise.all(
        filteredIds.map((id) => this.documentExists(id))
      );

      const indicesToKeep = existingChecks
        .map((exists, index) => (!exists ? index : -1))
        .filter((index) => index !== -1);

      if (indicesToKeep.length === 0) {
        return { success: true, result: null, skipped: filteredIds.length };
      }

      filteredIds = indicesToKeep.map((i) => filteredIds[i]);
      filteredDocuments = indicesToKeep.map((i) => filteredDocuments[i]);
      filteredMetadatas = indicesToKeep.map((i) => filteredMetadatas[i]);

      const result = await collection.add({
        ids: filteredIds,
        metadatas: filteredMetadatas,
        documents: filteredDocuments,
      });

      return { success: true, result, added: filteredIds.length };
    } catch (error) {
      console.error("Error adding documents:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Query documents from a collection
  async queryCollection(
    collectionName: string,
    queryTexts: string[],
    nResults: number = 5,
    where?: Where
  ) {
    try {
      const collection = await this.client.getCollection({
        name: collectionName,
      });

      const results = await collection.query({
        queryTexts,
        nResults,
        where,
      });

      return { success: true, results };
    } catch (error) {
      console.error("Error querying collection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const chromaService = new ChromaService();
