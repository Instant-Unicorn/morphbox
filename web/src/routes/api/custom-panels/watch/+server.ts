import type { RequestHandler } from './$types';
import { watch } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { mkdir } from 'fs/promises';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

export const GET: RequestHandler = async () => {
  // Ensure the directory exists
  try {
    await mkdir(PANELS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create panels directory:', error);
  }
  
  // Create a readable stream for server-sent events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));
      
      // Watch the directory for changes
      const watcher = watch(PANELS_DIR, (eventType, filename) => {
        if (filename && filename.endsWith('.svelte')) {
          const data = JSON.stringify({
            type: eventType,
            path: join(PANELS_DIR, filename),
            filename
          });
          
          controller.enqueue(
            encoder.encode(`event: change\ndata: ${data}\n\n`)
          );
        }
      });
      
      // Cleanup on close
      return () => {
        watcher.close();
      };
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};