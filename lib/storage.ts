import type { LogSession } from './types';

const KEY = 'hackertrace.sessions.v1';

export function saveSessionLocal(session: LogSession) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: LogSession[] = raw ? JSON.parse(raw) : [];
    arr.unshift(session);
    localStorage.setItem(KEY, JSON.stringify(arr).slice(0, 1_500_000));
  } catch {}
}

export function listSessionsLocal(): LogSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getSessionLocal(id: string): LogSession | null {
  return listSessionsLocal().find(s => s.id === id) || null;
}

export function exportSession(session: LogSession, type: 'txt' | 'json' = 'txt') {
  const blob = type === 'json'
    ? new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    : new Blob([session.lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hackertrace-${session.id}.${type}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
