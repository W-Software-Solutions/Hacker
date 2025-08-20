"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion';
import type { City } from '../lib/cities';
import { cities, cityMap } from '../lib/cities';
import { generateTraceroute } from '../lib/traceroute';
import { baseCommands, findCommand, parseCommand } from '../lib/commands';
import type { AppMode, Command, CommandContext, LogSession, Profile } from '../lib/types';
import { exportSession, getSessionLocal, listSessionsLocal, saveSessionLocal } from '../lib/storage';

export type TerminalProps = {
  onTraceStart: (dest: City) => void;
  onTraceProgress: (progress: number) => void; // 0..1
  onTraceEnd: () => void;
  mode: AppMode;
  setMode: (m: Partial<AppMode>) => void;
  profile: Profile | null;
};

type LogEntry = { id: string; text: string; glitch?: boolean };

export default function Terminal({ onTraceStart, onTraceProgress, onTraceEnd, mode, setMode, profile }: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const queueRef = useRef<string[]>([]);
  const typingRef = useRef(false);
  const progress = useMotionValue(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Load session from URL if present (replay)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      const s = getSessionLocal(sid);
      if (s) enqueue([`Replaying session ${sid}...`, ...s.lines]);
    }
  }, []);

  // Boot sequence once per session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionStorage.getItem('booted')) {
      enqueue(['BOOT SEQUENCE INITIATED...', 'CALIBRATING OPTICAL MATRIX... OK', 'LINKING SAT-NET NODES... OK', 'READY.']);
      sessionStorage.setItem('booted', '1');
    }
  }, []);

  // Typing loop
  useEffect(() => {
    let cancelled = false;
    async function loop() {
      if (typingRef.current) return;
      typingRef.current = true;
      while (!cancelled && queueRef.current.length) {
        const next = queueRef.current.shift()!;
        const id = `${Date.now()}-${Math.random()}`;
        const glitch = Math.random() < 0.08;
        setLogs(prev => [...prev, { id, text: '', glitch }]);
        for (let i = 1; i <= next.length; i++) {
          if (cancelled) return;
          const slice = next.slice(0, i);
          setLogs(prev => prev.map(l => l.id === id ? { ...l, text: slice } : l));
          await new Promise(r => setTimeout(r, 12 + Math.random() * 10));
        }
        // notify progress based on how many lines completed vs total queued for this trace if active
        const s = traceSync.current;
        if (s?.active) {
          s.done += 1;
          const ratio = Math.min(1, s.done / s.total);
          animate(progress, ratio, { duration: 0.2, ease: 'easeOut' });
        }
      }
      typingRef.current = false;
    }
    loop();
    return () => { cancelled = true; }
  }, [logs.length]);

  // Emit progress changes upward
  useEffect(() => {
    const unsub = progress.on('change', v => onTraceProgress(v));
    return () => { unsub(); }
  }, [onTraceProgress]);

  // End trace when progress hits 1
  useEffect(() => {
    const unsub = progress.on('change', v => {
      if (v >= 1 && traceSync.current?.active) {
        traceSync.current = null;
        onTraceEnd();
      }
    });
    return () => { unsub(); }
  }, [onTraceEnd]);

  type Sync = { active: boolean; total: number; done: number } | null;
  const traceSync = useRef<Sync>(null);

  function enqueue(lines: string[]) {
    queueRef.current.push(...lines);
    setLogs(prev => [...prev]);
  }

  function listCities() { return cities.map(c => c.name).join(', '); }

  function normalizeCity(input: string): string | null {
    const key = (input || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!key) return null;
    if (cityMap[key as keyof typeof cityMap]) return key;
    const synonyms: Record<string, string> = {
      newyork: 'nyc', ny: 'nyc', nyc: 'nyc', newyorkcity: 'nyc',
      delhi: 'delhi', ncr: 'delhi',
      tokyo: 'tokyo',
      paris: 'paris',
      london: 'london',
      sydney: 'sydney', syd: 'sydney',
    };
    return synonyms[key] || null;
  }

  const ctx: CommandContext = useMemo(() => ({
    mode,
    profile,
    setMode: (m) => setMode(m),
    saveSession: (session) => saveSessionLocal(session),
    listSessions: () => listSessionsLocal(),
    getSession: (id) => getSessionLocal(id),
  }), [mode, profile, setMode]);

  async function runCommand(cmdName: string, args: string[]) {
    // Special: clear handled locally
    if (cmdName === 'clear') { queueRef.current = []; setLogs([]); return; }

    // Special: export handled locally (needs file download)
    if (cmdName === 'export') {
      const id = args[0]; const type = (args[1] || 'txt') as 'txt' | 'json';
      if (!id) { enqueue(['usage: export <id> (json|txt)']); return; }
      const s = getSessionLocal(id);
      if (!s) { enqueue([`not found: ${id}`]); return; }
      exportSession(s, type);
      enqueue([`Exported ${id} as ${type}.`]);
      return;
    }

    const cmd = findCommand(cmdName, baseCommands) as Command | undefined;
    if (!cmd) { enqueue(['ERROR: Unknown command. Try: help']); return; }
    if (cmdName === 'mode' && args[0] === 'real' && profile?.plan !== 'pro') {
      enqueue(['MODE real is a Pro feature. Upgrade to enable.']);
      return;
    }
    const res = await cmd.execute(args, ctx);
    if (res.error) enqueue([`ERROR: ${res.error}`]);
    if (res.lines?.length) enqueue(res.lines);
  }

  async function submit(cmd: string) {
    setHistory(prev => [...prev, cmd]);
    setHistIndex(-1);
    enqueue([`$ ${cmd}`]);
    const { cmd: name, args } = parseCommand(cmd);
    if (!name) return;
    if (name === 'trace-route' || name === 'traceroute') {
      const key = normalizeCity(args[0] || '');
      const dest = key ? cityMap[key as keyof typeof cityMap] : undefined;
      if (!dest) { enqueue([`ERROR: Unknown city: ${args[0] || ''}. Try: ${listCities()}`]); return; }
      onTraceStart(dest);
      progress.set(0);
      const pre = [
        `RESOLVING ${(key || '').toUpperCase()}...`,
        'ESTABLISHING SECURE CHANNEL... OK',
        'INITIATING GEO-TRACE SEQUENCE...',
        `SOURCE: Delhi, India`,
        `DESTINATION: ${dest.label}`,
      ];
      let hops: string[] = [];
      if (mode.real) {
        try {
          const res = await fetch(`/api/trace?city=${encodeURIComponent(key)}&real=1`);
          const data = await res.json();
          hops = Array.isArray(data?.hops) ? data.hops : [];
          if (!hops.length) hops = generateTraceroute(dest.label);
        } catch { hops = generateTraceroute(dest.label); }
      } else {
        hops = generateTraceroute(dest.label);
      }
      const all = [...pre, ...hops];
      traceSync.current = { active: true, total: all.length, done: 0 };
      enqueue(all);
    } else {
      await runCommand(name, args);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    submit(cmd);
    setInput('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIndex < 0 ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0) return;
      if (histIndex < 0) return;
      const next = histIndex + 1;
      if (next >= history.length) { setHistIndex(-1); setInput(''); }
      else { setHistIndex(next); setInput(history[next]); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
  const trimmed = input.trim().toLowerCase();
      if (!trimmed) { setInput('trace-route '); return; }
      if ('trace-route'.startsWith(trimmed)) { setInput('trace-route '); return; }
      if (trimmed.startsWith('trace-route')) {
        const after = trimmed.replace(/^trace-route\s*/, '');
        const names = cities.map(c => c.name);
        if (!after) { setInput('trace-route ' + names[0]); return; }
        const match = names.find(n => n.startsWith(after));
        if (match) setInput('trace-route ' + match);
      }
    }
  }

  return (
    <section className="p-4 lg:p-6 border-b border-neon/20 overflow-y-auto">
      <div className="space-y-1 text-sm">
        <AnimatePresence initial={false}>
          {logs.map((line) => (
            <motion.div key={line.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neon">
              <motion.span animate={line.glitch ? { x: [0, 0.6, -0.4, 0], filter: ['none','hue-rotate(5deg)','none'] } : {}} transition={{ duration: 0.2 }}>
                {line.text}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
        <span className="text-neon">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
      placeholder="type 'trace-route paris' | 'help'"
          className="flex-1 bg-transparent outline-none text-neon placeholder:text-neon/40 caret-neon"
          autoComplete="off"
        />
        <motion.span initial={{ opacity: 1 }} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-neon">_</motion.span>
      </form>
    </section>
  );
}
