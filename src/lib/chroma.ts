import { CloudClient, CollectionMetadata, Metadata, Where } from "chromadb";

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

  constructor() {
    this.client = client;
  }

  // Create a new collection
  async createCollection(name: string, metadata?: CollectionMetadata) {
    try {
      const collection = await this.client.createCollection({
        name,
        metadata: metadata || {},
      });
      return { success: true, collection };
    } catch (error) {
      console.error("Error creating collection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get an existing collection
  async getCollection(name: string) {
    try {
      const collection = await this.client.getCollection({ name });
      return { success: true, collection };
    } catch (error) {
      console.error("Error getting collection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // List all collections
  async listCollections() {
    try {
      const collections = await this.client.listCollections();
      return { success: true, collections };
    } catch (error) {
      console.error("Error listing collections:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Add documents to a collection
  async addDocuments(
    collectionName: string,
    documents: string[],
    ids?: string[],
    metadatas?: Metadata[],
    embeddings?: number[][]
  ) {
    try {
      const collection = await this.client.getCollection({
        name: collectionName,
      });

      const result = await collection.add({
        documents,
        ids: ids || documents.map((_, index) => `doc_${Date.now()}_${index}`),
        metadatas: metadatas || [],
        embeddings: embeddings || undefined,
      });

      return { success: true, result };
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

  // Get all documents from a collection
  async getCollectionData(collectionName: string) {
    try {
      const collection = await this.client.getCollection({
        name: collectionName,
      });

      const results = await collection.get();

      return { success: true, data: results };
    } catch (error) {
      console.error("Error getting collection data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Delete a collection
  async deleteCollection(name: string) {
    try {
      await this.client.deleteCollection({ name });
      return { success: true };
    } catch (error) {
      console.error("Error deleting collection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const chromaService = new ChromaService();
