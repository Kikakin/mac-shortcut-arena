type Language = 'en' | 'zh';
type CardResult = { correct: number; durationMs: number; globalRank: number | null; ranked: boolean } | null;

type CardOptions = {
  lang: Language;
  result: CardResult;
  officialSite: boolean;
};

const SITE_URL = 'https://kikakin.github.io/mac-shortcut-arena/';

const wording = {
  en: {
    challenge: '60 SECONDS  /  10 QUESTIONS',
    score: 'YOUR SCORE',
    time: 'TIME',
    rank: 'GLOBAL RANK',
    status: 'RESULT STATUS',
    mode: 'RESULT TYPE',
    localTest: 'LOCAL TEST',
    noRank: 'NOT RANKED',
    notSubmitted: 'RESULT NOT SUBMITTED',
    verified: 'VERIFIED GLOBAL RESULT',
    invite: 'Think you can beat this score? Take the challenge.'
  },
  zh: {
    challenge: '60 秒  /  10 道题',
    score: '答对题数',
    time: '完成用时',
    rank: '全球排名',
    status: '成绩状态',
    mode: '成绩类型',
    localTest: '本地测试',
    noRank: '未获得有效排名',
    notSubmitted: '成绩未提交成功',
    verified: '全球成绩已验证',
    invite: '你能超越这个成绩吗？来挑战吧。'
  }
};

const font = (size: number, weight = 600) => `${weight} ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export function drawResultCard(canvas: HTMLCanvasElement, { lang, result, officialSite }: CardOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  const t = wording[lang];
  const verifiedRank = officialSite && result?.ranked === true && Number.isInteger(result.globalRank) && (result.globalRank ?? 0) > 0;
  canvas.width = 1080;
  canvas.height = 1350;

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#121936');
  background.addColorStop(0.55, '#171438');
  background.addColorStop(1, '#080b19');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(900, 225, 30, 900, 225, 550);
  glow.addColorStop(0, 'rgba(139, 101, 255, 0.36)');
  glow.addColorStop(1, 'rgba(139, 101, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 820);

  const border = ctx.createLinearGradient(48, 48, 1032, 1302);
  border.addColorStop(0, '#9b82ff');
  border.addColorStop(1, '#344276');
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  roundRect(ctx, 48, 48, 984, 1254, 28);
  ctx.stroke();

  ctx.fillStyle = '#b9a8ff';
  ctx.font = font(26, 700);
  ctx.fillText('AI & MAC LAB', 96, 132);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a5aacb';
  ctx.font = font(23, 600);
  ctx.fillText(t.challenge, 984, 132);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = font(70, 800);
  ctx.fillText('MAC SHORTCUT', 96, 288);
  ctx.fillStyle = '#b8a0ff';
  ctx.fillText('ARENA', 96, 366);
  ctx.fillStyle = '#8e78e3';
  ctx.fillRect(96, 405, 128, 6);

  ctx.fillStyle = '#c4b4ff';
  ctx.font = font(30, 700);
  ctx.fillText(t.score, 96, 523);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(176, 800);
  ctx.fillText(result ? `${result.correct}/10` : '—/10', 86, 725);

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, 96, 790, 888, 178, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,170,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(540, 819);
  ctx.lineTo(540, 938);
  ctx.stroke();

  ctx.fillStyle = '#aeb5d4';
  ctx.font = font(25, 600);
  ctx.fillText(t.time, 132, 839);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(58, 700);
  ctx.fillText(result ? `${(result.durationMs / 1000).toFixed(1)}s` : '—', 132, 919);

  ctx.fillStyle = '#aeb5d4';
  ctx.font = font(25, 600);
  ctx.fillText(verifiedRank ? t.rank : officialSite ? t.status : t.mode, 580, 839);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(verifiedRank ? 58 : 30, 700);
  ctx.fillText(verifiedRank ? `#${result!.globalRank}` : officialSite ? result ? t.noRank : t.notSubmitted : result ? t.localTest : t.notSubmitted, 580, 919);

  const status = !officialSite ? 'LOCAL TEST RESULT' : !result ? t.notSubmitted : verifiedRank ? t.verified : t.noRank;
  ctx.fillStyle = verifiedRank ? '#91e5d6' : '#c0b1ff';
  ctx.font = font(25, 700);
  ctx.fillText(status, 96, 1034);

  ctx.strokeStyle = 'rgba(190,170,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 1080);
  ctx.lineTo(984, 1080);
  ctx.stroke();

  ctx.fillStyle = '#edf0ff';
  ctx.font = font(31, 600);
  ctx.fillText(t.invite, 96, 1147);
  ctx.fillStyle = '#bca9ff';
  ctx.font = font(28, 700);
  ctx.fillText('Mac Shortcut Arena', 96, 1212);
  ctx.fillStyle = '#a6accb';
  ctx.font = font(24, 500);
  ctx.fillText(SITE_URL, 96, 1260);
}

export function downloadResultCard(options: CardOptions): void {
  const canvas = document.createElement('canvas');
  drawResultCard(canvas, options);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mac-shortcut-arena-result.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
}
