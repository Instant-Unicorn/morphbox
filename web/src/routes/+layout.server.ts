import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
  // Check if we're in terminal mode
  const terminalMode = request.headers.get('x-terminal-mode') === 'true' || 
                      (request as any).terminalMode === true;
  
  return {
    terminalMode
  };
};