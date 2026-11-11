import { describe, expect, it } from 'vitest';
import { drawResultCard } from '../src/shareCard';

function fakeCanvas() {
  const drawn: string[] = [];
  const gradient = { addColorStop() {} };
  const context = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect() {}, strokeRect() {}, beginPath() {}, roundRect() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {},
    fillText: (value: string) => drawn.push(value)
  };
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  return { canvas, drawn };
}

describe('share card content', () => {
  const result = { correct: 9, durationMs: 32800, globalRank: 12, ranked: true };

  it('labels local Chinese results without a global rank', () => {
    const { canvas, drawn } = fakeCanvas();
    drawResultCard(canvas, { lang: 'zh', result, officialSite: false });
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    expect(drawn).toContain('LOCAL TEST RESULT');
    expect(drawn).toContain('本地测试');
    expect(drawn).toContain('答对题数');
    expect(drawn).toContain('你能超越这个成绩吗？来挑战吧。');
    expect(drawn).not.toContain('全球排名');
    expect(drawn).not.toContain('#12');
    expect(drawn).toContain('https://kikakin.github.io/mac-shortcut-arena/');
  });

  it('shows a verified rank only for an official ranked result', () => {
    const local = fakeCanvas();
    drawResultCard(local.canvas, { lang: 'en', result, officialSite: false });
    expect(local.drawn).toContain('LOCAL TEST RESULT');
    expect(local.drawn).not.toContain('VERIFIED GLOBAL RESULT');
    const official = fakeCanvas();
    drawResultCard(official.canvas, { lang: 'en', result, officialSite: true });
    expect(official.drawn).toContain('GLOBAL RANK');
    expect(official.drawn).toContain('#12');
    expect(official.drawn).toContain('VERIFIED GLOBAL RESULT');
  });

  it('does not invent a rank when submission fails or rank is absent', () => {
    const failed = fakeCanvas();
    drawResultCard(failed.canvas, { lang: 'zh', result: null, officialSite: true });
    expect(failed.drawn).toContain('成绩未提交成功');
    expect(failed.drawn).not.toContain('全球排名');
    const unranked = fakeCanvas();
    drawResultCard(unranked.canvas, { lang: 'en', result: { ...result, globalRank: null, ranked: false }, officialSite: true });
    expect(unranked.drawn).toContain('NOT RANKED');
    expect(unranked.drawn).not.toContain('VERIFIED GLOBAL RESULT');
  });
});
