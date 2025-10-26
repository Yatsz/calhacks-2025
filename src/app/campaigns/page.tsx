"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { getAllCampaigns, deleteCampaign } from "@/lib/db";

interface Campaign {
  id: string;
  media: { type: "image" | "video"; url: string; name?: string } | null;
  caption: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getAllCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      alert("Failed to delete campaign. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="backdrop-blur-2xl bg-white/40 border-b border-white/40 shadow-lg">
        <div className="px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/film.svg"
              alt="UGCIntel"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-xl font-semibold text-gray-900 tracking-tight">
              UGCIntel
            </span>
          </Link>
        </div>
      </header>

      {/* Page Header */}
      <div className="container mx-auto px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Campaigns</h1>
          <Link href="/adintelligence">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-8 pb-12">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-600">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-600 mb-4">No campaigns saved yet</p>
            <Link href="/adintelligence">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                Create Your First Campaign
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="backdrop-blur-xl bg-white/60 rounded-2xl border border-white/60 shadow-xl overflow-hidden hover:shadow-2xl transition-all group relative cursor-pointer"
              >
                <Link
                  href={`/adintelligence?edit=${campaign.id}`}
                  className="block"
                >
                  {/* Media Preview */}
                  <div className="aspect-square bg-gray-100 relative">
                    {campaign.media ? (
                      campaign.media.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={campaign.media.url}
                          alt="Campaign media"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={campaign.media.url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-400">No media</p>
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="p-4">
                    <p className="text-gray-900 text-sm line-clamp-3 mb-3">
                      {campaign.caption || "No caption"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>

                {/* Delete button overlay */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(campaign.id);
                  }}
                  className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
