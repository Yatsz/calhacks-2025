import { Composio } from "@composio/core";
import { AnthropicProvider } from "@composio/anthropic";
// Initialize Composio client
const composio = new Composio({
    //I AM LOSING TO AN API KEY ISSUE. I WILL DELETE THIS API KEY LATER.
  apiKey:'ak_YOpc4irKaNWex68yzYbN',
  //apiKey: process.env.COMPOSIO_API_KEY,
  provider: new AnthropicProvider(),
});

// Platform configuration mapping
const PLATFORM_CONFIGS = {
  linkedin: {
    authConfigId: "ac_PYShZdyZu4bT", // Replace with actual Composio auth config ID
    name: "LinkedIn"
  },
  instagram: {
    authConfigId: "ac_84BzfVHWGpoL", // Replace with actual Composio auth config ID
    name: "Instagram"
  },
  twitter: {
    authConfigId: "ac_YcoLFisLj7fG", // Replace with actual Composio auth config ID
    name: "X (Twitter)"
  }
};

export interface AuthResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  connectedAccountId?: string;
}

export async function initiateAuth(
  platformId: keyof typeof PLATFORM_CONFIGS,
  externalUserId: string
): Promise<AuthResult> {
  try {
    const config = PLATFORM_CONFIGS[platformId];
    if (!config) {
      return {
        success: false,
        error: `Unsupported platform: ${platformId}`
      };
    }

    // Create connection request
    const connectionRequest = await composio.connectedAccounts.link(
      externalUserId,
      config.authConfigId
    );

    return {
      success: true,
      redirectUrl: connectionRequest.redirectUrl,
      connectedAccountId: connectionRequest.id
    };
  } catch (error) {
    console.error(`Auth initiation failed for ${platformId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function waitForConnection(connectionId: string): Promise<AuthResult> {
  try {
    // This would typically be handled by polling or webhooks
    // For now, we'll simulate the connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      connectedAccountId: connectionId
    };
  } catch (error) {
    console.error('Connection wait failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export function getPlatformConfig(platformId: string) {
  return PLATFORM_CONFIGS[platformId as keyof typeof PLATFORM_CONFIGS];
}
