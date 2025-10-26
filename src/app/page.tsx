"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Image 
            src="/film.svg" 
            alt="Crea" 
            width={64} 
            height={64}
            className="w-16 h-16"
          />
          <h1 className="text-6xl font-bold text-gray-900">UGCIntel</h1>
        </div>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Create, manage, and optimize your UGC campaigns with AI-powered insights
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Link href="/adintelligence">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg">
              Start Creating
            </Button>
          </Link>
          <Link href="/campaigns">
            <Button variant="outline" className="px-8 py-6 text-lg border-2">
              View Campaigns
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Library</h3>
            <p className="text-gray-600 text-sm">
              Organize your inspiration, past campaigns, and media assets
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-gray-600 text-sm">
              Get help crafting the perfect campaign with Claude AI
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Manager</h3>
            <p className="text-gray-600 text-sm">
              Create, edit, and save campaigns with drag-and-drop simplicity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
