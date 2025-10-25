# B2C Content Management System

This Next.js application provides a user-scoped content management system using Chroma Cloud for vector storage and semantic search. Each user has their own collection for complete data isolation and privacy.

## Features

- ✅ **User-Scoped Collections**: Each user gets their own collection (user_123)
- ✅ **Content Type Management**: Inspiration, past-work, and current-work content
- ✅ **Semantic Search**: Vector-based search within user's collection
- ✅ **Privacy First**: Complete user data isolation
- ✅ **GDPR Compliance**: Easy user data deletion
- ✅ **API Endpoints**: RESTful API for user content operations

## API Documentation

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

**Key Endpoints:**
- `GET /api/user-content` - Get user's content
- `POST /api/user-content` - Add content to user's collection
- `DELETE /api/user-content` - Delete user's collection (GDPR)

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Chroma Cloud Configuration
CHROMA_API_KEY=your-chroma-api-key-here
CHROMA_TENANT=your-tenant-id-here
CHROMA_DATABASE=your-database-name-here
```

### 2. Chroma Cloud Setup

1. Sign up for Chroma Cloud at https://cloud.trychroma.com/
2. Create a new project and get your credentials:
   - **API Key**: Found in your project dashboard
   - **Tenant ID**: Your organization/tenant identifier
   - **Database Name**: Your database name (e.g., `my-content-db`)
3. Update your `.env.local` file with your actual credentials

**Note**: The application will use environment variables if provided, otherwise it will use the default values configured in the code.

### 4. Start the Application

```bash
pnpm dev
```

Visit `http://localhost:3000` to access the web interface.

## Usage Examples

### Add User Content
```javascript
const response = await fetch('/api/user-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123',
    content: 'Beautiful sunset photography techniques',
    contentType: 'inspiration',
    title: 'Sunset Photography',
    tags: ['photography', 'nature']
  })
});
```

### Search User Content
```javascript
const response = await fetch('/api/user-content?userId=123&q=photography&type=inspiration');
```

### Get User Content
```javascript
const response = await fetch('/api/user-content?userId=123');
```

## File Structure

```
src/
├── lib/
│   └── chroma.ts              # Chroma client configuration and service
├── app/
│   ├── api/
│   │   ├── user-content/
│   │   │   └── route.ts       # User content management
│   │   └── collections/
│   │       ├── route.ts       # Collection CRUD operations
│   │       └── [name]/
│   │           ├── route.ts   # Individual collection operations
│   │           ├── documents/
│   │           │   └── route.ts # Document operations
│   │           └── query/
│   │               └── route.ts # Query operations
│   ├── api-docs/
│   │   └── page.tsx           # API documentation
│   └── page.tsx              # Chat interface
```

## Configuration

The Chroma Cloud client is configured in `src/lib/chroma.ts`. The configuration includes:

- **Environment Variables**: 
  - `CHROMA_API_KEY`: Your Chroma Cloud API key
  - `CHROMA_TENANT`: Your Chroma Cloud tenant ID
  - `CHROMA_DATABASE`: Your Chroma Cloud database name

**Default Configuration**: The application includes default values for development, but you should always use environment variables for production.

You can modify the configuration to:
- Use different credentials via environment variables
- Add additional connection options
- Configure custom metadata handling

## Error Handling

All API endpoints include comprehensive error handling and return structured responses:

```json
{
  "success": true,
  "data": { ... }
}
```

or

```json
{
  "success": false,
  "error": "Error message"
}
```

## Next Steps

1. Configure your Chroma server URL in `.env.local`
2. Start the development server with `pnpm dev`
3. Visit the web interface to test the functionality
4. Use the API endpoints in your applications
