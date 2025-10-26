# Supabase Setup with Storage and RLS

## 1. Create Storage Buckets

Run this in your Supabase SQL Editor:

```sql
-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('campaign-media', 'campaign-media', true, 52428800, ARRAY['image/*', 'video/*']),
  ('content-library', 'content-library', true, 52428800, ARRAY['image/*', 'video/*', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
```

## 2. Create Database Tables with RLS

Run this in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caption TEXT NOT NULL,
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
    media_url TEXT,
    media_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- ============================================
-- CONTENT_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_items (
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

CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON content_items(created_at DESC);

-- ============================================
-- CHAT_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_campaign_id ON chat_messages(campaign_id, created_at ASC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_items_updated_at ON content_items;
CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================
CREATE OR REPLACE VIEW campaigns_with_message_count AS
SELECT 
    c.*,
    COUNT(cm.id) as message_count
FROM campaigns c
LEFT JOIN chat_messages cm ON c.id = cm.campaign_id
GROUP BY c.id;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Public Access - No Auth Required)
-- Since you don't have authentication, allow all operations
-- ============================================

-- Campaigns policies
DROP POLICY IF EXISTS "Allow public read access to campaigns" ON campaigns;
CREATE POLICY "Allow public read access to campaigns"
ON campaigns FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to campaigns" ON campaigns;
CREATE POLICY "Allow public insert access to campaigns"
ON campaigns FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to campaigns" ON campaigns;
CREATE POLICY "Allow public update access to campaigns"
ON campaigns FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to campaigns" ON campaigns;
CREATE POLICY "Allow public delete access to campaigns"
ON campaigns FOR DELETE
TO anon, authenticated
USING (true);

-- Content items policies
DROP POLICY IF EXISTS "Allow public read access to content_items" ON content_items;
CREATE POLICY "Allow public read access to content_items"
ON content_items FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to content_items" ON content_items;
CREATE POLICY "Allow public insert access to content_items"
ON content_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to content_items" ON content_items;
CREATE POLICY "Allow public update access to content_items"
ON content_items FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to content_items" ON content_items;
CREATE POLICY "Allow public delete access to content_items"
ON content_items FOR DELETE
TO anon, authenticated
USING (true);

-- Chat messages policies
DROP POLICY IF EXISTS "Allow public read access to chat_messages" ON chat_messages;
CREATE POLICY "Allow public read access to chat_messages"
ON chat_messages FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert access to chat_messages" ON chat_messages;
CREATE POLICY "Allow public insert access to chat_messages"
ON chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to chat_messages" ON chat_messages;
CREATE POLICY "Allow public update access to chat_messages"
ON chat_messages FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to chat_messages" ON chat_messages;
CREATE POLICY "Allow public delete access to chat_messages"
ON chat_messages FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- STORAGE POLICIES (Public Access)
-- ============================================

-- Campaign media storage policies
DROP POLICY IF EXISTS "Allow public read access to campaign-media" ON storage.objects;
CREATE POLICY "Allow public read access to campaign-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "Allow public insert access to campaign-media" ON storage.objects;
CREATE POLICY "Allow public insert access to campaign-media"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "Allow public update access to campaign-media" ON storage.objects;
CREATE POLICY "Allow public update access to campaign-media"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "Allow public delete access to campaign-media" ON storage.objects;
CREATE POLICY "Allow public delete access to campaign-media"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'campaign-media');

-- Content library storage policies
DROP POLICY IF EXISTS "Allow public read access to content-library" ON storage.objects;
CREATE POLICY "Allow public read access to content-library"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-library');

DROP POLICY IF EXISTS "Allow public insert access to content-library" ON storage.objects;
CREATE POLICY "Allow public insert access to content-library"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'content-library');

DROP POLICY IF EXISTS "Allow public update access to content-library" ON storage.objects;
CREATE POLICY "Allow public update access to content-library"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'content-library');

DROP POLICY IF EXISTS "Allow public delete access to content-library" ON storage.objects;
CREATE POLICY "Allow public delete access to content-library"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'content-library');
```

## 3. Verify Setup

After running the SQL, verify in your Supabase dashboard:

1. **Storage** > Check that `campaign-media` and `content-library` buckets exist and are public
2. **Database** > **Tables** > Check that RLS is enabled (green shield icon)
3. **Database** > **Policies** > Verify policies exist for all tables

## Notes

- ✅ RLS is now **ENABLED** with public access policies
- ✅ Storage buckets are configured for images, videos, and PDFs
- ✅ File size limit: 50MB per file
- ✅ All operations (read, write, update, delete) are allowed for anonymous users
- ⚠️ For production with user authentication, update policies to restrict access per user

