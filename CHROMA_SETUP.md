# Chroma Cloud Client Setup

This Next.js application includes a complete Chroma cloud client implementation with collection management, document operations, and querying capabilities.

## Features

- ✅ **Collection Management**: Create, list, and delete collections
- ✅ **Document Operations**: Add documents to collections with metadata
- ✅ **Query Functionality**: Search and retrieve documents from collections
- ✅ **Web Interface**: Interactive UI for testing all operations
- ✅ **API Endpoints**: RESTful API for all Chroma operations

## API Endpoints

### Collections
- `GET /api/collections` - List all collections
- `POST /api/collections` - Create a new collection
- `GET /api/collections/[name]` - Get a specific collection
- `DELETE /api/collections/[name]` - Delete a collection

### Documents
- `POST /api/collections/[name]/documents` - Add documents to a collection
- `GET /api/collections/[name]/documents` - Get all documents from a collection

### Query
- `POST /api/collections/[name]/query` - Query documents in a collection

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

### Create a Collection
```javascript
const response = await fetch('/api/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'my-collection',
    metadata: { description: 'My test collection' }
  })
});
```

### Add Documents
```javascript
const response = await fetch('/api/collections/my-collection/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documents: ['Document 1', 'Document 2'],
    metadatas: [{ source: 'web' }, { source: 'pdf' }]
  })
});
```

### Query Collection
```javascript
const response = await fetch('/api/collections/my-collection/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queryTexts: ['search query'],
    nResults: 5
  })
});
```

## File Structure

```
src/
├── lib/
│   └── chroma.ts              # Chroma client configuration and service
├── app/
│   ├── api/
│   │   └── collections/
│   │       ├── route.ts       # Collection CRUD operations
│   │       └── [name]/
│   │           ├── route.ts   # Individual collection operations
│   │           ├── documents/
│   │           │   └── route.ts # Document operations
│   │           └── query/
│   │               └── route.ts # Query operations
│   └── page.tsx               # Web interface
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
