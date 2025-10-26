import { Composio } from "@composio/core";

export interface SocialAction {
  type: "post_to_social";
  platform: "instagram" | "linkedin" | "twitter";
  content: string;
  media?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  actionId?: string;
}

// Initialize Composio client
function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  
  return new Composio({
    apiKey,
  });
}

export async function executeSocialAction(
  action: SocialAction,
  userId: string
): Promise<ActionResult> {
  try {
    console.log('Executing social action:', { action, userId });
    const composio = getComposioClient();

    // Get connected accounts for the user
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    console.log('Connected accounts:', accounts);
    
    const platformAccount = accounts.items.find(acc => 
      acc.toolkit.slug === action.platform || 
      acc.toolkit.slug?.toLowerCase().includes(action.platform)
    );

    if (!platformAccount) {
      console.log('No platform account found for:', action.platform);
      return { 
        success: false, 
        message: `No ${action.platform} account connected. Please connect your account first.` 
      };
    }

    console.log('Found platform account:', platformAccount);

    // Execute the action using Composio
    let result: any;
    
    switch (action.platform) {
      case 'instagram':
        // Instagram requires a two-step process: create media container, then create post
        if (action.media) {
          console.log('Creating Instagram media container with params:', {
            caption: action.content,
            image_url: action.media,
            content_type: 'photo'
          }); 
          const userInfoResult = await composio.tools.execute("INSTAGRAM_GET_USER_INFO", {
            userId,
            arguments: {} // No parameters needed
          });
          
          const igUserId = userInfoResult.data.id; 
          
          // Step 1: Create media container
          const mediaResult = await composio.tools.execute("INSTAGRAM_CREATE_MEDIA_CONTAINER", {
            userId,
            arguments: {
              ig_user_id: igUserId,
              caption: action.content,
              content_type: 'photo',
              image_url: action.media
            }
          });
          
          console.log('Media container result:', mediaResult);
          
          if (!mediaResult.successful) {
            throw new Error(`Failed to create media container: ${mediaResult.error}`);
          }
          
          console.log('Creating Instagram post with creation_id:', mediaResult.data.id);
          
          // Step 2: Create post using the creation_id
          result = await composio.tools.execute("INSTAGRAM_CREATE_POST", {
            userId,
            arguments: {
              ig_user_id: igUserId,
              creation_id: mediaResult.data.id
            }
          });
          
          console.log('Instagram post result:', result);
        } else {
          // Text-only post (not supported by Instagram API, but we can try)
          throw new Error('Instagram requires media for posts. Please provide an image or video.');
        }
        break;
        
      case 'linkedin':
        result = await composio.tools.execute("LINKEDIN_CREATE_POST", {
          userId,
          arguments: {
            text: action.content,
            ...(action.media && { media_url: action.media })
          }
        });
        break;
        
      case 'twitter':
        result = await composio.tools.execute("TWITTER_CREATE_POST", {
          userId,
          arguments: {
            text: action.content,
            ...(action.media && { media_url: action.media })
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported platform: ${action.platform}`);
    }

    // Check if the result was successful
    if (result.successful === false) {
      throw new Error(result.error || 'Action execution failed');
    }

    return { 
      success: true, 
      message: `Successfully posted to ${action.platform}!`,
      actionId: result.id || result.data?.id
    };
  } catch (error) {
    console.error('Social action execution failed:', error);
    return { 
      success: false, 
      message: `Failed to post to ${action.platform}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export async function checkConnectedAccounts(userId: string): Promise<{
  instagram: boolean;
  linkedin: boolean;
  twitter: boolean;
}> {
  try {
    const composio = getComposioClient();
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    
    return {
      instagram: accounts.items.some(acc => acc.toolkit.slug === 'instagram'),
      linkedin: accounts.items.some(acc => acc.toolkit.slug === 'linkedin'),
      twitter: accounts.items.some(acc => acc.toolkit.slug === 'twitter')
    };
  } catch (error) {
    console.error('Failed to check connected accounts:', error);
    return { instagram: false, linkedin: false, twitter: false };
  }
}
