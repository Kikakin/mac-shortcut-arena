import { questions, pickQuestions, publicQuestions, scoreAnswers } from './questions';
import type { D1Database } from '@cloudflare/workers-types';

interface Env { DB: D1Database; ALLOWED_ORIGIN: string; RATE_LIMIT_SALT?: string }
type Challenge = { id: string; player_id: string; nickname: string; question_ids: string; started_at: number; expires_at: number; status: string };
const json = (data: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const error = (code: string, status: number, headers: HeadersInit) => json({ error: code }, status, headers);
const localDevelopment = (env: Env) => /^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(env.ALLOWED_ORIGIN);
const originAllowed = (origin: string | null, env: Env) => !!origin && (origin === env.ALLOWED_ORIGIN || (localDevelopment(env) && /^http:\/\/(127\.0\.0\.1|localhost):(517[3-9]|4173)$/.test(origin)));
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const nicknameValid = (value: unknown) => typeof value === 'string' && [...value.trim()].length >= 2 && [...value.trim()].length <= 16 && /^[\p{L}\p{N}_ -]+$/u.test(value.trim());
async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new Error('BODY_TOO_LARGE');
  const raw = await request.text();
  if (raw.length > 4096) throw new Error('BODY_TOO_LARGE');
  try { return JSON.parse(raw); } catch { throw new Error('INVALID_JSON'); }
}
async function limited(request: Request, env: Env, route: string, max: number) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const bucket = Math.floor(Date.now() / 60000);
  const salt = env.RATE_LIMIT_SALT || (localDevelopment(env) ? 'local-development' : null);
  if (!salt) throw new Error('RATE_LIMIT_SALT_NOT_CONFIGURED');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}:${route}:${bucket}`));
  const key = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key, (bucket + 2) * 60000).run();
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key=?').bind(key).first<{count:number}>();
  if (Math.random() < 0.01) await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Date.now()).run();
  return (row?.count || 0) <= max;
}
const dayBounds = () => { const start = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'); return [start, start + 86400000]; };
const rankSql = (daily: boolean) => `WITH ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY correct DESC, duration_ms ASC, completed_at ASC, challenge_id ASC) AS player_rank FROM scores ${daily ? 'WHERE completed_at >= ? AND completed_at < ?' : ''}) SELECT challenge_id, player_id, nickname, correct, duration_ms, completed_at FROM ranked WHERE player_rank=1 ORDER BY correct DESC, duration_ms ASC, completed_at ASC, challenge_id ASC LIMIT 100`;
async function getRank(env: Env, challengeId: string) {
  const row = await env.DB.prepare(`WITH best AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY correct DESC, duration_ms ASC, completed_at ASC, challenge_id ASC) AS rn FROM scores), ordered AS (SELECT challenge_id, ROW_NUMBER() OVER (ORDER BY correct DESC, duration_ms ASC, completed_at ASC, challenge_id ASC) AS place FROM best WHERE rn=1) SELECT place FROM ordered WHERE challenge_id=?`).bind(challengeId).first<{place:number}>();
  return row?.place ?? null;
}
export default { async fetch(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors: HeadersInit = originAllowed(origin, env) ? { 'access-control-allow-origin': origin!, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type', 'vary': 'Origin' } : {};
  if (request.method === 'OPTIONS') return originAllowed(origin, env) ? new Response(null, { status: 204, headers: cors }) : error('ORIGIN_NOT_ALLOWED', 403, cors);
  if (origin && !originAllowed(origin, env)) return error('ORIGIN_NOT_ALLOWED', 403, cors);
  if (!localDevelopment(env) && (!env.RATE_LIMIT_SALT || env.RATE_LIMIT_SALT.length < 32)) return error('SERVER_NOT_CONFIGURED', 503, cors);
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true }, 200, cors);
    if (url.pathname === '/api/challenges' && request.method === 'POST') {
      if (!await limited(request, env, 'start', 12)) return error('RATE_LIMITED', 429, cors);
      const data = await body(request);
      if (!nicknameValid(data.nickname) || !uuid(data.playerId)) return error('INVALID_PLAYER', 400, cors);
      const selected = pickQuestions(); const now = Date.now(); const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO challenges(id,player_id,nickname,question_ids,started_at,expires_at,status) VALUES(?,?,?,?,?,?,?)').bind(id, data.playerId, data.nickname.trim(), JSON.stringify(selected.map(q => q.id)), now, now + 60000, 'pending').run();
      if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM challenges WHERE status='pending' AND expires_at < ?").bind(now - 86400000).run();
      return json({ challengeId: id, startedAt: now, expiresAt: now + 60000, questions: publicQuestions(selected) }, 201, cors);
    }
    if (url.pathname === '/api/submit' && request.method === 'POST') {
      if (!await limited(request, env, 'submit', 30)) return error('RATE_LIMITED', 429, cors);
      const data = await body(request);
      if (!uuid(data.challengeId) || !Array.isArray(data.answers) || data.answers.length !== 10 || !data.answers.every((a: unknown) => a === null || Number.isInteger(a) && (a as number) >= 0 && (a as number) <= 3)) return error('INVALID_SUBMISSION', 400, cors);
      const challenge = await env.DB.prepare('SELECT * FROM challenges WHERE id=?').bind(data.challengeId).first<Challenge>();
      if (!challenge) return error('CHALLENGE_NOT_FOUND', 404, cors);
      if (challenge.status !== 'pending') return error('ALREADY_SUBMITTED', 409, cors);
      const now = Date.now();
      if (now > challenge.expires_at + 5000) return error('CHALLENGE_EXPIRED', 410, cors);
      const ids: number[] = JSON.parse(challenge.question_ids);
      if (ids.length !== 10 || ids.some(id => !questions.some(q => q.id === id))) return error('INVALID_CHALLENGE', 500, cors);
      const correct = scoreAnswers(ids, data.answers);
      const duration = Math.min(60000, Math.max(0, now - challenge.started_at));
      const update = await env.DB.prepare("UPDATE challenges SET status='submitted' WHERE id=? AND status='pending'").bind(challenge.id).run();
      if (update.meta.changes !== 1) return error('ALREADY_SUBMITTED', 409, cors);
      await env.DB.prepare('INSERT INTO scores(challenge_id,player_id,nickname,correct,duration_ms,completed_at) VALUES(?,?,?,?,?,?)').bind(challenge.id, challenge.player_id, challenge.nickname, correct, duration, now).run();
      const rank = await getRank(env, challenge.id);
      return json({ correct, durationMs: duration, globalRank: rank, completedAt: now, ranked: rank !== null }, 200, cors);
    }
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      if (!await limited(request, env, 'leaderboard', 60)) return error('RATE_LIMITED', 429, cors);
      const [start, end] = dayBounds();
      const daily = await env.DB.prepare(rankSql(true)).bind(start, end).all();
      const allTime = await env.DB.prepare(rankSql(false)).all();
      return json({ utcDate: new Date(start).toISOString().slice(0,10), daily: daily.results, allTime: allTime.results }, 200, cors);
    }
    if (url.pathname === '/api/me' && request.method === 'GET') {
      if (!await limited(request, env, 'me', 60)) return error('RATE_LIMITED', 429, cors);
      const playerId = url.searchParams.get('playerId');
      if (!uuid(playerId)) return error('INVALID_PLAYER', 400, cors);
      const best = await env.DB.prepare('SELECT challenge_id,player_id,nickname,correct,duration_ms,completed_at FROM scores WHERE player_id=? ORDER BY correct DESC,duration_ms ASC,completed_at ASC LIMIT 1').bind(playerId).first();
      return json({ best, globalRank: best ? await getRank(env, (best as {challenge_id:string}).challenge_id) : null }, 200, cors);
    }
    return error('NOT_FOUND', 404, cors);
  } catch (e) {
    if (e instanceof Error && (e.message === 'BODY_TOO_LARGE' || e.message === 'INVALID_JSON')) return error(e.message, 400, cors);
    console.error(e);
    return error('SERVER_ERROR', 500, cors);
  }
} };
