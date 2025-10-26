"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectModal } from "./ConnectModal";

export function Connect() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="backdrop-blur-xl bg-white/80 hover:bg-white/90 border-white/50 text-gray-900 hover:text-gray-900 transition-all duration-200 shadow-lg"
        onClick={() => setIsModalOpen(true)}
      >
        Connect Accounts
      </Button>
      
      <ConnectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
