import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import type { D1Database } from '@cloudflare/workers-types';

const request = (origin: string) => new Request('https://worker.example/api/health', { headers: { Origin: origin } });
const env = (allowed: string, salt?: string) => ({ ALLOWED_ORIGIN: allowed, RATE_LIMIT_SALT: salt, DB: {} as D1Database });

describe('environment-specific CORS', () => {
  it('allows local Vite ports only with the local binding', async () => {
    const response = await worker.fetch(request('http://127.0.0.1:5174'), env('http://127.0.0.1:5173'));
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5174');
  });

  it('allows only the configured GitHub Pages origin in production', async () => {
    const production = env('https://kikakin.github.io', 'x'.repeat(32));
    expect((await worker.fetch(request('https://kikakin.github.io'), production)).status).toBe(200);
    expect((await worker.fetch(request('http://127.0.0.1:5174'), production)).status).toBe(403);
    expect((await worker.fetch(request('https://evil.example'), production)).status).toBe(403);
  });

  it('fails closed when the production secret is missing or too short', async () => {
    expect((await worker.fetch(request('https://kikakin.github.io'), env('https://kikakin.github.io'))).status).toBe(503);
    expect((await worker.fetch(request('https://kikakin.github.io'), env('https://kikakin.github.io', 'short'))).status).toBe(503);
  });

  it('permits the GitHub Pages preflight and rejects other origins', async () => {
    const production = env('https://kikakin.github.io', 'x'.repeat(32));
    const preflight = (origin: string) => new Request('https://worker.example/api/leaderboard', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Content-Type' } });
    const allowed = await worker.fetch(preflight('https://kikakin.github.io'), production);
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://kikakin.github.io');
    expect((await worker.fetch(preflight('https://other.example'), production)).status).toBe(403);
  });
});
