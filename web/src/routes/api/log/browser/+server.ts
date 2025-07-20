import type { RequestHandler } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'browser-logs.jsonl');

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { logs } = await request.json();
		
		// Ensure log directory exists
		if (!existsSync(LOG_DIR)) {
			await mkdir(LOG_DIR, { recursive: true });
		}
		
		// Format logs as JSON Lines (one JSON object per line)
		const logLines = logs.map((log: any) => JSON.stringify({
			...log,
			serverTimestamp: new Date().toISOString()
		})).join('\n') + '\n';
		
		// Append to log file
		await writeFile(LOG_FILE, logLines, { flag: 'a' });
		
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Failed to write browser logs:', error);
		return new Response(JSON.stringify({ 
			error: 'Failed to write logs',
			message: error instanceof Error ? error.message : 'Unknown error'
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};