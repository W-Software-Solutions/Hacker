"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeMetrics, generatePrompt, listTypingSessions, saveTypingSession, toWPM } from '../../lib/typing';
import type { TypingMode, TypingSession } from '../../lib/types';

export default function TypingPage() {
  const [mode, setMode] = useState<TypingMode>({ kind: 'words', wordCount: 30 });
  const [prompt, setPrompt] = useState(generatePrompt('wordCount' in mode ? mode.wordCount : 30));
  const [input, setInput] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<{ t: number; cps: number }[]>([]);
  const [wpmLive, setWpmLive] = useState(0);
  const [accuracyLive, setAccuracyLive] = useState(100);
  const [sessions, setSessions] = useState<TypingSession[]>([]);
  const [ended, setEnded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); setSessions(listTypingSessions()); }, []);

  // timer for live WPM/accuracy and timeline
  useEffect(() => {
    if (!startedAt || ended) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setWpmLive(Math.round(toWPM(input.length, elapsed)));
      const { accuracy } = computeMetrics(prompt, input);
      setAccuracyLive(Math.round(accuracy));
      setTimeline(prev => [...prev, { t: Math.floor(elapsed/1000), cps: input.length / Math.max(1, Math.floor(elapsed/1000)) }].slice(-120));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, input, prompt, ended]);

  function reset(newMode?: TypingMode) {
    const m = newMode || mode;
    setMode(m);
    setPrompt(generatePrompt(m.kind === 'words' ? m.wordCount : 50));
    setInput('');
    setStartedAt(null);
    setTimeline([]);
    setWpmLive(0);
    setAccuracyLive(100);
    setEnded(false);
    inputRef.current?.focus();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!startedAt && v.length) setStartedAt(Date.now());
    setInput(v);
    if (mode.kind === 'words' && v.trim() === prompt.trim()) {
      finish();
    }
  }

  function finish() {
    if (!startedAt || ended) return;
    const end = Date.now();
    const elapsed = end - startedAt;
    const { correct, incorrect, accuracy, mistakes } = computeMetrics(prompt, input);
    const rawWpm = toWPM(input.length, elapsed);
    const wpm = toWPM(correct, elapsed);
    const session: TypingSession = {
      id: Math.random().toString(36).slice(2, 8),
      createdAt: end,
      mode,
      prompt,
      wpm: Math.round(wpm),
      rawWpm: Math.round(rawWpm),
      accuracy: Math.round(accuracy),
      correct,
      incorrect,
      timeline,
      mistakes,
    };
    saveTypingSession(session);
    setSessions(listTypingSessions());
    setEnded(true);
  }

  const chars = useMemo(() => prompt.split(''), [prompt]);
  const typed = input.split('');

  return (
    <main className="min-h-[calc(100vh-52px)] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Typing WPM — Hacker Terminal</h1>
        <p className="text-neon/80 text-sm">Type the prompt below. Choose mode, track WPM, accuracy, and review analytics.</p>

        <div className="mt-4 flex flex-wrap gap-3 items-center text-sm">
          <button onClick={() => reset({ kind: 'words', wordCount: 30 })} className={`px-3 py-1 rounded border ${mode.kind==='words'?'border-neon text-neon':'border-neon/30 text-neon/70'}`}>30 words</button>
          <button onClick={() => reset({ kind: 'words', wordCount: 50 })} className={`px-3 py-1 rounded border ${mode.kind==='words'?'border-neon text-neon':'border-neon/30 text-neon/70'}`}>50 words</button>
          <button onClick={() => reset({ kind: 'time', durationSec: 60 })} className={`px-3 py-1 rounded border ${mode.kind==='time'?'border-neon text-neon':'border-neon/30 text-neon/70'}`}>60s</button>
          <button onClick={() => reset({ kind: 'time', durationSec: 120 })} className={`px-3 py-1 rounded border ${mode.kind==='time'?'border-neon text-neon':'border-neon/30 text-neon/70'}`}>120s</button>
          <button onClick={() => reset()} className="px-3 py-1 rounded border border-neon/40 text-neon/80">New Prompt</button>
          <button onClick={finish} className="px-3 py-1 rounded bg-neon text-black">Finish</button>
          <span className="ml-auto">WPM: <span className="text-neon">{wpmLive}</span> | Acc: <span className="text-neon">{accuracyLive}%</span></span>
        </div>

        <div className="mt-6 p-4 border border-neon/20 rounded bg-black/30">
          <div className="font-mono text-sm leading-7">
            {chars.map((ch, i) => {
              const t = typed[i];
              const correct = t === undefined ? undefined : t === ch;
              return (
                <span key={i} className={
                  correct === undefined ? 'text-neon/40' : correct ? 'text-neon' : 'text-red-400'
                }>{ch}</span>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-neon">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={onChange}
              placeholder="Start typing…"
              className="flex-1 bg-transparent outline-none text-neon placeholder:text-neon/40 caret-neon"
            />
            <motion.span initial={{ opacity: 1 }} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-neon">_</motion.span>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="p-4 border border-neon/20 rounded bg-black/30">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="text-sm space-y-1">
              <div>Prompt length: {prompt.split(/\s+/).length} words</div>
              <div>Live WPM: <span className="text-neon">{wpmLive}</span></div>
              <div>Live Accuracy: <span className="text-neon">{accuracyLive}%</span></div>
              {ended && <div className="text-neon/80">Session saved.</div>}
            </div>
          </div>
          <div className="p-4 border border-neon/20 rounded bg-black/30">
            <h3 className="font-semibold mb-2">Speed Timeline</h3>
            <div className="h-24 flex items-end gap-1">
              {timeline.map((p, i) => (
                <div key={i} className="bg-neon/60" style={{ width: 4, height: Math.min(96, p.cps*6) }} />
              ))}
            </div>
            <div className="text-xs text-neon/60 mt-1">Characters/sec over time</div>
          </div>
          <MistakesPanel prompt={prompt} typed={input} />
        </div>

        <div className="mt-8 p-4 border border-neon/20 rounded bg-black/30">
          <h3 className="font-semibold mb-3">History</h3>
          <div className="text-sm grid md:grid-cols-2 gap-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-3 border border-neon/20 rounded">
                <div className="flex justify-between">
                  <div>#{s.id} — {new Date(s.createdAt).toLocaleString()}</div>
                  <div className="text-neon">{s.wpm} WPM</div>
                </div>
                <div className="text-xs text-neon/70">Acc {s.accuracy}% · Raw {s.rawWpm} · {s.correct}/{s.incorrect}</div>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-neon/70">No sessions yet.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

function MistakesPanel({ prompt, typed }: { prompt: string; typed: string }) {
  const { mistakes } = computeMetrics(prompt, typed);
  const entries = Object.entries(mistakes || {}).sort((a,b)=>b[1]-a[1]).slice(0, 10);
  return (
    <div className="p-4 border border-neon/20 rounded bg-black/30">
      <h3 className="font-semibold mb-2">Mistakes</h3>
      <div className="text-sm grid grid-cols-5 gap-2">
        {entries.map(([ch, count]) => (
          <div key={ch} className="text-center p-2 border border-neon/20 rounded">
            <div className="text-lg">{ch === ' ' ? '␣' : ch}</div>
            <div className="text-neon/70">{count}</div>
          </div>
        ))}
        {entries.length === 0 && <div className="text-neon/70 col-span-5">No mistakes yet.</div>}
      </div>
    </div>
  );
}
