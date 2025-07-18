import type { FileItem } from './types';

// Fetch directory contents from the API
export async function fetchDirectory(path: string): Promise<FileItem[]> {
  try {
    // Use path directly for API
    const relativePath = path || '/';
    
    const response = await fetch(`/api/files/list?path=${encodeURIComponent(relativePath)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch directory: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert API response to FileItem format
    return data.contents.map((item: any) => ({
      name: item.name,
      path: item.path ? '/' + item.path : '/',
      isDirectory: item.type === 'directory',
      parent: path
    }));
  } catch (error) {
    console.error('Error fetching directory:', error);
    throw error;
  }
}

export async function createFile(directory: string, name: string): Promise<void> {
  try {
    // Use path directly for API
    const relativePath = directory || '/';
    
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `${relativePath}/${name}`,
        type: 'file'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
}

export async function createDirectory(directory: string, name: string): Promise<void> {
  try {
    // Use path directly for API
    const relativePath = directory || '/';
    
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `${relativePath}/${name}`,
        type: 'directory'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create directory: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
}

export async function deleteItem(path: string): Promise<void> {
  try {
    // Use path directly for API
    const relativePath = path || '/';
    
    const response = await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: relativePath
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete item: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

export async function renameItem(oldPath: string, newName: string): Promise<void> {
  try {
    const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${directory}/${newName}`;
    
    // Use paths directly for API
    const relativeOldPath = oldPath || '/';
    const relativeNewPath = newPath || '/';
    
    const response = await fetch('/api/files/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPath: relativeOldPath,
        newPath: relativeNewPath
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to rename item: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error renaming item:', error);
    throw error;
  }
}

// WebSocket integration for real implementation
export function setupFileSystemWebSocket(ws: WebSocket) {
  // This would handle real file system operations via WebSocket
  // Example:
  /*
  ws.send(JSON.stringify({
    type: 'fs:list',
    path: '/workspace'
  }));
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'fs:list:response') {
      // Handle directory listing response
    }
  };
  */
}