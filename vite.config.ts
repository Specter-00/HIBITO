import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import { demoResponse } from './dev/demo';

/**
 * ローカル開発用：/api/* を api/*.ts の関数につなぐ。
 * これで Vercel CLI なしでも `npm run dev` だけで全部動く。
 * （本番では Vercel が api/ フォルダを自動でサーバーレス関数にする）
 */
function localApi(): Plugin {
  return {
    name: 'hibito-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        if (!/^[a-z-]+$/.test(name)) return next();

        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const method = (req.method ?? 'GET').toUpperCase();
        const request = new Request(url, {
          method,
          headers: req.headers as Record<string, string>,
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
        });

        try {
          let response: Response;
          if (process.env.HIBITO_DEMO === '1') {
            response = await demoResponse(name, request);
          } else {
            const mod = await server.ssrLoadModule(`/api/${name}.ts`);
            const handler = mod[method];
            response =
              typeof handler === 'function'
                ? await handler(request)
                : new Response('Method Not Allowed', { status: 405 });
          }
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // .env.local の値をサーバー関数（process.env）からも読めるようにする
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), localApi()] };
});
