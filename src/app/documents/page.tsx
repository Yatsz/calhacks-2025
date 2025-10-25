"use client";

import { useState } from "react";
import Link from "next/link";

interface Collection {
  name: string;
  metadata?: Record<string, unknown>;
}

interface QueryResult {
  documents: string[];
  distances: number[];
  metadatas: Record<string, unknown>[];
}

export default function DocumentsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [documents, setDocuments] = useState("");
  const [queryText, setQueryText] = useState("");
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  // List all collections
  const listCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/collections");
      const data = await response.json();
      if (data.success) {
        setCollections(data.collections);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error fetching collections: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new collection
  const createCollection = async () => {
    if (!newCollectionName.trim()) {
      alert("Please enter a collection name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCollectionName,
          metadata: { description: "Test collection" },
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Collection created successfully!");
        setNewCollectionName("");
        listCollections(); // Refresh the list
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error creating collection: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Add documents to a collection
  const addDocuments = async () => {
    if (!selectedCollection || !documents.trim()) {
      alert("Please select a collection and enter documents");
      return;
    }

    setLoading(true);
    try {
      const docArray = documents.split("\n").filter((doc) => doc.trim());
      const response = await fetch(
        `/api/collections/${selectedCollection}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documents: docArray,
            metadatas: docArray.map((_, index) => ({ index })),
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("Documents added successfully!");
        setDocuments("");
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error adding documents: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Query a collection
  const queryCollection = async () => {
    if (!selectedCollection || !queryText.trim()) {
      alert("Please select a collection and enter a query");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/collections/${selectedCollection}/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            queryTexts: [queryText],
            nResults: 3,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setQueryResults(data.results);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error querying collection: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Navigation */}
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← Back to Chat
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
          Chroma Cloud Client Demo
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Collections Management */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              Collections Management
            </h2>

            <div className="space-y-4">
              <div>
                <button
                  onClick={listCollections}
                  disabled={loading}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "List Collections"}
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="New collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2 text-black dark:text-white bg-white dark:bg-zinc-800"
                />
                <button
                  onClick={createCollection}
                  disabled={loading}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Create Collection
                </button>
              </div>

              {collections.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-black dark:text-white">
                    Collections:
                  </h3>
                  <div className="space-y-1">
                    {collections.map((collection, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        {collection.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Document Operations */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              Document Operations
            </h2>

            <div className="space-y-4">
              <div>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-black dark:text-white bg-white dark:bg-zinc-800"
                >
                  <option value="">Select a collection</option>
                  {collections.map((collection, index) => (
                    <option key={index} value={collection.name}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-white">
                  Documents (one per line):
                </label>
                <textarea
                  value={documents}
                  onChange={(e) => setDocuments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded text-black dark:text-white bg-white dark:bg-zinc-800"
                  placeholder="Enter documents, one per line..."
                />
                <button
                  onClick={addDocuments}
                  disabled={loading}
                  className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 mt-2"
                >
                  Add Documents
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Query text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-black dark:text-white bg-white dark:bg-zinc-800 mb-2"
                />
                <button
                  onClick={queryCollection}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  Query Collection
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Query Results */}
        {queryResults && (
          <div className="mt-8 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              Query Results
            </h2>
            <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-auto">
              {JSON.stringify(queryResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
