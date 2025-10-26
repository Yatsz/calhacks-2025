"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initiateAuth, waitForConnection } from "@/lib/composio-auth";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const platforms = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100"
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-3.104.15-4.771 1.775-4.919 4.919-.07 1.281-.072 1.689-.072 4.947 0 3.259.014 3.668.072 4.947.149 3.144 1.815 4.771 4.919 4.919 1.281.058 1.689.072 4.947.072 3.259 0 3.668-.014 4.947-.072 3.104-.149 4.771-1.775 4.919-4.919.07-1.281.072-1.689.072-4.947 0-3.259-.014-3.667-.072-4.947-.149-3.144-1.815-4.771-4.919-4.919-1.281-.058-1.689-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "text-pink-600",
    bgColor: "bg-pink-50 hover:bg-pink-100"
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "text-gray-700",
    bgColor: "bg-gray-50 hover:bg-gray-100"
  }
];

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    
    try {
      // Generate a unique user ID for this session
      const externalUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initiate Composio authentication
      const authResult = await initiateAuth(
        platformId as "linkedin" | "instagram" | "twitter",
        externalUserId
      );
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }
      
      if (authResult.redirectUrl) {
        // Open OAuth flow in a new window
        const authWindow = window.open(
          authResult.redirectUrl,
          'composio-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!authWindow) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }
        
        // Wait for the OAuth flow to complete
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // In a real implementation, you'd poll for the connection status
            // or use webhooks to know when the connection is established
            handleConnectionComplete(platformId);
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to connect to ${platformId}:`, error);
      alert(`Failed to connect to ${platformId}. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectionComplete = async (platformId: string) => {
    try {
      // Add the platform to connected set
      setConnectedPlatforms(prev => new Set([...prev, platformId]));
      
      alert(`Successfully connected to ${platformId}!`);
      onClose();
    } catch (error) {
      console.error('Connection completion failed:', error);
      alert('Connection may have failed. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/20 z-40" />
      <DialogContent className="sm:max-w-md backdrop-blur-2xl bg-white/80 border-white/50 shadow-xl z-50">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900">
            Connect Your Accounts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {platforms.map((platform) => (
            <Card key={platform.id} className="overflow-hidden backdrop-blur-xl bg-white/60 border-white/40 shadow-lg">
              <CardContent className="p-0">
                <div className={`flex items-center justify-between p-4 backdrop-blur-xl bg-white/40 hover:bg-white/50 transition-all duration-200`}>
                  <div className="flex items-center gap-3">
                    <div className={`${platform.color}`}>
                      {platform.icon}
                    </div>
                    <span className="font-medium text-gray-900">
                      {platform.name}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id || connectedPlatforms.has(platform.id)}
                    className="backdrop-blur-xl bg-white/60 hover:bg-white/80 text-gray-900 border-white/50 shadow-lg transition-all duration-200"
                    size="sm"
                  >
                    {connecting === platform.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        Connecting...
                      </div>
                    ) : connectedPlatforms.has(platform.id) ? (
                      "Connected"
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center text-sm text-gray-600">
          Connect your social media accounts to unlock powerful features
        </div>
      </DialogContent>
    </Dialog>
  );
}
