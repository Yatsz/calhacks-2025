# Supabase Integration Setup

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Run the following SQL to create your database schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CAMPAIGNS TABLE
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caption TEXT NOT NULL,
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
    media_url TEXT,
    media_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- CONTENT_ITEMS TABLE
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(20) NOT NULL CHECK (category IN ('inspiration', 'content-library')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video', 'pdf', 'text', 'link', 'campaign')),
    name TEXT NOT NULL,
    url TEXT,
    thumbnail TEXT,
    text_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_items_category ON content_items(category);
CREATE INDEX idx_content_items_type ON content_items(type);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);

-- CHAT_MESSAGES TABLE
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_campaign_id ON chat_messages(campaign_id, created_at ASC);

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- VIEWS
CREATE VIEW campaigns_with_message_count AS
SELECT 
    c.*,
    COUNT(cm.id) as message_count
FROM campaigns c
LEFT JOIN chat_messages cm ON c.id = cm.campaign_id
GROUP BY c.id;

-- DISABLE ROW LEVEL SECURITY (no auth)
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- GRANT PUBLIC ACCESS
GRANT ALL ON campaigns TO anon, authenticated;
GRANT ALL ON content_items TO anon, authenticated;
GRANT ALL ON chat_messages TO anon, authenticated;
```

## Environment Variables Setup

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy your **Project URL** and **anon/public** key
3. Create a `.env.local` file in the root of your project with the following:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Replace `your-project-url-here` and `your-anon-key-here` with your actual values

## Installation Complete!

The following has been integrated:

✅ Supabase client library installed
✅ Database helper functions created (`src/lib/supabase.ts` and `src/lib/db.ts`)
✅ Campaign CRUD operations (create, read, update, delete)
✅ Content items (inspiration & library) CRUD operations
✅ Chat message storage per campaign
✅ All pages updated to use Supabase instead of localStorage

## What Was Changed

### Files Created:
- `src/lib/supabase.ts` - Supabase client and type definitions
- `src/lib/db.ts` - Database helper functions for all CRUD operations

### Files Updated:
- `src/components/adintelligence/CampaignEditor.tsx` - Now saves/loads campaigns from database
- `src/components/adintelligence/ContentSection.tsx` - Loads content items from database
- `src/components/adintelligence/ChatbotPanel.tsx` - Loads slash menu items from database
- `src/app/campaigns/page.tsx` - Loads campaigns from database
- `src/app/inspiration/page.tsx` - CRUD operations with database
- `src/app/library/page.tsx` - CRUD operations with database

## Testing

1. Start your development server: `pnpm dev`
2. Navigate to `/adintelligence` and create a campaign
3. Check your Supabase dashboard to see the data in the `campaigns` table
4. Add inspiration or library items and verify in the `content_items` table

## Notes

- All blob URLs from file uploads are still stored as-is in the database
- For production, consider using Supabase Storage for actual file hosting
- No authentication is required (as requested)
- All tables have public access enabled

