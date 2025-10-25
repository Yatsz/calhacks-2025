# Chat Application with Claude AI

A modern chat application built with Next.js, Vercel AI SDK, and Claude API with streaming support.

## Features

- 🤖 Powered by Claude Sonnet 4.5
- 💬 Real-time streaming responses
- 📝 Full markdown rendering with syntax highlighting
- 🎨 Beautiful, modern UI with dark mode support
- ⚡ Built with Next.js 16 and React 19
- 🎯 Type-safe with TypeScript
- 💻 Code syntax highlighting for 100+ languages

## Getting Started

### Prerequisites

- Node.js 18+ installed
- pnpm (or npm/yarn)
- An Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Set up your environment variables:

Create a `.env.local` file in the root directory:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Anthropic API key.

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
crea/
├── src/
│   └── app/
│       ├── api/
│       │   └── chat/
│       │       └── route.ts      # Chat API endpoint with streaming
│       ├── page.tsx               # Main chat UI component
│       ├── layout.tsx             # Root layout
│       └── globals.css            # Global styles
├── .env.local                     # Environment variables (create this)
└── package.json
```

## How It Works

### API Route (`src/app/api/chat/route.ts`)

The chat API endpoint:
- Receives messages from the client
- Uses Vercel AI SDK's `streamText` function
- Streams responses from Claude 3.5 Sonnet in real-time
- Returns a text stream response

### Chat UI (`src/app/page.tsx`)

The main chat interface:
- Uses Vercel AI SDK's `useChat` hook for state management
- Displays messages in a conversation format
- Renders markdown with `react-markdown` and GitHub Flavored Markdown support
- Syntax highlighting for code blocks using `react-syntax-highlighter`
- Auto-scrolls to the latest message
- Shows loading states during streaming
- Responsive design with Tailwind CSS

## Technologies Used

- **Next.js 16** - React framework with App Router
- **Vercel AI SDK** - Unified interface for AI models
- **Anthropic Claude** - AI model for chat responses
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React 19** - UI library

## Customization

### Change the AI Model

Edit `src/app/api/chat/route.ts`:

```typescript
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'), // Change model here
  messages,
});
```

Available models:
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Modify the UI

The chat interface is in `src/app/page.tsx`. You can customize:
- Colors and styling (Tailwind classes)
- Message layout and appearance
- Loading animations
- Header and footer content

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add your `ANTHROPIC_API_KEY` in the Environment Variables section
4. Deploy!

## License

MIT

## Learn More

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Next.js Documentation](https://nextjs.org/docs)
