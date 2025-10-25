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
CHROMA_API_KEY=ck-GkMoM4DAMuaqWzLKAc7AmMp9tw9ogLcgEYpLFBdYorF9
CHROMA_TENANT=29001fa2-0596-4474-9a8a-bc95a0919a7a
CHROMA_DATABASE=calhacks-2025
```

### 2. Chroma Cloud Setup

The application is pre-configured with your Chroma Cloud credentials:
- **API Key**: `ck-GkMoM4DAMuaqWzLKAc7AmMp9tw9ogLcgEYpLFBdYorF9`
- **Tenant**: `29001fa2-0596-4474-9a8a-bc95a0919a7a`
- **Database**: `calhacks-2025`

**Note**: The credentials are already configured in the code. You can override them by setting environment variables in `.env.local` if needed.

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

- **API Key**: `ck-GkMoM4DAMuaqWzLKAc7AmMp9tw9ogLcgEYpLFBdYorF9`
- **Tenant**: `29001fa2-0596-4474-9a8a-bc95a0919a7a`
- **Database**: `calhacks-2025`
- **Environment Variables**: 
  - `CHROMA_API_KEY`: Your Chroma Cloud API key
  - `CHROMA_TENANT`: Your Chroma Cloud tenant ID
  - `CHROMA_DATABASE`: Your Chroma Cloud database name

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
