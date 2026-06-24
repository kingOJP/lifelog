import type { Env } from './types';
import { handleAuth } from './auth';
import { handleSync } from './sync';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith('/api/auth')) {
        return await handleAuth(request, env, url);
      }
      if (url.pathname === '/api/sync') {
        return await handleSync(request, env);
      }
    } catch (err) {
      console.error('Worker error:', err);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }

    return env.ASSETS.fetch(request);
  },
};
