'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export default function Home() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <div className="flex h-screen w-full max-w-4xl flex-col p-4">
        {/* Header */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Chat with Claude
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Powered by Vercel AI SDK
              </p>
            </div>
            <Link 
              href="/documents" 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Document Management
            </Link>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  Start a conversation
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Type a message below to begin chatting with Claude
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold opacity-70">
                      {message.role === 'user' ? 'You' : 'Claude'}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {message.parts.map((part, index) =>
                        part.type === 'text' ? (
                          message.role === 'assistant' ? (
                            <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          ) : (
                            <div key={index} className="whitespace-pre-wrap break-words">
                              {part.text}
                            </div>
                          )
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(status === 'submitted' || status === 'streaming') && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg bg-zinc-100 px-4 py-2 dark:bg-zinc-700">
                    <div className="mb-1 text-xs font-semibold text-zinc-900 opacity-70 dark:text-zinc-50">
                      Claude
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput('');
            }
          }}
          className="mt-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={status !== 'ready'}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400"
            />
            <button
              type="submit"
              disabled={status !== 'ready' || !input.trim()}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-zinc-900"
            >
              {status === 'streaming' || status === 'submitted' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
