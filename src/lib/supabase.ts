import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Campaign {
  id: string;
  caption: string;
  media_type: 'image' | 'video' | null;
  media_url: string | null;
  media_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  category: 'inspiration' | 'content-library';
  type: 'image' | 'video' | 'pdf' | 'text' | 'link' | 'campaign';
  name: string;
  url: string | null;
  thumbnail: string | null;
  text_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  campaign_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// Helper function to convert database campaign to frontend format
export function dbCampaignToFrontend(dbCampaign: Campaign) {
  return {
    id: dbCampaign.id,
    caption: dbCampaign.caption,
    media: dbCampaign.media_url ? {
      type: dbCampaign.media_type as 'image' | 'video',
      url: dbCampaign.media_url,
      name: dbCampaign.media_name || undefined,
    } : null,
    createdAt: dbCampaign.created_at,
  };
}

// Helper function to convert frontend campaign to database format
export function frontendCampaignToDb(campaign: {
  caption: string;
  media: { type: 'image' | 'video'; url: string; name?: string } | null;
}) {
  return {
    caption: campaign.caption,
    media_type: campaign.media?.type || null,
    media_url: campaign.media?.url || null,
    media_name: campaign.media?.name || null,
  };
}

// Helper function to convert database content item to frontend format
export function dbContentItemToFrontend(dbItem: ContentItem) {
  return {
    id: dbItem.id,
    type: dbItem.type,
    name: dbItem.name,
    url: dbItem.url || undefined,
    thumbnail: dbItem.thumbnail || undefined,
    text: dbItem.text_content || undefined,
  };
}

// Helper function to convert frontend content item to database format
export function frontendContentItemToDb(
  item: {
    type: 'image' | 'video' | 'pdf' | 'text' | 'link' | 'campaign';
    name: string;
    url?: string;
    thumbnail?: string;
    text?: string;
  },
  category: 'inspiration' | 'content-library'
) {
  return {
    category,
    type: item.type,
    name: item.name,
    url: item.url || null,
    thumbnail: item.thumbnail || null,
    text_content: item.text || null,
  };
}

