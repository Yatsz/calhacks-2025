"use client";

import { useState } from "react";
import { Header } from "@/components/adintelligence/Header";
import { ChatbotPanel } from "@/components/adintelligence/ChatbotPanel";
import { CampaignEditor } from "@/components/adintelligence/CampaignEditor";
import { ContentSection } from "@/components/adintelligence/ContentSection";
import { ContentPreviewModal } from "@/components/adintelligence/ContentPreviewModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ContentItem {
  id: string;
  type: "image" | "video" | "pdf" | "text";
  name: string;
  url?: string;
  thumbnail?: string;
  text?: string;
}

const contentTypes = [
  { id: "inspiration", label: "Inspiration", color: "#669CE4" },
  { id: "campaigns", label: "Past Campaigns", color: "#8462CF" },
  { id: "library", label: "Content Library", color: "#3FB855" },
];

export default function AdIntelligencePage() {
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState("inspiration");
  const [showMediaOnly, setShowMediaOnly] = useState(false);

  const activeColor = contentTypes.find(t => t.id === activeTab)?.color || "#669CE4";
  
  // Convert hex to RGB for the spotlight
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "102, 156, 228";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 transition-colors duration-700" />
      
      {/* Dynamic spotlight that changes with active tab */}
      <div 
        className="fixed top-20 left-20 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-700"
        style={{ 
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.3)`,
        }}
      />
      <div 
        className="fixed bottom-20 right-20 w-96 h-96 rounded-full blur-3xl transition-all duration-700"
        style={{ 
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.2)`,
        }}
      />
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-700"
        style={{ 
          backgroundColor: `rgba(${hexToRgb(activeColor)}, 0.15)`,
        }}
      />
      
      <div className="relative z-10">
        <Header />
        
        <div className="pt-[73px] h-screen flex gap-4 p-4">
          {/* Left Panel - Content Library with Tabs */}
          <div className="w-80 backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/40">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full backdrop-blur-xl bg-white/40 border border-white/50">
                  {contentTypes.map((type) => (
                    <TabsTrigger
                      key={type.id}
                      value={type.id}
                      className="flex-1 data-[state=active]:backdrop-blur-xl data-[state=active]:bg-white/60 !text-gray-900 font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.label.split(' ')[0]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Media Toggle */}
              <div className="flex items-center justify-between mt-4 px-2">
                <Label htmlFor="media-toggle" className="text-sm text-gray-700">
                  Media Only
                </Label>
                <Switch
                  id="media-toggle"
                  checked={showMediaOnly}
                  onCheckedChange={setShowMediaOnly}
                />
              </div>
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
                    />
                  </TabsContent>
                  <TabsContent value="campaigns" className="mt-0">
                    <ContentSection
                      title="Past Campaigns"
                      color="#8462CF"
                      showMediaOnly={showMediaOnly}
                      onContentClick={setSelectedContent}
                    />
                  </TabsContent>
                  <TabsContent value="library" className="mt-0">
                    <ContentSection
                      title="Content Library"
                      color="#3FB855"
                      showMediaOnly={showMediaOnly}
                      onContentClick={setSelectedContent}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Center - Campaign Editor */}
          <div className="flex-1 overflow-auto">
            <CampaignEditor />
          </div>

          {/* Right Panel - AI Assistant */}
          <div className="w-80 backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl shadow-xl overflow-hidden">
            <ChatbotPanel />
          </div>
        </div>
      </div>

      <ContentPreviewModal
        content={selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </div>
  );
}

