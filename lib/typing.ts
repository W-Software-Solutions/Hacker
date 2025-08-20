import type { TypingMode, TypingSession } from './types';

const CORPUS = ['trace','kernel','packet','glitch','cipher','matrix','neon','daemon','socket','quantum','vector','router','payload','entropy','proxy','buffer','stream','opcode','thread','cipher'];

export function generatePrompt(words = 30) {
  const arr = Array.from({ length: words }, () => CORPUS[Math.floor(Math.random()*CORPUS.length)]);
  return arr.join(' ');
}

export function computeMetrics(prompt: string, typed: string) {
  const p = prompt;
  const t = typed;
  const len = Math.max(p.length, t.length);
  let correct = 0, incorrect = 0;
  const mistakes: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    if (t[i] === undefined) break;
    if (t[i] === p[i]) correct++; else {
      incorrect++;
      const k = p[i] || '_';
      mistakes[k] = (mistakes[k] || 0) + 1;
    }
  }
  const accuracy = len ? (correct / Math.max(1, correct + incorrect)) * 100 : 0;
  return { correct, incorrect, accuracy, mistakes };
}

export function toWPM(characters: number, elapsedMs: number) {
  const words = characters / 5;
  const minutes = Math.max(0.001, elapsedMs / 1000 / 60);
  return words / minutes;
}

const TYPING_KEY = 'hackertrace.typing.v1';

export function saveTypingSession(session: TypingSession) {
  try {
    const raw = localStorage.getItem(TYPING_KEY);
    const arr: TypingSession[] = raw ? JSON.parse(raw) : [];
    arr.unshift(session);
    localStorage.setItem(TYPING_KEY, JSON.stringify(arr).slice(0, 1_500_000));
  } catch {}
}

export function listTypingSessions(): TypingSession[] {
  try {
    const raw = localStorage.getItem(TYPING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
