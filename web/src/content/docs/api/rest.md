---
title: REST API Reference
description: Complete REST API documentation for MorphBox
lastModified: 2024-12-19
---

# REST API Reference

MorphBox provides a comprehensive REST API for file operations, panel management, and system integration. All API endpoints are available at the base URL where MorphBox is running.

## Base URL

```
http://localhost:8008/api
```

For external access:
```
http://YOUR_IP:8008/api
```

## Authentication

Currently, MorphBox API endpoints do not require authentication when accessed from the same origin. External API access should be used with caution and proper network security.

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

## File Operations API

### List Files

**GET** `/api/files/list`

List files and directories in the workspace.

**Query Parameters:**
- `path` (string, optional): Directory path relative to workspace root
- `recursive` (boolean, optional): Include subdirectories recursively

**Example Request:**
```bash
curl "http://localhost:8008/api/files/list?path=/projects&recursive=true"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "README.md",
        "path": "/projects/README.md",
        "type": "file",
        "size": 1024,
        "modified": "2024-12-19T10:30:00Z",
        "permissions": "rw-r--r--"
      },
      {
        "name": "src",
        "path": "/projects/src",
        "type": "directory",
        "size": 0,
        "modified": "2024-12-19T09:15:00Z",
        "permissions": "rwxr-xr-x"
      }
    ],
    "total": 2
  }
}
```

### Read File

**GET** `/api/files/read`

Read the contents of a file.

**Query Parameters:**
- `path` (string, required): File path relative to workspace root

**Example Request:**
```bash
curl "http://localhost:8008/api/files/read?path=/projects/README.md"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "content": "# My Project\n\nThis is a sample project...",
    "encoding": "utf-8",
    "size": 1024
  }
}
```

### Write File

**POST** `/api/files/write`

Create or update a file with new content.

**Request Body:**
```json
{
  "path": "/projects/new-file.txt",
  "content": "Hello, World!",
  "encoding": "utf-8"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8008/api/files/write" \
  -H "Content-Type: application/json" \
  -d '{"path": "/projects/hello.txt", "content": "Hello, World!"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "path": "/projects/hello.txt",
    "size": 13,
    "created": true
  }
}
```

### Create Directory

**POST** `/api/files/create`

Create a new directory.

**Request Body:**
```json
{
  "path": "/projects/new-folder",
  "type": "directory"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8008/api/files/create" \
  -H "Content-Type: application/json" \
  -d '{"path": "/projects/docs", "type": "directory"}'
```

### Delete File/Directory

**DELETE** `/api/files/delete`

Delete a file or directory.

**Request Body:**
```json
{
  "path": "/projects/old-file.txt",
  "recursive": false
}
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:8008/api/files/delete" \
  -H "Content-Type: application/json" \
  -d '{"path": "/projects/temp", "recursive": true}'
```

### Rename/Move File

**POST** `/api/files/rename`

Rename or move a file/directory.

**Request Body:**
```json
{
  "oldPath": "/projects/old-name.txt",
  "newPath": "/projects/new-name.txt"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8008/api/files/rename" \
  -H "Content-Type: application/json" \
  -d '{"oldPath": "/projects/draft.md", "newPath": "/projects/final.md"}'
```

## Panel Management API

### List Available Panels

**GET** `/api/panels/list`

Get list of available panel types.

**Example Request:**
```bash
curl "http://localhost:8008/api/panels/list"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "builtin": [
      {
        "id": "terminal",
        "name": "Terminal",
        "description": "Interactive terminal with persistent sessions",
        "category": "development"
      },
      {
        "id": "fileExplorer",
        "name": "File Explorer",
        "description": "Browse and manage workspace files",
        "category": "tools"
      },
      {
        "id": "codeEditor",
        "name": "Code Editor",
        "description": "Advanced code editor with syntax highlighting",
        "category": "development"
      }
    ],
    "custom": []
  }
}
```

### Create Panel

**POST** `/api/panels/create`

Create a new custom panel.

**Request Body:**
```json
{
  "name": "My Custom Panel",
  "description": "A custom panel for specific tasks",
  "features": ["feature1", "feature2"],
  "code": "// Panel implementation code"
}
```

### Get Panel Templates

**GET** `/api/panels/templates`

Get available panel templates for custom panel creation.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "basic",
        "name": "Basic Panel",
        "description": "Simple panel template",
        "code": "// Basic panel template..."
      },
      {
        "id": "data-visualization",
        "name": "Data Visualization",
        "description": "Panel for charts and graphs",
        "code": "// Data visualization template..."
      }
    ]
  }
}
```

### Save Panel Configuration

**POST** `/api/panels/save`

Save panel configuration and layout.

**Request Body:**
```json
{
  "panelId": "terminal-1",
  "configuration": {
    "position": { "x": 100, "y": 100 },
    "size": { "width": 800, "height": 600 },
    "settings": {
      "theme": "dark",
      "fontSize": 14
    }
  }
}
```

### Load Panel Configuration

**GET** `/api/panels/load`

Load saved panel configuration.

**Query Parameters:**
- `panelId` (string, required): Panel identifier

## System Information API

### Health Check

**GET** `/api/health`

Check system health and status.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "services": {
      "webServer": "running",
      "websocketServer": "running",
      "dockerContainer": "running"
    },
    "resources": {
      "memory": {
        "used": "2.1GB",
        "total": "8.0GB",
        "percentage": 26.25
      },
      "disk": {
        "used": "15.2GB",
        "total": "100GB",
        "percentage": 15.2
      }
    }
  }
}
```

