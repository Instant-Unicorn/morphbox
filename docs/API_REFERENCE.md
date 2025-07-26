# MorphBox API Reference

## Overview

MorphBox provides several APIs for interacting with the system, creating custom panels, and managing data. All APIs are REST-based unless otherwise noted.

## Base URL

```
http://localhost:8008/api
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8009');
```

### Message Format

All WebSocket messages use JSON:

```typescript
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}
```

### Message Types

#### Execute Command

```javascript
ws.send(JSON.stringify({
  type: 'exec',
  command: 'ls -la',
  panelId: 'panel-123',
  instanceId: 'instance-456'
}));
```

#### Terminal Input

```javascript
ws.send(JSON.stringify({
  type: 'input',
  data: 'npm install\n',
  instanceId: 'instance-456'
}));
```

#### Resize Terminal

```javascript
ws.send(JSON.stringify({
  type: 'resize',
  cols: 80,
  rows: 24,
  instanceId: 'instance-456'
}));
```

#### Subscribe to Updates

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'panels'
}));
```

### Response Format

```typescript
interface WebSocketResponse {
  type: 'output' | 'error' | 'status' | 'connected';
  instanceId?: string;
  data?: string;
  error?: string;
  message?: string;
}
```

## REST API Endpoints

### Panel Management

#### List All Panels

```http
GET /api/panels
```

Response:
```json
{
  "panels": [
    {
      "id": "terminal",
      "type": "terminal",
      "title": "Terminal",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 400, "height": 300 }
    }
  ]
}
```

#### Create Panel

```http
POST /api/panels
Content-Type: application/json

{
  "type": "terminal",
  "title": "New Terminal",
  "position": { "x": 100, "y": 100 }
}
```

Response:
```json
{
  "id": "panel-abc123",
  "type": "terminal",
  "title": "New Terminal",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 400, "height": 300 }
}
```

#### Update Panel

```http
PUT /api/panels/:id
Content-Type: application/json

{
  "position": { "x": 200, "y": 150 },
  "size": { "width": 500, "height": 400 }
}
```

#### Delete Panel

```http
DELETE /api/panels/:id
```

### Panel Data Storage

#### Save Panel Data

```http
POST /api/panels/data/:panelId
Content-Type: application/json

{
  "key": "settings",
  "value": {
    "theme": "dark",
    "fontSize": 14
  }
}
```

#### Get Panel Data

```http
GET /api/panels/data/:panelId
```

Response:
```json
{
  "settings": {
    "theme": "dark",
    "fontSize": 14
  }
}
```

#### Delete Panel Data

```http
DELETE /api/panels/data/:panelId/:key
```

### Custom Panels API

#### List Custom Panels

```http
GET /api/custom-panels/list
```

Response:
```json
[
  "todo-list-abc123.morph",
  "markdown-preview-def456.morph"
]
```

#### Get Panel Metadata

```http
GET /api/custom-panels/metadata/:id
```

Response:
```json
{
  "id": "todo-list-abc123",
  "name": "Todo List",
  "description": "A simple todo list with local storage",
  "version": "1.0.2",
  "features": ["storage", "realtime"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z",
  "promptHistory": [
    {
      "prompt": "Create a todo list",
      "timestamp": "2024-01-01T00:00:00Z",
      "type": "create"
    }
  ]
}
```

#### Get Panel Code

```http
GET /api/custom-panels/code/:id
```

Response:
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>...</body>
</html>
```

#### Create Custom Panel

```http
POST /api/custom-panels/create
Content-Type: application/json

{
  "name": "My Panel",
  "description": "Create a panel that shows system stats"
}
```

Response:
```json
{
  "id": "my-panel-abc123",
  "filename": "my-panel-abc123.morph",
  "path": "/home/user/morphbox/panels/my-panel-abc123.morph",
  "metadata": {
    "id": "my-panel-abc123",
    "name": "My Panel",
    "version": "1.0.0"
  }
}
```

#### Morph (Update) Panel

```http
POST /api/custom-panels/morph
Content-Type: application/json

{
  "panelId": "my-panel-abc123",
  "morphDescription": "Add a refresh button that updates every 5 seconds"
}
```

Response:
```json
{
  "success": true,
  "panelId": "my-panel-abc123",
  "newVersion": "1.0.1",
  "metadata": { ... }
}
```

#### Export Panel

```http
GET /api/custom-panels/export/:id
```

Response: Binary .morph file download

#### Import Panel

```http
POST /api/custom-panels/import
Content-Type: application/json

{
  "formatVersion": "1.0",
  "metadata": { ... },
  "code": "...",
  "promptHistory": [ ... ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

Or using multipart form data:

```http
POST /api/custom-panels/import
Content-Type: multipart/form-data

file: [.morph file]
```

Response:
```json
{
  "success": true,
  "id": "imported-panel-xyz789",
  "originalId": "original-panel-abc123",
  "name": "Imported Panel",
  "idChanged": true
}
```

#### Delete Custom Panel

```http
DELETE /api/custom-panels/:id
```

### Layout Management

#### Save Layout

```http
POST /api/panels/layout
Content-Type: application/json

{
  "panels": [
    {
      "id": "panel-1",
      "type": "terminal",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 400, "height": 300 }
    }
  ]
}
```

#### Load Layout

```http
GET /api/panels/layout
```

### System APIs

#### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.7.1",
  "uptime": 3600
}
```

