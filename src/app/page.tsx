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

            <ScrollArea className="flex-1">
              <div className="py-6">
                <Tabs value={activeTab} className="w-full">
                  <TabsContent value="inspiration" className="mt-0">
                    <ContentSection
                      title="Inspiration"
                      color="#669CE4"
                      showMediaOnly={showMediaOnly}
                      onContentClick={setSelectedContent}
                      items={contentItems.inspiration}
                      onItemsChange={(items) => setContentItems(prev => ({ ...prev, inspiration: items }))}
                    />
                  </TabsContent>
                  <TabsContent value="campaigns" className="mt-0">
                    <ContentSection
                      title="Past Campaigns"
                      color="#8462CF"
                      showMediaOnly={showMediaOnly}
                      onContentClick={setSelectedContent}
                      items={contentItems.campaigns}
                      onItemsChange={(items) => setContentItems(prev => ({ ...prev, campaigns: items }))}
                    />
                  </TabsContent>
                  <TabsContent value="library" className="mt-0">
                    <ContentSection
                      title="Content Library"
                      color="#3FB855"
                      showMediaOnly={showMediaOnly}
                      onContentClick={setSelectedContent}
                      items={contentItems.library}
                      onItemsChange={(items) => setContentItems(prev => ({ ...prev, library: items }))}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

            {/* Link Input Bar */}
            <div className="px-6 py-4 border-t border-white/40">
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isDownloading && linkInput.trim() && handleLinkSubmit()}
                  placeholder="Paste Instagram or TikTok link..."
                  className="flex-1 backdrop-blur-xl bg-white/50 border-white/60 text-gray-900 placeholder:text-gray-500"
                  disabled={isDownloading}
                />
                <Button
                  onClick={handleLinkSubmit}
                  size="icon"
                  disabled={!linkInput.trim() || isDownloading}
                  className="bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
                >
                  {isDownloading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                </Button>
              </div>
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
