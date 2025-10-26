# B2C Content Management API Documentation

This API provides a user-scoped content management system using Chroma Cloud for vector storage and semantic search. Each user has their own collection for complete data isolation and privacy.

## Architecture Overview

### User-Scoped Collections
- **`user_123`** - User 123's personal collection
- **`user_456`** - User 456's personal collection
- Each user has complete data isolation

### Content Types (within user collections)
- **`inspiration`** - External inspiration content
- **`past-work`** - Previously published/completed work  
- **`current-work`** - Work in progress, staged for publication

## API Endpoints

### User Content Management

#### `GET /api/user-content`
Get user's content by type or search within their collection.

**Query Parameters:**
- `userId` (required): User identifier
- `type` (optional): Content type filter (`inspiration`, `past-work`, `current-work`)
- `q` (optional): Search query within user's collection
- `limit` (optional): Number of results (default: 10)

**Examples:**
```bash
# Get all user content
GET /api/user-content?userId=123

# Get user's inspiration content
GET /api/user-content?userId=123&type=inspiration

# Search user's content
GET /api/user-content?userId=123&q=photography&limit=5
```

#### `POST /api/user-content`
Add content to user's collection.

**Request Body:**
```json
{
  "userId": "123",
  "content": "Beautiful sunset photography techniques",
  "contentType": "inspiration",
  "title": "Sunset Photography",
  "description": "Advanced techniques for capturing stunning sunsets",
  "tags": ["photography", "nature", "sunset"],
  "status": "draft",
  "metadata": {
    "source": "pinterest",
    "author": "John Doe",
    "difficulty": "intermediate"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content added to user 123's collection",
  "userId": "123",
  "contentType": "inspiration",
  "result": { ... }
}
```

#### `DELETE /api/user-content`
Delete user's entire collection (GDPR compliance).

**Query Parameters:**
- `userId` (required): User identifier

**Response:**
```json
{
  "success": true,
  "message": "User 123's collection deleted successfully"
}
```

### Collection Management

#### `GET /api/collections`
List all collections (admin use).

#### `POST /api/collections`
Create a new collection with content type validation.

**Request Body:**
```json
{
  "name": "user_123",
  "contentType": "user-collection",
  "metadata": {
    "userId": "123",
    "description": "Personal content collection for user 123"
  }
}
```

#### `GET /api/collections/[name]`
Get specific collection details.

#### `DELETE /api/collections/[name]`
Delete a collection and all its content.

## Content Workflow

### User Content Lifecycle:
```
External Source → inspiration → current-work → past-work
```

### Content Organization:
- **Single Collection Per User** - `user_123` contains all user's content
- **Content Type Filtering** - Via metadata queries
- **Semantic Search** - Within user's collection only

## Metadata Schema

### User Collection Metadata:
```json
{
  "userId": "123",
  "contentType": "inspiration",
  "title": "Content Title",
  "description": "Content description",
  "tags": ["tag1", "tag2"],
  "status": "draft",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Content-Specific Fields:
- **Inspiration**: `source`, `author`, `url`
- **Current Work**: `assignedTo`, `priority`, `deadline`
- **Past Work**: `publishedAt`, `performance`, `metrics`

## Privacy & Security

### Data Isolation:
- ✅ **Complete User Isolation** - Each user's data is separate
- ✅ **No Cross-User Access** - Users cannot access other users' data
- ✅ **GDPR Compliance** - Easy user data deletion
- ✅ **Privacy First** - All queries scoped to user's collection

### Authentication:
- User ID validation on all endpoints
- Collection naming convention: `user_{userId}`
- No cross-user data leakage possible

## Error Handling

All endpoints return structured responses:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limits

- 100 requests per minute per user
- 1000 requests per hour per user
- Bulk operations limited to 100 items per request

## Examples

### Complete User Content Workflow

1. **Add Inspiration:**
```bash
POST /api/user-content
{
  "userId": "123",
  "content": "Minimalist design principles for modern websites",
  "contentType": "inspiration",
  "title": "Minimalist Web Design",
  "tags": ["design", "minimalism", "web"],
  "metadata": { "source": "dribbble" }
}
```

2. **Search User's Content:**
```bash
GET /api/user-content?userId=123&q=minimalist design&type=inspiration
```

3. **Move to Current Work:**
```bash
POST /api/user-content
{
  "userId": "123",
  "content": "Minimalist design principles for modern websites",
  "contentType": "current-work",
  "title": "Minimalist Web Design",
  "status": "in-progress",
  "metadata": { "movedFrom": "inspiration" }
}
```

4. **Publish to Past Work:**
```bash
POST /api/user-content
{
  "userId": "123",
  "content": "Minimalist design principles for modern websites",
  "contentType": "past-work",
  "title": "Minimalist Web Design",
  "status": "published",
  "metadata": { "publishedAt": "2024-01-15T10:00:00Z" }
}
```

## Benefits of User-Scoped Architecture

### Privacy & Security:
- ✅ **Complete Data Isolation** - No cross-user data access
- ✅ **GDPR Compliance** - Easy user data deletion
- ✅ **Privacy First** - User data never mixed

### Performance:
- ✅ **Faster Queries** - Smaller collections per user
- ✅ **Better Scalability** - Each user independent
- ✅ **Optimized Search** - User-scoped semantic search

### User Experience:
- ✅ **Personal Content** - Only user's own content
- ✅ **Fast Retrieval** - Quick access to personal data
- ✅ **Content Organization** - Clear content type filtering

This B2C architecture provides a secure, scalable, and privacy-focused content management system for individual users.