import { describe, expect, it } from 'vitest';
import { questions, pickQuestions, publicQuestions, scoreAnswers } from '../worker/questions';
import { bestPerPlayer, compareScores, type ScoreRow } from '../worker/ranking';

describe('question selection and scoring', () => {
  it('draws ten distinct questions from a verified forty-question pool', () => {
    expect(questions).toHaveLength(40);
    const picked = pickQuestions(() => 0.3);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map(q => q.id)).size).toBe(10);
    for (const q of publicQuestions(picked)) expect(new Set(q.options).size).toBe(4);
  });
  it('scores only the server key and rejects wrong or missing answers', () => {
    const picked = questions.slice(0, 10);
    const publicSet = publicQuestions(picked);
    const correct = publicSet.map((q, i) => q.options.indexOf(picked[i].shortcut));
    expect(scoreAnswers(picked.map(q => q.id), correct)).toBe(10);
    expect(scoreAnswers(picked.map(q => q.id), correct.map(n => (n + 1) % 4))).toBe(0);
    expect(scoreAnswers(picked.map(q => q.id), Array(10).fill(null))).toBe(0);
  });
});
describe('ranking', () => {
  const row = (id:string, player:string, correct:number, duration:number, time:number):ScoreRow => ({challenge_id:id,player_id:player,nickname:player,correct,duration_ms:duration,completed_at:time});
  it('sorts by accuracy before speed and keeps one best per player', () => {
    const scores=[row('a','a',9,15000,1),row('b','b',10,55000,2),row('c','c',10,25000,3),row('d','c',8,20000,4)];
    expect(bestPerPlayer(scores).map(x=>x.challenge_id)).toEqual(['c','b','a']);
    expect(compareScores(scores[1],scores[0])).toBeLessThan(0);
  });
});
