import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:8787';
const origin = 'http://127.0.0.1:5173';
const playerId = crypto.randomUUID();
async function request(path, method = 'GET', payload) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
  return { status: response.status, data: await response.json() };
}
let start = await request('/api/challenges', 'POST', { playerId, nickname: 'LocalTest' });
assert.equal(start.status, 201);
assert.equal(start.data.questions.length, 10);
assert(start.data.questions.every(q => q.options.length === 4 && !('answer' in q) && !('shortcut' in q)));
let wrong = await request('/api/submit', 'POST', { challengeId: start.data.challengeId, answers: Array(10).fill(null) });
assert.equal(wrong.status, 200);
assert.equal(wrong.data.correct, 0);
let duplicate = await request('/api/submit', 'POST', { challengeId: start.data.challengeId, answers: Array(10).fill(0) });
assert.equal(duplicate.status, 409);
let board = await request('/api/leaderboard');
assert.equal(board.status, 200);
assert(board.data.daily.some(row => row.challenge_id === start.data.challengeId));
assert(board.data.allTime.some(row => row.challenge_id === start.data.challengeId));
let me = await request('/api/me?playerId=' + playerId);
assert.equal(me.data.best.challenge_id, start.data.challengeId);
start = await request('/api/challenges', 'POST', { playerId, nickname: 'LocalTest' });
const second = await request('/api/submit', 'POST', { challengeId: start.data.challengeId, answers: Array(10).fill(0) });
assert.equal(second.status, 200);
me = await request('/api/me?playerId=' + playerId);
assert(me.data.best.correct >= 0);
board = await request('/api/leaderboard');
assert.equal(board.data.allTime.filter(row => row.player_id === playerId).length, 1);
console.log('Local API integration passed: create, ten questions, server scoring, duplicate rejection, D1 read/write, daily/all-time board, personal best.');
