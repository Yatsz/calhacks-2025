"use client";

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatbotPanel() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/40">
        <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Ask me anything about your campaign
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2 rounded-2xl text-sm bg-gray-900 text-white shadow-lg">
                      <div className="whitespace-pre-wrap break-words">
                        {message.parts.map((part) =>
                          part.type === 'text' ? part.text : null
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-900">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Assistant</div>
                    {message.parts.map((part, index) =>
                      part.type === 'text' ? (
                        <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
                          {part.text}
                        </ReactMarkdown>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))}
            {(status === 'submitted' || status === 'streaming') && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600">Assistant</div>
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="px-6 py-4 border-t border-white/40">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask anything..."
            disabled={status !== 'ready'}
            className="flex-1 backdrop-blur-xl bg-white/50 border-white/60 text-gray-900 placeholder:text-gray-500"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={status !== 'ready' || !inputValue.trim()}
            className="bg-gray-900 hover:bg-gray-800 shadow-lg text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