#### VM Status

```http
GET /api/vm/status
```

Response:
```json
{
  "running": true,
  "uptime": 3600,
  "memory": {
    "total": 4096,
    "used": 2048,
    "free": 2048
  },
  "cpu": {
    "usage": 15.5
  }
}
```

## Panel Development API

### Available Global Variables

When developing custom panels, these variables are available:

```javascript
// Unique panel instance ID
const panelId = "panel-abc123";

// WebSocket URL for real-time communication
const websocketUrl = "ws://localhost:8009";

// Any data passed to the panel
const data = { /* panel-specific data */ };
```

### Panel Helper Functions

```javascript
// Send command to terminal
function sendCommand(command) {
  const ws = new WebSocket(websocketUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'exec',
      command: command,
      panelId: panelId
    }));
  };
  return ws;
}

// Save panel data
async function savePanelData(key, value) {
  const response = await fetch(`/api/panels/data/${panelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  return response.json();
}

// Load panel data
async function loadPanelData() {
  const response = await fetch(`/api/panels/data/${panelId}`);
  return response.json();
}
```

### CSS Variables

Custom panels should use these CSS variables for theming:

```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --text-primary: #cccccc;
  --text-secondary: #858585;
  --border-color: #3e3e42;
  --accent-color: #007acc;
  --error-color: #f48771;
  --success-color: #89d185;
  --warning-color: #cca700;
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

Currently, there are no rate limits on API endpoints. This may change in future versions.

## Authentication

Currently, all APIs are unauthenticated as MorphBox runs locally. Future versions may add optional authentication for network access.

## WebSocket Connection Management

### Reconnection Strategy

```javascript
class MorphBoxWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectDelay = 1000;
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }
}
```

## Examples

### Creating a Custom Panel that Executes Commands

```javascript
// Custom panel that runs system commands
const ws = new WebSocket(websocketUrl);
const output = document.getElementById('output');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'output') {
    output.textContent += msg.data;
  }
};

ws.onopen = () => {
  // Run a command
  ws.send(JSON.stringify({
    type: 'exec',
    command: 'ps aux | head -10',
    panelId: panelId
  }));
};
```

### Storing and Retrieving Panel Settings

```javascript
// Save settings
async function saveSettings(settings) {
  await fetch(`/api/panels/data/${panelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'settings',
      value: settings
    })
  });
}

// Load settings
async function loadSettings() {
  const response = await fetch(`/api/panels/data/${panelId}`);
  const data = await response.json();
  return data.settings || {};
}

// Usage
await saveSettings({ theme: 'dark', fontSize: 14 });
const settings = await loadSettings();
```