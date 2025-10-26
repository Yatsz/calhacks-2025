import {
  supabase,
  Campaign,
  ContentItem,
  ChatMessage,
  dbCampaignToFrontend,
  frontendCampaignToDb,
  dbContentItemToFrontend,
  frontendContentItemToDb,
} from './supabase';

// ============================================
// CAMPAIGN OPERATIONS
// ============================================

export async function getAllCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbCampaignToFrontend);
}

export async function getCampaignById(id: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data ? dbCampaignToFrontend(data) : null;
}

export async function createCampaign(campaign: {
  caption: string;
  media: { type: 'image' | 'video'; url: string; name?: string } | null;
}) {
  const dbCampaign = frontendCampaignToDb(campaign);
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert(dbCampaign)
    .select()
    .single();

  if (error) throw error;
  return data ? dbCampaignToFrontend(data) : null;
}

export async function updateCampaign(
  id: string,
  campaign: {
    caption: string;
    media: { type: 'image' | 'video'; url: string; name?: string } | null;
  }
) {
  const dbCampaign = frontendCampaignToDb(campaign);
  
  const { data, error } = await supabase
    .from('campaigns')
    .update(dbCampaign)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data ? dbCampaignToFrontend(data) : null;
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CONTENT ITEM OPERATIONS
// ============================================

export async function getContentItemsByCategory(
  category: 'inspiration' | 'content-library'
) {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbContentItemToFrontend);
}

export async function createContentItem(
  item: {
    type: 'image' | 'video' | 'pdf' | 'text' | 'link' | 'campaign';
    name: string;
    url?: string;
    thumbnail?: string;
    text?: string;
  },
  category: 'inspiration' | 'content-library'
) {
  const dbItem = frontendContentItemToDb(item, category);
  
  const { data, error } = await supabase
    .from('content_items')
    .insert(dbItem)
    .select()
    .single();

  if (error) throw error;
  return data ? dbContentItemToFrontend(data) : null;
}

export async function deleteContentItem(id: string) {
  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CHAT MESSAGE OPERATIONS
// ============================================

export async function getChatMessagesByCampaign(campaignId: string | null) {
  const query = supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true });

  // If campaignId is null, get messages without a campaign
  if (campaignId === null) {
    query.is('campaign_id', null);
  } else {
    query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return (data || []).map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.created_at,
  }));
}

export async function createChatMessage(message: {
  campaignId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
}) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      campaign_id: message.campaignId,
      role: message.role,
      content: message.content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateChatMessages(messages: Array<{
  campaignId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
}>) {
  const dbMessages = messages.map((msg) => ({
    campaign_id: msg.campaignId,
    role: msg.role,
    content: msg.content,
  }));

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(dbMessages)
    .select();

  if (error) throw error;
  return data;
}

export async function deleteChatMessagesByCampaign(campaignId: string) {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('campaign_id', campaignId);

  if (error) throw error;
}

// ============================================
// COMBINED OPERATIONS
// ============================================

export async function getCampaignWithChatHistory(campaignId: string) {
  const [campaign, chatMessages] = await Promise.all([
    getCampaignById(campaignId),
    getChatMessagesByCampaign(campaignId),
  ]);

  return {
    ...campaign,
    chatHistory: chatMessages,
  };
}

