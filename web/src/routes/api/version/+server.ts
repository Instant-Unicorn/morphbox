import { json } from '@sveltejs/kit';
import pkg from '../../../../package.json';

export async function GET() {
  return json({ version: pkg.version });
}
