"use client";

import { useState } from 'react';
import Terminal from '../../components/Terminal';
import WorldMap from '../../components/Map';
import type { City } from '../../lib/cities';
import { cityMap } from '../../lib/cities';
import type { AppMode, Profile } from '../../lib/types';

export default function TracePage() {
  const [destination, setDestination] = useState<City | null>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<AppMode>({ real: false, map3d: false });
  const [profile] = useState<Profile | null>({ id: 'demo', name: 'anonymous@net', plan: 'free', achievements: [] });

  return (
    <main className="min-h-[calc(100vh-52px)] grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-2">
      <div className="border-r border-neon/20 overflow-hidden">
        <Terminal
          onTraceStart={(dest) => { setDestination(dest); setProgress(0); }}
          onTraceProgress={(p) => setProgress(p)}
          onTraceEnd={() => setProgress(1)}
          mode={mode}
          setMode={(m) => setMode(prev => ({ ...prev, ...m }))}
          profile={profile}
        />
      </div>
      <div className="h-[50vh] lg:h-auto">
        <WorldMap source={cityMap['delhi']} destination={destination} progress={progress} mode={mode} />
      </div>
    </main>
  );
}
