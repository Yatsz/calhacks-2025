import { NextRequest } from "next/server";
import { executeSocialAction, checkConnectedAccounts } from "@/lib/social-actions";

export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json();
    
    if (!action || !userId) {
      return Response.json(
        { success: false, message: "Missing action or userId" },
        { status: 400 }
      );
    }

    // Validate action structure
    if (action.type !== "post_to_social" || !action.platform || !action.content) {
      return Response.json(
        { success: false, message: "Invalid action structure" },
        { status: 400 }
      );
    }

    // Execute the social media action
    const result = await executeSocialAction(action, userId);
    
    return Response.json(result);
  } catch (error) {
    console.error("Action execution failed:", error);
    return Response.json(
      { success: false, message: "Action execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return Response.json(
        { success: false, message: "Missing userId" },
        { status: 400 }
      );
    }

    // Check which platforms are connected
    const connectedAccounts = await checkConnectedAccounts(userId);
    
    return Response.json({
      success: true,
      connectedAccounts
    });
  } catch (error) {
    console.error("Failed to check connected accounts:", error);
    return Response.json(
      { success: false, message: "Failed to check connected accounts" },
      { status: 500 }
    );
  }
}