### Version Information

**GET** `/api/version`

Get MorphBox version information.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "buildDate": "2024-12-19",
    "gitCommit": "abc123def",
    "nodeVersion": "20.10.0",
    "dockerVersion": "24.0.7"
  }
}
```

## Error Handling

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 404 | `NOT_FOUND` | File or resource not found |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 500 | `INTERNAL_ERROR` | Server error |
| 413 | `FILE_TOO_LARGE` | File exceeds size limit |

### Error Response Examples

**File Not Found:**
```json
{
  "success": false,
  "data": null,
  "error": "File not found: /projects/missing.txt",
  "code": "NOT_FOUND"
}
```

**Permission Denied:**
```json
{
  "success": false,
  "data": null,
  "error": "Permission denied: Cannot write to /system/config",
  "code": "FORBIDDEN"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **File operations**: 100 requests per minute
- **Panel operations**: 50 requests per minute
- **System endpoints**: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples and SDKs

### JavaScript/Node.js Example

```javascript
// MorphBox API client example
class MorphBoxAPI {
  constructor(baseUrl = 'http://localhost:8008/api') {
    this.baseUrl = baseUrl;
  }

  async listFiles(path = '/') {
    const response = await fetch(`${this.baseUrl}/files/list?path=${encodeURIComponent(path)}`);
    return response.json();
  }

  async readFile(path) {
    const response = await fetch(`${this.baseUrl}/files/read?path=${encodeURIComponent(path)}`);
    return response.json();
  }

  async writeFile(path, content) {
    const response = await fetch(`${this.baseUrl}/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    return response.json();
  }
}

// Usage
const api = new MorphBoxAPI();
const files = await api.listFiles('/projects');
const content = await api.readFile('/projects/README.md');
```

### Python Example

```python
import requests
import json

class MorphBoxAPI:
    def __init__(self, base_url='http://localhost:8008/api'):
        self.base_url = base_url
    
    def list_files(self, path='/'):
        response = requests.get(f'{self.base_url}/files/list', params={'path': path})
        return response.json()
    
    def read_file(self, path):
        response = requests.get(f'{self.base_url}/files/read', params={'path': path})
        return response.json()
    
    def write_file(self, path, content):
        response = requests.post(
            f'{self.base_url}/files/write',
            json={'path': path, 'content': content}
        )
        return response.json()

# Usage
api = MorphBoxAPI()
files = api.list_files('/projects')
content = api.read_file('/projects/README.md')
```

### cURL Examples

```bash
# List files
curl "http://localhost:8008/api/files/list"

# Read file
curl "http://localhost:8008/api/files/read?path=/README.md"

# Create file
curl -X POST "http://localhost:8008/api/files/write" \
  -H "Content-Type: application/json" \
  -d '{"path": "/hello.txt", "content": "Hello World"}'

# Delete file
curl -X DELETE "http://localhost:8008/api/files/delete" \
  -H "Content-Type: application/json" \
  -d '{"path": "/hello.txt"}'
```

## Best Practices

### Error Handling
Always check the `success` field in responses:

```javascript
const response = await api.readFile('/some/file.txt');
if (!response.success) {
  console.error('API Error:', response.error);
  return;
}
const content = response.data.content;
```

### Path Handling
- Use forward slashes `/` for all paths
- Paths are relative to workspace root
- Avoid `..` for security reasons

### File Size Limits
- Maximum file size: 10MB for text files
- Binary files: 100MB limit
- Use streaming for large files

### Caching
- File listings are cached for 30 seconds
- Use ETags for efficient file updates
- Clear cache with `Cache-Control: no-cache`

## Security Considerations

### Access Control
- API is accessible only from localhost by default
- Use `--external` flag with caution
- Consider implementing authentication for production

### File System Security
- API access is restricted to workspace directory
- Cannot access system files outside workspace
- Path traversal attacks are prevented

### Network Security
- Use HTTPS in production environments
- Implement proper firewall rules
- Consider VPN for remote access

## Related Documentation

- [WebSocket API](/docs/api/websocket) - Real-time communication
- [File Operations](/docs/api/files) - Detailed file API
- [Panel Management](/docs/api/panels) - Panel system API
- [Authentication](/docs/user-guide/authentication) - Setup and security