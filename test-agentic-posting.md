# Agentic Instagram Posting - Test Guide

## How to Test the Implementation

### 1. **Connect Instagram Account**
- Click "Connect Accounts" in the header
- Connect your Instagram account through the modal
- Verify the account shows as "Connected"

### 2. **Test Chat Commands**
Try these commands in the AI Assistant chat:

#### Basic Posting
```
"Post this to Instagram: Just finished an amazing workout! 💪 #fitness #motivation"
```

#### With Campaign Reference
```
"Create a post about this campaign and share it on Instagram"
```
(Then reference a campaign using the slash menu)

#### Media Posting
```
"Post this image to Instagram with the caption: Check out this beautiful sunset! 🌅"
```

### 3. **Expected Behavior**

1. **Action Recognition**: The AI should respond with a structured action block
2. **Action Confirmation**: You should see a yellow confirmation box with:
   - Platform name (Instagram)
   - Post content
   - Execute/Cancel buttons
3. **Execution**: Click "Execute" to post
4. **Status Updates**: 
   - Blue box with spinner during execution
   - Green box with success message on completion
   - Red box with error message if failed

### 4. **API Endpoints Created**

- `POST /api/execute-action` - Execute social media actions
- `GET /api/execute-action?userId=123` - Check connected accounts

### 5. **Key Features Implemented**

✅ **Action Recognition**: AI detects posting requests
✅ **Structured Actions**: Returns JSON action blocks
✅ **Visual Confirmation**: Interactive action cards
✅ **Execution Status**: Real-time status updates
✅ **Error Handling**: Graceful error display
✅ **Composio Integration**: Uses existing auth system

### 6. **Supported Platforms**

- Instagram ✅
- LinkedIn ✅  
- Twitter ✅

### 7. **Next Steps for Enhancement**

- Add media upload support
- Implement scheduling
- Add action history
- Support for multiple media files
- Batch posting capabilities

## Testing Checklist

- [ ] Connect Instagram account
- [ ] Try basic text post
- [ ] Try post with campaign reference
- [ ] Verify action confirmation UI
- [ ] Test execution flow
- [ ] Check error handling
- [ ] Test with other platforms (LinkedIn, Twitter)
