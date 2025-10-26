"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AddContentModal } from "@/components/adintelligence/AddContentModal";
import { Plus, Trash2 } from "lucide-react";
import {
  getContentItemsByCategory,
  createContentItem,
  deleteContentItem,
} from "@/lib/db";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text" | "link" | "campaign";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

export default function InspirationPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getContentItemsByCategory('inspiration');
      setItems(data);
    } catch (error) {
      console.error('Failed to load inspiration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (content: Omit<ContentItem, "id">) => {
    try {
      const newItem = await createContentItem(content, 'inspiration');
      if (newItem) {
        setItems((prev) => [newItem, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create inspiration:', error);
      alert('Failed to add inspiration. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete inspiration:', error);
      alert('Failed to delete inspiration. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="backdrop-blur-2xl bg-white/40 border-b border-white/40 shadow-lg">
        <div className="px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/film.svg" 
              alt="UGCIntel" 
              width={24} 
              height={24}
              className="w-6 h-6"
            />
            <span className="text-xl font-semibold text-gray-900 tracking-tight">UGCIntel</span>
          </Link>
        </div>
      </header>

      {/* Page Header */}
      <div className="container mx-auto px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Inspiration</h1>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-8 pb-12">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-600 mb-4">No inspiration content yet</p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Your First Inspiration
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="backdrop-blur-xl bg-white/60 rounded-xl border border-white/60 shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
              >
                {/* Preview */}
                <div className="aspect-square bg-gray-100 relative">
                  {item.type === "image" && item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === "video" && item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === "text" ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <p className="text-sm text-gray-700 line-clamp-6">
                        {item.text}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-gray-400">No preview</p>
                    </div>
                  )}
                  
                  {/* Delete button overlay */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Name */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddContentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}

